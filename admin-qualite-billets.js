// ============================================================
// admin-qualite-billets.js — Demandes #66 et #69
// « Qualité des billets » : deux onglets qui ne se mélangent jamais.
//   Incohérences (#69)             : ce qui cloche dans nos fiches (verifier_billets()).
//   Vérification des billets (#66) : ce qu'un fichier extérieur propose de changer.
// Toutes les écritures passent par des fonctions en base, qui vérifient que
// l'appelant est un admin actif : la page ne fait que lire et appeler.
// ============================================================

var QB_PAGE = 50;

var QB_MIGRATION = {
    incoherences: 'scripts/migration-demande-69-2-incoherences-billets.sql',
    verification: 'scripts/migration-demande-66-2-verification-billets.sql'
};

var QB_GRAVITES = [
    { value: '',         label: 'Toutes' },
    { value: 'faux',     label: 'Faux' },
    { value: 'manquant', label: 'Manquant' },
    { value: 'suspect',  label: 'Suspect' }
];
var QB_GRAVITE_RANG = { faux: 0, manquant: 1, suspect: 2 };

var QB_STATUTS_CONSTAT = [
    { value: 'a_corriger', label: 'À corriger' },
    { value: 'accepte',    label: 'Acceptés' },
    { value: 'corrige',    label: 'Corrigés' }
];

var QB_VUES = [
    { value: 'a_valider', label: 'À décider' },
    { value: 'journal',   label: 'Journal' },
    { value: 'toutes',    label: 'Toutes les lignes' }
];

var QB_ECARTS = [
    { value: '',              label: 'Tous' },
    { value: 'a_completer',   label: 'À compléter' },
    { value: 'contradiction', label: 'Contradiction' },
    { value: 'absent_base',   label: 'Nouveau billet à créer' },
    { value: 'ambigu',        label: 'Ambigu' },
    { value: 'identique',     label: 'Identique' }
];
var QB_ECART_LIBELLE = {};
QB_ECARTS.forEach(function(e) { if (e.value) QB_ECART_LIBELLE[e.value] = e.label; });

var qb = {
    onglet: 'incoherences',
    // Incohérences
    catalogue: [],
    derniere: null,
    statut: 'a_corriger',
    gravite: '',
    code: null,
    constats: [],
    constatsOffset: 0,
    // Vérification
    imports: [],
    compteursImport: {},
    importId: null,
    vue: 'a_valider',
    ecart: '',
    ligneSeule: null,
    lignes: [],
    lignesOffset: 0
};

document.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('onglet') === 'verification') qb.onglet = 'verification';
    if (params.get('ligne')) qb.ligneSeule = parseInt(params.get('ligne'), 10) || null;

    var waitAuth = setInterval(function() {
        if (window.userRole) {
            clearInterval(waitAuth);
            qbChangerOnglet(qb.onglet);
            qbChargerIncoherences();
            qbChargerImports();
        }
    }, 100);
});

// ------------------------------------------------------------
// Outils
// ------------------------------------------------------------
function qbEsc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
}

function qbNombre(n) {
    return (n || 0).toLocaleString('fr-FR');
}

function qbDate(iso, avecHeure) {
    if (!iso) return '';
    var o = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (avecHeure) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return new Date(iso).toLocaleString('fr-FR', o);
}

function qbRpc(nom, params) {
    return supabaseFetch('/rest/v1/rpc/' + nom, { method: 'POST', body: JSON.stringify(params || {}) });
}

// La table ou la fonction n'existe pas encore : la migration n'a pas été jouée.
function qbMigrationManquante(err) {
    return /schema cache|does not exist|Could not find/i.test((err && err.message) || '');
}

function qbMessageErreur(conteneur, err, onglet) {
    if (qbMigrationManquante(err)) {
        conteneur.innerHTML = '<div class="qb-avertissement"><i class="fa-solid fa-triangle-exclamation"></i> ' +
            'Cet écran attend sa mise à jour de la base : le script <code>' + qbEsc(QB_MIGRATION[onglet]) +
            '</code> est à jouer dans l\'éditeur SQL de Supabase. Rien d\'autre à faire ensuite : l\'écran s\'active tout seul.</div>';
    } else {
        conteneur.innerHTML = '<p class="qb-vide qb-erreur">Erreur : ' + qbEsc((err && err.message) || 'erreur réseau') + '</p>';
    }
}

// « UEBK 2026-14 NAUSICAA », comme libelleBilletComplet() d'admin.js (#36).
function qbLibelleBillet(b) {
    if (!b) return '';
    var parts = [];
    if (b.Reference) parts.push(b.Reference);
    if (b.Millesime) parts.push(b.Millesime + (b.Version ? '-' + b.Version : ''));
    if (b.NomBillet) parts.push(b.NomBillet);
    return parts.join(' ');
}

