// ============================================================
// admin-notifications.js — Composition des notifications (Demande #51)
// ------------------------------------------------------------
// Avant cet écran, publier une nouveauté exigeait un accès à la base de
// production : les 23 annonces de diffusion existantes ont toutes été écrites
// à la main en SQL. La demande #33 n'avait livré que la plomberie (colonne
// `cible_email` + policy) et un usage automatique.
//
// Périmètre : ÉTAGE 1 de la spec — annonces de DIFFUSION (tous / collecteurs /
// admins). L'étage 2 (cibler un ou plusieurs membres nommés) attend l'arbitrage
// du point 1 de la spec : la policy de #33 masque une notif privée à TOUS les
// admins, y compris son auteur, qui ne pourrait donc ni la relire ni la
// corriger. Voir specs/evolutions/demande-51-ecran-composition-notifications.md
//
// Réservé aux admins (data-require-admin + policies is_admin_ou_superadmin()).
// ============================================================

// ============================================================
// 1. TOAST
// ============================================================
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    if (type === 'success' || type === 'info') {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    }
}

// ============================================================
// 2. UTILITAIRES
// ============================================================
function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text == null ? '' : String(text)));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateFr(isoString) {
    if (!isoString) return '';
    try {
        return new Date(isoString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {
        return '';
    }
}

// Même règle que la cloche du menu (global.js, demande #46) : 110 caractères.
// Dupliquée volontairement plutôt qu'exportée — si la cloche change, l'aperçu
// doit être revu en même temps, et un écart se voit ici tout de suite.
var ACCROCHE_MAX = 110;
function accrocheNotif(txt) {
    var t = (txt == null ? '' : String(txt)).replace(/\s+/g, ' ').trim();
    return t.length > ACCROCHE_MAX ? (t.slice(0, ACCROCHE_MAX - 1) + '…') : t;
}

// ============================================================
// 3. RÉFÉRENTIELS
// ============================================================
// Les trois niveaux de diffusion posés par migration-notif-cibles-3-niveaux.sql.
// Le libellé « qui reçoit » reprend mot pour mot la policy, pour qu'on n'ait pas
// à aller la lire pour savoir à qui on parle.
var CIBLES = [
    {
        value: 'tous',
        label: 'Tous les membres',
        icone: 'fa-users',
        recoivent: 'Tous les membres, collecteurs et admins compris.'
    },
    {
        value: 'collecteurs',
        label: 'Collecteurs',
        icone: 'fa-user-group',
        recoivent: 'Les collecteurs, plus les admins et superadmins.'
    },
    {
        value: 'admins',
        label: 'Admins',
        icone: 'fa-user-shield',
        recoivent: 'Les admins et superadmins uniquement.'
    }
];

function getCibleDef(value) {
    for (var i = 0; i < CIBLES.length; i++) {
        if (CIBLES[i].value === value) return CIBLES[i];
    }
    return { value: value, label: value || 'tous', icone: 'fa-user-tag', recoivent: '' };
}

// Critère d'acceptation de la spec : « le champ lien propose les pages du site
// plutôt qu'une saisie libre — une URL fautive donne une annonce qui mène
// nulle part ». Liste alignée sur menu.html.
var PAGES_SITE = [
    { groupe: 'Public', pages: [
        { url: 'index.html',                 label: 'Accueil' },
        { url: 'billets.html',               label: 'Les billets' },
        { url: 'frais-port.html',            label: 'Frais de port' },
        { url: 'reglement.html',             label: 'Règlement' },
        { url: 'infos-collecteurs.html',     label: 'Infos Collecteurs' },
        { url: 'contact.html',               label: 'Qui contacter ?' },
        { url: 'liens.html',                 label: 'Liens Utiles' },
        { url: 'partager.html',              label: 'Partager le site' }
    ]},
    { groupe: 'Mon espace', pages: [
        { url: 'mes-inscriptions.html',      label: 'Mes inscriptions' },
        { url: 'mes-collectes.html',         label: 'Mes collectes' },
        { url: 'mes-contacts.html',          label: 'Mes contacts' },
        { url: 'ma-collection.html',         label: 'Ma collection' },
        { url: 'notifications.html',         label: 'Nouveautés' },
        { url: 'profil.html',                label: 'Mon profil' }
    ]},
    { groupe: 'Administration', pages: [
        { url: 'admin-stats.html',           label: 'Statistiques' },
        { url: 'admin.html',                 label: 'Gestion Billets' },
        { url: 'users.html',                 label: 'Gestion Membres' },
        { url: 'collecteurs.html',           label: 'Gestion Collecteurs' },
        { url: 'admin-fdp.html',             label: 'Gestion Frais de Port' },
        { url: 'admin-pre-inscriptions.html', label: 'Gestion Pré-inscriptions' },
        { url: 'admin-inscriptions.html',    label: "Demandes d'inscription" },
        { url: 'admin-demandes.html',        label: 'Gestion Demandes' },
        { url: 'admin-signalements.html',    label: 'Signalements' },
        { url: 'admin-notifications.html',   label: 'Composer une notification' }
    ]}
];

// Libelle lisible d'un lien ; une page inconnue s'affiche telle quelle.
function labelPage(url) {
    if (!url) return '';
    return labelPageConnue(url) || url;
}

// ============================================================
// 4. DONNÉES EN MÉMOIRE
// ============================================================
var notifsAdmin = [];
var currentCibleFilter = 'toutes';
var editingNotifId = null;
var deletingNotifId = null;

// ============================================================
// 5. INITIALISATION
// ============================================================
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            populateCibleSelect();
            populateLienSelect(null);
            loadNotifsAdmin();
        }
    });
}

