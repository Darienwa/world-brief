# Renders the World Brief icon at several sizes and packs them into a PNG-compressed .ico.
param([string]$Out = "$PSScriptRoot\app.ico")
Add-Type -AssemblyName System.Drawing

function Render([int]$s) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded dark tile
  $r = [single]($s * 0.22); $d = $r * 2; $w = [single]($s - 1)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc(0, 0, $d, $d, 180, 90); $path.AddArc($w - $d, 0, $d, $d, 270, 90)
  $path.AddArc($w - $d, $w - $d, $d, $d, 0, 90); $path.AddArc(0, $w - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 26, 26, 25))), $path)

  $violet = [System.Drawing.Color]::FromArgb(255, 144, 133, 233)
  $c = $s / 2.0; $R = $s * 0.31
  # Globe: outer ring, meridian, equator
  $ring = New-Object System.Drawing.Pen $violet, ([single]([Math]::Max(1.5, $s * 0.075)))
  $g.DrawEllipse($ring, [single]($c - $R), [single]($c - $R), [single]($R * 2), [single]($R * 2))
  if ($s -ge 32) {
    $thin = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150, 144, 133, 233)), ([single]([Math]::Max(1, $s * 0.03)))
    $g.DrawEllipse($thin, [single]($c - $R * 0.45), [single]($c - $R), [single]($R * 0.9), [single]($R * 2))
    $g.DrawLine($thin, [single]($c - $R), [single]$c, [single]($c + $R), [single]$c)
  }
  # Red "live" dot
  $dr = $s * 0.12
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 230, 103, 103))), [single]($c - $dr), [single]($c - $dr), [single]($dr * 2), [single]($dr * 2))
  $g.Dispose()
  if ($s -ge 256) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    return ,$ms.ToArray()
  }
  # Classic 32bpp DIB frame (BITMAPINFOHEADER + bottom-up BGRA + AND mask) for broad compatibility.
  $ms = New-Object System.IO.MemoryStream
  $w2 = New-Object System.IO.BinaryWriter $ms
  $w2.Write([UInt32]40); $w2.Write([Int32]$s); $w2.Write([Int32]($s * 2)); $w2.Write([UInt16]1); $w2.Write([UInt16]32)
  $w2.Write([UInt32]0); $w2.Write([UInt32]0); $w2.Write([Int32]0); $w2.Write([Int32]0); $w2.Write([UInt32]0); $w2.Write([UInt32]0)
  for ($y = $s - 1; $y -ge 0; $y--) { for ($x = 0; $x -lt $s; $x++) { $px = $bmp.GetPixel($x, $y); $w2.Write([byte]$px.B); $w2.Write([byte]$px.G); $w2.Write([byte]$px.R); $w2.Write([byte]$px.A) } }
  $maskRow = [int]([Math]::Ceiling($s / 32.0) * 4)
  $w2.Write((New-Object byte[] ($maskRow * $s)))
  $w2.Flush(); $bmp.Dispose()
  return ,$ms.ToArray()
}

$sizes = 16, 24, 32, 48, 64, 128, 256
$images = @($sizes | ForEach-Object { ,(Render $_) })
$fs = [System.IO.File]::Create($Out)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $sz = $sizes[$i]; $len = $images[$i].Length
  $dim = if ($sz -ge 256) { 0 } else { $sz }
  $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$len); $bw.Write([UInt32]$offset)
  $offset += $len
}
foreach ($img in $images) { $bw.Write($img) }
$bw.Close()
Write-Host "icon -> $Out"
