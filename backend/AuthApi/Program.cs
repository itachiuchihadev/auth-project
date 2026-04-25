using System.Text;
using AuthApi.Data;
using AuthApi.Middleware;
using AuthApi.Models;
using AuthApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── SERVICES ──────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ── DATABASE CONFIGURATION ────────────────────────────────────────────────────
var dbProvider = builder.Configuration["Database:Provider"] ?? "SQLite";
var connectionString = dbProvider.ToUpper() == "POSTGRESQL" 
    ? builder.Configuration["Database:PostgresConnectionString"]
    : builder.Configuration["Database:ConnectionString"];

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (dbProvider.ToUpper() == "POSTGRESQL")
    {
        opt.UseNpgsql(connectionString);
    }
    else
    {
        opt.UseSqlite(connectionString);
    }
});

builder.Services.AddScoped<IAuthService, AuthService>();

// ── CORS (allows the React dev server) ───────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()));

// ── JWT AUTHENTICATION ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SuperSecretKey_CHANGE_IN_PRODUCTION_1234567890!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── SWAGGER with JWT + API Key support ────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Auth API",
        Version = "v1",
        Description = "Multi-mechanism authentication: JWT · Basic Auth · API Key · OAuth · Refresh Tokens"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT access token"
    });

    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Name = "X-Api-Key",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Enter your API key"
    });

    c.AddSecurityDefinition("BasicAuth", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "basic",
        In = ParameterLocation.Header,
        Description = "Enter base64(username:password)"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ── DATABASE MIGRATION ────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}


// ── SEED DEMO DATA ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!db.Users.Any())
    {
        db.Users.AddRange(
            new User
            {
                Id = 1,
                Username = "admin",
                Email = "admin@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = "Admin",
                ApiKey = "ak_DEMO_ADMIN_KEY_1234"
            },
            new User
            {
                Id = 2,
                Username = "john",
                Email = "john@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("John@123"),
                Role = "User",
                ApiKey = "ak_DEMO_USER_KEY_5678"
            }
        );
        db.SaveChanges();
    }
}

// ── PIPELINE ──────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors();
app.UseMiddleware<ApiKeyMiddleware>();    // must come before UseAuthentication
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
