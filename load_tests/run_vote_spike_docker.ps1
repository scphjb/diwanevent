
$ROOT          = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$COMPOSE_FILE  = Join-Path $ROOT "docker-compose.vote-spike.yml"
$REPORTS_DIR   = Join-Path $ROOT "load_tests\reports"

Write-Host ""
Write-Host "============================================================"
Write-Host "   DIWAN EVENT -- 1000 Concurrent Vote Spike (DOCKER MODE) "
Write-Host "   Fully isolated: PostgreSQL + FastAPI + Seeder + Locust   "
Write-Host "============================================================"
Write-Host ""

# ---- STEP 1: Docker check ----------------------------------------
Write-Host "[1/4] Checking Docker Engine..."
$di = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "    [FAIL] Docker is not running."
    Write-Host "    Please start Docker Desktop and try again."
    exit 1
}
Write-Host "    [OK] Docker Engine is running"

# ---- STEP 2: Cleanup old containers ------------------------------
Write-Host "[2/4] Cleaning up any previous spike containers..."
Push-Location $ROOT
Remove-Item -Path "$ROOT\load_tests\spike_config.json" -ErrorAction SilentlyContinue
docker compose -f docker-compose.vote-spike.yml down -v --remove-orphans 2>&1 | Out-Null
Pop-Location
Write-Host "    [OK] Environment cleaned"

# ---- STEP 3: Build & run all services ----------------------------
Write-Host "[3/4] Building and starting spike environment..."
Write-Host ""
Write-Host "    Pipeline:"
Write-Host "      [a] spike_db     -- PostgreSQL 15 (synchronous_commit=off)"
Write-Host "      [b] spike_api    -- FastAPI + Gunicorn (4 workers)"
Write-Host "      [c] spike_seed   -- Seeds 1000 participants + 1 poll"
Write-Host "      [d] spike_locust -- 200 virtual users x 90s headless attack"
Write-Host ""
Write-Host "    This may take 3-5 minutes (first build downloads images)..."
Write-Host ""

Push-Location $ROOT
docker compose `
    -f docker-compose.vote-spike.yml `
    up `
    --build `
    --abort-on-container-exit `
    --exit-code-from spike_locust
$exitCode = $LASTEXITCODE
Pop-Location

# ---- STEP 4: Show report -----------------------------------------
Write-Host ""
Write-Host "[4/4] Checking for HTML report..."
$null = New-Item -ItemType Directory -Force -Path $REPORTS_DIR
$reports = Get-ChildItem -Path $REPORTS_DIR -Filter "docker_spike_*.html" -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending

Write-Host ""
Write-Host "============================================================"
if ($exitCode -eq 0) {
    Write-Host "  [PASS] Docker spike test completed!"
} else {
    Write-Host "  [WARN] Locust exited with code $exitCode"
    Write-Host "         Check error rate in the report below."
}
Write-Host "============================================================"
Write-Host ""

if ($reports) {
    $latest = $reports[0].FullName
    Write-Host "  HTML Report : $latest"
    Write-Host ""
    Write-Host "  Opening report in browser..."
    Start-Process $latest
} else {
    Write-Host "  [WARN] No HTML report found in: $REPORTS_DIR"
    Write-Host "  Check Docker logs above for errors."
}

# Cleanup containers (keep volumes for re-runs)
Write-Host ""
Write-Host "  Cleaning up spike containers..."
Push-Location $ROOT
# docker compose -f docker-compose.vote-spike.yml down -v 2>&1 | Out-Null
Pop-Location
Write-Host "  [OK] Containers kept for debugging"
Write-Host ""

exit $exitCode
