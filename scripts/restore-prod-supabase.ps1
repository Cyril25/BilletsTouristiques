<#
    restore-prod-supabase.ps1 - ROLLBACK : restaure un dump SUR LA PRODUCTION
    ==========================================================================
    C'est l'outil du plan B du runbook E (bascule #16). Il fait l'inverse de
    restore-supabase.ps1 : celui-la refuse categoriquement la prod, celui-ci
    n'accepte QUE la prod. La separation est volontaire - le script de staging
    ne doit jamais pouvoir ecrire sur la prod, meme par erreur de parametre.

    OPERATION DESTRUCTIVE : les schemas public et private de la PRODUCTION sont
    supprimes puis recrees a partir du dump. Tout ce qui a ete ecrit en prod
    depuis l'horodatage du dump est definitivement perdu.

    Garde-fous :
      - refus si la cible n'est PAS la prod (protege d'un rollback sur staging)
      - age du dump affiche en clair, avec avertissement au-dela de 24 h
      - double confirmation : reference du projet, puis une phrase explicite
      - psql 17 (via Docker) pour correspondre au pg_dump qui a produit le dump

    MODE REPETITION (-Repetition) :
      Inverse le garde-fou et vise le projet jetable. C'est ainsi qu'on teste
      ce script AVANT le jour J : meme code, meme chemin d'execution, seule la
      cible change. Un rollback jamais repete n'est pas un plan B.

    Prerequis :
      - Docker Desktop demarre
      - VPN Canton NE coupe (le port 5432 ne passe pas depuis le VPN)
      - Chaine de connexion Session pooler de la cible :
          prod       : %USERPROFILE%\.claude\secrets\billets-supabase-db-url.txt
          repetition : %USERPROFILE%\.claude\secrets\billets-supabase-staging-db-url.txt

    Usage :
      .\scripts\restore-prod-supabase.ps1 -Repetition        # test sur le jetable
      .\scripts\restore-prod-supabase.ps1                    # ROLLBACK PROD, dernier dump
      .\scripts\restore-prod-supabase.ps1 -Source "C:\...\2026-07-30_0910"
#>

param(
    [string]$Source,
    [switch]$Repetition,
    [string]$TargetUrlFile,
    [string]$BackupRoot = "$env:USERPROFILE\Documents\Perso\Backups\BilletsTouristiques",
    [switch]$SchemaOnly
)

$ErrorActionPreference = 'Stop'

# Reference du projet de PRODUCTION - la seule cible acceptee hors -Repetition.
$PROD_REF = 'lhwcoybugdsggcclhtgb'

if (-not $TargetUrlFile) {
    if ($Repetition) {
        $TargetUrlFile = "$env:USERPROFILE\.claude\secrets\billets-supabase-staging-db-url.txt"
    } else {
        $TargetUrlFile = "$env:USERPROFILE\.claude\secrets\billets-supabase-db-url.txt"
    }
}

# --- Localisation du dump -----------------------------------------------------

if (-not $Source) {
    $latest = Get-ChildItem $BackupRoot -Directory -ErrorAction SilentlyContinue |
              Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { Write-Host "Aucun dump trouve dans $BackupRoot" -ForegroundColor Red; exit 1 }
    $Source = $latest.FullName
}

foreach ($f in 'schema.sql', 'data.sql') {
    if (-not (Test-Path (Join-Path $Source $f))) {
        Write-Host "Fichier manquant dans le dump : $f" -ForegroundColor Red
        Write-Host "Ce script attend un dump produit par backup-supabase.ps1" -ForegroundColor Yellow
        Write-Host "(roles.sql + schema.sql + data.sql), pas une archive pg_dump --format=custom." -ForegroundColor Yellow
        exit 1
    }
}

# Age du dump : c'est la fenetre de perte de donnees en cas de rollback.
$dumpDate = (Get-Item (Join-Path $Source 'data.sql')).LastWriteTime
$dumpAge  = (Get-Date) - $dumpDate

# --- Chaine de connexion cible ------------------------------------------------

if (-not (Test-Path $TargetUrlFile)) {
    Write-Host "Chaine de connexion cible introuvable : $TargetUrlFile" -ForegroundColor Red
    exit 1
}

# -Raw + Trim : Get-Content retire le BOM UTF-8 eventuel du fichier de secret.
$targetUrl = (Get-Content $TargetUrlFile -Raw).Trim()

if (-not $targetUrl.StartsWith('postgresql://')) {
    Write-Host "Chaine cible malformee (prefixe postgresql:// attendu)" -ForegroundColor Red; exit 1
}

# Reference du projet cible, extraite de l'utilisateur postgres.<ref>
$targetRef = $null
if ($targetUrl -match '://postgres\.([a-z0-9]+):') { $targetRef = $Matches[1] }
if (-not $targetRef) {
    Write-Host "Impossible d'extraire la reference du projet cible." -ForegroundColor Red
    Write-Host "L'utilisateur doit etre de la forme postgres.<ref> (chaine Session pooler)." -ForegroundColor Yellow
    exit 1
}

