#!/usr/bin/env node
// Rituel des demandes — l'accès à la base de la boucle /rituel-demandes.
//
// Ce script ne sait faire QUE ce que le rituel a le droit de faire (voir
// specs/evolutions/CONVENTION-DEMANDES.md, § « Le rituel en boucle ») : lire
// les demandes et leurs fils de commentaires, trier, attacher des specs,
// répondre à une remarque. Le reste est refusé ici même, pas seulement
// déconseillé : tout passage en dev, à tester, terminé ou abandonné, et
// l'entrée d'une L en Prêt à dev, qui n'appartient qu'à la validation d'un admin.
//
// La clé d'administration du Worker est lue sur le poste de Cyril
// (~/.claude/secrets) : elle ne figure jamais dans ce dépôt public.
//
// Usage :
//   node scripts/rituel-demandes.mjs etat
//   node scripts/rituel-demandes.mjs lire <id>
//   node scripts/rituel-demandes.mjs maj <id> <fichier.json>
//   node scripts/rituel-demandes.mjs commenter <id> <fichier.txt> [--section "…"] [--doc chemin]
//
// Les textes passent par des fichiers, jamais en ligne de commande : accents,
// guillemets et retours à la ligne s'y perdent sans prévenir.

import https from 'node:https';
import tls from 'node:tls';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = 'https://supabase-admin-proxy.cyril-samson41.workers.dev';
const SECRETS = path.join(os.homedir(), '.claude', 'secrets');
const ASSISTANT = 'claude-code@assistant.local';
const ASSISTANT_NOM = 'Claude (assistant)';

// Sous le VPN du Canton, le certificat du Worker est ré-signé par le proxy :
// sans ce bundle, Node refuse la connexion. Hors VPN, il est simplement en trop.
const BUNDLE = path.join(SECRETS, 'ne-ca-bundle.pem');
const CA = fs.existsSync(BUNDLE) ? [...tls.rootCertificates, fs.readFileSync(BUNDLE, 'utf8')] : undefined;

// Ce que le rituel peut faire d'une demande, selon l'état où il la trouve.
// Tout le reste (en_cours, a_tester, terminee, abandonnee) est un geste humain.
const TRANSITIONS = {
    nouvelle: ['validee', 'a_cadrer', 'a_analyser'],
    a_analyser: ['analyse_a_valider'],
    analyse_a_valider: ['a_analyser']
};
const CHAMPS_MAJ = ['etat', 'complexite', 'journal_ajout', 'docs_ajout'];
const ORDRE_PRIORITE = { haute: 0, normale: 1, basse: 2 };
// En tête du journal : « [2026-09-11] EN ATTENTE DE CYRIL — ce qu'il faut de lui ».
const ATTENTE = /^\[[^\]]*\]\s*EN ATTENTE\b/;

function cle() {
    return fs.readFileSync(path.join(SECRETS, 'billets-proxy-api-key.txt'), 'utf8').trim();
}

