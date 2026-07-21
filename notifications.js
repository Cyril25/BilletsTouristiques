// ============================================================
// notifications.js — Page « Nouveautés » (Demande #28)
// Liste toutes les notifications ; marque comme lues (par ce membre)
// celles qui ne l'étaient pas encore, pour vider la cloche.
// ============================================================

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
        supabaseFetch('/rest/v1/notifications?select=id,type,titre,texte,lien,created_at&order=created_at.desc'),
        supabaseFetch('/rest/v1/notifications_vues?membre_email=eq.' + encodeURIComponent(email) + '&select=notification_id')
    ])
    .then(function(res) {
        var notifs = res[0] || [];
        var vues = {};
        (res[1] || []).forEach(function(v) { vues[v.notification_id] = true; });

        if (notifs.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        var html = '';
        var nonLues = [];
        notifs.forEach(function(n) {
            var estNouveau = !vues[n.id];
            if (estNouveau) nonLues.push(n.id);
            var dateStr = '';
            if (n.created_at) {
                try {
                    dateStr = new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                } catch (e) {}
            }
            html += '<div class="notif-card' + (estNouveau ? ' notif-card-nouveau' : '') + '">'
                + '<div class="notif-card-head">'
                + '<span class="notif-card-titre"><i class="fa-solid fa-bullhorn"></i> ' + escapeHtmlNotif(n.titre) + '</span>'
                + (estNouveau ? '<span class="notif-card-badge">Nouveau</span>' : '')
                + (dateStr ? '<span class="notif-card-date">' + escapeHtmlNotif(dateStr) + '</span>' : '')
                + '</div>'
                + (n.texte ? '<div class="notif-card-texte">' + escapeHtmlNotif(n.texte) + '</div>' : '')
                + (n.lien ? '<a class="notif-card-lien" href="' + escapeHtmlNotif(n.lien) + '">Y aller <i class="fa-solid fa-arrow-right"></i></a>' : '')
                + '</div>';
        });
        listEl.innerHTML = html;

        // Marquer comme lues (par ce membre) toutes les notifs non encore vues
        if (nonLues.length > 0) {
            var payload = nonLues.map(function(id) { return { notification_id: id, membre_email: email }; });
            supabaseFetch('/rest/v1/notifications_vues', {
                method: 'POST',
                headers: { Prefer: 'resolution=ignore-duplicates' },
                body: JSON.stringify(payload)
            }).catch(function(e) { console.warn('Marquage notifications lues : échec', e); });
        }
    })
    .catch(function(error) {
        console.error('Erreur chargement notifications:', error);
    });
}
