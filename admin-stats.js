// ============================================================
// admin-stats.js — Écran de statistiques admin (Demande #26)
// Indicateurs calculés à partir des données réelles (Supabase).
// ============================================================

if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) loadStats();
    });
}

function escStat(t) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(t == null ? '' : String(t)));
    return d.innerHTML;
}
function fmtNb(n) { return (Number(n) || 0).toLocaleString('fr-FR'); }

var MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function loadStats() {
    Promise.all([
        supabaseFetch('/rest/v1/membres?select=role,statut,last_active_at,pays'),
        supabaseFetch('/rest/v1/inscriptions?select=date_inscription,nb_normaux,nb_variantes,pas_interesse,billet_id'),
        supabaseFetch('/rest/v1/billets?select=id,Categorie,Collecteur,DateColl'),
        supabaseFetch('/rest/v1/collecteurs?select=alias,masque'),
        supabaseFetch('/rest/v1/enveloppes?select=statut')
    ])
    .then(function(res) {
        renderStats(res[0] || [], res[1] || [], res[2] || [], res[3] || [], res[4] || []);
    })
    .catch(function(err) {
        console.error('Erreur chargement stats:', err);
        var body = document.getElementById('stats-body');
        if (body) body.innerHTML = '<div class="stats-loading"><i class="fa-solid fa-triangle-exclamation"></i><p>Erreur lors du chargement des statistiques.</p></div>';
    });
}

