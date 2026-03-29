# U-Net Image Enhancement Flask Server

A Flask backend service for underwater image enhancement using a pretrained U-Net model.

## 🚀 Features

- **Flask Web Server**: RESTful API for image enhancement
- **PyTorch Integration**: U-Net model with GPU/CPU support
- **Image Processing**: Automatic preprocessing and postprocessing
- **File Management**: Automatic folder creation and cleanup
- **Error Handling**: Comprehensive error responses
- **Logging**: Detailed processing logs
- **Health Checks**: Service monitoring endpoint

## 📋 Requirements

- Python 3.8+
- PyTorch 2.0.1+
- Flask 2.3.3+
- PIL/Pillow 10.0.1+

## 🛠️ Installation

1. **Clone/Download the project files**
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Prepare model file**:
   - Place your trained U-Net model as `model.pth` in the project directory
   - If no model file exists, the server will run with random weights

## 🚀 Running the Server

1. **Start the Flask server**:
   ```bash
   python app.py
   ```

2. **Server will start on**: `http://localhost:5001`

3. **Verify server health**:
   ```bash
   curl http://localhost:5001/health
   ```

## 📡 API Endpoints

### 1. Enhance Image
**POST** `/enhance`

Enhances an uploaded image using the U-Net model.

**Request**:
- Method: POST
- Content-Type: multipart/form-data
- Parameters:
  - `image` (file): Image to enhance (required)

**Response**:
```json
{
  "status": "success",
  "data": {
    "enhanced_image_path": "/outputs/enhanced_timestamp_filename.jpg",
    "processing_time_ms": 123.45,
    "input_filename": "original.jpg",
    "output_filename": "enhanced_timestamp_original.jpg",
    "model_device": "cpu",
    "input_shape": [1, 3, 256, 256],
    "output_shape": [1, 3, 256, 256]
  },
  "message": "Image enhanced successfully"
}
```

### 2. Health Check
**GET** `/health`

Checks server health and model status.

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cpu",
  "timestamp": 1647890123.456
}
```

### 3. API Info
**GET** `/`

Returns API documentation and usage information.

## 🧪 Testing

1. **Using the test client**:
   ```bash
   python test_client.py
   ```

2. **Manual testing with curl**:
   ```bash
   curl -X POST \
     -F "image=@your_image.jpg" \
     http://localhost:5001/enhance
   ```

3. **Using Python requests**:
   ```python
   import requests
   
   with open('image.jpg', 'rb') as f:
       files = {'image': f}
       response = requests.post('http://localhost:5001/enhance', files=files)
       print(response.json())
   ```

## 📁 File Structure

```
ENHANCE_MOD/
├── app.py              # Main Flask application
├── model.py            # U-Net model definition
├── model.pth           # Pretrained model weights
├── requirements.txt     # Python dependencies
├── test_client.py      # Test script
├── README.md          # This file
├── uploads/           # Temporary upload folder
└── outputs/           # Enhanced images output
```

## ⚙️ Configuration

**Default Settings**:
- **Port**: 5001
- **Upload Folder**: `uploads/`
- **Output Folder**: `outputs/`
- **Input Size**: 256x256 pixels
- **Supported Formats**: PNG, JPG, JPEG, TIFF, BMP

**Device Selection**:
- Automatically uses CUDA if available
- Falls back to CPU if CUDA not available

## 🔧 Model Integration

The server expects a U-Net model with:
- **Input**: 3-channel RGB image (256x256)
- **Output**: 3-channel enhanced image (256x256)
- **Architecture**: Standard U-Net with skip connections

## 📝 Processing Pipeline

1. **Upload**: Image received via multipart form
2. **Validation**: File type and size check
3. **Preprocessing**: Resize to 256x256, normalize to [0,1]
4. **Inference**: Pass through U-Net model
5. **Postprocessing**: Apply sigmoid, convert back to image
6. **Save**: Store enhanced image in outputs folder
7. **Response**: Return JSON with results

## 🚨 Error Handling

The server handles:
- Missing model files
- Invalid file types
- Corrupted images
- Model inference errors
- File system errors
- Network timeouts

## 📊 Performance

- **GPU Acceleration**: Automatic CUDA detection
- **Memory Efficient**: Automatic input cleanup
- **Fast Inference**: Optimized tensor operations
- **Concurrent**: Flask handles multiple requests

## 🔍 Logging

The server provides detailed logs for:
- Model loading status
- Request processing
- File operations
- Inference timing
- Error conditions

## 🛡️ Security

- **File Validation**: Only allowed image types
- **Secure Filenames**: Uses werkzeug secure_filename
- **Input Cleanup**: Temporary files removed
- **Error Sanitization**: Safe error messages

## 🚀 Production Deployment

For production use:
1. Set `debug=False` in app.py
2. Use a production WSGI server (Gunicorn, uWSGI)
3. Implement proper logging
4. Add rate limiting
5. Set up reverse proxy (nginx)
6. Configure HTTPS

## 📞 Support

For issues or questions:
1. Check the console logs
2. Verify model file exists
3. Test with the provided test client
4. Check PyTorch and Flask installation
