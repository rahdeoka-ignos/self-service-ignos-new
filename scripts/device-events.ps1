# Long-running helper for server.js: prints "change" whenever Windows reports a device change
# (USB camera, card reader, card inserted/removed). server.js decides what actually changed.
# Exits on its own when the backend process (ParentPid) is gone, so a killed backend leaves no orphan.
param([int]$ParentPid = 0)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Register-WmiEvent -Query "SELECT * FROM Win32_DeviceChangeEvent" -SourceIdentifier IgnosDeviceChange | Out-Null
Register-WmiEvent -Query "SELECT * FROM Win32_VolumeChangeEvent" -SourceIdentifier IgnosVolumeChange | Out-Null
[Console]::Out.WriteLine("ready")
[Console]::Out.Flush()
while ($true) {
    $event = Wait-Event -Timeout 5
    if ($ParentPid -and -not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { exit 0 }
    if (-not $event) { continue }
    Get-Event | Remove-Event -ErrorAction SilentlyContinue
    [Console]::Out.WriteLine("change")
    [Console]::Out.Flush()
}
