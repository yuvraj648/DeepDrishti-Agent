# 🌊 Marine Surveillance Dashboard - Frontend Integration Guide

## ✅ Integration Status: COMPLETE

The Marine Surveillance Dashboard has been successfully updated with real video feed integration and backend API connectivity.

## 🔗 What's Been Integrated

### 1. **Real Video Feeds** ✅
- **Before**: Static images from Google Photos
- **After**: Live YouTube video embeds from backend API
- **Feeds**: 4 underwater video feeds with metadata
  - Coral Reef Monitoring (Great Barrier Reef)
  - Deep Sea Exploration (Mariana Trench)
  - Coastal Security (Naval Base Entrance)
  - Pipeline Monitor (Subsea Pipeline Route)

### 2. **Backend API Integration** ✅
- **Marine Service**: Complete API client with all endpoints
- **Real-time Data**: Live feeds, alerts, and dashboard stats
- **Fallback System**: Test data when backend unavailable
- **Authentication**: JWT-based with role-based access

### 3. **Dashboard Updates** ✅
- **Live Video**: YouTube iframe integration with proper controls
- **Real-time Alerts**: Active alerts with severity indicators
- **System Statistics**: Dynamic stats from backend API
- **Auto-refresh**: 30-second polling for live updates

### 4. **Surveillance Mode** ✅
- **Full-screen Video**: Individual feed monitoring
- **Detection Overlays**: Real-time bounding boxes from alerts
- **Feed Switching**: Quick navigation between feeds
- **Alert History**: Recent detections for selected feed

## 🚀 How to Use

### Development Setup

1. **Start Backend API Server**
```bash
cd BACKEND/server
node test-server.js
```
*Server runs on: http://localhost:5006*

2. **Start Frontend Development Server**
```bash
cd FRONTEND
npm run dev
```
*Frontend runs on: http://localhost:5174*

3. **Access the Dashboard**
```
Open: http://localhost:5174
```

### Production Setup

1. **Start Production Backend**
```bash
cd BACKEND/server
npm start
```
*Requires MongoDB connection*

2. **Build Frontend**
```bash
cd FRONTEND
npm run build
```

## 📹 Video Feed Details

### YouTube Embed URLs
1. **Coral Reef**: `https://www.youtube.com/embed/6zrn4-FfbXw`
2. **Deep Sea**: `https://www.youtube.com/embed/1Vd2b8sN0Dc`
3. **Coastal Security**: `https://www.youtube.com/embed/mx6gK6z0x0g`
4. **Pipeline Monitor**: `https://www.youtube.com/embed/2OEL4P1Rz04`

### Feed Features
- **Live Streaming**: Real YouTube video playback
- **Full Screen**: Click "Open Feed" for surveillance mode
- **Status Indicators**: Online/Offline with pulse animation
- **Location Info**: Sector and location metadata
- **Alert Count**: Active alerts per feed

## 🔌 API Endpoints Used

### Feed Management
- `GET /api/v1/feeds/active` - Get active video feeds
- `GET /api/v1/feeds/:id` - Get specific feed details
- `GET /api/v1/test/feeds/active` - Test endpoint fallback

### Alert System
- `GET /api/v1/alerts/active` - Get active alerts
- `PUT /api/v1/alerts/:id/resolve` - Resolve alerts
- `GET /api/v1/test/alerts/active` - Test endpoint fallback

### Dashboard Analytics
- `GET /api/v1/dashboard/summary` - Dashboard statistics
- `GET /api/v1/dashboard/surveillance/:id` - Surveillance mode data
- `GET /api/v1/test/dashboard/summary` - Test endpoint fallback

## 🎯 Key Features Demonstrated

### 1. **Real-time Video Surveillance**
- Live YouTube video feeds in dashboard grid
- Individual feed monitoring in surveillance mode
- Smooth video playback with controls

### 2. **AI-Powered Detection**
- Real-time alert generation from backend
- Visual bounding boxes for detected objects
- Confidence scores and threat classification

### 3. **Alert Management**
- Live alert stream with severity levels
- Interactive alert resolution
- Alert history and filtering

### 4. **System Monitoring**
- Real-time dashboard statistics
- Feed health monitoring
- System performance metrics

### 5. **Responsive Design**
- Mobile-friendly interface
- Adaptive grid layouts
- Touch-friendly controls

## 🔄 Data Flow

```
Frontend (React) 
    ↓ HTTP API Calls
Backend (Node.js/Express)
    ↓ Detection Processing
Flask AI Service (Optional)
    ↓ Results
MongoDB Database
    ↓ Real-time Updates
Frontend Dashboard
```

## 🛠️ Technical Implementation

### Frontend Technologies
- **React 18** with hooks and modern patterns
- **Vite** for fast development and building
- **TailwindCSS** for responsive styling
- **Material Symbols** for consistent icons
- **Axios-like** API service with fetch

### Backend Technologies
- **Node.js/Express** REST API
- **MongoDB** with Mongoose ODM
- **JWT Authentication** with role-based access
- **Flask Integration** for AI detection
- **Real-time Processing** with configurable intervals

### Integration Features
- **Error Handling**: Graceful fallback to test data
- **Loading States**: User-friendly loading indicators
- **Auto-refresh**: Real-time data updates
- **Authentication**: Secure API communication
- **Responsive Design**: Works on all devices

## 🧪 Testing Scenarios

### 1. **Backend Available**
- Real video feeds from database
- Live alerts from detection service
- Real-time dashboard statistics

### 2. **Backend Unavailable**
- Automatic fallback to test data
- Mock video feeds with sample URLs
- Simulated alerts and statistics
- No application crashes

### 3. **Authentication Required**
- JWT token management
- Role-based access control
- Secure API communication

## 📱 Browser Compatibility

- **Chrome/Edge**: Full YouTube embed support
- **Firefox**: Full functionality
- **Safari**: Video playback supported
- **Mobile**: Responsive design works

## 🚨 Troubleshooting

### Common Issues

1. **Videos Not Loading**
   - Check backend server is running on port 5006
   - Verify API URL in .env file
   - Check browser console for CORS errors

2. **API Connection Failed**
   - Backend server not started
   - Wrong port configuration
   - Network connectivity issues

3. **Static Images Showing**
   - Backend API unavailable
   - Fallback to test data activated
   - Check server logs for errors

### Solutions

1. **Restart Services**
```bash
# Stop all servers (Ctrl+C)
# Restart backend
cd BACKEND/server && node test-server.js
# Restart frontend
cd FRONTEND && npm run dev
```

2. **Check Configuration**
```bash
# Verify API URLs
cat FRONTEND/.env
cat BACKEND/server/.env
```

3. **Clear Browser Cache**
- Hard refresh: Ctrl+Shift+R
- Clear cache and localStorage
- Restart browser

## 🎉 Success Metrics

- ✅ **4 Video Feeds**: All YouTube videos working
- ✅ **Real-time Alerts**: Live alert system
- ✅ **Dashboard Analytics**: Dynamic statistics
- ✅ **Surveillance Mode**: Full-screen monitoring
- ✅ **API Integration**: Complete backend connectivity
- ✅ **Error Handling**: Graceful fallback system
- ✅ **Responsive Design**: Mobile compatible
- ✅ **Authentication**: Secure API access

## 📞 Support

If you encounter issues:

1. **Check Console**: Browser dev tools for errors
2. **Verify Servers**: Both backend and frontend running
3. **Check Network**: API connectivity and CORS
4. **Review Logs**: Server logs for errors

---

**Marine Surveillance Dashboard**  
*Complete Frontend-Backend Integration*  
*Real-time Video Monitoring & AI Detection*
