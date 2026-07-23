// ============================================================
// CONFIGURATION — Version Supabase (Story 4.7)
// ============================================================

// SEC-02 — Fonctions d'echappement pour empecher les XSS
function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sanitizeUrl(url) {
    if (!url) return '';
    var trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return '';
}

var allData = [];
var currentData = [];
var displayedCount = 0;
var BATCH_SIZE = 50;

// #14 — Onboarding catalogue billets
function showCatalogueOnboarding() {
    var key = 'bt_onboarding_catalogue_dismissed';
    if (localStorage.getItem(key)) return;

    var target = document.querySelector('header');
    if (!target) return;

    var html = '<div class="onboarding-banner onboarding-banner--compact" id="onboarding-catalogue">'
        + '<button class="onboarding-close" onclick="dismissOnboardingCatalogue()" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>'
        + '<h3 class="onboarding-title"><i class="fa-solid fa-hand-point-up"></i> Comment s\'inscrire à une collecte ?</h3>'
        + '<p class="onboarding-text">Parcourez les billets ci-dessous. Quand une collecte vous intéresse, '
        + 'cliquez sur le bouton <strong>« S\'inscrire »</strong> sur la fiche du billet. '
        + 'Choisissez la quantité souhaitée, puis validez. '
        + 'Vous retrouverez ensuite toutes vos inscriptions dans <a href="mes-inscriptions.html"><strong>Mes inscriptions</strong></a>.</p>'
        + '</div>';

    target.insertAdjacentHTML('afterend', html);
}

function dismissOnboardingCatalogue() {
    localStorage.setItem('bt_onboarding_catalogue_dismissed', '1');
    var el = document.getElementById('onboarding-catalogue');
    if (el) el.remove();
}

// Story 5.4 : Inscriptions du membre connecté et collecteurs
var mesInscriptions = {};
var collectesByBillet = {};            // billet_id → collectes SUPPLÉMENTAIRES ouvertes (hors principale)
var collectePrincipaleByBillet = {};   // billet_id → collecte principale (« Collecte initiale »)
var collecteByIdCatalogue = {};        // collecte_id → collecte (toutes)
var collecteursMap = {};

// Tarif de l'inscription d'un membre : sa collecte si connue, sinon la principale du billet.
function tarifInscriptionCatalogue(insc, billetId) {
    var c = (insc && insc.collecte_id && collecteByIdCatalogue[insc.collecte_id]) || collectePrincipaleByBillet[billetId];
    return prixCollecteCatalogue(c);
}

// Demande #16 (bascule collecteur) — le collecteur « du billet » côté catalogue
// vient de sa collecte principale (billets.Collecteur supprimé).
function collecteurPrincipalCatalogue(item) {
    var cp = item && collectePrincipaleByBillet[item.id];
    return (cp && cp.collecteur) || '';
}

// Demande #16 — tarif normalisé d'une collecte (catalogue)
function prixCollecteCatalogue(c) {
    var p = (c && c.prix !== null && c.prix !== undefined && c.prix !== '') ? parseFloat(c.prix) : 0;
    var pv = (c && c.prix_variante !== null && c.prix_variante !== undefined && c.prix_variante !== '') ? parseFloat(c.prix_variante) : p;
    return { prix: p, prixVar: pv, payerFdp: (c && c.payer_fdp) || '', fdpCom: (c && c.fdp_com) || '' };
}

// Frais de port dynamiques
var fraisPortCatalogue = [];
var membrePaysCatalogue = '';
var membreTerminaisonsCatalogue = ''; // Demande #9 — préférence terminaisons du membre (pré-remplissage pré-collecte)

// Story 5.12 : Compteurs BT automatiques
var compteurInscriptionsMap = {};

// Filtre par catégorie actif
var billetsActiveStatusFilter = 'tous';

// Multi-select pays
var selectedPays = [];

// Tri actif : 'date' (défaut) ou 'reference'
var billetsSort = 'date';

// Préférence masquer les billets "pas intéressé"
var masquerPasInteresse = false;

// Catégories dans l'ordre d'affichage
var BILLETS_CATEGORIES = [
    'Pré collecte',
    'Collecte',
    'Terminé',
    'Pas de collecte',
    'Jamais édité, projet',
    'Masqué'
];

// Couleurs des categories (meme mapping que admin.js)
var CATEGORIE_COLORS = {
    'Collecte': '#A4C2F4',
    'Pré collecte': '#FFFF00',
    'Terminé': '#C27BA0',
    'Pas de collecte': '#FF0000',
    'Jamais édité, projet': '#CECECE',
    'Non defini': '#F57C00',
    'Masqué': '#555555'
};

function getCategorieColor(categorie) {
    return CATEGORIE_COLORS[categorie || 'Non defini'] || CATEGORIE_COLORS['Non defini'];
}

function getTextColorForBg(hex) {
    if (!hex || hex.charAt(0) !== '#') return '#000';
    var r = parseInt(hex.substr(1, 2), 16);
    var g = parseInt(hex.substr(3, 2), 16);
    var b = parseInt(hex.substr(5, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#000' : '#fff';
}

// Resolution image — priorite ImageUrl (Cloudinary) > ImageId (Google Drive)
// QR code overlay via Cloudinary fetch layer (bottom-right, semi-transparent)
var QR_OVERLAY = 'l_fetch:aHR0cHM6Ly9hcGkucXJzZXJ2ZXIuY29tL3YxL2NyZWF0ZS1xci1jb2RlLz9zaXplPTE1MHgxNTAmZGF0YT1odHRwczovL2N5cmlsMjUuZ2l0aHViLmlvL0JpbGxldHNUb3VyaXN0aXF1ZXM=,w_0.1,x_0.088,fl_relative,g_west,o_70';
function resolveImageUrl(item, size) {
    if (item.ImageUrl) {
        return item.ImageUrl.replace('/upload/', '/upload/f_auto,q_auto,w_' + (size || 800) + '/' + QR_OVERLAY + '/');
    }
    if (item.ImageId) {
        var driveUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(item.ImageId) + '&sz=w' + (size || 800);
        return 'https://res.cloudinary.com/dxoyqxben/image/fetch/f_auto,q_auto,w_' + (size || 800) + '/' + QR_OVERLAY + '/' + encodeURIComponent(driveUrl);
    }
    return '';
}

function resolveDownloadUrl(item) {
    if (item.ImageUrl) {
        return item.ImageUrl;
    }
    if (item.ImageId) {
        return 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(item.ImageId);
    }
    return '#';
}

// Référence au slider (div vide dans le HTML)
var dateSlider = document.getElementById('date-slider');

document.addEventListener('DOMContentLoaded', function() {
    // S'assure que le mode par défaut (Collecte) est activé au chargement
    document.body.classList.add('view-collecte');
});

// Le chargement des données est déclenché après confirmation de l'auth Firebase.
// global.js gère les redirections et les membres ; app-new.js se contente d'écouter.
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            showCatalogueOnboarding();
            fetchData();
            loadMesInscriptions();
            loadCollectesByBillet();
            loadCollecteursForCatalogue();
            loadCompteursInscriptions();
            loadFraisPortCatalogue(window.getActiveEmail());
            loadBlacklistMembre(window.getActiveEmail());
            loadBlocageMembre(window.getActiveEmail());
        }
    });
}

// ============================================================
// 1. CHARGEMENT DES DONNÉES DEPUIS SUPABASE
// ============================================================
function fetchData() {
    var counter = document.getElementById('counter');

    // Feedback visuel de chargement
    if (counter) {
        counter.innerText = "Chargement...";
        counter.style.backgroundColor = "#EFE9F7";
        counter.style.color = "#5D3A7E";
    }

    var user = firebase.auth().currentUser;
    if (!user) {
        console.warn("fetchData() appelé sans utilisateur connecté. Annulation.");
        if (counter) counter.innerText = "Non connecté";
        return;
    }

    supabaseFetch('/rest/v1/billets?select=*&order=date_effective.desc.nullslast,Categorie.asc')
        .then(function(data) {
            console.log("Données Supabase reçues :", data.length);
            allData = data || [];

            // On met à jour les listes déroulantes
            populateFilters();

            // Initialisation du slider
            initSlider();

            // Application des filtres et affichage
            applyFilters(false);

            if (counter) {
                counter.style.backgroundColor = "#B19CD9";
                counter.style.color = "white";
                counter.innerText = currentData.length + " billets";
            }

            // Lien direct : ?billet=ID → scroll + ouverture formulaire
            handleDeepLinkBillet();
        })
        .catch(function(err) {
            console.error("Erreur chargement Supabase :", err);
            if (counter) {
                counter.innerText = "Erreur !";
                counter.style.backgroundColor = "var(--color-danger, #CC4444)";
                counter.style.color = "#fff";
            }
            var grid = document.getElementById('cards-grid');
            if (grid) {
                grid.innerHTML =
                    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--color-danger, #CC4444);">' +
                    '<i class="fa-solid fa-circle-exclamation" style="font-size:2em; margin-bottom:12px; display:block;"></i>' +
                    '<strong>Impossible de charger les billets.</strong><br>' +
                    '<span style="color:var(--color-text-light, #666); font-size:0.9em;">' + escapeHtml(err.message || 'Erreur réseau') + ' — Réessaye dans quelques instants.</span>' +
                    '</div>';
            }
        });
}

