# AquaScope Authentication System

## Overview
Complete authentication and role-based access control (RBAC) system for the AquaScope naval monitoring platform.

## Features

### 🔐 Authentication
- JWT-based authentication with configurable expiry
- Bcrypt password hashing
- Remember me functionality (1 day vs 7 days)
- Password reset via email
- Secure token generation and validation

### 👥 Role-Based Access Control (RBAC)
- **Captain**: Full system control
- **Vice Captain**: Operational control (except user creation)
- **Surveillance Head**: Monitoring + reports access
- **Engineer**: System maintenance routes only
- **Analyst**: Read-only data access

### 📋 Access Request System
- New users cannot self-register
- Must submit access requests
- Captain/Vice Captain approval workflow
- Automated user account creation on approval

## API Endpoints

### Authentication Routes (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|--------|-----------|---------|-------------|
| POST | `/login` | Public | User login with email/password |
| POST | `/request-access` | Public | Submit new access request |
| POST | `/approve-request/:id` | Captain/Vice Captain | Approve access request |
| POST | `/reject-request/:id` | Captain/Vice Captain | Reject access request |
| POST | `/forgot-password` | Public | Request password reset |
| POST | `/reset-password` | Public | Reset password with token |
| GET | `/me` | Private | Get current user profile |
| GET | `/access-requests` | Captain/Vice Captain | Get all access requests |

### User Routes (`/api/v1/users`)

| Method | Endpoint | Access | Description |
|--------|-----------|---------|-------------|
| GET | `/` | Captain only | Get all users with filtering |
| GET | `/me` | Private | Get current user profile |
| PUT | `/me` | Private | Update user profile |
| PUT | `/change-password` | Private | Change user password |
| PUT | `/:id/deactivate` | Captain/Vice Captain | Deactivate user |
| PUT | `/:id/activate` | Captain/Vice Captain | Activate user |
| DELETE | `/:id` | Captain only | Delete user |

## Middleware

### Authentication Middleware (`protect`)
- Validates JWT tokens
- Checks user existence and status
- Handles token expiry and invalid tokens

### Role Middleware (`allowRoles`)
- Restricts access based on user roles
- Supports multiple roles
- Returns proper error responses

### Role Hierarchy Middleware
- Checks role hierarchy for permissions
- Higher roles can access lower role permissions

## Database Models

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: Enum ['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst'],
  isActive: Boolean (default: true),
  isEmailVerified: Boolean (default: false),
  firstName: String,
  lastName: String,
  preferences: Object,
  lastLogin: Date,
  lastActivity: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### AccessRequest Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  requestedRole: Enum ['captain', 'vice_captain', 'surveillance_head', 'engineer', 'analyst'],
  status: Enum ['pending', 'approved', 'rejected'] (default: 'pending'),
  reason: String,
  reviewedBy: ObjectId (ref: 'User'),
  reviewedAt: Date,
  reviewNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Default Users

The system includes 5 default users for initial setup:

| Role | Email | Password |
|-------|--------|----------|
| Captain | captain@aquascope.com | Captain@123 |
| Vice Captain | vice@aquascope.com | Vice@123 |
| Surveillance Head | surveillance@aquascope.com | Surv@123 |
| Engineer | engineer@aquascope.com | Eng@123 |
| Analyst | analyst@aquascope.com | Analyst@123 |

## Setup Instructions

### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Default Users
```bash
npm run seed
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## Usage Examples

### Login
```javascript
POST /api/v1/auth/login
{
  "email": "captain@aquascope.com",
  "password": "Captain@123",
  "rememberMe": true
}
```

### Request Access
```javascript
POST /api/v1/auth/request-access
{
  "name": "John Doe",
  "email": "john@example.com",
  "requestedRole": "analyst",
  "reason": "Need access for data analysis"
}
```

### Protected Route Usage
```javascript
// Add Authorization header
Authorization: Bearer <jwt_token>

// Access role-protected endpoints
GET /api/v1/users  // Requires Captain role
```

## Security Features

### Password Security
- Bcrypt hashing with 12 salt rounds
- Minimum 6 character password length
- Password change functionality

### Token Security
- JWT with HS256 algorithm
- Configurable expiry (1 day / 7 days)
- Secure token generation

### Rate Limiting
- 5 requests per 15 minutes for auth endpoints
- Configurable rate limits

### Input Validation
- Email format validation
- Role enum validation
- Required field validation

## Error Codes

The API uses standardized error codes:

| Code | Description |
|-------|-------------|
| NO_TOKEN | No authentication token provided |
| INVALID_TOKEN | Invalid JWT token |
| TOKEN_EXPIRED | Token has expired |
| USER_NOT_FOUND | User does not exist |
| INVALID_CREDENTIALS | Incorrect email/password |
| INSUFFICIENT_PERMISSIONS | User lacks required role |
| ACCOUNT_INACTIVE | User account is deactivated |
| MISSING_FIELDS | Required fields not provided |

## Frontend Integration

### Authentication Flow
1. User submits login credentials
2. Server validates and returns JWT token
3. Store token in localStorage/httpOnly cookie
4. Include token in Authorization header for protected routes
5. Handle token expiry gracefully

### Role-Based UI
- Show/hide menu items based on user role
- Implement route guards in frontend router
- Display appropriate permissions in user interface

## Production Considerations

### Security
- Use strong JWT secret keys
- Enable HTTPS in production
- Implement proper email service for password resets
- Add request logging and monitoring

### Performance
- Implement proper database indexes
- Use connection pooling
- Add caching for frequently accessed data

### Scalability
- Consider microservices architecture
- Implement load balancing
- Add database replication

## Testing

### Unit Tests
```bash
npm test
```

### Manual Testing
1. Use Postman collection for API testing
2. Test all authentication flows
3. Verify role-based access controls
4. Test error scenarios

## Support

For issues and support:
1. Check server logs for detailed error information
2. Verify environment configuration
3. Ensure database connectivity
4. Review API documentation for proper usage
