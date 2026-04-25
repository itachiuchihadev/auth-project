# Refresh Token Implementation Guide

## Overview
This authentication system now uses **JWT with Refresh Tokens**, providing secure short-lived access tokens and long-lived refresh tokens stored in the database.

## Key Changes

### 1. Database Schema
- **RefreshTokens Table**: Stores refresh tokens with metadata
  - Token: The refresh token
  - UserId: Foreign key to Users
  - ExpiresAt: When the token expires
  - IsRevoked: Whether token has been revoked (logout)
  - IpAddress & UserAgent: For tracking session metadata
  - CreatedAt, RevokedAt: Timestamps

- **Users Table**: Enhanced with navigation properties for refresh tokens

### 2. Security Features
✅ **Access Tokens**: Short-lived (15 minutes by default)
✅ **Refresh Tokens**: Long-lived (7 days by default), stored server-side
✅ **Token Revocation**: Immediate logout by marking refresh token as revoked
✅ **Automatic Refresh**: Frontend automatically refreshes expired access tokens
✅ **Database Support**: SQLite for development, PostgreSQL for production

## Configuration

### appsettings.json
```json
{
  "Jwt": {
    "AccessTokenExpireMinutes": 15,
    "RefreshTokenExpireDays": 7
  },
  "Database": {
    "Provider": "SQLite",
    "ConnectionString": "Data Source=auth.db;",
    "PostgresConnectionString": "User ID=postgres;Password=postgres;Host=localhost;Port=5432;Database=authdb;"
  }
}
```

## API Endpoints

### Login (Returns both tokens)
```
POST /api/auth/login/jwt
{
  "username": "user",
  "password": "pass"
}

Response:
{
  "success": true,
  "token": "eyJhbGc...",           // Access token (15 min)
  "refreshToken": "hG3k2L9...",    // Refresh token (7 days)
  "user": { ... },
  "authMethod": "JWT"
}
```

### Refresh Access Token
```
POST /api/auth/refresh
{
  "refreshToken": "hG3k2L9..."
}

Response:
{
  "accessToken": "eyJhbGc...",     // New access token
  "refreshToken": "nE7pQ2x...",    // New refresh token
  "expiresIn": 900                 // 15 minutes in seconds
}
```

### Logout (Revokes refresh token)
```
POST /api/auth/logout
Authorization: Bearer <access_token>
{
  "refreshToken": "hG3k2L9..."     // Optional: revoke specific token
}                                  // Without body: revokes all user tokens

Response:
{
  "message": "Logged out successfully."
}
```

## Database Setup

### SQLite (Development)
1. Use default configuration
2. Database file created automatically at `auth.db`
3. No setup required

### PostgreSQL (Production)
1. Update `appsettings.json`:
```json
"Database": {
  "Provider": "PostgreSQL",
  "PostgresConnectionString": "User ID=postgres;Password=yourpass;Host=localhost;Port=5432;Database=authdb;"
}
```

2. Create database:
```sql
CREATE DATABASE authdb;
```

3. Run migrations automatically on startup (see Program.cs)

## Frontend Integration

### Token Storage
```javascript
// After login
localStorage.setItem('token', response.token);           // Access token
localStorage.setItem('refreshToken', response.refreshToken);
```

### Automatic Token Refresh
The API client (`api.js`) automatically:
1. Detects 401 responses (token expired)
2. Calls `/api/auth/refresh` with the refresh token
3. Updates both tokens in localStorage
4. Retries the original request
5. Redirects to login if refresh fails

### Logout
```javascript
const { logout } = useAuth();
// Revokes refresh token and clears localStorage
await logout();
```

## Request Flow

### Normal Request
```
Client → Authorization: Bearer <access_token> → Backend
Backend: Token valid? → Process request
```

### Expired Access Token
```
Client: 401 Unauthorized
Client → POST /refresh with refreshToken
Backend: Token valid? → Issue new tokens
Client: Retry request with new token → Backend: Process
```

