#!/usr/bin/env node
// Import de billets venus de l'extérieur — demande #66.
//
// Ce script ne lit AUCUN format de fichier. Chaque source se lit avec Cyril, la
// première fois qu'elle arrive (spec #66, « Le parcours ») : on écrit alors, pour
// cette source, une petite conversion qui produit le FICHIER NORMALISÉ ci-dessous.
// Tout le reste — regrouper par clé, comparer, classer, appliquer les corrections
// sûres, reprendre les refus des imports précédents — vit en base, dans
// importer_billets_apercu() et importer_billets(), et a été éprouvé sur banc.
//
// Fichier normalisé : un tableau JSON, UN ÉLÉMENT PAR LIGNE DU FICHIER D'ORIGINE :
//   {
//     "Reference": "UEBK", "Millesime": "2026", "Version": "14",
//     "normale":  true | false | null,     // ce que CETTE ligne dit de la version normale
//     "variante": "N" | "A" | "D" | null,  // ce que CETTE ligne dit de la variante
//     "champs":   { "NomBillet": "...", "Pays": "...", "Ville": "..." },  // facultatif (billet à créer)
//     "origine":  { ... la ligne telle quelle ... }
//   }
// Un fichier qui liste le normal et le doré sur deux lignes donne deux éléments :
// la base les regroupe sous la même clé.
//
// Usage :
//   node scripts/import-billets.mjs apercu   <normalise.json> --source "Nom de la source"
//   node scripts/import-billets.mjs importer <normalise.json> --source "Nom de la source" --fichier "C:\chemin\du\fichier.csv" [--correspondance correspondance.json]
//
// TOUJOURS l'aperçu d'abord : il ne modifie rien et dit ce que l'import ferait.
// Le fichier d'origine et le fichier normalisé restent sur le poste de Cyril, hors
// de tout dépôt (convention, § « Fournir un fichier de données pour une demande »).
//
// La clé d'administration du Worker est lue dans ~/.claude/secrets : elle ne figure
// jamais dans ce dépôt public.

import https from 'node:https';
import tls from 'node:tls';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = 'https://supabase-admin-proxy.cyril-samson41.workers.dev';
const SECRETS = path.join(os.homedir(), '.claude', 'secrets');
// Sous le VPN du Canton, le certificat du Worker est ré-signé par le proxy.
const BUNDLE = path.join(SECRETS, 'ne-ca-bundle.pem');
const CA = fs.existsSync(BUNDLE) ? [...tls.rootCertificates, fs.readFileSync(BUNDLE, 'utf8')] : undefined;

function rpc(nom, params) {
    const corps = Buffer.from(JSON.stringify(params), 'utf8');
    const headers = {
        'X-Proxy-Key': fs.readFileSync(path.join(SECRETS, 'billets-proxy-api-key.txt'), 'utf8').trim(),
        // Cloudflare répond 403 « error code: 1010 » à un client sans User-Agent.
        'User-Agent': 'billets-import/1.0',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': corps.length
    };
    return new Promise((resolve, reject) => {
        const req = https.request(BASE + '/rest/v1/rpc/' + nom, { method: 'POST', headers, ca: CA }, (res) => {
            let s = '';
            res.setEncoding('utf8');
            res.on('data', (d) => (s += d));
            res.on('end', () => {
                if (res.statusCode >= 300) return reject(new Error(nom + ' → HTTP ' + res.statusCode + ' ' + s.slice(0, 500)));
                resolve(s ? JSON.parse(s) : null);
            });
        });
        req.on('error', reject);
        req.end(corps);
    });
}

function option(nom) {
    const i = process.argv.indexOf('--' + nom);
    return i > 0 ? process.argv[i + 1] : undefined;
}

function compter(lignes, cle) {
    const c = {};
    for (const l of lignes) c[l[cle]] = (c[l[cle]] || 0) + 1;
    return c;
}

async function main() {
    const [commande, fichier] = process.argv.slice(2);
    const source = option('source');
    if (!['apercu', 'importer'].includes(commande) || !fichier || !source) {
        console.error('Usage : node scripts/import-billets.mjs apercu|importer <normalise.json> --source "…" [--fichier "…"] [--correspondance fichier.json]');
        process.exit(2);
    }
    const lignes = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    if (!Array.isArray(lignes)) throw new Error('Le fichier normalisé doit être un tableau JSON.');

    if (commande === 'apercu') {
        const res = await rpc('importer_billets_apercu', { p_source: source, p_lignes: lignes });
        console.log(lignes.length + ' lignes de fichier → ' + res.length + ' clés');
        console.log('par écart  :', compter(res, 'ecart'));
        console.log('par statut :', compter(res, 'statut'));
        console.log('corrigés d\'office si on importe : ' + res.filter((r) => r.appliquer).length);
        for (const ecart of ['a_completer', 'contradiction', 'absent_base', 'ambigu']) {
            const ex = res.filter((r) => r.ecart === ecart).slice(0, 3);
            if (ex.length) console.log('\n' + ecart + ' — exemples :\n' + ex.map((r) => '  ' + r.cle_texte + ' [' + r.statut + '] ' + r.motif).join('\n'));
        }
        return;
    }

    const corr = option('correspondance');
    const res = await rpc('importer_billets', {
        p_source: source,
        p_fichier: option('fichier') || null,
        p_correspondance: corr ? JSON.parse(fs.readFileSync(corr, 'utf8')) : {},
        p_lignes: lignes
    });
    console.log(JSON.stringify(res, null, 2));
    console.log('\nÀ décider par les admins : écran « Qualité des billets », onglet « Vérification des billets ».');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
