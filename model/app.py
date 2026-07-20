import os
import time
import torch
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
try:
    from flask.json.provider import DefaultJSONProvider
except Exception:
    DefaultJSONProvider = None
try:
    from flask.json import JSONEncoder
except Exception:
    JSONEncoder = None
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import torchvision.transforms as transforms
from ultralytics import YOLO
from skimage.metrics import peak_signal_noise_ratio, structural_similarity
import requests
from io import BytesIO
import yt_dlp

# Import the FUNIE-GAN model architecture
try:
    from models.funie_gan import GeneratorSmall
except ImportError:
    import torch.nn as nn
    class GeneratorSmall(nn.Module):
        def __init__(self):
            super().__init__()
            def down(in_c, out_c, norm=True):
                layers = [nn.Conv2d(in_c, out_c, 4, 2, 1)]
                if norm: layers.append(nn.BatchNorm2d(out_c))
                layers.append(nn.LeakyReLU(0.2))
                return nn.Sequential(*layers)
            def up(in_c, out_c):
                return nn.Sequential(
                    nn.ConvTranspose2d(in_c, out_c, 4, 2, 1),
                    nn.BatchNorm2d(out_c),
                    nn.ReLU()
                )
            self.d1 = down(3, 64, False)
            self.d2 = down(64, 128)
            self.d3 = down(128, 256)
            self.u1 = up(256, 128)
            self.u2 = up(256, 64)
            self.final = nn.ConvTranspose2d(128, 3, 4, 2, 1)
        def forward(self, x):
            d1 = self.d1(x)
            d2 = self.d2(d1)
            d3 = self.d3(d2)
            u1 = self.u1(d3)
            u2 = self.u2(torch.cat([u1, d2], 1))
            return torch.tanh(self.final(torch.cat([u2, d1], 1)))

# Custom JSON provider/encoder to handle numpy types across Flask versions
if DefaultJSONProvider is not None:
    class NpJSONProvider(DefaultJSONProvider):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super().default(obj)

    app = Flask(__name__)
    app.json = NpJSONProvider(app)
else:
    class NpEncoder(JSONEncoder):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super().default(obj)

    app = Flask(__name__)
    app.json_encoder = NpEncoder
CORS(app)

# -------------------- CONFIG --------------------
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
FUNIE_MODEL_PATH = 'models/funie_final_improved.pth'
YOLO_MODEL_PATH = 'models/best.pt'
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# -------------------- MODEL LOAD --------------------
print(f"🔄 Loading models on {DEVICE}...")

# 1. Load FUNIE-GAN
try:
    funie_model = GeneratorSmall().to(DEVICE)
    _ckpt = torch.load(FUNIE_MODEL_PATH, map_location=DEVICE)
    if isinstance(_ckpt, dict) and 'state_dict' in _ckpt:
        _ckpt = _ckpt['state_dict']
    if isinstance(_ckpt, dict):
        _ckpt = {
            (k.replace('module.', '') if isinstance(k, str) else k): v for k, v in _ckpt.items()
        }
    funie_model.load_state_dict(_ckpt, strict=False)
    funie_model.eval()
    print("✅ FUNIE-GAN loaded")
except Exception as e:
    print(f"❌ FUNIE-GAN loading failed: {e}")
    funie_model = None

# 2. Load YOLO
try:
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print("✅ YOLO loaded")
except Exception as e:
    print(f"❌ YOLO loading failed: {e}")
    yolo_model = None

# 3. Load MiDaS
try:
    midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
    midas.to(DEVICE)
    midas.eval()
    midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
    midas_transform = midas_transforms.small_transform
    print("✅ MiDaS loaded")
except Exception as e:
    print(f"❌ MiDaS loading failed: {e}")
    midas = None

