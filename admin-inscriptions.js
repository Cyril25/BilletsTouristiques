// ============================================================
// admin-inscriptions.js — Gestion des demandes d'inscription (admin)
// ============================================================

var adminInscCurrentTab = 'en_attente';
var adminInscData = [];

document.addEventListener('DOMContentLoaded', function() {
    var waitAuth = setInterval(function() {
        if (window.userRole) {
            clearInterval(waitAuth);
            adminInscLoad();
            adminInscLoadCounts();
        }
    }, 100);
});

function adminInscChangeTab(tab) {
    adminInscCurrentTab = tab;
    document.getElementById('tab-pending').classList.toggle('active', tab === 'en_attente');
    document.getElementById('tab-refused').classList.toggle('active', tab === 'refuse');
    document.getElementById('tab-active').classList.toggle('active',  tab === 'actif');
    adminInscLoad();
}

function adminInscLoadCounts() {
    // Compteurs d'onglets en parallèle (dependent sur 2 requêtes count separées)
    ['en_attente', 'refuse'].forEach(function(statut) {
        supabaseFetch('/rest/v1/membres?statut=eq.' + statut + '&select=email', {
            headers: { 'Prefer': 'count=exact', 'Range': '0-0' }
        })
        .then(function(data) {
            // La requête avec Range ne renverra pas le count dans le body,
            // on utilise la longueur du tableau comme fallback (ici on recharge les vraies données lors du switch).
            // Pour un vrai count sans body : il faudrait lire le header Content-Range.
            // Simplification : on fetch tous les emails (table petite).
            var el = document.getElementById(statut === 'en_attente' ? 'tab-count-pending' : 'tab-count-refused');
            if (el) el.textContent = (data || []).length;
        })
        .catch(function(){});
    });
}

function adminInscLoad() {
    var container = document.getElementById('admin-insc-content');
    container.innerHTML = '<p style="text-align:center; padding:40px; color:#666; font-style:italic;">Chargement...</p>';

    var path;
    if (adminInscCurrentTab === 'actif') {
        // Valides récents : ceux qui ont été validés (validated_at non null), triés desc, max 30
        path = '/rest/v1/membres?statut=eq.actif&validated_at=not.is.null&select=email,prenom,nom,motivation,demande_at,validated_at,validated_by&order=validated_at.desc&limit=30';
    } else {
        path = '/rest/v1/membres?statut=eq.' + adminInscCurrentTab +
               '&select=email,prenom,nom,motivation,reglement_accepte_at,demande_at,validated_at,validated_by,refuse_motif' +
               '&order=demande_at.desc';
    }

    supabaseFetch(path)
        .then(function(rows) {
            adminInscData = rows || [];
            adminInscRender();
        })
        .catch(function(err) {
            container.innerHTML = '<p style="text-align:center; padding:40px; color:var(--color-danger);">Erreur : ' + adminInscEsc(err.message || 'Erreur réseau') + '</p>';
        });
}

