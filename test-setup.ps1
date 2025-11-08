# Test Script - Verify Docker Setup
# PowerShell script for Windows

Write-Host "🧪 Testing Docker Setup..." -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Test-Service {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Timeout = 5
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout 2>$null
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ $Name" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "  ❌ $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    return $false
}

function Test-Container {
    param([string]$Name)
    
    $status = docker inspect -f '{{.State.Running}}' $Name 2>$null
    if ($status -eq "true") {
        Write-Host "  ✅ $Name" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "  ❌ $Name - Not running" -ForegroundColor Red
        return $false
    }
}

# Test Docker
Write-Host ""
Write-Host "🐳 Docker Status:" -ForegroundColor Yellow
docker info > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Docker is running" -ForegroundColor Green
    $passed++
}
else {
    Write-Host "  ❌ Docker is not running" -ForegroundColor Red
    $failed++
    Write-Host ""
    Write-Host "❌ Docker must be running to continue" -ForegroundColor Red
    exit 1
}

# Test containers
Write-Host ""
Write-Host "📦 Container Status:" -ForegroundColor Yellow
if (Test-Container "incubator-dashboard") { $passed++ } else { $failed++ }
if (Test-Container "incubator-admin-backend") { $passed++ } else { $failed++ }
if (Test-Container "incubator-parent-backend") { $passed++ } else { $failed++ }

# Test service health
Write-Host ""
Write-Host "🏥 Service Health:" -ForegroundColor Yellow
if (Test-Service "Dashboard" "http://localhost:3001/health") { $passed++ } else { $failed++ }
if (Test-Service "Admin Backend" "http://localhost:5056/api/auth/health") { $passed++ } else { $failed++ }
if (Test-Service "Parent Backend" "http://localhost:5000/api/health") { $passed++ } else { $failed++ }

# Test environment variables
Write-Host ""
Write-Host "⚙️ Environment Check:" -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "  ✅ .env file exists" -ForegroundColor Green
    $passed++
    
    # Check required variables
    $envContent = Get-Content .env -Raw
    $requiredVars = @("JWT_SECRET", "PI_HOST", "THINGSBOARD_HOST")
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=(.+)") {
            $value = $matches[1].Trim()
            if ($value -and $value -ne "your-" -and $value -ne "") {
                Write-Host "  ✅ $var is set" -ForegroundColor Green
                $passed++
            }
            else {
                Write-Host "  ⚠️  $var needs to be configured" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  ❌ $var not found in .env" -ForegroundColor Red
            $failed++
        }
    }
}
else {
    Write-Host "  ❌ .env file not found" -ForegroundColor Red
    $failed++
}

# Test Pi connectivity (if running)
Write-Host ""
Write-Host "🔌 Pi Device Connectivity:" -ForegroundColor Yellow
try {
    $envContent = Get-Content .env -Raw
    if ($envContent -match "PI_HOST=(.+)") {
        $piHost = $matches[1].Trim()
        
        if ($piHost -and $piHost -ne "your-pi-host") {
            $ping = Test-Connection -ComputerName $piHost -Count 1 -Quiet
            if ($ping) {
                Write-Host "  ✅ Can reach Pi device ($piHost)" -ForegroundColor Green
                $passed++
            }
            else {
                Write-Host "  ⚠️  Cannot reach Pi device ($piHost) - Check Tailscale" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  ⚠️  PI_HOST not configured in .env" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "  ⚠️  Could not test Pi connectivity" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "==================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ All tests passed! System is ready." -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your services:" -ForegroundColor Cyan
    Write-Host "  Dashboard:      http://localhost:3001" -ForegroundColor White
    Write-Host "  Admin Backend:  http://localhost:5056" -ForegroundColor White
    Write-Host "  Parent Backend: http://localhost:5000" -ForegroundColor White
}
else {
    Write-Host "❌ Some tests failed. Please review the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Ensure Docker is running: Start Docker Desktop" -ForegroundColor White
    Write-Host "  - Start services: docker-compose up -d" -ForegroundColor White
    Write-Host "  - Check logs: docker-compose logs -f" -ForegroundColor White
    Write-Host "  - Rebuild: docker-compose up -d --build" -ForegroundColor White
}

Write-Host ""
