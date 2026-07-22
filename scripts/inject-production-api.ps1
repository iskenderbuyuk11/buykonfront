$root = Split-Path $PSScriptRoot -Parent
$prodApi = "https://api.buykon.com/api"

Get-ChildItem -Path $root -Recurse -Filter "*.html" |
    Where-Object { $_.FullName -notmatch "\\partials\\" } |
    ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding UTF8
        $changed = $false

        if ($content -match 'meta name="bizdevar-api"') {
            $newContent = [regex]::Replace(
                $content,
                '<meta name="bizdevar-api" content="[^"]*"\s*/?>',
                "<meta name=`"bizdevar-api`" content=`"$prodApi`" />",
                1
            )
            if ($newContent -ne $content) {
                $content = $newContent
                $changed = $true
            }
        }

        $relDir = $_.DirectoryName.Substring($root.Length).TrimStart("\")
        $depth = if ($relDir) { ($relDir -split "\\").Count } else { 0 }
        $prefix = if ($depth -eq 0) { "" } else { ("../" * $depth) }
        $configSrc = $prefix + "js/site-config.js"

        if ($content -notmatch "site-config\.js") {
            $tag = "    <script src=`"$configSrc`"></script>`r`n"
            if ($content -match '<meta name="bizdevar-api"[^>]*>') {
                $content = [regex]::Replace($content, '(<meta name="bizdevar-api"[^>]*>)', "`$1`r`n$tag", 1)
            }
            elseif ($content -match '<meta name="viewport"[^>]*>') {
                $content = [regex]::Replace($content, '(<meta name="viewport"[^>]*>)', "`$1`r`n$tag", 1)
            }
            $changed = $true
        }

        if ($changed) {
            [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($false))
            Write-Host ("Updated: " + $_.FullName.Substring($root.Length + 1))
        }
    }

Write-Host "Production API config injection complete."
