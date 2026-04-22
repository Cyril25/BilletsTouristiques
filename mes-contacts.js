// ============================================================
// mes-contacts.js — Carnet de contacts prive
// ============================================================

// ============================================================
// 1. UTILITAIRES
// ============================================================
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type === 'success' || type === 'info') {
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 4000);
    }
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    }
}

function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
}

// ============================================================
// 2. ETAT
// ============================================================
var contactsData = [];        // contacts du proprietaire
var billetRefsCache = [];     // references billets pour autocomplete
var contactEnEdition = null;  // id du contact en cours d'edition, ou null = creation
var searchFilter = '';

// ============================================================
// 3. INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        chargerContacts();
        chargerBilletRefs();
    });
});

// ============================================================
// 4. CHARGEMENT DES CONTACTS
// ============================================================
function chargerContacts() {
    var listDiv = document.getElementById('contacts-list');
    if (listDiv) listDiv.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Chargement...</p>';

    supabaseFetch('/rest/v1/contacts_collecteur?select=*&order=titre.asc,nom.asc')
        .then(function(data) {
            contactsData = data || [];
            renderContacts();
        })
        .catch(function(err) {
            console.error('Erreur chargement contacts:', err);
            if (listDiv) listDiv.innerHTML = '<p style="color:#cc4444;text-align:center;padding:20px">Erreur : ' + escapeHtml(err.message) + '</p>';
        });
}

function chargerBilletRefs() {
    supabaseFetch('/rest/v1/billets?select=Reference')
        .then(function(data) {
            var seen = {};
            billetRefsCache = [];
            (data || []).forEach(function(row) {
                var ref = (row.Reference || '').trim();
                if (ref && !seen[ref]) { seen[ref] = true; billetRefsCache.push(ref); }
            });
            billetRefsCache.sort();
            var datalist = document.getElementById('contact-refs-datalist');
            if (datalist) {
                datalist.innerHTML = billetRefsCache.map(function(ref) {
                    return '<option value="' + escapeHtml(ref) + '">';
                }).join('');
            }
        })
        .catch(function() { /* autocomplete non bloquant */ });
}

// ============================================================
// 5. RENDU
// ============================================================
function renderContacts() {
    var listDiv = document.getElementById('contacts-list');
    var emptyDiv = document.getElementById('contacts-empty');
    var noMatchDiv = document.getElementById('contacts-no-match');
    if (!listDiv || !emptyDiv || !noMatchDiv) return;

    if (contactsData.length === 0) {
        listDiv.innerHTML = '';
        listDiv.style.display = 'none';
        emptyDiv.style.display = '';
        noMatchDiv.style.display = 'none';
        return;
    }

    var filtered = contactsData;
    if (searchFilter) {
        var q = searchFilter.toLowerCase();
        filtered = contactsData.filter(function(c) {
            var blob = [c.titre, c.nom, c.prenom, c.societe, c.email, c.telephone, c.adresse, c.references_billets, c.commentaire]
                .filter(function(s) { return s; }).join(' ').toLowerCase();
            return blob.indexOf(q) !== -1;
        });
    }

    if (filtered.length === 0) {
        listDiv.innerHTML = '';
        listDiv.style.display = 'none';
        emptyDiv.style.display = 'none';
        noMatchDiv.style.display = '';
        return;
    }

    emptyDiv.style.display = 'none';
    noMatchDiv.style.display = 'none';
    listDiv.style.display = '';

    var html = filtered.map(function(c) {
        var nomComplet = [c.prenom, c.nom].filter(function(s) { return s; }).join(' ');
        var titre = c.titre || nomComplet || '(sans titre)';
        var meta = [];
        if (c.email) meta.push('<span><i class="fa-solid fa-envelope"></i> ' + escapeHtml(c.email) + '</span>');
        if (c.telephone) meta.push('<span><i class="fa-solid fa-phone"></i> ' + escapeHtml(c.telephone) + '</span>');
        return '<div class="contact-card" data-id="' + c.id + '" onclick="ouvrirContactModal(' + c.id + ')">' +
            '<div class="contact-card-title"><i class="fa-solid fa-lock" title="Privé"></i> ' + escapeHtml(titre) + '</div>' +
            (nomComplet && c.titre ? '<div class="contact-card-name">' + escapeHtml(nomComplet) + '</div>' : '') +
            (c.societe ? '<div class="contact-card-societe">' + escapeHtml(c.societe) + '</div>' : '') +
            (meta.length ? '<div class="contact-card-meta">' + meta.join('') + '</div>' : '') +
            (c.references_billets ? '<div class="contact-card-refs"><i class="fa-solid fa-ticket"></i> ' + escapeHtml(c.references_billets) + '</div>' : '') +
            '</div>';
    }).join('');

    listDiv.innerHTML = html;
}

function filtrerContacts() {
    var input = document.getElementById('contacts-search-input');
    searchFilter = input ? input.value.trim() : '';
    renderContacts();
}

