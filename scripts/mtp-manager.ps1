param (
    [Parameter(Mandatory=$true)]
    [string]$Action, # "check", "scan", "import"
    
    [string]$DeviceQuery = "X-S10",
    [string]$SubFolder = "",
    [string]$Filter = "latest_session",
    [int]$Minutes = 30,
    [string]$CacheDir = "",
    [string]$DestDir = "",
    [switch]$ClearExisting
)

$ErrorActionPreference = "Stop"

function Parse-DateSafe([string]$str) {
    if (-not $str) { return $null }
    try {
        # Bersihkan karakter non-ASCII yang sering ditambahkan Windows Shell
        $cleanStr = $str -replace '[^\x20-\x7E]', ''
        return [DateTime]::Parse($cleanStr)
    } catch {
        return $null
    }
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
    
    Write-Output (@{
        connected = $true
        deviceName = $info.DeviceName
        path = "This PC\$($info.DeviceName)\$($info.StorageName)\DCIM"
        folders = $subDirs
    } | ConvertTo-Json -Compress)
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
            availableFolders = @()
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    # Ambil list subfolder
    $availableFolders = @()
    $targetFolderItem = $null
    
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
            if ($SubFolder -ne "" -and $item.Name -eq $SubFolder) {
                $targetFolderItem = $item
            }
        }
    }
    
    if (-not $targetFolderItem) {
        # Ambil folder pertama yang memiliki foto atau folder pertama
        if ($availableFolders.Count -gt 0) {
            $top = ($availableFolders | Where-Object { $_.photoCount -gt 0 } | Select-Object -First 1)
            if (-not $top) { $top = $availableFolders[0] }
            $targetFolderItem = $info.DcimFolder.Items() | Where-Object { $_.Name -eq $top.name }
        }
    }
    
    if (-not $targetFolderItem) {
        Write-Output (@{
            success = $false
            error = "Tidak ada folder foto di DCIM kamera."
            totalFound = 0
            totalInFolder = 0
            availableFolders = @()
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    $folder = $targetFolderItem.GetFolder
    $allItems = @()
    foreach ($it in $folder.Items()) {
        if ($it.Name -match '\.(jpg|jpeg)$') {
            $allItems += $it
        }
    }
    
    $totalInFolder = $allItems.Count
    if ($totalInFolder -eq 0) {
        Write-Output (@{
            success = $true
            activeFolder = $targetFolderItem.Name
            totalFound = 0
            totalInFolder = 0
            availableFolders = $availableFolders
            files = @()
            previews = @()
        } | ConvertTo-Json -Compress)
        exit 0
    }
    
    # Filter files
    $matchedItems = @()
    
    if ($Filter -eq "all") {
        $matchedItems = $allItems
    } elseif ($Filter -eq "latest_session") {
        # Ambil tanggal dari item paling terakhir
        $lastIt = $allItems[$allItems.Count - 1]
        $lastDateStr = $folder.GetDetailsOf($lastIt, 14) # Date Picture Taken
        if (-not $lastDateStr) { $lastDateStr = $folder.GetDetailsOf($lastIt, 4) } # Created
        
        $parsedLastDate = Parse-DateSafe $lastDateStr
        if ($parsedLastDate) {
            $cutoff = $parsedLastDate.AddMinutes(-60)
            # Filter dari belakang ke depan
            for ($i = $allItems.Count - 1; $i -ge 0; $i--) {
                $cur = $allItems[$i]
                $curDateStr = $folder.GetDetailsOf($cur, 14)
                if (-not $curDateStr) { $curDateStr = $folder.GetDetailsOf($cur, 4) }
                $parsedCur = Parse-DateSafe $curDateStr
                if ($parsedCur) {
                    if ($parsedCur -ge $cutoff) {
                        $matchedItems = @($cur) + $matchedItems
                    } else {
                        break # Sesi berakhir
                    }
                } else {
                    $matchedItems = @($cur) + $matchedItems
                }
            }
        } else {
            # Fallback jika tanggal tidak bisa di-parse: ambil 30 foto terakhir
            $takeCount = [Math]::Min(30, $allItems.Count)
            $matchedItems = $allItems | Select-Object -Last $takeCount
        }
    } elseif ($Filter -eq "today") {
        $today = [DateTime]::Today
        foreach ($it in $allItems) {
            $dateStr = $folder.GetDetailsOf($it, 14)
            if (-not $dateStr) { $dateStr = $folder.GetDetailsOf($it, 4) }
            $pDate = Parse-DateSafe $dateStr
            if ($pDate -and $pDate.Date -eq $today) {
                $matchedItems += $it
            }
        }
    } else {
        # 30_min, 45_min, 60_min
        $mins = 30
        if ($Filter -eq "45_min") { $mins = 45 }
        elseif ($Filter -eq "60_min") { $mins = 60 }
        $cutoff = [DateTime]::Now.AddMinutes(-$mins)
        foreach ($it in $allItems) {
            $dateStr = $folder.GetDetailsOf($it, 14)
            if (-not $dateStr) { $dateStr = $folder.GetDetailsOf($it, 4) }
            $pDate = Parse-DateSafe $dateStr
            if ($pDate -and $pDate -ge $cutoff) {
                $matchedItems += $it
            }
        }
    }
    
    if ($Action -eq "scan") {
        # Buat cache preview foto jika CacheDir ditentukan
        $previews = @()
        if ($CacheDir -ne "" -and $matchedItems.Count -gt 0) {
            if (-not (Test-Path $CacheDir)) { New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null }
            $destShellFolder = $info.Shell.Namespace((Resolve-Path $CacheDir).Path)
            
            # Ambil sampai 6 sampel foto: 3 awal, 3 akhir
            $sampleItems = @()
            if ($matchedItems.Count -le 6) {
                $sampleItems = $matchedItems
            } else {
                $sampleItems = @($matchedItems[0], $matchedItems[1], $matchedItems[2], $matchedItems[$matchedItems.Count - 3], $matchedItems[$matchedItems.Count - 2], $matchedItems[$matchedItems.Count - 1])
            }
            
            foreach ($s in $sampleItems) {
                $targetFile = Join-Path $CacheDir $s.Name
                if (-not (Test-Path $targetFile)) {
                    $destShellFolder.CopyHere($s, 16) # 16 = Respond with Yes to All
                    Start-Sleep -Milliseconds 150
                }
                $timeTaken = $folder.GetDetailsOf($s, 14)
                if (-not $timeTaken) { $timeTaken = $folder.GetDetailsOf($s, 4) }
                if (Test-Path $targetFile) {
                    $resolved = (Resolve-Path $targetFile).Path
                    $previews += @{
                        name = $s.Name
                        fullPath = $resolved
                        timeFormatted = $timeTaken
                        previewUrl = "/api/camera-import/thumbnail?filePath=" + [System.Uri]::EscapeDataString($resolved)
                    }
                }
            }
        }
        
        $fileList = @()
        foreach ($m in $matchedItems) {
            $t = $folder.GetDetailsOf($m, 14)
            if (-not $t) { $t = $folder.GetDetailsOf($m, 4) }
            $fileList += @{
                name = $m.Name
                sizeFormatted = $folder.GetDetailsOf($m, 2)
                timeFormatted = $t
                folderName = $targetFolderItem.Name
            }
        }
        
        Write-Output (@{
            success = $true
            isMtp = $true
            activeFolder = $targetFolderItem.Name
            activeFolderPath = "This PC\$($info.DeviceName)\$($info.StorageName)\DCIM\$($targetFolderItem.Name)"
            totalFound = $matchedItems.Count
            totalInFolder = $totalInFolder
            availableFolders = $availableFolders
            earliestTime = if ($matchedItems.Count -gt 0) { $fileList[0].timeFormatted } else { $null }
            latestTime = if ($matchedItems.Count -gt 0) { $fileList[$fileList.Count - 1].timeFormatted } else { $null }
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
                $destShellFolder.CopyHere($m, 16)
                $copiedCount++
            } catch {}
        }
        
        # Tunggu beberapa detik agar Windows shell menyelesaikan copy
        Start-Sleep -Milliseconds 800
        
        Write-Output (@{
            success = $true
            count = $copiedCount
            isMtp = $true
            activeFolder = $targetFolderItem.Name
        } | ConvertTo-Json -Compress)
        exit 0
    }
}