// Miniature : Cloudinary redimensionné, sinon la vignette Google Drive.
function qbMiniature(b) {
    var src = '';
    if (b && b.ImageUrl && b.ImageUrl.indexOf('/upload/') !== -1) {
        src = b.ImageUrl.replace('/upload/', '/upload/f_auto,q_auto,w_160/');
    } else if (b && b.ImageUrl) {
        src = b.ImageUrl;
    } else if (b && b.ImageId) {
        src = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(b.ImageId) + '&sz=w160';
    }
    if (!src) return '<div class="qb-miniature qb-miniature--vide" aria-hidden="true"><i class="fa-regular fa-image"></i></div>';
    return '<img class="qb-miniature" src="' + qbEsc(src) + '" alt="" loading="lazy">';
}

function qbLienFiche(billetId, texte) {
    return '<a href="admin-billet.html?id=' + encodeURIComponent(billetId) + '" target="_blank" rel="noopener">' +
        qbEsc(texte) + ' <i class="fa-solid fa-arrow-up-right-from-square qb-lien-icone" aria-hidden="true"></i></a>';
}

function qbBoutonsFiltre(conteneurId, options, valeur, fn) {
    var el = document.getElementById(conteneurId);
    if (!el) return;
    el.innerHTML = options.map(function(o) {
        return '<button type="button" class="user-role-filter-btn' + (o.value === valeur ? ' active' : '') + '"' +
            ' onclick="' + fn + '(\'' + o.value + '\')">' + qbEsc(o.label) +
            (o.count != null ? ' <span class="qb-filtre-nb">' + qbNombre(o.count) + '</span>' : '') + '</button>';
    }).join('');
}

function qbFlash(id, html, genre) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!html) { el.hidden = true; el.innerHTML = ''; return; }
    el.className = 'qb-flash' + (genre ? ' qb-flash--' + genre : '');
    el.innerHTML = html;
    el.hidden = false;
}

function qbChangerOnglet(onglet) {
    qb.onglet = onglet;
    ['incoherences', 'verification'].forEach(function(o) {
        var tab = document.getElementById('qb-tab-' + o);
        if (tab) {
            tab.classList.toggle('active', o === onglet);
            tab.setAttribute('aria-selected', o === onglet ? 'true' : 'false');
        }
        var p = document.getElementById('qb-panneau-' + o);
        if (p) p.hidden = (o !== onglet);
    });
}

function qbCompteurOnglet(onglet, n) {
    var el = document.getElementById('qb-tab-count-' + onglet);
    if (!el) return;
    el.textContent = qbNombre(n);
    el.hidden = !n;
}

// ============================================================
// ONGLET « INCOHÉRENCES » (#69)
// ============================================================
function qbChargerIncoherences() {
    return qbRpc('compteurs_controles_billets')
        .then(function(res) {
            qb.catalogue = (res && res.controles) || [];
            qb.derniere = res && res.derniere;
            qbAfficherDerniere();
            qbCompteurOnglet('incoherences', qb.catalogue.reduce(function(s, c) { return s + (c.a_corriger || 0); }, 0));
            // Garder le contrôle choisi s'il a encore des cas ; sinon le premier qui en a.
            if (!qb.code || !qbControle(qb.code) || !qbNbStatut(qbControle(qb.code))) qb.code = qbPremierCode();
            qbAfficherFiltresIncoherences();
            qbChargerConstats(false);
        })
        .catch(function(err) {
            document.getElementById('qb-derniere').textContent = '';
            document.getElementById('qb-relancer').hidden = qbMigrationManquante(err);
            qbMessageErreur(document.getElementById('qb-constats'), err, 'incoherences');
        });
}

function qbControle(code) {
    return qb.catalogue.filter(function(c) { return c.code === code; })[0] || null;
}

function qbNbStatut(c) {
    return c ? (c[qb.statut] || 0) : 0;
}

// Les contrôles visibles, les « faux » d'abord : un billet impossible passe
// avant une information manquante, même si les manquants sont bien plus nombreux.
function qbControlesVisibles() {
    return qb.catalogue
        .filter(function(c) { return !qb.gravite || c.gravite === qb.gravite; })
        .sort(function(a, b) {
            return (QB_GRAVITE_RANG[a.gravite] - QB_GRAVITE_RANG[b.gravite]) || (a.ordre - b.ordre);
        });
}

function qbPremierCode() {
    var avecCas = qbControlesVisibles().filter(function(c) { return qbNbStatut(c) > 0; });
    return avecCas.length ? avecCas[0].code : null;
}

function qbAfficherDerniere() {
    var el = document.getElementById('qb-derniere');
    var d = qb.derniere;
    if (!d) { el.textContent = 'Aucune vérification lancée pour l\'instant.'; return; }
    el.innerHTML = 'Dernière vérification le <strong>' + qbEsc(qbDate(d.lancee_le, true)) + '</strong>' +
        (d.lancee_par ? ' par ' + qbEsc(d.lancee_par) : '') + ' — ' + qbNombre(d.nb_trouves) + ' cas trouvés';
}

