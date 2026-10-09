$ErrorActionPreference = 'Stop'

$toolchain = $env:YOUSHU_ANDROID_TOOLCHAIN
$localConfig = Join-Path $PSScriptRoot 'toolchain.local.ps1'
if (-not $toolchain -and (Test-Path -LiteralPath $localConfig)) {
    . $localConfig
}
if (-not $toolchain) {
    throw '请设置 YOUSHU_ANDROID_TOOLCHAIN，或在 android/toolchain.local.ps1 中设置 $toolchain。'
}
$javaHome = Join-Path $toolchain 'jdk21\jdk-21.0.12+8'
$androidSdk = Join-Path $toolchain 'android-sdk'
$gradleHome = Join-Path $toolchain 'gradle-home'
$gradle = Join-Path $toolchain 'gradle\gradle-8.14.3\bin\gradle.bat'
$builtApk = Join-Path $PSScriptRoot 'app\build\outputs\apk\debug\app-debug.apk'
$deliveryApk = Join-Path (Split-Path $PSScriptRoot -Parent) '有数-1.3.0-debug.apk'

foreach ($required in @($javaHome, $androidSdk, $gradle)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "缺少本地 Android 构建工具：$required"
    }
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:GRADLE_USER_HOME = $gradleHome

Push-Location $PSScriptRoot
try {
    & $gradle --offline --no-daemon assembleDebug lintDebug
    if ($LASTEXITCODE -ne 0) { throw "Android 构建失败，退出码：$LASTEXITCODE" }
    Copy-Item -LiteralPath $builtApk -Destination $deliveryApk -Force
} finally {
    Pop-Location
}

Write-Host "APK 已生成：$deliveryApk"
