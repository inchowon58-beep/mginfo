# Apply www-canonical host policy to apex (non-subdomain) clone sites.
# Subdomain sites are skipped. cafedaum is included (idempotent).

$ErrorActionPreference = "Continue"
$scope = "ccws-projects-122dea8c"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$apexProjects = @(
  @{ domain = "natehub.co.kr"; project = "natehub-co-kr" },
  @{ domain = "cafedaum.co.kr"; project = "cafedaum-co-kr" },
  @{ domain = "daumzine.co.kr"; project = "daumzine-co-kr" },
  @{ domain = "googlean.co.kr"; project = "googlean-co-kr" },
  @{ domain = "naverzine.co.kr"; project = "naverzine-co-kr" },
  @{ domain = "siteblog.co.kr"; project = "siteblog-co-kr" },
  @{ domain = "blogsite.co.kr"; project = "blogsite-co-kr" }
)

$results = @()
$logPath = Join-Path $root "scripts\fix-apex-www-canonical.out.json"

function Invoke-VercelApi([string]$path, [string]$method = "GET", [string[]]$fields = @()) {
  $args = @("vercel", "api", $path, "--scope", $scope)
  if ($method -ne "GET") { $args += @("-X", $method) }
  foreach ($f in $fields) { $args += @("-F", $f) }
  $raw = & npx @args 2>&1 | Out-String
  # Strip PowerShell error-stream noise; keep JSON object/array
  $start = $raw.IndexOf("{")
  if ($start -lt 0) { $start = $raw.IndexOf("[") }
  if ($start -lt 0) { throw "No JSON in response for $path : $raw" }
  $json = $raw.Substring($start).Trim()
  # Sometimes trailing CLI text follows; cut at last } or ]
  $endObj = $json.LastIndexOf("}")
  $endArr = $json.LastIndexOf("]")
  $end = [Math]::Max($endObj, $endArr)
  if ($end -ge 0) { $json = $json.Substring(0, $end + 1) }
  return $json | ConvertFrom-Json
}

foreach ($row in $apexProjects) {
  $domain = $row.domain
  $www = "www.$domain"
  $project = $row.project
  $item = [ordered]@{ domain = $domain; project = $project; ok = $false; steps = @() }
  Write-Host "==== $domain ($project) ===="
  try {
    # 1) ensure www domain exists (primary, no redirect)
    try {
      $null = Invoke-VercelApi "/v10/projects/$project/domains" "POST" @("name=$www")
      $item.steps += "www-added"
      Write-Host "  www added"
    } catch {
      $item.steps += "www-exists-or-skip:$($_.Exception.Message)"
      Write-Host "  www add: $($_.Exception.Message)"
    }

    # 2) apex → www 301
    try {
      $null = Invoke-VercelApi "/v9/projects/$project/domains/$domain" "PATCH" @("redirect=$www", "redirectStatusCode=301")
      $item.steps += "apex-redirect-301"
      Write-Host "  apex → www 301"
    } catch {
      $item.steps += "apex-redirect-fail:$($_.Exception.Message)"
      Write-Host "  apex redirect fail: $($_.Exception.Message)"
    }

    # 3) SITE_DOMAIN = www.*
    $envList = Invoke-VercelApi "/v9/projects/$project/env"
    $envs = @()
    if ($envList.envs) { $envs = @($envList.envs) } elseif ($envList -is [System.Array]) { $envs = @($envList) }
    $siteEnv = $envs | Where-Object { $_.key -eq "SITE_DOMAIN" } | Select-Object -First 1
    if ($siteEnv -and $siteEnv.id) {
      if ($siteEnv.value -ne $www) {
        $null = Invoke-VercelApi "/v9/projects/$project/env/$($siteEnv.id)" "PATCH" @("value=$www")
        $item.steps += "SITE_DOMAIN=$www"
        Write-Host "  SITE_DOMAIN -> $www"
      } else {
        $item.steps += "SITE_DOMAIN-already"
        Write-Host "  SITE_DOMAIN already $www"
      }
    } else {
      $item.steps += "SITE_DOMAIN-missing"
      Write-Host "  SITE_DOMAIN env missing"
    }

    # 4) redeploy latest Ready (or newest) production deployment to pick up env
    $ls = & npx vercel ls $project --scope $scope 2>&1 | Out-String
    $readyUrl = $null
    foreach ($line in ($ls -split "`n")) {
      if ($line -match "https://\S+\.vercel\.app" -and $line -match "Ready") {
        $readyUrl = [regex]::Match($line, "https://\S+\.vercel\.app").Value
        break
      }
    }
    if (-not $readyUrl -and $ls -match "https://\S+\.vercel\.app") {
      $readyUrl = [regex]::Match($ls, "https://\S+\.vercel\.app").Value
    }
    if ($readyUrl) {
      Write-Host "  redeploy $readyUrl"
      $redeployOut = & npx vercel redeploy $readyUrl --target production --scope $scope 2>&1 | Out-String
      if ($redeployOut -match "Error:") {
        $item.steps += "redeploy-error"
        Write-Host "  redeploy error (domain redirect still applied)"
      } else {
        $item.steps += "redeployed"
        Write-Host "  redeployed"
      }
    } else {
      $item.steps += "no-deployment"
    }

    $item.ok = $true
  } catch {
    $item.error = $_.Exception.Message
    Write-Host "  FAIL: $($_.Exception.Message)"
  }
  $results += [pscustomobject]$item
}

# 5) ops ledger siteUrl → https://www.*
Write-Host "==== ops siteUrl ===="
try {
  $node = @"
(async () => {
  const hub = 'https://magazine.infocs.co.kr';
  const headers = { 'x-infocs-master': 'ybijour80', 'Content-Type': 'application/json' };
  const apex = new Set(['natehub.co.kr','cafedaum.co.kr','daumzine.co.kr','googlean.co.kr','naverzine.co.kr','siteblog.co.kr','blogsite.co.kr']);
  const res = await fetch(hub + '/api/ops/sites', { headers });
  const data = await res.json();
  let n = 0;
  const sites = (data.sites || []).map((s) => {
    const d = String(s.domain || '').toLowerCase().replace(/^www\./,'');
    if (!apex.has(d)) return s;
    const www = 'www.' + d;
    n++;
    return { ...s, siteUrl: 'https://' + www, adminUrl: 'https://' + www + '/admin', updatedAt: new Date().toISOString() };
  });
  const put = await fetch(hub + '/api/ops/sites', { method: 'PUT', headers, body: JSON.stringify({ sites }) });
  const out = await put.json();
  if (!put.ok) throw new Error(JSON.stringify(out));
  console.log('updated', n);
})().catch((e) => { console.error(e); process.exit(1); });
"@
  node -e $node
  $results += [pscustomobject]@{ domain = "_ops"; ok = $true; steps = @("siteUrl-www") }
} catch {
  Write-Host "ops update fail: $($_.Exception.Message)"
}

$results | ConvertTo-Json -Depth 5 | Set-Content $logPath -Encoding UTF8
Write-Host "done -> $logPath"
$results | Format-Table -AutoSize
