# 参考视频抽帧（v0.21 调研）：用 Windows 自带 Media Foundation 解码 H.264，
# 经 WPF DrawingVisual + RenderTargetBitmap 落成 PNG。
# 用法：powershell -File tools/vidframe.ps1 -Video <mp4> -OutDir <dir> -Times 0,2,4
param(
  [string]$Video = "D:\User\MicGu\WorkBuddy\wxGames\20261122_205247.mp4",
  [string]$OutDir = "D:\User\MicGu\WorkBuddy\wxGames\tangram\docs\shots\v021_ref",
  [string]$Times = "0"
)
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$mp = New-Object System.Windows.Media.MediaPlayer
$mp.Volume = 0
$mp.ScrubbingEnabled = $true
$mp.Open([Uri]::new($Video))

# 等自然尺寸就绪（MediaOpened 是异步的，最多等 10s）
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($mp.NaturalVideoWidth -eq 0 -and $sw.ElapsedMilliseconds -lt 10000) {
  Start-Sleep -Milliseconds 120
}
$w = $mp.NaturalVideoWidth; $h = $mp.NaturalVideoHeight
if ($w -eq 0) { Write-Output "ERR 打不开视频（MediaOpened 未触发）"; exit 1 }
Write-Output "视频 $w x $h  时长 $([math]::Round($mp.NaturalDuration.TimeSpan.TotalSeconds,2))s"

foreach ($t in ($Times -split ',')) {
  $sec = [double]$t
  $mp.Position = [TimeSpan]::FromSeconds($sec)
  # 必须先 Play 让渲染管线跑起来，否则 DrawVideo 出黑帧
  Write-Output ("  定位后 pos=" + [math]::Round($mp.Position.TotalSeconds,2))
  $mp.Play()
  Start-Sleep -Milliseconds 700
  Write-Output ("  渲染时 pos=" + [math]::Round($mp.Position.TotalSeconds,2))

  $dv = New-Object System.Windows.Media.DrawingVisual
  $dc = $dv.RenderOpen()
  $dc.DrawVideo($mp, (New-Object System.Windows.Rect(0, 0, $w, $h)))
  $dc.Close()
  $mp.Pause()

  $rtb = New-Object System.Windows.Media.Imaging.RenderTargetBitmap($w, $h, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $rtb.Render($dv)

  $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($rtb))
  $name = "t_" + ($sec.ToString().Replace('.', '_')) + ".png"
  $fs = [System.IO.File]::Create((Join-Path $OutDir $name))
  $enc.Save($fs)
  $fs.Close()
  Write-Output ("  写出 " + $name + "  " + [math]::Round((Get-Item (Join-Path $OutDir $name)).Length / 1KB, 0) + "KB")
}
$mp.Close()
Write-Output "完成"
