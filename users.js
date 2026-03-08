// ============================================================
// users.js — BilletsTouristiques Gestion des membres
// Stories 3.1, 3.2
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
var usersList = [];

// ============================================================
// 4. INITIALISATION
// ============================================================
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            loadUsers();
            initUserEvents();
        }
    });
}

// ============================================================
// 5. CHARGEMENT DES UTILISATEURS DEPUIS SUPABASE
// ============================================================
function loadUsers() {
    var grid = document.getElementById('user-cards-grid');
    if (!grid) return;

    supabaseFetch('/rest/v1/whitelist?select=*&order=email.asc', { method: 'GET' })
        .then(function(rows) {
            usersList = rows.map(function(row) {
                row._id = row.email;
                return row;
            });

            if (usersList.length === 0) {
                grid.innerHTML = '';
                var emptyState = document.getElementById('user-empty-state');
                if (emptyState) emptyState.style.display = 'block';
            } else {
                var emptyState = document.getElementById('user-empty-state');
                if (emptyState) emptyState.style.display = 'none';
                renderUserCards();
            }
        })
        .catch(function(error) {
            showToast('Erreur chargement membres : ' + error.message, 'error');
            console.error('Erreur chargement whitelist:', error);
            if (grid) {
                grid.innerHTML = '<div class="user-empty-state">' +
                    '<i class="fa-solid fa-circle-exclamation" style="color: var(--color-danger);"></i>' +
                    '<p>Impossible de charger les membres.</p>' +
                    '</div>';
            }
        });
}

// ============================================================
// 6. RENDU DES CARTES UTILISATEURS
// ============================================================
function renderUserCards() {
    var grid = document.getElementById('user-cards-grid');
    if (!grid) return;

    var html = '';
    usersList.forEach(function(user) {
        var email = user._id || '';
        var role = user.role || '';
        var isAdmin = role === 'admin';
        var badgeClass = isAdmin ? 'user-badge-role user-badge-admin' : 'user-badge-role user-badge-member';
        var btnClass = isAdmin ? 'user-role-toggle-btn demote' : 'user-role-toggle-btn promote';
        var btnIcon = isAdmin ? 'fa-solid fa-user-minus' : 'fa-solid fa-user-plus';
        var btnText = isAdmin ? 'Rétrograder membre' : 'Promouvoir admin';

        html += '<div class="user-card" data-doc-id="' + escapeAttr(email) + '">' +
            '<div class="user-card-header">' +
                '<span class="user-card-email">' + escapeHtml(email) + '</span>' +
                '<span class="' + badgeClass + '">' + escapeHtml(role) + '</span>' +
            '</div>' +
            '<div class="user-card-actions">' +
                '<button class="' + btnClass + '" ' +
                    'data-doc-id="' + escapeAttr(email) + '" ' +
                    'data-current-role="' + escapeAttr(role) + '" ' +
                    'title="' + escapeAttr(btnText) + '">' +
                    '<i class="' + btnIcon + '"></i> ' + escapeHtml(btnText) +
                '</button>' +
            '</div>' +
            '</div>';
    });

    grid.innerHTML = html;
}

// ============================================================
// 7. STORY 3.2 — EVENT DELEGATION & INITIALISATION
// ============================================================
function initUserEvents() {
    var cardsGrid = document.getElementById('user-cards-grid');
    if (cardsGrid) {
        cardsGrid.addEventListener('click', function(event) {
            var roleBtn = event.target.closest('.user-role-toggle-btn');
            if (roleBtn) {
                event.stopPropagation();
                var email = roleBtn.getAttribute('data-doc-id');
                var currentRole = roleBtn.getAttribute('data-current-role');
                var newRole = (currentRole === 'admin') ? 'member' : 'admin';

                // Verifier auto-retrogradation
                if (newRole === 'member' && firebase.auth().currentUser && email === firebase.auth().currentUser.email) {
                    openSelfDemoteModal(email);
                    return;
                }
                changeUserRole(email, newRole);
            }
        });
    }
}

