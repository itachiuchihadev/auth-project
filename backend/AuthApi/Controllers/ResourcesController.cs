using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AuthApi.Controllers;

/// <summary>
/// Demo of role-based & claim-based access control across all auth methods.
/// All endpoints are protected — any valid auth mechanism works.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourcesController : ControllerBase
{
    // ── PUBLIC (authenticated) ────────────────────────────────────────────────
    [HttpGet("items")]
    public IActionResult GetItems()
    {
        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";
        return Ok(new
        {
            items = new[]
            {
                new { id = 1, name = "Project Alpha", status = "Active",   owner = username },
                new { id = 2, name = "Project Beta",  status = "Pending",  owner = username },
                new { id = 3, name = "Project Gamma", status = "Complete", owner = username },
            },
            authenticatedAs = username,
            authMethod = User.Identity?.AuthenticationType
        });
    }

    [HttpGet("items/{id:int}")]
    public IActionResult GetItem(int id)
    {
        if (id < 1 || id > 3) return NotFound(new { message = $"Item {id} not found." });

        return Ok(new
        {
            id,
            name = $"Project {new[] { "Alpha", "Beta", "Gamma" }[id - 1]}",
            details = "Lorem ipsum project details…",
            tags = new[] { "dotnet", "react", "auth" }
        });
    }

    [HttpPost("items")]
    public IActionResult CreateItem([FromBody] CreateItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required." });

        return CreatedAtAction(nameof(GetItem), new { id = 42 }, new
        {
            id = 42,
            name = dto.Name,
            status = "Active",
            createdBy = User.FindFirst(ClaimTypes.Name)?.Value,
            createdAt = DateTime.UtcNow
        });
    }

    // ── ADMIN ONLY ────────────────────────────────────────────────────────────
    [HttpGet("admin/users-summary")]
    [Authorize(Roles = "Admin")]
    public IActionResult GetUsersSummary()
    {
        return Ok(new
        {
            totalUsers = 2,
            activeUsers = 2,
            roles = new[] { "Admin", "User" },
            lastActivity = DateTime.UtcNow
        });
    }

    [HttpDelete("items/{id:int}")]
    [Authorize(Roles = "Admin")]
    public IActionResult DeleteItem(int id)
    {
        return Ok(new { message = $"Item {id} deleted by {User.FindFirst(ClaimTypes.Name)?.Value}." });
    }
}

public class CreateItemDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