function populateCibleSelect() {
    var select = document.getElementById('na-cible');
    if (!select) return;
    select.innerHTML = CIBLES.map(function(c) {
        return '<option value="' + escapeAttr(c.value) + '">' + escapeHtml(c.label) + '</option>';
    }).join('');
}

// `lienCourant` : si l'annonce éditée porte un lien absent de la liste (ancre,
// page retirée depuis…), on l'ajoute en tête plutôt que de l'écraser en silence.
function populateLienSelect(lienCourant) {
    var select = document.getElementById('na-lien');
    if (!select) return;

    var html = '<option value="">— Aucun lien —</option>';

    var connu = !lienCourant || !!labelPageConnue(lienCourant);
    if (!connu) {
        html += '<option value="' + escapeAttr(lienCourant) + '">'
             + escapeHtml(lienCourant) + ' (valeur actuelle)</option>';
    }

    PAGES_SITE.forEach(function(g) {
        html += '<optgroup label="' + escapeAttr(g.groupe) + '">';
        g.pages.forEach(function(p) {
            html += '<option value="' + escapeAttr(p.url) + '">' + escapeHtml(p.label) + '</option>';
        });
        html += '</optgroup>';
    });

    select.innerHTML = html;
}

function labelPageConnue(url) {
    for (var g = 0; g < PAGES_SITE.length; g++) {
        var pages = PAGES_SITE[g].pages;
        for (var p = 0; p < pages.length; p++) {
            if (pages[p].url === url) return pages[p].label;
        }
    }
    return null;
}

// ============================================================
// 6. CHARGEMENT
// ============================================================
// `cible_email=is.null` : on ne liste que les annonces de diffusion. Les notifs
// privées reçues par l'admin lui-même (suivi de ses propres demandes, #33)
// remonteraient sinon dans un écran de gestion où elles n'ont rien à faire.
function loadNotifsAdmin() {
    supabaseFetch('/rest/v1/notifications?select=*&cible_email=is.null&order=created_at.desc')
        .then(function(rows) {
            notifsAdmin = rows || [];
            renderCibleFilter();
            renderNotifsAdmin();
        })
        .catch(function(error) {
            showToast('Erreur chargement des annonces : ' + error.message, 'error');
            console.error('Erreur chargement notifications (admin):', error);
        });
}

// ============================================================
// 7. FILTRES
// ============================================================
function renderCibleFilter() {
    var wrap = document.getElementById('notifadm-cible-filter');
    if (!wrap) return;

    var counts = {};
    notifsAdmin.forEach(function(n) {
        var c = n.cible || 'tous';
        counts[c] = (counts[c] || 0) + 1;
    });

    var html = filterBtnHtml('toutes', 'Toutes', notifsAdmin.length);
    CIBLES.forEach(function(c) {
        html += filterBtnHtml(c.value, c.label, counts[c.value] || 0);
    });
    wrap.innerHTML = html;
}

