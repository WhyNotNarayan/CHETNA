# CHETNA College Demo Setup
# Run this AFTER connecting the laptop to the mobile hotspot:
#   powershell -ExecutionPolicy Bypass -File D:\CHETNA\college-setup.ps1
# It detects the new IP, updates .env, and restarts backend + Metro.

Write-Host "=== CHETNA DEMO SETUP ===" -ForegroundColor Cyan

# 1. Detect laptop IP on the hotspot network
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Sort-Object -Property { if ($_.InterfaceAlias -eq 'Wi-Fi') { 0 } else { 1 } } |
  Select-Object -First 1).IPAddress

if (-not $ip) { Write-Host "ERROR: No network IP found. Is the hotspot connected?" -ForegroundColor Red; exit 1 }
Write-Host "Detected IP: $ip" -ForegroundColor Yellow

# 2. Update .env
$envPath = "D:\CHETNA\mobile-app\.env"
$content = Get-Content $envPath -Raw
$content = $content -replace 'EXPO_PUBLIC_API_URL=http://[\d\.]+:\d+/api', "EXPO_PUBLIC_API_URL=http://${ip}:5000/api"
Set-Content -Path $envPath -Value $content -NoNewline
Write-Host ".env -> EXPO_PUBLIC_API_URL=http://${ip}:5000/api" -ForegroundColor Green

# 3. Kill old backend (port 5000) and Metro (port 8081)
foreach ($port in 5000, 8081) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 2

# 4. Restart backend
Start-Process -FilePath "cmd" -ArgumentList "/k cd /d D:\CHETNA\backend && npm run dev" -WindowStyle Minimized

# 5. Restart Metro with clean cache (picks up new .env)
Start-Process -FilePath "cmd" -ArgumentList "/k cd /d D:\CHETNA\mobile-app && npx expo start --clear" -WindowStyle Minimized

Start-Sleep -Seconds 8
$be = (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "Backend (5000): $(if ($be -eq 1) {'UP'} else {'starting...'})" -ForegroundColor $(if ($be -eq 1) {'Green'} else {'Yellow'})
Write-Host "Metro (8081): starting with --clear (wait ~30s)" -ForegroundColor Yellow

# 6. Print the phone connection info
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host " 1. Wait ~30s for Metro, then scan the QR from the Metro window"
Write-Host "    (or on phone dev-client menu set server: exp://${ip}:8081)"
Write-Host " 2. Backend test:  http://${ip}:5000/api/alerts/nearby"
Write-Host " 3. Emulator admin app needs NO change (it uses same Metro bundle)"
Write-Host ""
Write-Host "Logins:" -ForegroundColor Cyan
Write-Host "  Admin    : aaditaygawade@gmail.com / adi^%2006"
Write-Host "  Girl     : 7767845283  (Preeti)"
Write-Host "  Girl     : 1234567895  (Urmila)"
Write-Host "  Sec.Cop  : 8975347452  (Narayan - verified)"