// ============================================================
// 2. GESTION DU SLIDER DATE (NOUISLIDER)
// ============================================================
function initSlider() {
    // Si le div n'existe pas, on arrête
    if (!dateSlider) return;

    // 1. On récupère toutes les dates valides et on les convertit en Timestamp
    var dates = allData
        .map(function(d) { return normalizeDate(d.Date); })
        .filter(function(d) { return d.length > 0; })
        .map(function(d) { return new Date(d).getTime(); })
        .filter(function(t) { return !isNaN(t); });

    if (dates.length === 0) return;

    // 2. On trouve le Min et le Max
    var minTimestamp = Math.min.apply(null, dates);
    var maxTimestamp = Math.max.apply(null, dates);

    // 3. Si le slider existe déjà (re-chargement), on le détruit proprement
    if (dateSlider && dateSlider.noUiSlider) {
        dateSlider.noUiSlider.destroy();
    }
    if (!dateSlider) return;

    // 4. Création du slider
    noUiSlider.create(dateSlider, {
        start: [minTimestamp, maxTimestamp],
        connect: true,
        range: {
            'min': minTimestamp,
            'max': maxTimestamp
        },
        step: 24 * 60 * 60 * 1000,
        tooltips: false
    });

    // 5. Quand le slider bouge -> On met à jour les inputs dates
    dateSlider.noUiSlider.on('update', function(values, handle) {
        var dateObj = new Date(parseInt(values[handle]));
        var dateStr = dateObj.toISOString().split('T')[0];

        if (handle === 0) {
            document.getElementById('date-start').value = dateStr;
        } else {
            document.getElementById('date-end').value = dateStr;
        }
    });

    // 6. Quand on lâche la souris -> On lance le filtre
    dateSlider.noUiSlider.on('change', function() {
        applyFilters();
    });
}

// Fonction appelée quand on change l'input date à la main
function manualDateChange() {
    var startVal = document.getElementById('date-start').value;
    var endVal = document.getElementById('date-end').value;

    // Si le slider est actif, on met à jour ses poignées
    if (dateSlider && dateSlider.noUiSlider && startVal && endVal) {
        var startTs = new Date(startVal).getTime();
        var endTs = new Date(endVal).getTime();
        dateSlider.noUiSlider.set([startTs, endTs]);
    }
    applyFilters();
}

// ============================================================
// 3. FONCTIONS UTILITAIRES & FILTRES
// ============================================================

// Change l'affichage (Collecte / Liste / Galerie)
function changeView(mode) {
    var body = document.body;
    body.classList.remove('view-collecte', 'view-liste', 'view-galerie');
    body.classList.add('view-' + mode);

    // Le filtre est relancé pour re-générer la vue correcte
    applyFilters(false);
}

function setSortMode(mode) {
    billetsSort = mode;
    var btnDate = document.getElementById('btn-sort-date');
    var btnRef = document.getElementById('btn-sort-ref');
    if (btnDate) btnDate.classList.toggle('btn-mode--active', mode === 'date');
    if (btnRef) btnRef.classList.toggle('btn-mode--active', mode === 'reference');
    applyFilters(false);
}

function toggleMasquerPasInteresse() {
    var cb = document.getElementById('toggle-masquer-pas-interesse');
    masquerPasInteresse = cb ? cb.checked : !masquerPasInteresse;
    var email = window.getActiveEmail();
    if (email) {
        supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
            method: 'PATCH',
            body: JSON.stringify({ masquer_pas_interesse: masquerPasInteresse })
        }).catch(function(err) {
            console.warn('Erreur sauvegarde préférence masquer_pas_interesse:', err);
        });
    }
    applyFilters(false);
}

function updateToggleMasquer() {
    var cb = document.getElementById('toggle-masquer-pas-interesse');
    if (cb) cb.checked = masquerPasInteresse;
}

