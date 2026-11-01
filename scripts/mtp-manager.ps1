param (
    [Parameter(Mandatory=$true)]
    [string]$Action, # "check", "scan", "import"
    
    [string]$DeviceQuery = "X-S10",
    [string]$SubFolder = "",
    [string]$Filter = "30_min",
    [int]$Minutes = 30,
    [string]$CacheDir = "",
    [string]$DestDir = "",
    [switch]$ClearExisting
)

$ErrorActionPreference = "Stop"

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
    
    # Cari tanggal foto paling terbaru di kamera sebagai titik referensi waktu
    # (Penting: Menangani kamera yang tanggal/jam internalnya berbeda dari jam PC)
    $latestPhotoDate = $null
    for ($i = $allItems.Count - 1; $i -ge 0; $i--) {
        $entry = $allItems[$i]
        $dateStr = $entry.Folder.GetDetailsOf($entry.Item, 14) # Date Picture Taken
        if (-not $dateStr) { $dateStr = $entry.Folder.GetDetailsOf($entry.Item, 4) } # Created
        $parsed = Parse-DateSafe $dateStr
        if ($parsed) {
            $latestPhotoDate = $parsed
            break
        }
    }
    
    # Tentukan reference time: gunakan tanggal foto terbaru kamera jika ada, atau jam PC
    $refTime = if ($latestPhotoDate) { $latestPhotoDate } else { [DateTime]::Now }
    
    # Tentukan durasi menit dan toleransi buffer sesi (mencegah foto awal sesi terpotong)
    $mins = 30
    $bufferMins = 10
    if ($Filter -eq "45_min") {
        $mins = 45
        $bufferMins = 15
    } elseif ($Filter -eq "60_min" -or $Filter -eq "latest_session") {
        $mins = 60
        $bufferMins = 20
    } elseif ($Filter -eq "custom_min" -and $Minutes -gt 0) {
        $mins = $Minutes
        $bufferMins = [Math]::Min(15, [Math]::Ceiling($mins * 0.3))
    }
    
    # Batas maksimal mundur (durasi nominal + buffer toleransi)
    $maxCutoff = $refTime.AddMinutes(-($mins + $bufferMins))
    # Batas nominal (setelah batas ini terlewati, jeda antar foto >= 8 menit menandakan ganti sesi)
    $nominalCutoff = $refTime.AddMinutes(-$mins)
    
    $matchedItems = @()
    
    if ($Filter -eq "all") {
        $matchedItems = $allItems
    } elseif ($Filter -eq "today") {
        $targetDate = $refTime.Date
        foreach ($entry in $allItems) {
            $dateStr = $entry.Folder.GetDetailsOf($entry.Item, 14)
            if (-not $dateStr) { $dateStr = $entry.Folder.GetDetailsOf($entry.Item, 4) }
            $pDate = Parse-DateSafe $dateStr
            if ($pDate -and $pDate.Date -eq $targetDate) {
                $matchedItems += $entry
            }
        }
    } else {
        # Filter berdasarkan durasi menit dengan toleransi buffer cerdas & deteksi jeda sesi
        $prevPhotoDate = $refTime
        
        # Scan mundur dari foto terbaru ke foto terlama
        for ($i = $allItems.Count - 1; $i -ge 0; $i--) {
            $entry = $allItems[$i]
            $dateStr = $entry.Folder.GetDetailsOf($entry.Item, 14)
            if (-not $dateStr) { $dateStr = $entry.Folder.GetDetailsOf($entry.Item, 4) }
            $pDate = Parse-DateSafe $dateStr
            
            if ($pDate) {
                # Hitung jeda waktu terhadap foto sebelumnya (yang lebih baru)
                $gapMinutes = [Math]::Abs(($prevPhotoDate - $pDate).TotalMinutes)
                
                # Jika sudah melewati durasi nominal DAN terdapat jeda antarfoto >= 8 menit,
                # ini jelas batas sesi pelanggan sebelumnya (karena dalam 1 sesi foto selalu kontinu)
                if ($pDate -lt $nominalCutoff -and $gapMinutes -ge 8) {
                    break
                }
                
                # Masukkan foto selama masih dalam rentang batas maksimal toleransi
                if ($pDate -ge $maxCutoff) {
                    $matchedItems = @($entry) + $matchedItems
                    $prevPhotoDate = $pDate
                } else {
                    # Sudah melewati batas toleransi maksimal sesi
                    break
                }
            } else {
                # Jika tanggal tidak terbaca, sertakan foto terbaru
                $matchedItems = @($entry) + $matchedItems
            }
        }
        
        # Fallback proteksi: jika karena parsing tanggal tidak ada yang match, ambil minimal foto paling akhir
        if ($matchedItems.Count -eq 0 -and $allItems.Count -gt 0) {
            $matchedItems = @($allItems[$allItems.Count - 1])
        }
    }
    
    # Hitung estimasi total bytes
    $totalBytes = 0
    $fileList = @()
    foreach ($m in $matchedItems) {
        $szStr = $m.Folder.GetDetailsOf($m.Item, 2) # e.g. "1.51 MB"
        if ($szStr -match '([\d\.,]+)\s*MB') {
            $num = [double]($matches[1] -replace ',', '.')
            $totalBytes += [int64]($num * 1024 * 1024)
        } elseif ($szStr -match '([\d\.,]+)\s*KB') {
            $num = [double]($matches[1] -replace ',', '.')
            $totalBytes += [int64]($num * 1024)
        }
        
        $t = $m.Folder.GetDetailsOf($m.Item, 14)
        if (-not $t) { $t = $m.Folder.GetDetailsOf($m.Item, 4) }
        $fileList += @{
            name = $m.Item.Name
            sizeFormatted = $szStr
            timeFormatted = $t
            folderName = $m.FolderName
        }
    }
    
    $formattedTotalSize = Format-Bytes $totalBytes
    
    if ($Action -eq "scan") {
        # Buat cache thumbnail foto jika CacheDir ditentukan
        $previews = @()
        if ($CacheDir -ne "" -and $matchedItems.Count -gt 0) {
            if (-not (Test-Path $CacheDir)) { New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null }
            $destShellFolder = $info.Shell.Namespace((Resolve-Path $CacheDir).Path)
            
            # Ambil sampai 6 sampel foto: 3 awal, 3 akhir
            $sampleEntries = @()
            if ($matchedItems.Count -le 6) {
                $sampleEntries = $matchedItems
            } else {
                $sampleEntries = @(
                    $matchedItems[0], $matchedItems[1], $matchedItems[2],
                    $matchedItems[$matchedItems.Count - 3], $matchedItems[$matchedItems.Count - 2], $matchedItems[$matchedItems.Count - 1]
                )
            }
            
            foreach ($s in $sampleEntries) {
                $targetFile = Join-Path $CacheDir $s.Item.Name
                if (-not (Test-Path $targetFile)) {
                    $destShellFolder.CopyHere($s.Item, 16) # 16 = Respond with Yes to All
                    Start-Sleep -Milliseconds 150
                }
                $timeTaken = $s.Folder.GetDetailsOf($s.Item, 14)
                if (-not $timeTaken) { $timeTaken = $s.Folder.GetDetailsOf($s.Item, 4) }
                if (Test-Path $targetFile) {
                    $resolved = (Resolve-Path $targetFile).Path
                    $previews += @{
                        name = $s.Item.Name
                        fullPath = $resolved
                        timeFormatted = $timeTaken
                        previewUrl = "/api/camera-import/thumbnail?filePath=" + [System.Uri]::EscapeDataString($resolved)
                    }
                }
            }
        }
        
        Write-Output (@{
            success = $true
            isMtp = $true
            activeFolder = $activeFolderName
            activeFolderPath = "This PC\$($info.DeviceName)\$($info.StorageName)\DCIM\$($activeFolderName)"
            totalFound = $matchedItems.Count
            totalInFolder = $totalInFolder
            totalBytes = $totalBytes
            formattedTotalSize = $formattedTotalSize
            availableFolders = $availableFolders
            earliestTime = if ($fileList.Count -gt 0) { $fileList[0].timeFormatted } else { $null }
            latestTime = if ($fileList.Count -gt 0) { $fileList[$fileList.Count - 1].timeFormatted } else { $null }
            previews = $previews
            files = $fileList
        } | ConvertTo-Json -Depth 4 -Compress)
        exit 0
    }
    
    if ($Action -eq "import") {
        if (-not $DestDir) {
            Write-Output '{"success": false, "error": "DestDir wajib diisi"}'
            exit 1
        }
        
        if (-not (Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }
        
        $destPath = (Resolve-Path $DestDir).Path
        $destShellFolder = $info.Shell.Namespace($destPath)
        
        # Kosongkan foto lama jika ClearExisting
        if ($ClearExisting) {
            Get-ChildItem -Path $destPath -Include *.jpg,*.jpeg,*.png,*.webp -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
        }
        
        $copiedCount = 0
        foreach ($m in $matchedItems) {
            try {
                $destShellFolder.CopyHere($m.Item, 16)
                $copiedCount++
            } catch {}
        }
        
        # Tunggu sampai seluruh file foto selesai disalin ke disk oleh Windows Shell
        $maxWaitSec = 60
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        while ($sw.Elapsed.TotalSeconds -lt $maxWaitSec) {
            $copiedOnDisk = @(Get-ChildItem -Path $destPath | Where-Object { $_.Name -match '\.(jpg|jpeg|png|webp)$' })
            if ($copiedOnDisk.Count -ge $matchedItems.Count) {
                break
            }
            Start-Sleep -Milliseconds 300
        }
        
        $finalCount = @(Get-ChildItem -Path $destPath | Where-Object { $_.Name -match '\.(jpg|jpeg|png|webp)$' }).Count
        if ($finalCount -gt 0) { $copiedCount = $finalCount }
        
        Write-Output (@{
            success = $true
            count = $copiedCount
            isMtp = $true
            activeFolder = $activeFolderName
            totalBytes = $totalBytes
            formattedTotalSize = $formattedTotalSize
        } | ConvertTo-Json -Compress)
        exit 0
    }
}