function qbAfficherFiltresIncoherences() {
    qbBoutonsFiltre('qb-filtre-statut', QB_STATUTS_CONSTAT.map(function(s) {
        return { value: s.value, label: s.label, count: qb.catalogue.reduce(function(t, c) { return t + (c[s.value] || 0); }, 0) };
    }), qb.statut, 'qbFiltrerStatut');
    qbBoutonsFiltre('qb-filtre-gravite', QB_GRAVITES, qb.gravite, 'qbFiltrerGravite');

    // Les compteurs, regroupés par famille dans l'ordre du catalogue.
    var familles = [];
    var parFamille = {};
    qbControlesVisibles().slice().sort(function(a, b) { return a.ordre - b.ordre; }).forEach(function(c) {
        if (!parFamille[c.famille]) { parFamille[c.famille] = []; familles.push(c.famille); }
        parFamille[c.famille].push(c);
    });
    document.getElementById('qb-compteurs').innerHTML = familles.map(function(f) {
        return '<div class="qb-famille"><div class="qb-famille-nom">' + qbEsc(f) + '</div><div class="qb-puces">' +
            parFamille[f].map(function(c) {
                var n = qbNbStatut(c);
                return '<button type="button" class="qb-puce qb-puce--' + qbEsc(c.gravite) +
                    (c.code === qb.code ? ' active' : '') + (n ? '' : ' qb-puce--zero') + '"' +
                    ' onclick="qbChoisirControle(\'' + qbEsc(c.code) + '\')" aria-pressed="' + (c.code === qb.code) + '">' +
                    '<span class="qb-puce-libelle">' + qbEsc(c.libelle) + '</span>' +
                    '<span class="qb-puce-nb">' + qbNombre(n) + '</span></button>';
            }).join('') + '</div></div>';
    }).join('');
}

function qbFiltrerStatut(v) {
    qb.statut = v;
    if (!qbNbStatut(qbControle(qb.code))) qb.code = qbPremierCode();
    qbAfficherFiltresIncoherences();
    qbChargerConstats(false);
}

function qbFiltrerGravite(v) {
    qb.gravite = v;
    var c = qbControle(qb.code);
    if (!c || (v && c.gravite !== v) || !qbNbStatut(c)) qb.code = qbPremierCode();
    qbAfficherFiltresIncoherences();
    qbChargerConstats(false);
}

function qbChoisirControle(code) {
    qb.code = code;
    qbAfficherFiltresIncoherences();
    qbChargerConstats(false);
}

var QB_LIBELLE_STATUT_CONSTAT = { a_corriger: 'à corriger', accepte: 'accepté(s)', corrige: 'corrigé(s)' };
var QB_LIBELLE_GRAVITE = { faux: 'Faux', manquant: 'Manquant', suspect: 'Suspect' };

var qbJetonConstats = 0;
function qbChargerConstats(suite) {
    var liste = document.getElementById('qb-constats');
    var plus = document.getElementById('qb-constats-plus');
    var titre = document.getElementById('qb-liste-titre');
    var c = qbControle(qb.code);

    if (!suite) { qb.constats = []; qb.constatsOffset = 0; }
    if (!c) {
        titre.textContent = '';
        plus.hidden = true;
        liste.innerHTML = '<p class="qb-vide"><i class="fa-solid fa-circle-check"></i> ' +
            (qb.statut === 'a_corriger' ? 'Rien à corriger dans ce filtre.' : 'Aucun cas dans ce filtre.') + '</p>';
        return;
    }
    titre.innerHTML = '<span class="qb-gravite qb-gravite--' + qbEsc(c.gravite) + '">' + qbEsc(QB_LIBELLE_GRAVITE[c.gravite]) + '</span> ' +
        qbEsc(c.libelle) + ' <span class="qb-liste-nb">— ' + qbNombre(qbNbStatut(c)) + ' ' + QB_LIBELLE_STATUT_CONSTAT[qb.statut] + '</span>';
    if (!suite) liste.innerHTML = '<p class="qb-vide">Chargement…</p>';

    var ordre = qb.statut === 'corrige' ? 'corrige_le.desc' : (qb.statut === 'accepte' ? 'decide_le.desc' : 'billet_id.desc');
    var chemin = '/rest/v1/controles_billets?code=eq.' + encodeURIComponent(c.code) +
        '&statut=eq.' + qb.statut +
        '&select=id,code,billet_id,collecte_id,detail,statut,trouve_le,corrige_le,decide_par,decide_le,commentaire,' +
        'billets(Reference,Millesime,Version,NomBillet,ImageUrl,ImageId)' +
        '&order=' + ordre + ',id.asc&limit=' + QB_PAGE + '&offset=' + qb.constatsOffset;
    // Seule la dernière demande a le droit d'afficher : deux clics rapprochés (ou un
    // filtre changé pendant un chargement) empileraient sinon deux fois la liste.
    var jeton = ++qbJetonConstats;

    supabaseFetch(chemin)
        .then(function(rows) {
            rows = rows || [];
            return qbPropositionsImport(c.code, rows).then(function(props) { return { rows: rows, props: props }; });
        })
        .then(function(r) {
            if (jeton !== qbJetonConstats) return;
            qb.constats = qb.constats.concat(r.rows);
            qb.constatsOffset += r.rows.length;
            if (!qb.constats.length) {
                liste.innerHTML = '<p class="qb-vide">Aucun cas.</p>';
            } else {
                liste.innerHTML = qb.constats.map(function(k) { return qbCarteConstat(k, r.props); }).join('');
            }
            plus.hidden = qb.constatsOffset >= qbNbStatut(c) || r.rows.length < QB_PAGE;
        })
        .catch(function(err) { qbMessageErreur(liste, err, 'incoherences'); });
}

