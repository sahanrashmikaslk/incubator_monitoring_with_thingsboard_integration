# Quick Start Script for Local Development
# PowerShell script for Windows

Write-Host "🚀 Incubator Monitoring System - Quick Start" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host ""
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Please edit .env file with your configuration before continuing" -ForegroundColor Yellow
    Write-Host "   Required values:" -ForegroundColor Yellow
    Write-Host "   - THINGSBOARD_HOST" -ForegroundColor White
    Write-Host "   - PI_HOST" -ForegroundColor White
    Write-Host "   - JWT_SECRET" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Have you updated .env? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Exiting. Please update .env and run this script again." -ForegroundColor Red
        exit 0
    }
}

# Check if Docker is running
Write-Host ""
Write-Host "🔍 Checking Docker..." -ForegroundColor Yellow
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Build images
Write-Host ""
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
.\scripts\build.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Start services
Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host ""
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

$services = @(
    @{Name = "Dashboard"; Url = "http://localhost:3001/health" },
    @{Name = "Admin Backend"; Url = "http://localhost:5056/api/auth/health" },
    @{Name = "Parent Backend"; Url = "http://localhost:5000/api/health" }
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -UseBasicParsing -TimeoutSec 5 2>$null
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $($service.Name) is healthy" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  ⚠️  $($service.Name) not responding yet" -ForegroundColor Yellow
    }
}

# Show running containers
Write-Host ""
Write-Host "📦 Running containers:" -ForegroundColor Cyan
docker-compose ps

# Show service URLs
Write-Host ""
Write-Host "🌐 Access your services:" -ForegroundColor Cyan
Write-Host "  Dashboard:      http://localhost:3001" -ForegroundColor White
Write-Host "  Admin Backend:  http://localhost:5056" -ForegroundColor White
Write-Host "  Parent Backend: http://localhost:5000" -ForegroundColor White

Write-Host ""
Write-Host "📝 Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:      docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop services:  docker-compose down" -ForegroundColor White
Write-Host "  Restart:        docker-compose restart" -ForegroundColor White

Write-Host ""
Write-Host "✅ System started successfully!" -ForegroundColor Green