function renderStats(membres, inscriptions, billets, collecteurs, enveloppes) {
    var now = Date.now();
    var anneeCourante = new Date().getFullYear();

    // --- Membres ---
    var membresActifs = membres.filter(function(m) { return m.statut === 'actif'; }).length;
    function connectesDepuis(nbJours) {
        return membres.filter(function(m) { return m.last_active_at && (now - new Date(m.last_active_at)) <= nbJours * 864e5; }).length;
    }
    var co1 = connectesDepuis(1), co7 = connectesDepuis(7), co30 = connectesDepuis(30);

    // --- Billets collectés depuis l'ouverture (inscriptions actives) ---
    var inscActives = inscriptions.filter(function(i) { return !i.pas_interesse; });
    var bNormaux = 0, bVariantes = 0;
    inscActives.forEach(function(i) { bNormaux += i.nb_normaux || 0; bVariantes += i.nb_variantes || 0; });
    var billetsCollectes = bNormaux + bVariantes;

    // --- Billets : map id→collecteur + répartition catalogue ---
    var billetCollecteur = {};
    var byCat = {};
    billets.forEach(function(b) {
        if (b.Collecteur) billetCollecteur[b.id] = b.Collecteur;
        var cat = (b.Categorie || '—');
        if (cat.indexOf('Termin') === 0) cat = 'Terminé'; // corrige un souci d'encodage résiduel
        byCat[cat] = (byCat[cat] || 0) + 1;
    });

    // --- Top collecteurs : billets collectés + nombre de collectes (via inscriptions) depuis l'ouverture ---
    var billetsParCollecteur = {};
    var collectesParCollecteur = {}; // collecteur -> Set de billet_id distincts
    inscActives.forEach(function(i) {
        var coll = billetCollecteur[i.billet_id];
        if (!coll) return;
        billetsParCollecteur[coll] = (billetsParCollecteur[coll] || 0) + (i.nb_normaux || 0) + (i.nb_variantes || 0);
        if (!collectesParCollecteur[coll]) collectesParCollecteur[coll] = {};
        collectesParCollecteur[coll][i.billet_id] = true;
    });
    var topCollecteurs = Object.keys(billetsParCollecteur)
        .map(function(k) { return { label: k, value: billetsParCollecteur[k] }; })
        .sort(function(a, b) { return b.value - a.value; });
    var topCollectes = Object.keys(collectesParCollecteur)
        .map(function(k) { return { label: k, value: Object.keys(collectesParCollecteur[k]).length }; })
        .sort(function(a, b) { return b.value - a.value; });

    // Date de la première collecte du nouveau mode (première inscription du site)
    var premiereDate = null;
    inscActives.forEach(function(i) {
        if (i.date_inscription && (!premiereDate || i.date_inscription < premiereDate)) premiereDate = i.date_inscription;
    });
    var premiereDateStr = premiereDate ? new Date(premiereDate).toLocaleDateString('fr-FR') : '—';

    // --- Collecteurs actifs dans l'année (billets mis en collecte cette année) ---
    var collecteursActifs = {};
    billets.forEach(function(b) {
        if (b.Collecteur && b.DateColl && b.DateColl.slice(0, 4) === String(anneeCourante)) {
            collecteursActifs[b.Collecteur] = true;
        }
    });
    var nbCollecteursActifs = Object.keys(collecteursActifs).length;
    var nbCollecteursTotal = collecteurs.filter(function(c) { return !c.masque; }).length;

    // --- Billets collectés par mois (somme normaux + variantes) ---
    var parMois = {};
    inscActives.forEach(function(i) {
        if (!i.date_inscription) return;
        var k = i.date_inscription.slice(0, 7);
        parMois[k] = (parMois[k] || 0) + (i.nb_normaux || 0) + (i.nb_variantes || 0);
    });
    var moisKeys = Object.keys(parMois).sort();

    // --- Répartition par pays (membres) ---
    var parPays = {};
    membres.forEach(function(m) {
        var label = (m.pays || '').trim() || 'France';
        var key = window._normPays(label);
        if (!parPays[key]) parPays[key] = { label: label, count: 0 };
        parPays[key].count++;
    });
    var paysList = Object.keys(parPays).map(function(k) { return parPays[k]; })
        .sort(function(a, b) { return b.count - a.count; });

    // --- Enveloppes par statut ---
    var STATUT_ENV = { en_cours: 'En préparation', expediee: 'Expédiées', distribuee: 'Distribuées', recue: 'Reçues', annulee: 'Annulées' };
    var byEnv = {};
    enveloppes.forEach(function(e) { byEnv[e.statut || '?'] = (byEnv[e.statut || '?'] || 0) + 1; });

    // ============================================================
    // Rendu
    // ============================================================
    var html = '';

    // Cartes KPI
    html += '<div class="kpi-grid">';
    html += kpiCard('fa-users', fmtNb(membresActifs), 'Membres actifs', membres.length + ' comptes au total', '#5D3A7E');
    html += kpiCard('fa-bolt', fmtNb(co1), 'Connectés aujourd\'hui', co7 + ' sur 7 j · ' + co30 + ' sur 30 j', '#2E7D4F');
    html += kpiCard('fa-ticket', fmtNb(billetsCollectes), 'Billets collectés', 'depuis l\'ouverture du site', '#C8860D');
    html += kpiCard('fa-pen-to-square', fmtNb(inscActives.length), 'Inscriptions actives', bNormaux + ' normaux · ' + bVariantes + ' variantes', '#1565C0');
    html += kpiCard('fa-hand-holding-heart', fmtNb(nbCollecteursActifs), 'Collecteurs actifs ' + anneeCourante, 'sur ' + nbCollecteursTotal + ' collecteurs', '#B3560F');
    html += kpiCard('fa-book', fmtNb(billets.length), 'Billets au catalogue', 'historique complet', '#7B1FA2');
    html += '</div>';

    // Billets collectés par mois
    html += '<div class="stats-section">';
    html += '<h2><i class="fa-solid fa-chart-column"></i> Billets collectés par mois</h2>';
    html += '<p class="kpi-sub" style="margin-top:-8px">En nombre de billets (normaux + variantes)</p>';
    html += vbarChart(moisKeys.map(function(k) {
        var parts = k.split('-');
        return { label: MOIS_COURTS[parseInt(parts[1], 10) - 1] + ' ' + parts[0].slice(2), value: parMois[k] };
    }));
    html += '</div>';

    // 2 colonnes : pays + envois
    html += '<div class="stats-2col">';

    html += '<div class="stats-section">';
    html += '<h2><i class="fa-solid fa-earth-europe"></i> Membres par pays</h2>';
    html += barChart(paysList.slice(0, 8).map(function(p) {
        var code = paysCode(p.label);
        return {
            labelHtml: (code ? '<span class="pays-code">' + code + '</span> ' : '') + escStat(p.label),
            labelTitle: p.label,
            value: p.count
        };
    }), '#5D3A7E');
    if (paysList.length > 8) html += '<p class="kpi-sub">+ ' + (paysList.length - 8) + ' autres pays</p>';
    html += '</div>';

    html += '<div class="stats-section">';
    html += '<h2><i class="fa-solid fa-envelope"></i> État des envois</h2>';
    html += barChart(['en_cours', 'expediee', 'distribuee', 'recue', 'annulee'].filter(function(s) { return byEnv[s]; }).map(function(s) {
        return { label: STATUT_ENV[s] || s, value: byEnv[s] };
    }), '#2E7D4F');
    html += '</div>';

    html += '</div>'; // fin 2col

    // 2 colonnes : top collecteurs (billets) + top collecteurs (collectes)
    var depuisTxt = '<p class="kpi-sub" style="margin-top:-8px">Depuis le ' + escStat(premiereDateStr) + ' (ouverture du site)</p>';
    html += '<div class="stats-2col">';

    html += '<div class="stats-section">';
    html += '<h2><i class="fa-solid fa-ranking-star"></i> Top collecteurs — billets collectés</h2>';
    html += depuisTxt;
    html += barChart(topCollecteurs.slice(0, 8), '#B3560F');
    html += '</div>';

    html += '<div class="stats-section">';
    html += '<h2><i class="fa-solid fa-ranking-star"></i> Top collecteurs — nombre de collectes</h2>';
    html += depuisTxt;
    html += barChart(topCollectes.slice(0, 8), '#1565C0');
    html += '</div>';

    html += '</div>'; // fin 2col

    // Catalogue par statut (pleine largeur)
    html += '<div class="stats-section">';
    html += '<h2><i class="fa-solid fa-layer-group"></i> Catalogue par statut</h2>';
    var catList = Object.keys(byCat).map(function(k) { return { label: k, value: byCat[k] }; }).sort(function(a, b) { return b.value - a.value; });
    html += barChart(catList, '#C8860D');
    html += '</div>';

    var body = document.getElementById('stats-body');
    if (body) body.innerHTML = html;
    var sub = document.getElementById('stats-subtitle');
    if (sub) sub.textContent = 'Données arrêtées au ' + new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        + ' · inscriptions suivies depuis l\'ouverture du site (mars 2026).';
}

