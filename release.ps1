# === NOWA WERSJA GLIKOCONTROL ===
# Zmien tylko te jedna linię i uruchom skrypt:
$VERSION = "5.3.7"
# ================================

# Aktualizuj version w package.json
$json = Get-Content "package.json" -Raw | ConvertFrom-Json
$json.version = $VERSION
$jsonText = $json | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("$PWD\package.json", $jsonText, [System.Text.UTF8Encoding]::new($false))

# Aktualizuj version.json (fallback dla CORS)
$vjson = Get-Content "version.json" -Raw | ConvertFrom-Json
$vjson.version = $VERSION
$vjson.apkUrl = "https://github.com/lukcorp83-glitch/diab/releases/download/v$VERSION/GlikoControl_$VERSION.apk"
$vjsonText = $vjson | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("$PWD\version.json", $vjsonText, [System.Text.UTF8Encoding]::new($false))

# Zatwierdz i wypchnij + tag
git add .
git commit -m "release: v$VERSION"
git tag "v$VERSION"
git push
git push --tags

Write-Host ""
Write-Host "Gotowe! Robot GitHub buduje APK v$VERSION automatycznie."
Write-Host "APK pojawi sie za ok. 10 minut na:"
Write-Host "https://github.com/lukcorp83-glitch/diab/releases"
