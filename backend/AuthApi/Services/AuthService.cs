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
    Task<AuthResponse> LoginWithJwtAsync(LoginRequest request);
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginWithApiKeyAsync(string apiKey);
    Task<AuthResponse> LoginWithBasicAuthAsync(string credentials);
    Task<AuthResponse> LoginWithOAuthAsync(string provider, string token);
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
    public async Task<AuthResponse> LoginWithJwtAsync(LoginRequest request)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user == null || user.PasswordHash == null ||
            !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return new AuthResponse { Success = false, Message = "Invalid credentials." };
        }

        var token = GenerateJwtToken(user);
        return new AuthResponse
        {
            Success = true,
            Token = token,
            AuthMethod = "JWT",
            Message = "Logged in via JWT.",
            User = MapToDto(user)
        };
    }

    // ── 2. REGISTER ───────────────────────────────────────────────────────────
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
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

        var token = GenerateJwtToken(user);
        return new AuthResponse
        {
            Success = true,
            Token = token,
            AuthMethod = "JWT",
            Message = "Registration successful.",
            User = MapToDto(user)
        };
    }

    // ── 3. API KEY LOGIN ──────────────────────────────────────────────────────
    public async Task<AuthResponse> LoginWithApiKeyAsync(string apiKey)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.ApiKey == apiKey && u.IsActive);

        if (user == null)
            return new AuthResponse { Success = false, Message = "Invalid API key." };

        var token = GenerateJwtToken(user);
        return new AuthResponse
        {
            Success = true,
            Token = token,
            AuthMethod = "API Key",
            Message = "Logged in via API Key.",
            User = MapToDto(user)
        };
    }

    // ── 4. BASIC AUTH LOGIN ───────────────────────────────────────────────────
    public async Task<AuthResponse> LoginWithBasicAuthAsync(string credentials)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(credentials));
            var parts = decoded.Split(':', 2);
            if (parts.Length != 2)
                return new AuthResponse { Success = false, Message = "Invalid Basic Auth format." };

            var req = new LoginRequest { Username = parts[0], Password = parts[1] };
            var result = await LoginWithJwtAsync(req);
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
    public async Task<AuthResponse> LoginWithOAuthAsync(string provider, string token)
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

        var jwtToken = GenerateJwtToken(user);
        return new AuthResponse
        {
            Success = true,
            Token = jwtToken,
            AuthMethod = $"OAuth ({provider})",
            Message = $"Logged in via {provider} OAuth.",
            User = MapToDto(user)
        };
    }

    // ── 6. GENERATE NEW API KEY ───────────────────────────────────────────────
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
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "AuthApi",
            audience: _config["Jwt:Audience"] ?? "AuthApiUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
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