// Convertit 25/12/2025 ou 2025-12-25T10:00 en 2025-12-25
function normalizeDate(str) {
    if (!str) return "";
    var clean = str.substring(0, 10);
    // Si format français JJ/MM/AAAA
    if (clean.indexOf('/') !== -1) {
        var parts = clean.split('/');
        if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    return clean;
}

function populateFilters() {
    var maps = [
        { id: 'sel-year', key: 'Millesime' },
        { id: 'sel-theme', key: 'Theme' },
        { id: 'sel-coll', key: 'Collecteur' }
    ];
    maps.forEach(function(m) {
        var select = document.getElementById(m.id);
        if (!select) return;

        var currentVal = select.value;
        var h = '<option value="">Tout</option>';
        var unique = [];
        var seen = {};
        allData.forEach(function(item) {
            var v = item[m.key];
            if (v && !seen[v]) {
                seen[v] = true;
                unique.push(v);
            }
        });
        unique.sort().forEach(function(val) {
            h += '<option value="' + escapeAttr(val) + '"' + (val === currentVal ? ' selected' : '') + '>' + escapeHtml(val) + '</option>';
        });
        select.innerHTML = h;
    });

    // Multi-select pays : reconstruire la liste des options
    var paysDropdown = document.getElementById('sel-pays-dropdown');
    if (paysDropdown) {
        var uniquePays = [];
        var seenPays = {};
        allData.forEach(function(item) {
            var v = item['Pays'];
            if (v && !seenPays[v]) {
                seenPays[v] = true;
                uniquePays.push(v);
            }
        });
        uniquePays.sort();

        var h = '';
        if (uniquePays.length > 0) {
            h += '<span class="multiselect-clear" onclick="clearPaysFilter()"><i class="fa-solid fa-xmark"></i> Tout effacer</span>';
        }
        uniquePays.forEach(function(val) {
            var checked = selectedPays.indexOf(val) !== -1 ? ' checked' : '';
            h += '<label role="option" aria-selected="' + (checked ? 'true' : 'false') + '">'
                + '<input type="checkbox" value="' + escapeAttr(val) + '"' + checked + ' onchange="togglePaysOption(this.value, this.checked)">'
                + escapeHtml(val)
                + '</label>';
        });
        paysDropdown.innerHTML = h;
    }

    renderBilletsStatusCounters();
}

function renderBilletsStatusCounters(filteredData) {
    var container = document.getElementById('billets-status-counters');
    if (!container) return;

    var source = filteredData || allData;
    var counts = {};
    var total = source.length;
    source.forEach(function(billet) {
        var statut = billet.Categorie || 'Non defini';
        counts[statut] = (counts[statut] || 0) + 1;
    });

    var statutOrder = BILLETS_CATEGORIES.slice();
    Object.keys(counts).forEach(function(s) {
        if (statutOrder.indexOf(s) === -1) statutOrder.push(s);
    });

    var html = '<button class="admin-status-counter' +
        (billetsActiveStatusFilter === 'tous' ? ' admin-status-counter--active' : '') +
        '" data-status="tous" onclick="billetsFilterByStatus(\'tous\')" aria-pressed="' +
        (billetsActiveStatusFilter === 'tous' ? 'true' : 'false') + '">' +
        '<span class="admin-status-counter__count">' + total + '</span>' +
        '<span class="admin-status-counter__label">Tous</span></button>';

    statutOrder.forEach(function(statut) {
        if (!counts[statut]) return;
        var isActive = billetsActiveStatusFilter === statut;
        var color = getCategorieColor(statut);
        html += '<button class="admin-status-counter' +
            (isActive ? ' admin-status-counter--active' : '') +
            '" data-status="' + statut.replace(/"/g, '&quot;') + '" onclick="billetsFilterByStatus(\'' +
            statut.replace(/'/g, "\\'") + '\')" aria-pressed="' +
            (isActive ? 'true' : 'false') +
            '" style="border-left-color: ' + color + ';">' +
            '<span class="admin-status-counter__count">' + counts[statut] + '</span>' +
            '<span class="admin-status-counter__label">' + escapeHtml(statut) + '</span></button>';
    });

    container.innerHTML = html;
}

function billetsFilterByStatus(statut) {
    billetsActiveStatusFilter = statut;
    renderBilletsStatusCounters();
    applyFilters();
}

// --- Multi-select Pays ---
function togglePaysDropdown(event) {
    event.stopPropagation();
    var dropdown = document.getElementById('sel-pays-dropdown');
    var btn = document.getElementById('sel-pays-btn');
    if (!dropdown) return;
    var isOpen = dropdown.style.display !== 'none';
    if (isOpen) {
        dropdown.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
    } else {
        dropdown.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
    }
}

function togglePaysOption(val, checked) {
    if (checked) {
        if (selectedPays.indexOf(val) === -1) selectedPays.push(val);
    } else {
        selectedPays = selectedPays.filter(function(v) { return v !== val; });
    }
    updatePaysLabel();
    applyFilters();
}

function clearPaysFilter() {
    selectedPays = [];
    var dropdown = document.getElementById('sel-pays-dropdown');
    if (dropdown) {
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
    }
    updatePaysLabel();
    applyFilters();
}

function updatePaysLabel() {
    var label = document.getElementById('sel-pays-label');
    if (!label) return;
    if (selectedPays.length === 0) {
        label.textContent = 'Tous';
    } else if (selectedPays.length === 1) {
        label.textContent = selectedPays[0];
    } else {
        label.textContent = selectedPays.length + ' pays';
    }
}

// Fermer le dropdown pays si clic en dehors
document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('pays-multiselect-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        var dropdown = document.getElementById('sel-pays-dropdown');
        var btn = document.getElementById('sel-pays-btn');
        if (dropdown) dropdown.style.display = 'none';
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
});

function applyFilters(silent) {
    if (silent === undefined) silent = false;
    // Si on est sur une page sans grille, on arrête
    var grid = document.getElementById('cards-grid');
    if (!grid) return;

    var searchInput = document.getElementById('search-input');
    var s = searchInput ? searchInput.value.toLowerCase() : '';
    var fCat = billetsActiveStatusFilter !== 'tous' ? billetsActiveStatusFilter : '';
    var fPays = selectedPays; // tableau (multi-select)
    var fYear = document.getElementById('sel-year').value;
    var fTheme = document.getElementById('sel-theme').value;
    var fColl = document.getElementById('sel-coll').value;

    // Dates (Input text YYYY-MM-DD)
    var fStart = document.getElementById('date-start').value;
    var fEnd = document.getElementById('date-end').value;

    // Filtre sans la catégorie pour mettre à jour les compteurs des chips
    // Les billets "Masqué" sont exclus de la vue publique
    var preFiltered = allData.filter(function(item) {
        if (item.Categorie === 'Masqué') return false;

        var txt = !s || (item.NomBillet && item.NomBillet.toLowerCase().indexOf(s) !== -1) ||
            (item.Ville && item.Ville.toLowerCase().indexOf(s) !== -1) ||
            (item.Reference && item.Reference.toLowerCase().indexOf(s) !== -1) ||
            (item.Recherche && item.Recherche.toLowerCase().indexOf(s) !== -1);

        var itemDate = normalizeDate(item.Date);
        var matchDate = (!fStart || (itemDate && itemDate >= fStart)) &&
            (!fEnd || (itemDate && itemDate <= fEnd));

        return txt && matchDate &&
            (!fPays.length || fPays.indexOf(item.Pays) !== -1) && (!fYear || item.Millesime == fYear) &&
            (!fTheme || item.Theme === fTheme) && (!fColl || collecteurPrincipalCatalogue(item) === fColl) &&
            (!masquerPasInteresse || !estPasInteresse(item.id));
    });

    renderBilletsStatusCounters(preFiltered);

    // Puis filtre par catégorie pour l'affichage
    if (fCat) {
        currentData = preFiltered.filter(function(item) {
            return (item.Categorie || 'Non defini') === fCat;
        });
    } else {
        currentData = preFiltered;
    }

    // Tri
    if (billetsSort === 'reference') {
        currentData = currentData.slice().sort(function(a, b) {
            var ra = (a.Reference || '').toLowerCase();
            var rb = (b.Reference || '').toLowerCase();
            if (ra < rb) return -1;
            if (ra > rb) return 1;
            // Millésime-Version en secondaire
            var va = (a.Millesime || '') + '-' + (a.Version || '');
            var vb = (b.Millesime || '') + '-' + (b.Version || '');
            return va < vb ? -1 : va > vb ? 1 : 0;
        });
    }
    // tri 'date' : ordre natif de l'API (Date.desc), rien à faire

    if (!silent) {
        // Vider l'affichage
        grid.innerHTML = "";
        displayedCount = 0;

        // Si le mode Liste est actif, on affiche le tableau, sinon la grille/galerie.
        if (document.body.classList.contains('view-liste')) {
            renderListTable();
        } else {
            // S'assure que le conteneur du tableau est vide si on passe en grille/galerie
            var listTableContainer = document.getElementById('list-table-container');
            if (listTableContainer) listTableContainer.innerHTML = "";
            showMore();
        }
    } else {
        updateLoadMoreButton();
    }

    // Mise à jour compteur global
    var counterBtn = document.getElementById('counter');
    if (counterBtn) counterBtn.innerText = currentData.length + " billets";
}

// ============================================================
// 4. RENDU HTML (TEMPLATES POUR 3 MODES)
// ============================================================

// --- Rendu Mode Liste (Tableau) ---
function renderListTable() {
    var tableContainer = document.getElementById('list-table-container');
    if (!tableContainer) return;

    if (currentData.length === 0) {
        tableContainer.innerHTML = "<p style='text-align:center;'>Aucun résultat.</p>";
        updateLoadMoreButton();
        return;
    }

    var html =
        '<table id="billets-table">' +
        '<thead><tr>' +
        '<th>N°</th><th>Année-Version</th><th>Dép.</th><th>Réf.</th>' +
        '<th>Ville</th><th>Nom Billet</th><th>Collecteur</th><th>Commentaire</th>' +
        '</tr></thead><tbody>';

    currentData.forEach(function(item) {
        html +=
            '<tr>' +
            '<td>' + (item.id || '') + '</td>' +
            '<td>' + escapeHtml((item.Millesime || 'XXXX') + '-' + (item.Version || 'X')) + '</td>' +
            '<td>' + escapeHtml(item.Dep || '') + '</td>' +
            '<td class="col-ref">' + escapeHtml(item.Reference || '') + '</td>' +
            '<td>' + escapeHtml(item.Ville || '') + '</td>' +
            '<td>' + escapeHtml(item.NomBillet || '') + '</td>' +
            '<td>' + escapeHtml(collecteurPrincipalCatalogue(item)) + '</td>' +
            '<td class="col-comment">' + escapeHtml(item.Commentaire || '') + '</td>' +
            '</tr>';
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;

    // On masque le bouton Load More car le tableau affiche tout
    var btn = document.getElementById('btn-load-more');
    if (btn) btn.style.display = 'none';
}


// --- Rendu Mode Collecte & Galerie ---
function showMore() {
    var body = document.body;
    var grid = document.getElementById('cards-grid');
    var batch = currentData.slice(displayedCount, displayedCount + BATCH_SIZE);

    var isGalleryMode = body.classList.contains('view-galerie');

    if (batch.length === 0 && displayedCount === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Aucun résultat.</p>";
        updateLoadMoreButton(); return;
    }

    var html = "";
    batch.forEach(function(item) {
        // Image — priorité ImageUrl (Cloudinary) > ImageId (Google Drive)
        var imgUrl = resolveImageUrl(item, 800);
        var downloadLink = resolveDownloadUrl(item);
        var couleur = getCategorieColor(item.Categorie);

        var billetPageUrl = 'billet.html?id=' + encodeURIComponent(item.id || '');

        if (isGalleryMode) {
            // RENDU MODE GALERIE — clic ouvre la fiche billet
            html +=
                '<a class="galerie-item" href="' + escapeAttr(billetPageUrl) + '">' +
                (imgUrl
                    ? '<img src="' + escapeAttr(imgUrl) + '" class="galerie-image" alt="' + escapeAttr(item.NomBillet || 'Billet') + '">'
                    : '<div style="text-align:center; color:#999; font-size:0.8em; padding:10px;">Image manquante<br>' + escapeHtml(item.Reference || '') + '</div>'
                ) +
                '</a>';

        } else {
            // RENDU MODE COLLECTE (par défaut)
            var inscriptionHtml = buildInscriptionHtml(item);
            var pasInteresse = estPasInteresse(item.id);
            html +=
                '<div class="global-container' + (pasInteresse ? ' carte-pas-interesse' : '') + '" data-billet-id="' + item.id + '" style="border-top: 8px solid ' + couleur + ';">' +
                '<div class="header-container">' +
                '<div class="image-bg" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%), url(' + escapeAttr(imgUrl) + ') no-repeat;"></div>' +
                '<div class="category" style="background-color: ' + couleur + '; color: ' + (item.Categorie === 'Pré collecte' ? 'var(--color-text-light, #9e9e9e)' : '#fff') + ';">' +
                escapeHtml(item.Categorie || '') +
                '</div>' +
                ((collectesByBillet[item.id] || []).length > 0
                    ? '<div class="badge-collecte-supp-active"><i class="fa-solid fa-layer-group"></i> Collecte en cours</div>'
                    : '') +
                '</div>' +
                '<div class="city-strip" style="color: ' + couleur + '; background-color: color-mix(in srgb, ' + couleur + ', #e0e0e0 70%);">' +
                escapeHtml(item.Ville || '') +
                '</div>' +
                '<div class="content">' +
                '<div class="description">' +
                escapeHtml(item.Dep || '') + ' ' + escapeHtml(item.Reference || '') + ' ' + escapeHtml(item.Millesime || '') + '-' + escapeHtml(item.Version || '') + '<br />' +
                escapeHtml(item.Cp || '') + ' ' + escapeHtml((item.Ville || '').toUpperCase()) + '<br />' +
                escapeHtml(item.NomBillet || '') +
                '</div>' +
                buildVersionBadgesHtml(item) +
                (function() {
                    var parts = [];
                    var _colr = collecteurPrincipalCatalogue(item); if (_colr) parts.push('Par ' + escapeHtml(_colr));

                    var versionNormaleExiste = item.VersionNormaleExiste !== false;
                    var varianteVal = item.HasVariante || '';
                    var varianteActive = varianteVal && varianteVal !== 'N';

                    // Demande #16 — prix / FDP viennent de la collecte principale du billet
                    var tarifP = prixCollecteCatalogue(collectePrincipaleByBillet[item.id]);
                    var prixNormal = tarifP.prix;
                    var prixVar = tarifP.prixVar;

                    // Calcul FDP si demandé
                    var fdpInfo = '';
                    if (tarifP.payerFdp === 'oui' && membrePaysCatalogue) {
                        var destCat = (membrePaysCatalogue === 'France') ? 'france' : 'international';
                        var fdpBase = findFdpPriceCatalogue(1, destCat, 'normal');
                        if (fdpBase > 0) fdpInfo = ' + ' + fdpBase.toFixed(2) + '\u20AC fdp';
                    }

                    if (!versionNormaleExiste && varianteActive && prixVar) {
                        // Uniquement variante
                        parts.push('au prix de ' + prixVar.toFixed(2) + ' euros' + fdpInfo + ' uniquement ' + varianteVal);
                    } else if (versionNormaleExiste && varianteActive && prixNormal) {
                        // Normale + variante
                        parts.push('au prix de ' + prixNormal.toFixed(2) + ' euros version normale & ' + prixVar.toFixed(2) + ' euros version ' + varianteVal + fdpInfo);
                    } else if (prixNormal) {
                        // Normale seule
                        parts.push('au prix de ' + prixNormal.toFixed(2) + ' euros' + fdpInfo);
                    }

                    if (parts.length === 0) return '';
                    return '<div>' + parts.join(' ') + ' ' + escapeHtml(tarifP.fdpCom) + '</div>';
                })() +
                '<div style="margin-top:15px;">' +
                'Commentaire : ' + escapeHtml(item.Commentaire || '') +
                '</div>' +
                '</div>' +
                '<div class="more">' +
                '<center>' +
                '<table class="dates">' +
                (function() {
                    // Demande #16 — dates lues sur la collecte principale du billet
                    var cp = collectePrincipaleByBillet[item.id] || {};
                    return '<tr><td>Pré Collecte :</td><td><b>' + escapeHtml(window.formatDateFr(cp.date_pre)) + '</b></td></tr>' +
                        '<tr><td>Collecte :</td><td><b>' + escapeHtml(window.formatDateFr(cp.date_coll)) + '</b></td></tr>' +
                        '<tr><td>Terminé :</td><td><b>' + escapeHtml(window.formatDateFr(cp.date_fin)) + '</b></td></tr>';
                })() +
                '</table>' +
                '</center>' +
                '</div>' +
                '<div class="more">' +
                '<center>' + getCompteurBT(item) + '</center>' +
                '</div>' +
                '<div class="more action-icons">' +
                (function() {
                    // Masquer les liens Google pour les collectes terminées et les billets non actifs
                    var cat = item.Categorie || '';
                    var hideGoogle = (cat === 'Terminé' || cat === 'Non defini' || cat === 'Jamais édité, projet' || cat === 'Pas de collecte');
                    var currentEmail = (typeof window.getActiveEmail === 'function' ? window.getActiveEmail() : '') || '';
                    var canSeeLegacySheet = (currentEmail.toLowerCase() === 'emhe@sfr.fr');
                    return ((!hideGoogle && sanitizeUrl(item.Sondage))
                        ? '<a href="' + escapeAttr(sanitizeUrl(item.Sondage)) + '" target="_blank" class="icon-btn ico-form" title="Répondre au sondage"><i class="fa-solid fa-clipboard-question"></i></a>'
                        : '') +
                    ((canSeeLegacySheet && sanitizeUrl(item.LinkSheet))
                        ? '<a href="' + escapeAttr(sanitizeUrl(item.LinkSheet)) + '" target="_blank" class="icon-btn ico-sheet" title="Voir le fichier Excel"><i class="fa-solid fa-file-csv"></i></a>'
                        : '');
                })() +
                (sanitizeUrl(item.LinkFB)
                    ? '<a href="' + escapeAttr(sanitizeUrl(item.LinkFB)) + '" target="_blank" class="icon-btn ico-fb" title="Voir sur Facebook"><i class="fa-brands fa-facebook"></i></a>'
                    : '') +
                (imgUrl
                    ? '<a href="' + escapeAttr(billetPageUrl) + '" class="icon-btn ico-dl" title="Voir la fiche du billet"><i class="fa-solid fa-image"></i></a>'
                    : '') +
                '<span style="font-size:10px; color:#ccc; align-self:center;">(n°' + (item.id || '') + ')</span>' +
                '</div>' +
                inscriptionHtml +
                buildCollectesSupplementairesHtml(item) +
                '</div>';
        }
    });

    grid.insertAdjacentHTML('beforeend', html);
    displayedCount += batch.length;
    updateLoadMoreButton();
}


function updateLoadMoreButton() {
    var btn = document.getElementById('btn-load-more');
    if (!btn) return;

    // Le bouton doit être masqué UNIQUEMENT en mode Liste (qui affiche tout d'un coup)
    var isListMode = document.body.classList.contains('view-liste');

    if (isListMode) {
        btn.style.display = 'none';
        return;
    }

    // Le bouton doit être visible si le nombre de billets affichés est inférieur au total filtré
    if (displayedCount < currentData.length) {
        btn.style.display = 'inline-block';
        btn.innerText = 'Voir la suite (' + (currentData.length - displayedCount) + ')';
    } else {
        btn.style.display = 'none';
    }
}

// ============================================================
// 5. GESTION DU MODAL (ZOOM GALERIE)
// ============================================================
function openModal(imgUrl) {
    var modal = document.getElementById('image-modal');
    var modalImg = document.getElementById('modal-image');

    modal.classList.remove('hidden');

    // Zoom : résolution plus grande selon la source
    if (imgUrl.indexOf('cloudinary.com') !== -1) {
        modalImg.src = imgUrl.replace('/w_800/', '/w_1600/');
    } else {
        modalImg.src = imgUrl.replace('sz=w800', 'sz=w1600');
    }

    // Empêche le scroll de la page derrière
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    var modal = document.getElementById('image-modal');

    modal.classList.add('hidden');

    // Rétablit le scroll de la page
    document.body.style.overflow = 'auto';
}

// ============================================================
// 6. INSCRIPTIONS — Story 5.4
// ============================================================

// --- Toast notification ---
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'success');
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    } else {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
}

// --- Chargement des inscriptions du membre connecté ---
function loadMesInscriptions() {
    var email = window.getActiveEmail();
    if (!email) return;
    // Demande #16 — plus de pas_interesse dans inscriptions (déplacé en collection) ;
    // on charge les deux en parallèle pour rafraîchir la vue d'un coup.
    Promise.all([
        supabaseFetch('/rest/v1/inscriptions?membre_email=eq.' + encodeURIComponent(email) + '&select=id,billet_id,collecte_id,nb_normaux,nb_variantes,statut_paiement,envoye,mode_paiement,mode_envoi'),
        loadMaCollectionPasInteresse(email)
    ])
        .then(function(results) {
            var data = results[0];
            mesInscriptions = {};
            (data || []).forEach(function(insc) {
                var key = insc.billet_id + '|' + (insc.collecte_id || 'principal');
                mesInscriptions[key] = insc;
            });
            applyFilters(false);
        })
        .catch(function(error) {
            console.warn('Erreur chargement inscriptions:', error);
        });
}

function getInscription(billetId, collecteId) {
    // Demande #16 — « inscription principale » = celle de la collecte principale.
    // Toute inscription porte un collecte_id ; la clé 'principal' n'existe plus.
    if (!collecteId) {
        var cp = collectePrincipaleByBillet[billetId];
        collecteId = cp ? cp.id : null;
    }
    var key = billetId + '|' + (collecteId || 'principal');
    return mesInscriptions[key] || null;
}

// Demande #16 (C7) — « Pas intéressé » vit dans collection, plus dans inscriptions.
var maCollectionPasInteresse = {};   // billet_id → true

function estPasInteresse(billetId) {
    return maCollectionPasInteresse[billetId] === true;
}

function loadMaCollectionPasInteresse(email) {
    if (!email) return Promise.resolve();
    return supabaseFetch('/rest/v1/collection?membre_email=eq.' + encodeURIComponent(email) + '&pas_interesse=eq.true&select=billet_id')
        .then(function(data) {
            maCollectionPasInteresse = {};
            (data || []).forEach(function(r) { maCollectionPasInteresse[r.billet_id] = true; });
        })
        .catch(function(error) {
            console.warn('Erreur chargement « pas intéressé » (collection):', error);
        });
}

function estBeneficiaireCatalogue(item) {
    var email = window.getActiveEmail && window.getActiveEmail();
    var colr = collecteurPrincipalCatalogue(item);
    if (!email || !colr) return false;
    var col = collecteursMap[colr];
    return !!(col && col.email_membre && col.email_membre === email);
}

// --- Chargement des collecteurs pour liens contact ---
function loadCollecteursForCatalogue() {
    supabaseFetch('/rest/v1/collecteurs?select=alias,paypal_email,paypal_me,email_membre')
        .then(function(data) {
            (data || []).forEach(function(c) {
                collecteursMap[c.alias] = c;
            });
        })
        .catch(function(error) {
            console.warn('Erreur chargement collecteurs catalogue:', error);
        });
}

// --- Chargement de la blacklist pour le membre connecté ---
// Stocke les alias des collecteurs qui ont blacklisté ce membre
var blacklistCollecteurs = {};

function loadBlacklistMembre(email) {
    supabaseFetch('/rest/v1/collecteur_blacklist?membre_email=eq.' + encodeURIComponent(email) + '&select=collecteur_alias')
        .then(function(data) {
            blacklistCollecteurs = {};
            (data || []).forEach(function(e) {
                blacklistCollecteurs[e.collecteur_alias] = true;
            });
        })
        .catch(function(error) {
            console.warn('Erreur chargement blacklist membre:', error);
        });
}

// --- Chargement du blocage d'inscription (decide par un admin) ---
// Un membre bloque ne peut s'inscrire a aucune nouvelle collecte.
var membreBloqueInscription = false;
var membreBlocageMotif = '';

function loadBlocageMembre(email) {
    supabaseFetch('/rest/v1/membre_blocages?membre_email=eq.' + encodeURIComponent(email) + '&select=motif')
        .then(function(data) {
            membreBloqueInscription = !!(data && data.length > 0);
            membreBlocageMotif = membreBloqueInscription ? (data[0].motif || '') : '';
        })
        .catch(function(error) {
            console.warn('Erreur chargement blocage membre:', error);
        });
}

// HTML du badge "Inscription impossible" quand le membre est bloque
function buildBlocageInscriptionHtml(withBadgeNonInscrit) {
    var titre = membreBlocageMotif
        ? 'Vous êtes bloqué pour les inscriptions : ' + membreBlocageMotif
        : 'Vous êtes bloqué pour les inscriptions. Contactez un administrateur.';
    return '<div class="inscription-badges">'
        + (withBadgeNonInscrit ? '<span class="badge-non-inscrit">Non inscrit</span>' : '')
        + '<button class="btn-inscription-impossible" disabled title="' + escapeAttr(titre) + '"><i class="fa-solid fa-ban"></i> Inscription impossible</button>'
        + '</div>';
}

// --- Story 5.12 : Compteurs BT automatiques ---
function loadCompteursInscriptions() {
    supabaseFetch('/rest/v1/rpc/compteurs_inscriptions')
        .then(function(compteurs) {
            compteurInscriptionsMap = {};
            (compteurs || []).forEach(function(c) {
                compteurInscriptionsMap[c.billet_id] = {
                    normaux: c.total_normaux || 0,
                    variantes: c.total_variantes || 0
                };
            });
        })
        .catch(function(error) {
            console.warn('Compteurs inscriptions non disponibles:', error);
        });
}

// --- Chargement frais de port et pays du membre pour le catalogue ---
function loadFraisPortCatalogue(email) {
    var annee = new Date().getFullYear();
    Promise.all([
        supabaseFetch('/rest/v1/frais_port?annee=eq.' + annee + '&select=*'),
        supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email) + '&select=pays,masquer_pas_interesse,terminaisons_pref')
    ])
    .then(function(results) {
        fraisPortCatalogue = results[0] || [];
        var membre = results[1] && results[1][0];
        membrePaysCatalogue = membre ? (membre.pays || '') : '';
        membreTerminaisonsCatalogue = membre ? (membre.terminaisons_pref || '') : '';
        var prefChargee = membre ? (membre.masquer_pas_interesse === true) : false;
        if (prefChargee !== masquerPasInteresse) {
            masquerPasInteresse = prefChargee;
            updateToggleMasquer();
            applyFilters(false);
        } else {
            updateToggleMasquer();
        }
    })
    .catch(function(error) {
        console.warn('Erreur chargement frais de port catalogue:', error);
    });
}

