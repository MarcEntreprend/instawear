# scripts/test-edge-live.ps1
# VRAI test : appelle l'edge DEPLOYEE et affiche le statut HTTP réel.
# - 503 + "missing"  => le garde env.ts fonctionne (secret absent côté Supabase)
# - autre statut      => edge configurée (ou pas encore redéployée avec le check)
# Usage : .\scripts\test-edge-live.ps1 [-Edge stripe-webhook]
param([string]$Edge = "stripe-webhook")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envMap = @{}
Get-Content -LiteralPath (Join-Path $root ".env") | ForEach-Object {
  $l = $_.Trim()
  if (-not $l -or $l.StartsWith("#")) { return }
  $i = $l.IndexOf("=")
  if ($i -gt 0) { $envMap[$l.Substring(0, $i).Trim()] = $l.Substring($i + 1).Trim().Trim('"', "'") }
}
$url = $envMap["VITE_SUPABASE_URL"]
$anon = $envMap["VITE_SUPABASE_ANON_KEY"]
if (-not $url -or -not $anon) { Write-Output "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY introuvables dans .env"; exit 2 }

try {
  # PS 5.1 : pas de -SkipHttpErrorCheck -> on lit la réponse d'erreur.
  try {
    $r = Invoke-WebRequest -Uri "$url/functions/v1/$Edge" -Method Post `
      -Headers @{ apikey = $anon; "Content-Type" = "application/json" } `
      -Body '{}' -UseBasicParsing
    $code = [int]$r.StatusCode
    $body = $r.Content | Out-String
  } catch {
    $resp = $_.Exception.Response
    $code = [int]$resp.StatusCode
    $sr = New-Object IO.StreamReader($resp.GetResponseStream())
    $body = $sr.ReadToEnd()
    $sr.Close()
  }
  Write-Output ("HTTP " + $code + "  <- " + $Edge)
  Write-Output $body
  if ($code -eq 503 -and $body -match "manquant") {
    Write-Output "VERDICT : garde env actif, secret(s) absent(s) côté Supabase (voir missing)."
  } elseif ($code -eq 503) {
    Write-Output "VERDICT : 503 inattendu, lire le body."
  } else {
    Write-Output "VERDICT : edge configurée (pas de 503). Pour voir le 503 : supabase secrets unset <NOM> -> relancer -> 503 -> supabase secrets set <NOM>=... ."
  }
} catch {
  Write-Output ("ERREUR RESEAU : " + $_.Exception.Message)
  exit 2
}