### After Logout
```
Backend: Mark refresh token as revoked
Client: Remove tokens from localStorage
Next request: Will fail 401 → Redirect to login
```

## Token Expiration Configuration

Edit `appsettings.json`:
```json
"Jwt": {
  "Key": "your-secret-key",
  "AccessTokenExpireMinutes": 15,    // Short-lived access token
  "RefreshTokenExpireDays": 7        // Long-lived refresh token
}
```

### Recommendations
- **Development**: 15 min access, 7 days refresh
- **Production**: 5-15 min access, 7-30 days refresh
- **High Security**: 5 min access, 3 days refresh

## Environment-Specific Settings

### Development (appsettings.Development.json)
```json
{
  "Database": {
    "Provider": "SQLite",
    "ConnectionString": "Data Source=auth-dev.db;"
  }
}
```

### Production (appsettings.Production.json)
```json
{
  "Jwt": {
    "Key": "$(JWT_KEY)",  // Use environment variables
    "AccessTokenExpireMinutes": 10,
    "RefreshTokenExpireDays": 7
  },
  "Database": {
    "Provider": "PostgreSQL",
    "PostgresConnectionString": "$(DATABASE_URL)"
  }
}
```

## Migration Guide from Old System

If you had the old system without refresh tokens:

1. **Database**: Apply migration `InitialCreate`
   - Creates `RefreshTokens` table
   - Updates `Users` table relationships

2. **Backend**: No changes needed for existing login endpoints
   - They now also return `refreshToken`

3. **Frontend**: 
   - Update `AuthContext.jsx` to store/use refresh token
   - API client auto-handles token refresh

## Security Best Practices

✅ **Store tokens properly**
- Access token: Can be in memory or localStorage (frontend decides)
- Refresh token: Should be stored securely (httpOnly cookie preferred)

✅ **Short access token lifetime**
- Limits damage from token theft
- Automatic refresh is transparent to user

✅ **Revoke on logout**
- Prevents token reuse after logout
- Can revoke all tokens for password reset

✅ **Use HTTPS in production**
- Tokens transmitted over encrypted connections only

✅ **Rotate refresh tokens**
- Issue new refresh token on each refresh
- Old one becomes invalid

## Troubleshooting

### Token not refreshing
1. Check refresh token is stored in localStorage
2. Verify refresh token hasn't expired
3. Check backend logs for refresh endpoint errors

### Logged out but still have token
1. Frontend cache issue: Clear localStorage
2. Token might be valid but revoked in DB
3. Check `RefreshTokens.IsRevoked` flag

### Database connection issues
1. SQLite: Check file permissions on `auth.db`
2. PostgreSQL: Verify connection string and server is running

## Testing

### Test Refresh Token Flow
```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login/jwt \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"pass"}'

# Response: { "token": "...", "refreshToken": "..." }

# 2. Wait for token to expire (or manually check expiration)
# 3. Refresh
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'

# 4. Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <new-token>" \
  -H "Content-Type: application/json"
```

## Files Modified
- ✅ `appsettings.json` - Added token expiration and DB config
- ✅ `AuthApi.csproj` - Added SQLite and PostgreSQL packages
- ✅ `Models/User.cs` - Added RefreshTokens navigation property
- ✅ `Models/RefreshToken.cs` - New model for storing refresh tokens
- ✅ `Data/AppDbContext.cs` - Added RefreshTokens DbSet
- ✅ `Services/AuthService.cs` - Added refresh and logout methods
- ✅ `Controllers/AuthController.cs` - Added refresh and logout endpoints
- ✅ `Program.cs` - Added database provider selection and migration
- ✅ `frontend/src/services/api.js` - Added token refresh interceptor
- ✅ `frontend/src/context/AuthContext.jsx` - Updated to handle refresh tokens
- ✅ `Migrations/` - Database schema migrations
