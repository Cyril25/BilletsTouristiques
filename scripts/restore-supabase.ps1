<#
    restore-supabase.ps1 - restaure un dump de prod dans un AUTRE projet Supabase
    =============================================================================
    OPERATION DESTRUCTIVE sur la base cible : les schemas public et private y sont
    supprimes puis recrees a partir du dump.

    Garde-fous :
      - refus categorique si l'URL cible contient la reference du projet de PROD
      - affichage de la cible et confirmation manuelle par saisie de la reference
      - psql 17 (via Docker) pour correspondre a pg_dump 17.6 qui a produit le dump

    Prerequis :
      - Docker Desktop demarre
      - Chaine de connexion de la CIBLE (Session pooler) dans :
          %USERPROFILE%\.claude\secrets\billets-supabase-staging-db-url.txt
        Format : postgresql://postgres.<ref>:<mdp>@aws-<n>-<region>.pooler.supabase.com:5432/postgres

    Usage :
      .\scripts\restore-supabase.ps1                      # dernier dump en date
      .\scripts\restore-supabase.ps1 -Source "C:\...\2026-07-22_1718"
      .\scripts\restore-supabase.ps1 -SchemaOnly          # sans les donnees
#>

param(
    [string]$Source,
    [string]$TargetUrlFile = "$env:USERPROFILE\.claude\secrets\billets-supabase-staging-db-url.txt",
    [string]$BackupRoot    = "$env:USERPROFILE\Documents\Perso\Backups\BilletsTouristiques",
    [switch]$SchemaOnly
)

$ErrorActionPreference = 'Stop'

# Reference du projet de PRODUCTION - la cible ne doit JAMAIS correspondre.
$PROD_REF = 'lhwcoybugdsggcclhtgb'

# --- Localisation du dump -----------------------------------------------------

if (-not $Source) {
    $latest = Get-ChildItem $BackupRoot -Directory -ErrorAction SilentlyContinue |
              Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { Write-Host "Aucun dump trouve dans $BackupRoot" -ForegroundColor Red; exit 1 }
    $Source = $latest.FullName
}

foreach ($f in 'schema.sql', 'data.sql') {
    if (-not (Test-Path (Join-Path $Source $f))) {
        Write-Host "Fichier manquant dans le dump : $f" -ForegroundColor Red; exit 1
    }
}

# --- Chaine de connexion cible ------------------------------------------------

