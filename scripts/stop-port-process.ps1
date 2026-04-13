param(
    [int]$Port = 4173
)

$connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
$pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

if ($pids.Count -eq 0) {
    Write-Host "No listening process found on port $Port."
    exit 0
}

foreach ($processId in $pids) {
    Write-Host "Stopping process $processId on port $Port..."
    Stop-Process -Id $processId
}

Write-Host "Stopped $($pids.Count) process(es) on port $Port."
