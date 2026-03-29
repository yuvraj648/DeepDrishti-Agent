# AquaScope Backend API

Full-stack Node.js + Express + MongoDB backend for AquaScope underwater detection system.

## Features

- 🚀 Express.js server with RESTful API
- 🗄️ MongoDB with Mongoose ODM
- 🔐 Authentication & Authorization (JWT)
- 📊 Advanced filtering, pagination, and sorting
- 🛡️ Security middleware (Helmet, CORS)
- 📝 Comprehensive error handling
- 📈 Statistics and analytics endpoints
- 🔍 Search and filter capabilities

## Project Structure

```
BACKEND/
├── server/
│   ├── models/           # Mongoose models
│   │   ├── Detection.js
│   │   └── User.js
│   ├── controllers/       # Route controllers
│   │   ├── detectionController.js
│   │   └── userController.js
│   ├── routes/           # API routes
│   │   ├── detectionRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   └── server.js        # Main server file
├── .env                # Environment variables
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Installation

1. **Install Dependencies**

   ```bash
   npm install
   ```
2. **Environment Setup**

   ```bash
   # Copy .env file and update with your configuration
   cp .env.example .env
   ```
3. **MongoDB Setup**

   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in `.env` file
4. **Start Development Server**

   ```bash
   npm run dev
   ```
5. **Start Production Server**

   ```bash
   npm start
   ```

## API Endpoints

### Detection Routes (`/api/v1/detections`)

| Method | Endpoint                | Description                       | Access |
| ------ | ----------------------- | --------------------------------- | ------ |
| GET    | `/`                   | Get all detections (with filters) | Public |
| GET    | `/stats`              | Get detection statistics          | Public |
| GET    | `/:id`                | Get single detection              | Public |
| POST   | `/`                   | Create new detection              | Public |
| PUT    | `/:id`                | Update detection                  | Public |
| DELETE | `/:id`                | Delete detection                  | Public |
| PATCH  | `/:id/confirm`        | Confirm detection                 | Public |
| PATCH  | `/:id/false-positive` | Mark as false positive            | Public |

### User Routes (`/api/v1/users`)

| Method | Endpoint          | Description         | Access  |
| ------ | ----------------- | ------------------- | ------- |
| GET    | `/`             | Get all users       | Admin   |
| GET    | `/stats`        | Get user statistics | Admin   |
| GET    | `/:id`          | Get single user     | Private |
| POST   | `/`             | Create new user     | Admin   |
| PUT    | `/:id`          | Update user         | Private |
| DELETE | `/:id`          | Delete user         | Admin   |
| PATCH  | `/:id/password` | Update password     | Private |

### System Routes

| Method | Endpoint           | Description           |
| ------ | ------------------ | --------------------- |
| GET    | `/api/v1/health` | Health check endpoint |

## Query Parameters

### Detection Filtering

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `cameraSource` - Filter by camera (CAM_ALPHA_01, CAM_ALPHA_02, etc.)
- `objectDetected` - Filter by object type
- `status` - Filter by status (Investigating, Confirmed, False Positive)
- `confidence` - Filter by confidence range (e.g., "80-90", ">90", "<70")
- `startDate` - Filter by start date (ISO format)
- `endDate` - Filter by end date (ISO format)
- `sortBy` - Sort field (default: timestamp)
- `sortOrder` - Sort order (asc, desc)

## Data Models

### Detection

```javascript
{
  id: String (unique),
  cameraSource: String (enum),
  objectDetected: String (enum),
  confidence: Number (0-100),
  timestamp: Date,
  status: String (enum),
  snapshot: String (URL),
  enhancedImage: String (URL),
  location: {
    latitude: Number,
    longitude: Number,
    depth: Number
  },
  aiModel: String,
  processingTime: Number,
  server: String,
  reviewedBy: String,
  reviewNotes: String,
  reviewedAt: Date
}
```

### User

```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String (enum),
  isActive: Boolean,
  isEmailVerified: Boolean,
  lastLogin: Date,
  lastActivity: Date,
  preferences: {
    theme: String,
    notifications: {
      email: Boolean,
      browser: Boolean
    },
    language: String
  }
}
```

## Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/aquascope

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# API Configuration
API_VERSION=v1
API_BASE_URL=http://localhost:5000
```

## Error Handling

The API includes comprehensive error handling:

- **Validation Errors** (400)
- **Duplicate Key Errors** (400)
- **Cast Errors** (400)
- **Not Found Errors** (404)
- **Authentication Errors** (401)
- **Authorization Errors** (403)
- **Server Errors** (500)

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - (Can be added)
- **Input Validation** - Mongoose validation
- **Password Hashing** - bcryptjs
- **JWT Authentication** - (Ready to implement)

## Development

### Available Scripts

```bash
npm run dev    # Start with nodemon (auto-restart)
npm start        # Start production server
npm test          # Run tests (to be implemented)
```

### Database Seeding

You can create sample data using the API endpoints or directly through MongoDB.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas or production MongoDB instance
3. Set strong `JWT_SECRET`
4. Configure proper CORS origins
5. Use process manager (PM2, forever)
6. Set up reverse proxy (Nginx)
7. Enable SSL/TLS
