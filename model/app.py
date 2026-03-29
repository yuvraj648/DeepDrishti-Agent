import os
import time
import torch
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import torchvision.transforms as transforms
from model import UNet

# -------------------- INIT --------------------
app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# -------------------- CONFIG --------------------
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
MODEL_PATH = 'model.pth'
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# -------------------- MODEL LOAD --------------------
print("🔄 Loading U-Net model...")

try:
    model = UNet()
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    print(f"✅ Model loaded successfully on {DEVICE}")
except Exception as e:
    print(f"❌ Model loading failed: {e}")
    model = None

# -------------------- TRANSFORM --------------------
transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
])

# -------------------- HELPERS --------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def tensor_to_image(tensor):
    tensor = tensor.squeeze().cpu().detach()

    # 🔥 FIX: Proper normalization
    tensor = (tensor - tensor.min()) / (tensor.max() - tensor.min() + 1e-8)

    tensor = (tensor * 255).byte()

    return Image.fromarray(tensor.permute(1, 2, 0).numpy())

# -------------------- STATIC FILE SERVE --------------------
@app.route('/outputs/<path:filename>')
def serve_output(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

# -------------------- MAIN API --------------------
@app.route('/enhance', methods=['POST'])
def enhance_image():
    start_time = time.time()

    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        if 'image' not in request.files:
            return jsonify({'error': 'Image field missing'}), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        # Save input
        filename = secure_filename(file.filename)
        timestamp = int(time.time())

        input_path = os.path.join(UPLOAD_FOLDER, f"in_{timestamp}_{filename}")
        output_filename = f"out_{timestamp}_{filename}"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)

        file.save(input_path)

        print(f"📁 Saved input: {input_path}")

        # Preprocess
        image = Image.open(input_path).convert('RGB')
        tensor = transform(image).unsqueeze(0).to(DEVICE)

        print(f"📏 Input shape: {tensor.shape}")

        # Inference
        with torch.no_grad():
            output = model(tensor)

            # ❌ REMOVED sigmoid
            # ✅ FIX:
            output = torch.clamp(output, 0, 1)

        print("MIN:", output.min().item(), "MAX:", output.max().item())

        # Save output
        output_img = tensor_to_image(output)
        output_img.save(output_path)

        print(f"💾 Saved output: {output_path}")

        # Cleanup
        try:
            os.remove(input_path)
        except:
            pass

        processing_time = round((time.time() - start_time) * 1000, 2)

        return jsonify({
            "success": True,
            "enhancedImage": f"/outputs/{output_filename}",
            "processingTime": processing_time
        })

    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# -------------------- HEALTH --------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "modelLoaded": model is not None,
        "device": str(DEVICE)
    })

# -------------------- ROOT --------------------
@app.route('/')
def home():
    return jsonify({
        "message": "U-Net Enhancement API",
        "endpoint": "/enhance"
    })

# -------------------- RUN --------------------
if __name__ == '__main__':
    print("🚀 Flask running at http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)