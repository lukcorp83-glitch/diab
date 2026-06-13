param([string]$File)
$lines = Get-Content $File -Encoding UTF8
$i = 0
foreach ($line in $lines) {
    $i++
    if ($line -match '[ąęóśłżźćńĄĘÓŚŁŻŹĆŃ]') {
        Write-Host "$i : $line"
    }
}
