// ============================================================
// collecteurs.js — BilletsTouristiques Gestion des collecteurs
// Story 5.1
// ============================================================

// ============================================================
// 1. TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    if (type === 'success') {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
    if (type === 'info') {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    }
}

// ============================================================
// 2. UTILITAIRES D'ECHAPPEMENT
// ============================================================
function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// 3. DONNEES EN MEMOIRE
// ============================================================
var collecteursData = [];

// ============================================================
// 4. INITIALISATION
// ============================================================
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            loadCollecteursPage();
            initCollecteurEvents();
        }
    });
}

// ============================================================
// 5. CHARGEMENT DES COLLECTEURS DEPUIS SUPABASE
// ============================================================
function loadCollecteursPage() {
    var grid = document.getElementById('collecteur-cards-grid');
    if (!grid) return;

    supabaseFetch('/rest/v1/collecteurs?select=*&order=alias.asc')
        .then(function(data) {
            collecteursData = data || [];
            renderCollecteurs();
        })
        .catch(function(error) {
            console.error('Erreur chargement collecteurs:', error);
            showToast('Erreur chargement collecteurs : ' + error.message, 'error');
        });
}

// ============================================================
// 6. RENDU DES CARTES COLLECTEURS
// ============================================================
function renderCollecteurs() {
    var grid = document.getElementById('collecteur-cards-grid');
    if (!grid) return;

    var emptyState = document.getElementById('collecteur-empty-state');

    if (collecteursData.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    var html = '';
    collecteursData.forEach(function(c) {
        var id = c.id || '';
        var alias = c.alias || '';
        var nom = c.nom || '';
        var prenom = c.prenom || '';
        var paypalEmail = c.paypal_email || '';
        var paypalMe = c.paypal_me || '';
        var emailMembre = c.email_membre || '';
        var displayName = alias;
        var fullName = [prenom, nom].filter(function(s) { return s; }).join(' ');

        html += '<div class="user-card" data-collecteur-id="' + escapeAttr(id) + '">' +
            '<div class="user-card-header">' +
                '<span class="user-card-name">' + escapeHtml(displayName) + '</span>' +
                (fullName ? '<span class="collecteur-fullname">' + escapeHtml(fullName) + '</span>' : '') +
            '</div>' +
            '<div class="user-card-details">' +
                (paypalEmail ? '<span class="user-card-email"><i class="fa-solid fa-credit-card"></i> ' + escapeHtml(paypalEmail) + '</span>' : '') +
                (paypalMe ? '<span class="user-card-pseudo"><i class="fa-brands fa-paypal"></i> ' + escapeHtml(paypalMe) + '</span>' : '') +
                (emailMembre ? '<span class="user-card-email"><i class="fa-solid fa-link"></i> ' + escapeHtml(emailMembre) + '</span>' : '') +
            '</div>' +
            // Mode edition (cache par defaut)
            '<div class="user-card-edit" data-collecteur-id="' + escapeAttr(id) + '" style="display:none">' +
                '<div class="user-edit-field">' +
                    '<label>Alias *</label>' +
                    '<input type="text" class="edit-alias" value="' + escapeAttr(alias) + '" placeholder="Alias">' +
                '</div>' +
                '<div class="user-edit-field">' +
                    '<label>Nom</label>' +
                    '<input type="text" class="edit-nom" value="' + escapeAttr(nom) + '" placeholder="Nom">' +
                '</div>' +
                '<div class="user-edit-field">' +
                    '<label>Prénom</label>' +
                    '<input type="text" class="edit-prenom" value="' + escapeAttr(prenom) + '" placeholder="Prénom">' +
                '</div>' +
                '<div class="user-edit-field">' +
                    '<label>PayPal Email</label>' +
                    '<input type="email" class="edit-paypal-email" value="' + escapeAttr(paypalEmail) + '" placeholder="PayPal Email">' +
                '</div>' +
                '<div class="user-edit-field">' +
                    '<label>PayPal.me</label>' +
                    '<input type="text" class="edit-paypal-me" value="' + escapeAttr(paypalMe) + '" placeholder="PayPal.me">' +
                '</div>' +
                '<div class="user-edit-field">' +
                    '<label>Email membre</label>' +
                    '<input type="email" class="edit-email-membre" value="' + escapeAttr(emailMembre) + '" placeholder="Email membre rattaché">' +
                '</div>' +
                '<div class="user-edit-actions">' +
                    '<button class="collecteur-edit-save-btn user-modal-btn user-modal-btn-primary" data-collecteur-id="' + escapeAttr(id) + '"><i class="fa-solid fa-check"></i> Enregistrer</button>' +
                    '<button class="collecteur-edit-cancel-btn user-modal-btn"><i class="fa-solid fa-xmark"></i> Annuler</button>' +
                '</div>' +
            '</div>' +
            '<div class="user-card-actions">' +
                '<button class="collecteur-edit-toggle-btn user-edit-toggle-btn" ' +
                    'data-collecteur-id="' + escapeAttr(id) + '" ' +
                    'title="Modifier ce collecteur">' +
                    '<i class="fa-solid fa-pen"></i> Modifier' +
                '</button>' +
            '</div>' +
            '</div>';
    });

    grid.innerHTML = html;
}

// ============================================================
// 7. EVENT DELEGATION & INITIALISATION
// ============================================================
function initCollecteurEvents() {
    var cardsGrid = document.getElementById('collecteur-cards-grid');
    if (cardsGrid) {
        cardsGrid.addEventListener('click', function(event) {
            // Toggle edit mode
            var editToggle = event.target.closest('.collecteur-edit-toggle-btn');
            if (editToggle) {
                event.stopPropagation();
                var card = editToggle.closest('.user-card');
                if (!card) return;
                var editPanel = card.querySelector('.user-card-edit');
                if (editPanel) {
                    editPanel.style.display = editPanel.style.display === 'none' ? 'block' : 'none';
                }
                return;
            }

            // Save edit
            var editSave = event.target.closest('.collecteur-edit-save-btn');
            if (editSave) {
                event.stopPropagation();
                var collecteurId = editSave.getAttribute('data-collecteur-id');
                saveCollecteur(collecteurId);
                return;
            }

            // Cancel edit
            var editCancel = event.target.closest('.collecteur-edit-cancel-btn');
            if (editCancel) {
                event.stopPropagation();
                var card = editCancel.closest('.user-card');
                if (!card) return;
                var editPanel = card.querySelector('.user-card-edit');
                if (editPanel) editPanel.style.display = 'none';
                return;
            }
        });
    }

    // Add collecteur form toggle
    var addBtn = document.getElementById('add-collecteur-btn');
    var addForm = document.getElementById('add-collecteur-form');
    var cancelBtn = document.getElementById('cancel-add-collecteur-btn');
    var confirmBtn = document.getElementById('confirm-add-collecteur-btn');
    var aliasInput = document.getElementById('new-collecteur-alias');

    if (addBtn && addForm) {
        addBtn.addEventListener('click', function() {
            addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
            if (addForm.style.display === 'flex' && aliasInput) {
                aliasInput.value = '';
                aliasInput.focus();
            }
        });
    }

    if (cancelBtn && addForm) {
        cancelBtn.addEventListener('click', function() {
            addForm.style.display = 'none';
            resetAddCollecteurForm();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            addCollecteur();
        });
    }

    if (aliasInput) {
        aliasInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') addCollecteur();
        });
    }
}

