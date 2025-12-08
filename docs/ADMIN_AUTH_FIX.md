# Admin Authentication & Notification Fix

## Problem

Admin creation and notifications were failing with **401 Unauthorized** errors:

```
Failed to persist admin notification: Error: Admin
POST https://incubator-dashboard-571778410429.us-central1.run.app/api/admin/notifications 401 (Unauthorized)
```

## Root Causes Identified

### 1. **Critical: Async/Await Missing in Auth Middleware**

**File:** `admin_backend/utils/auth.js`

**Problem:**

- The `verifyToken` middleware was calling `findAdminById()` without `await`
- `findAdminById()` is an async function in `db-postgres.js`
- This caused `req.admin` to be set to a Promise object instead of the actual admin data
- When checking `req.admin.status`, it checked a Promise's undefined status property
- This made all authenticated requests fail with 401

**Fix:**

```javascript
// BEFORE (wrong)
function verifyToken(req, res, next) {
  // ...
  req.admin = findAdminById(decoded.id); // Missing await!
  // ...
}

// AFTER (correct)
async function verifyToken(req, res, next) {
  // ...
  req.admin = await findAdminById(decoded.id); // Now properly awaited
  // ...
}
```

Also changed import from `db.js` to `db-postgres.js` to use the PostgreSQL database.

### 2. **Route Ordering Issue**

**File:** `admin_backend/routes/admin.js`

**Problem:**

- The `/me` endpoint was defined AFTER `/:id` endpoint
- Express was treating "me" as an ID parameter
- Requests to `/api/admin/me` were being caught by the `/:id` route handler

**Fix:**

- Moved `/me` route to line 100 (before `/:id` route at line 122)
- Removed duplicate `/me` route that was at line 200

### 3. **Missing Await Keywords in Auth Routes**

**File:** `admin_backend/routes/auth.js`

**Problem:**

- Multiple async database functions were called without `await`:
  - Line 97: `findAdminByEmail()` in verify-setup-token
  - Line 135: `findSetupToken()` in setup-password
  - Line 151: `findAdminByEmail()` in setup-password
  - Line 165: `updateAdmin()` in setup-password
  - Line 196: `findAdminByEmail()` in verify endpoint

**Fix:**

- Added `await` keyword to all async database calls
- Ensured proper error handling for async operations

## Files Modified

1. **admin_backend/utils/auth.js**

   - Made `verifyToken` async
   - Added `await` to `findAdminById()` call
   - Changed import from `db.js` to `db-postgres.js`

2. **admin_backend/routes/admin.js**

   - Moved `/me` route before `/:id` route
   - Removed duplicate `/me` route

3. **admin_backend/routes/auth.js**
   - Added `await` to all async database calls in:
     - `/verify-setup-token` endpoint
     - `/setup-password` endpoint
     - `/verify` endpoint

## Deployment

### Option 1: Deploy to Cloud Run (Production)

```powershell
# From incubator_monitoring_with_thingsboard_integration directory
.\deploy-admin-backend-fix.ps1
```

### Option 2: Local Testing

```bash
cd admin_backend
npm install
node server.js
```

## Testing the Fix

1. **Clear Browser Data:**

   - Clear localStorage (or open incognito/private window)
   - This ensures old tokens are not cached

2. **Login:**

   - Navigate to the dashboard
   - Login with: `admin@demo.com` / `admin123`

3. **Test Admin Creation:**

   - Go to Admin Management
   - Create a new admin user
   - Should succeed without 401 errors

4. **Test Notifications:**
   - Trigger any system event that creates notifications
   - Check that notifications appear without errors
   - Verify notification persistence

## Expected Behavior After Fix

✅ Admin login works properly  
✅ Admin token is correctly verified  
✅ Admin creation succeeds  
✅ Notifications are created and persisted  
✅ `/api/admin/me` endpoint returns current admin info  
✅ `/api/admin/notifications` endpoint works  
✅ All authenticated admin endpoints function correctly

## Technical Details

The authentication flow now properly:

1. Extracts JWT token from Authorization header
2. Verifies token signature and expiration
3. **Awaits** the database lookup for admin user
4. Checks admin status is 'active'
5. Attaches complete admin object to `req.admin`
6. Proceeds to route handler with authenticated context

All admin routes after the `verifyToken` middleware can now safely access `req.admin` with the complete admin object, not a Promise.
