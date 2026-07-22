// ============================================================
// admin-signalements.js — Demande #5
// Boîte aux lettres des signalements d'erreur sur les billets (admin).
// ============================================================

var adminSigCurrentTab = 'nouveau';
var adminSigData = [];

document.addEventListener('DOMContentLoaded', function() {
    var waitAuth = setInterval(function() {
        if (window.userRole) {
            clearInterval(waitAuth);
            adminSigLoad();
            adminSigLoadCounts();
        }
    }, 100);
});

function adminSigChangeTab(tab) {
    adminSigCurrentTab = tab;
    ['nouveau', 'en_cours', 'traite', 'rejete'].forEach(function(t) {
        var el = document.getElementById('tab-' + t);
        if (el) el.classList.toggle('active', t === tab);
    });
    adminSigLoad();
}

// Compteurs des onglets « à traiter » (table volontairement petite : on compte les lignes)
function adminSigLoadCounts() {
    ['nouveau', 'en_cours'].forEach(function(etat) {
        supabaseFetch('/rest/v1/signalements?etat=eq.' + etat + '&select=id')
            .then(function(rows) {
                var el = document.getElementById('tab-count-' + etat);
                if (el) el.textContent = (rows || []).length;
            })
            .catch(function() {});
    });
}

function adminSigLoad() {
    var container = document.getElementById('admin-sig-content');
    container.innerHTML = '<p style="text-align:center; padding:40px; color:#666; font-style:italic;">Chargement...</p>';

    // Tri : les plus récents d'abord (par date de traitement sur les onglets clôturés)
    var ordre = (adminSigCurrentTab === 'traite' || adminSigCurrentTab === 'rejete')
        ? 'traite_at.desc' : 'created_at.desc';

    var path = '/rest/v1/signalements?etat=eq.' + adminSigCurrentTab +
               '&select=*,billets(Reference,NomBillet,Ville,Pays,Millesime,Version)' +
               '&order=' + ordre;

    supabaseFetch(path)
        .then(function(rows) {
            adminSigData = rows || [];
            adminSigRender();
        })
        .catch(function(err) {
            container.innerHTML = '<p style="text-align:center; padding:40px; color:var(--color-danger);">Erreur : ' +
                adminSigEsc(err.message || 'Erreur réseau') + '</p>';
        });
}

function adminSigRender() {
    var container = document.getElementById('admin-sig-content');

    if (adminSigData.length === 0) {
        var msg = adminSigCurrentTab === 'nouveau'  ? 'Aucun nouveau signalement.'
                : adminSigCurrentTab === 'en_cours' ? 'Aucun signalement en cours de traitement.'
                : adminSigCurrentTab === 'traite'   ? 'Aucun signalement traité.'
                : 'Aucun signalement non retenu.';
        container.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">' + msg + '</p>';
        return;
    }

    var html = '<div class="admin-sig-list">';
    adminSigData.forEach(function(s) { html += adminSigCard(s); });
    html += '</div>';
    container.innerHTML = html;
}

