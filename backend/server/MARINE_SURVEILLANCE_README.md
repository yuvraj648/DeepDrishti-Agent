# 🌊 Marine Surveillance Dashboard Backend System

A complete backend system for AquaScope Marine Surveillance Dashboard with real-time underwater monitoring, AI-powered detection, and alert management.

## 📋 System Overview

The Marine Surveillance Dashboard Backend provides:
- **4 Live Underwater Video Feeds** with metadata management
- **AI-Powered Detection Pipeline** integrated with Flask API
- **Real-Time Alert System** with severity-based notifications
- **Comprehensive Dashboard** with analytics and system monitoring
- **Role-Based Access Control** for naval operations
- **RESTful API** with full CRUD operations

## 🏗️ Architecture

### Database Models
- **Feed Model**: Video feed management with detection settings
- **Alert Model**: Threat detection and alert tracking
- **User Model**: Role-based authentication (existing)

### API Endpoints

#### 📹 Feed Management
```
GET    /api/v1/feeds              - Get all feeds with filtering
GET    /api/v1/feeds/active       - Get active feeds only
GET    /api/v1/feeds/:id          - Get single feed details
POST   /api/v1/feeds              - Create new feed (admin)
PUT    /api/v1/feeds/:id          - Update feed (admin)
DELETE /api/v1/feeds/:id          - Delete feed (admin)
PUT    /api/v1/feeds/:id/status   - Toggle feed status
POST   /api/v1/feeds/:id/detect   - Manual detection trigger
```

#### 🚨 Alert Management
```
GET    /api/v1/alerts             - Get all alerts with filtering
GET    /api/v1/alerts/active      - Get active alerts only
GET    /api/v1/alerts/recent      - Get recent alerts (24h)
GET    /api/v1/alerts/:id         - Get single alert details
POST   /api/v1/alerts             - Create alert (system)
PUT    /api/v1/alerts/:id/resolve - Resolve alert
PUT    /api/v1/alerts/bulk-resolve - Bulk resolve alerts
DELETE /api/v1/alerts/:id         - Delete alert (admin)
```

#### 📊 Dashboard Analytics
```
GET    /api/v1/dashboard/summary          - Dashboard overview
GET    /api/v1/dashboard/system-status    - Real-time system status
GET    /api/v1/dashboard/analytics        - Detailed analytics
GET    /api/v1/dashboard/surveillance/:id - Surveillance mode data
```

## 🔧 Detection Service

### Flask API Integration
- **Endpoint**: `POST http://localhost:5001/detect`
- **Automatic Processing**: Every 10 seconds per active feed
- **Fallback Simulation**: Built-in detection when Flask API unavailable

### Detection Pipeline
1. **Frame Capture**: Simulate from video stream
2. **API Call**: Send to Flask detection service
3. **Response Processing**: Analyze confidence and threat level
4. **Alert Generation**: Create alerts for high-confidence threats
5. **Database Update**: Update feed statistics

## 🎭 Sample Data

### 4 Underwater Video Feeds
1. **Coral Reef Monitoring** - Great Barrier Reef
2. **Deep Sea Exploration** - Mariana Trench Region  
3. **Coastal Security** - Naval Base Entrance
4. **Pipeline Monitor** - Subsea Pipeline Route

### Sample Detection Results
```json
{
  "threat": true,
  "confidence": 0.87,
  "type": "anomaly",
  "detectedObject": "unknown_object",
  "boundingBox": { "x": 120, "y": 80, "width": 75, "height": 60 }
}
```

## 🔐 Security & Access Control

### User Roles
- **Captain / Vice Captain**: Full system access
- **Surveillance Head**: Feeds + alerts management
- **Engineer**: System + feeds configuration
- **Analyst**: Read-only access to all data

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Secure API endpoints with middleware

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 4.4+
- Flask AI Detection Service (optional)

### Installation

1. **Install Dependencies**
```bash
cd BACKEND/server
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Start MongoDB
mongod

# Seed sample data
node seed/marineFeeds.js
```

4. **Start Server**
```bash
# Production mode (requires MongoDB)
npm start

# Development mode
npm run dev

# Test mode (mock data, no DB required)
node test-server.js
```

## 🧪 Testing

