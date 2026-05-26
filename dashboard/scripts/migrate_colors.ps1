
<#
.SYNOPSIS
    Migrate colors from old emerald/green theme to new brand color system.
    
.DESCRIPTION
    Replaces:
    - emerald-NNN  → brand-primary / brand-secondary / brand-surface / brand-dark
    - green-NNN    → same mapping
    - #022C22      → #050B18 (brand-dark) or bg-brand-surface class
    - #0A3D2B, #1DB58A, etc. → brand colors
    
    Color mapping:
    - emerald/green 50-400  → brand-secondary (#38BDF8)
    - emerald/green 500-700 → brand-primary   (#2A64EC)
    - emerald/green 800     → brand-surface   (#0D1527)
    - emerald/green 900-950 → brand-dark      (#050B18)
#>

$srcPath = "d:\diwan_event\dashboard\src"
$files = Get-ChildItem -Path $srcPath -Include "*.jsx","*.js","*.css","*.ts","*.tsx" -Recurse

# ─── Color number to brand name mapping ──────────────────────────────────────
$colorMap = @{
    "50"  = "secondary"
    "100" = "secondary"
    "200" = "secondary"
    "300" = "secondary"
    "400" = "secondary"
    "500" = "primary"
    "600" = "primary"
    "700" = "primary"
    "800" = "surface"
    "900" = "dark"
    "950" = "dark"
}

$totalFiles = 0
$log = @()

foreach ($file in $files) {
    $original = Get-Content $file.FullName -Raw -Encoding UTF8
    $content = $original

    # ── 1. Replace emerald-NNN (with optional /opacity) ──────────────────────
    $content = [regex]::Replace($content, 'emerald-(\d+)', {
        param($m)
        $num = $m.Groups[1].Value
        if ($colorMap.ContainsKey($num)) {
            "brand-$($colorMap[$num])"
        } else {
            $m.Value
        }
    })

    # ── 2. Replace green-NNN (with optional /opacity) ─────────────────────────
    $content = [regex]::Replace($content, '\bgreen-(\d+)', {
        param($m)
        $num = $m.Groups[1].Value
        if ($colorMap.ContainsKey($num)) {
            "brand-$($colorMap[$num])"
        } else {
            $m.Value
        }
    })

    # ── 3. Replace hardcoded old hex values ───────────────────────────────────
    # #022C22 (old dark green background) → #050B18 (brand-dark)
    $content = $content -replace '#022C22', '#050B18'
    
    # #0A3D2B (darker green gradient) → #0D1527 (brand-surface)
    $content = $content -replace '#0A3D2B', '#0D1527'
    
    # #1DB58A (teal green gradient accent) → #2A64EC (brand-primary)
    $content = $content -replace '#1DB58A', '#2A64EC'
    
    # gradient: linear-gradient(135deg, #022C22, #1DB58A) → brand gradient
    # already handled by the above two replacements

    # ── 4. Fix double-brand cases (in case of multiple passes) ────────────────
    # e.g., brand-brand-primary → brand-primary
    $content = $content -replace 'brand-brand-', 'brand-'

    # ── 5. Fix any mangled tailwind utility prefixes ──────────────────────────
    # Make sure we didn't accidentally mangle class names
    # e.g., "text-brand-secondary/30" stays correct

    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline -Encoding UTF8
        $totalFiles++
        $log += "✅ $($file.FullName)"
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════"
Write-Host "✅ Total files updated: $totalFiles"
Write-Host "═══════════════════════════════════════════"

# Output log
$logPath = "d:\diwan_event\dashboard\scripts\color_migration_log.txt"
$log | Set-Content $logPath -Encoding UTF8
Write-Host "Log saved to: $logPath"
