// ============================================================
// users.js — BilletsTouristiques Gestion des membres
// Stories 3.1, 3.2, 4.1
// ============================================================

// Demande #2 — Drapeau du pays de résidence (+ filtre/compteur par pays)
// Helpers _normPays / flagPays fournis par global.js (partagés avec admin-stats).
var _normPays = window._normPays;
var flagPays = window.flagPays;
// Un membre sans pays renseigné est considéré comme France (cohérent avec l'affichage adresse)
function paysAffiche(user) {
    var p = (user.pays || '').trim();
    return p || 'France';
}

var activeCountryFilter = '';

// Demande #38 — liste des pays (table `pays`), la même que celle de Mon profil.
// Chargée une fois avec les membres : la modale d'édition est construite en HTML
// synchrone, elle a besoin des options tout de suite.
var paysListe = [];

// Demande #38 — options du select pays. La valeur déjà enregistrée est conservée même
// si elle ne figure pas dans la table (saisie libre historique) : on ne veut pas qu'une
// simple ouverture de la modale efface le pays d'un membre.
function optionsPaysHtml(valeur) {
    var val = (valeur || '').trim();
    var liste = paysListe.slice();
    var connu = liste.some(function(p) { return _normPays(p) === _normPays(val); });
    if (val && !connu) liste.unshift(val);
    var html = '<option value=""' + (val ? '' : ' selected') + '>— Non renseigné —</option>';
    liste.forEach(function(p) {
        var sel = (_normPays(p) === _normPays(val) && val) ? ' selected' : '';
        html += '<option value="' + escapeAttr(p) + '"' + sel + '>' + escapeHtml(p) + '</option>';
    });
    return html;
}

function majDrapeauEditionMembre() {
    var sel = document.getElementById('ue-pays');
    var flag = document.getElementById('ue-pays-flag');
    if (sel && flag) flag.innerHTML = window.flagImg(sel.value || '') || '';
}

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
// 2b. FORMATAGE DERNIERE ACTIVITE
// ============================================================
function formatLastActive(isoString) {
    if (!isoString) return 'Jamais connecté';
    var date = new Date(isoString);
    var now = new Date();
    var diffMs = now - date;
    var diffMin = Math.floor(diffMs / 60000);
    var diffH = Math.floor(diffMs / 3600000);
    var diffJ = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'En ligne';
    if (diffMin < 60) return 'Il y a ' + diffMin + ' min';
    if (diffH < 24) return 'Il y a ' + diffH + 'h';
    if (diffJ < 7) return 'Il y a ' + diffJ + ' jour' + (diffJ > 1 ? 's' : '');
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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

    Promise.all([
        supabaseFetch('/rest/v1/membres?select=id,email,role,statut,pseudo,nom,prenom,rue,code_postal,ville,pays,indicatif_tel,telephone,last_active_at&order=nom.asc.nullslast,prenom.asc.nullslast', { method: 'GET' }),
        supabaseFetch('/rest/v1/membre_blocages?select=membre_id,motif,bloque_at', { method: 'GET' })
            .catch(function() { return []; }),
        // Demande #38 — un pays indisponible ne doit pas empêcher d'afficher les membres.
        supabaseFetch('/rest/v1/pays?select=nom&order=nom', { method: 'GET' })
            .catch(function() { return []; })
    ])
        .then(function(results) {
            var rows = results[0] || [];
            var blocages = results[1] || [];
            paysListe = (results[2] || []).map(function(p) { return p.nom; });
            var blocagesMap = {};
            // Demande #62 — les blocages sont repérés par le numéro du membre
            blocages.forEach(function(b) { blocagesMap[b.membre_id] = b; });

            usersList = rows.map(function(row) {
                row._id = row.email;
                var b = blocagesMap[row.id];
                row._bloque = !!b;
                row._blocageMotif = b ? (b.motif || '') : '';
                return row;
            });

            if (usersList.length === 0) {
                grid.innerHTML = '';
                var emptyState = document.getElementById('user-empty-state');
                if (emptyState) emptyState.style.display = 'block';
            } else {
                var emptyState = document.getElementById('user-empty-state');
                if (emptyState) emptyState.style.display = 'none';
                populateCountryFilter(); // Demande #2
                renderUserCards();
            }
        })
        .catch(function(error) {
            showToast('Erreur chargement membres : ' + error.message, 'error');
            console.error('Erreur chargement membres:', error);
            if (grid) {
                grid.innerHTML = '<div class="user-empty-state">' +
                    '<i class="fa-solid fa-circle-exclamation" style="color: var(--color-danger);"></i>' +
                    '<p>Impossible de charger les membres.</p>' +
                    '</div>';
            }
        });
}

// Demande #62 — les écrans agissent sur le NUMÉRO du membre. La liste vient d'être
// chargée avec les numéros : pas besoin d'une requête de plus pour les retrouver.
function numeroDuMembre(email) {
    for (var i = 0; i < usersList.length; i++) {
        if (usersList[i]._id === email) return usersList[i].id;
    }
    return null;
}

// ============================================================
// 5b. QW-5 — RECHERCHE MEMBRES
// ============================================================
var activeRoleFilter = 'tous';

function filterUsers() {
    var input = document.getElementById('user-search-input');
    var clearBtn = document.getElementById('user-search-clear');
    var query = input ? input.value.trim().toLowerCase() : '';
    if (clearBtn) clearBtn.style.display = query ? '' : 'none';
    renderUserCards(query);
}

function clearUserSearch() {
    var input = document.getElementById('user-search-input');
    if (input) input.value = '';
    var clearBtn = document.getElementById('user-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    renderUserCards('');
}

function filterUsersByRole(role) {
    activeRoleFilter = role;
    document.querySelectorAll('.user-role-filter-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-role') === role);
    });
    filterUsers();
}

// Demande #2 — filtre/compteur par pays
function filterUsersByCountry(normPays) {
    activeCountryFilter = normPays || '';
    var input = document.getElementById('user-search-input');
    renderUserCards(input ? input.value.trim() : '');
}