function findFdpPriceCatalogue(nbBillets, destination, typeEnvoi) {
    for (var i = 0; i < fraisPortCatalogue.length; i++) {
        var r = fraisPortCatalogue[i];
        if (r.destination === destination && r.type_envoi === typeEnvoi &&
            nbBillets >= r.qte_min && nbBillets <= r.qte_max) {
            return parseFloat(r.prix);
        }
    }
    return 0;
}

function getCompteurBT(item) {
    var isInscriptionSite = !item.LinkSheet && !item.Sondage;
    if (isInscriptionSite && compteurInscriptionsMap[item.id]) {
        var c = compteurInscriptionsMap[item.id];
        var parts = [];
        if (c.normaux > 0) {
            parts.push(c.normaux + ' billet' + (c.normaux > 1 ? 's' : ''));
        }
        if (c.variantes > 0 && hasVarianteActive(item.HasVariante)) {
            parts.push(c.variantes + ' billet' + (c.variantes > 1 ? 's' : '') + ' ' + varianteLabelShort(item.HasVariante));
        }
        return parts.join(' + ') || '';
    }
    return item.CompteurBT || '';
}

// --- Badge paiement pour le catalogue ---
function badgePaiementCatalogue(statut, montant, inscriptionId, categorie) {
    statut = statut || 'non_paye';
    if (statut === 'confirme') {
        return '<span class="badge-paiement badge-paye">Payé</span>';
    }
    if (statut === 'declare') {
        return '<span class="badge-paiement badge-declare">En attente de confirmation</span>';
    }
    // non_paye — bloquer en pré-collecte (prix non défini)
    if (categorie === 'Pré collecte') {
        return '<span class="badge-paiement badge-non-paye">Non payé — ' + montant.toFixed(2) + ' €</span>';
    }
    return '<span class="badge-paiement badge-non-paye">Non payé — ' + montant.toFixed(2) + ' €</span>'
        + '<button class="btn-jai-paye" title="Cliquez pour déclarer votre paiement" onclick="event.stopPropagation();declarerPaiementCatalogue(' + inscriptionId + ')"><i class="fa-solid fa-hand-holding-dollar"></i> J\'ai payé</button>';
}