// ============================================================
// 8. AJOUT D'UN COLLECTEUR
// ============================================================
function addCollecteur() {
    var alias = document.getElementById('new-collecteur-alias').value.trim();
    if (!alias) {
        showToast('L\'alias est obligatoire', 'error');
        return;
    }

    var exists = collecteursData.some(function(c) {
        return c.alias.toLowerCase() === alias.toLowerCase();
    });
    if (exists) {
        showToast('Cet alias existe déjà', 'error');
        return;
    }

    var body = {
        alias: alias,
        nom: document.getElementById('new-collecteur-nom').value.trim(),
        prenom: document.getElementById('new-collecteur-prenom').value.trim(),
        paypal_email: document.getElementById('new-collecteur-paypal-email').value.trim(),
        paypal_me: document.getElementById('new-collecteur-paypal-me').value.trim(),
        email_membre: document.getElementById('new-collecteur-email-membre').value.trim()
    };

    supabaseFetch('/rest/v1/collecteurs', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Prefer': 'return=representation' }
    })
    .then(function() {
        showToast('Collecteur ajouté avec succès', 'success');
        resetAddCollecteurForm();
        var addForm = document.getElementById('add-collecteur-form');
        if (addForm) addForm.style.display = 'none';
        loadCollecteursPage();
    })
    .catch(function(error) {
        console.error('Erreur ajout collecteur:', error);
        showToast('Erreur lors de l\'ajout : ' + error.message, 'error');
    });
}

function resetAddCollecteurForm() {
    var ids = [
        'new-collecteur-alias', 'new-collecteur-nom', 'new-collecteur-prenom',
        'new-collecteur-paypal-email', 'new-collecteur-paypal-me', 'new-collecteur-email-membre'
    ];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ============================================================
// 9. MODIFICATION D'UN COLLECTEUR
// ============================================================
function saveCollecteur(id) {
    var card = document.querySelector('[data-collecteur-id="' + id + '"]');
    if (!card) return;

    // Find the edit panel within the card
    var editPanel = card.querySelector('.user-card-edit') || card;

    var body = {
        alias: editPanel.querySelector('.edit-alias').value.trim(),
        nom: editPanel.querySelector('.edit-nom').value.trim(),
        prenom: editPanel.querySelector('.edit-prenom').value.trim(),
        paypal_email: editPanel.querySelector('.edit-paypal-email').value.trim(),
        paypal_me: editPanel.querySelector('.edit-paypal-me').value.trim(),
        email_membre: editPanel.querySelector('.edit-email-membre').value.trim()
    };

    if (!body.alias) {
        showToast('L\'alias est obligatoire', 'error');
        return;
    }

    // Vérifier unicité de l'alias (exclure le collecteur en cours)
    var aliasExists = collecteursData.some(function(c) {
        return String(c.id) !== String(id) && c.alias.toLowerCase() === body.alias.toLowerCase();
    });
    if (aliasExists) {
        showToast('Cet alias existe déjà', 'error');
        return;
    }

    supabaseFetch('/rest/v1/collecteurs?id=eq.' + id, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Prefer': 'return=representation' }
    })
    .then(function() {
        showToast('Collecteur modifié avec succès', 'success');
        loadCollecteursPage();
    })
    .catch(function(error) {
        console.error('Erreur modification collecteur:', error);
        showToast('Erreur lors de la modification : ' + error.message, 'error');
    });
}