### Test Server (No Database Required)
```bash
node test-server.js
```
Access: http://localhost:5006/api/v1

### Test Endpoints
```bash
# Health check
curl http://localhost:5006/api/v1/health

# Get all feeds
curl http://localhost:5006/api/v1/test/feeds

# Get dashboard summary
curl http://localhost:5006/api/v1/test/dashboard/summary
```

## 📁 File Structure

```
BACKEND/server/
├── models/
│   ├── Feed.js              # Feed model with detection settings
│   ├── Alert.js             # Alert model with threat tracking
│   └── User.js              # User authentication (existing)
├── controllers/
│   ├── feedController.js    # Feed CRUD operations
│   ├── alertController.js   # Alert management
│   └── dashboardController.js # Analytics & dashboard
├── routes/
│   ├── feedRoutes.js        # Feed API endpoints
│   ├── alertRoutes.js       # Alert API endpoints
│   ├── dashboardRoutes.js    # Dashboard endpoints
│   └── testMarineRoutes.js  # Test endpoints (mock data)
├── services/
│   └── detectionService.js  # Flask API integration
├── seed/
│   └── marineFeeds.js       # Sample data seeding
├── middleware/
│   └── authMiddleware.js    # JWT & RBAC (existing)
├── server.js                # Production server
├── test-server.js           # Test server (mock data)
└── .env                     # Environment configuration
```

## 🔌 Flask API Integration

### Expected Response Format
```json
{
  "threat": true,
  "confidence": 0.87,
  "type": "object/anomaly",
  "detectedObject": "diver",
  "boundingBox": {
    "x": 200, "y": 150, "width": 45, "height": 80
  },
  "processingTime": 1.8
}
```

### Configuration
```env
FLASK_API_URL=http://localhost:5001
```

## 📊 Dashboard Features

### Real-Time Monitoring
- Live feed status and health
- Active alerts with severity indicators
- Detection statistics and trends
- System performance metrics

### Analytics
- Feed performance by sector
- Alert resolution times
- Detection confidence trends
- Threat type distribution

### Surveillance Mode
- Full-screen video feed view
- Real-time alert stream
- Detection history timeline
- Manual alert resolution

## 🚨 Alert System

### Alert Types
- **Intrusion**: Unauthorized access detected
- **Anomaly**: Unusual activity patterns
- **Object**: Suspicious objects identified
- **Threat**: High-confidence security threats

### Severity Levels
- **Critical**: Immediate action required (>90% confidence)
- **High**: Urgent attention needed (>80% confidence)
- **Medium**: Monitor closely (>70% confidence)
- **Low**: Informational (<70% confidence)

### Alert Lifecycle
1. **Detection**: AI identifies potential threat
2. **Creation**: Alert generated with metadata
3. **Assignment**: Optional assignment to personnel
4. **Investigation**: Human review and analysis
5. **Resolution**: Alert closed with notes

## 🔄 Real-Time Features

### Detection Service
- Automatic processing every 10 seconds
- Configurable intervals per feed
- Graceful fallback when Flask API unavailable
- Performance monitoring and logging

### System Health
- Database connection monitoring
- Flask API availability checking
- Feed status tracking
- Alert processing metrics

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in .env
   - Use test server for development

2. **Flask API Unavailable**
   - Detection service auto-fallback to simulation
   - Check FLASK_API_URL configuration
   - Verify Flask service is running

3. **Port Conflicts**
   - Default ports: 5003 (production), 5005 (dev), 5006 (test)
   - Update PORT in .env if needed

### Debug Mode
```bash
DEBUG=marine-surveillance npm run dev
```

## 📈 Performance

### Optimization Features
- Database indexing on frequently queried fields
- Efficient aggregation pipelines for analytics
- Configurable detection intervals
- Graceful degradation under load

### Monitoring
- Request logging with Morgan
- Error tracking and reporting
- Performance metrics collection
- System health checks

## 🔮 Future Enhancements

- WebSocket support for real-time updates
- Video stream processing with OpenCV
- Machine learning model integration
- Mobile API endpoints
- Advanced analytics with time-series data
- Multi-tenant support for multiple naval bases

---

**AquaScope Marine Surveillance System**  
*Advanced Underwater Monitoring & Threat Detection*
