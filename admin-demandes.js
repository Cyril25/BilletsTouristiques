// ============================================================
// admin-demandes.js — BilletsTouristiques Gestion des demandes (B0)
// Registre des demandes d'amélioration/correction (remplace le
// Google Sheet). Réservé aux admins (RLS is_admin()).
// ============================================================

// ============================================================
// 1. TOAST NOTIFICATIONS
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
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateFr(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================
// 3. RÉFÉRENTIELS
// ============================================================
var ETATS = [
    { value: 'nouvelle',   label: 'Nouvelle',   color: '#1976D2' },
    { value: 'a_cadrer',   label: 'À cadrer',   color: '#EF6C00' },
    { value: 'validee',    label: 'Validée',    color: '#6A1B9A' },
    { value: 'en_cours',   label: 'En cours',   color: '#00838F' },
    { value: 'a_tester',   label: 'À tester',   color: '#C2185B' },
    { value: 'terminee',   label: 'Terminée',   color: '#2E7D32' },
    { value: 'abandonnee', label: 'Abandonnée', color: '#757575' }
];

// États considérés comme « actifs » (filtre par défaut)
var ETATS_ACTIFS = ['nouvelle', 'a_cadrer', 'validee', 'en_cours', 'a_tester'];

var PRIORITE_LABELS = { haute: 'Haute', normale: 'Normale', basse: 'Basse' };
var PRIORITE_ORDER = { haute: 0, normale: 1, basse: 2 };
var QUI_VALUES = ['membres', 'collecteurs', 'admins'];
var QUI_LABELS = { membres: 'Membres', collecteurs: 'Collecteurs', admins: 'Admins' };

// qui = liste séparée par des virgules (ancienne valeur 'tous' = les trois)
function parseQui(qui) {
    if (!qui || qui === 'tous') return QUI_VALUES.slice();
    return qui.split(',').filter(function(v) { return QUI_VALUES.indexOf(v) !== -1; });
}

function quiLabel(qui) {
    var values = parseQui(qui);
    if (values.length === QUI_VALUES.length) return 'Tous';
    return values.map(function(v) { return QUI_LABELS[v]; }).join(' + ');
}

function getEtatDef(value) {
    for (var i = 0; i < ETATS.length; i++) {
        if (ETATS[i].value === value) return ETATS[i];
    }
    return { value: value, label: value, color: '#757575' };
}

// ============================================================
// 4. DONNÉES EN MÉMOIRE
// ============================================================
var demandesList = [];
var currentEtatFilter = 'actives';
var editingDemandeId = null;

// ============================================================
// 5. INITIALISATION
// ============================================================
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            populateEtatSelect();
            loadDemandes();
        }
    });
}

function populateEtatSelect() {
    var select = document.getElementById('dm-etat');
    if (!select) return;
    select.innerHTML = ETATS.map(function(e) {
        return '<option value="' + e.value + '">' + escapeHtml(e.label) + '</option>';
    }).join('');
}

// ============================================================
// 6. CHARGEMENT DEPUIS SUPABASE
// ============================================================
function loadDemandes() {
    supabaseFetch('/rest/v1/demandes?select=*&order=created_at.desc', { method: 'GET' })
        .then(function(rows) {
            demandesList = rows || [];
            renderEtatFilter();
            renderDemandes();
        })
        .catch(function(error) {
            showToast('Erreur chargement demandes : ' + error.message, 'error');
            console.error('Erreur chargement demandes:', error);
        });
}

// ============================================================
// 7. FILTRES
// ============================================================
function renderEtatFilter() {
    var wrap = document.getElementById('demande-etat-filter');
    if (!wrap) return;

    var counts = {};
    var nbActives = 0;
    demandesList.forEach(function(d) {
        counts[d.etat] = (counts[d.etat] || 0) + 1;
        if (ETATS_ACTIFS.indexOf(d.etat) !== -1) nbActives++;
    });

    var html = filterBtnHtml('actives', 'Actives', nbActives);
    ETATS.forEach(function(e) {
        html += filterBtnHtml(e.value, e.label, counts[e.value] || 0);
    });
    html += filterBtnHtml('toutes', 'Toutes', demandesList.length);
    wrap.innerHTML = html;
}