// #69 × #66 : un constat sur le type de billet dont le billet attend une décision
// d'import. Si les tables de #66 n'existent pas encore, la mention est simplement absente.
var qbPropsCumul = {};
function qbPropositionsImport(code, rows) {
    if (['A1', 'A2', 'A3'].indexOf(code) === -1 || !rows.length) return Promise.resolve(qbPropsCumul);
    var ids = rows.map(function(r) { return r.billet_id; }).filter(function(id, i, a) { return a.indexOf(id) === i; });
    return supabaseFetch('/rest/v1/imports_billets_lignes?statut=eq.a_valider&billet_id=in.(' + ids.join(',') + ')&select=id,billet_id&order=id.desc')
        .then(function(lignes) {
            (lignes || []).forEach(function(l) { if (!qbPropsCumul[l.billet_id]) qbPropsCumul[l.billet_id] = l.id; });
            return qbPropsCumul;
        })
        .catch(function() { return qbPropsCumul; });
}

function qbCarteConstat(k, props) {
    var b = k.billets || {};
    var libelle = qbLibelleBillet(b) || ('Billet n° ' + k.billet_id);
    var etat = '';
    if (k.statut === 'accepte') {
        etat = '<div class="qb-etat qb-etat--accepte"><i class="fa-solid fa-circle-check"></i> Accepté' +
            (k.decide_le ? ' le ' + qbEsc(qbDate(k.decide_le)) : '') + (k.decide_par ? ' par ' + qbEsc(k.decide_par) : '') +
            (k.commentaire ? ' : « ' + qbEsc(k.commentaire) + ' »' : '') + '</div>';
    } else if (k.statut === 'corrige') {
        etat = '<div class="qb-etat qb-etat--corrige"><i class="fa-solid fa-wand-magic-sparkles"></i> Corrigé' +
            (k.corrige_le ? ', constaté le ' + qbEsc(qbDate(k.corrige_le)) : '') + '</div>';
    }
    var mention = '';
    var ligneImport = props && props[k.billet_id];
    if (ligneImport && k.statut === 'a_corriger') {
        mention = '<a class="qb-mention" href="admin-qualite-billets.html?onglet=verification&ligne=' + encodeURIComponent(ligneImport) + '">' +
            '<i class="fa-solid fa-file-import"></i> Un import propose une valeur : la voir avant de corriger à la main</a>';
    }
    var actions = '';
    if (k.statut === 'a_corriger') {
        actions = '<button type="button" class="qb-btn-secondaire" onclick="qbAccepterConstat(' + k.id + ')">' +
            '<i class="fa-solid fa-check"></i> Ce n\'est pas une erreur</button>';
    } else if (k.statut === 'accepte') {
        actions = '<button type="button" class="user-role-filter-btn" onclick="qbRouvrirConstat(' + k.id + ')">' +
            '<i class="fa-solid fa-rotate-left"></i> Rouvrir</button>';
    }
    return '<article class="qb-carte" id="qb-constat-' + k.id + '">' +
        qbMiniature(b) +
        '<div class="qb-carte-corps">' +
            '<div class="qb-carte-titre">' + qbLienFiche(k.billet_id, libelle) + '</div>' +
            '<div class="qb-carte-detail">' + qbEsc(k.detail) + '</div>' +
            mention + etat +
        '</div>' +
        (actions ? '<div class="qb-carte-actions">' + actions + '</div>' : '') +
    '</article>';
}

function qbAccepterConstat(id) {
    var comm = prompt('Pourquoi ce cas n\'est-il pas une erreur ?\n(obligatoire : c\'est ce que lira le prochain admin)', '');
    if (comm === null) return;
    if (!comm.trim()) { alert('Le commentaire est obligatoire pour accepter un cas.'); return; }
    qbRpc('decider_controle_billet', { p_id: id, p_decision: 'accepter', p_commentaire: comm.trim() })
        .then(function() { qbChargerIncoherences(); })
        .catch(function(err) { alert('Erreur : ' + ((err && err.message) || 'enregistrement impossible')); });
}

function qbRouvrirConstat(id) {
    if (!confirm('Rouvrir ce cas ?\n\nIl repassera « à corriger » et le commentaire d\'acceptation sera effacé.')) return;
    qbRpc('decider_controle_billet', { p_id: id, p_decision: 'rouvrir' })
        .then(function() { qbChargerIncoherences(); })
        .catch(function(err) { alert('Erreur : ' + ((err && err.message) || 'enregistrement impossible')); });
}

function qbRelancerVerification() {
    var btn = document.getElementById('qb-relancer');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Vérification en cours…';
    qbFlash('qb-relance-resultat', '');
    qbRpc('verifier_billets')
        .then(function(r) {
            r = r || {};
            var morceaux = [qbNombre(r.trouves) + ' cas trouvés'];
            morceaux.push(r.nouveaux ? qbNombre(r.nouveaux) + ' nouveau(x)' : 'aucun nouveau');
            if (r.corriges) morceaux.push(qbNombre(r.corriges) + ' corrigé(s) depuis la dernière fois');
            if (r.rouverts) morceaux.push(qbNombre(r.rouverts) + ' revenu(s)');
            qbFlash('qb-relance-resultat', '<i class="fa-solid fa-circle-check"></i> Vérification faite : ' + morceaux.join(', ') + '.', 'ok');
            return qbChargerIncoherences();
        })
        .catch(function(err) {
            qbFlash('qb-relance-resultat', '<i class="fa-solid fa-triangle-exclamation"></i> ' + qbEsc((err && err.message) || 'Erreur réseau'), 'erreur');
        })
        .then(function() {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Relancer la vérification';
        });
}