# -------------------- HELPERS --------------------
danger_map = {
    "human": "DANGER",
    "mine": "DANGER",
    "submarine": "DANGER",
    "structure": "NEUTRAL",
    "fish": "SAFE",
    "trash": "NEUTRAL"
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def denorm(x):
    """Denormalize from [-1, 1] to [0, 1] with extra contrast stretching"""
    out = (x + 1.0) / 2.0
    return out.clamp(0, 1)

def apply_color_balance(img):
    """Simple Auto White Balance/Color stretching for underwater images"""
    # Separate channels
    b, g, r = cv2.split(img)
    # Apply CLAHE to each channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    b = clahe.apply(b)
    g = clahe.apply(g)
    r = clahe.apply(r)
    return cv2.merge((b, g, r))

def unsharp_mask(img_bgr, amount=1.2, radius=1.2, threshold=2):
    """Sharpen after upscaling to counter FUNIE 256px blur."""
    blurred = cv2.GaussianBlur(img_bgr, (0, 0), radius)
    sharpened = cv2.addWeighted(img_bgr, 1 + amount, blurred, -amount, 0)
    if threshold > 0:
        low_contrast_mask = np.abs(img_bgr.astype(np.int16) - blurred.astype(np.int16)) < threshold
        sharpened[low_contrast_mask] = img_bgr[low_contrast_mask]
    return sharpened

def _pad_to_multiple(img_bgr, mult=32, border_value=(0, 0, 0)):
    h, w = img_bgr.shape[:2]
    pad_h = (mult - (h % mult)) % mult
    pad_w = (mult - (w % mult)) % mult
    top = pad_h // 2
    bottom = pad_h - top
    left = pad_w // 2
    right = pad_w - left
    padded = cv2.copyMakeBorder(
        img_bgr,
        top,
        bottom,
        left,
        right,
        borderType=cv2.BORDER_REFLECT_101,
    )
    return padded, (top, bottom, left, right)

def _unpad(img_bgr, pads):
    top, bottom, left, right = pads
    h, w = img_bgr.shape[:2]
    return img_bgr[top : h - bottom, left : w - right]

def compute_uiqm(img):
    img = img.astype(np.float32) / 255.0
    gray = cv2.cvtColor((img*255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    uism = np.mean(np.abs(cv2.Sobel(gray, cv2.CV_64F, 1, 1))) / 255.0
    uiconm = np.std(gray) / 255.0
    return 0.3 * uism + 3.5 * uiconm

def estimate_distance(depth_map, x1, y1, x2, y2):
    region = depth_map[y1:y2, x1:x2]
    if region.size == 0: return 0.5
    return np.mean(region)

def _is_probably_video_source(s):
    if not s:
        return False
    u = str(s).lower().strip()
    return any(
        u.endswith(ext)
        for ext in (
            '.mp4',
            '.mov',
            '.avi',
            '.mkv',
            '.webm',
            '.m3u8',
        )
    )

def _read_frame_from_video(source, frame_time_ms=1000):
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        return None
    try:
        if frame_time_ms is not None:
            cap.set(cv2.CAP_PROP_POS_MSEC, float(frame_time_ms))
        ok, frame = cap.read()
        if not ok:
            cap.set(cv2.CAP_PROP_POS_MSEC, 0)
            ok, frame = cap.read()
        return frame if ok else None
    finally:
        cap.release()

def _load_cv_image_from_url(url):
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    nparr = np.frombuffer(resp.content, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def _get_youtube_url(url):
    try:
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info['url']
    except Exception as e:
        print(f"❌ Failed to extract YouTube URL: {e}")
        return None

# -------------------- API ENDPOINTS --------------------

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "models": {
            "funie": funie_model is not None,
            "yolo": yolo_model is not None,
            "midas": midas is not None
        },
        "device": str(DEVICE)
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "DeepDrishti AI Pipeline",
        "endpoints": ["/health", "/pipeline", "/outputs/<filename>"],
    })

@app.route('/pipeline', methods=['POST'])
@app.route('/enhance', methods=['POST'])
def pipeline():
    start_time = time.time()
    img_cv = None

    if 'image' in request.files or 'file' in request.files:
        file = request.files.get('image') or request.files.get('file')
        nparr = np.frombuffer(file.read(), np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif request.is_json:
        url = request.json.get('url') or request.json.get('frameUrl')
        video_path = request.json.get('videoPath')

        print(f"📥 Processing request for URL: {url}, VideoPath: {video_path}")

        if video_path:
            img_cv = _read_frame_from_video(video_path)
        elif url:
            # Check if it's a relative path first
            if isinstance(url, str) and (url.startswith('/') or url.startswith('videos/')) and _is_probably_video_source(url):
                # Try to map to the project's public folder
                possible_paths = [
                    os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', url.lstrip('/'))),
                    os.path.abspath(os.path.join(os.getcwd(), '..', 'frontend', 'public', url.lstrip('/'))),
                    os.path.abspath(os.path.join(os.getcwd(), 'frontend', 'public', url.lstrip('/'))),
                    url
                ]
                for p in possible_paths:
                    if os.path.exists(p):
                        print(f"📁 Found local video file at: {p}")
                        img_cv = _read_frame_from_video(p)
                        if img_cv is not None:
                            break
                if img_cv is None:
                    print(f"⚠️ Could not find local video file in any of: {possible_paths}")

            if img_cv is None and isinstance(url, str) and (url.startswith('http') or url.startswith('https')):
                # Handle YouTube URLs
                if 'youtube.com' in url or 'youtu.be' in url or 'youtube-nocookie.com' in url or 'youtube.com/live/' in url:
                    print(f"📺 Extracting YouTube stream for: {url}")
                    # Clean the URL if it's an embed or has extra params
                    if '/embed/' in url:
                        video_id = url.split('/embed/')[1].split('?')[0]
                        url = f"https://www.youtube.com/watch?v={video_id}"
                    elif '/live/' in url:
                        video_id = url.split('/live/')[1].split('?')[0]
                        url = f"https://www.youtube.com/watch?v={video_id}"
                    
                    yt_stream_url = _get_youtube_url(url)
                    if yt_stream_url:
                        img_cv = _read_frame_from_video(yt_stream_url)
                
                if img_cv is None and _is_probably_video_source(url):
                    print(f"🌐 Opening direct video stream: {url}")
                    img_cv = _read_frame_from_video(url)
                
                if img_cv is None:
                    # Fallback: treat as an image URL
                    try:
                        print(f"🖼️ Loading as image URL: {url}")
                        img_cv = _load_cv_image_from_url(url)
                    except Exception as e:
                        print(f"❌ Failed to load image from URL {url}: {e}")
                        img_cv = None
            elif img_cv is None and isinstance(url, str) and os.path.exists(url):
                 print(f"📁 Opening local path: {url}")
                 img_cv = _read_frame_from_video(url)

    if img_cv is None:
        return jsonify({"error": "No image provided"}), 400

    H, W = img_cv.shape[:2]
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)

    # 1. FUNIE-GAN Enhancement
    enhanced_cv = img_cv
    metrics = {}
    if funie_model:
        # FUNIE-GAN is fully-convolutional; running at higher res reduces blur from 256x256.
        # We upscale, pad to multiple-of-32 for stable down/up sampling, run GAN, then unpad.
        max_short_side = 512
        short_side = min(H, W)
        scale = 1.0
        if short_side < max_short_side:
            scale = max_short_side / float(short_side)
        # Cap scaling to avoid extremely large tensors
        scale = min(scale, 2.0)
        proc_w = int(round(W * scale))
        proc_h = int(round(H * scale))

        proc_bgr = cv2.resize(img_cv, (proc_w, proc_h), interpolation=cv2.INTER_LANCZOS4)
        proc_bgr, pads = _pad_to_multiple(proc_bgr, mult=32)
        proc_rgb = cv2.cvtColor(proc_bgr, cv2.COLOR_BGR2RGB)

        transform_pipe = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])
        input_tensor = transform_pipe(Image.fromarray(proc_rgb)).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            fake = funie_model(input_tensor)

        enhanced_rgb = denorm(fake[0]).cpu().permute(1, 2, 0).numpy()
        enhanced_rgb = (enhanced_rgb * 255).astype(np.uint8)

        # Convert back, unpad and resize to original
        enhanced_proc = cv2.cvtColor(enhanced_rgb, cv2.COLOR_RGB2BGR)
        enhanced_proc = _unpad(enhanced_proc, pads)
        enhanced_proc = apply_color_balance(enhanced_proc)
        enhanced_cv = cv2.resize(enhanced_proc, (W, H), interpolation=cv2.INTER_LANCZOS4)

        # Preserve details: blend more of the original and sharpen
        enhanced_cv = cv2.addWeighted(img_cv, 0.55, enhanced_cv, 0.45, 0)
        enhanced_cv = unsharp_mask(enhanced_cv, amount=1.35, radius=1.0, threshold=1)
        
        # Re-sync for metrics calculation
        enhanced_rgb_resized = cv2.cvtColor(enhanced_cv, cv2.COLOR_BGR2RGB)
        
        metrics['psnr'] = round(float(peak_signal_noise_ratio(img_rgb, enhanced_rgb_resized)), 2)
        metrics['ssim'] = round(float(structural_similarity(img_rgb, enhanced_rgb_resized, channel_axis=2)), 3)
        metrics['uiqm'] = round(float(compute_uiqm(enhanced_rgb)), 3)

    # 2. YOLO Detection
    detections = []
    if yolo_model:
        results = yolo_model.predict(enhanced_cv, conf=0.18)[0]
        
        # 3. MiDaS Depth
        depth_map = None
        if midas:
            input_batch = midas_transform(enhanced_cv).to(DEVICE)
            with torch.no_grad():
                depth = midas(input_batch)
                depth = torch.nn.functional.interpolate(
                    depth.unsqueeze(1), size=(H, W), mode="bicubic", align_corners=False
                ).squeeze().cpu().numpy()
            depth_min, depth_max = depth.min(), depth.max()
            depth_map = (depth - depth_min) / (depth_max - depth_min + 1e-6)

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            name = yolo_model.names[cls_id]
            
            # Map YOLO classes to specific marine threat labels if needed
            # User specifically mentioned "mine", so we ensure it's prioritized
            display_name = name
            if name.lower() in ["mine", "unexploded_ordnance", "torpedo"]:
                display_name = "SEA MINE"
            elif name.lower() in ["sub", "submarine", "uuv"]:
                display_name = "SUBMERSIBLE"
            
            # Distance estimation using normalized depth map (higher value = closer)
            depth_val = estimate_distance(depth_map, x1, y1, x2, y2) if depth_map is not None else 0.5
            # Depth sensing logic: (1-depth) * sensor_max_range
            # If depth_val is 0.8 (near), distance is (1-0.8)*15 = 3m
            # If depth_val is 0.2 (far), distance is (1-0.2)*15 = 12m
            distance_m = round((1.0 - depth_val) * 15.0, 1) 
            
            # Threat status logic
            lower_name = name.lower()
            status = "NEUTRAL"
            if any(k in lower_name for k in ["mine", "ordnance", "torpedo", "weapon"]):
                status = "DANGER"
            elif any(k in lower_name for k in ["sub", "diver", "swimmer"]):
                status = "DANGER"
            elif any(k in lower_name for k in ["fish", "dolphin", "whale", "turtle"]):
                status = "SAFE"
            elif any(k in lower_name for k in ["rock", "reef", "coral", "anchor"]):
                status = "SAFE"
            
            detections.append({
                "class": display_name,
                "raw_class": name,
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2],
                "status": status,
                "distance_m": distance_m,
                "models_used": ["FUNIE-GAN", "YOLOv8", "MiDaS"]
            })

    # Save Output
    timestamp = int(time.time())
    out_filename = f"pipeline_{timestamp}.jpg"
    out_path = os.path.join(OUTPUT_FOLDER, out_filename)
    cv2.imwrite(out_path, enhanced_cv)

    return jsonify({
        "success": True,
        "data": {
            "enhanced_image_path": f"/outputs/{out_filename}",
            "output_filename": out_filename,
            "image_width": int(enhanced_cv.shape[1]) if enhanced_cv is not None else None,
            "image_height": int(enhanced_cv.shape[0]) if enhanced_cv is not None else None,
            "metrics": metrics,
            "detections": detections,
            "processing_time_ms": round((time.time() - start_time) * 1000, 2),
            "model_device": str(DEVICE)
        }
    })

@app.route('/outputs/<path:filename>')
def serve_output(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)