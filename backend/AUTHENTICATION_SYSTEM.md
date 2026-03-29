# 🔐 AquaScope Authentication System Documentation

## 📋 Overview
Complete JWT-based authentication and role-based access control (RBAC) system for the AquaScope naval monitoring system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd BACKEND
npm install
```

### 2. Environment Variables
Make sure your `.env` file contains:
```
PORT=5003
NODE_ENV=development
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=aquascope_super_secret_jwt_key_for_naval_monitoring_system_2024
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Seed Default Users
```bash
npm run seed
```

### 4. Start Server
```bash
npm start
# or for development
npm run dev
```

## 👥 Default Users

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Captain | captain@aquascope.com | Captain@123 | Full access |
| Vice Captain | vice@aquascope.com | Vice@123 | Operational control |
| Surveillance Head | surveillance@aquascope.com | Surv@123 | Monitoring + reports |
| Engineer | engineer@aquascope.com | Eng@123 | System maintenance |
| Analyst | analyst@aquascope.com | Analyst@123 | Read-only |

## 🔗 API Endpoints

### Authentication Routes (`/api/v1/auth`)

#### Public Routes
- `POST /login` - User login
- `POST /request-access` - Request new access
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token

#### Protected Routes
- `GET /me` - Get current user profile
- `GET /access-requests` - Get all access requests (Captain/Vice Captain only)
- `POST /approve-request/:id` - Approve access request (Captain/Vice Captain only)
- `POST /reject-request/:id` - Reject access request (Captain/Vice Captain only)

### User Routes (`/api/v1/users`)

#### Protected Routes
- `GET /` - Get all users (Captain only)
- `GET /me` - Get current user profile

## 📝 Request/Response Examples

### 1. Login
```json
POST /api/v1/auth/login
{
  "email": "captain@aquascope.com",
  "password": "Captain@123",
  "rememberMe": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "69c76c61d5905bea76f3b273",
      "name": "Captain Atha",
      "email": "captain@aquascope.com",
      "role": "captain"
    }
  }
}
```

### 2. Request Access
```json
POST /api/v1/auth/request-access
{
  "name": "John Doe",
  "email": "john@example.com",
  "requestedRole": "analyst",
  "reason": "New team member"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Access request submitted successfully. Please wait for approval.",
  "data": {
    "requestId": "69c76c8f6ac2784d80e7ce04",
    "name": "John Doe",
    "email": "john@example.com",
    "requestedRole": "analyst",
    "status": "pending"
  }
}
```

### 3. Approve Request (Captain/Vice Captain)
```json
POST /api/v1/auth/approve-request/69c76c8f6ac2784d80e7ce04
Headers: Authorization: Bearer <token>
{
  "temporaryPassword": "Welcome123",
  "reviewNotes": "Approved for new project"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Access request approved and user account created",
  "data": {
    "requestId": "69c76c8f6ac2784d80e7ce04",
    "userId": "69c76c996ac2784d80e7ce0b",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "analyst",
    "temporaryPassword": "Welcome123"
  }
}
```

## 🛡️ Security Features

### JWT Authentication
- Token-based authentication
- Configurable expiry (1 day default, 7 days with "remember me")
- Secure token generation and verification

### Role-Based Access Control (RBAC)
- **Captain**: Full access to all resources
- **Vice Captain**: Operational control, can approve/reject requests
- **Surveillance Head**: Monitoring and analytics access
- **Engineer**: System maintenance access
- **Analyst**: Read-only access

### Password Security
- Bcrypt hashing with salt rounds (12)
- Minimum password length: 6 characters
- Password reset tokens with expiry (10 minutes)

### Rate Limiting
- 5 requests per 15 minutes for auth routes
- Protection against brute force attacks

### Input Validation
- Email format validation
- Role enum validation
- Required field validation

## 📁 File Structure

```
BACKEND/
├── server/
│   ├── controllers/
│   │   └── authController.js     # Auth logic
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT & RBAC middleware
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── AccessRequest.js     # Access request schema
│   ├── routes/
│   │   ├── authRoutes.js        # Auth endpoints
│   │   └── userRoutes.js        # User endpoints
│   ├── seed/
│   │   └── defaultUsers.js      # Seed script
│   └── server.js                # Main server file
├── .env                         # Environment variables
├── package.json
└── README.md
```

## 🔧 Usage with Frontend

### 1. Login Integration
```javascript
// Frontend login call
const login = async (email, password, rememberMe = false) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe })
  });
  
  const data = await response.json();
  
  if (data.status === 'success') {
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data.user;
  }
  
  throw new Error(data.message);
};
```

### 2. Protected API Calls
```javascript
// Making authenticated requests
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  return response.json();
};
```

### 3. Role-Based UI Rendering
```javascript
// Show/hide UI based on user role
const canAccessResource = (userRole, requiredRole) => {
  const roleHierarchy = {
    'captain': 5,
    'vice_captain': 4,
    'surveillance_head': 3,
    'engineer': 2,
    'analyst': 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Example usage
const user = JSON.parse(localStorage.getItem('user'));
if (canAccessResource(user.role, 'captain')) {
  // Show captain-only features
}
```

## 🧪 Testing

The system has been tested with:
- ✅ User login with JWT tokens
- ✅ Remember me functionality (7-day expiry)
- ✅ Access request workflow
- ✅ Role-based permissions
- ✅ Password reset flow
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling

## 🚨 Important Notes

1. **JWT Secret**: Change the `JWT_SECRET` in production
2. **MongoDB**: Ensure your MongoDB connection string is secure
3. **Rate Limiting**: Adjust limits based on your needs
4. **Password Reset**: In production, implement actual email sending
5. **CORS**: Update CORS origins for your frontend domain

## 🔄 Integration with Existing System

The authentication system is already integrated with:
- ✅ Express server on port 5003
- ✅ MongoDB database
- ✅ Existing API routes
- ✅ Frontend CORS configuration
- ✅ Error handling middleware

## 📞 Support

For any issues or questions:
1. Check the server logs for detailed error messages
2. Verify MongoDB connection
3. Ensure all environment variables are set
4. Check token expiry for authentication issues