// ============================================================
// ONGLET « VÉRIFICATION DES BILLETS » (#66)
// ============================================================
function qbChargerImports() {
    var liste = document.getElementById('qb-lignes');
    var p = supabaseFetch('/rest/v1/imports_billets?select=id,importe_le,importe_par,source,fichier,nb_lignes&order=importe_le.desc');

    // Lien depuis une incohérence : ouvrir l'import de la ligne visée.
    var pLigne = qb.ligneSeule
        ? supabaseFetch('/rest/v1/imports_billets_lignes?id=eq.' + qb.ligneSeule + '&select=import_id').catch(function() { return []; })
        : Promise.resolve([]);

    return Promise.all([p, pLigne])
        .then(function(res) {
            qb.imports = res[0] || [];
            if (!qb.imports.length) {
                document.getElementById('qb-import').parentNode.hidden = true;
                document.getElementById('qb-filtre-vue').innerHTML = '';
                document.getElementById('qb-filtre-ecart').innerHTML = '';
                liste.innerHTML = '<p class="qb-vide"><i class="fa-solid fa-inbox"></i> Aucun fichier importé pour l\'instant.<br>' +
                    'Un import se lance par l\'assistant, à partir d\'un fichier dont Cyril indique le chemin dans une demande (#67).</p>';
                qbCompteurOnglet('verification', 0);
                return;
            }
            var cible = res[1] && res[1][0] && res[1][0].import_id;
            if (cible) qb.importId = cible;
            if (!qb.importId) qb.importId = qb.imports[0].id;
            return Promise.all(qb.imports.map(function(i) {
                return qbRpc('compteurs_import_billets', { p_import_id: i.id })
                    .then(function(c) { qb.compteursImport[i.id] = c || {}; })
                    .catch(function() { qb.compteursImport[i.id] = {}; });
            })).then(function() {
                qbCompteurOnglet('verification', qb.imports.reduce(function(s, i) {
                    return s + (((qb.compteursImport[i.id] || {}).par_statut || {}).a_valider || 0);
                }, 0));
                qbAfficherImports();
                qbChargerLignes(false);
            });
        })
        .catch(function(err) { qbMessageErreur(liste, err, 'verification'); });
}

function qbAValider(importId) {
    return ((qb.compteursImport[importId] || {}).par_statut || {}).a_valider || 0;
}

function qbAfficherImports() {
    var sel = document.getElementById('qb-import');
    sel.parentNode.hidden = false;
    sel.innerHTML = qb.imports.map(function(i) {
        var n = qbAValider(i.id);
        return '<option value="' + i.id + '"' + (String(i.id) === String(qb.importId) ? ' selected' : '') + '>' +
            qbEsc(qbDate(i.importe_le) + ' — ' + i.source + ' — ' + qbNombre(i.nb_lignes) + ' billets' + (n ? ' (' + qbNombre(n) + ' à décider)' : '')) +
            '</option>';
    }).join('');

    var imp = qb.imports.filter(function(i) { return String(i.id) === String(qb.importId); })[0];
    var c = qb.compteursImport[qb.importId] || {};
    var st = c.par_statut || {};
    document.getElementById('qb-import-resume').innerHTML = imp
        ? '<div><strong>' + qbEsc(imp.source) + '</strong>, importé le ' + qbEsc(qbDate(imp.importe_le, true)) +
          (imp.importe_par ? ' par ' + qbEsc(imp.importe_par) : '') +
          (imp.fichier ? '<br><span class="qb-fichier">Fichier : ' + qbEsc(imp.fichier) + '</span>' : '') + '</div>' +
          '<div class="qb-import-chiffres">' +
            '<span><strong>' + qbNombre(st.a_valider) + '</strong> à décider</span>' +
            '<span><strong>' + qbNombre(st.traite) + '</strong> traités à l\'import</span>' +
            '<span><strong>' + qbNombre(st.valide) + '</strong> acceptés</span>' +
            '<span><strong>' + qbNombre(st.refuse) + '</strong> refusés</span>' +
          '</div>'
        : '';

    qbBoutonsFiltre('qb-filtre-vue', QB_VUES.map(function(v) {
        return { value: v.value, label: v.label,
                 count: v.value === 'a_valider' ? (st.a_valider || 0) : (v.value === 'journal' ? (c.journal || 0) : null) };
    }), qb.ligneSeule ? '' : qb.vue, 'qbFiltrerVue');

    // Les écarts : pour « à décider », seulement ceux qui en ont.
    var parEcart = qb.vue === 'a_valider' ? (c.a_valider_par_ecart || {}) : (c.par_ecart || {});
    var options = QB_ECARTS.filter(function(e) {
        if (!e.value) return true;
        if (qb.vue === 'a_valider' && e.value === 'identique') return false;
        return qb.vue !== 'a_valider' || parEcart[e.value];
    }).map(function(e) { return { value: e.value, label: e.label, count: e.value ? (parEcart[e.value] || 0) : null }; });
    qbBoutonsFiltre('qb-filtre-ecart', qb.vue === 'journal' ? [] : options, qb.ecart, 'qbFiltrerEcart');
}

