import requests
import json
import os

def test_flask_server():
    """Test the Flask enhancement server"""
    
    # Server URL
    url = "http://localhost:5001/enhance"
    health_url = "http://localhost:5001/health"
    
    print("🧪 Testing Flask Enhancement Server")
    print("=" * 50)
    
    # Test health endpoint
    print("1. Testing health endpoint...")
    try:
        response = requests.get(health_url)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return
    
    print("\n2. Testing enhancement endpoint...")
    
    # Check if test image exists
    test_image_path = "test_image.jpg"
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        print("   Please place a test image named 'test_image.jpg' in the current directory")
        return
    
    # Test enhancement endpoint
    try:
        with open(test_image_path, 'rb') as f:
            files = {'image': f}
            data = {'test': 'true'}
            
            print(f"   Sending request to: {url}")
            response = requests.post(url, files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Enhancement successful!")
                print(f"   Processing time: {result['data']['processing_time_ms']}ms")
                print(f"   Enhanced image: {result['data']['enhanced_image_path']}")
                print(f"   Model device: {result['data']['model_device']}")
            else:
                print(f"❌ Enhancement failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
    except Exception as e:
        print(f"❌ Enhancement error: {e}")

if __name__ == "__main__":
    test_flask_server()