function populateCountryFilter() {
    var select = document.getElementById('user-country-filter');
    if (!select) return;
    // Compter les membres par pays (clé normalisée → { label, count })
    var counts = {};
    // Demande #62 — les comptes désactivés ne comptent pas parmi les membres
    // (ni, depuis #72, ceux en veille)
    var comptes = usersList.filter(function(user) { return categorieStatut(user) === 'actif'; });
    comptes.forEach(function(user) {
        var label = paysAffiche(user);
        var key = _normPays(label);
        if (!counts[key]) counts[key] = { label: label, count: 0 };
        counts[key].count++;
    });
    var keys = Object.keys(counts).sort(function(a, b) {
        return counts[a].label.localeCompare(counts[b].label, 'fr');
    });
    var html = '<option value="">Tous les pays (' + comptes.length + ')</option>';
    keys.forEach(function(k) {
        var c = counts[k];
        var code = window.paysCode(c.label);
        html += '<option value="' + escapeAttr(k) + '"' + (k === activeCountryFilter ? ' selected' : '') + '>'
            + (code ? code + ' — ' : '') + escapeHtml(c.label) + ' (' + c.count + ')</option>';
    });
    select.innerHTML = html;
}

// ============================================================
// 6. RENDU DES CARTES UTILISATEURS
// ============================================================
// Demande #62 / #72 — les comptes désactivés et ceux en veille ont chacun leur
// filtre, et n'apparaissent que sous celui-là.
function categorieStatut(user) {
    if (user.statut === 'desactive') return 'desactive';
    if (user.statut === 'en_veille') return 'veille';
    return 'actif';
}
function visibleSousLeFiltre(user) {
    var cat = categorieStatut(user);
    if (activeRoleFilter === 'desactive' || activeRoleFilter === 'veille') return cat === activeRoleFilter;
    return cat === 'actif';
}

