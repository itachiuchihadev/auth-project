# 🔐 AuthVault — Multi-Auth Full-Stack Project

A production-ready reference implementation of **5 authentication mechanisms** using:
- **Backend**: ASP.NET Core 8 Web API
- **Frontend**: React 18 + Vite

---

## 🏗 Project Structure

```
auth-project/
├── backend/AuthApi/
│   ├── Controllers/
│   │   ├── AuthController.cs        # All auth endpoints
│   │   └── ResourcesController.cs   # Protected resource demo
│   ├── Services/
│   │   └── AuthService.cs           # Core auth logic
│   ├── Models/
│   │   └── User.cs                  # User + DTOs
│   ├── Data/
│   │   └── AppDbContext.cs          # EF Core InMemory DB
│   ├── Middleware/
│   │   └── ApiKeyMiddleware.cs      # X-Api-Key header support
│   ├── Program.cs                   # App setup + DI + seed data
│   ├── appsettings.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Multi-tab login UI
│   │   │   ├── RegisterPage.jsx     # Registration with password strength
│   │   │   └── DashboardPage.jsx    # Profile + API key management
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   └── main.jsx
│   ├── Dockerfile
│   └── nginx.conf
│
└── docker-compose.yml
```

---

## 🔑 Authentication Mechanisms

### 1. JWT (JSON Web Token)
- **Endpoint**: `POST /api/auth/login/jwt`
- **Flow**: Client sends `{ username, password }` → Server validates → Returns signed HS256 JWT
- **Client usage**: `Authorization: Bearer <token>`
- **Token lifetime**: 8 hours

### 2. HTTP Basic Auth
- **Endpoint**: `POST /api/auth/login/basic`
- **Flow**: Client sends `Authorization: Basic base64(username:password)` → Server decodes & validates → Returns JWT
- **Use case**: Simple integrations, CLI tools

### 3. API Key
- **Endpoint**: `POST /api/auth/login/apikey` (exchange for JWT)
- **Direct usage**: Any protected route with `X-Api-Key: <key>` header
- **Middleware**: `ApiKeyMiddleware` intercepts and builds `ClaimsPrincipal` so `[Authorize]` works natively
- **Use case**: Machine-to-machine, webhooks, CI/CD

### 4. OAuth 2.0
- **Endpoint**: `POST /api/auth/login/oauth/{provider}`
- **Providers**: `google`, `facebook`, `microsoft`, `github`
- **Flow**: Client obtains provider token → Sends to backend → Backend validates → Issues JWT
- **Auto-register**: New OAuth users are created automatically

### 5. Register (implicit JWT)
- **Endpoint**: `POST /api/auth/register`
- Hashes password with BCrypt, auto-generates API key, returns JWT immediately

---

## 🚀 Running Locally

### Option A — Direct (recommended for development)

**Backend:**
```bash
cd backend/AuthApi
dotnet run
# API:     http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Option B — Docker Compose
```bash
docker-compose up --build
# App:    http://localhost:5173
# API:    http://localhost:5000
# Swagger http://localhost:5000/swagger
```

---

## 👤 Demo Credentials (pre-seeded)

| Username | Password   | Role  | API Key                  |
|----------|-----------|-------|--------------------------|
| `admin`  | `Admin@123` | Admin | `ak_DEMO_ADMIN_KEY_1234` |
| `john`   | `John@123`  | User  | `ak_DEMO_USER_KEY_5678`  |

---

## 📡 API Reference

| Method | Endpoint                          | Auth Required | Description                      |
|--------|-----------------------------------|---------------|----------------------------------|
| POST   | `/api/auth/register`              | No            | Register new user                |
| POST   | `/api/auth/login/jwt`             | No            | JWT login                        |
| POST   | `/api/auth/login/basic`           | No (header)   | Basic Auth login                 |
| POST   | `/api/auth/login/apikey`          | No            | API Key → JWT exchange           |
| POST   | `/api/auth/login/oauth/{provider}`| No            | OAuth login                      |
| GET    | `/api/auth/me`                    | ✅            | Get current user profile         |
| POST   | `/api/auth/apikey/generate`       | ✅            | Regenerate API key               |
| GET    | `/api/auth/admin`                 | ✅ Admin      | Admin-only endpoint              |
| GET    | `/api/auth/health`                | No            | Health check                     |
| GET    | `/api/resources/items`            | ✅            | List items (any auth method)     |
| POST   | `/api/resources/items`            | ✅            | Create item                      |
| DELETE | `/api/resources/items/{id}`       | ✅ Admin      | Delete item                      |
| GET    | `/api/resources/admin/users-summary`| ✅ Admin    | Admin summary                    |

---

## 🔧 Configuration

Edit `appsettings.json` (or use environment variables):

```json
{
  "Jwt": {
    "Key": "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET",
    "Issuer": "AuthApi",
    "Audience": "AuthApiUsers"
  }
}
```

For **real OAuth** (production), set your provider credentials:
```json
{
  "OAuth": {
    "Google": { "ClientId": "xxx", "ClientSecret": "yyy" }
  }
}
```
Then add `.AddGoogle(...)` in `Program.cs` using `Microsoft.AspNetCore.Authentication.Google`.

---

## 🔒 Security Notes

1. **Change the JWT secret** before deploying — use a 32+ character random string
2. **Use HTTPS** in production — Basic Auth sends credentials in base64, not encrypted
3. **Rotate API keys** periodically using the `/apikey/generate` endpoint
4. **Swap InMemory DB** for a real database (SQL Server, PostgreSQL) in production
5. **Add rate limiting** to auth endpoints to prevent brute-force attacks