function filterBtnHtml(value, label, count) {
    var active = (currentCibleFilter === value) ? ' active' : '';
    return '<button type="button" class="user-role-filter-btn' + active + '" onclick="filtrerParCible(\'' + value + '\')">'
        + escapeHtml(label) + ' (' + count + ')</button>';
}

function filtrerParCible(value) {
    currentCibleFilter = value;
    renderCibleFilter();
    renderNotifsAdmin();
}

function clearNotifSearch() {
    var input = document.getElementById('notifadm-search-input');
    if (input) input.value = '';
    renderNotifsAdmin();
}

function getNotifsFiltrees() {
    var searchInput = document.getElementById('notifadm-search-input');
    var terme = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var clearBtn = document.getElementById('notifadm-search-clear');
    if (clearBtn) clearBtn.style.display = terme ? '' : 'none';

    return notifsAdmin.filter(function(n) {
        if (currentCibleFilter !== 'toutes' && (n.cible || 'tous') !== currentCibleFilter) return false;
        if (!terme) return true;
        var texte = ((n.titre || '') + ' ' + (n.texte || '')).toLowerCase();
        return texte.indexOf(terme) !== -1;
    });
}

// ============================================================
// 8. RENDU DE LA LISTE
// ============================================================
function renderNotifsAdmin() {
    var list = document.getElementById('notifadm-list');
    var emptyState = document.getElementById('notifadm-empty-state');
    var countEl = document.getElementById('notifadm-count');
    if (!list) return;

    var notifs = getNotifsFiltrees();

    if (countEl) {
        countEl.textContent = notifs.length + ' annonce' + (notifs.length > 1 ? 's' : '');
    }

    if (notifs.length === 0) {
        list.innerHTML = '';
        if (emptyState) emptyState.style.display = '';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    var html = '';
    notifs.forEach(function(n) {
        var cible = getCibleDef(n.cible || 'tous');
        var dateStr = formatDateFr(n.created_at);

        html += '<div class="notifadm-card">'
            + '<div class="notifadm-card-head">'
            + '<span class="notifadm-card-titre"><i class="fa-solid fa-bullhorn"></i> ' + escapeHtml(n.titre) + '</span>'
            + '<span class="notifadm-card-cible"><i class="fa-solid ' + escapeAttr(cible.icone) + '"></i> ' + escapeHtml(cible.label) + '</span>'
            + (dateStr ? '<span class="notifadm-card-date">' + escapeHtml(dateStr) + '</span>' : '')
            + '</div>'
            + (n.texte ? '<div class="notifadm-card-texte">' + escapeHtml(n.texte) + '</div>' : '')
            + (n.lien ? '<span class="notifadm-card-lien"><i class="fa-solid fa-arrow-right"></i> ' + escapeHtml(labelPage(n.lien)) + '</span>' : '')
            + '<div class="notifadm-card-actions">'
            + '<button type="button" class="notifadm-action" onclick="ouvrirModaleNotif(&#39;' + escapeAttr(n.id) + '&#39;)"><i class="fa-solid fa-pen"></i> Modifier</button>'
            + '<button type="button" class="notifadm-action notifadm-action--danger" onclick="ouvrirModaleSuppressionNotif(&#39;' + escapeAttr(n.id) + '&#39;)"><i class="fa-solid fa-trash"></i> Supprimer</button>'
            + '</div>'
            + '</div>';
    });
    list.innerHTML = html;
}

// ============================================================
// 9. MODALE DE COMPOSITION
// ============================================================
function getNotifById(id) {
    for (var i = 0; i < notifsAdmin.length; i++) {
        if (notifsAdmin[i].id === id) return notifsAdmin[i];
    }
    return null;
}

function ouvrirModaleNotif(id) {
    editingNotifId = id;
    var n = id ? getNotifById(id) : null;

    var titreEl = document.getElementById('na-titre');
    var texteEl = document.getElementById('na-texte');
    var cibleEl = document.getElementById('na-cible');
    var metaEl = document.getElementById('na-meta');
    var modalTitle = document.getElementById('notifadm-modal-title');
    var saveBtn = document.getElementById('na-save-btn');

    populateLienSelect(n ? n.lien : null);
    var lienEl = document.getElementById('na-lien');

    if (titreEl) titreEl.value = n ? (n.titre || '') : '';
    if (texteEl) texteEl.value = n ? (n.texte || '') : '';
    if (cibleEl) cibleEl.value = n ? (n.cible || 'tous') : 'tous';
    if (lienEl) lienEl.value = n ? (n.lien || '') : '';

    if (modalTitle) modalTitle.textContent = n ? 'Modifier l\'annonce' : 'Nouvelle annonce';
    if (saveBtn) saveBtn.textContent = n ? 'Enregistrer' : 'Publier';

    if (metaEl) {
        if (n) {
            metaEl.style.display = '';
            metaEl.textContent = 'Publiée le ' + formatDateFr(n.created_at)
                + ' · type « ' + (n.type || 'nouveaute') + ' » · id ' + String(n.id).slice(0, 8);
        } else {
            metaEl.style.display = 'none';
            metaEl.textContent = '';
        }
    }

    rafraichirApercu();
    var overlay = document.getElementById('notifadm-modal-overlay');
    if (overlay) overlay.style.display = '';
    if (titreEl) titreEl.focus();
}

function fermerModaleNotif() {
    editingNotifId = null;
    var overlay = document.getElementById('notifadm-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Aperçu : les deux endroits où la notification apparaîtra réellement.
// Le but est d'éviter le titre qui déborde dans la cloche et le texte qu'on
// croyait court — le seul retour possible avant cet écran était de publier.
function rafraichirApercu() {
    var titre = (document.getElementById('na-titre') || {}).value || '';
    var texte = (document.getElementById('na-texte') || {}).value || '';
    var cibleVal = (document.getElementById('na-cible') || {}).value || 'tous';
    var lien = (document.getElementById('na-lien') || {}).value || '';

    // Compteurs de longueur
    var titreCompteur = document.getElementById('na-titre-compteur');
    if (titreCompteur) {
        titreCompteur.textContent = titre.length + ' / 120';
        titreCompteur.className = 'notifadm-compteur' + (titre.length > 70 ? ' notifadm-compteur--long' : '');
    }
    var texteCompteur = document.getElementById('na-texte-compteur');
    if (texteCompteur) {
        var reste = texte.trim().length;
        texteCompteur.textContent = reste + ' caractère' + (reste > 1 ? 's' : '');
        texteCompteur.className = 'notifadm-compteur';
    }

    // Rappel de qui reçoit
    var cibleHint = document.getElementById('na-cible-hint');
    if (cibleHint) cibleHint.textContent = getCibleDef(cibleVal).recoivent;

    // Aperçu cloche
    var clocheEl = document.getElementById('na-apercu-cloche');
    if (clocheEl) {
        if (!titre.trim() && !texte.trim()) {
            clocheEl.innerHTML = '<p class="notifadm-apercu-vide">Le titre et le texte apparaîtront ici.</p>';
        } else {
            var aujourdhui = formatDateFr(new Date().toISOString());
            clocheEl.innerHTML = '<div class="notifadm-apercu-cloche">'
                + '<div class="notifadm-apercu-cloche-titre"><i class="fa-solid fa-bullhorn"></i> '
                + escapeHtml(titre || '(sans titre)') + '</div>'
                + '<div class="notifadm-apercu-cloche-meta">' + escapeHtml(accrocheNotif(texte))
                + (aujourdhui ? ' · ' + escapeHtml(aujourdhui) : '') + '</div>'
                + '</div>';
        }
    }

    // Aperçu page Nouveautés
    var pageEl = document.getElementById('na-apercu-page');
    if (pageEl) {
        if (!titre.trim() && !texte.trim()) {
            pageEl.innerHTML = '<p class="notifadm-apercu-vide">La carte de la page Nouveautés apparaîtra ici.</p>';
        } else {
            var cible = getCibleDef(cibleVal);
            var badge = (cibleVal === 'tous') ? ''   // #29 : pas de badge pour « tous »
                : '<span class="notifadm-card-cible"><i class="fa-solid ' + escapeAttr(cible.icone) + '"></i> '
                  + escapeHtml(cible.label) + '</span>';
            pageEl.innerHTML = '<div class="notifadm-card" style="border-left-color:#5D3A7E;background:#faf7fe;">'
                + '<div class="notifadm-card-head">'
                + '<span class="notifadm-card-titre"><i class="fa-solid fa-bullhorn"></i> '
                + escapeHtml(titre || '(sans titre)') + '</span>'
                + badge
                + '</div>'
                + (texte ? '<div class="notifadm-card-texte">' + escapeHtml(texte) + '</div>' : '')
                + (lien ? '<span class="notifadm-card-lien">Y aller <i class="fa-solid fa-arrow-right"></i> ('
                          + escapeHtml(labelPage(lien)) + ')</span>' : '')
                + '</div>';
        }
    }
}

function sauverNotif() {
    var titre = ((document.getElementById('na-titre') || {}).value || '').trim();
    var texte = ((document.getElementById('na-texte') || {}).value || '').trim();
    var cible = (document.getElementById('na-cible') || {}).value || 'tous';
    var lien  = ((document.getElementById('na-lien') || {}).value || '').trim();

    if (!titre) { showToast('Le titre est obligatoire.', 'error'); return; }
    if (!texte) { showToast('Le texte est obligatoire.', 'error'); return; }

    var saveBtn = document.getElementById('na-save-btn');
    var labelInitial = saveBtn ? saveBtn.textContent : '';
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Envoi…'; }

    var payload = {
        titre: titre,
        texte: texte,
        cible: cible,
        lien: lien || null
    };

    var requete;
    if (editingNotifId) {
        // `type` et `created_at` ne sont pas touchés : une correction de texte ne
        // doit pas faire remonter l'annonce en tête ni la re-signaler comme neuve.
        requete = supabaseFetch('/rest/v1/notifications?id=eq.' + encodeURIComponent(editingNotifId), {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify(payload)
        });
    } else {
        payload.type = 'nouveaute';
        requete = supabaseFetch('/rest/v1/notifications', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify(payload)
        });
    }

    requete
        .then(function() {
            showToast(editingNotifId ? 'Annonce modifiée.' : 'Annonce publiée.', 'success');
            fermerModaleNotif();
            loadNotifsAdmin();
        })
        .catch(function(error) {
            showToast('Erreur : ' + error.message, 'error');
            console.error('Erreur sauvegarde notification:', error);
        })
        .then(function() {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = labelInitial; }
        });
}

// ============================================================
// 10. SUPPRESSION
// ============================================================
function ouvrirModaleSuppressionNotif(id) {
    deletingNotifId = id;
    var n = getNotifById(id);
    var desc = document.getElementById('notifadm-delete-desc');
    if (desc) {
        desc.textContent = n
            ? 'L’annonce « ' + n.titre + ' » disparaîtra de la cloche et de la page Nouveautés pour tous les membres.'
            : 'L’annonce disparaîtra de la cloche et de la page Nouveautés pour tous les membres.';
    }
    var overlay = document.getElementById('notifadm-delete-modal-overlay');
    if (overlay) overlay.style.display = '';
}

function fermerModaleSuppressionNotif() {
    deletingNotifId = null;
    var overlay = document.getElementById('notifadm-delete-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function confirmerSuppressionNotif() {
    if (!deletingNotifId) return;
    var id = deletingNotifId;

    supabaseFetch('/rest/v1/notifications?id=eq.' + encodeURIComponent(id), { method: 'DELETE' })
        .then(function() {
            showToast('Annonce supprimée.', 'success');
            fermerModaleSuppressionNotif();
            fermerModaleNotif();
            loadNotifsAdmin();
        })
        .catch(function(error) {
            showToast('Erreur suppression : ' + error.message, 'error');
            console.error('Erreur suppression notification:', error);
        });
}

// Échap ferme la modale ouverte (suppression d'abord, puis composition).
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var del = document.getElementById('notifadm-delete-modal-overlay');
    if (del && del.style.display !== 'none') { fermerModaleSuppressionNotif(); return; }
    var modal = document.getElementById('notifadm-modal-overlay');
    if (modal && modal.style.display !== 'none') fermerModaleNotif();
});
