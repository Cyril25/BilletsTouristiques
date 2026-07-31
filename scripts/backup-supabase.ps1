<#
    backup-supabase.ps1 - copie complete de la base de prod
    =======================================================
    Produit 3 dumps horodates (roles / schema / donnees) via la CLI Supabase,
    lancee par npx (pas d'installation globale). La CLI execute pg_dump dans
    un conteneur Docker : Docker Desktop doit tourner.

    Prerequis :
      - Docker Desktop demarre
      - La chaine de connexion Postgres dans un fichier local, par defaut :
          %USERPROFILE%\.claude\secrets\billets-supabase-db-url.txt
        A recuperer dans le Dashboard Supabase > bouton "Connect" :
          postgresql://postgres.<ref>:<motdepasse>@<host>:5432/postgres
        Prendre la chaine "Session pooler" si la connexion directe ne passe pas.

    ATTENTION VPN : la connexion directe au port 5432 ne passe pas depuis le
    VPN Canton NE (meme raison que l'acces admin Supabase direct). Lancer ce
    script hors VPN.

    Les dumps contiennent des donnees personnelles (emails, adresses postales)
    des membres : les garder hors du depot git et hors cloud non chiffre.

    Usage :
      .\scripts\backup-supabase.ps1
      .\scripts\backup-supabase.ps1 -OutDir "D:\Backups\Billets"
#>

param(
    [string]$OutDir = "$env:USERPROFILE\Documents\Perso\Backups\BilletsTouristiques",
    [string]$DbUrlFile = "$env:USERPROFILE\.claude\secrets\billets-supabase-db-url.txt"
)

$ErrorActionPreference = 'Stop'

# --- Verifications prealables -------------------------------------------------

if (-not (Test-Path $DbUrlFile)) {
    Write-Host "Fichier de connexion introuvable : $DbUrlFile" -ForegroundColor Red
    Write-Host "Recuperer la chaine dans Dashboard Supabase > Connect, puis :"
    Write-Host "  Set-Content -Path '$DbUrlFile' -Value 'postgresql://...' -Encoding utf8"
    exit 1
}

$dbUrl = (Get-Content $DbUrlFile -Raw).Trim()
if (-not $dbUrl.StartsWith('postgresql://')) {
    Write-Host "La chaine de connexion doit commencer par postgresql://" -ForegroundColor Red
    exit 1
}

docker info *> $null
if (-not $?) {
    Write-Host "Docker ne repond pas - demarrer Docker Desktop puis relancer." -ForegroundColor Red
    exit 1
}

# --- Dossier de sortie horodate ----------------------------------------------

$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$target = Join-Path $OutDir $stamp
New-Item -ItemType Directory -Force -Path $target | Out-Null

Write-Host "Sauvegarde vers $target" -ForegroundColor Cyan

# --- Les 3 dumps --------------------------------------------------------------
# Ordre de restauration = ordre de production : roles, puis schema, puis donnees.

$dumps = @(
    @{ Nom = 'roles';  Fichier = 'roles.sql';  Args = @('--role-only') },
    @{ Nom = 'schema'; Fichier = 'schema.sql'; Args = @() },
    @{ Nom = 'donnees'; Fichier = 'data.sql';  Args = @('--data-only', '--use-copy') }
)

foreach ($d in $dumps) {
    $out = Join-Path $target $d.Fichier
    Write-Host "  -> dump $($d.Nom)..." -NoNewline

    $cmdArgs = @('--yes', 'supabase', 'db', 'dump', '--db-url', $dbUrl, '-f', $out) + $d.Args
    & npx @cmdArgs

    if (-not $?) {
        Write-Host " ECHEC" -ForegroundColor Red
        Write-Host "Timeout de connexion  : verifier que le VPN est coupe." -ForegroundColor Yellow
        Write-Host "Nom d'hote non resolu : ajouter --dns-resolver https a la commande npx," -ForegroundColor Yellow
        Write-Host "                        ou basculer sur la chaine 'Session pooler' du Dashboard." -ForegroundColor Yellow
        exit 1
    }

    $ko = [math]::Round((Get-Item $out).Length / 1KB)
    Write-Host " OK ($ko Ko)" -ForegroundColor Green
}

# --- Recapitulatif ------------------------------------------------------------

Write-Host ""
Write-Host "Sauvegarde terminee : $target" -ForegroundColor Green
Get-ChildItem $target | Select-Object Name, @{N='Taille';E={"{0:N0} Ko" -f ($_.Length/1KB)}} | Format-Table -AutoSize

Write-Host "Pour restaurer dans un autre projet Supabase, dans cet ordre :" -ForegroundColor Cyan
Write-Host "  roles.sql -> schema.sql -> data.sql  (SQL Editor du dashboard, ou psql -f)"
