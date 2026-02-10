param(
  [string]$SourceDir = "src/assets/crests_equipments",
  [string]$CrestDir = "src/assets/crests",
  [string]$EquipmentDir = "src/assets/equipments",
  [double]$SearchMinRatio = 0.38,
  [double]$SearchMaxRatio = 0.62
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $CrestDir | Out-Null
New-Item -ItemType Directory -Force -Path $EquipmentDir | Out-Null

$files = Get-ChildItem -Path $SourceDir -Filter "*.png" -File
if ($files.Count -eq 0) {
  Write-Output "No PNG files found in '$SourceDir'."
  exit 0
}

foreach ($file in $files) {
  $bitmap = [System.Drawing.Bitmap]::FromFile($file.FullName)

  try {
    $width = $bitmap.Width
    $height = $bitmap.Height

    $sampleStep = 3
    $energy = New-Object "double[]" $width

    for ($x = 1; $x -lt $width; $x++) {
      $sum = 0.0

      for ($y = 0; $y -lt $height; $y += $sampleStep) {
        $current = $bitmap.GetPixel($x, $y)
        $previous = $bitmap.GetPixel($x - 1, $y)

        $lumCurrent = 0.2126 * $current.R + 0.7152 * $current.G + 0.0722 * $current.B
        $lumPrevious = 0.2126 * $previous.R + 0.7152 * $previous.G + 0.0722 * $previous.B

        $maxCurrent = [Math]::Max($current.R, [Math]::Max($current.G, $current.B))
        $minCurrent = [Math]::Min($current.R, [Math]::Min($current.G, $current.B))
        $satCurrent = $maxCurrent - $minCurrent

        $maxPrevious = [Math]::Max($previous.R, [Math]::Max($previous.G, $previous.B))
        $minPrevious = [Math]::Min($previous.R, [Math]::Min($previous.G, $previous.B))
        $satPrevious = $maxPrevious - $minPrevious

        $sum += [Math]::Abs($lumCurrent - $lumPrevious) * 0.85 + [Math]::Abs($satCurrent - $satPrevious) * 0.15
      }

      $energy[$x] = $sum
    }

    $smoothRadius = 6
    $smoothed = New-Object "double[]" $width

    for ($x = 0; $x -lt $width; $x++) {
      $sum = 0.0
      $count = 0
      $startX = [Math]::Max(1, $x - $smoothRadius)
      $endX = [Math]::Min($width - 1, $x + $smoothRadius)

      for ($ix = $startX; $ix -le $endX; $ix++) {
        $sum += $energy[$ix]
        $count++
      }

      $smoothed[$x] = if ($count -gt 0) { $sum / $count } else { $energy[$x] }
    }

    $mid = $width / 2.0
    $searchStart = [int]([Math]::Floor($width * $SearchMinRatio))
    $searchEnd = [int]([Math]::Ceiling($width * $SearchMaxRatio))

    $bestX = [int]$mid
    $bestScore = [double]::PositiveInfinity

    for ($x = $searchStart; $x -le $searchEnd; $x++) {
      $centerBias = [Math]::Abs($x - $mid) / $mid
      $score = $smoothed[$x] + ($centerBias * 22)

      if ($score -lt $bestScore) {
        $bestScore = $score
        $bestX = $x
      }
    }

    $minSplit = [int]([Math]::Floor($width * 0.42))
    $maxSplit = [int]([Math]::Ceiling($width * 0.58))
    $splitX = [Math]::Min($maxSplit, [Math]::Max($minSplit, $bestX))

    $crestRect = [System.Drawing.Rectangle]::new(0, 0, $splitX, $height)
    $equipmentRect = [System.Drawing.Rectangle]::new($splitX, 0, $width - $splitX, $height)

    $crestBitmap = $bitmap.Clone($crestRect, $bitmap.PixelFormat)
    $equipmentBitmap = $bitmap.Clone($equipmentRect, $bitmap.PixelFormat)

    try {
      $crestPath = Join-Path $CrestDir $file.Name
      $equipmentPath = Join-Path $EquipmentDir $file.Name

      $crestBitmap.Save($crestPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $equipmentBitmap.Save($equipmentPath, [System.Drawing.Imaging.ImageFormat]::Png)

      $splitRatio = [Math]::Round(($splitX / $width), 4)
      Write-Output ("{0} splitX={1} ratio={2}" -f $file.Name, $splitX, $splitRatio)
    }
    finally {
      $crestBitmap.Dispose()
      $equipmentBitmap.Dispose()
    }
  }
  finally {
    $bitmap.Dispose()
  }
}