function qbChoisirImport(id) {
    qb.importId = id;
    qb.ligneSeule = null;
    qb.ecart = '';
    qbAfficherImports();
    qbChargerLignes(false);
}

function qbFiltrerVue(v) {
    qb.vue = v;
    qb.ecart = '';
    qb.ligneSeule = null;
    qbAfficherImports();
    qbChargerLignes(false);
}

function qbFiltrerEcart(v) {
    qb.ecart = v;
    qb.ligneSeule = null;
    qbAfficherImports();
    qbChargerLignes(false);
}

function qbVoirToutImport() {
    qb.ligneSeule = null;
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', 'admin-qualite-billets.html?onglet=verification');
    }
    qbAfficherImports();
    qbChargerLignes(false);
}

var qbJetonLignes = 0;
function qbChargerLignes(suite) {
    var liste = document.getElementById('qb-lignes');
    var plus = document.getElementById('qb-lignes-plus');
    if (!qb.importId) return;
    if (!suite) { qb.lignes = []; qb.lignesOffset = 0; liste.innerHTML = '<p class="qb-vide">Chargement…</p>'; }

    var select = '&select=id,import_id,cle,cle_texte,billet_id,ligne_fichier,valeurs_fichier,valeurs_base,ecart,proposition,' +
        'protege,statut,motif,commentaire,decide_par,decide_le,applique_le,billets(Reference,Millesime,Version,NomBillet,ImageUrl,ImageId)';
    var chemin;
    if (qb.ligneSeule) {
        chemin = '/rest/v1/imports_billets_lignes?id=eq.' + qb.ligneSeule + select;
    } else {
        chemin = '/rest/v1/imports_billets_lignes?import_id=eq.' + encodeURIComponent(qb.importId) + select;
        if (qb.vue === 'a_valider') chemin += '&statut=eq.a_valider';
        if (qb.vue === 'journal') chemin += '&or=(applique_le.not.is.null,statut.in.(valide,refuse))';
        if (qb.ecart && qb.vue !== 'journal') chemin += '&ecart=eq.' + encodeURIComponent(qb.ecart);
        chemin += qb.vue === 'journal'
            ? '&order=decide_le.desc.nullslast,applique_le.desc.nullslast,id.asc'
            : '&order=cle_texte.asc,id.asc';
        chemin += '&limit=' + QB_PAGE + '&offset=' + qb.lignesOffset;
    }
    var jeton = ++qbJetonLignes;

    supabaseFetch(chemin)
        .then(function(rows) {
            if (jeton !== qbJetonLignes) return;
            rows = rows || [];
            qb.lignes = qb.lignes.concat(rows);
            qb.lignesOffset += rows.length;
            var bandeau = qb.ligneSeule
                ? '<div class="qb-avertissement qb-avertissement--info"><i class="fa-solid fa-filter"></i> Une seule ligne affichée, celle vers laquelle mène l\'incohérence. ' +
                  '<button type="button" class="user-role-filter-btn" onclick="qbVoirToutImport()">Voir tout l\'import</button></div>'
                : '';
            if (!qb.lignes.length) {
                liste.innerHTML = bandeau + '<p class="qb-vide"><i class="fa-solid fa-circle-check"></i> ' +
                    (qb.vue === 'a_valider' ? 'Plus rien à décider dans cet import.' : 'Aucune ligne dans ce filtre.') + '</p>';
            } else {
                liste.innerHTML = bandeau + qb.lignes.map(qb.vue === 'journal' && !qb.ligneSeule ? qbCarteJournal : qbCarteLigne).join('');
            }
            plus.hidden = !!qb.ligneSeule || rows.length < QB_PAGE;
        })
        .catch(function(err) { qbMessageErreur(liste, err, 'verification'); });
}

function qbLibelleVariante(v) {
    if (v === 'N') return 'Pas de variante';
    if (v === 'A') return 'Anniversaire';
    if (v === 'D') return 'Doré';
    if (v == null || v === '') return 'non renseignée';
    return '« ' + v + ' »';
}

function qbLibelleNormale(v) {
    if (v === true) return 'existe';
    if (v === false) return 'n\'existe pas';
    return 'non renseignée';
}

function qbTitreLigne(l) {
    var cle = l.cle || {};
    var b = l.billets;
    var cleTexte = [cle.Reference, (cle.Millesime || '') + (cle.Version ? '-' + cle.Version : '')].filter(Boolean).join(' ') || '(clé vide)';
    if (l.billet_id && b) return qbLienFiche(l.billet_id, qbLibelleBillet(b) || cleTexte);
    return '<span>' + qbEsc(cleTexte) + '</span>';
}

