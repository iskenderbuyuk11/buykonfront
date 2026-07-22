$root = Split-Path $PSScriptRoot -Parent

Get-ChildItem -Path $root -Recurse -Filter "*.html" |
    Where-Object { $_.FullName -notmatch "\\partials\\" } |
    ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding UTF8
        if ($content -match "favicon\.js") { return }

        $relDir = $_.DirectoryName.Substring($root.Length).TrimStart("\")
        $depth = if ($relDir) { ($relDir -split "\\").Count } else { 0 }
        $prefix = if ($depth -eq 0) { "" } else { ("../" * $depth) }
        $src = $prefix + "js/favicon.js"
        $inject = "    <script src=`"$src`"></script>`r`n"

        if ($content -match '<meta name="viewport"[^>]*>') {
            $new = [regex]::Replace($content, '(<meta name="viewport"[^>]*>)', "`$1`r`n$inject", 1)
        }
        else {
            $new = $content -replace '(<meta charset="UTF-8"[^/]*/>)', "`$1`r`n$inject"
        }

        if ($new -ne $content) {
            [System.IO.File]::WriteAllText($_.FullName, $new, [System.Text.UTF8Encoding]::new($false))
            Write-Host ("Updated: " + $_.FullName.Substring($root.Length + 1))
        }
    }

Write-Host "Favicon script injection complete."
