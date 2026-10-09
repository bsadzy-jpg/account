$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot

if (-not (Test-Path -LiteralPath (Join-Path $project '.git'))) {
    throw '当前目录还没有连接 GitHub 仓库。请先克隆有数仓库。'
}

Push-Location $project
try {
    $remote = & git -c "safe.directory=$project" remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $remote) { throw '尚未配置 origin 远程仓库。' }
    $changes = & git -c "safe.directory=$project" status --porcelain
    if ($changes) { throw '本地源码有未提交改动。请先保存或提交，避免覆盖后再更新。' }
    & git -c "safe.directory=$project" pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'GitHub 更新失败；本地文件未被强制覆盖。' }
    $apk = Get-ChildItem -LiteralPath $project -Filter '有数-*-debug.apk' -File |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($apk) { Write-Host "APK 文件：$($apk.FullName)" }
    Write-Host '源码已更新。安装 APK 前建议导出账本 JSON 备份。'
} finally {
    Pop-Location
}