// --- Déclaration de paiement depuis le catalogue ---
var pendingDeclarationCatalogueId = null;

function declarerPaiementCatalogue(inscriptionId) {
    var insc = null;
    var billet = null;
    for (var billetId in mesInscriptions) {
        if (mesInscriptions[billetId].id === inscriptionId) {
            insc = mesInscriptions[billetId];
            billet = allData.find(function(b) { return b.id === parseInt(billetId); });
            break;
        }
    }
    // Demande #16 — collecteur + prix/FDP depuis la collecte de l'inscription
    var colD = insc && collecteByIdCatalogue[insc.collecte_id];
    var collecteur = (colD && colD.collecteur) || '';
    var tarifD = tarifInscriptionCatalogue(insc, billet ? billet.id : null);
    var prix = tarifD.prix;
    var prixVar = tarifD.prixVar;
    var nbNormaux = insc ? (insc.nb_normaux || 0) : 0;
    var nbVariantes = insc ? (insc.nb_variantes || 0) : 0;
    var montant = (prix * nbNormaux) + (prixVar * nbVariantes);
    var fdpMontant = 0;
    if (tarifD.payerFdp === 'oui' && billet && billet.Categorie !== 'Pré collecte' && membrePaysCatalogue && insc) {
        var destCat = (membrePaysCatalogue === 'France') ? 'france' : 'international';
        var typeEnvoi = (insc.mode_envoi || 'Normal').toLowerCase();
        fdpMontant = findFdpPriceCatalogue(nbNormaux + nbVariantes, destCat, typeEnvoi);
    }
    var montantTotal = montant + fdpMontant;

    pendingDeclarationCatalogueId = inscriptionId;
    var modal = document.getElementById('confirm-paiement-catalogue-modal');
    var msgEl = document.getElementById('confirm-paiement-catalogue-msg');
    if (msgEl) {
        msgEl.innerHTML = 'Confirmez-vous avoir payé <strong>' + montantTotal.toFixed(2) + ' €</strong>'
            + (collecteur ? ' à <strong>' + escapeHtml(collecteur) + '</strong>' : '') + ' ?';
    }
    if (modal) modal.style.display = 'flex';
}

function confirmerDeclarationPaiementCatalogue() {
    var modal = document.getElementById('confirm-paiement-catalogue-modal');
    if (modal) modal.style.display = 'none';
    if (!pendingDeclarationCatalogueId) return;
    var inscriptionId = pendingDeclarationCatalogueId;
    pendingDeclarationCatalogueId = null;

    supabaseFetch('/rest/v1/inscriptions?id=eq.' + inscriptionId, {
        method: 'PATCH',
        body: JSON.stringify({ statut_paiement: 'declare' })
    })
    .then(function() {
        for (var billetId in mesInscriptions) {
            if (mesInscriptions[billetId].id === inscriptionId) {
                mesInscriptions[billetId].statut_paiement = 'declare';
                break;
            }
        }
        applyFilters(false);
        showToast('Paiement déclaré — le collecteur sera notifié');
    })
    .catch(function(error) {
        console.error('Erreur déclaration paiement:', error);
        showToast('Erreur lors de la déclaration', 'error');
    });
}

function annulerDeclarationPaiementCatalogue() {
    var modal = document.getElementById('confirm-paiement-catalogue-modal');
    if (modal) modal.style.display = 'none';
    pendingDeclarationCatalogueId = null;
}

// --- Génération des badges version (normale / variante) ---
function buildVersionBadgesHtml(item) {
    var versionNormaleExiste = item.VersionNormaleExiste !== false;
    var varianteVal = item.HasVariante || '';
    var varianteActive = varianteVal && varianteVal !== 'N';
    var html = '<div class="version-badges">';
    if (!versionNormaleExiste) {
        html += '<span class="version-badge version-badge--warning"><i class="fa-solid fa-triangle-exclamation"></i> Pas de version normale</span>';
    }
    if (varianteActive) {
        html += '<span class="version-badge version-badge--variante"><i class="fa-solid fa-star"></i> ' + escapeHtml(varianteLabel(varianteVal)) + '</span>';
    } else if (varianteVal === 'N') {
        html += '<span class="version-badge version-badge--no-variante">Pas de variante</span>';
    }
    html += '</div>';
    return html;
}

