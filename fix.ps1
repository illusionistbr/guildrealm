$files = @("en", "es", "ko", "ja", "ru", "zh")
foreach ($f in $files) {
    $path = "D:\guildrealm\messages\$f.json"
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $content = $content.TrimEnd()
    # Remove last two closing braces: } and }
    $content = $content.Substring(0, $content.Length - 1).TrimEnd()
    $content = $content.Substring(0, $content.Length - 1).TrimEnd()
    $content = "$content
  }
}"
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed: $f"
}
