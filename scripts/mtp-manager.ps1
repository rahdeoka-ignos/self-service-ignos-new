param (
    [Parameter(Mandatory=$true)]
    [string]$Action, # "check", "scan", "import", "thumbs"
    
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
        # Coba cari portable device apapun yang memiliki folder DCIM.
        # Drive biasa (C:, card reader E:) dilewati: itu bukan kamera USB dan punya preset sendiri.
        foreach ($item in $thisPC.Items()) {
            if ($item.IsFolder -and $item.Path -notmatch '^[A-Za-z]:\\') {
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

function Get-EntryInfo($entry) {
    # Named Windows properties avoid locale-dependent column indices.
    $taken = $entry.Item.ExtendedProperty("System.Photo.DateTaken")
    $source = "taken"
    if (-not $taken) {
        $taken = $entry.Item.ExtendedProperty("System.DateModified")
        $source = "modified"
    }
    $date = $null
    # Shell returns these properties as UTC with an unspecified kind; the rest of the system
    # (EXIF on SD cards, UI labels) uses camera-local wall time.
    if ($taken -is [DateTime]) { $date = [DateTime]::SpecifyKind($taken, [DateTimeKind]::Utc).ToLocalTime() }
    elseif ($taken) { $date = Parse-DateSafe ([string]$taken) }
    $stamp = if ($date) { $date.ToString("yyyy-MM-ddTHH:mm:ss") } else { $null }
    if (-not $date) { $source = "unknown" }
    $size = $entry.Item.ExtendedProperty("System.Size")
    return @{
        id = "$($entry.FolderName)/$($entry.Item.Name)"
        name = $entry.Item.Name
        folderName = $entry.FolderName
        capturedAt = $stamp
        timeSource = $source
        size = if ($size) { [int64]$size } else { $null }
    }
}

# Opens only the DCIM folders named in the manifest ids ("<folder>/<file>").
function Get-RequestedIndex($info, $requested) {
    $neededFolders = @($requested | ForEach-Object { ([string]$_.id).Split("/")[0] } | Select-Object -Unique)
    $index = @{}
    foreach ($folderItem in $info.DcimFolder.Items()) {
        if (-not $folderItem.IsFolder -or $neededFolders -notcontains $folderItem.Name) { continue }
        foreach ($it in $folderItem.GetFolder.Items()) {
            if ($it.Name -notmatch '\.(jpg|jpeg)$') { continue }
            $key = "$($folderItem.Name)/$($it.Name)"
            if ($index.ContainsKey($key)) { $index[$key] = "ambiguous" }
            else { $index[$key] = @{ Item = $it; FolderName = $folderItem.Name } }
        }
    }
    return $index
}

# Shell helpers compiled once per run: camera thumbnails, EXIF header reads and stream copies.
function Use-IgnosShell {
    if ('IgnosThumb' -as [type]) { return }
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
[StructLayout(LayoutKind.Sequential)] public struct IgnosSize { public int cx; public int cy; }
[ComImport, Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IIgnosShellItem {
    [PreserveSig] int BindToHandler(IntPtr pbc, [MarshalAs(UnmanagedType.LPStruct)] Guid bhid, [MarshalAs(UnmanagedType.LPStruct)] Guid riid, out IntPtr ppv);
}
[ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IIgnosImageFactory { [PreserveSig] int GetImage(IgnosSize size, int flags, out IntPtr bitmap); }
public static class IgnosThumb {
    // MTP items have no file-system path, so the shell item is built from the FolderItem's ID list.
    [DllImport("shell32.dll", PreserveSig = false)]
    static extern void SHGetIDListFromObject([MarshalAs(UnmanagedType.IUnknown)] object item, out IntPtr pidl);
    [DllImport("shell32.dll", PreserveSig = false)]
    static extern void SHCreateItemFromIDList(IntPtr pidl, [MarshalAs(UnmanagedType.LPStruct)] Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out IIgnosImageFactory item);
    [DllImport("shell32.dll", PreserveSig = false)]
    static extern void SHCreateItemFromIDList(IntPtr pidl, [MarshalAs(UnmanagedType.LPStruct)] Guid riid,
        [MarshalAs(UnmanagedType.Interface)] out IIgnosShellItem item);
    [DllImport("ole32.dll")] static extern void CoTaskMemFree(IntPtr p);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr handle);
    static readonly Guid BHID_Stream = new Guid("1CEBB3AB-7C10-499a-A417-92CA16C4CB83");
    static readonly Guid IID_IStream = new Guid("0000000c-0000-0000-C000-000000000046");

    // Opens the photo on the device as a stream. Unlike Explorer's CopyHere, a stream never shows a
    // Windows dialog ("Error Copying File or Folder") that would block the kiosk until someone clicks OK.
    static IStream Open(object folderItem) {
        IntPtr pidl;
        SHGetIDListFromObject(folderItem, out pidl);
        try {
            IIgnosShellItem item;
            SHCreateItemFromIDList(pidl, typeof(IIgnosShellItem).GUID, out item);
            IntPtr ptr;
            int hr = item.BindToHandler(IntPtr.Zero, BHID_Stream, IID_IStream, out ptr);
            if (hr != 0) Marshal.ThrowExceptionForHR(hr);
            IStream stream = (IStream)Marshal.GetObjectForIUnknown(ptr);
            Marshal.Release(ptr);
            return stream;
        } finally { CoTaskMemFree(pidl); }
    }

    // Copies the whole photo to target (which must not exist yet); returns the number of bytes.
    public static long CopyTo(object folderItem, string target) {
        IStream stream = Open(folderItem);
        try {
            long total = 0;
            byte[] chunk = new byte[1 << 20];
            IntPtr readPtr = Marshal.AllocHGlobal(4);
            try {
                using (System.IO.FileStream output = new System.IO.FileStream(target, System.IO.FileMode.CreateNew)) {
                    while (true) {
                        stream.Read(chunk, chunk.Length, readPtr);
                        int n = Marshal.ReadInt32(readPtr);
                        if (n <= 0) break;
                        output.Write(chunk, 0, n);
                        total += n;
                    }
                }
            } finally { Marshal.FreeHGlobal(readPtr); }
            return total;
        } finally { Marshal.ReleaseComObject(stream); }
    }

    // Reads only the first bytes of the photo from the camera (the EXIF header), not the whole file.
    public static byte[] Head(object folderItem, int count) {
        IStream stream = Open(folderItem);
        {
            try {
                byte[] buffer = new byte[count];
                int total = 0;
                IntPtr readPtr = Marshal.AllocHGlobal(4);
                try {
                    while (total < count) {
                        byte[] chunk = new byte[count - total];
                        stream.Read(chunk, chunk.Length, readPtr);
                        int n = Marshal.ReadInt32(readPtr);
                        if (n <= 0) break;
                        Array.Copy(chunk, 0, buffer, total, n);
                        total += n;
                    }
                } finally { Marshal.FreeHGlobal(readPtr); }
                Array.Resize(ref buffer, total);
                return buffer;
            } finally { Marshal.ReleaseComObject(stream); }
        }
    }

    // EXIF orientation (IFD0 tag 0x0112) from a JPEG header; 1 when absent or unreadable.
    public static int Orientation(byte[] d) {
        try {
            for (int i = 2; i + 10 < d.Length; ) {
                if (d[i] != 0xFF) return 1;
                int marker = d[i + 1];
                int len = (d[i + 2] << 8) | d[i + 3];
                if (marker == 0xE1 && d[i + 4] == 'E' && d[i + 5] == 'x' && d[i + 6] == 'i' && d[i + 7] == 'f') {
                    int t = i + 10;
                    bool le = d[t] == 'I';
                    Func<int, int> u16 = o => le ? d[t + o] | (d[t + o + 1] << 8) : (d[t + o] << 8) | d[t + o + 1];
                    Func<int, int> u32 = o => le ? d[t + o] | (d[t + o + 1] << 8) | (d[t + o + 2] << 16) | (d[t + o + 3] << 24)
                                                 : (d[t + o] << 24) | (d[t + o + 1] << 16) | (d[t + o + 2] << 8) | d[t + o + 3];
                    int ifd = u32(4);
                    int n = u16(ifd);
                    for (int k = 0; k < n; k++) {
                        int e = ifd + 2 + k * 12;
                        if (t + e + 12 > d.Length) break;
                        if (u16(e) == 0x0112) return u16(e + 8);
                    }
                    return 1;
                }
                i += 2 + len;
            }
        } catch (IndexOutOfRangeException) { }
        return 1;
    }

    // Reads the camera's stored thumbnail, then the EXIF header for orientation (in this order: an open
    // header stream makes thumbnail extraction fail on the X-S10).
    public static int Save(object folderItem, int size, string target) {
        Bitmap bitmap = Thumbnail(folderItem, size);
        try {
            int orientation = 1;
            for (int attempt = 0; attempt < 2; attempt++) {
                try { orientation = Orientation(Head(folderItem, 8192)); break; }
                catch (Exception) { System.Threading.Thread.Sleep(300); }
            }
            // The stored thumbnail is not rotated; apply the photo's EXIF orientation.
            if (orientation == 3) bitmap.RotateFlip(RotateFlipType.Rotate180FlipNone);
            else if (orientation == 6) bitmap.RotateFlip(RotateFlipType.Rotate90FlipNone);
            else if (orientation == 8) bitmap.RotateFlip(RotateFlipType.Rotate270FlipNone);
            bitmap.Save(target, System.Drawing.Imaging.ImageFormat.Jpeg);
            return orientation;
        } finally { bitmap.Dispose(); }
    }

    static Bitmap Thumbnail(object folderItem, int size) {
        IntPtr pidl;
        SHGetIDListFromObject(folderItem, out pidl);
        try {
            IIgnosImageFactory factory;
            SHCreateItemFromIDList(pidl, typeof(IIgnosImageFactory).GUID, out factory);
            IntPtr handle;
            // 0x8 = SIIGBF_THUMBNAILONLY: never substitute the generic file icon.
            int hr = factory.GetImage(new IgnosSize { cx = size, cy = size }, 0x8, out handle);
            if (hr != 0) Marshal.ThrowExceptionForHR(hr);
            try { return Image.FromHbitmap(handle); }
            finally { DeleteObject(handle); }
        } finally { CoTaskMemFree(pidl); }
    }
}
"@
}

# Writes the thumbnail the device already stores (what Explorer shows), without copying the photo.
# Missing thumbnails are reported per file so the caller can fall back to a full copy.
if ($Action -eq "thumbs") {
    $info = Get-MtpDeviceAndDcim -Query $DeviceQuery
    if (-not $info) {
        Write-Output (@{ success = $false; error = "Kamera $($DeviceQuery) belum dicolok atau belum dinyalakan." } | ConvertTo-Json -Compress)
        exit 0
    }
    try {
        $manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($manifest.deviceName -ne $info.DeviceName -or $manifest.storageName -ne $info.StorageName) {
            throw "Perangkat berubah sejak scan. Lakukan scan ulang."
        }
        Use-IgnosShell
        $requested = @($manifest.files)
        $index = Get-RequestedIndex $info $requested
        $destination = (Resolve-Path -LiteralPath $DestDir).Path
        $results = @()
        foreach ($wanted in $requested) {
            $entry = $index[[string]$wanted.id]
            $ok = $false; $message = $null
            try {
                if (-not $entry -or $entry -is [string]) { throw "Foto tidak ditemukan." }
                if ($wanted.destName -match '[\\/:]') { throw "Nama file tidak valid." }
                # The camera does not report orientation as a Windows property; Save reads it from the EXIF header.
                [void][IgnosThumb]::Save($entry.Item, 256, (Join-Path $destination $wanted.destName))
                $ok = $true
            } catch { $message = $_.Exception.Message }
            $results += @{ id = [string]$wanted.id; ok = $ok; error = $message }
        }
        Write-Output (@{ success = $true; files = @($results) } | ConvertTo-Json -Depth 4 -Compress)
    } catch {
        Write-Output (@{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
    }
    exit 0
}

# Import ONLY the exact file identities confirmed from the scan, never rescan a time window.
# Only the folders named in the manifest are opened and only requested files are inspected,
# so a camera preview does not pay for enumerating the whole card.
if ($Action -eq "import") {
    $info = Get-MtpDeviceAndDcim -Query $DeviceQuery
    if (-not $info) {
        Write-Output (@{ success = $false; error = "Kamera $($DeviceQuery) belum dicolok atau belum dinyalakan." } | ConvertTo-Json -Compress)
        exit 0
    }
    try {
        if (-not $ManifestPath -or -not $DestDir) { throw "Manifest dan folder sementara wajib diisi." }
        $manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($manifest.deviceName -ne $info.DeviceName -or $manifest.storageName -ne $info.StorageName) {
            throw "Perangkat berubah sejak scan. Lakukan scan ulang."
        }
        $requested = @($manifest.files)
        if ($requested.Count -eq 0) { throw "Tidak ada foto yang dipilih." }
        $index = Get-RequestedIndex $info $requested
        Use-IgnosShell
        if (-not (Test-Path -LiteralPath $DestDir)) { New-Item -ItemType Directory -Path $DestDir -Force | Out-Null }
        $destination = (Resolve-Path -LiteralPath $DestDir).Path
        $copiedCount = 0
        foreach ($wanted in $requested) {
            $entry = $index[[string]$wanted.id]
            if (-not $entry -or $entry -is [string]) { throw "Foto tidak ditemukan atau ambigu: $($wanted.name). Scan ulang." }
            $current = Get-EntryInfo $entry
            if ($current.capturedAt -ne $wanted.capturedAt -or $current.size -ne $wanted.size) {
                throw "Foto berubah sejak scan: $($wanted.name). Scan ulang."
            }
            if ($wanted.destName -match '[\\/:]' -or $entry.Item.Name -match '[\\/:]') { throw "Nama file tidak valid." }
            # Stream copy: no Explorer copy dialog, and failures come back as errors instead of a hang.
            $tempFile = Join-Path $destination ("transfer-" + [Guid]::NewGuid().ToString() + ".part")
            $copied = $null
            foreach ($attempt in 1, 2) {
                try { $copied = [IgnosThumb]::CopyTo($entry.Item, $tempFile); break }
                catch {
                    Remove-Item -LiteralPath $tempFile -ErrorAction SilentlyContinue
                    if ($attempt -eq 2) { throw "Transfer gagal atau kamera terputus: $($wanted.name). $($_.Exception.Message)" }
                    Start-Sleep -Milliseconds 500
                }
            }
            if ($wanted.size -and $copied -ne $wanted.size) {
                Remove-Item -LiteralPath $tempFile -ErrorAction SilentlyContinue
                throw "Transfer belum lengkap: $($wanted.name) ($copied dari $($wanted.size) byte)."
            }
            Move-Item -LiteralPath $tempFile -Destination (Join-Path $destination $wanted.destName) -ErrorAction Stop
            $copiedCount++
        }
        Write-Output (@{ success = $true; count = $copiedCount; isMtp = $true } | ConvertTo-Json -Compress)
    } catch {
        Write-Output (@{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
    }
    exit 0
}

if ($Action -eq "scan") {
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
    
    $inventory = @($allItems | ForEach-Object { Get-EntryInfo $_ } | Sort-Object -Property @{ Expression = { $_.capturedAt } }, @{ Expression = { $_.id } })
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