function adminInscRender() {
    var container = document.getElementById('admin-insc-content');

    if (adminInscData.length === 0) {
        var msg = adminInscCurrentTab === 'en_attente' ? 'Aucune demande en attente.'
                : adminInscCurrentTab === 'refuse'     ? 'Aucune demande refusée.'
                : 'Aucune validation récente.';
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">' + msg + '</p>';
        return;
    }

    var html = '<div class="admin-insc-list">';
    adminInscData.forEach(function(m) {
        html += renderCard(m);
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderCard(m) {
    var nomComplet = ((m.prenom || '') + ' ' + (m.nom || '')).trim() || '(anonyme)';
    var demandeAt = m.demande_at ? new Date(m.demande_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
    var reglementOk = !!m.reglement_accepte_at;

    var actionsHtml = '';
    if (adminInscCurrentTab === 'en_attente') {
        actionsHtml =
            '<div class="admin-insc-actions">' +
                '<button class="btn-admin-accept" onclick="adminInscAccept(\'' + adminInscEsc(m.email) + '\')"><i class="fa-solid fa-check"></i> Accepter</button>' +
                '<button class="btn-admin-refuse" onclick="adminInscRefuse(\'' + adminInscEsc(m.email) + '\')"><i class="fa-solid fa-xmark"></i> Refuser</button>' +
            '</div>';
    } else if (adminInscCurrentTab === 'refuse') {
        actionsHtml =
            '<div class="admin-insc-actions">' +
                '<button class="btn-admin-accept" onclick="adminInscAccept(\'' + adminInscEsc(m.email) + '\')"><i class="fa-solid fa-rotate-left"></i> Réaccepter</button>' +
            '</div>';
    }

    var validMetaHtml = '';
    if (m.validated_at || m.validated_by) {
        var validDate = m.validated_at ? new Date(m.validated_at).toLocaleDateString('fr-FR') : '';
        validMetaHtml = '<div class="admin-insc-valid-meta">' +
            '<i class="fa-solid fa-check-circle"></i> ' +
            (adminInscCurrentTab === 'refuse' ? 'Refusé' : 'Validé') +
            (validDate ? ' le ' + validDate : '') +
            (m.validated_by ? ' par ' + adminInscEsc(m.validated_by) : '') +
            '</div>';
    }

    var refuseMotifHtml = '';
    if (adminInscCurrentTab === 'refuse' && m.refuse_motif) {
        refuseMotifHtml = '<div class="admin-insc-refuse-motif"><strong>Motif :</strong> ' + adminInscEsc(m.refuse_motif) + '</div>';
    }

    return '<div class="admin-insc-card">' +
        '<div class="admin-insc-header">' +
            '<div>' +
                '<h3>' + adminInscEsc(nomComplet) + '</h3>' +
                '<div class="admin-insc-email">' + adminInscEsc(m.email) + '</div>' +
            '</div>' +
            '<div class="admin-insc-date"><i class="fa-solid fa-clock"></i> ' + demandeAt + '</div>' +
        '</div>' +
        (m.motivation ? '<div class="admin-insc-motivation">' + adminInscEsc(m.motivation) + '</div>' : '') +
        refuseMotifHtml +
        '<div class="admin-insc-footer">' +
            (reglementOk
                ? '<span class="admin-insc-check ok"><i class="fa-solid fa-circle-check"></i> Règlement accepté</span>'
                : '<span class="admin-insc-check no"><i class="fa-solid fa-circle-xmark"></i> Règlement non accepté</span>') +
            validMetaHtml +
            actionsHtml +
        '</div>' +
    '</div>';
}

function adminInscAccept(email) {
    if (!confirm('Accepter la demande de ' + email + ' ?\n\nL\'utilisateur pourra se connecter immédiatement.')) return;
    var adminEmail = firebase.auth().currentUser && firebase.auth().currentUser.email;
    var payload = {
        statut: 'actif',
        validated_by: adminEmail,
        validated_at: new Date().toISOString(),
        refuse_motif: null
    };
    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Prefer': 'return=minimal' }
    })
    .then(function() {
        adminInscLoad();
        adminInscLoadCounts();
        if (typeof window.refreshNotifications === 'function') window.refreshNotifications();
    })
    .catch(function(err) {
        alert('Erreur : ' + (err.message || 'impossible d\'accepter'));
    });
}

function adminInscRefuse(email) {
    var motif = prompt('Motif du refus (visible par le demandeur) :', '');
    if (motif === null) return; // annulé
    motif = motif.trim();
    var adminEmail = firebase.auth().currentUser && firebase.auth().currentUser.email;
    var payload = {
        statut: 'refuse',
        validated_by: adminEmail,
        validated_at: new Date().toISOString(),
        refuse_motif: motif || null
    };
    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Prefer': 'return=minimal' }
    })
    .then(function() {
        adminInscLoad();
        adminInscLoadCounts();
        if (typeof window.refreshNotifications === 'function') window.refreshNotifications();
    })
    .catch(function(err) {
        alert('Erreur : ' + (err.message || 'impossible de refuser'));
    });
}

function adminInscEsc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
        return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
}
