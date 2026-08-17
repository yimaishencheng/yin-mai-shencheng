$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$StageRoot = Join-Path $ProjectRoot "submission"
$StageDir = Join-Path $StageRoot "anonymous"
$ZipPath = Join-Path $StageRoot "yin-mai-shencheng-anonymous.zip"

$ResolvedProject = [System.IO.Path]::GetFullPath($ProjectRoot)
$ResolvedStageDir = [System.IO.Path]::GetFullPath($StageDir)
$ResolvedStageRoot = [System.IO.Path]::GetFullPath($StageRoot)

if (-not $ResolvedStageDir.StartsWith($ResolvedProject, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Stage directory is outside the project root."
}

if (Test-Path -LiteralPath $ResolvedStageRoot) {
    Remove-Item -LiteralPath $ResolvedStageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $ResolvedStageDir -Force | Out-Null

$ExcludedTopLevel = @(
    ".git",
    "node_modules",
    ".npm-cache",
    "data",
    "submission",
    ".env",
    ".env.oss",
    ".env.oss.example"
)

$Entries = Get-ChildItem -LiteralPath $ProjectRoot -Force | Where-Object {
    $_.Name -notin $ExcludedTopLevel -and
    $_.Name -notlike "*.log" -and
    $_.Name -notlike "*.png"
}

foreach ($Entry in $Entries) {
    Copy-Item -LiteralPath $Entry.FullName -Destination $ResolvedStageDir -Recurse -Force
}

Get-ChildItem -LiteralPath $ResolvedStageDir -Recurse -Force -Directory -Filter "__pycache__" | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
}
Get-ChildItem -LiteralPath $ResolvedStageDir -Recurse -Force -File | Where-Object {
    $_.Extension -eq ".pyc" -or $_.Name -eq "tsconfig.tsbuildinfo"
} | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
}

$ExcludedSubmissionFiles = @(
    "scripts\verify_submission.py",
    "scripts\prepare_submission.ps1"
)
foreach ($Relative in $ExcludedSubmissionFiles) {
    $Target = Join-Path $ResolvedStageDir $Relative
    if (Test-Path -LiteralPath $Target) {
        Remove-Item -LiteralPath $Target -Force
    }
}

$TextExtensions = @(".py", ".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".bat", ".txt", ".example")
$Replacements = [ordered]@{
    "ruxain" = "anonymous-contestant"
    "maorunhao" = "anonymous-project"
    "maorunhao.xyz" = "example.invalid"
    "maorunhao-xyz" = "anonymous-bucket"
    "239177669" = "000000000"
    "C:\Users\Lenovo" = "<project-root>"
    "C:/Users/Lenovo" = "<project-root>"
}

Get-ChildItem -LiteralPath $ResolvedStageDir -Recurse -File | Where-Object {
    $_.Extension.ToLowerInvariant() -in $TextExtensions -or $_.Name -in $TextExtensions
} | ForEach-Object {
    $Relative = $_.FullName.Substring($ResolvedStageDir.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar)
    $TopFolder = $Relative.Split([System.IO.Path]::DirectorySeparatorChar)[0]
    if ($TopFolder -eq "dist" -or $TopFolder -eq "public" -or $Relative.StartsWith("src\data\")) { return }
    $Content = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $Content) { return }
    foreach ($Key in $Replacements.Keys) {
        $Content = $Content.Replace($Key, $Replacements[$Key])
    }
    Set-Content -LiteralPath $_.FullName -Value $Content -NoNewline -Encoding UTF8
}

if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $ResolvedStageDir "*") -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Host "匿名提交包已生成：$ZipPath"