function renderUserCards(searchQuery) {
    var grid = document.getElementById('user-cards-grid');
    if (!grid) return;

    var query = (searchQuery || '').toLowerCase();
    // Demande #62 — les comptes désactivés (anciens membres, fiche technique de
    // l'assistant) n'apparaissent que sous leur propre filtre ; #72 : de même en veille.
    var filtered = usersList.filter(visibleSousLeFiltre);
    if (activeRoleFilter === 'admin') {
        filtered = filtered.filter(function(user) { return user.role === 'admin' || user.role === 'superadmin'; });
    } else if (activeRoleFilter === 'member') {
        filtered = filtered.filter(function(user) { return user.role !== 'admin' && user.role !== 'superadmin'; });
    } else if (activeRoleFilter === 'bloque') {
        filtered = filtered.filter(function(user) { return user._bloque; });
    }
    // Demande #2 — filtre par pays
    if (activeCountryFilter) {
        filtered = filtered.filter(function(user) { return _normPays(paysAffiche(user)) === activeCountryFilter; });
    }
    if (query) {
        filtered = filtered.filter(function(user) {
            var email = (user._id || '').toLowerCase();
            var pseudo = (user.pseudo || '').toLowerCase();
            var nom = (user.nom || '').toLowerCase();
            var prenom = (user.prenom || '').toLowerCase();
            return email.indexOf(query) !== -1 || pseudo.indexOf(query) !== -1
                || nom.indexOf(query) !== -1 || prenom.indexOf(query) !== -1;
        });
    }

    // Afficher le compteur
    var countEl = document.getElementById('user-count');
    if (countEl) {
        var nbVisibles = usersList.filter(visibleSousLeFiltre).length;
        countEl.textContent = filtered.length + ' membre' + (filtered.length > 1 ? 's' : '')
            + (query ? ' sur ' + nbVisibles : '');
    }

    var html = '';
    filtered.forEach(function(user) {
        var email = user._id || '';
        var pseudo = user.pseudo || '';
        var nom = user.nom || '';
        var prenom = user.prenom || '';
        var role = user.role || '';
        var lastActive = user.last_active_at || '';
        var displayName = ((nom && prenom) ? nom + ' ' + prenom : (nom || prenom || '')) || pseudo || email;
        var isAdmin = role === 'admin' || role === 'superadmin';
        var badgeClass = isAdmin ? 'user-badge-role user-badge-admin' : 'user-badge-role user-badge-member';
        var badgeLabel = isAdmin ? 'Admin' : 'Membre';
        var btnClass = isAdmin ? 'user-role-toggle-btn demote' : 'user-role-toggle-btn promote';
        var btnIcon = isAdmin ? 'fa-solid fa-user-minus' : 'fa-solid fa-user-plus';
        var btnText = isAdmin ? 'Rétrograder membre' : 'Promouvoir admin';
        var isBloque = !!user._bloque;
        var isDesactive = user.statut === 'desactive'; // Demande #62
        var isVeille = user.statut === 'en_veille';    // Demande #72
        var isHorsService = isDesactive || isVeille;

        var flagH = window.flagImg(paysAffiche(user));
        html += '<div class="user-card' + (isBloque ? ' user-card-bloque' : '') + (isHorsService ? ' user-card-desactive' : '') + '" data-doc-id="' + escapeAttr(email) + '">' +
            '<div class="user-card-header">' +
                '<span class="user-card-name">' + (flagH ? flagH + ' ' : '') + escapeHtml(displayName) + '</span>' +
                (isDesactive ? '<span class="user-badge-role user-badge-desactive" title="Ne peut plus se connecter ; ses données sont conservées"><i class="fa-solid fa-user-slash"></i> Désactivé</span>' : '') +
                (isVeille ? '<span class="user-badge-role user-badge-desactive" title="Mis en veille faute de visite ; ses données sont conservées"><i class="fa-solid fa-bed"></i> En veille</span>' : '') +
                (isBloque ? '<span class="user-badge-role user-badge-bloque" title="' + escapeAttr(user._blocageMotif || 'Bloqué pour les inscriptions') + '"><i class="fa-solid fa-ban"></i> Bloqué</span>' : '') +
                '<span class="' + badgeClass + '">' + badgeLabel + '</span>' +
            '</div>' +
            '<div class="user-card-details">' +
                '<span class="user-card-email"><i class="fa-solid fa-envelope"></i> ' + escapeHtml(email) + '</span>' +
                (pseudo ? '<span class="user-card-pseudo"><i class="fa-solid fa-at"></i> ' + escapeHtml(pseudo) + '</span>' : '') +
                '<span class="user-card-last-active"><i class="fa-solid fa-clock"></i> ' + formatLastActive(lastActive) + '</span>' +
                (function() {
                    var hasAddr = user.rue || user.code_postal || user.ville;
                    if (!hasAddr) {
                        return '<a href="#" class="user-addr-indicator user-addr-missing" data-doc-id="' + escapeAttr(email) + '" onclick="event.preventDefault(); openUserEditModal(\'' + escapeAttr(email).replace(/'/g, "\\'") + '\')">' +
                            '<i class="fa-solid fa-location-dot"></i> Adresse non renseignée' +
                        '</a>';
                    }
                    var nomAdr = ((nom || '') + ' ' + (prenom || '')).trim();
                    var cpVille = [user.code_postal, (user.ville || '').toUpperCase() || null].filter(Boolean).join(' ');
                    var paysLigne = (user.pays && user.pays.trim().toLowerCase() !== 'france') ? user.pays.trim().toUpperCase() : '';
                    var adresseLines = [nomAdr, user.rue, cpVille, paysLigne].filter(Boolean);
                    return '<div class="envoi-adresse-wrapper" onclick="copierAdresse(this, event)" title="Cliquer pour copier l\'adresse">' +
                        '<pre class="envoi-adresse-bloc">' + escapeHtml(adresseLines.join('\n')) + '</pre>' +
                        '<span class="envoi-adresse-copie"><i class="fa-solid fa-check"></i> Copié !</span>' +
                    '</div>';
                })() +
            '</div>' +
            (isBloque ? '<div class="user-card-blocage-motif"><i class="fa-solid fa-circle-info"></i> ' + (user._blocageMotif ? escapeHtml(user._blocageMotif) : 'Bloqué pour les inscriptions (aucun motif renseigné)') + '</div>' : '') +
            '<div class="user-card-actions">' +
                '<button class="user-edit-toggle-btn" ' +
                    'data-doc-id="' + escapeAttr(email) + '" ' +
                    'title="Modifier la fiche">' +
                    '<i class="fa-solid fa-pen"></i> Modifier la fiche' +
                '</button>' +
                '<button class="user-block-toggle-btn ' + (isBloque ? 'unblock' : 'block') + '" ' +
                    'data-doc-id="' + escapeAttr(email) + '" ' +
                    'title="' + (isBloque ? 'Débloquer les inscriptions' : 'Bloquer les inscriptions') + '">' +
                    '<i class="fa-solid ' + (isBloque ? 'fa-lock-open' : 'fa-ban') + '"></i> ' + (isBloque ? 'Débloquer' : 'Bloquer') +
                '</button>' +
                (role === 'superadmin' || isHorsService ? '' :
                '<button class="' + btnClass + '" ' +
                    'data-doc-id="' + escapeAttr(email) + '" ' +
                    'data-current-role="' + escapeAttr(role) + '" ' +
                    'title="' + escapeAttr(btnText) + '">' +
                    '<i class="' + btnIcon + '"></i> ' + escapeHtml(btnText) +
                '</button>') +
                // Demande #62 — un compte désactivé garde ses données : on ne le supprime pas
                // Demande #62 — le but du chantier : l'adresse ne vit plus que sur la fiche,
                // la changer ne touche qu'une ligne et tout le reste suit.
                '<button class="user-email-change-btn" ' +
                    'data-doc-id="' + escapeAttr(email) + '" ' +
                    'title="Changer l\'adresse de connexion de ce membre">' +
                    '<i class="fa-solid fa-envelope-circle-check"></i> Changer l\'adresse' +
                '</button>' +
                // Désactiver : il ne peut plus se connecter, ses données restent.
                (isVeille
                    ? '<button class="user-statut-toggle-btn reactiver" ' +
                          'data-doc-id="' + escapeAttr(email) + '" ' +
                          'title="Le sortir de veille : il retrouve l\'accès et ses données">' +
                          '<i class="fa-solid fa-user-check"></i> Réintégrer' +
                      '</button>'
                    : isDesactive
                    ? '<button class="user-statut-toggle-btn reactiver" ' +
                          'data-doc-id="' + escapeAttr(email) + '" ' +
                          'title="Lui rendre l\'accès au site">' +
                          '<i class="fa-solid fa-user-check"></i> Réactiver' +
                      '</button>'
                    : (role === 'superadmin' || estMoi(email) ? '' :
                      '<button class="user-statut-toggle-btn desactiver" ' +
                          'data-doc-id="' + escapeAttr(email) + '" ' +
                          'title="Lui retirer l\'accès au site, sans rien supprimer">' +
                          '<i class="fa-solid fa-user-slash"></i> Désactiver' +
                      '</button>')) +
            (isHorsService ? '' :
                '<button class="user-delete-btn" ' +
                    'data-doc-id="' + escapeAttr(email) + '" ' +
                    'title="Supprimer ce membre">' +
                    '<i class="fa-solid fa-trash"></i> Supprimer' +
                '</button>') +
            '</div>' +
            '</div>';
    });

    grid.innerHTML = html;
}

// ============================================================
// 7. EVENT DELEGATION & INITIALISATION
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
                if (currentRole === 'superadmin') return; // rôle protégé
                var newRole = (currentRole === 'admin') ? 'member' : 'admin';

                // Verifier auto-retrogradation
                if (newRole === 'member' && firebase.auth().currentUser && email === firebase.auth().currentUser.email) {
                    openSelfDemoteModal(email);
                    return;
                }
                changeUserRole(email, newRole);
                return;
            }

            // Demande #62 — changer l'adresse, désactiver, réactiver
            var emailBtn = event.target.closest('.user-email-change-btn');
            if (emailBtn) {
                event.stopPropagation();
                openChangeEmailModal(emailBtn.getAttribute('data-doc-id'));
                return;
            }

            var statutBtn = event.target.closest('.user-statut-toggle-btn');
            if (statutBtn) {
                event.stopPropagation();
                var emailStatut = statutBtn.getAttribute('data-doc-id');
                if (statutBtn.classList.contains('reactiver')) {
                    changerStatutMembre(emailStatut, 'actif');
                } else {
                    openDesactiverModal(emailStatut);
                }
                return;
            }

            var editToggle = event.target.closest('.user-edit-toggle-btn');
            if (editToggle) {
                event.stopPropagation();
                var email = editToggle.getAttribute('data-doc-id');
                openUserEditModal(email);
                return;
            }

            var blockBtn = event.target.closest('.user-block-toggle-btn');
            if (blockBtn) {
                event.stopPropagation();
                var email = blockBtn.getAttribute('data-doc-id');
                if (blockBtn.classList.contains('unblock')) {
                    debloquerMembre(email);
                } else {
                    openBlocageModal(email);
                }
                return;
            }

            var deleteBtn = event.target.closest('.user-delete-btn');
            if (deleteBtn) {
                event.stopPropagation();
                var email = deleteBtn.getAttribute('data-doc-id');
                if (firebase.auth().currentUser && email === firebase.auth().currentUser.email) {
                    showToast('Vous ne pouvez pas supprimer votre propre compte.', 'error');
                    return;
                }
                openDeleteUserModal(email);
            }
        });
    }

    // Add user form toggle
    var addBtn = document.getElementById('add-user-btn');
    var addForm = document.getElementById('add-user-form');
    var cancelBtn = document.getElementById('cancel-add-user-btn');
    var confirmBtn = document.getElementById('confirm-add-user-btn');
    var emailInput = document.getElementById('new-user-email');

    if (addBtn && addForm) {
        addBtn.addEventListener('click', function() {
            addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
            if (addForm.style.display === 'flex' && emailInput) {
                emailInput.value = '';
                emailInput.focus();
            }
        });
    }

    if (cancelBtn && addForm) {
        cancelBtn.addEventListener('click', function() {
            addForm.style.display = 'none';
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            addUser();
        });
    }

    if (emailInput) {
        emailInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') addUser();
        });
    }
}

