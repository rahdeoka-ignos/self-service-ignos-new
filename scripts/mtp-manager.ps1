param (
    [Parameter(Mandatory=$true)]
    [string]$Action, # "check", "scan", "import"
    
    [string]$DeviceQuery = "X-S10",
    [string]$SubFolder = "",
    [string]$Filter = "30_min",
    [int]$Minutes = 30,
    [string]$CacheDir = "",
    [string]$DestDir = "",
    [string]$ManifestPath = "",
    [switch]$ClearExisting
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Parse-DateSafe([string]$str) {
    if (-not $str) { return $null }
    try {
        # Bersihkan karakter non-ASCII (LTR/RTL mark) yang sering ditambahkan Windows Shell
        $cleanStr = $str -replace '[^\x20-\x7E]', ''
        return [DateTime]::Parse($cleanStr)
    } catch {
        return $null
    }
}

function Format-Bytes([int64]$bytes) {
    if ($bytes -le 0) { return "0 B" }
    if ($bytes -ge 1073741824) { return "{0:N2} GB" -f ($bytes / 1073741824) }
    if ($bytes -ge 1048576) { return "{0:N1} MB" -f ($bytes / 1048576) }
    if ($bytes -ge 1024) { return "{0:N0} KB" -f ($bytes / 1024) }
    return "$bytes B"
}

function Get-MtpDeviceAndDcim {
    param([string]$Query)
    $shell = New-Object -ComObject Shell.Application
    $thisPC = $shell.Namespace(17) # ssfDRIVES
    
    $dev = $null
    foreach ($item in $thisPC.Items()) {
        if ($item.Name -like "*$Query*" -or ($Query -eq "" -and $item.Name -like "*Fuji*")) {
            $dev = $item
            break
        }
    }
    
    if (-not $dev) {
        # Coba cari portable device apapun yang memiliki folder DCIM
        foreach ($item in $thisPC.Items()) {
            if ($item.IsFolder) {
                try {
                    $subItems = $item.GetFolder.Items()
                    foreach ($sub in $subItems) {
                        if ($sub.Name -eq "DCIM" -or ($sub.IsFolder -and ($sub.GetFolder.Items() | Where-Object { $_.Name -eq "DCIM" }))) {
                            $dev = $item
                            break
                        }
                    }
                } catch {}
            }
            if ($dev) { break }
        }
    }
    
    if (-not $dev) {
        return $null
    }
    
    # Cari DCIM di root atau di dalam External Memory / Storage
    $dcim = $null
    $storageName = ""
    $devFolder = $dev.GetFolder
    
    foreach ($sub in $devFolder.Items()) {
        if ($sub.Name -eq "DCIM") {
            $dcim = $sub
            break
        }
        if ($sub.IsFolder) {
            try {
                $candidate = $sub.GetFolder.Items() | Where-Object { $_.Name -eq "DCIM" }
                if ($candidate) {
                    $storageName = $sub.Name
                    $dcim = $candidate
                    break
                }
            } catch {}
        }
    }
    
    if (-not $dcim) {
        return $null
    }
    
    return @{
        Device = $dev
        DeviceName = $dev.Name
        StorageName = $storageName
        DcimItem = $dcim
        DcimFolder = $dcim.GetFolder
        Shell = $shell
    }
}

if ($Action -eq "check") {
    $info = Get-MtpDeviceAndDcim -Query $DeviceQuery
    if (-not $info) {
        Write-Output (@{
            connected = $false
            deviceName = $DeviceQuery
            error = "Kamera tidak terdeteksi di Windows Portable Devices (This PC)."
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    $subDirs = @()
    foreach ($item in $info.DcimFolder.Items()) {
        if ($item.IsFolder) {
            $count = 0
            try {
                $subFolderItems = $item.GetFolder.Items()
                foreach ($f in $subFolderItems) {
                    if ($f.Name -match '\.(jpg|jpeg)$') { $count++ }
                }
            } catch {}
            $subDirs += @{
                name = $item.Name
                photoCount = $count
            }
        }
    }
    
    # Sort numeric descending (misal 265_FUJI sebelum 264_FUJI)
    $subDirs = @($subDirs | Sort-Object -Property @{ Expression = { $_.name } } -Descending)
    
    # Format array folders secara aman agar tidak ter-unwrap oleh ConvertTo-Json
    $folderElements = @()
    foreach ($sd in $subDirs) {
        $folderElements += "{`"name`":`"$($sd.name)`",`"photoCount`":$($sd.photoCount)}"
    }
    $foldersJson = "[" + ($folderElements -join ",") + "]"
    
    Write-Output "{`"connected`":true,`"deviceName`":`"$($info.DeviceName)`",`"path`":`"This PC\\$($info.DeviceName)\\$($info.StorageName)\\DCIM`",`"folders`":$foldersJson}"
    exit 0
}

if ($Action -eq "scan" -or $Action -eq "import") {
    $info = Get-MtpDeviceAndDcim -Query $DeviceQuery
    if (-not $info) {
        Write-Output (@{
            success = $false
            error = "Kamera $($DeviceQuery) belum dicolok atau belum dinyalakan."
            totalFound = 0
            totalInFolder = 0
            totalBytes = 0
            formattedTotalSize = "0 B"
            availableFolders = @()
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    # Ambil list subfolder di DCIM
    $availableFolders = @()
    $subFolderItemsList = @()
    
    foreach ($item in $info.DcimFolder.Items()) {
        if ($item.IsFolder) {
            $fItems = $item.GetFolder.Items()
            $jpgCount = 0
            foreach ($f in $fItems) {
                if ($f.Name -match '\.(jpg|jpeg)$') { $jpgCount++ }
            }
            $availableFolders += @{
                name = $item.Name
                photoCount = $jpgCount
            }
            $subFolderItemsList += $item
        }
    }
    
    # Sort subfolder descending (folder bernomor tertinggi di urutan teratas)
    $availableFolders = $availableFolders | Sort-Object -Property @{ Expression = { $_.name } } -Descending
    
    $targetFolderItems = @()
    $activeFolderName = ""
    
    if ($SubFolder -eq "all") {
        $targetFolderItems = $subFolderItemsList
        $activeFolderName = "Semua Subfolder"
    } elseif ($SubFolder -ne "") {
        $matched = $subFolderItemsList | Where-Object { $_.Name -eq $SubFolder }
        if ($matched) {
            $targetFolderItems = @($matched)
            $activeFolderName = $matched.Name
        }
    }
    
    if ($targetFolderItems.Count -eq 0) {
        # Ambil folder pertama yang memiliki foto
        $top = $availableFolders | Where-Object { $_.photoCount -gt 0 } | Select-Object -First 1
        if (-not $top -and $availableFolders.Count -gt 0) { $top = $availableFolders[0] }
        if ($top) {
            $targetFolderItems = @($subFolderItemsList | Where-Object { $_.Name -eq $top.name })
            $activeFolderName = $top.name
        }
    }
    
    if ($targetFolderItems.Count -eq 0) {
        Write-Output (@{
            success = $false
            error = "Tidak ada folder foto di DCIM kamera."
            totalFound = 0
            totalInFolder = 0
            totalBytes = 0
            formattedTotalSize = "0 B"
            availableFolders = @()
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    # Kumpulkan semua file JPG dari folder target
    $allItems = @()
    foreach ($tFolderItem in $targetFolderItems) {
        $f = $tFolderItem.GetFolder
        foreach ($it in $f.Items()) {
            if ($it.Name -match '\.(jpg|jpeg)$') {
                $allItems += @{
                    Item = $it
                    Folder = $f
                    FolderName = $tFolderItem.Name
                }
            }
        }
    }
    
    $totalInFolder = $allItems.Count
    if ($totalInFolder -eq 0) {
        Write-Output (@{
            success = $true
            activeFolder = $activeFolderName
            totalFound = 0
            totalInFolder = 0
            totalBytes = 0
            formattedTotalSize = "0 B"
            availableFolders = $availableFolders
            files = @()
            previews = @()
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    # Named Windows properties avoid locale-dependent column indices.
    $inventory = @()
    foreach ($entry in $allItems) {
        $taken = $entry.Item.ExtendedProperty("System.Photo.DateTaken")
        $source = "taken"
        if (-not $taken) {
            $taken = $entry.Item.ExtendedProperty("System.DateModified")
            $source = "modified"
        }
        $date = $null
        if ($taken -is [DateTime]) { $date = $taken }
        elseif ($taken) { $date = Parse-DateSafe ([string]$taken) }
        $stamp = if ($date) { $date.ToString("yyyy-MM-ddTHH:mm:ss") } else { $null }
        if (-not $date) { $source = "unknown" }
        $size = $entry.Item.ExtendedProperty("System.Size")
        $inventory += @{
            id = "$($entry.FolderName)/$($entry.Item.Name)"
            name = $entry.Item.Name
            folderName = $entry.FolderName
            capturedAt = $stamp
            timeSource = $source
            size = if ($size) { [int64]$size } else { $null }
        }
    }
    $inventory = @($inventory | Sort-Object -Property @{ Expression = { $_.capturedAt } }, @{ Expression = { $_.id } })
    if ($Action -eq "scan") {
        Write-Output (@{
            success = $true
            isMtp = $true
            deviceName = $info.DeviceName
            storageName = $info.StorageName
            activeFolder = $activeFolderName
            files = $inventory
            availableFolders = @($availableFolders)
        } | ConvertTo-Json -Depth 6 -Compress)
        exit 0
    }

    # Import ONLY the exact file identities confirmed from the scan, never rescan a time window.
    if ($Action -eq "import") {
        try {
            if (-not $ManifestPath -or -not $DestDir) { throw "Manifest dan folder sementara wajib diisi." }
            $manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($manifest.deviceName -ne $info.DeviceName -or $manifest.storageName -ne $info.StorageName) {
                throw "Perangkat berubah sejak scan. Lakukan scan ulang."
            }
            $requested = @($manifest.files)
            if ($requested.Count -eq 0) { throw "Tidak ada foto yang dipilih." }
            if (-not (Test-Path -LiteralPath $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }
            $destination = (Resolve-Path -LiteralPath $DestDir).Path
            $copiedCount = 0
            foreach ($wanted in $requested) {
                $matches = @($allItems | Where-Object { "$($_.FolderName)/$($_.Item.Name)" -eq $wanted.id })
                if ($matches.Count -ne 1) { throw "Foto tidak ditemukan atau ambigu: $($wanted.name). Scan ulang." }
                $entry = $matches[0]
                $current = @($inventory | Where-Object { $_.id -eq $wanted.id })[0]
                if ($current.capturedAt -ne $wanted.capturedAt -or $current.size -ne $wanted.size) {
                    throw "Foto berubah sejak scan: $($wanted.name). Scan ulang."
                }
                if ($wanted.destName -match '[\\/:]' -or $entry.Item.Name -match '[\\/:]') { throw "Nama file tidak valid." }
                $scratch = Join-Path $destination ("transfer-" + [Guid]::NewGuid().ToString())
                New-Item -ItemType Directory -Path $scratch | Out-Null
                $shellDest = $info.Shell.Namespace($scratch)
                $shellDest.CopyHere($entry.Item, 16)
                $tempFile = Join-Path $scratch $entry.Item.Name
                $watch = [Diagnostics.Stopwatch]::StartNew()
                $lastSize = -1
                $stable = 0
                $ready = $false
                while ($watch.Elapsed.TotalSeconds -lt 120) {
                    Start-Sleep -Milliseconds 500
                    if (-not (Test-Path -LiteralPath $tempFile)) { continue }
                    $actual = (Get-Item -LiteralPath $tempFile).Length
                    if ($actual -gt 0 -and $actual -eq $lastSize) { $stable++ } else { $stable = 0 }
                    $lastSize = $actual
                    if ($stable -ge 3 -and (-not $wanted.size -or $actual -eq $wanted.size)) { $ready = $true; break }
                }
                if (-not $ready) { throw "Transfer belum lengkap atau kamera terputus: $($wanted.name)." }
                Move-Item -LiteralPath $tempFile -Destination (Join-Path $destination $wanted.destName) -ErrorAction Stop
                Remove-Item -LiteralPath $scratch -ErrorAction SilentlyContinue
                $copiedCount++
            }
            Write-Output (@{ success = $true; count = $copiedCount; isMtp = $true } | ConvertTo-Json -Compress)
        } catch {
            Write-Output (@{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
        }
        exit 0
    }
}
