
param(
    [int]   $Users     = 200,
    [int]   $SpawnRate = 50,
    [string]$RunTime   = "90s",
    [string]$BackendHost = "http://127.0.0.1:8000",
    [switch]$SkipSeed
)

$ROOT     = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BACKEND  = Join-Path $ROOT "attendance_system"
$VENV     = Join-Path $BACKEND "venv\Scripts"
$REPORTS  = Join-Path $ROOT "load_tests\reports"
$LOADDIR  = Join-Path $ROOT "load_tests"

Write-Host ""
Write-Host "============================================================"
Write-Host "   DIWAN EVENT -- 1000 Concurrent Vote Spike (LOCAL MODE)  "
Write-Host "============================================================"
Write-Host ""

# ---- STEP 1: Check venv ------------------------------------------
Write-Host "[1/5] Checking virtual environment..."
if (-not (Test-Path "$VENV\python.exe")) {
    Write-Host "    [FAIL] venv not found at: $VENV"
    Write-Host "    Run:  cd attendance_system && python -m venv venv && venv\Scripts\pip install -r requirements.txt"
    exit 1
}

$locustExe = "$VENV\locust.exe"
if (-not (Test-Path $locustExe)) {
    Write-Host "    [INFO] Installing locust into venv..."
    & "$VENV\pip.exe" install locust --quiet
    if ($LASTEXITCODE -ne 0) { Write-Host "    [FAIL] locust install failed"; exit 1 }
}
Write-Host "    [OK] Environment ready"

# ---- STEP 2: Backend health check --------------------------------
Write-Host "[2/5] Checking backend at $BackendHost ..."
try {
    $h = Invoke-RestMethod "$BackendHost/health" -TimeoutSec 6 -ErrorAction Stop
    if ($h.status -in "healthy","ok") {
        Write-Host "    [OK] Backend is up (status: $($h.status))"
    } else {
        Write-Host "    [FAIL] Backend returned status: $($h.status)"; exit 1
    }
} catch {
    Write-Host ""
    Write-Host "    [FAIL] Cannot reach $BackendHost"
    Write-Host ""
    Write-Host "    Start the backend first:"
    Write-Host "      cd $BACKEND"
    Write-Host "      venv\Scripts\activate"
    Write-Host "      uvicorn app.main:app --reload --port 8000"
    Write-Host ""
    exit 1
}

# ---- STEP 3: Seed data -------------------------------------------
if (-not $SkipSeed) {
    Write-Host "[3/5] Seeding 1000 participants + poll into database..."
    Push-Location $BACKEND
    $out = & "$VENV\python.exe" fast_bulk_seed.py 2>&1
    $code = $LASTEXITCODE
    Pop-Location

    $outStr = $out -join "`n"
    Write-Host $outStr

    if ($code -ne 0 -and $outStr -notmatch "COMPLETED") {
        Write-Host "    [FAIL] Seeding failed (exit $code)"
        exit 1
    }
    Write-Host "    [OK] 1000 participants seeded successfully"
} else {
    Write-Host "[3/5] Skipping seed (-SkipSeed flag set)"
    Write-Host "    [OK] Using existing spike_config.json"
}

# ---- STEP 4: Print config summary --------------------------------
Write-Host "[4/5] Test configuration:"
$cfgFile = Join-Path $LOADDIR "spike_config.json"
if (Test-Path $cfgFile) {
    $cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json
    Write-Host ""
    Write-Host "    Target Host   : $BackendHost"
    Write-Host "    Event ID      : $($cfg.event_id)"
    Write-Host "    Poll ID       : $($cfg.poll_id)"
    Write-Host "    Option IDs    : $($cfg.option_ids -join ', ')"
    Write-Host "    Total Voters  : $($cfg.voter_ids.Count)"
    Write-Host "    Virtual Users : $Users (concurrent)"
    Write-Host "    Spawn Rate    : $SpawnRate users/sec"
    Write-Host "    Run Duration  : $RunTime"
    Write-Host "    Distribution  : 60% Voter | 30% Registrant | 10% Reader"
    Write-Host ""
} else {
    Write-Host "    [WARN] spike_config.json not found -- locust will use defaults"
}

# ---- STEP 5: Run Locust ------------------------------------------
Write-Host "[5/5] Launching Locust spike test..."
Write-Host "    (Press Ctrl+C to stop early)"
Write-Host ""

$null = New-Item -ItemType Directory -Force -Path $REPORTS

$ts      = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$csvBase = Join-Path $REPORTS "local_spike_$ts"
$html    = Join-Path $REPORTS "local_spike_$ts.html"

$env:PYTHONUTF8       = "1"
$env:PYTHONIOENCODING = "utf-8"

Push-Location $LOADDIR
& $locustExe `
    -f spike_locustfile.py `
    --headless `
    -u $Users `
    -r $SpawnRate `
    --run-time $RunTime `
    --csv="$csvBase" `
    --html="$html" `
    --host="$BackendHost"
$exitCode = $LASTEXITCODE
Pop-Location

# ---- Results -----------------------------------------------------
Write-Host ""
Write-Host "============================================================"
if ($exitCode -eq 0) {
    Write-Host "  [PASS] Spike test completed successfully!"
} else {
    Write-Host "  [WARN] Spike test finished with exit code: $exitCode"
    Write-Host "         Check error rate in the HTML report."
}
Write-Host "============================================================"
Write-Host ""
Write-Host "  HTML Report : $html"
Write-Host "  CSV Stats   : ${csvBase}_stats.csv"
Write-Host ""

if (Test-Path $html) {
    Write-Host "  Opening report in browser..."
    Start-Process $html
}

exit $exitCode