// --- Génération du HTML d'inscription pour une carte ---
function buildInscriptionHtml(item) {
    // Demande #16 — la carte principale porte sur la « Collecte initiale » du billet
    var colPrinc = collectePrincipaleByBillet[item.id];
    var inscription = getInscription(item.id, null);
    var collecteOuverte = (item.Categorie === 'Pré collecte' || item.Categorie === 'Collecte') &&
        (colPrinc && colPrinc.categorie !== 'Terminé');

    var html = '';
    if (inscription) {
        // Inscrit — badges + contact collecteur
        var isBeneficiaire = estBeneficiaireCatalogue(item);
        var tarifI = prixCollecteCatalogue(colPrinc);
        var prixNormal = tarifI.prix;
        var prixVar = tarifI.prixVar;
        var nbNormaux = inscription.nb_normaux || 0;
        var nbVariantes = inscription.nb_variantes || 0;
        var montant = (prixNormal * nbNormaux) + (prixVar * nbVariantes);

        // Calcul FDP si applicable
        var fdpMontant = 0;
        if (tarifI.payerFdp === 'oui' && item.Categorie !== 'Pré collecte' && membrePaysCatalogue) {
            var nbTotal = nbNormaux + nbVariantes;
            var destCat = (membrePaysCatalogue === 'France') ? 'france' : 'international';
            var typeEnvoi = (inscription.mode_envoi || 'Normal').toLowerCase();
            fdpMontant = findFdpPriceCatalogue(nbTotal, destCat, typeEnvoi);
        }
        var montantAvecFdp = montant + fdpMontant;

        var badgeStatut = isBeneficiaire
            ? '<span class="badge-paiement badge-beneficiaire">Bénéficiaire</span>'
            : badgePaiementCatalogue(inscription.statut_paiement, montantAvecFdp, inscription.id, item.Categorie);
        html = '<div class="inscription-badges">'
            + '<span class="badge-inscrit">Inscrit</span>'
            + badgeStatut
            + '</div>';

        // Lien PayPal si non payé et mode_paiement = PayPal (jamais pour le bénéficiaire)
        var statut = inscription.statut_paiement || 'non_paye';
        var collecteurInfo = collecteursMap[collecteurPrincipalCatalogue(item)] || {};
        if (!isBeneficiaire && statut === 'non_paye' && inscription.mode_paiement === 'PayPal' && item.Categorie !== 'Pré collecte') {
            var refPart = (item.Reference || '') + ' ' + (item.Millesime || '') + (item.Version ? '-' + item.Version : '');
            var noteparts = [refPart.trim(), item.NomBillet || ''];
            var detailParts = [];
            if (nbNormaux > 0) detailParts.push(prixNormal.toFixed(2) + '€ x ' + nbNormaux);
            if (nbVariantes > 0) detailParts.push(prixVar.toFixed(2) + '€ x ' + nbVariantes + ' var.');
            var paypalNote = noteparts.join(' ') + ' - ' + detailParts.join(' + ') + ' = ' + montantAvecFdp.toFixed(2) + '€';
            var paypalNoteJs = paypalNote.replace(/'/g, "\\'");

            var paypalUrl = '';
            var paypalManualHtml = '';
            if (collecteurInfo.paypal_me) {
                paypalUrl = 'https://paypal.me/' + encodeURIComponent(collecteurInfo.paypal_me) + '/' + montantAvecFdp.toFixed(2);
            } else if (collecteurInfo.paypal_email) {
                paypalUrl = 'https://www.paypal.com/myaccount/transfer/homepage/pay';
                var emailJs = collecteurInfo.paypal_email.replace(/'/g, "\\'");
                paypalManualHtml = '<div class="paypal-note-hint"><i class="fa-solid fa-circle-info"></i> Envoyer <strong>' + montantAvecFdp.toFixed(2) + '€</strong> à <code>' + escapeHtml(collecteurInfo.paypal_email) + '</code> <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + emailJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier email\'},2000)"><i class="fa-solid fa-copy"></i> Copier email</button> — cocher <strong>«&nbsp;Entre proches&nbsp;»</strong></div>';
            }
            if (paypalUrl) {
                html += '<div class="paypal-note-hint"><i class="fa-solid fa-paste"></i> Note à coller : ' + escapeHtml(paypalNote) + ' <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + paypalNoteJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier\'},2000)"><i class="fa-solid fa-copy"></i> Copier</button></div>';
                html += paypalManualHtml;
                html += '<a href="' + paypalUrl + '" target="_blank" class="btn-payer" onclick="event.stopPropagation()"><i class="fa-brands fa-paypal"></i> Payer via PayPal</a>';
            }
        }

        // Bouton contacter le collecteur (jamais pour le bénéficiaire lui-même)
        var contactEmail = collecteurInfo.paypal_email || '';
        if (!isBeneficiaire && contactEmail) {
            html += '<a href="mailto:' + escapeAttr(contactEmail) + '" class="btn-contacter-collecteur">Contacter le collecteur</a>';
        }
    } else if (estPasInteresse(item.id)) {
        // Pas intéressé (lu dans collection — C7)
        html = '<div class="inscription-badges">'
            + '<span class="badge-pas-interesse">Pas intéressé</span>'
            + '<button onclick="annulerPasInteresse(' + item.id + ')" class="btn-annuler-pas-interesse">Annuler</button>'
            + '</div>';
    } else if (collecteOuverte) {
        // Non inscrit, collecte ouverte
        var isInscriptionSite = !item.LinkSheet && !item.Sondage;
        if (isInscriptionSite) {
            // Bloqué par un admin (toutes collectes) ou blacklisté par le collecteur de ce billet
            var isBlackliste = blacklistCollecteurs[collecteurPrincipalCatalogue(item)];
            if (membreBloqueInscription) {
                html = buildBlocageInscriptionHtml(true);
            } else if (isBlackliste) {
                html = '<div class="inscription-badges">'
                    + '<span class="badge-non-inscrit">Non inscrit</span>'
                    + '<button class="btn-inscription-impossible" disabled><i class="fa-solid fa-ban"></i> Inscription impossible</button>'
                    + '</div>';
            } else {
                html = '<div class="inscription-badges">'
                    + '<span class="badge-non-inscrit">Non inscrit</span>'
                    + '<button onclick="ouvrirInscription(' + item.id + ')" class="btn-sinscrire"><i class="fa-solid fa-pen-to-square"></i> S\'inscrire</button>'
                    + '<button onclick="marquerPasInteresse(' + item.id + ')" class="btn-pas-interesse">Pas intéressé</button>'
                    + '</div>';
            }
        }
    }
    return html;
}

// --- Ouverture du mini-formulaire inline ---
function ouvrirInscription(billetId) {
    if (membreBloqueInscription) {
        showToast('Vous êtes bloqué pour les inscriptions. Contactez un administrateur.', 'error');
        return;
    }
    isProfilComplet(function(complet) {
        if (!complet) {
            showToast('Complétez votre profil avant de vous inscrire', 'error');
            setTimeout(function() {
                window.location.href = 'profil.html?from=inscription&billet=' + billetId;
            }, 1500);
            return;
        }
        var billet = allData.find(function(b) { return b.id === billetId; });
        if (!billet) return;
        var varianteActive = billet.HasVariante && billet.HasVariante !== 'N';
        var versionNormaleExiste = billet.VersionNormaleExiste !== false;
        var champNormaux = (!varianteActive || versionNormaleExiste)
            ? '<div class="mini-form-field"><label>Nb normaux</label><input type="number" id="insc-nb-normaux-' + billetId + '" value="' + (varianteActive ? '0' : '1') + '" min="0"></div>'
            : '';
        var champVariantes = varianteActive
            ? '<div class="mini-form-field"><label>Nb variantes</label><input type="number" id="insc-nb-variantes-' + billetId + '" value="' + (!versionNormaleExiste ? '1' : '0') + '" min="' + (!versionNormaleExiste ? '1' : '0') + '"></div>'
            : '';
        // Demande #9 — en pré-collecte, pré-remplir le commentaire avec la préférence "terminaisons" du profil
        var estPreCollecte = billet.Categorie === 'Pré collecte';
        var commentaireLabel = estPreCollecte ? 'Commentaire (terminaisons souhaitées)' : 'Commentaire';
        var commentaireDefaut = estPreCollecte ? (membreTerminaisonsCatalogue || '') : '';
        var formHtml = '<div class="mini-inscription-form" id="inscription-form-' + billetId + '">'
            + champNormaux
            + champVariantes
            + '<div class="mini-form-field"><label>Paiement</label><select id="insc-paiement-' + billetId + '"><option value="PayPal">PayPal</option><option value="Chèque">Chèque</option></select></div>'
            + '<div class="mini-form-field"><label>Envoi</label><select id="insc-envoi-' + billetId + '"><option value="Normal">Normal</option><option value="Suivi">Suivi</option><option value="R1">Recommandé R1</option><option value="R2">Recommandé R2</option><option value="R3">Recommandé R3</option></select></div>'
            + '<div class="mini-form-field"><label>' + commentaireLabel + '</label><textarea id="insc-commentaire-' + billetId + '" rows="2">' + escapeHtml(commentaireDefaut) + '</textarea></div>'
            + '<div class="mini-form-actions">'
            + '<button onclick="confirmerInscription(' + billetId + ')" class="btn-confirmer-inscription">Confirmer</button>'
            + '<button onclick="annulerInscription(' + billetId + ')" class="btn-annuler-inscription">Annuler</button>'
            + '</div>'
            + '</div>';
        var card = document.querySelector('[data-billet-id="' + billetId + '"]');
        if (!card) return;
        var existingForm = card.querySelector('.mini-inscription-form');
        if (existingForm) existingForm.remove();
        card.insertAdjacentHTML('beforeend', formHtml);
    });
}

// --- Annulation du formulaire (fermeture sans soumission) ---
function annulerInscription(billetId) {
    var form = document.getElementById('inscription-form-' + billetId);
    if (form) form.remove();
}

// --- Soumission de l'inscription ---
function confirmerInscription(billetId) {
    var email = window.getActiveEmail();
    var billet = allData.find(function(b) { return b.id === billetId; });
    if (!billet) return;
    // Demande #16 — l'inscription principale porte sur la « Collecte initiale » du
    // billet ; sans collecte, pas d'inscription possible (collecte_id NOT NULL).
    var colPrinc = collectePrincipaleByBillet[billetId];
    if (!colPrinc) {
        showToast('Ce billet n\'a pas de collecte ouverte', 'error');
        return;
    }
    var normauxEl = document.getElementById('insc-nb-normaux-' + billetId);
    var nbNormaux = normauxEl ? parseInt(normauxEl.value) || 0 : 0;
    var variantesEl = document.getElementById('insc-nb-variantes-' + billetId);
    var nbVariantes = variantesEl ? parseInt(variantesEl.value) || 0 : 0;
    if (nbNormaux + nbVariantes === 0) {
        showToast('Sélectionnez au moins un billet', 'error');
        return;
    }

    // Charger l'adresse du profil pour le snapshot
    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email) + '&select=nom,prenom,rue,code_postal,ville,pays')
        .then(function(membreData) {
            var adresse = membreData && membreData[0] ? membreData[0] : {};
            var body = {
                billet_id: billetId,
                collecte_id: colPrinc.id,
                membre_email: email,
                nb_normaux: nbNormaux,
                nb_variantes: nbVariantes,
                mode_paiement: document.getElementById('insc-paiement-' + billetId).value,
                mode_envoi: document.getElementById('insc-envoi-' + billetId).value,
                commentaire: (document.getElementById('insc-commentaire-' + billetId).value || '').trim(),
                adresse_snapshot: adresse,
                statut_paiement: 'non_paye',
                envoye: false,
                fdp_regles: false
            };
            return supabaseFetch('/rest/v1/inscriptions', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        })
        .then(function() {
            showToast('Inscription confirmée !');
            var form = document.getElementById('inscription-form-' + billetId);
            if (form) form.remove();
            loadMesInscriptions();
            loadCompteursInscriptions();
            // Créer l'enveloppe en_cours si elle n'existe pas encore (collecteur de
            // la collecte principale, sur laquelle porte cette inscription)
            if (colPrinc && colPrinc.collecteur) {
                creerEnveloppeSiAbsente(colPrinc.collecteur, email);
            }
        })
        .catch(function(error) {
            console.error('Erreur inscription:', error);
            showToast('Erreur lors de l\'inscription', 'error');
        });
}

function creerEnveloppeSiAbsente(collecteurAlias, membreEmail) {
    return supabaseFetch('/rest/v1/enveloppes?collecteur_alias=eq.' + encodeURIComponent(collecteurAlias) + '&membre_email=eq.' + encodeURIComponent(membreEmail) + '&statut=eq.en_cours&select=id')
        .then(function(enveloppes) {
            if (enveloppes && enveloppes.length > 0) return;
            return supabaseFetch('/rest/v1/enveloppes', {
                method: 'POST',
                body: JSON.stringify({
                    collecteur_alias: collecteurAlias,
                    membre_email: membreEmail,
                    statut: 'en_cours'
                })
            });
        })
        .catch(function(error) {
            console.warn('Erreur création enveloppe:', error);
        });
}

// --- Marquage "Pas intéressé" ---
function marquerPasInteresse(billetId) {
    var email = window.getActiveEmail();
    // Demande #16 (C7) — « Pas intéressé » = relation membre ↔ billet, écrite dans
    // collection (et masque le billet du catalogue). Upsert sur la PK.
    var body = {
        membre_email: email,
        billet_id: billetId,
        pas_interesse: true
    };
    supabaseFetch('/rest/v1/collection?on_conflict=membre_email,billet_id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(body)
    })
    .then(function() {
        showToast('Billet marqué "Pas intéressé"');
        maCollectionPasInteresse[billetId] = true;
        loadMesInscriptions();
    })
    .catch(function(error) {
        console.error('Erreur marquage:', error);
        showToast('Erreur', 'error');
    });
}