// Nos valeurs et celles du fichier côte à côte ; la case qui changerait est marquée.
function qbComparatif(l) {
    var base = l.valeurs_base || {};
    var fic = l.valeurs_fichier || {};
    var prop = l.proposition || {};
    function rangee(nom, cle, libelle) {
        var change = Object.prototype.hasOwnProperty.call(prop, cle);
        var ficVal = fic[cle];
        return '<tr' + (change ? ' class="qb-change"' : '') + '><th scope="row">' + nom + '</th>' +
            '<td>' + qbEsc(l.valeurs_base ? libelle(base[cle]) : '—') + '</td>' +
            '<td>' + (ficVal == null ? '<span class="qb-muet">ne dit rien</span>' : qbEsc(libelle(ficVal))) + '</td></tr>';
    }
    return '<div class="qb-table-wrap"><table class="qb-comparatif"><thead><tr><th></th><th scope="col">Chez nous</th><th scope="col">Le fichier</th></tr></thead><tbody>' +
        rangee('Version normale', 'VersionNormaleExiste', qbLibelleNormale) +
        rangee('Variante', 'HasVariante', qbLibelleVariante) +
        '</tbody></table></div>';
}

function qbNouveauBillet(l) {
    var c = (l.proposition && l.proposition.creer) || {};
    var champs = [
        ['Référence', c.Reference], ['Millésime', c.Millesime], ['Version', c.Version], ['Nom', c.NomBillet],
        ['Ville', c.Ville], ['Département', c.Dep], ['Pays', c.Pays], ['Thème', c.Theme],
        ['Version normale', qbLibelleNormale(c.VersionNormaleExiste)], ['Variante', qbLibelleVariante(c.HasVariante)]
    ].filter(function(x) { return x[1] != null && x[1] !== ''; });
    return '<dl class="qb-nouveau">' + champs.map(function(x) {
        return '<dt>' + qbEsc(x[0]) + '</dt><dd>' + qbEsc(x[1]) + '</dd>';
    }).join('') + '</dl>';
}

function qbEtatLigne(l) {
    if (l.statut === 'a_valider') return '';
    var txt;
    if (l.statut === 'traite' && l.applique_le) txt = '<i class="fa-solid fa-bolt"></i> Corrigé d\'office à l\'import le ' + qbEsc(qbDate(l.applique_le, true));
    else if (l.statut === 'traite') txt = '<i class="fa-solid fa-equals"></i> Rien à faire';
    else if (l.statut === 'valide') txt = '<i class="fa-solid fa-circle-check"></i> Accepté' + (l.decide_par ? ' par ' + qbEsc(l.decide_par) : '') + (l.decide_le ? ' le ' + qbEsc(qbDate(l.decide_le, true)) : '');
    else txt = '<i class="fa-solid fa-circle-xmark"></i> Refusé' + (l.decide_par ? ' par ' + qbEsc(l.decide_par) : (l.motif.indexOf('Déjà refusé') === 0 ? ' d\'office (refus antérieur)' : '')) + (l.decide_le ? ' le ' + qbEsc(qbDate(l.decide_le, true)) : '');
    return '<div class="qb-etat qb-etat--' + l.statut + '">' + txt +
        (l.commentaire ? ' : « ' + qbEsc(l.commentaire) + ' »' : '') + '</div>';
}

function qbCarteLigne(l) {
    var ecart = '<span class="qb-ecart qb-ecart--' + qbEsc(l.ecart) + '">' + qbEsc(QB_ECART_LIBELLE[l.ecart] || l.ecart) + '</span>';
    var protege = l.protege ? ' <span class="qb-ecart qb-ecart--protege" title="Des inscriptions payées, envoyées ou saisies à la main existent"><i class="fa-solid fa-lock"></i> Protégé</span>' : '';
    var corps = l.ecart === 'absent_base' ? qbNouveauBillet(l) : (l.ecart === 'ambigu' && !l.valeurs_base ? '' : qbComparatif(l));

    var decision = '';
    if (l.statut === 'a_valider') {
        var bloque = l.ecart === 'contradiction' && l.protege;
        var acceptable = ['a_completer', 'contradiction', 'absent_base'].indexOf(l.ecart) !== -1 && !bloque;
        var note = bloque
            ? '<p class="qb-note"><i class="fa-solid fa-lock"></i> Billet protégé : la base refuserait de changer une valeur déjà renseignée. Seul le refus est possible.</p>'
            : (l.ecart === 'ambigu' ? '<p class="qb-note">Un cas ambigu ne s\'accepte pas : corrigez la fiche ou le doublon à la main dans Gestion Billets, puis refusez la ligne en disant ce qui a été fait.</p>' : '');
        decision = note +
            '<div class="qb-decision">' +
                '<label class="qb-sr" for="qb-comm-' + l.id + '">Commentaire</label>' +
                '<textarea id="qb-comm-' + l.id + '" rows="2" placeholder="Commentaire (facultatif) : pourquoi vous acceptez ou refusez"></textarea>' +
                '<div class="qb-decision-boutons">' +
                    (acceptable ? '<button type="button" class="btn-admin-accept" onclick="qbDecider(' + l.id + ', \'accepter\', this)"><i class="fa-solid fa-check"></i> ' +
                        (l.ecart === 'absent_base' ? 'Créer le billet' : 'Accepter') + '</button>' : '') +
                    '<button type="button" class="btn-admin-refuse" onclick="qbDecider(' + l.id + ', \'refuser\', this)"><i class="fa-solid fa-xmark"></i> Refuser</button>' +
                '</div>' +
            '</div>';
    }

    return '<article class="qb-carte qb-carte--ligne" id="qb-ligne-' + l.id + '">' +
        '<div class="qb-carte-corps">' +
            '<div class="qb-carte-titre">' + qbTitreLigne(l) + ' ' + ecart + protege + '</div>' +
            corps +
            '<div class="qb-motif">' + qbEsc(l.motif) + '</div>' +
            qbEtatLigne(l) +
            '<details class="qb-origine"><summary>Ce que dit le fichier (' + (l.ligne_fichier || []).length + ' ligne' + ((l.ligne_fichier || []).length > 1 ? 's' : '') + ')</summary>' +
                '<pre>' + qbEsc(JSON.stringify(l.ligne_fichier, null, 2)) + '</pre></details>' +
            decision +
        '</div>' +
    '</article>';
}