# GARDE-FOU, dans les deux sens
if ($Repetition) {
    if ($targetRef -eq $PROD_REF) {
        Write-Host ""
        Write-Host "  ARRET : -Repetition demande une cible de TEST, or la chaine designe la PROD." -ForegroundColor Red
        Write-Host "  Rien n'a ete execute." -ForegroundColor Red
        Write-Host ""
        exit 1
    }
} else {
    if ($targetRef -ne $PROD_REF) {
        Write-Host ""
        Write-Host "  ARRET : ce script restaure la PRODUCTION ($PROD_REF)." -ForegroundColor Red
        Write-Host "  La chaine fournie designe le projet '$targetRef'." -ForegroundColor Red
        Write-Host "  Pour restaurer un projet de test, utiliser restore-supabase.ps1," -ForegroundColor Yellow
        Write-Host "  ou relancer celui-ci avec -Repetition." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

$targetHost = 'inconnu'
if ($targetUrl -match '@([^:/]+):') { $targetHost = $Matches[1] }

# --- Confirmation -------------------------------------------------------------

$dataFile = Join-Path $Source 'data.sql'
$dataSize = [math]::Round((Get-Item $dataFile).Length / 1MB, 1)

Write-Host ""
if ($Repetition) {
    Write-Host "  REPETITION DE ROLLBACK (cible de test)" -ForegroundColor Cyan
} else {
    Write-Host "  ROLLBACK DE LA PRODUCTION" -ForegroundColor Red
}
Write-Host "  ----------------------------------------"
Write-Host "  Dump source   : $Source"
Write-Host "  Date du dump  : $($dumpDate.ToString('yyyy-MM-dd HH:mm')) (il y a $([math]::Round($dumpAge.TotalHours,1)) h)"
if ($SchemaOnly) {
    Write-Host "  Donnees       : IGNOREES (-SchemaOnly)"
} else {
    Write-Host "  Donnees       : data.sql, $dataSize Mo"
}
Write-Host "  Projet cible  : $targetRef" -ForegroundColor Yellow
Write-Host "  Hote cible    : $targetHost"
Write-Host ""

if ($dumpAge.TotalHours -gt 24) {
    Write-Host "  ATTENTION : ce dump a plus de 24 h." -ForegroundColor Red
    Write-Host "  Tout ce qui a ete ecrit depuis sera perdu. Verifier que c'est bien" -ForegroundColor Red
    Write-Host "  le dump pris juste avant la bascule, et pas un dump plus ancien." -ForegroundColor Red
    Write-Host ""
}

Write-Host "  Les schemas public et private de '$targetRef' seront SUPPRIMES puis recrees." -ForegroundColor Red
Write-Host ""

$reponse = Read-Host "  1/2 - Saisir la reference du projet cible ($targetRef)"
if ($reponse -ne $targetRef) {
    Write-Host "  Reference incorrecte - abandon, rien n'a ete execute." -ForegroundColor Yellow
    exit 1
}

if (-not $Repetition) {
    $PHRASE = 'RESTAURER LA PRODUCTION'
    $reponse2 = Read-Host "  2/2 - Taper exactement : $PHRASE"
    if ($reponse2 -ne $PHRASE) {
        Write-Host "  Phrase incorrecte - abandon, rien n'a ete execute." -ForegroundColor Yellow
        exit 1
    }
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
# Variables d'environnement plutot qu'une URL dans un `sh -c "..."` : PowerShell 5.1
# corrompt les guillemets doubles imbriques transmis a un exe natif (docker), ce qui
# tronquait la commande SQL. Sans shell ni guillemets imbriques, chaque argument passe.
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
$workDir = Join-Path $env:TEMP ("bt-restore-prod-" + (Get-Date -Format 'yyyyMMddHHmmss'))
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

@'
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS private CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO pg_database_owner;
COMMENT ON SCHEMA public IS 'standard public schema';
'@ | Set-Content -Path (Join-Path $workDir 'reset.sql') -Encoding ascii

# Controle final oriente rollback : on veut voir que les tables metier sont
# revenues, et surtout que collectes a bien disparu (= retour avant script 1).
@'
ANALYZE;
SELECT relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 12;
SELECT to_regclass('public.collectes') AS collectes_doit_etre_null;
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'billets' AND column_name IN ('Prix', 'Collecteur')
 ORDER BY column_name;
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

# --- Chronometre : c'est la donnee que la repetition doit produire ------------

$chrono = [System.Diagnostics.Stopwatch]::StartNew()

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

$chrono.Stop()
Remove-Item $workDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host ("  Restauration terminee sur '$targetRef' en {0} min {1} s." -f `
            [math]::Floor($chrono.Elapsed.TotalMinutes), $chrono.Elapsed.Seconds) -ForegroundColor Green
Write-Host ""

if ($Repetition) {
    Write-Host "  Noter cette duree : c'est le temps de rollback a annoncer le jour J." -ForegroundColor Cyan
} else {
    Write-Host "  La base est revenue a l'etat du $($dumpDate.ToString('yyyy-MM-dd HH:mm')). Il reste :" -ForegroundColor Cyan
    Write-Host "   1. Verifier ci-dessus que collectes_doit_etre_null vaut bien NULL"
    Write-Host "      et que les colonnes Prix / Collecteur sont revenues sur billets."
    Write-Host "   2. Redeployer main (l'ancien front) sur GitHub Pages, et bumper sw.js + menu.html."
    Write-Host "   3. Prevenir l'equipe : les ecritures posterieures au dump sont perdues."
}