// ============================================================
// 7b. AJOUT D'UN MEMBRE
// ============================================================
function addUser() {
    var emailInput = document.getElementById('new-user-email');
    var addForm = document.getElementById('add-user-form');
    if (!emailInput) return;

    var email = emailInput.value.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Veuillez saisir une adresse email valide.', 'error');
        return;
    }

    // Verifier si l'email existe deja
    for (var i = 0; i < usersList.length; i++) {
        if (usersList[i]._id === email) {
            showToast('Ce membre existe déjà.', 'error');
            return;
        }
    }

    var pseudoInput = document.getElementById('new-user-pseudo');
    var nomInput = document.getElementById('new-user-nom');
    var prenomInput = document.getElementById('new-user-prenom');
    var pseudo = pseudoInput ? pseudoInput.value.trim() : '';
    var nom = nomInput ? nomInput.value.trim() : '';
    var prenom = prenomInput ? prenomInput.value.trim() : '';

    supabaseFetch('/rest/v1/membres', {
        method: 'POST',
        body: JSON.stringify({ email: email, role: 'member', pseudo: pseudo, nom: nom, prenom: prenom })
    })
        .then(function() {
            showToast('Membre ajouté avec succès', 'success');
            emailInput.value = '';
            if (pseudoInput) pseudoInput.value = '';
            if (nomInput) nomInput.value = '';
            if (prenomInput) prenomInput.value = '';
            if (addForm) addForm.style.display = 'none';
            loadUsers();
        })
        .catch(function(error) {
            showToast('Erreur lors de l\'ajout : ' + error.message, 'error');
            console.error('Erreur ajout membre:', error);
        });
}