// ============================================================
// 6. MODALE CREATION / EDITION
// ============================================================
function ouvrirContactModal(id) {
    contactEnEdition = id;
    var overlay = document.getElementById('contact-modal-overlay');
    var titre = document.getElementById('contact-modal-titre');
    var deleteBtn = document.getElementById('contact-modal-delete-btn');

    var champs = {
        'contact-titre': '',
        'contact-nom': '',
        'contact-prenom': '',
        'contact-societe': '',
        'contact-email': '',
        'contact-telephone': '',
        'contact-adresse': '',
        'contact-references': '',
        'contact-commentaire': ''
    };

    if (id) {
        var c = contactsData.find(function(x) { return x.id === id; });
        if (c) {
            champs['contact-titre']       = c.titre || '';
            champs['contact-nom']         = c.nom || '';
            champs['contact-prenom']      = c.prenom || '';
            champs['contact-societe']     = c.societe || '';
            champs['contact-email']       = c.email || '';
            champs['contact-telephone']   = c.telephone || '';
            champs['contact-adresse']     = c.adresse || '';
            champs['contact-references']  = c.references_billets || '';
            champs['contact-commentaire'] = c.commentaire || '';
        }
        if (titre) titre.textContent = 'Modifier le contact';
        if (deleteBtn) deleteBtn.style.display = '';
    } else {
        if (titre) titre.textContent = 'Nouveau contact';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }

    Object.keys(champs).forEach(function(key) {
        var el = document.getElementById(key);
        if (el) el.value = champs[key];
    });

    if (overlay) overlay.style.display = 'flex';
    setTimeout(function() {
        var focusEl = document.getElementById('contact-titre');
        if (focusEl) focusEl.focus();
    }, 50);
}

function fermerContactModal() {
    var overlay = document.getElementById('contact-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    contactEnEdition = null;
}

// ============================================================
// 7. ENREGISTREMENT
// ============================================================
function enregistrerContact() {
    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    var payload = {
        titre:              val('contact-titre'),
        nom:                val('contact-nom'),
        prenom:             val('contact-prenom'),
        societe:            val('contact-societe'),
        email:              val('contact-email'),
        telephone:          val('contact-telephone'),
        adresse:            val('contact-adresse'),
        references_billets: val('contact-references'),
        commentaire:        val('contact-commentaire')
    };

    // Verification : au moins un champ rempli
    var auMoinsUn = Object.keys(payload).some(function(k) { return payload[k]; });
    if (!auMoinsUn) {
        showToast('Renseignez au moins un champ', 'error');
        return;
    }

    if (contactEnEdition) {
        // PATCH
        supabaseFetch('/rest/v1/contacts_collecteur?id=eq.' + contactEnEdition, {
            method: 'PATCH',
            body: JSON.stringify(payload),
            headers: { 'Prefer': 'return=representation' }
        })
        .then(function() {
            showToast('Contact mis à jour', 'success');
            fermerContactModal();
            chargerContacts();
        })
        .catch(function(err) {
            console.error('Erreur PATCH contact:', err);
            showToast('Erreur : ' + err.message, 'error');
        });
    } else {
        // POST
        var user = firebase.auth().currentUser;
        if (!user) { showToast('Session expirée', 'error'); return; }
        payload.proprietaire_email = user.email;

        supabaseFetch('/rest/v1/contacts_collecteur', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Prefer': 'return=representation' }
        })
        .then(function() {
            showToast('Contact ajouté', 'success');
            fermerContactModal();
            chargerContacts();
        })
        .catch(function(err) {
            console.error('Erreur POST contact:', err);
            showToast('Erreur : ' + err.message, 'error');
        });
    }
}

// ============================================================
// 8. SUPPRESSION
// ============================================================
function supprimerContact() {
    if (!contactEnEdition) return;
    var c = contactsData.find(function(x) { return x.id === contactEnEdition; });
    var label = c ? (c.titre || [c.prenom, c.nom].filter(function(s) { return s; }).join(' ') || 'ce contact') : 'ce contact';
    if (!confirm('Supprimer définitivement « ' + label + ' » ?')) return;

    supabaseFetch('/rest/v1/contacts_collecteur?id=eq.' + contactEnEdition, {
        method: 'DELETE'
    })
    .then(function() {
        showToast('Contact supprimé', 'success');
        fermerContactModal();
        chargerContacts();
    })
    .catch(function(err) {
        console.error('Erreur DELETE contact:', err);
        showToast('Erreur : ' + err.message, 'error');
    });
}

// ============================================================
// 9. EXPORT CSV
// ============================================================
function exporterContactsCsv() {
    if (contactsData.length === 0) {
        showToast('Aucun contact à exporter', 'info');
        return;
    }

    var headers = ['Titre', 'Nom', 'Prénom', 'Société', 'Email', 'Téléphone', 'Adresse', 'Référence(s) billet', 'Commentaire', 'Créé le', 'Modifié le'];
    var cols = ['titre', 'nom', 'prenom', 'societe', 'email', 'telephone', 'adresse', 'references_billets', 'commentaire', 'created_at', 'updated_at'];

    function csvCell(val) {
        if (val == null) return '';
        var s = String(val);
        // Echappement CSV : doubler les guillemets, entourer de guillemets si virgule/guillemet/saut de ligne
        if (s.indexOf('"') !== -1 || s.indexOf(',') !== -1 || s.indexOf('\n') !== -1 || s.indexOf(';') !== -1) {
            s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    var lines = [headers.map(csvCell).join(',')];
    contactsData.forEach(function(c) {
        lines.push(cols.map(function(col) { return csvCell(c[col]); }).join(','));
    });

    // BOM UTF-8 pour Excel
    var csv = '﻿' + lines.join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var stamp = new Date().toISOString().slice(0, 10);
    a.download = 'mes-contacts-' + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Export généré (' + contactsData.length + ' contacts)', 'success');
}