function api(method, chemin, corps, prefer) {
    const headers = {
        'X-Proxy-Key': cle(),
        // Cloudflare répond 403 « error code: 1010 » à un client sans User-Agent.
        'User-Agent': 'billets-rituel-demandes/1.0',
        Accept: 'application/json'
    };
    let data;
    if (corps !== undefined) {
        data = Buffer.from(JSON.stringify(corps), 'utf8');
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = data.length;
    }
    if (prefer) headers.Prefer = prefer;

    return new Promise((resolve, reject) => {
        const req = https.request(BASE + chemin, { method, headers, ca: CA }, (res) => {
            let s = '';
            res.setEncoding('utf8');
            res.on('data', (d) => (s += d));
            res.on('end', () => {
                if (res.statusCode >= 300) {
                    reject(new Error(method + ' ' + chemin.split('?')[0] + ' → HTTP ' + res.statusCode + ' ' + s.slice(0, 300)));
                    return;
                }
                resolve(s ? JSON.parse(s) : null);
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function lireFichier(fichier) {
    // PowerShell écrit volontiers un BOM en tête : il ne doit pas finir en base.
    return fs.readFileSync(fichier, 'utf8').replace(/^\uFEFF/, '');
}

function extrait(texte, max) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function estAssistant(email) {
    return (email || '').trim().toLowerCase() === ASSISTANT;
}

function listeDocs(docs) {
    return String(docs || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

async function uneDemande(id) {
    const rows = await api('GET', '/rest/v1/demandes?id=eq.' + id + '&select=*');
    if (!rows || !rows.length) throw new Error('Demande #' + id + ' introuvable');
    return rows[0];
}

async function carnetMembres() {
    const rows = await api('GET', '/rest/v1/membres?select=email,prenom,nom');
    const carnet = {};
    for (const m of rows || []) {
        if (m.email) carnet[m.email.trim().toLowerCase()] = [m.prenom, m.nom].filter(Boolean).join(' ');
    }
    return carnet;
}

function nomDe(carnet, email) {
    const e = (email || '').trim().toLowerCase();
    if (!e) return 'Inconnu';
    if (e === ASSISTANT) return ASSISTANT_NOM;
    return carnet[e] || e.split('@')[0];
}

// ------------------------------------------------------------
// etat — le contrôle de chaque passage. S'il répond rien_a_faire,
// le passage s'arrête là, sans rien lire d'autre.
// ------------------------------------------------------------
async function etat() {
    const champs = 'id,etat,priorite,complexite,demandeur,ecran,description,docs,commentaire,updated_at';
    const [nouvelles, aAnalyser, aValider] = await Promise.all([
        api('GET', '/rest/v1/demandes?etat=eq.nouvelle&select=' + champs + '&order=id.asc'),
        api('GET', '/rest/v1/demandes?etat=eq.a_analyser&select=' + champs + '&order=id.asc'),
        api('GET', '/rest/v1/demandes?etat=eq.analyse_a_valider&select=id&order=id.asc')
    ]);

    // Une analyse qui ne peut plus avancer sans Cyril (SQL à jouer, décision à
    // prendre) porte en tête de journal une entrée « [date] EN ATTENTE … ». Elle
    // est sautée — sinon chaque passage la reprendrait pour buter au même
    // endroit — jusqu'à ce que quelqu'un écrive une entrée plus récente
    // par-dessus, ou poste un commentaire sur la fiche après la mise en attente
    // (updated_at, tenu par trigger, date la dernière écriture du journal).
    const marquees = aAnalyser.filter((d) => ATTENTE.test((d.commentaire || '').trim()));

    const ids = [...aValider, ...marquees].map((d) => d.id);
    const coms = ids.length
        ? await api('GET', '/rest/v1/demande_commentaires?demande_id=in.(' + ids.join(',') + ')'
            + '&select=id,demande_id,doc,section,auteur_email,texte,created_at&order=created_at.asc')
        : [];
    const carnet = coms.length ? await carnetMembres() : {};
    const resume = (c) => ({
        id: c.id,
        date: c.created_at,
        auteur: nomDe(carnet, c.auteur_email),
        doc: c.doc,
        section: c.section,
        extrait: extrait(c.texte, 200)
    });

    // Une remarque est « en attente » tant qu'aucune réponse de l'assistant ne la
    // suit dans le fil : ce sont tous les commentaires postés après sa dernière réponse.
    const remarques = [];
    for (const d of aValider) {
        const fil = coms.filter((c) => c.demande_id === d.id);
        let i = fil.length;
        while (i > 0 && !estAssistant(fil[i - 1].auteur_email)) i--;
        if (i < fil.length) remarques.push({ id: d.id, commentaires: fil.slice(i).map(resume) });
    }

    const reponses = {};
    for (const d of marquees) {
        const r = coms.filter((c) => c.demande_id === d.id && !estAssistant(c.auteur_email)
            && new Date(c.created_at) > new Date(d.updated_at));
        if (r.length) reponses[d.id] = r.map(resume);
    }
    const bloquees = marquees.filter((d) => !reponses[d.id]);
    const aTraiter = aAnalyser.filter((d) => !bloquees.includes(d));

    const parPriorite = (a, b) => ((ORDRE_PRIORITE[a.priorite] ?? 1) - (ORDRE_PRIORITE[b.priorite] ?? 1)) || (a.id - b.id);
    const court = (d) => ({
        id: d.id,
        priorite: d.priorite,
        complexite: d.complexite,
        ecran: d.ecran,
        description: extrait(d.description, 200),
        docs: listeDocs(d.docs)
    });

    const maintenant = new Date();
    console.log(JSON.stringify({
        date: maintenant.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' }),
        heure: maintenant.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }),
        rien_a_faire: !nouvelles.length && !aTraiter.length && !remarques.length,
        a_trier: nouvelles.map(court),
        remarques_en_attente: remarques,
        a_analyser: aTraiter.sort(parPriorite).map((d) => (reponses[d.id]
            ? { ...court(d), reponse_a_la_mise_en_attente: reponses[d.id] }
            : court(d))),
        en_attente_de_cyril: bloquees.map((d) => ({
            id: d.id,
            motif: extrait((d.commentaire || '').trim().split('\n')[0], 200)
        }))
    }, null, 2));
}

// ------------------------------------------------------------
// lire — une demande en entier : fiche, fil de commentaires, validations.
// ------------------------------------------------------------
async function lire(id) {
    const d = await uneDemande(id);
    const [coms, vals, carnet] = await Promise.all([
        api('GET', '/rest/v1/demande_commentaires?demande_id=eq.' + id + '&select=*&order=created_at.asc'),
        api('GET', '/rest/v1/demande_validations?demande_id=eq.' + id + '&select=*&order=created_at.asc').catch(() => []),
        carnetMembres()
    ]);
    console.log(JSON.stringify({
        demande: { ...d, demandeur_nom: nomDe(carnet, d.demandeur), docs: listeDocs(d.docs) },
        commentaires: coms.map((c) => ({
            id: c.id,
            date: c.created_at,
            auteur: nomDe(carnet, c.auteur_email),
            auteur_email: c.auteur_email,
            doc: c.doc,
            section: c.section,
            texte: c.texte
        })),
        validations: vals
    }, null, 2));
}

// ------------------------------------------------------------
// maj — changer l'état, la complexité, compléter le journal, attacher des specs.
// Le fichier JSON ne peut porter que : etat, complexite, journal_ajout, docs_ajout.
// Le journal (colonne commentaire) et les docs ne sont jamais écrasés : on ajoute.
// ------------------------------------------------------------
async function maj(id, fichier) {
    if (!fichier) throw new Error('Usage : maj <id> <fichier.json>');
    const demande = await uneDemande(id);
    const entree = JSON.parse(lireFichier(fichier));

    const inconnus = Object.keys(entree).filter((k) => !CHAMPS_MAJ.includes(k));
    if (inconnus.length) {
        throw new Error('Champs refusés : ' + inconnus.join(', ') + ' (permis : ' + CHAMPS_MAJ.join(', ') + ')');
    }

    const patch = {};
    if (entree.complexite !== undefined) {
        if (!['S', 'M', 'L'].includes(entree.complexite)) throw new Error('complexite doit valoir S, M ou L');
        patch.complexite = entree.complexite;
    }
    const complexite = patch.complexite || demande.complexite;

    if (entree.etat !== undefined && entree.etat !== demande.etat) {
        const permis = TRANSITIONS[demande.etat] || [];
        if (!permis.includes(entree.etat)) {
            throw new Error('#' + id + ' : passer de « ' + demande.etat + ' » à « ' + entree.etat + ' » n\'appartient pas au rituel '
                + '(convention, § Ce qui n\'est jamais automatique).');
        }
        if (entree.etat === 'validee' && complexite === 'L') {
            throw new Error('#' + id + ' est une L : au tri elle part en a_analyser. Seule la validation d\'un admin la fait passer en Prêt à dev.');
        }
        if (entree.etat === 'a_analyser' && demande.etat === 'nouvelle' && complexite !== 'L') {
            throw new Error('#' + id + ' : seule une L part en a_analyser au tri (complexité actuelle : ' + (complexite || 'aucune') + ').');
        }
        patch.etat = entree.etat;
    }

    // Le journal se lit du plus récent au plus ancien : l'entrée va en tête.
    if (entree.journal_ajout) {
        const avant = (demande.commentaire || '').trim();
        const ajout = String(entree.journal_ajout).trim();
        patch.commentaire = avant ? ajout + '\n\n---\n\n' + avant : ajout;
    }

    if (entree.docs_ajout) {
        const ajout = Array.isArray(entree.docs_ajout) ? entree.docs_ajout : [entree.docs_ajout];
        const docs = listeDocs(demande.docs);
        for (const p of ajout.map((s) => String(s).trim()).filter(Boolean)) {
            if (!docs.includes(p)) docs.push(p);
        }
        patch.docs = docs.join('\n');
    }

    if (!Object.keys(patch).length) throw new Error('Rien à mettre à jour sur #' + id);

    const rows = await api('PATCH', '/rest/v1/demandes?id=eq.' + id, patch, 'return=representation');
    const apres = rows[0];
    console.log('#' + id + ' mise à jour : ' + Object.keys(patch).join(', ')
        + ' — état ' + demande.etat + ' → ' + apres.etat + ', complexité ' + (apres.complexite || '—'));

    if (patch.etat === 'a_cadrer') await notifierDemandeur(apres);
}

// Même notification que l'écran (notifierDemandeurSiSuivi, demande #33) : par
// l'API, aucun déclencheur ne la crée, et le demandeur n'apprendrait jamais
// que sa demande attend une précision de sa part.
async function notifierDemandeur(demande) {
    const email = (demande.demandeur || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('  (demandeur non nominatif : pas de notification)');
        return;
    }
    let resume = extrait(demande.description, 70);
    if (!resume) resume = demande.ecran ? 'écran ' + demande.ecran : 'votre demande';
    try {
        await api('POST', '/rest/v1/notifications', {
            type: 'demande_suivi',
            titre: 'Votre demande a besoin d\'une précision',
            texte: 'Votre demande « ' + resume + ' » est passée « À cadrer » : une précision '
                + 'est nécessaire avant de pouvoir la développer. Un admin reviendra vers vous'
                + (demande.commentaire ? ' (voir le commentaire ajouté).' : '.'),
            cible_email: email
        }, 'return=minimal');
        console.log('  demandeur prévenu (' + email + ')');
    } catch (e) {
        console.error('⚠ État changé, mais la notification au demandeur a échoué : ' + e.message);
        process.exitCode = 2;
    }
}

// ------------------------------------------------------------
// commenter — publier une réponse dans le fil, ET la notification qui va
// avec : sans elle, le commentateur n'apprend jamais qu'on lui a répondu
// (seul l'écran notifie, via notifierAdmins de demande.js).
// ------------------------------------------------------------
async function commenter(id, fichier, options) {
    if (!fichier) throw new Error('Usage : commenter <id> <fichier.txt> [--section "…"] [--doc chemin]');
    await uneDemande(id);
    const texte = lireFichier(fichier).trim();
    if (!texte) throw new Error('Fichier vide : rien à publier');

    const fil = await api('GET', '/rest/v1/demande_commentaires?demande_id=eq.' + id
        + '&select=id,auteur_email,texte&order=created_at.asc');
    if (fil.some((c) => estAssistant(c.auteur_email) && String(c.texte).trim() === texte)) {
        throw new Error('Ce texte est déjà publié sur #' + id + ' : rien n\'est renvoyé.');
    }
    const dernier = fil[fil.length - 1];
    const destinataire = dernier && !estAssistant(dernier.auteur_email) ? dernier.auteur_email : null;

    await api('POST', '/rest/v1/demande_commentaires', {
        demande_id: Number(id),
        doc: options.doc || null,
        section: options.section || null,
        auteur_email: ASSISTANT,
        texte
    }, 'return=minimal');
    console.log('Commentaire publié sur #' + id);

    let titre = ASSISTANT_NOM + ' a commenté la demande #' + id;
    if (destinataire) {
        const carnet = await carnetMembres();
        const prenom = (nomDe(carnet, destinataire).split(' ')[0]) || destinataire;
        titre = ASSISTANT_NOM + ' a répondu à ' + prenom + ' sur la demande #' + id;
    }
    try {
        await api('POST', '/rest/v1/notifications', {
            type: 'demande_commentaire',
            cible: 'admins',
            titre,
            texte: (options.section ? '(sur « ' + options.section + ' ») ' : '') + extrait(texte, 120),
            lien: 'demande.html?id=' + id
        }, 'return=minimal');
        console.log('Admins prévenus : ' + titre);
    } catch (e) {
        console.error('⚠ Commentaire publié, mais la notification a échoué : ' + e.message);
        process.exitCode = 2;
    }
}

// ------------------------------------------------------------
async function main() {
    const [commande, id, fichier, ...reste] = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < reste.length; i++) {
        if (reste[i] === '--section') options.section = reste[++i];
        else if (reste[i] === '--doc') options.doc = reste[++i];
        else throw new Error('Option inconnue : ' + reste[i]);
    }
    const idValide = () => {
        if (!/^\d+$/.test(id || '')) throw new Error('Numéro de demande attendu, reçu : ' + (id || '(rien)'));
    };

    if (commande === 'etat') return etat();
    if (commande === 'lire') { idValide(); return lire(id); }
    if (commande === 'maj') { idValide(); return maj(id, fichier); }
    if (commande === 'commenter') { idValide(); return commenter(id, fichier, options); }
    throw new Error('Commandes : etat | lire <id> | maj <id> <fichier.json> | commenter <id> <fichier.txt> [--section …] [--doc …]');
}

main().catch((e) => {
    console.error('Erreur : ' + e.message);
    process.exit(1);
});