if (-not (Test-Path $TargetUrlFile)) {
    Write-Host "Chaine de connexion cible introuvable : $TargetUrlFile" -ForegroundColor Red
    Write-Host "Dashboard du projet staging > Connect > onglet Session pooler, puis :"
    Write-Host "  code `"$TargetUrlFile`""
    exit 1
}

$targetUrl = (Get-Content $TargetUrlFile -Raw).Trim()

if (-not $targetUrl.StartsWith('postgresql://')) {
    Write-Host "Chaine cible malformee (prefixe postgresql:// attendu)" -ForegroundColor Red; exit 1
}

# GARDE-FOU : jamais sur la prod
if ($targetUrl -match $PROD_REF) {
    Write-Host ""
    Write-Host "  ARRET : la chaine cible designe le projet de PRODUCTION ($PROD_REF)." -ForegroundColor Red
    Write-Host "  Ce script effacerait la base de prod. Rien n'a ete execute." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Reference du projet cible, extraite de l'utilisateur postgres.<ref>
$targetRef = $null
if ($targetUrl -match '://postgres\.([a-z0-9]+):') { $targetRef = $Matches[1] }
if (-not $targetRef) {
    Write-Host "Impossible d'extraire la reference du projet cible." -ForegroundColor Red
    Write-Host "L'utilisateur doit etre de la forme postgres.<ref> (chaine Session pooler)." -ForegroundColor Yellow
    exit 1
}

$targetHost = 'inconnu'
if ($targetUrl -match '@([^:/]+):') { $targetHost = $Matches[1] }

# --- Confirmation -------------------------------------------------------------

$dataFile  = Join-Path $Source 'data.sql'
$dataSize  = [math]::Round((Get-Item $dataFile).Length / 1MB, 1)

Write-Host ""
Write-Host "  RESTAURATION SUPABASE" -ForegroundColor Cyan
Write-Host "  ---------------------"
Write-Host "  Dump source   : $Source"
Write-Host "  Donnees       : $(if ($SchemaOnly) { 'IGNOREES (-SchemaOnly)' } else { "data.sql, $dataSize Mo" })"
Write-Host "  Projet cible  : $targetRef" -ForegroundColor Yellow
Write-Host "  Hote cible    : $targetHost"
Write-Host ""
Write-Host "  Les schemas public et private de la cible seront SUPPRIMES puis recrees." -ForegroundColor Red
Write-Host ""

$reponse = Read-Host "  Pour confirmer, saisir la reference du projet cible ($targetRef)"
if ($reponse -ne $targetRef) {
    Write-Host "  Reference incorrecte - abandon, rien n'a ete execute." -ForegroundColor Yellow
    exit 1
}

# --- Verification Docker ------------------------------------------------------

$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& docker info *> $null
$dockerOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prev
if (-not $dockerOk) { Write-Host "Docker ne repond pas - demarrer Docker Desktop." -ForegroundColor Red; exit 1 }

$PSQL_IMAGE = 'postgres:17'

# Telechargement de l'image en amont. Sans cela, docker ecrit "Unable to find image
# locally" sur stderr au premier appel : en PowerShell 5.1 cette sortie devient un
# ErrorRecord (NativeCommandError) qui, avec ErrorActionPreference=Stop, avorte le script.
# On teste la presence via `docker images -q` (chaine vide si absente, jamais de stderr),
# et on enveloppe malgre tout en Continue par securite.
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$imgId = (& docker images -q $PSQL_IMAGE 2>$null | Out-String).Trim()
if (-not $imgId) {
    Write-Host ""
    Write-Host "  Telechargement de l'image $PSQL_IMAGE (une seule fois)..." -ForegroundColor Cyan
    & docker pull $PSQL_IMAGE 2>&1 | Out-String | Out-Null
    $pullCode = $LASTEXITCODE
    if ($pullCode -ne 0) {
        $ErrorActionPreference = $prev
        Write-Host "  Echec du telechargement de l'image." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Image prete." -ForegroundColor Green
}
$ErrorActionPreference = $prev

# --- Parse de l'URL cible en composants PG* ----------------------------------
# On passe PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE en variables d'environnement
# plutot qu'une URL dans un `sh -c "..."`. Raison : PowerShell 5.1 corrompt les
# guillemets doubles imbriques transmis a un exe natif (docker), ce qui tronquait la
# commande SQL ("syntax error at end of input / LINE 1: DROP"). Sans shell ni
# guillemets imbriques, chaque argument est transmis proprement.
if ($targetUrl -notmatch '^postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/(.+)$') {
    Write-Host "URL cible non analysable en composants PG*." -ForegroundColor Red; exit 1
}
$pgUser = $Matches[1]
$pgPass = $Matches[2]
$pgHost = $Matches[3]
$pgPort = $Matches[4]
$pgDb   = ($Matches[5] -split '\?')[0]

# --- Repertoire de travail : SQL genere (reset + verification) ---------------
# Ecrit en ASCII (sans BOM) : psql -f ne strippe pas un BOM UTF-8 et planterait
# sur la premiere ligne.
$workDir = Join-Path $env:TEMP ("bt-restore-" + (Get-Date -Format 'yyyyMMddHHmmss'))
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

@'
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS private CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO pg_database_owner;
COMMENT ON SCHEMA public IS 'standard public schema';
'@ | Set-Content -Path (Join-Path $workDir 'reset.sql') -Encoding ascii

@'
ANALYZE;
SELECT relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 12;
'@ | Set-Content -Path (Join-Path $workDir 'verify.sql') -Encoding ascii

function Invoke-Psql {
    param(
        [string]$Label,
        [string]$SqlFile,           # chemin DANS le conteneur (/dump/... ou /work/...)
        [switch]$Tolerant,          # n'arrete pas le script en cas d'erreur
        [switch]$SingleTransaction  # enveloppe le fichier dans une seule transaction
    )

    Write-Host "  -> $Label..." -NoNewline

    # Chemins hote en slashes avant : moins ambigus pour l'analyseur -v sous Windows
    $mountDump = ($Source  -replace '\\', '/') + ':/dump:ro'
    $mountWork = ($workDir -replace '\\', '/') + ':/work:ro'

    $psqlArgs = @('psql', '-q')
    if (-not $Tolerant) { $psqlArgs += @('-v', 'ON_ERROR_STOP=1') }
    if ($SingleTransaction) { $psqlArgs += '--single-transaction' }
    $psqlArgs += @('-f', $SqlFile)

    $dockerArgs = @(
        'run', '--rm', '-i',
        '-e', "PGHOST=$pgHost",
        '-e', "PGPORT=$pgPort",
        '-e', "PGUSER=$pgUser",
        '-e', "PGPASSWORD=$pgPass",
        '-e', "PGDATABASE=$pgDb",
        '-e', 'PGSSLMODE=require',
        '-v', $mountDump,
        '-v', $mountWork,
        $PSQL_IMAGE
    ) + $psqlArgs

    # PowerShell 5.1 : sous ErrorActionPreference=Stop, toute ligne de stderr d'un exe
    # natif capturee par 2>&1 devient une erreur terminante. On repasse en Continue et
    # on juge sur le code de sortie seul.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & docker @dockerArgs 2>&1 | Out-String
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev

    # Ne jamais laisser l'URL ni le mot de passe apparaitre dans la sortie
    $output = $output.Replace($targetUrl, '[URL-MASQUEE]').Replace($pgPass, '[MDP-MASQUE]')

    if ($code -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        if ($output.Trim()) { $output.Trim() -split "`n" | ForEach-Object { "       $_" } }
    } else {
        Write-Host " ECHEC" -ForegroundColor Red
        $output.Trim() -split "`n" | ForEach-Object { "       $_" }
        if (-not $Tolerant) { exit 1 }
    }
}