// ============================================================
// 7b2. MODALE EDITION FICHE MEMBRE
// ============================================================
function openUserEditModal(email) {
    var user = null;
    for (var i = 0; i < usersList.length; i++) {
        if (usersList[i]._id === email) { user = usersList[i]; break; }
    }
    if (!user) return;

    var existing = document.getElementById('user-edit-modal-overlay');
    if (existing) existing.remove();

    var html = '<div id="user-edit-modal-overlay" class="user-modal-overlay" onclick="if(event.target===this)closeUserEditModal()">';
    html += '<div class="user-edit-modal">';
    html += '<button class="user-edit-modal-close" onclick="closeUserEditModal()">&times;</button>';
    html += '<h2><i class="fa-solid fa-user-pen"></i> Modifier la fiche</h2>';
    html += '<p class="user-edit-modal-email"><i class="fa-solid fa-envelope"></i> ' + escapeHtml(email) + '</p>';

    html += '<div class="user-edit-modal-fields">';
    html += '<div class="user-edit-modal-row">';
    html += '<div class="user-edit-modal-field"><label>Pseudo</label><input type="text" id="ue-pseudo" value="' + escapeAttr(user.pseudo || '') + '" placeholder="Pseudo"></div>';
    html += '</div>';
    html += '<div class="user-edit-modal-row">';
    html += '<div class="user-edit-modal-field"><label>Nom</label><input type="text" id="ue-nom" class="input-uppercase" value="' + escapeAttr(user.nom || '') + '" placeholder="Nom"></div>';
    html += '<div class="user-edit-modal-field"><label>Prénom</label><input type="text" id="ue-prenom" class="input-capitalize" value="' + escapeAttr(user.prenom || '') + '" placeholder="Prénom"></div>';
    html += '</div>';
    html += '<div class="user-edit-modal-row">';
    html += '<div class="user-edit-modal-field user-edit-modal-field-full"><label>Rue</label><input type="text" id="ue-rue" value="' + escapeAttr(user.rue || '') + '" placeholder="Adresse"></div>';
    html += '</div>';
    html += '<div class="user-edit-modal-row">';
    html += '<div class="user-edit-modal-field"><label>Code postal</label><input type="text" id="ue-cp" value="' + escapeAttr(user.code_postal || '') + '" placeholder="Code postal"></div>';
    html += '<div class="user-edit-modal-field"><label>Ville</label><input type="text" id="ue-ville" class="input-uppercase" value="' + escapeAttr(user.ville || '') + '" placeholder="Ville"></div>';
    html += '</div>';
    html += '<div class="user-edit-modal-row">';
    // Demande #38 — liste déroulante plutôt que saisie libre (fautes de frappe = drapeau
    // absent et filtre par pays faussé), avec le drapeau à côté, comme sur les cartes.
    html += '<div class="user-edit-modal-field"><label>Pays</label>'
        + '<div class="ue-pays-row">'
        + '<select id="ue-pays" onchange="majDrapeauEditionMembre()">' + optionsPaysHtml(user.pays) + '</select>'
        + '<span id="ue-pays-flag">' + (window.flagImg(user.pays || '') || '') + '</span>'
        + '</div></div>';
    html += '</div>';
    html += '<div class="user-edit-modal-row">';
    html += '<div class="user-edit-modal-field"><label>Indicatif</label><input type="text" id="ue-indicatif" value="' + escapeAttr(user.indicatif_tel || '') + '" placeholder="+33"></div>';
    html += '<div class="user-edit-modal-field"><label>Téléphone</label><input type="text" id="ue-telephone" value="' + escapeAttr(user.telephone || '') + '" placeholder="Téléphone"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="user-edit-modal-actions">';
    html += '<button class="user-modal-btn user-modal-btn-primary" onclick="saveUserEditModal(\'' + escapeAttr(email).replace(/'/g, "\\'") + '\')"><i class="fa-solid fa-check"></i> Sauvegarder</button>';
    html += '<button class="user-modal-btn" onclick="closeUserEditModal()"><i class="fa-solid fa-xmark"></i> Annuler</button>';
    html += '</div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    document.addEventListener('keydown', onUserEditKeydown);
}

function closeUserEditModal() {
    var overlay = document.getElementById('user-edit-modal-overlay');
    if (overlay) overlay.remove();
    document.removeEventListener('keydown', onUserEditKeydown);
}

function onUserEditKeydown(e) {
    if (e.key === 'Escape') closeUserEditModal();
}

function saveUserEditModal(email) {
    var data = {
        pseudo: document.getElementById('ue-pseudo').value.trim(),
        nom: document.getElementById('ue-nom').value.trim(),
        prenom: document.getElementById('ue-prenom').value.trim(),
        rue: document.getElementById('ue-rue').value.trim(),
        code_postal: document.getElementById('ue-cp').value.trim(),
        ville: document.getElementById('ue-ville').value.trim(),
        pays: document.getElementById('ue-pays').value.trim(),
        indicatif_tel: document.getElementById('ue-indicatif').value.trim(),
        telephone: document.getElementById('ue-telephone').value.trim()
    };

    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
        .then(function() {
            for (var i = 0; i < usersList.length; i++) {
                if (usersList[i]._id === email) {
                    Object.keys(data).forEach(function(k) { usersList[i][k] = data[k]; });
                    break;
                }
            }
            showToast('Fiche mise à jour', 'success');
            closeUserEditModal();

            // Demande #63 — replacer le point du membre sur la carte des stats si
            // son adresse a bougé. Meilleur effort : l'enregistrement est déjà
            // confirmé, un géocodeur en panne ne doit pas le remettre en cause.
            if (window.majPositionMembre) window.majPositionMembre(email);
            var searchInput = document.getElementById('user-search-input');
            var currentQuery = searchInput ? searchInput.value.trim() : '';
            renderUserCards(currentQuery);
        })
        .catch(function(error) {
            showToast('Erreur : ' + error.message, 'error');
        });
}

// ============================================================
// 7c. SUPPRESSION D'UN MEMBRE
// ============================================================
var deleteUserTargetEmail = null;

function openDeleteUserModal(email) {
    deleteUserTargetEmail = email;
    var overlay = document.getElementById('delete-user-modal-overlay');
    if (!overlay) return;

    var nameEl = document.getElementById('delete-user-email-display');
    if (nameEl) nameEl.textContent = email;

    overlay.style.display = 'flex';
    var cancelBtn = document.getElementById('delete-user-cancel-btn');
    if (cancelBtn) setTimeout(function() { cancelBtn.focus(); }, 100);

    document.addEventListener('keydown', onDeleteUserKeydown);
    overlay.addEventListener('click', onDeleteUserOverlayClick);
}

function closeDeleteUserModal() {
    var overlay = document.getElementById('delete-user-modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.removeEventListener('click', onDeleteUserOverlayClick);
    }
    deleteUserTargetEmail = null;
    document.removeEventListener('keydown', onDeleteUserKeydown);
}

function confirmDeleteUser() {
    if (!deleteUserTargetEmail) return;
    var email = deleteUserTargetEmail;

    // Vérifier si le membre a des inscriptions avant de supprimer
    supabaseFetch('/rest/v1/inscriptions?membre_id=eq.' + numeroDuMembre(email) + '&select=id&limit=1')
        .then(function(rows) {
            if (rows && rows.length > 0) {
                closeDeleteUserModal();
                showToast('Impossible de supprimer : ce membre a des inscriptions à des collectes', 'error');
                return;
            }
            closeDeleteUserModal();
            return supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
                method: 'DELETE'
            });
        })
        .then(function(result) {
            if (result === undefined) return; // arrêté car inscriptions existantes
            showToast('Membre supprimé', 'success');
            usersList = usersList.filter(function(u) { return u._id !== email; });
            renderUserCards();
            if (usersList.length === 0) {
                var emptyState = document.getElementById('user-empty-state');
                if (emptyState) emptyState.style.display = 'block';
            }
        })
        .catch(function(error) {
            console.error('Erreur suppression membre:', error);
            var bloquant = tableBloquantSuppression(error.message);
            if (bloquant) {
                showToast('Impossible de supprimer : ce membre a encore des données (' + bloquant + '). Elles sont conservées.', 'error');
                return;
            }
            showToast('Erreur lors de la suppression : ' + error.message, 'error');
        });
}