function filterBtnHtml(value, label, count) {
    var active = (currentEtatFilter === value) ? ' active' : '';
    return '<button type="button" class="user-role-filter-btn' + active + '" onclick="filtrerParEtat(\'' + value + '\')">'
        + escapeHtml(label) + ' (' + count + ')</button>';
}

function filtrerParEtat(value) {
    currentEtatFilter = value;
    renderEtatFilter();
    renderDemandes();
}

function clearDemandeSearch() {
    var input = document.getElementById('demande-search-input');
    if (input) input.value = '';
    renderDemandes();
}

function getDemandesFiltrees() {
    var searchInput = document.getElementById('demande-search-input');
    var terme = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var clearBtn = document.getElementById('demande-search-clear');
    if (clearBtn) clearBtn.style.display = terme ? '' : 'none';

    return demandesList.filter(function(d) {
        if (currentEtatFilter === 'actives') {
            if (ETATS_ACTIFS.indexOf(d.etat) === -1) return false;
        } else if (currentEtatFilter !== 'toutes') {
            if (d.etat !== currentEtatFilter) return false;
        }
        if (!terme) return true;
        var texte = (d.description + ' ' + d.commentaire + ' ' + d.ecran + ' ' + d.demandeur).toLowerCase();
        return texte.indexOf(terme) !== -1;
    });
}

// ============================================================
// 8. RENDU DU TABLEAU (tri par colonnes)
// ============================================================
var COMPLEXITE_ORDER = { 'S': 0, 'M': 1, 'L': 2, '': 3 };
var sortState = { key: 'priorite', dir: 1 };

function getEtatIndex(etat) {
    for (var i = 0; i < ETATS.length; i++) {
        if (ETATS[i].value === etat) return i;
    }
    return ETATS.length;
}

function getSortValue(d, key) {
    switch (key) {
        case 'etat': return getEtatIndex(d.etat);
        case 'priorite': return PRIORITE_ORDER[d.priorite] !== undefined ? PRIORITE_ORDER[d.priorite] : 1;
        case 'complexite': return COMPLEXITE_ORDER[d.complexite] !== undefined ? COMPLEXITE_ORDER[d.complexite] : 3;
        case 'ecran': return (d.ecran || '').toLowerCase();
        case 'demandeur': return (d.demandeur || '').toLowerCase();
        case 'date': return d.created_at || '';
        default: return 0;
    }
}

function trierDemandes(key) {
    if (sortState.key === key) {
        sortState.dir = -sortState.dir;
    } else {
        sortState.key = key;
        sortState.dir = 1;
    }
    renderDemandes();
}

function headerCell(key, labelHtml, sortTitle) {
    var arrow = '';
    if (sortState.key === key) {
        arrow = ' <i class="fa-solid fa-caret-' + (sortState.dir === 1 ? 'up' : 'down') + '"></i>';
    }
    return '<th class="demandes-th-sort" onclick="trierDemandes(\'' + key + '\')" title="Trier par ' + escapeAttr(sortTitle) + '">' + labelHtml + arrow + '</th>';
}

