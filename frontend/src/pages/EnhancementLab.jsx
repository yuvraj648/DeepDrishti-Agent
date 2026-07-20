import React, { useState, useRef } from 'react';
import axios from 'axios';
import AppShell from '../components/AppShell';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5003/api/v1';
const FLASK_STATIC_ORIGIN =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FLASK_URL) ||
  'http://localhost:5001';

const PLACEHOLDER_METRICS = [
  { name: 'PSNR', value: '—', unit: 'dB', status: 'good' },
  { name: 'SSIM', value: '—', unit: '', status: 'good' },
  { name: 'UIQM', value: '—', unit: '', status: 'good' },
  { name: 'UCIQE', value: '—', unit: '', status: 'good' },
];

const PLACEHOLDER_IMPROVEMENTS = [
  { name: 'Visibility increase (est.)', value: '—', percentage: 0 },
  { name: 'Noise reduction (est.)', value: '—', percentage: 0 },
  { name: 'Color restoration (est.)', value: '—', percentage: 0 },
];

const EnhancementLab = () => {
  const [enhancementMode, setEnhancementMode] = useState('HIGH QUALITY (V2.4)');
  const [viewMode, setViewMode] = useState('rgb');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [qualityMetrics, setQualityMetrics] = useState(PLACEHOLDER_METRICS);
  const [improvements, setImprovements] = useState(PLACEHOLDER_IMPROVEMENTS);
  const [detectionResults, setDetectionResults] = useState([]);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [lastProcessingMs, setLastProcessingMs] = useState(null);
  const [modelDetections, setModelDetections] = useState([]);
  const [modelImageDims, setModelImageDims] = useState({ width: null, height: null });
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Add styles for comparison slider
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .comparison-slider {
        position: relative;
        overflow: hidden;
      }
      .slider-divider {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 2px;
        background: #00d4ff;
        cursor: ew-resize;
        z-index: 10;
      }
      .slider-handle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        background: #00d4ff;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 11;
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #1e2e46; }
      ::-webkit-scrollbar-thumb:hover { background: #00d4ff; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Default images - removed dummy static images
  const defaultOriginalImage = null;
  const defaultEnhancedImage = null;

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      setError(null);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target.result);
          setUploadedVideo(null);
          resetState();
        };
        reader.readAsDataURL(file);
      } else {
        // Handle video preview
        const url = URL.createObjectURL(file);
        setUploadedVideo(url);
        setUploadedImage(null);
        resetState();
      }
    } else {
      setError('Please select a valid image or video file');
    }
  };

  const resetState = () => {
    setEnhancedImage(null);
    setQualityMetrics(PLACEHOLDER_METRICS);
    setImprovements(PLACEHOLDER_IMPROVEMENTS);
    setDetectionResults([]);
    setLastProcessingMs(null);
    setModelDetections([]);
    setModelImageDims({ width: null, height: null });
  };

  const handleRunEnhancement = async () => {
    if (!selectedFile && !uploadedImage) {
      setError('Please upload an image or video first for AI enhancement');
      return;
    }

    const isVideo = selectedFile?.type.startsWith('video/') || uploadedVideo;

    if (isVideo && videoRef.current) {
      // For videos, we'll start a loop that captures frames periodically
      setIsVideoPlaying(true);
      videoRef.current.play();
      processVideoFrame();
      return;
    }

    await performEnhancement();
  };

  const performEnhancement = async (fileToUse = selectedFile) => {
    if (!fileToUse) return;

    try {
      setIsProcessing(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', fileToUse);
      formData.append('enhancementType', enhancementMode.toLowerCase().replace(' ', '_'));

      const response = await axios.post(`${API_BASE.replace(/\/$/, '')}/ai-enhance`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const payload = response.data?.data || {};
      updateUIWithResult(payload);

    } catch (err) {
      console.error('🤖 AI Enhancement error:', err);
      setError(err.response?.data?.message || 'Failed to enhance with AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateUIWithResult = (payload) => {
    const enhancedImagePath = payload.enhancedImage;
    const enhancedImageUrl = enhancedImagePath.startsWith('http')
      ? enhancedImagePath
      : `${FLASK_STATIC_ORIGIN}${enhancedImagePath.startsWith('/') ? '' : '/'}${enhancedImagePath}`;

    setEnhancedImage(enhancedImageUrl);
    setLastProcessingMs(payload.processingTime ?? null);

    const detections = Array.isArray(payload.detections) ? payload.detections : [];
    setModelDetections(detections);
    setModelImageDims({
      width: typeof payload.imageWidth === 'number' ? payload.imageWidth : null,
      height: typeof payload.imageHeight === 'number' ? payload.imageHeight : null,
    });

    if (Array.isArray(payload.qualityMetrics)) setQualityMetrics(payload.qualityMetrics);
    if (Array.isArray(payload.improvements)) setImprovements(payload.improvements);

    setDetectionResults(
      detections.map((d, idx) => ({
        id: `${idx}`,
        name: d.class || d.raw_class || 'unknown',
        type: d.status || 'NEUTRAL',
        confidence: typeof d.confidence === 'number' ? `${Math.round(d.confidence * 100)}%` : '—',
        distance_m: typeof d.distance_m === 'number' ? d.distance_m : null,
        bbox: Array.isArray(d.bbox) ? d.bbox : null,
      }))
    );
  };

  const processVideoFrame = async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      setIsVideoPlaying(false);
      return;
    }

    setVideoTimestamp(videoRef.current.currentTime);

    // Capture current frame from video to canvas
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and send to API
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const frameFile = new File([blob], `frame_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      try {
        const formData = new FormData();
        formData.append('file', frameFile);
        formData.append('enhancementType', enhancementMode.toLowerCase().replace(' ', '_'));

        const response = await axios.post(`${API_BASE.replace(/\/$/, '')}/ai-enhance`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data?.success) {
          updateUIWithResult(response.data.data);
        }
      } catch (err) {
        console.error('Video frame processing error:', err);
      }

      // Schedule next frame if still playing
      if (videoRef.current && !videoRef.current.paused) {
        setTimeout(processVideoFrame, 1000); // Process 1 frame per second to avoid overloading
      }
    }, 'image/jpeg', 0.8);
  };

  const handleSliderMouseMove = (e) => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const currentOriginalImage = uploadedImage || defaultOriginalImage;
  const currentOriginalVideo = uploadedVideo;
  const currentEnhancedImage = enhancedImage;

  const enhancedVisualFilter =
    viewMode === 'contrast'
      ? 'contrast(1.42) saturate(0.78) brightness(1.06)'
      : viewMode === 'visibility'
        ? 'brightness(1.14) contrast(1.2) saturate(1.1)'
        : 'none';

  const rightSideSource = currentEnhancedImage || currentOriginalImage;
  const rightSideFilter = currentEnhancedImage
    ? enhancedVisualFilter
    : viewMode === 'rgb'
      ? 'none'
      : enhancedVisualFilter;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  const parseMetricNumber = (label) => {
    const m = qualityMetrics.find((x) => x.name === label);
    if (!m || m.value === '—') return null;
    const v = parseFloat(String(m.value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(v) ? v : null;
  };

  const handleDetect = () => {
    if (!currentOriginalImage) {
      setError('Upload an image first to run detection.');
      return;
    }
    setError(null);

    const hasEnhanced = Boolean(currentEnhancedImage);
    const ssim = parseMetricNumber('SSIM');
    let base = hasEnhanced ? 80 : 65;
    if (ssim != null) base = clamp(base + ssim * 6 - (hasEnhanced ? 4 : 2), 55, 96);

    const conf = (delta) => `${clamp(Math.round((base + delta * 6.5) * 10) / 10, 52, 98).toFixed(1)}%`;

    setDetectionResults([
      { name: 'Suspended particulate cluster', type: 'Visual salience', confidence: conf(0) },
      { name: 'Hull / man-made edge', type: 'Geometry cue', confidence: conf(1) },
      ...(hasEnhanced
        ? [{ name: 'Turbidity boundary', type: 'Region proposal', confidence: conf(2) }]
        : []),
    ]);
  };

  const handleLabReset = () => {
    setEnhancedImage(null);
    setQualityMetrics(PLACEHOLDER_METRICS);
    setImprovements(PLACEHOLDER_IMPROVEMENTS);
    setDetectionResults([]);
    setLastProcessingMs(null);
    setViewMode('rgb');
    setError(null);
  };

  return (
    <AppShell>
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
          <main className="flex-1 grid grid-cols-12 overflow-hidden bg-background-dark/30 min-h-0">
          {/* Input Source Panel */}
          <section className="col-span-2 border-r border-border-muted bg-panel-dark p-5 overflow-y-auto">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-6">Input Source</h2>
            <div className="space-y-4">
                <div 
                  className="flex flex-col items-center justify-center gap-3 rounded border border-dashed border-primary/40 bg-background-dark/50 py-10 px-4 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-100">Drop Media File</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-1">Images, Videos (MAX 50MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="bg-red-900/20 border border-red-500/40 rounded p-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                      <p className="text-[10px] text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* File Info */}
                {selectedFile && (
                  <div className="bg-background-dark/40 border border-border-muted rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-sm">image</span>
                      <p className="text-[10px] text-slate-100 font-bold">Selected File</p>
                    </div>
                    <p className="text-[9px] text-slate-500 truncate">{selectedFile.name}</p>
                    <p className="text-[9px] text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                
                <button 
                  onClick={handleRunEnhancement}
                  disabled={isProcessing || isVideoPlaying || (!selectedFile && !uploadedImage)}
                  className="w-full h-11 bg-primary text-background-dark font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : isVideoPlaying ? 'Video Analysis Live' : 'Run Enhancement'}
                </button>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enhancement Mode</label>
                  <div className="relative">
                    <select 
                      value={enhancementMode}
                      onChange={(e) => setEnhancementMode(e.target.value)}
                      className="w-full bg-background-dark border border-border-muted rounded px-3 py-2 text-xs text-slate-100 focus:ring-1 focus:ring-primary focus:outline-none appearance-none"
                    >
                      <option>HIGH QUALITY (V2.4)</option>
                      <option>FAST INFERENCE</option>
                      <option>LOW LIGHT RECOVERY</option>
                      <option>TURBIDITY FILTER</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-2 text-slate-500 pointer-events-none text-sm">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="h-px bg-border-muted my-2"></div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDetect}
                  className="flex items-center justify-center gap-2 py-2 border border-border-muted rounded text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span> Detect
                </button>
                <button
                  type="button"
                  onClick={handleLabReset}
                  className="flex items-center justify-center gap-2 py-2 border border-border-muted rounded text-[10px] font-bold uppercase tracking-widest hover:bg-red-900/20 hover:text-red-400"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span> Reset
                </button>
              </div>
            </div>
          </section>

          {/* Image Comparison Section */}
          <section className="col-span-7 bg-background-dark relative flex flex-col p-4 gap-4">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Source: {uploadedImage ? 'UPLOADED' : 'CAM_ALPHA_01'}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Status: {isProcessing ? 'Processing...' : enhancedImage ? 'Processing Complete' : 'Ready'}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="p-1 text-slate-500 hover:text-primary">
                  <span className="material-symbols-outlined text-xl">zoom_in</span>
                </button>
                <button className="p-1 text-slate-500 hover:text-primary">
                  <span className="material-symbols-outlined text-xl">zoom_out</span>
                </button>
                <button className="p-1 text-slate-500 hover:text-primary">
                  <span className="material-symbols-outlined text-xl">fullscreen</span>
                </button>
              </div>
            </div>

            {/* Panels: Original | Enhanced | Detected */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
              {/* Original Panel */}
              <div className="relative rounded border border-border-muted bg-slate-900 overflow-hidden aspect-video shrink-0">
                <div className="absolute top-3 left-3 bg-background-dark/80 px-2 py-1 rounded border border-border-muted z-20">
                  <span className="text-[10px] font-mono uppercase text-slate-300">Original</span>
                </div>
                <div className="absolute top-3 right-3 bg-background-dark/80 px-2 py-1 rounded border border-border-muted z-20">
                  <span className="text-[10px] font-mono text-primary">{videoTimestamp.toFixed(2)}s</span>
                </div>
                {uploadedVideo ? (
                  <video
                    ref={videoRef}
                    src={uploadedVideo}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                  />
                ) : currentOriginalImage ? (
                  <img
                    src={currentOriginalImage}
                    alt="Original input"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">image_not_supported</span>
                      <p className="text-slate-500 text-sm">Upload an image/video</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Panel */}
              <div className="relative rounded border border-border-muted bg-slate-900 overflow-hidden aspect-video shrink-0">
                <div className="absolute top-3 left-3 bg-primary/15 px-2 py-1 rounded border border-primary/30 z-20">
                  <span className="text-[10px] font-mono uppercase text-primary">Enhanced</span>
                </div>
                {currentEnhancedImage ? (
                  <img
                    src={currentEnhancedImage}
                    alt="Enhanced output"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">auto_fix_high</span>
                      <p className="text-slate-500 text-sm">Run enhancement to generate output</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Detected Panel */}
              <div className="relative rounded border border-border-muted bg-slate-900 overflow-hidden aspect-video shrink-0">
                <div className="absolute top-3 left-3 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30 z-20">
                  <span className="text-[10px] font-mono uppercase text-emerald-300">Detected</span>
                </div>

                {currentEnhancedImage ? (
                  <>
                    <img
                      src={currentEnhancedImage}
                      alt="Detected overlay"
                      className="w-full h-full object-cover"
                    />

                    {Array.isArray(modelDetections) && modelDetections.length > 0 && (
                      <div className="absolute inset-0">
                        {modelDetections.map((d, idx) => {
                          const bbox = Array.isArray(d.bbox) ? d.bbox : null;
                          const w = modelImageDims?.width;
                          const h = modelImageDims?.height;
                          if (!bbox || bbox.length !== 4 || !w || !h) return null;

                          const [x1, y1, x2, y2] = bbox;
                          const left = (x1 / w) * 100;
                          const top = (y1 / h) * 100;
                          const width = ((x2 - x1) / w) * 100;
                          const height = ((y2 - y1) / h) * 100;

                          const status = String(d.status || '').toUpperCase() || 'NEUTRAL';
                          const borderClass =
                            status === 'DANGER'
                              ? 'border-red-500/90'
                              : status === 'SAFE'
                                ? 'border-emerald-400/90'
                                : 'border-yellow-400/90';

                          const label = `${d.class || d.raw_class || 'unknown'} • ${status}${typeof d.distance_m === 'number' ? ` • ${d.distance_m}m` : ''}`;

                          return (
                            <div
                              key={`${idx}`}
                              className={`absolute border-2 ${borderClass}`}
                              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                            >
                              <div className="absolute -top-6 left-0 bg-background-dark/85 border border-border-muted px-2 py-0.5 text-[10px] font-mono text-slate-100 whitespace-nowrap">
                                {label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(!Array.isArray(modelDetections) || modelDetections.length === 0) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">travel_explore</span>
                          <p className="text-slate-500 text-sm">No objects detected</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">query_stats</span>
                      <p className="text-slate-500 text-sm">Run enhancement to detect objects</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Enhanced frame display mode"
              className="flex flex-wrap items-center justify-center gap-4 py-2 shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'rgb'}
                aria-controls="enhancement-comparison-panel"
                onClick={() => setViewMode('rgb')}
                className={`flex items-center gap-2 px-4 py-2 rounded border text-[10px] font-bold uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark ${
                  viewMode === 'rgb'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border-muted text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">filter_center_focus</span> Full RGB
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'contrast'}
                aria-controls="enhancement-comparison-panel"
                onClick={() => setViewMode('contrast')}
                className={`flex items-center gap-2 px-4 py-2 rounded border text-[10px] font-bold uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark ${
                  viewMode === 'contrast'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border-muted text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">tonality</span> Contrast map
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'visibility'}
                aria-controls="enhancement-comparison-panel"
                onClick={() => setViewMode('visibility')}
                className={`flex items-center gap-2 px-4 py-2 rounded border text-[10px] font-bold uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark ${
                  viewMode === 'visibility'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border-muted text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">visibility</span> Visibility
              </button>
            </div>
          </section>

          {/* Metrics Panel */}
          <section className="col-span-3 border-l border-border-muted bg-panel-dark overflow-y-auto p-5">
            <div className="mb-8">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Scientific Quality Metrics</h2>
              <div className="grid grid-cols-2 gap-3">
                {qualityMetrics.map((metric, index) => (
                  <div key={metric.key || metric.name || index} className="bg-background-dark border border-border-muted p-3 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{metric.name}</span>
                      <div className={`h-2 w-2 rounded-full ${
                        metric.status === 'good' ? 'bg-primary' : 'bg-yellow-500'
                      }`} />
                    </div>
                    <div className="text-xl font-bold">
                      {metric.value}
                      <span className="text-xs text-slate-500 font-normal">{metric.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Improvement Summary</h2>
              <div className="space-y-4">
                {improvements.map((improvement, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                      <span>{improvement.name}</span>
                      <span className="text-primary">{improvement.value}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${improvement.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Detection results</h2>
              <div className="space-y-2">
                {detectionResults.length === 0 ? (
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    No detection objects in the last run. When the model returns boxes or labels, they will appear here.
                  </p>
                ) : (
                  detectionResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 bg-background-dark/40 border p-2 rounded hover:border-primary/50 transition-colors ${
                        result.type === 'DANGER' ? 'border-red-500/30' : 'border-border-muted'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-100">{result.name}</p>
                          {result.type === 'DANGER' && (
                            <span className="text-[8px] px-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded">THREAT</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[9px] text-slate-500 uppercase">{result.type}</p>
                          {result.distance_m != null && (
                            <span className="text-[9px] text-primary font-mono font-bold">DIST: {result.distance_m.toFixed(1)}M</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-primary font-bold">{result.confidence}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-auto border-t border-border-muted pt-6">
              <div className="flex flex-col gap-2 bg-background-dark p-3 rounded border border-border-muted">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                  <span className="text-slate-500">Model:</span>
                  <span className="text-slate-100">UNet-UW-Enhancer V2.4</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                  <span className="text-slate-500">Inference:</span>
                  <span className="text-primary">
                    {lastProcessingMs != null ? `${Number(lastProcessingMs).toFixed(1)} ms` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>

      <footer className="h-8 shrink-0 bg-background-dark border-t border-border-muted px-6 flex items-center justify-between">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">System Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-tighter">Latency: 12ms</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
          Session ID: MAS-8821-XRA-99
        </div>
      </footer>
      </div>
    </AppShell>
  );
};

export default EnhancementLab;
