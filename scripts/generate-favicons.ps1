# Buykon / BizdeVar favicon generator
# Source: images/favicon/icon.png (recommended 1000x1000 PNG)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent

$src = Join-Path $root "images\favicon\icon.png"
$outDir = Join-Path $root "images\favicon"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

function Ensure-SourceIcon {
    if (Test-Path $src) { return }

    $logoPath = Join-Path $root "images\logo.png"
    if (-not (Test-Path $logoPath)) {
        throw "Place a 1000x1000 PNG at images/favicon/icon.png"
    }

    $logo = [System.Drawing.Image]::FromFile($logoPath)
    try {
        $size = 1000
        $canvas = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        $g.Clear([System.Drawing.Color]::FromArgb(255, 255, 255))
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $maxW = $size * 0.82
        $maxH = $size * 0.82
        $scale = [Math]::Min($maxW / $logo.Width, $maxH / $logo.Height)
        $nw = [int][Math]::Round($logo.Width * $scale)
        $nh = [int][Math]::Round($logo.Height * $scale)
        $x = [int](($size - $nw) / 2)
        $y = [int](($size - $nh) / 2)
        $g.DrawImage($logo, $x, $y, $nw, $nh)
        $canvas.Save($src, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $canvas.Dispose()
    }
    finally {
        $logo.Dispose()
    }
}

function Save-PngSize($source, $edge, $dest) {
    $bmp = New-Object System.Drawing.Bitmap $edge, $edge
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($source, 0, 0, $edge, $edge)
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Ensure-SourceIcon

$source = [System.Drawing.Image]::FromFile($src)
try {
    $w = $source.Width
    $h = $source.Height
    Write-Host "Source: ${w}x${h} -> $src"

    $sizes = @{
        "favicon-16x16.png" = 16
        "favicon-32x32.png" = 32
        "apple-touch-icon.png" = 180
        "android-chrome-192x192.png" = 192
        "android-chrome-512x512.png" = 512
    }

    foreach ($entry in $sizes.GetEnumerator()) {
        $dest = Join-Path $outDir $entry.Key
        Save-PngSize $source $entry.Value $dest
        Write-Host "Created $($entry.Key)"
    }

    $ico32 = Join-Path $outDir "favicon-32x32.png"
    $icoRoot = Join-Path $root "favicon.ico"
    Copy-Item $ico32 $icoRoot -Force
    Copy-Item $ico32 (Join-Path $outDir "favicon.ico") -Force
    Write-Host "Created favicon.ico"
}
finally {
    $source.Dispose()
}

Write-Host "Done."
