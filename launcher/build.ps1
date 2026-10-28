# Builds WorldBrief.exe (icon + C# launcher) and puts a shortcut on the desktop.
# Usage: powershell -ExecutionPolicy Bypass -File launcher\build.ps1
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Split-Path $here -Parent
$exe = Join-Path $root 'WorldBrief.exe'
$ico = Join-Path $here 'app.ico'

& (Join-Path $here 'make-icon.ps1') -Out $ico

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
& $csc /nologo /target:winexe /optimize+ /codepage:65001 "/win32icon:$ico" "/out:$exe" `
  /r:System.Windows.Forms.dll /r:System.Drawing.dll (Join-Path $here 'Launcher.cs')
if ($LASTEXITCODE -ne 0) { throw "csc failed ($LASTEXITCODE)" }
Write-Host "exe  -> $exe"

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop '全球要闻.lnk'
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($lnk)
$s.TargetPath = $exe
$s.WorkingDirectory = $root
$s.IconLocation = "$exe,0"
$s.Description = '全球要闻 World Brief - 全球大事采集与分类'
$s.Save()
Write-Host "lnk  -> $lnk"