// Demande #62 — la base refuse de supprimer un membre dont des données dépendent
// (« … violates foreign key constraint … on table "enveloppes" »). On le dit en clair.
var LIBELLES_DONNEES_MEMBRE = {
    inscriptions: 'inscriptions', inscriptions_auto: 'pré-inscriptions',
    inscriptions_auto_pays: 'pré-inscriptions', collection: 'collection',
    dettes: 'compléments de paiement', enveloppes: 'enveloppes',
    collecteurs: 'fiche collecteur', collecteur_blacklist: 'liste noire d\'un collecteur',
    contacts_collecteur: 'contacts', demandes: 'demandes d\'amélioration',
    demande_commentaires: 'commentaires de demandes', demande_validations: 'validations de demandes',
    signalements: 'signalements'
};
function tableBloquantSuppression(message) {
    var m = /violates foreign key constraint .* on table "([a-z_]+)"/.exec(message || '');
    if (!m) return '';
    return LIBELLES_DONNEES_MEMBRE[m[1]] || m[1];
}

function onDeleteUserKeydown(e) {
    if (e.key === 'Escape') closeDeleteUserModal();
}

function onDeleteUserOverlayClick(e) {
    if (e.target.id === 'delete-user-modal-overlay') closeDeleteUserModal();
}

// ============================================================
// 7c-bis. CHANGER L'ADRESSE D'UN MEMBRE  (demande #62, étape 5)
// ------------------------------------------------------------
// C'est ce pour quoi tout le chantier a été fait : depuis que les données
// portent le NUMÉRO du membre, son adresse ne vit plus qu'à un endroit, sa
// fiche. La changer ne touche qu'une ligne, et ses inscriptions, sa collection,
// ses enveloppes, ses commentaires suivent sans bouger.
//
// Le piège prévu par la spec : à sa première connexion avec la nouvelle adresse
// Google, le membre s'est créé SANS LE SAVOIR une deuxième fiche « en attente »
// (policy membres_insert_self_pending). Il faut donc la retirer avant de
// renommer — et seulement si elle est vide. Le juge de « vide », c'est la base :
// ses clés étrangères refusent la suppression d'une fiche qui porte des données,
// et tableBloquantSuppression() traduit son refus en clair.
// ============================================================

function estMoi(email) {
    var u = firebase.auth().currentUser;
    return !!u && (u.email || '').toLowerCase() === (email || '').toLowerCase();
}

var changeEmailTarget = null;   // { email, id, nom }

function openChangeEmailModal(email) {
    var user = null;
    for (var i = 0; i < usersList.length; i++) {
        if (usersList[i]._id === email) { user = usersList[i]; break; }
    }
    if (!user) return;
    if (!user.id) { showToast('Fiche sans numéro de membre : rechargez la page', 'error'); return; }

    changeEmailTarget = {
        email: email,
        id: user.id,
        nom: ((user.nom || '') + ' ' + (user.prenom || '')).trim() || user.pseudo || email
    };

    var existing = document.getElementById('change-email-modal-overlay');
    if (existing) existing.remove();

    var html = '<div id="change-email-modal-overlay" class="user-modal-overlay" onclick="if(event.target===this)closeChangeEmailModal()">';
    html += '<div class="user-modal" role="dialog" aria-modal="true">';
    html += '<h2 class="user-modal-title"><i class="fa-solid fa-envelope-circle-check"></i> Changer l\'adresse</h2>';
    html += '<p class="user-modal-desc"><strong>' + escapeHtml(changeEmailTarget.nom) + '</strong> — membre n' + String.fromCharCode(176) + ' ' + user.id + '<br>'
         +  'Adresse actuelle : <strong>' + escapeHtml(email) + '</strong></p>';
    html += '<div class="user-edit-modal-field user-edit-modal-field-full" style="margin-bottom:12px;">';
    html += '<label for="change-email-nouvelle">Nouvelle adresse de connexion Google</label>';
    html += '<input type="email" id="change-email-nouvelle" autocomplete="off" placeholder="prenom.nom@exemple.com">';
    html += '</div>';
    html += '<p class="user-modal-desc" style="font-size:0.9em;">Tout ce qui lui appartient suit automatiquement : '
         +  'inscriptions, collection, enveloppes, paiements, commentaires. Il devra se connecter avec le compte '
         +  'Google correspondant à la nouvelle adresse ; s\'il est connecté, il sera déconnecté.</p>';
    html += '<div id="change-email-erreur" class="user-modal-desc" style="display:none;color:var(--color-danger);"></div>';
    html += '<div class="user-modal-actions">';
    html += '<button type="button" class="user-modal-btn" onclick="closeChangeEmailModal()">Annuler</button>';
    html += '<button type="button" class="user-modal-btn user-modal-btn-primary" id="change-email-valider" onclick="confirmChangeEmail()">'
         +  '<i class="fa-solid fa-check"></i> Changer l\'adresse</button>';
    html += '</div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var input = document.getElementById('change-email-nouvelle');
    if (input) {
        setTimeout(function() { input.focus(); }, 100);
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmChangeEmail(); });
    }
    document.addEventListener('keydown', onChangeEmailKeydown);
}

function closeChangeEmailModal() {
    var overlay = document.getElementById('change-email-modal-overlay');
    if (overlay) overlay.remove();
    changeEmailTarget = null;
    document.removeEventListener('keydown', onChangeEmailKeydown);
}

function onChangeEmailKeydown(e) {
    if (e.key === 'Escape') closeChangeEmailModal();
}

function erreurChangeEmail(message) {
    var el = document.getElementById('change-email-erreur');
    if (el) { el.textContent = message; el.style.display = ''; }
    var btn = document.getElementById('change-email-valider');
    if (btn) btn.disabled = false;
}

