# NICU Admin Backend

Secure backend service for managing admin users in the NICU monitoring system.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication with 7-day expiration
- 🔒 **Password Hashing** - bcrypt with 10 rounds for secure password storage
- 👥 **User Management** - Create, list, update, and delete admin users
- 🔗 **Setup Tokens** - One-time use password setup links with 24-hour expiration
- 📁 **File-based Storage** - JSON file storage for admin data (easy to backup)
- 🛡️ **Protected Routes** - JWT verification middleware for all admin endpoints
- ⚠️ **Safety Features** - Prevents self-deletion and last admin deletion

## Installation

```bash
cd incubator_monitoring_with_thingsboard_integration/admin_backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and update the values:

```env
PORT=8891
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
SETUP_TOKEN_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3001
```

**⚠️ Important:** Change `JWT_SECRET` in production!

## Running the Server

### Development

```bash
npm run dev  # Uses nodemon for auto-reload
```

### Production

```bash
npm start
```

The server will start on port **8891** and create a default admin account:

- **Email:** admin@demo.com
- **Password:** admin123

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login

Login with email and password.

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "jwt-token-here",
  "admin": {
    "id": "admin_1234567890_abc",
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "admin",
    "status": "active"
  }
}
```

#### POST /api/auth/verify-setup-token

Verify a password setup token.

**Request:**

```json
{
  "token": "setup-token",
  "email": "newadmin@example.com"
}
```

#### POST /api/auth/setup-password

Complete account setup by setting password.

**Request:**

```json
{
  "token": "setup-token",
  "email": "newadmin@example.com",
  "password": "newpassword123"
}
```

#### GET /api/auth/verify

Verify current JWT token (requires Authorization header).

**Headers:**

```
Authorization: Bearer your-jwt-token
```

### Admin Management Endpoints

**⚠️ All admin endpoints require JWT authentication**

#### POST /api/admin/create

Create a new admin user.

**Headers:**

```
Authorization: Bearer your-jwt-token
```

**Request:**

```json
{
  "email": "newadmin@example.com",
  "name": "New Admin"
}
```

**Response:**

```json
{
  "success": true,
  "admin": {
    "id": "admin_1234567890_xyz",
    "email": "newadmin@example.com",
    "name": "New Admin",
    "role": "admin",
    "status": "pending"
  },
  "setupToken": "uuid-token",
  "setupLink": "http://localhost:3001/setup-password?token=uuid-token&email=..."
}
```

#### GET /api/admin/list

List all admin users.

**Response:**

```json
{
  "success": true,
  "admins": [...],
  "count": 3
}
```

#### GET /api/admin/:id

Get admin details by ID.

#### PUT /api/admin/:id

Update admin name or status.

**Request:**

```json
{
  "name": "Updated Name",
  "status": "inactive"
}
```

#### DELETE /api/admin/:id

Delete an admin user.

**⚠️ Note:** Cannot delete yourself or the last admin.

#### GET /api/admin/me

Get current admin info.

## Data Storage

Admin data is stored in JSON files:

- `data/admins.json` - Admin user accounts
- `data/setup_tokens.json` - Password setup tokens

**Backup:** Simply copy the `data/` folder to backup all admin data.

## Security Features

### Password Security

- bcrypt hashing with 10 rounds
- Minimum 8 character password requirement
- Passwords never stored in plain text
- Passwords never returned in API responses

### Token Security

- JWT tokens with 7-day expiration
- Setup tokens expire after 24 hours
- Setup tokens are one-time use only
- Automatic cleanup of expired tokens

### Account Protection

- Cannot delete your own account
- Cannot delete the last admin account
- Cannot deactivate your own account
- Only active accounts can login

### CORS Protection

- Configurable allowed origins
- Prevents unauthorized cross-origin requests

## Frontend Integration

The frontend service is available at:

```
react_dashboard/src/services/admin-backend.service.js
```

**Example usage:**

```javascript
import adminBackendService from "./services/admin-backend.service";

// Login
const { token, admin } = await adminBackendService.login(email, password);

// Create user
const { setupLink } = await adminBackendService.createAdmin(email, name);

// List users
const { admins } = await adminBackendService.listAdmins();

// Delete user
await adminBackendService.deleteAdmin(userId);
```

## Development

### Project Structure

```
admin_backend/
├── server.js              # Express server entry point
├── routes/
│   ├── auth.js           # Authentication routes
│   └── admin.js          # Admin management routes
├── utils/
│   ├── db.js             # File-based database operations
│   └── auth.js           # JWT verification middleware
├── data/                 # JSON data files (created on first run)
│   ├── admins.json
│   └── setup_tokens.json
├── .env                  # Environment configuration
├── .env.example          # Environment template
├── package.json
└── README.md
```

### Adding New Features

1. **Add new route:** Create route in `routes/` folder
2. **Add middleware:** Update `utils/auth.js` if needed
3. **Update database:** Add functions to `utils/db.js`
4. **Mount route:** Import and mount in `server.js`
5. **Update frontend:** Add API calls to `admin-backend.service.js`

## Troubleshooting

### Port already in use

If port 8891 is already in use, change `PORT` in `.env`

### Default admin not created

Delete `data/admins.json` and restart the server

### JWT verification fails

- Check that `JWT_SECRET` matches between server and client
- Ensure token hasn't expired
- Check Authorization header format: `Bearer <token>`

### CORS errors

- Verify `CORS_ORIGIN` in `.env` matches your frontend URL
- Check that credentials are included in requests

## Production Deployment

### Before deploying:

1. ✅ Change `JWT_SECRET` to a strong random value
2. ✅ Use environment variables instead of `.env` file
3. ✅ Enable HTTPS
4. ✅ Set up proper logging
5. ✅ Configure reverse proxy (nginx/Apache)
6. ✅ Set up automatic backups of `data/` folder
7. ✅ Use process manager (PM2/systemd)
8. ✅ Set `NODE_ENV=production`

### Example PM2 setup:

```bash
pm2 start server.js --name nicu-admin-backend
pm2 save
pm2 startup
```

## License

Part of the NICU Monitoring System project.