function renderDemandes() {
    var list = document.getElementById('demandes-list');
    var emptyState = document.getElementById('demande-empty-state');
    var countEl = document.getElementById('demande-count');
    if (!list) return;

    var demandes = getDemandesFiltrees();

    demandes.sort(function(a, b) {
        var va = getSortValue(a, sortState.key);
        var vb = getSortValue(b, sortState.key);
        if (va < vb) return -sortState.dir;
        if (va > vb) return sortState.dir;
        // Égalité : plus récentes en premier
        return (a.created_at < b.created_at) ? 1 : -1;
    });

    if (countEl) {
        countEl.textContent = demandes.length + ' demande' + (demandes.length > 1 ? 's' : '');
    }

    if (demandes.length === 0) {
        list.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = '<table class="demandes-table"><thead><tr>'
        + headerCell('etat', 'État', 'état')
        + headerCell('priorite', 'Prio', 'priorité')
        + headerCell('complexite', 'Cplx', 'complexité')
        + '<th>Qui</th>'
        + headerCell('ecran', 'Écran', 'écran')
        + '<th>Description</th>'
        + headerCell('demandeur', '<i class="fa-solid fa-user"></i>', 'demandeur')
        + headerCell('date', '<i class="fa-solid fa-calendar-day"></i>', 'date')
        + '<th></th>'
        + '</tr></thead><tbody>'
        + demandes.map(renderDemandeRow).join('')
        + '</tbody></table>';
}

function renderDemandeRow(d) {
    var etatDef = getEtatDef(d.etat);
    var estClose = (d.etat === 'terminee' || d.etat === 'abandonnee');

    var dateInfo = 'Créée le ' + formatDateFr(d.created_at);
    if (d.updated_at && d.updated_at.slice(0, 10) !== d.created_at.slice(0, 10)) {
        dateInfo += ' — modifiée le ' + formatDateFr(d.updated_at);
    }

    var etatOptions = ETATS.map(function(e) {
        return '<option value="' + e.value + '"' + (e.value === d.etat ? ' selected' : '') + '>' + escapeHtml(e.label) + '</option>';
    }).join('');

    var commentaireIcon = d.commentaire
        ? ' <i class="fa-solid fa-comment-dots demande-desc-comment" title="' + escapeAttr(d.commentaire) + '"></i>'
        : '';

    return '<tr class="demande-row' + (estClose ? ' demande-row--close' : '') + '" onclick="ouvrirModaleDemande(' + d.id + ')">'
        + '<td class="demande-etat-cell">'
        +   '<select class="demande-etat-select" style="border-color:' + etatDef.color + ';color:' + etatDef.color + ';" '
        +       'onclick="event.stopPropagation()" onchange="changerEtat(' + d.id + ', this.value)" title="Changer l\'état">' + etatOptions + '</select>'
        + '</td>'
        + '<td><span class="demande-badge demande-badge-priorite demande-badge-priorite--' + escapeAttr(d.priorite) + '">'
        +   escapeHtml(PRIORITE_LABELS[d.priorite] || d.priorite) + '</span></td>'
        + '<td>' + (d.complexite ? '<span class="demande-badge demande-badge-complexite" title="Complexité estimée">' + escapeHtml(d.complexite) + '</span>' : '') + '</td>'
        + '<td><span class="demande-badge demande-badge-qui" title="Qui est concerné"><i class="fa-solid fa-user-group"></i> ' + escapeHtml(quiLabel(d.qui)) + '</span></td>'
        + '<td>' + (d.ecran ? '<span class="demande-badge demande-badge-ecran"><i class="fa-solid fa-display"></i> ' + escapeHtml(d.ecran) + '</span>' : '') + '</td>'
        + '<td class="demande-desc-cell"><span class="demande-desc-text" title="' + escapeAttr(d.description) + '">' + escapeHtml(d.description) + '</span>' + commentaireIcon + '</td>'
        + '<td class="demande-demandeur-cell" title="Demandé par ' + escapeAttr(d.demandeur) + '"><i class="fa-solid fa-user"></i></td>'
        + '<td class="demande-date-cell" title="' + escapeAttr(dateInfo) + '"><i class="fa-solid fa-calendar-day"></i></td>'
        + '<td class="demande-actions-cell"><button type="button" class="demande-edit-btn" onclick="event.stopPropagation(); ouvrirModaleDemande(' + d.id + ')" title="Modifier la demande"><i class="fa-solid fa-pen"></i></button></td>'
        + '</tr>';
}

// ============================================================
// 9. CHANGEMENT D'ÉTAT RAPIDE (depuis la carte)
// ============================================================
function changerEtat(id, nouvelEtat) {
    supabaseFetch('/rest/v1/demandes?id=eq.' + id, {
        method: 'PATCH',
        body: JSON.stringify({ etat: nouvelEtat })
    })
        .then(function() {
            for (var i = 0; i < demandesList.length; i++) {
                if (demandesList[i].id === id) demandesList[i].etat = nouvelEtat;
            }
            renderEtatFilter();
            renderDemandes();
            showToast('État mis à jour : ' + getEtatDef(nouvelEtat).label, 'success');
        })
        .catch(function(error) {
            showToast('Erreur mise à jour : ' + error.message, 'error');
            renderDemandes();
        });
}

// ============================================================
// 10. MODALE AJOUT / ÉDITION
// ============================================================
function ouvrirModaleDemande(id) {
    editingDemandeId = id;
    var overlay = document.getElementById('demande-modal-overlay');
    var titre = document.getElementById('demande-modal-title');
    var deleteBtn = document.getElementById('dm-delete-btn');
    var meta = document.getElementById('dm-meta');
    if (!overlay) return;

    var d = null;
    if (id !== null) {
        for (var i = 0; i < demandesList.length; i++) {
            if (demandesList[i].id === id) { d = demandesList[i]; break; }
        }
        if (!d) return;
    }

    titre.textContent = d ? 'Modifier la demande' : 'Nouvelle demande';
    document.getElementById('dm-description').value = d ? d.description : '';
    document.getElementById('dm-ecran').value = d ? d.ecran : '';
    var quiValues = d ? parseQui(d.qui) : QUI_VALUES.slice();
    QUI_VALUES.forEach(function(v) {
        document.getElementById('dm-qui-' + v).checked = (quiValues.indexOf(v) !== -1);
    });
    document.getElementById('dm-priorite').value = d ? d.priorite : 'normale';
    document.getElementById('dm-complexite').value = d ? d.complexite : '';
    document.getElementById('dm-etat').value = d ? d.etat : 'nouvelle';

    document.getElementById('dm-commentaire').value = d ? d.commentaire : '';
    deleteBtn.style.display = d ? '' : 'none';
    if (meta) {
        if (d) {
            meta.textContent = 'Saisie par ' + d.demandeur + ' le ' + formatDateFr(d.created_at);
            meta.style.display = '';
        } else {
            meta.style.display = 'none';
        }
    }

    overlay.style.display = 'flex';
    document.getElementById('dm-description').focus();
}

function fermerModaleDemande() {
    var overlay = document.getElementById('demande-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    editingDemandeId = null;
}

function sauverDemande() {
    var description = document.getElementById('dm-description').value.trim();
    if (!description) {
        showToast('La description est obligatoire', 'error');
        return;
    }

    var quiValues = QUI_VALUES.filter(function(v) {
        return document.getElementById('dm-qui-' + v).checked;
    });
    if (quiValues.length === 0) {
        showToast('Cochez au moins un public concerné', 'error');
        return;
    }

    var data = {
        description: description,
        ecran: document.getElementById('dm-ecran').value.trim(),
        qui: quiValues.join(','),
        priorite: document.getElementById('dm-priorite').value,
        complexite: document.getElementById('dm-complexite').value,
        etat: document.getElementById('dm-etat').value,
        commentaire: document.getElementById('dm-commentaire').value.trim()
    };

    var promesse;
    if (editingDemandeId !== null) {
        promesse = supabaseFetch('/rest/v1/demandes?id=eq.' + editingDemandeId, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    } else {
        data.demandeur = (firebase.auth().currentUser && firebase.auth().currentUser.email) || '';
        promesse = supabaseFetch('/rest/v1/demandes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    promesse
        .then(function() {
            showToast(editingDemandeId !== null ? 'Demande mise à jour' : 'Demande ajoutée', 'success');
            fermerModaleDemande();
            loadDemandes();
        })
        .catch(function(error) {
            showToast('Erreur enregistrement : ' + error.message, 'error');
        });
}

// ============================================================
// 11. SUPPRESSION
// ============================================================
function ouvrirModaleSuppression() {
    var overlay = document.getElementById('demande-delete-modal-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function fermerModaleSuppression() {
    var overlay = document.getElementById('demande-delete-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function confirmerSuppressionDemande() {
    if (editingDemandeId === null) return;
    supabaseFetch('/rest/v1/demandes?id=eq.' + editingDemandeId, { method: 'DELETE' })
        .then(function() {
            showToast('Demande supprimée', 'success');
            fermerModaleSuppression();
            fermerModaleDemande();
            loadDemandes();
        })
        .catch(function(error) {
            showToast('Erreur suppression : ' + error.message, 'error');
        });
}