// --- Annulation "Pas intéressé" ---
function annulerPasInteresse(billetId) {
    var email = window.getActiveEmail();
    // Demande #16 (C7) — on remet pas_interesse à false dans collection (sans
    // supprimer la ligne : elle peut porter d'autres données de collection).
    supabaseFetch('/rest/v1/collection?membre_email=eq.' + encodeURIComponent(email) + '&billet_id=eq.' + billetId, {
        method: 'PATCH',
        body: JSON.stringify({ pas_interesse: false })
    })
    .then(function() {
        showToast('Marquage annulé');
        delete maCollectionPasInteresse[billetId];
        loadMesInscriptions();
    })
    .catch(function(error) {
        console.error('Erreur annulation:', error);
        showToast('Erreur', 'error');
    });
}

// ============================================================
// 7. LIEN DIRECT — ?billet=ID (deep link depuis admin)
// ============================================================
function handleDeepLinkBillet() {
    var params = new URLSearchParams(window.location.search);
    var billetId = params.get('billet');
    if (!billetId) return;

    billetId = parseInt(billetId);
    if (isNaN(billetId)) return;

    // Vérifier que le billet existe
    var billet = allData.find(function(b) { return b.id === billetId; });
    if (!billet) return;

    // S'assurer qu'on est en mode collecte (cartes)
    if (!document.body.classList.contains('view-collecte')) {
        changeView('collecte');
    }

    // Réinitialiser les filtres pour s'assurer que le billet est visible
    billetsActiveStatusFilter = 'tous';
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    // Recharger l'affichage
    applyFilters(false);

    // Attendre le rendu puis scroller
    setTimeout(function() {
        var card = document.querySelector('[data-billet-id="' + billetId + '"]');
        if (!card) {
            // Le billet est peut-être dans un batch non chargé, charger plus
            while (displayedCount < currentData.length) {
                showMore();
            }
            card = document.querySelector('[data-billet-id="' + billetId + '"]');
        }
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.boxShadow = '0 0 0 3px var(--color-primary)';
            setTimeout(function() {
                card.style.boxShadow = '';
                // Ouvrir le formulaire d'inscription
                ouvrirInscription(billetId);
            }, 800);
        }
    }, 300);

    // Nettoyer l'URL pour éviter de re-déclencher au refresh
    if (window.history && window.history.replaceState) {
        var cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

// ============================================================
// STORY 12.4 — COLLECTES SUPPLÉMENTAIRES (CATALOGUE)
// ============================================================

function loadCollectesByBillet() {
    // Demande #16 — on charge TOUTES les collectes (prix/FDP/statut compris) et on
    // sépare : la « Collecte initiale » de chaque billet pilote la carte principale,
    // les autres ouvertes alimentent la section « collectes supplémentaires ».
    // Sans ce split, la Collecte initiale s'afficherait deux fois (carte + section).
    supabaseFetch('/rest/v1/collectes?select=id,billet_id,nom,scope,categorie,collecteur,prix,prix_variante,payer_fdp,fdp_com,date_pre,date_coll,date_fin,nb_max&limit=10000')
        .then(function(data) {
            collectesByBillet = {};
            collectePrincipaleByBillet = {};
            collecteByIdCatalogue = {};
            var toutes = data || [];
            var parBillet = {};
            toutes.forEach(function(c) {
                collecteByIdCatalogue[c.id] = c;
                if (!parBillet[c.billet_id]) parBillet[c.billet_id] = [];
                parBillet[c.billet_id].push(c);
            });
            Object.keys(parBillet).forEach(function(bid) {
                var list = parBillet[bid];
                // Principale : « Collecte initiale » d'abord, sinon une ouverte, sinon la 1re
                var principale = null;
                for (var i = 0; i < list.length; i++) { if (list[i].nom === 'Collecte initiale') { principale = list[i]; break; } }
                if (!principale) { for (var j = 0; j < list.length; j++) { if (list[j].categorie !== 'Terminé') { principale = list[j]; break; } } }
                if (!principale) principale = list[0];
                collectePrincipaleByBillet[bid] = principale;
                // Section supplémentaire : les autres collectes OUVERTES
                collectesByBillet[bid] = list.filter(function(c) {
                    return c !== principale && c.categorie !== 'Terminé';
                });
                if (collectesByBillet[bid].length === 0) delete collectesByBillet[bid];
            });
            // Demande #24 — pour les collectes supplémentaires avec plafond, calculer le total inscrit
            var avecMax = [];
            Object.keys(collectesByBillet).forEach(function(bid) {
                collectesByBillet[bid].forEach(function(c) {
                    if (c.nb_max !== null && c.nb_max !== undefined) avecMax.push(c);
                });
            });
            if (avecMax.length === 0) return;
            var ids = avecMax.map(function(c) { return c.id; }).join(',');
            return supabaseFetch('/rest/v1/inscriptions?collecte_id=in.(' + ids + ')&pas_interesse=eq.false&select=collecte_id,nb_normaux,nb_variantes')
                .then(function(inscs) {
                    var totals = {};
                    (inscs || []).forEach(function(i) {
                        totals[i.collecte_id] = (totals[i.collecte_id] || 0) + (i.nb_normaux || 0) + (i.nb_variantes || 0);
                    });
                    avecMax.forEach(function(c) {
                        c._total = totals[c.id] || 0;
                        c._full = c._total >= c.nb_max;
                    });
                });
        })
        .then(function() {
            // Demande #16 — prix, dates et état d'inscription dépendent désormais des
            // collectes : re-render une fois qu'elles sont chargées (ce loader tourne
            // en parallèle de fetchData/loadMesInscriptions).
            if (typeof applyFilters === 'function' && allData && allData.length) applyFilters(false);
        })
        .catch(function(error) {
            console.warn('Erreur chargement collectes supplémentaires:', error);
        });
}

// Demande #24 — Total de billets déjà inscrits à une collecte (frais)
function fetchCollecteTotalBillets(collecteId) {
    return supabaseFetch('/rest/v1/inscriptions?collecte_id=eq.' + collecteId + '&pas_interesse=eq.false&select=nb_normaux,nb_variantes')
        .then(function(inscs) {
            var total = 0;
            (inscs || []).forEach(function(i) { total += (i.nb_normaux || 0) + (i.nb_variantes || 0); });
            return total;
        });
}

function buildCollectesSupplementairesHtml(item) {
    var collectes = collectesByBillet[item.id] || [];
    if (collectes.length === 0) return '';
    var html = '';
    collectes.forEach(function(c) {
        var capaciteHtml = '';
        if (c.nb_max !== null && c.nb_max !== undefined) {
            var total = c._total || 0;
            capaciteHtml = '<span class="collecte-supp-capacite' + (c._full ? ' collecte-supp-capacite--plein' : '') + '">'
                + total + ' / ' + c.nb_max + ' billet(s)' + (c._full ? ' — complète' : '') + '</span>';
        }
        html += '<div class="collecte-supplementaire-section" data-collecte-id="' + escapeAttr(c.id) + '">'
            + '<div class="collecte-supp-header">'
            + '<span class="badge-nom-collecte">' + escapeHtml(c.nom || '') + '</span>'
            + '<span class="collecte-supp-collecteur">Collecteur : ' + escapeHtml(c.collecteur || '—') + '</span>'
            + capaciteHtml
            + '</div>'
            + buildInscriptionHtmlForCollecte(item, c)
            + '</div>';
    });
    return html;
}

function buildInscriptionHtmlForCollecte(item, collecte) {
    var inscription = getInscription(item.id, collecte.id);
    if (inscription) {
        var isBeneficiaire = estBeneficiaireCatalogue(item);
        var badgeStatut = isBeneficiaire
            ? '<span class="badge-paiement badge-beneficiaire">Bénéficiaire</span>'
            : badgePaiementCatalogue(inscription.statut_paiement, 0, inscription.id, item.Categorie);
        return '<div class="inscription-badges">'
            + '<span class="badge-inscrit">Inscrit à cette collecte</span>'
            + badgeStatut
            + '</div>';
    }
    if (membreBloqueInscription) {
        return buildBlocageInscriptionHtml(false);
    }
    // Demande #24 — collecte pleine (plafond de billets atteint)
    if (collecte._full) {
        return '<div class="inscription-badges">'
            + '<button class="btn-inscription-impossible" disabled><i class="fa-solid fa-lock"></i> Collecte complète</button>'
            + '</div>';
    }
    var isBlackliste = blacklistCollecteurs[collecteurPrincipalCatalogue(item)];
    if (isBlackliste) {
        return '<div class="inscription-badges">'
            + '<button class="btn-inscription-impossible" disabled><i class="fa-solid fa-ban"></i> Inscription impossible</button>'
            + '</div>';
    }
    return '<div class="inscription-badges">'
        + '<button onclick="ouvrirInscriptionCollecte(' + item.id + ',\'' + escapeAttr(collecte.id) + '\')" class="btn-sinscrire">'
        + '<i class="fa-solid fa-pen-to-square"></i> S\'inscrire à ' + escapeHtml(collecte.nom || 'cette collecte')
        + '</button>'
        + '</div>';
}

function ouvrirInscriptionCollecte(billetId, collecteId) {
    if (membreBloqueInscription) {
        showToast('Vous êtes bloqué pour les inscriptions. Contactez un administrateur.', 'error');
        return;
    }
    isProfilComplet(function(complet) {
        if (!complet) {
            showToast('Complétez votre profil avant de vous inscrire', 'error');
            setTimeout(function() {
                window.location.href = 'profil.html?from=inscription&billet=' + billetId;
            }, 1500);
            return;
        }
        var billet = allData.find(function(b) { return b.id === billetId; });
        if (!billet) return;

        var collectes = collectesByBillet[billet.id] || [];
        var collecte = null;
        for (var i = 0; i < collectes.length; i++) {
            if (collectes[i].id === collecteId) { collecte = collectes[i]; break; }
        }
        if (!collecte) return;

        var scope = collecte.scope || 'les_deux';
        var varianteActive = billet.HasVariante && billet.HasVariante !== 'N';
        var versionNormaleExiste = billet.VersionNormaleExiste !== false;

        var showNormaux = (scope === 'normal' || scope === 'les_deux') && (!varianteActive || versionNormaleExiste);
        var showVariantes = (scope === 'variante' || scope === 'les_deux') && varianteActive;

        var suffix = billetId + '-' + collecteId;
        var champNormaux = showNormaux
            ? '<div class="mini-form-field"><label>Nb normaux</label><input type="number" id="insc-nb-normaux-' + suffix + '" value="' + (showVariantes ? '0' : '1') + '" min="0"></div>'
            : '';
        var champVariantes = showVariantes
            ? '<div class="mini-form-field"><label>Nb variantes</label><input type="number" id="insc-nb-variantes-' + suffix + '" value="' + (!showNormaux ? '1' : '0') + '" min="' + (!showNormaux ? '1' : '0') + '"></div>'
            : '';

        var formHtml = '<div class="mini-inscription-form" id="inscription-form-' + suffix + '">'
            + champNormaux
            + champVariantes
            + '<div class="mini-form-field"><label>Paiement</label><select id="insc-paiement-' + suffix + '"><option value="PayPal">PayPal</option><option value="Chèque">Chèque</option></select></div>'
            + '<div class="mini-form-field"><label>Envoi</label><select id="insc-envoi-' + suffix + '"><option value="Normal">Normal</option><option value="Suivi">Suivi</option><option value="R1">Recommandé R1</option><option value="R2">Recommandé R2</option><option value="R3">Recommandé R3</option></select></div>'
            + '<div class="mini-form-field"><label>Commentaire</label><textarea id="insc-commentaire-' + suffix + '" rows="2"></textarea></div>'
            + '<div class="mini-form-actions">'
            + '<button onclick="confirmerInscriptionCollecte(' + billetId + ',\'' + escapeAttr(collecteId) + '\')" class="btn-confirmer-inscription">Confirmer</button>'
            + '<button onclick="annulerInscriptionCollecte(\'' + escapeAttr(collecteId) + '\')" class="btn-annuler-inscription">Annuler</button>'
            + '</div>'
            + '</div>';

        var section = document.querySelector('[data-collecte-id="' + collecteId + '"]');
        if (!section) return;
        var existingForm = section.querySelector('.mini-inscription-form');
        if (existingForm) existingForm.remove();
        section.insertAdjacentHTML('beforeend', formHtml);
    });
}

function annulerInscriptionCollecte(collecteId) {
    var section = document.querySelector('[data-collecte-id="' + collecteId + '"]');
    if (!section) return;
    var form = section.querySelector('.mini-inscription-form');
    if (form) form.remove();
}

function confirmerInscriptionCollecte(billetId, collecteId) {
    if (getInscription(billetId, collecteId)) {
        showToast('Vous êtes déjà inscrit à cette collecte', 'error');
        return;
    }
    var email = window.getActiveEmail();
    var billet = allData.find(function(b) { return b.id === billetId; });
    if (!billet) return;
    var suffix = billetId + '-' + collecteId;
    var normauxEl = document.getElementById('insc-nb-normaux-' + suffix);
    var nbNormaux = normauxEl ? parseInt(normauxEl.value) || 0 : 0;
    var variantesEl = document.getElementById('insc-nb-variantes-' + suffix);
    var nbVariantes = variantesEl ? parseInt(variantesEl.value) || 0 : 0;
    if (nbNormaux + nbVariantes === 0) {
        showToast('Sélectionnez au moins un billet', 'error');
        return;
    }

    // Demande #24 — re-contrôle du plafond juste avant l'insertion (anti-course)
    var collecteObj = null;
    var collectesForBillet = collectesByBillet[billetId] || [];
    for (var ci = 0; ci < collectesForBillet.length; ci++) {
        if (collectesForBillet[ci].id === collecteId) { collecteObj = collectesForBillet[ci]; break; }
    }

    function creerInscription() {
        supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email) + '&select=nom,prenom,rue,code_postal,ville,pays')
        .then(function(membreData) {
            var adresse = membreData && membreData[0] ? membreData[0] : {};
            var body = {
                billet_id: billetId,
                collecte_id: collecteId,
                membre_email: email,
                nb_normaux: nbNormaux,
                nb_variantes: nbVariantes,
                mode_paiement: document.getElementById('insc-paiement-' + suffix).value,
                mode_envoi: document.getElementById('insc-envoi-' + suffix).value,
                commentaire: (document.getElementById('insc-commentaire-' + suffix).value || '').trim(),
                adresse_snapshot: adresse,
                statut_paiement: 'non_paye',
                envoye: false,
                fdp_regles: false,
                pas_interesse: false
            };
            return supabaseFetch('/rest/v1/inscriptions', {
                method: 'POST',
                body: JSON.stringify(body)
            });
        })
        .then(function() {
            showToast('Inscription confirmée !');
            annulerInscriptionCollecte(collecteId);
            loadMesInscriptions();
            loadCompteursInscriptions();
            loadCollectesByBillet(); // Demande #24 — rafraîchir le total/plafond de la collecte
            // Enveloppe pour le collecteur de LA collecte visée (bascule collecteur)
            var colE = collecteByIdCatalogue[collecteId] || collecteObj;
            if (colE && colE.collecteur) creerEnveloppeSiAbsente(colE.collecteur, email);
        })
        .catch(function(error) {
            console.error('Erreur inscription collecte supplémentaire:', error);
            showToast('Erreur lors de l\'inscription', 'error');
        });
    }

    // Si la collecte a un plafond, revérifier le total courant avant d'insérer
    if (collecteObj && collecteObj.nb_max !== null && collecteObj.nb_max !== undefined) {
        fetchCollecteTotalBillets(collecteId)
            .then(function(total) {
                if (total >= collecteObj.nb_max) {
                    collecteObj._total = total;
                    collecteObj._full = true;
                    showToast('Cette collecte est complète (' + total + '/' + collecteObj.nb_max + ' billets).', 'error');
                    return;
                }
                creerInscription();
            })
            .catch(function() { creerInscription(); }); // recomptage impossible : ne pas bloquer
        return;
    }
    creerInscription();
}