function adminSigCard(s) {
    var b = s.billets || {};
    var ref = b.Reference || s.billet_ref || '(billet supprimé)';
    var nom = b.NomBillet || '';
    var lieu = [b.Ville, b.Pays].filter(Boolean).join(' — ');
    var createdAt = s.created_at
        ? new Date(s.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '—';

    var actionsHtml = '';
    if (s.etat === 'nouveau') {
        actionsHtml =
            '<button class="btn-admin-accept" onclick="adminSigPrendreEnCharge(' + s.id + ')"><i class="fa-solid fa-hand"></i> Prendre en charge</button>' +
            '<button class="btn-admin-accept" onclick="adminSigCloturer(' + s.id + ', \'traite\')"><i class="fa-solid fa-check"></i> Marquer traité</button>' +
            '<button class="btn-admin-refuse" onclick="adminSigCloturer(' + s.id + ', \'rejete\')"><i class="fa-solid fa-xmark"></i> Ne pas retenir</button>';
    } else if (s.etat === 'en_cours') {
        actionsHtml =
            '<button class="btn-admin-accept" onclick="adminSigCloturer(' + s.id + ', \'traite\')"><i class="fa-solid fa-check"></i> Marquer traité</button>' +
            '<button class="btn-admin-refuse" onclick="adminSigCloturer(' + s.id + ', \'rejete\')"><i class="fa-solid fa-xmark"></i> Ne pas retenir</button>';
    } else {
        actionsHtml =
            '<button class="btn-admin-accept" onclick="adminSigRouvrir(' + s.id + ')"><i class="fa-solid fa-rotate-left"></i> Rouvrir</button>';
    }

    var clotureHtml = '';
    if (s.traite_at || s.traite_par) {
        var d = s.traite_at ? new Date(s.traite_at).toLocaleDateString('fr-FR') : '';
        clotureHtml = '<div class="admin-sig-cloture">' +
            '<i class="fa-solid fa-circle-check"></i> ' +
            (s.etat === 'rejete' ? 'Non retenu' : 'Traité') +
            (d ? ' le ' + d : '') +
            (s.traite_par ? ' par ' + adminSigEsc(s.traite_par) : '') +
            (s.auteur_vu_at ? ' · vu par l\'auteur' : '') +
            '</div>';
    }

    var reponseHtml = s.reponse_admin
        ? '<div class="admin-sig-reponse"><strong>Réponse au membre :</strong> ' + adminSigEsc(s.reponse_admin) + '</div>'
        : '';

    return '<div class="admin-sig-card">' +
        '<div class="admin-sig-header">' +
            '<div>' +
                '<h3><a href="billet.html?id=' + encodeURIComponent(s.billet_id) + '">' + adminSigEsc(ref) + '</a> ' +
                    '<span class="admin-sig-billet-nom">' + adminSigEsc(nom) + '</span></h3>' +
                (lieu ? '<div class="admin-sig-lieu">' + adminSigEsc(lieu) + '</div>' : '') +
            '</div>' +
            '<div class="admin-sig-date"><i class="fa-solid fa-clock"></i> ' + createdAt + '</div>' +
        '</div>' +
        '<div class="admin-sig-motif"><i class="fa-solid fa-flag"></i> ' +
            adminSigEsc(window.signalementMotifLabel(s.motif)) + '</div>' +
        '<div class="admin-sig-commentaire">' + adminSigEsc(s.commentaire) + '</div>' +
        '<div class="admin-sig-auteur"><i class="fa-solid fa-user"></i> ' + adminSigEsc(s.auteur_email) + '</div>' +
        reponseHtml +
        '<div class="admin-sig-footer">' +
            clotureHtml +
            '<div class="admin-sig-actions">' + actionsHtml + '</div>' +
        '</div>' +
    '</div>';
}

function adminSigPatch(id, payload) {
    return supabaseFetch('/rest/v1/signalements?id=eq.' + id, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Prefer': 'return=minimal' }
    })
    .then(function() {
        adminSigLoad();
        adminSigLoadCounts();
        if (typeof window.refreshNotifications === 'function') window.refreshNotifications(window.userRole);
    })
    .catch(function(err) {
        var msg = (err && err.message) || '';
        // 23505 = index unique partiel : ce membre a déjà un signalement ouvert sur ce billet
        // (cas typique en rouvrant un ancien signalement alors qu'il en a créé un nouveau).
        alert(/23505|duplicate/i.test(msg)
            ? 'Impossible : ce membre a déjà un signalement ouvert sur ce billet.'
            : 'Erreur : ' + (msg || 'mise à jour impossible'));
    });
}

function adminSigPrendreEnCharge(id) {
    adminSigPatch(id, { etat: 'en_cours' });
}

// Clôture (traité / non retenu) : la réponse est facultative mais visible du membre,
// qui reçoit une notification dans sa cloche (source `signalement_traite`).
function adminSigCloturer(id, etat) {
    var libelle = etat === 'traite' ? 'traité' : 'non retenu';
    var reponse = prompt('Réponse au membre (facultative, affichée dans sa notification) — signalement ' + libelle + ' :', '');
    if (reponse === null) return; // annulé
    reponse = reponse.trim();
    adminSigPatch(id, {
        etat: etat,
        reponse_admin: reponse || null,
        traite_par: (firebase.auth().currentUser && firebase.auth().currentUser.email) || null,
        traite_at: new Date().toISOString(),
        auteur_vu_at: null   // nouvelle clôture = nouvelle notification pour l'auteur
    });
}

function adminSigRouvrir(id) {
    if (!confirm('Rouvrir ce signalement ?\n\nIl repassera « en cours » et la réponse envoyée au membre sera effacée.')) return;
    adminSigPatch(id, {
        etat: 'en_cours',
        reponse_admin: null,
        traite_par: null,
        traite_at: null,
        auteur_vu_at: null
    });
}

function adminSigEsc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
        return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
}