function confirmChangeEmail() {
    if (!changeEmailTarget) return;
    var cible = changeEmailTarget;
    var input = document.getElementById('change-email-nouvelle');
    var nouvelle = input ? input.value.trim() : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nouvelle)) {
        erreurChangeEmail('Ce n\'est pas une adresse e-mail.');
        return;
    }
    if (nouvelle.toLowerCase() === cible.email.toLowerCase()) {
        erreurChangeEmail('C\'est déjà son adresse.');
        return;
    }

    var btn = document.getElementById('change-email-valider');
    if (btn) btn.disabled = true;

    // La nouvelle adresse a-t-elle déjà une fiche ? (le « deuxième compte »)
    supabaseFetch('/rest/v1/membres?email=ilike.' + encodeURIComponent(nouvelle) + '&select=id,email,statut')
        .then(function(rows) {
            var autre = (rows && rows.length) ? rows[0] : null;
            if (!autre) return null;
            if (autre.id === cible.id) return null;   // même fiche, à la casse près
            // On tente de la retirer : la base refuse si elle porte des données.
            return supabaseFetch('/rest/v1/membres?id=eq.' + autre.id, { method: 'DELETE' })
                .then(function() { return autre; })
                .catch(function(err) {
                    var bloquant = tableBloquantSuppression(err.message);
                    // Refus prévu (la spec : « si la fiche cible porte de vraies données,
                    // le renommage est refusé et dit lesquelles ») : ce n'est pas un échec,
                    // on l'affiche tel quel.
                    var refus = new Error(bloquant
                        ? 'Cette adresse appartient déjà à une autre fiche, qui a des données ('
                          + bloquant + '). À traiter avant de renommer.'
                        : 'Cette adresse appartient déjà à une autre fiche, impossible de la retirer : ' + err.message);
                    refus.refusAttendu = true;
                    throw refus;
                });
        })
        .then(function(autreRetiree) {
            return supabaseFetch('/rest/v1/membres?id=eq.' + cible.id, {
                method: 'PATCH',
                headers: { Prefer: 'return=minimal' },
                body: JSON.stringify({ email: nouvelle })
            }).then(function() { return autreRetiree; });
        })
        .then(function(autreRetiree) {
            for (var i = 0; i < usersList.length; i++) {
                if (usersList[i].id === cible.id) {
                    usersList[i].email = nouvelle;
                    usersList[i]._id = nouvelle;
                }
            }
            if (autreRetiree) {
                usersList = usersList.filter(function(u) { return u.id !== autreRetiree.id; });
            }
            closeChangeEmailModal();
            renderUserCards(document.getElementById('user-search-input')
                ? document.getElementById('user-search-input').value.trim() : '');
            showToast('Adresse changée : ' + cible.nom + ' se connecte désormais avec ' + nouvelle, 'success');
        })
        .catch(function(error) {
            if (error && error.refusAttendu) {
                erreurChangeEmail(error.message);
                return;
            }
            if (/duplicate key|unique/i.test(error.message || '')) {
                erreurChangeEmail('Cette adresse est déjà prise par une autre fiche.');
                return;
            }
            console.error('Erreur changement d\'adresse:', error);
            erreurChangeEmail('Échec : ' + error.message);
        });
}

// ============================================================
// 7c-ter. DESACTIVER / REACTIVER UN MEMBRE  (demande #62, étape 5)
// ------------------------------------------------------------
// Désactiver, c'est retirer l'accès sans rien supprimer : depuis l'étape 2, les
// règles d'accès ne reconnaissent qu'une fiche ACTIVE, et l'étape 0 a appris aux
// écrans à ne plus proposer un compte désactivé. Ses données restent, son nom
// continue de s'afficher sur ses anciennes lignes.
// ============================================================

var desactiverTargetEmail = null;

function openDesactiverModal(email) {
    var user = null;
    for (var i = 0; i < usersList.length; i++) {
        if (usersList[i]._id === email) { user = usersList[i]; break; }
    }
    if (!user) return;
    if (estMoi(email)) { showToast('Vous ne pouvez pas vous désactiver vous-même', 'error'); return; }
    if (user.role === 'superadmin') { showToast('Un superadmin ne se désactive pas', 'error'); return; }

    desactiverTargetEmail = email;
    var displayName = ((user.nom || '') + ' ' + (user.prenom || '')).trim() || user.pseudo || email;

    var existing = document.getElementById('desactiver-modal-overlay');
    if (existing) existing.remove();

    var html = '<div id="desactiver-modal-overlay" class="user-modal-overlay" onclick="if(event.target===this)closeDesactiverModal()">';
    html += '<div class="user-modal" role="dialog" aria-modal="true">';
    html += '<h2 class="user-modal-title"><i class="fa-solid fa-user-slash"></i> Désactiver ce membre</h2>';
    html += '<p class="user-modal-desc"><strong>' + escapeHtml(displayName) + '</strong> ne pourra plus se connecter, '
         +  'et n\'apparaîtra plus dans les listes où l\'on choisit un membre. <strong>Rien n\'est supprimé</strong> : '
         +  'ses inscriptions, sa collection et son nom restent sur ses anciennes lignes. C\'est réversible.</p>';
    html += '<div class="user-modal-actions">';
    html += '<button type="button" class="user-modal-btn" onclick="closeDesactiverModal()">Annuler</button>';
    html += '<button type="button" class="user-modal-btn user-modal-btn-danger" onclick="confirmDesactiver()">'
         +  '<i class="fa-solid fa-user-slash"></i> Désactiver</button>';
    html += '</div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    document.addEventListener('keydown', onDesactiverKeydown);
}

function closeDesactiverModal() {
    var overlay = document.getElementById('desactiver-modal-overlay');
    if (overlay) overlay.remove();
    desactiverTargetEmail = null;
    document.removeEventListener('keydown', onDesactiverKeydown);
}

function onDesactiverKeydown(e) {
    if (e.key === 'Escape') closeDesactiverModal();
}

function confirmDesactiver() {
    var email = desactiverTargetEmail;
    closeDesactiverModal();
    if (email) changerStatutMembre(email, 'desactive');
}