// --- Composants de rendu ---
function kpiCard(icon, value, label, sub, color) {
    return '<div class="kpi-card" style="--kpi-color:' + color + '">'
        + '<span class="kpi-icon"><i class="fa-solid ' + icon + '"></i></span>'
        + '<div class="kpi-value">' + escStat(value) + '</div>'
        + '<div class="kpi-label">' + escStat(label) + '</div>'
        + (sub ? '<div class="kpi-sub">' + escStat(sub) + '</div>' : '')
        + '</div>';
}

function barChart(items, color) {
    if (!items || items.length === 0) return '<p class="kpi-sub">Aucune donnée.</p>';
    var max = items.reduce(function(m, it) { return Math.max(m, it.value); }, 0) || 1;
    return items.map(function(it) {
        var pct = Math.round((it.value / max) * 100);
        var labelHtml = it.labelHtml || escStat(it.label);
        var title = escStat(it.labelTitle || it.label || '');
        return '<div class="bar-row">'
            + '<span class="bar-label" title="' + title + '">' + labelHtml + '</span>'
            + '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%;--bar-color:' + color + '"></span></span>'
            + '<span class="bar-value">' + fmtNb(it.value) + '</span>'
            + '</div>';
    }).join('');
}

// Code pays : helper partagé window.paysCode (global.js)
function paysCode(pays) { return window.paysCode(pays); }

function vbarChart(items) {
    if (!items || items.length === 0) return '<p class="kpi-sub">Aucune donnée.</p>';
    var max = items.reduce(function(m, it) { return Math.max(m, it.value); }, 0) || 1;
    return '<div class="vbars">' + items.map(function(it) {
        var pct = Math.max(3, Math.round((it.value / max) * 100));
        return '<div class="vbar">'
            + '<span class="vbar-val">' + fmtNb(it.value) + '</span>'
            + '<div class="vbar-fill" style="height:' + pct + '%"></div>'
            + '<span class="vbar-label">' + escStat(it.label) + '</span>'
            + '</div>';
    }).join('') + '</div>';
}
