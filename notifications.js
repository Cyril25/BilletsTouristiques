// ============================================================
// notifications.js — Page « Nouveautés » (Demande #28)
// Liste toutes les notifications ; marque comme lues (par ce membre)
// celles qui ne l'étaient pas encore, pour vider la cloche.
// Demande #29 : badge de cible. Demande #30 : pagination.
// ============================================================

var NOTIFS_PAR_PAGE = 10;

// État de la page, partagé entre le chargement et le rendu d'une page (#30).
var notifsFiltrees = [];   // notifs visibles par l'identité active, plus récentes d'abord
var notifsVues = {};       // snapshot des notifs déjà lues AVANT ce chargement
var notifsPageCourante = 1;

if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) loadNotificationsPage();
    });
}

function escapeHtmlNotif(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text == null ? '' : String(text)));
    return div.innerHTML;
}

function loadNotificationsPage() {
    var email = window.getActiveEmail();
    if (!email) return;
    var listEl = document.getElementById('notifs-list');
    var emptyEl = document.getElementById('notifs-empty');
    if (!listEl) return;

    Promise.all([
        supabaseFetch('/rest/v1/notifications?select=id,type,titre,texte,lien,cible,created_at&order=created_at.desc'),
        supabaseFetch('/rest/v1/notifications_vues?membre_email=eq.' + encodeURIComponent(email) + '&select=notification_id'),
        window.getEffectiveNotifAudience()
    ])
    .then(function(res) {
        notifsVues = {};
        (res[1] || []).forEach(function(v) { notifsVues[v.notification_id] = true; });
        var aud = res[2] || { isAdmin: false, isCollecteur: false };
        // Filtre fidèle (utile en impersonation) : ne garder que les notifs destinées à l'identité active
        notifsFiltrees = (res[0] || []).filter(function(n) { return window.notifVisiblePour(n.cible, aud); });

        if (notifsFiltrees.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        notifsPageCourante = 1;
        renderNotifsPage();

        // Marquer comme lues (par ce membre) TOUTES les notifs visibles, pas seulement
        // celles de la page affichée : ouvrir la page vide la cloche, comme avant la #30.
        var nonLues = notifsFiltrees
            .filter(function(n) { return !notifsVues[n.id]; })
            .map(function(n) { return { notification_id: n.id, membre_email: email }; });
        if (nonLues.length > 0) {
            supabaseFetch('/rest/v1/notifications_vues', {
                method: 'POST',
                headers: { Prefer: 'resolution=ignore-duplicates' },
                body: JSON.stringify(nonLues)
            }).catch(function(e) { console.warn('Marquage notifications lues : échec', e); });
        }
    })
    .catch(function(error) {
        console.error('Erreur chargement notifications:', error);
    });
}

// Rend la page courante. Le badge « Nouveau » s'appuie sur le snapshot `notifsVues`
// pris au chargement, donc il reste stable quand on navigue entre les pages.
function renderNotifsPage() {
    var listEl = document.getElementById('notifs-list');
    if (!listEl) return;

    var debut = (notifsPageCourante - 1) * NOTIFS_PAR_PAGE;
    var pageNotifs = notifsFiltrees.slice(debut, debut + NOTIFS_PAR_PAGE);

    var html = '';
    pageNotifs.forEach(function(n) {
        var estNouveau = !notifsVues[n.id];
        var dateStr = '';
        if (n.created_at) {
            try {
                dateStr = new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            } catch (e) {}
        }

        // Demande #29 — badge de cible (rien pour les notifs « tous »)
        var cible = window.notifCibleBadge(n.cible);
        var cibleHtml = cible
            ? '<span class="notif-card-cible"><i class="fa-solid ' + cible.icone + '"></i> ' + escapeHtmlNotif(cible.label) + '</span>'
            : '';

        html += '<div class="notif-card' + (estNouveau ? ' notif-card-nouveau' : '') + '">'
            + '<div class="notif-card-head">'
            + '<span class="notif-card-titre"><i class="fa-solid fa-bullhorn"></i> ' + escapeHtmlNotif(n.titre) + '</span>'
            + cibleHtml
            + (estNouveau ? '<span class="notif-card-badge">Nouveau</span>' : '')
            + (dateStr ? '<span class="notif-card-date">' + escapeHtmlNotif(dateStr) + '</span>' : '')
            + '</div>'
            + (n.texte ? '<div class="notif-card-texte">' + escapeHtmlNotif(n.texte) + '</div>' : '')
            + (n.lien ? '<a class="notif-card-lien" href="' + escapeHtmlNotif(n.lien) + '">Y aller <i class="fa-solid fa-arrow-right"></i></a>' : '')
            + '</div>';
    });
    listEl.innerHTML = html;

    renderNotifsPagination();
}

// Contrôles de pagination (#30) — même composant visuel que la liste admin.
function renderNotifsPagination() {
    var container = document.getElementById('notifs-pagination');
    if (!container) return;

    var totalPages = Math.ceil(notifsFiltrees.length / NOTIFS_PAR_PAGE);
    if (totalPages <= 1) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Pagination');

    var html = '';
    html += '<button class="admin-pagination-btn admin-pagination-prev" aria-label="Page précédente"'
        + (notifsPageCourante === 1 ? ' disabled' : '')
        + ' data-page="' + (notifsPageCourante - 1) + '">'
        + '<i class="fa-solid fa-chevron-left"></i> Précédent</button>';

    for (var p = 1; p <= totalPages; p++) {
        html += '<button class="admin-pagination-btn admin-pagination-num'
            + (p === notifsPageCourante ? ' active' : '') + '"'
            + (p === notifsPageCourante ? ' aria-current="page"' : '')
            + ' aria-label="Page ' + p + '" data-page="' + p + '">' + p + '</button>';
    }

    html += '<button class="admin-pagination-btn admin-pagination-next" aria-label="Page suivante"'
        + (notifsPageCourante === totalPages ? ' disabled' : '')
        + ' data-page="' + (notifsPageCourante + 1) + '">'
        + 'Suivant <i class="fa-solid fa-chevron-right"></i></button>';

    html += '<span class="admin-pagination-info">'
        + notifsFiltrees.length + ' nouveauté' + (notifsFiltrees.length > 1 ? 's' : '')
        + ' — Page ' + notifsPageCourante + ' sur ' + totalPages + '</span>';

    container.innerHTML = html;
}

// Délégation : le conteneur existe au chargement, les boutons sont recréés à chaque rendu.
document.addEventListener('DOMContentLoaded', function() {
    var container = document.getElementById('notifs-pagination');
    if (!container) return;
    container.addEventListener('click', function(event) {
        var btn = event.target.closest('.admin-pagination-btn');
        if (!btn || btn.disabled) return;
        var page = parseInt(btn.getAttribute('data-page'), 10);
        var totalPages = Math.ceil(notifsFiltrees.length / NOTIFS_PAR_PAGE);
        if (!page || page < 1 || page > totalPages || page === notifsPageCourante) return;
        notifsPageCourante = page;
        renderNotifsPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