// ============================================================
// 8. STORY 3.2 — CHANGEMENT DE ROLE SUPABASE
// ============================================================
function changeUserRole(email, newRole, isSelfDemotion) {
    var previousRole = (newRole === 'admin') ? 'member' : 'admin';

    // Mise a jour optimiste du DOM
    updateRoleInDOM(email, newRole);

    supabaseFetch('/rest/v1/whitelist?email=eq.' + encodeURIComponent(email), {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
    })
        .then(function() {
            // Succes : mettre a jour usersList en memoire
            for (var i = 0; i < usersList.length; i++) {
                if (usersList[i]._id === email) {
                    usersList[i].role = newRole;
                    break;
                }
            }
            showToast('Rôle mis à jour avec succès', 'success');

            // Si auto-retrogradation, rediriger
            if (isSelfDemotion) {
                window.location.href = 'index.html';
            }
        })
        .catch(function(error) {
            showToast('Erreur lors du changement de rôle : ' + error.message, 'error');
            console.error('Erreur changement rôle:', error);
            // Rollback : revenir a l'etat precedent
            updateRoleInDOM(email, previousRole);
        });
}

function updateRoleInDOM(email, newRole) {
    var card = document.querySelector('.user-card[data-doc-id="' + escapeAttr(email) + '"]');
    if (!card) return;

    var badge = card.querySelector('.user-badge-role');
    if (badge) {
        badge.textContent = newRole;
        badge.className = 'user-badge-role user-badge-' + newRole;
    }

    var btn = card.querySelector('.user-role-toggle-btn');
    if (btn) {
        var isAdmin = newRole === 'admin';
        btn.setAttribute('data-current-role', newRole);
        btn.className = isAdmin ? 'user-role-toggle-btn demote' : 'user-role-toggle-btn promote';
        btn.title = isAdmin ? 'Rétrograder membre' : 'Promouvoir admin';
        btn.innerHTML = isAdmin
            ? '<i class="fa-solid fa-user-minus"></i> Rétrograder membre'
            : '<i class="fa-solid fa-user-plus"></i> Promouvoir admin';
    }
}

// ============================================================
// 9. STORY 3.2 — MODALE AUTO-RETROGRADATION
// ============================================================
var selfDemoteTargetEmail = null;

function openSelfDemoteModal(email) {
    var overlay = document.getElementById('self-demote-modal-overlay');
    if (!overlay) return;

    selfDemoteTargetEmail = email;
    overlay.style.display = 'flex';

    var cancelBtn = document.getElementById('self-demote-cancel-btn');
    if (cancelBtn) {
        setTimeout(function() { cancelBtn.focus(); }, 100);
    }

    document.addEventListener('keydown', onSelfDemoteKeydown);
    overlay.addEventListener('click', onSelfDemoteOverlayClick);
}

function closeSelfDemoteModal() {
    var overlay = document.getElementById('self-demote-modal-overlay');
    if (!overlay) return;

    overlay.style.display = 'none';
    selfDemoteTargetEmail = null;

    document.removeEventListener('keydown', onSelfDemoteKeydown);
    overlay.removeEventListener('click', onSelfDemoteOverlayClick);
}

function confirmSelfDemotion() {
    if (!selfDemoteTargetEmail) return;
    var email = selfDemoteTargetEmail;
    closeSelfDemoteModal();
    changeUserRole(email, 'member', true);
}

function onSelfDemoteKeydown(e) {
    if (e.key === 'Escape') {
        closeSelfDemoteModal();
        return;
    }
    // Focus trap dans la modale
    if (e.key === 'Tab') {
        var modal = document.getElementById('self-demote-modal');
        if (!modal) return;
        var focusable = modal.querySelectorAll('button');
        if (focusable.length === 0) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}

function onSelfDemoteOverlayClick(e) {
    if (e.target.id === 'self-demote-modal-overlay') {
        closeSelfDemoteModal();
    }
}
