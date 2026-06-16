$path = "android\app\src\main\res\raw\critical_alarm.wav"
$sampleRate = 44100
$duration = 3
$frequency1 = 800
$frequency2 = 1200
$samples = $sampleRate * $duration
$file = [System.IO.File]::Create($path)
$writer = New-Object System.IO.BinaryWriter($file)

$writer.Write([char[]]"RIFF")
$writer.Write([int](36 + $samples * 2))
$writer.Write([char[]]"WAVE")
$writer.Write([char[]]"fmt ")
$writer.Write([int]16)
$writer.Write([short]1)
$writer.Write([short]1)
$writer.Write([int]$sampleRate)
$writer.Write([int]($sampleRate * 2))
$writer.Write([short]2)
$writer.Write([short]16)
$writer.Write([char[]]"data")
$writer.Write([int]($samples * 2))

for ($i = 0; $i -lt $samples; $i++) {
    $t = $i / $sampleRate
    $pulse = 0
    if ([Math]::Sin(2 * [Math]::PI * 5 * $t) -gt 0) { $pulse = 1 }
    $wave = [Math]::Sin(2 * [Math]::PI * $frequency1 * $t) + [Math]::Sin(2 * [Math]::PI * $frequency2 * $t)
    $sample = [short]($wave * 10000 * $pulse)
    $writer.Write($sample)
}
$writer.Close()
$file.Close()
