using AuthApi.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthApi.Middleware;

/// <summary>
/// Middleware that also accepts requests carrying an X-Api-Key header
/// and injects a ClaimsPrincipal so downstream [Authorize] works.
/// </summary>
public class ApiKeyMiddleware
{
    private const string ApiKeyHeader = "X-Api-Key";
    private readonly RequestDelegate _next;

    public ApiKeyMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        // Only intercept if the header is present and the request is not already authenticated
        if (context.Request.Headers.TryGetValue(ApiKeyHeader, out var keyValue) &&
            !context.User.Identity?.IsAuthenticated == true)
        {
            var key = keyValue.ToString();
            var user = await db.Users.FirstOrDefaultAsync(u => u.ApiKey == key && u.IsActive);
            if (user == null)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new { message = "Invalid API key." });
                return;
            }
            // Build minimal identity so [Authorize] passes
            var claims = new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, user.Username),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, user.Role)
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "ApiKey");
            context.User = new System.Security.Claims.ClaimsPrincipal(identity);
        }

        await _next(context);
    }
}
