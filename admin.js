// ============================================================
// 1. TOAST NOTIFICATIONS (Fondation FR11)
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
// 2. CONFIGURATION & INITIALISATION
// ============================================================
var adminBillets = [];

if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            loadAdminBillets();
        }
    });
}

// ============================================================
// 3. CHARGEMENT DES BILLETS DEPUIS FIRESTORE
// ============================================================
function loadAdminBillets() {
    var db = firebase.firestore();
    var grid = document.getElementById('admin-cards-grid');
    if (!grid) return;

    db.collection('billets').orderBy('Timestamp', 'desc').get()
        .then(function(snapshot) {
            adminBillets = [];
            snapshot.forEach(function(doc) {
                var data = doc.data();
                data._id = doc.id;
                adminBillets.push(data);
            });
            renderAdminCards();
        })
        .catch(function(error) {
            showToast('Erreur chargement : ' + error.message, 'error');
            console.error('Erreur chargement billets:', error);
            if (grid) {
                grid.innerHTML = '<div class="admin-empty-state">' +
                    '<i class="fa-solid fa-circle-exclamation" style="color: var(--color-danger);"></i>' +
                    '<p>Impossible de charger les billets.</p>' +
                    '</div>';
            }
        });
}

// ============================================================
// 4. RENDU DES CARTES BILLETS
// ============================================================
function renderAdminCards() {
    var grid = document.getElementById('admin-cards-grid');
    if (!grid) return;

    // Etat vide
    if (adminBillets.length === 0) {
        grid.innerHTML = '<div class="admin-empty-state">' +
            '<i class="fa-solid fa-box-open"></i>' +
            '<p>Aucun billet dans le catalogue</p>' +
            '<button class="btn-admin-primary" onclick="handleAddBillet()">' +
            '<i class="fa-solid fa-plus"></i> Ajouter un premier billet</button>' +
            '</div>';
        return;
    }

    var html = '';
    adminBillets.forEach(function(billet) {
        var couleur = billet.Couleur || '#666';
        var categorie = billet.Categorie || '';

        html += '<div class="admin-card-billet" data-id="' + billet._id + '">' +
            '<div class="admin-card-header">' +
                '<h3 class="admin-card-title">' + (billet.NomBillet || 'Sans nom') + '</h3>' +
                '<span class="admin-badge-status" style="background-color: ' + couleur + ';">' +
                    categorie +
                '</span>' +
            '</div>' +
            '<div class="admin-card-meta">' +
                '<span>' + (billet.Ville || '') + '</span>' +
                '<span class="admin-card-ref">' +
                    (billet.Reference || '') +
                    (billet.Millesime ? ' - ' + billet.Millesime : '') +
                '</span>' +
            '</div>' +
            '</div>';
    });

    grid.innerHTML = html;
}

// ============================================================
// 5. ACTIONS (Stubs pour stories suivantes)
// ============================================================
function handleAddBillet() {
    // Story 2.2 implementera le formulaire d'ajout
    showToast('Fonctionnalité en cours de développement', 'info');
}
