using System.Security.Claims;
using AuthApi.Models;
using AuthApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    // ── 1. REGISTER ───────────────────────────────────────────────────────────
    /// <summary>Register a new user with username/email/password.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new AuthResponse { Success = false, Message = "All fields are required." });

        var result = await _auth.RegisterAsync(request, HttpContext);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ── 2. JWT LOGIN ──────────────────────────────────────────────────────────
    /// <summary>Login with username and password; returns JWT access & refresh tokens.</summary>
    [HttpPost("login/jwt")]
    public async Task<IActionResult> LoginJwt([FromBody] LoginRequest request)
    {
        var result = await _auth.LoginWithJwtAsync(request, HttpContext);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    // ── 3. BASIC AUTH LOGIN ───────────────────────────────────────────────────
    /// <summary>Login via HTTP Basic Auth header (Authorization: Basic base64(user:pass)).</summary>
    [HttpPost("login/basic")]
    public async Task<IActionResult> LoginBasic()
    {
        var authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (authHeader == null || !authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new AuthResponse { Success = false, Message = "Missing or invalid Authorization header." });

        var credentials = authHeader["Basic ".Length..].Trim();
        var result = await _auth.LoginWithBasicAuthAsync(credentials, HttpContext);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    // ── 4. API KEY LOGIN ──────────────────────────────────────────────────────
    /// <summary>Exchange an API key for JWT tokens.</summary>
    [HttpPost("login/apikey")]
    public async Task<IActionResult> LoginApiKey([FromBody] ApiKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey))
            return BadRequest(new AuthResponse { Success = false, Message = "API key is required." });

        var result = await _auth.LoginWithApiKeyAsync(request.ApiKey, HttpContext);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    // ── 5. OAUTH LOGIN ────────────────────────────────────────────────────────
    /// <summary>
    /// Login via OAuth provider token.
    /// Accepted providers: google, facebook, microsoft, github.
    /// For testing, pass token as "provider|userId|email".
    /// </summary>
    [HttpPost("login/oauth/{provider}")]
    public async Task<IActionResult> LoginOAuth(string provider, [FromBody] string token)
    {
        var validProviders = new[] { "google", "facebook", "microsoft", "github" };
        if (!validProviders.Contains(provider.ToLower()))
            return BadRequest(new AuthResponse { Success = false, Message = $"Unknown provider '{provider}'." });

        var result = await _auth.LoginWithOAuthAsync(provider.ToLower(), token, HttpContext);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    // ── 6. REFRESH ACCESS TOKEN ───────────────────────────────────────────────
    /// <summary>Refresh the access token using a valid refresh token.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { message = "Refresh token is required." });

        var result = await _auth.RefreshAccessTokenAsync(request.RefreshToken);
        return result != null ? Ok(result) : Unauthorized(new { message = "Invalid or expired refresh token." });
    }

    // ── 7. LOGOUT ─────────────────────────────────────────────────────────────
    /// <summary>Logout: revoke the refresh token to prevent future token refreshes.</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request = null)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized();

        var success = await _auth.LogoutAsync(userId, request?.RefreshToken);
        return success ? Ok(new { message = "Logged out successfully." }) : StatusCode(500, new { message = "Logout failed." });
    }

    // ── PROTECTED ENDPOINTS ───────────────────────────────────────────────────
    /// <summary>Returns the current authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized();

        var user = await _auth.GetUserByIdAsync(userId);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>Generates or regenerates an API key for the current user.</summary>
    [HttpPost("apikey/generate")]
    [Authorize]
    public async Task<IActionResult> GenerateApiKey()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized();

        var key = await _auth.GenerateApiKeyAsync(userId);
        return Ok(new { apiKey = key });
    }

    /// <summary>Admin-only test endpoint.</summary>
    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public IActionResult AdminOnly() =>
        Ok(new { message = "Welcome, Admin! 🔒" });

    /// <summary>Health check — no auth required.</summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health() =>
        Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
}
