using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AuthApi.Data;
using AuthApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace AuthApi.Services;

public interface IAuthService
{
    Task<AuthResponse> LoginWithJwtAsync(LoginRequest request, HttpContext? context = null);
    Task<AuthResponse> RegisterAsync(RegisterRequest request, HttpContext? context = null);
    Task<AuthResponse> LoginWithApiKeyAsync(string apiKey, HttpContext? context = null);
    Task<AuthResponse> LoginWithBasicAuthAsync(string credentials, HttpContext? context = null);
    Task<AuthResponse> LoginWithOAuthAsync(string provider, string token, HttpContext? context = null);
    Task<RefreshTokenResponse?> RefreshAccessTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(int userId, string? refreshToken = null);
    Task<string> GenerateApiKeyAsync(int userId);
    Task<UserDto?> GetUserByIdAsync(int userId);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ── 1. JWT LOGIN ──────────────────────────────────────────────────────────
    public async Task<AuthResponse> LoginWithJwtAsync(LoginRequest request, HttpContext? context = null)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user == null || user.PasswordHash == null ||
            !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return new AuthResponse { Success = false, Message = "Invalid credentials." };
        }

        var accessToken = GenerateJwtToken(user);
        var refreshToken = await GenerateAndStoreRefreshTokenAsync(user.Id, context);

        return new AuthResponse
        {
            Success = true,
            Token = accessToken,
            RefreshToken = refreshToken,
            AuthMethod = "JWT",
            Message = "Logged in via JWT.",
            User = MapToDto(user)
        };
    }

    // ── 2. REGISTER ───────────────────────────────────────────────────────────
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, HttpContext? context = null)
    {
        if (await _db.Users.AnyAsync(u => u.Username == request.Username))
            return new AuthResponse { Success = false, Message = "Username already taken." };

        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            return new AuthResponse { Success = false, Message = "Email already registered." };

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            ApiKey = GenerateRandomApiKey()
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var accessToken = GenerateJwtToken(user);
        var refreshToken = await GenerateAndStoreRefreshTokenAsync(user.Id, context);

        return new AuthResponse
        {
            Success = true,
            Token = accessToken,
            RefreshToken = refreshToken,
            AuthMethod = "JWT",
            Message = "Registration successful.",
            User = MapToDto(user)
        };
    }

    // ── 3. API KEY LOGIN ──────────────────────────────────────────────────────
    public async Task<AuthResponse> LoginWithApiKeyAsync(string apiKey, HttpContext? context = null)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.ApiKey == apiKey && u.IsActive);

        if (user == null)
            return new AuthResponse { Success = false, Message = "Invalid API key." };

        var accessToken = GenerateJwtToken(user);
        var refreshToken = await GenerateAndStoreRefreshTokenAsync(user.Id, context);

        return new AuthResponse
        {
            Success = true,
            Token = accessToken,
            RefreshToken = refreshToken,
            AuthMethod = "API Key",
            Message = "Logged in via API Key.",
            User = MapToDto(user)
        };
    }

    // ── 4. BASIC AUTH LOGIN ───────────────────────────────────────────────────
    public async Task<AuthResponse> LoginWithBasicAuthAsync(string credentials, HttpContext? context = null)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(credentials));
            var parts = decoded.Split(':', 2);
            if (parts.Length != 2)
                return new AuthResponse { Success = false, Message = "Invalid Basic Auth format." };

            var req = new LoginRequest { Username = parts[0], Password = parts[1] };
            var result = await LoginWithJwtAsync(req, context);
            if (result.Success)
                result.AuthMethod = "Basic Auth";
            return result;
        }
        catch
        {
            return new AuthResponse { Success = false, Message = "Invalid Base64 encoding." };
        }
    }

    // ── 5. OAUTH LOGIN (mock – real apps integrate Google/Facebook SDK) ───────
    public async Task<AuthResponse> LoginWithOAuthAsync(string provider, string token, HttpContext? context = null)
    {
        // In production: validate token with the provider's API.
        // Here we decode a mock token: "provider|userId|email"
        var parts = token.Split('|');
        if (parts.Length != 3)
            return new AuthResponse { Success = false, Message = "Invalid OAuth token format." };

        var oauthId = parts[1];
        var email = parts[2];

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.OAuthProvider == provider && u.OAuthProviderId == oauthId);

        if (user == null)
        {
            // Auto-register OAuth users
            var username = $"{provider}_{oauthId}";
            user = new User
            {
                Username = username,
                Email = email,
                OAuthProvider = provider,
                OAuthProviderId = oauthId,
                ApiKey = GenerateRandomApiKey()
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        var accessToken = GenerateJwtToken(user);
        var refreshToken = await GenerateAndStoreRefreshTokenAsync(user.Id, context);

        return new AuthResponse
        {
            Success = true,
            Token = accessToken,
            RefreshToken = refreshToken,
            AuthMethod = $"OAuth ({provider})",
            Message = $"Logged in via {provider} OAuth.",
            User = MapToDto(user)
        };
    }

    // ── 6. REFRESH ACCESS TOKEN ───────────────────────────────────────────────
    public async Task<RefreshTokenResponse?> RefreshAccessTokenAsync(string refreshToken)
    {
        var storedToken = await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);

        if (storedToken == null || storedToken.ExpiresAt < DateTime.UtcNow)
            return null;

        var user = storedToken.User;
        if (user == null || !user.IsActive)
            return null;

        // Generate new access token
        var newAccessToken = GenerateJwtToken(user);

        // Optionally: invalidate old refresh token and generate new one
        storedToken.IsRevoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = await GenerateAndStoreRefreshTokenAsync(user.Id, null);
        await _db.SaveChangesAsync();

        var expiresIn = int.Parse(_config["Jwt:AccessTokenExpireMinutes"] ?? "15") * 60;

        return new RefreshTokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresIn = expiresIn
        };
    }

    // ── 7. LOGOUT ─────────────────────────────────────────────────────────────
    public async Task<bool> LogoutAsync(int userId, string? refreshToken = null)
    {
        try
        {
            if (!string.IsNullOrEmpty(refreshToken))
            {
                // Revoke specific refresh token
                var token = await _db.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.Token == refreshToken && rt.UserId == userId);

                if (token != null)
                {
                    token.IsRevoked = true;
                    token.RevokedAt = DateTime.UtcNow;
                }
            }
            else
            {
                // Revoke all refresh tokens for user
                var tokens = await _db.RefreshTokens
                    .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                    .ToListAsync();

                foreach (var token in tokens)
                {
                    token.IsRevoked = true;
                    token.RevokedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    // ── 8. GENERATE NEW API KEY ───────────────────────────────────────────────
    public async Task<string> GenerateApiKeyAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) throw new Exception("User not found.");

        user.ApiKey = GenerateRandomApiKey();
        await _db.SaveChangesAsync();
        return user.ApiKey;
    }

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        return user == null ? null : MapToDto(user);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────
    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "SuperSecretKey1234567890!!CHANGE_ME"));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("auth_time", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
        };

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var accessTokenExpireMinutes = int.Parse(_config["Jwt:AccessTokenExpireMinutes"] ?? "15");

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "AuthApi",
            audience: _config["Jwt:Audience"] ?? "AuthApiUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(accessTokenExpireMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> GenerateAndStoreRefreshTokenAsync(int userId, HttpContext? context)
    {
        var refreshToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("=", "").Replace("+", "-").Replace("/", "_");

        var refreshTokenExpireDays = int.Parse(_config["Jwt:RefreshTokenExpireDays"] ?? "7");

        var refreshTokenEntity = new RefreshToken
        {
            UserId = userId,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpireDays),
            IpAddress = context?.Connection?.RemoteIpAddress?.ToString(),
            UserAgent = context?.Request?.Headers["User-Agent"].ToString()
        };

        _db.RefreshTokens.Add(refreshTokenEntity);
        await _db.SaveChangesAsync();

        return refreshToken;
    }

    private static string GenerateRandomApiKey() =>
        $"ak_{Convert.ToBase64String(Guid.NewGuid().ToByteArray()).Replace("=", "").Replace("+", "-").Replace("/", "_")}";

    private static UserDto MapToDto(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        Email = u.Email,
        Role = u.Role,
        ApiKey = u.ApiKey
    };
}
