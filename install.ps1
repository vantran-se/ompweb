$ErrorActionPreference = 'Stop'
# Bootstrap trust boundary: this script is trusted through the user-selected HTTPS
# GitHub Release URL. The downloaded Node installer is executed only after its hash
# matches SHA256SUMS independently downloaded from that same release.
$base = if ($env:OMPWEB_RELEASE_BASE_URL) { $env:OMPWEB_RELEASE_BASE_URL.TrimEnd('/') } else { 'https://github.com/vantran-se/ompweb/releases/latest/download' }
$uri = [Uri]$base
if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'github.com' -or -not $uri.AbsolutePath.StartsWith('/vantran-se/ompweb/releases/')) {
  if (-not (($uri.Host -eq '127.0.0.1' -or $uri.Host -eq 'localhost') -and $env:OMPWEB_ALLOW_INSECURE_LOCALHOST -eq '1')) { throw 'Refusing untrusted release URL' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22.19 or newer is required' }
$temp = Join-Path ([IO.Path]::GetTempPath()) ("ompweb-install-{0}" -f [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($temp) | Out-Null
try {
  $checksums = Join-Path $temp 'SHA256SUMS'
  $installer = Join-Path $temp 'install-release.mjs'
  $client = [Net.Http.HttpClient]::new()
  $client.Timeout = [TimeSpan]::FromSeconds(60)
  foreach ($item in @(@("$base/SHA256SUMS", $checksums), @("$base/install-release.mjs", $installer))) {
    $response = $client.GetAsync($item[0], [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $response.EnsureSuccessStatusCode()
    if ($response.Content.Headers.ContentLength -and $response.Content.Headers.ContentLength -gt 1MB) { throw 'Bootstrap download exceeds size limit' }
    $inputStream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $outputStream = [IO.File]::Open($item[1], [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
      $buffer = New-Object byte[] 65536; $total = 0
      while (($count = $inputStream.Read($buffer, 0, $buffer.Length)) -gt 0) { $total += $count; if ($total -gt 1MB) { throw 'Bootstrap download exceeds size limit' }; $outputStream.Write($buffer, 0, $count) }
    } finally { $outputStream.Dispose(); $inputStream.Dispose() }
  }
  $matches = @(Get-Content $checksums | Where-Object { $_ -match '^([0-9a-fA-F]{64})  install-release\.mjs$' })
  if ($matches.Count -ne 1) { throw 'Missing or duplicate installer checksum' }
  $expected = ([regex]::Match($matches[0], '^([0-9a-fA-F]{64})')).Groups[1].Value
  $actual = (Get-FileHash -Algorithm SHA256 $installer).Hash
  if ($actual -ne $expected) { throw 'Installer checksum mismatch' }
  & node $installer @args
  if ($LASTEXITCODE -ne 0) { throw "ompweb installer exited with code $LASTEXITCODE" }
} finally { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