// Le journal : ce que l'import a changé, ou ce qui a été décidé.
function qbCarteJournal(l) {
    var avant, apres;
    if (l.ecart === 'absent_base') {
        avant = 'aucune fiche';
        apres = l.statut === 'valide' ? 'billet créé' + (l.billet_id ? ' (n° ' + l.billet_id + ')' : '') : 'billet non créé';
    } else {
        var base = l.valeurs_base || {};
        var prop = l.proposition || {};
        var morceaux = function(src) {
            var m = [];
            if (Object.prototype.hasOwnProperty.call(prop, 'VersionNormaleExiste')) m.push('version normale ' + qbLibelleNormale(src.VersionNormaleExiste));
            if (Object.prototype.hasOwnProperty.call(prop, 'HasVariante')) m.push('variante ' + qbLibelleVariante(src.HasVariante));
            return m.join(', ') || '—';
        };
        avant = morceaux(base);
        apres = l.statut === 'refuse' ? 'inchangé (' + morceaux(prop) + ' refusé)' : morceaux(prop);
    }
    var imp = qb.imports.filter(function(i) { return String(i.id) === String(l.import_id); })[0];
    return '<article class="qb-carte qb-carte--journal">' +
        '<div class="qb-carte-corps">' +
            '<div class="qb-carte-titre">' + qbTitreLigne(l) + '</div>' +
            '<div class="qb-avant-apres"><span class="qb-avant">' + qbEsc(avant) + '</span>' +
                ' <i class="fa-solid fa-arrow-right" aria-label="devient"></i> ' +
                '<span class="qb-apres">' + qbEsc(apres) + '</span></div>' +
            qbEtatLigne(l) +
            (imp ? '<div class="qb-source">' + qbEsc(imp.source) + ', import du ' + qbEsc(qbDate(imp.importe_le)) + '</div>' : '') +
        '</div>' +
    '</article>';
}

var QB_RESULTAT = {
    valide:   { genre: 'ok',     texte: 'Accepté : la fiche est à jour.' },
    refuse:   { genre: 'ok',     texte: 'Refusé : la fiche reste telle quelle.' },
    a_revoir: { genre: 'alerte', texte: 'À revoir' },
    bloque:   { genre: 'erreur', texte: 'Refusé par la base' }
};

function qbDecider(id, decision, btn) {
    var comm = document.getElementById('qb-comm-' + id);
    var boutons = btn && btn.parentNode ? btn.parentNode.querySelectorAll('button') : [];
    Array.prototype.forEach.call(boutons, function(b) { b.disabled = true; });
    qbFlash('qb-flash-verification', '');

    qbRpc('decider_ligne_import_billet', { p_ligne_id: id, p_decision: decision, p_commentaire: comm ? comm.value : null })
        .then(function(r) {
            r = r || {};
            var info = QB_RESULTAT[r.resultat] || { genre: 'ok', texte: 'Enregistré.' };
            var texte = info.texte;
            if (r.resultat === 'valide' && r.billet_id && decision === 'accepter') {
                texte += ' ' + qbLienFiche(r.billet_id, 'Ouvrir la fiche');
            } else {
                texte = qbEsc(texte);
            }
            if (r.motif) texte += ' : ' + qbEsc(r.motif);
            qbFlash('qb-flash-verification', texte, info.genre);
            // Recompter, puis recharger la liste depuis le début : la ligne a changé de statut.
            return qbRpc('compteurs_import_billets', { p_import_id: qb.importId }).then(function(c) {
                qb.compteursImport[qb.importId] = c || {};
                qbCompteurOnglet('verification', qb.imports.reduce(function(s, i) { return s + qbAValider(i.id); }, 0));
                qbAfficherImports();
                qbChargerLignes(false);
            });
        })
        .catch(function(err) {
            Array.prototype.forEach.call(boutons, function(b) { b.disabled = false; });
            qbFlash('qb-flash-verification', '<i class="fa-solid fa-triangle-exclamation"></i> ' + qbEsc((err && err.message) || 'Erreur réseau'), 'erreur');
        });
}