function Export-PublicData {
    # Reecrit data.sql en ne gardant que les blocs COPY des schemas public/private.
    # Les tables systeme (storage.*, auth.*, ...) sont dumpees vides par la CLI mais
    # l'utilisateur du pooler n'a pas le droit d'y ecrire : "permission denied".
    # Ecriture UTF-8 SANS BOM (psql -f ne strippe pas un BOM).
    param([string]$InFile, [string]$OutFile)

    $keepSchemas = @('public', 'private')
    $reader = New-Object System.IO.StreamReader($InFile)
    $writer = New-Object System.IO.StreamWriter($OutFile, $false, (New-Object System.Text.UTF8Encoding($false)))
    $inCopy = $false; $skip = $false; $kept = 0; $skipped = 0

    while ($null -ne ($line = $reader.ReadLine())) {
        if (-not $inCopy) {
            if ($line -match '^COPY\s+"?([^".\s]+)"?\.') {
                $schema = $Matches[1]
                $inCopy = $true
                $skip = ($keepSchemas -notcontains $schema)
                if ($skip) { $skipped++ } else { $kept++; $writer.WriteLine($line) }
            } else {
                $writer.WriteLine($line)
            }
        } else {
            if ($line -eq '\.') {
                if (-not $skip) { $writer.WriteLine($line) }
                $inCopy = $false; $skip = $false
            } elseif (-not $skip) {
                $writer.WriteLine($line)
            }
        }
    }
    $reader.Close(); $writer.Close()
    return @{ Kept = $kept; Skipped = $skipped }
}

# --- 1. Reinitialisation des schemas -----------------------------------------

Write-Host ""
Invoke-Psql -Label 'reinitialisation des schemas' -SqlFile '/work/reset.sql'

# --- 2. Roles (tolerant : ALTER ROLE peut etre refuse sur un projet gere) -----

if (Test-Path (Join-Path $Source 'roles.sql')) {
    Invoke-Psql -Label 'roles.sql' -SqlFile '/dump/roles.sql' -Tolerant
}

# --- 3. Schema ----------------------------------------------------------------

Invoke-Psql -Label 'schema.sql' -SqlFile '/dump/schema.sql' -SingleTransaction

# --- 4. Donnees ---------------------------------------------------------------

if (-not $SchemaOnly) {
    Write-Host "  -> filtrage des donnees (public/private uniquement)..." -NoNewline
    $srcData = Join-Path $Source  'data.sql'
    $pubData = Join-Path $workDir 'data-public.sql'
    $stats = Export-PublicData -InFile $srcData -OutFile $pubData
    Write-Host " OK ($($stats.Kept) tables gardees, $($stats.Skipped) systeme ignorees)" -ForegroundColor Green

    $pubSize = [math]::Round((Get-Item $pubData).Length / 1MB, 1)
    Invoke-Psql -Label "data-public.sql ($pubSize Mo)" -SqlFile '/work/data-public.sql' -SingleTransaction
}

# --- 5. Controle post-restauration -------------------------------------------

Write-Host ""
Invoke-Psql -Label 'controle des tables restaurees' -SqlFile '/work/verify.sql'

Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  Restauration terminee sur le projet $targetRef." -ForegroundColor Green
Write-Host ""
Write-Host "  Il reste deux choses a faire cote projet staging :" -ForegroundColor Cyan
Write-Host "   1. Configurer l'authentification tierce Firebase (les policies utilisent auth.jwt())."
Write-Host "   2. Basculer SUPABASE_URL et SUPABASE_ANON_KEY dans global.js pour l'environnement de test."
