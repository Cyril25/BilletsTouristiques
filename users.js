// ============================================================
// users.js — BilletsTouristiques Gestion des membres
// Story 3.1
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
        }
    });
}

// ============================================================
// 5. CHARGEMENT DES UTILISATEURS DEPUIS FIRESTORE
// ============================================================
function loadUsers() {
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) return;

    var db = firebase.firestore();
    var grid = document.getElementById('user-cards-grid');
    if (!grid) return;

    db.collection('whitelist').get()
        .then(function(snapshot) {
            usersList = [];
            snapshot.forEach(function(doc) {
                var data = doc.data();
                data._id = doc.id;
                usersList.push(data);
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

        html += '<div class="user-card">' +
            '<div class="user-card-header">' +
                '<span class="user-card-email">' + escapeHtml(email) + '</span>' +
                '<span class="' + badgeClass + '">' + escapeHtml(role) + '</span>' +
            '</div>' +
            '</div>';
    });

    grid.innerHTML = html;
}