function changerStatutMembre(email, statut) {
    var membreId = numeroDuMembre(email);
    if (!membreId) { showToast('Fiche sans numéro de membre : rechargez la page', 'error'); return; }
    // Demande #72 — sortir de veille : la base remet la date de visite à ce jour
    // (sans quoi il y retomberait à la revue suivante) et le note au journal.
    var etaitEnVeille = usersList.some(function(u) { return u.id === membreId && u.statut === 'en_veille'; });

    supabaseFetch('/rest/v1/membres?id=eq.' + membreId, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ statut: statut })
    })
        .then(function() {
            for (var i = 0; i < usersList.length; i++) {
                if (usersList[i].id === membreId) usersList[i].statut = statut;
            }
            renderUserCards(document.getElementById('user-search-input')
                ? document.getElementById('user-search-input').value.trim() : '');
            showToast(statut === 'desactive' ? 'Membre désactivé — ses données sont conservées'
                    : etaitEnVeille ? 'Membre réintégré : il peut se reconnecter'
                                    : 'Membre réactivé : il peut se reconnecter', 'success');
        })
        .catch(function(error) {
            console.error('Erreur changement de statut:', error);
            showToast('Erreur : ' + error.message, 'error');
        });
}

// ============================================================
// 7d. BLOCAGE / DEBLOCAGE D'INSCRIPTION (admin uniquement)
// Empêche un membre de s'inscrire à toute nouvelle collecte
// (tous collecteurs, y compris pré-collecte). N'efface pas ses
// inscriptions existantes.
// ============================================================
function openBlocageModal(email) {
    var user = null;
    for (var i = 0; i < usersList.length; i++) {
        if (usersList[i]._id === email) { user = usersList[i]; break; }
    }
    if (!user) return;

    var existing = document.getElementById('blocage-modal-overlay');
    if (existing) existing.remove();

    var displayName = ((user.nom || '') + ' ' + (user.prenom || '')).trim() || user.pseudo || email;

    var html = '<div id="blocage-modal-overlay" class="user-modal-overlay" onclick="if(event.target===this)closeBlocageModal()">';
    html += '<div class="user-modal" role="dialog" aria-modal="true">';
    html += '<h2 class="user-modal-title"><i class="fa-solid fa-ban"></i> Bloquer les inscriptions</h2>';
    html += '<p class="user-modal-desc">Vous allez empêcher <strong>' + escapeHtml(displayName) + '</strong> de s\'inscrire à toute nouvelle collecte (tous collecteurs, pré-collectes comprises). Ses inscriptions existantes ne sont pas supprimées.</p>';
    html += '<div class="user-edit-modal-field user-edit-modal-field-full" style="margin-bottom:16px;">';
    html += '<label>Motif (visible par les admins et le membre concerné)</label>';
    html += '<textarea id="blocage-motif" rows="3" placeholder="Ex. : litige de paiement, blocage temporaire jusqu\'à régularisation…"></textarea>';
    html += '</div>';
    html += '<div class="user-modal-actions">';
    html += '<button type="button" class="user-modal-btn" onclick="closeBlocageModal()">Annuler</button>';
    html += '<button type="button" class="user-modal-btn user-modal-btn-danger" onclick="confirmBlocage(\'' + escapeAttr(email).replace(/'/g, "\\'") + '\')"><i class="fa-solid fa-ban"></i> Bloquer</button>';
    html += '</div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var ta = document.getElementById('blocage-motif');
    if (ta) setTimeout(function() { ta.focus(); }, 100);
    document.addEventListener('keydown', onBlocageKeydown);
}

function closeBlocageModal() {
    var overlay = document.getElementById('blocage-modal-overlay');
    if (overlay) overlay.remove();
    document.removeEventListener('keydown', onBlocageKeydown);
}

function onBlocageKeydown(e) {
    if (e.key === 'Escape') closeBlocageModal();
}

function confirmBlocage(email) {
    var ta = document.getElementById('blocage-motif');
    var motif = ta ? ta.value.trim() : '';
    var bloquePar = (firebase.auth().currentUser && firebase.auth().currentUser.email) || '';

    supabaseFetch('/rest/v1/membre_blocages?on_conflict=membre_id', {
        method: 'POST',
        body: JSON.stringify({ membre_id: numeroDuMembre(email), motif: motif, bloque_by: bloquePar }),
        headers: { 'Prefer': 'resolution=merge-duplicates, return=minimal' }
    })
        .then(function() {
            for (var i = 0; i < usersList.length; i++) {
                if (usersList[i]._id === email) {
                    usersList[i]._bloque = true;
                    usersList[i]._blocageMotif = motif;
                    break;
                }
            }
            showToast('Membre bloqué pour les inscriptions', 'success');
            closeBlocageModal();
            var searchInput = document.getElementById('user-search-input');
            renderUserCards(searchInput ? searchInput.value.trim() : '');
        })
        .catch(function(error) {
            showToast('Erreur lors du blocage : ' + error.message, 'error');
            console.error('Erreur blocage membre:', error);
        });
}

function debloquerMembre(email) {
    supabaseFetch('/rest/v1/membre_blocages?membre_id=eq.' + numeroDuMembre(email), {
        method: 'DELETE'
    })
        .then(function() {
            for (var i = 0; i < usersList.length; i++) {
                if (usersList[i]._id === email) {
                    usersList[i]._bloque = false;
                    usersList[i]._blocageMotif = '';
                    break;
                }
            }
            showToast('Membre débloqué', 'success');
            var searchInput = document.getElementById('user-search-input');
            renderUserCards(searchInput ? searchInput.value.trim() : '');
        })
        .catch(function(error) {
            showToast('Erreur lors du déblocage : ' + error.message, 'error');
            console.error('Erreur déblocage membre:', error);
        });
}

// ============================================================
// 8. STORY 3.2 — CHANGEMENT DE ROLE SUPABASE
// ============================================================
function changeUserRole(email, newRole, isSelfDemotion) {
    var previousRole = (newRole === 'admin') ? 'member' : 'admin';

    // Mise a jour optimiste du DOM
    updateRoleInDOM(email, newRole);

    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
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
    var card = document.querySelector('.user-card[data-doc-id="' + CSS.escape(email) + '"]');
    if (!card) return;

    var badge = card.querySelector('.user-badge-role');
    if (badge) {
        badge.textContent = (newRole === 'admin') ? 'Admin' : 'Membre';
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
