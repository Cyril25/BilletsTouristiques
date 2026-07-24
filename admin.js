// ============================================================
// admin.js — BilletsTouristiques Administration
// Stories 2.1, 2.2, 2.3, 2.4, 2.5
// ============================================================

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
// 2. CONSTANTES & CONFIGURATION
// ============================================================
var adminBillets = [];
var adminInscriptionCounts = {};
var adminCollectesByBillet = {};
var adminCollecteInscriptionCounts = {};
// Demande #16 — contexte du formulaire rapide : statut visé et collecte à
// compléter (null = création), par billet.
var quickCollecteContext = {};
var adminMembresCache = null;

// #14 — Onboarding admin
function showAdminOnboarding() {
    var key = 'bt_onboarding_admin_dismissed';
    if (localStorage.getItem(key)) return;

    var target = document.querySelector('.admin-page-header');
    if (!target) return;

    var html = '<div class="onboarding-banner onboarding-banner--compact" id="onboarding-admin">'
        + '<button class="onboarding-close" onclick="dismissOnboardingAdmin()" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>'
        + '<h3 class="onboarding-title"><i class="fa-solid fa-hand-wave"></i> Espace administration</h3>'
        + '<p class="onboarding-text">Depuis cette page, vous gérez le <strong>catalogue des billets</strong> : '
        + 'créer, modifier, changer le statut (pré-collecte → collecte → terminé…). '
        + 'Les autres pages admin vous permettent de gérer les <strong>membres</strong>, les <strong>collecteurs</strong> et les <strong>frais de port</strong> via le menu.</p>'
        + '</div>';

    target.insertAdjacentHTML('afterend', html);
}

function dismissOnboardingAdmin() {
    localStorage.setItem('bt_onboarding_admin_dismissed', '1');
    var el = document.getElementById('onboarding-admin');
    if (el) el.remove();
}

// Categories (= statuts) — valeurs reelles du Google Sheet
var CATEGORIES = [
    'Pré collecte',
    'Collecte',
    'Terminé',
    'Pas de collecte',
    'Jamais édité, projet',
    'Masqué'
];
var CATEGORIE_FLOW = {
    'Jamais édité, projet': 'Pré collecte',
    'Pré collecte': 'Collecte',
    'Collecte': 'Terminé',
    'Pas de collecte': null,
    'Terminé': null
};
// Demande #16 — un billet naît sans collecte : son statut par défaut est donc un
// statut manuel. « Pré collecte » est désormais un statut DÉRIVÉ, refusé par la
// base à la création (il découle de la collecte, créée juste après le billet).
var CATEGORIE_DEFAULT = 'Pas de collecte';
// Les seuls statuts saisissables à la main, et uniquement quand le billet n'a
// aucune collecte. Pré collecte / Collecte / Terminé sont dérivés par la base.
var STATUTS_MANUELS = ['Pas de collecte', 'Jamais édité, projet', 'Masqué'];

// Couleurs des categories
var CATEGORIE_COLORS = {
    'Collecte': '#A4C2F4',
    'Pré collecte': '#FFFF00',
    'Terminé': '#C27BA0',
    'Pas de collecte': '#FF0000',
    'Jamais édité, projet': '#CECECE',
    'Non defini': '#F57C00',
    'Masqué': '#555555'
};

// Cloudinary — configuration upload unsigned
var CLOUDINARY_CLOUD_NAME = 'dxoyqxben';
var CLOUDINARY_UPLOAD_PRESET = 'billets-touristiques';

// Story 2.2 — Focus trap
var focusTrapHandler = null;
var escapeHandler = null;

// Story 2.4 — Suppression
var deleteTargetDocId = null;
var deleteTargetName = '';

// Pagination
var PAGE_SIZE = 50;
var currentPage = 1;

// Story 2.1b — Variables de filtrage admin
var adminActiveStatusFilter = 'tous';
var adminFilterEnCours = false;
var adminFilteredBillets = [];

// Story 4.3 — Cache liste des pays
var paysListe = [];

// Mapping nom de pays → code ISO 2 lettres (tous les pays + variantes)
var paysIsoMap = {
    // Europe (49 pays + variantes)
    'Albanie': 'AL', 'Allemagne': 'DE', 'Andorre': 'AD', 'Angleterre': 'GB',
    'Autriche': 'AT', 'Belgique': 'BE', 'Biélorussie': 'BY', 'Bélarus': 'BY',
    'Belarus': 'BY', 'Bosnie': 'BA', 'Bosnie-Herzégovine': 'BA',
    'Bosnie Herzégovine': 'BA', 'Bulgarie': 'BG', 'Chypre': 'CY',
    'Croatie': 'HR', 'Danemark': 'DK', 'Écosse': 'GB', 'Ecosse': 'GB',
    'Espagne': 'ES', 'Estonie': 'EE', 'Finlande': 'FI', 'France': 'FR',
    'Grande-Bretagne': 'GB', 'Grèce': 'GR', 'Hongrie': 'HU',
    'Irlande': 'IE', 'Irlande du Nord': 'GB', 'Islande': 'IS', 'Italie': 'IT',
    'Kosovo': 'XK', 'Lettonie': 'LV', 'Liechtenstein': 'LI', 'Lituanie': 'LT',
    'Luxembourg': 'LU', 'Macédoine': 'MK', 'Macédoine du Nord': 'MK',
    'Malte': 'MT', 'Moldavie': 'MD', 'Moldova': 'MD', 'Monaco': 'MC',
    'Monténégro': 'ME', 'Montenegro': 'ME', 'Norvège': 'NO',
    'Pays de Galles': 'GB', 'Pays-Bas': 'NL', 'Pologne': 'PL',
    'Portugal': 'PT', 'République tchèque': 'CZ', 'Republique tcheque': 'CZ',
    'Roumanie': 'RO', 'Royaume-Uni': 'GB', 'Russie': 'RU',
    'Saint-Marin': 'SM', 'San Marino': 'SM', 'Serbie': 'RS',
    'Slovaquie': 'SK', 'Slovénie': 'SI', 'Suède': 'SE', 'Suede': 'SE',
    'Suisse': 'CH', 'Tchéquie': 'CZ', 'Tchequia': 'CZ', 'Ukraine': 'UA',
    'Vatican': 'VA', 'Cité du Vatican': 'VA',
    // Asie (48 pays + variantes)
    'Afghanistan': 'AF', 'Arabie Saoudite': 'SA', 'Arabie saoudite': 'SA',
    'Arménie': 'AM', 'Armenie': 'AM', 'Azerbaïdjan': 'AZ', 'Azerbaidjan': 'AZ',
    'Bahreïn': 'BH', 'Bahrein': 'BH', 'Bangladesh': 'BD', 'Bhoutan': 'BT',
    'Birmanie': 'MM', 'Myanmar': 'MM', 'Brunei': 'BN', 'Cambodge': 'KH',
    'Chine': 'CN', 'Corée du Nord': 'KP', 'Coree du Nord': 'KP',
    'Corée du Sud': 'KR', 'Coree du Sud': 'KR',
    'Émirats arabes unis': 'AE', 'Emirats arabes unis': 'AE', 'EAU': 'AE',
    'Géorgie': 'GE', 'Georgie': 'GE', 'Inde': 'IN', 'Indonésie': 'ID',
    'Indonesie': 'ID', 'Irak': 'IQ', 'Iraq': 'IQ', 'Iran': 'IR',
    'Israël': 'IL', 'Israel': 'IL', 'Japon': 'JP', 'Jordanie': 'JO',
    'Kazakhstan': 'KZ', 'Kirghizistan': 'KG', 'Kirghizstan': 'KG',
    'Koweït': 'KW', 'Koweit': 'KW', 'Laos': 'LA', 'Liban': 'LB',
    'Malaisie': 'MY', 'Maldives': 'MV', 'Mongolie': 'MN',
    'Népal': 'NP', 'Nepal': 'NP', 'Oman': 'OM', 'Ouzbékistan': 'UZ',
    'Ouzbekistan': 'UZ', 'Pakistan': 'PK', 'Palestine': 'PS',
    'Philippines': 'PH', 'Qatar': 'QA', 'Singapour': 'SG',
    'Sri Lanka': 'LK', 'Syrie': 'SY', 'Tadjikistan': 'TJ',
    'Taïwan': 'TW', 'Taiwan': 'TW', 'Thaïlande': 'TH', 'Thailande': 'TH',
    'Timor oriental': 'TL', 'Timor-Leste': 'TL', 'Turkménistan': 'TM',
    'Turkmenistan': 'TM', 'Turquie': 'TR', 'Türkiye': 'TR',
    'Vietnam': 'VN', 'Viêt Nam': 'VN', 'Yémen': 'YE', 'Yemen': 'YE',
    // Afrique (54 pays + variantes)
    'Afrique du Sud': 'ZA', 'Algérie': 'DZ', 'Algerie': 'DZ',
    'Angola': 'AO', 'Bénin': 'BJ', 'Benin': 'BJ', 'Botswana': 'BW',
    'Burkina Faso': 'BF', 'Burkina': 'BF', 'Burundi': 'BI',
    'Cabo Verde': 'CV', 'Cap-Vert': 'CV', 'Cameroun': 'CM',
    'Centrafrique': 'CF', 'République centrafricaine': 'CF',
    'Comores': 'KM', 'Congo': 'CG', 'République du Congo': 'CG',
    'Congo-Brazzaville': 'CG', 'Congo-Kinshasa': 'CD',
    'Côte d\'Ivoire': 'CI', 'Cote d\'Ivoire': 'CI', 'Djibouti': 'DJ',
    'Égypte': 'EG', 'Egypte': 'EG', 'Érythrée': 'ER', 'Erythree': 'ER',
    'Eswatini': 'SZ', 'Swaziland': 'SZ', 'Éthiopie': 'ET', 'Ethiopie': 'ET',
    'Gabon': 'GA', 'Gambie': 'GM', 'Ghana': 'GH', 'Guinée': 'GN',
    'Guinee': 'GN', 'Guinée équatoriale': 'GQ', 'Guinee equatoriale': 'GQ',
    'Guinée-Bissau': 'GW', 'Guinee-Bissau': 'GW', 'Kenya': 'KE',
    'Lesotho': 'LS', 'Liberia': 'LR', 'Libéria': 'LR',
    'Libye': 'LY', 'Lybie': 'LY', 'Madagascar': 'MG', 'Malawi': 'MW',
    'Mali': 'ML', 'Maroc': 'MA', 'Maurice': 'MU', 'Île Maurice': 'MU',
    'Ile Maurice': 'MU', 'Mauritanie': 'MR', 'Mayotte': 'YT',
    'Mozambique': 'MZ', 'Namibie': 'NA', 'Niger': 'NE', 'Nigeria': 'NG',
    'Nigéria': 'NG', 'Ouganda': 'UG', 'RD Congo': 'CD', 'RDC': 'CD',
    'République démocratique du Congo': 'CD', 'Republique democratique du Congo': 'CD',
    'La Réunion': 'RE', 'Réunion': 'RE', 'Rwanda': 'RW',
    'Sao Tomé-et-Príncipe': 'ST', 'São Tomé-et-Príncipe': 'ST',
    'Sénégal': 'SN', 'Senegal': 'SN', 'Seychelles': 'SC',
    'Sierra Leone': 'SL', 'Somalie': 'SO', 'Soudan': 'SD',
    'Soudan du Sud': 'SS', 'Tanzanie': 'TZ', 'Tchad': 'TD',
    'Togo': 'TG', 'Tunisie': 'TN', 'Zambie': 'ZM', 'Zimbabwe': 'ZW',
    // Amériques (35 pays + variantes)
    'Antigua-et-Barbuda': 'AG', 'Argentine': 'AR', 'Bahamas': 'BS',
    'Barbade': 'BB', 'Belize': 'BZ', 'Bolivie': 'BO', 'Brésil': 'BR',
    'Bresil': 'BR', 'Canada': 'CA', 'Chili': 'CL', 'Colombie': 'CO',
    'Costa Rica': 'CR', 'Cuba': 'CU', 'Curaçao': 'CW', 'Curacao': 'CW',
    'Dominique': 'DM', 'El Salvador': 'SV', 'Salvador': 'SV',
    'Équateur': 'EC', 'Equateur': 'EC', 'États-Unis': 'US', 'Etats-Unis': 'US',
    'USA': 'US', 'Grenade': 'GD', 'Guadeloupe': 'GP', 'Guatemala': 'GT',
    'Guyana': 'GY', 'Guyane': 'GF', 'Guyane française': 'GF',
    'Haïti': 'HT', 'Haiti': 'HT', 'Honduras': 'HN',
    'Jamaïque': 'JM', 'Jamaique': 'JM', 'Martinique': 'MQ', 'Mexique': 'MX',
    'Nicaragua': 'NI', 'Panama': 'PA', 'Paraguay': 'PY',
    'Pérou': 'PE', 'Perou': 'PE', 'Porto Rico': 'PR', 'Puerto Rico': 'PR',
    'République dominicaine': 'DO', 'Republique dominicaine': 'DO',
    'Saint-Barthélemy': 'BL', 'Saint-Kitts-et-Nevis': 'KN',
    'Saint-Martin': 'MF', 'Saint-Vincent-et-les-Grenadines': 'VC',
    'Sainte-Lucie': 'LC', 'Suriname': 'SR', 'Surinam': 'SR',
    'Trinité-et-Tobago': 'TT', 'Trinidad et Tobago': 'TT',
    'Uruguay': 'UY', 'Venezuela': 'VE',
    // Océanie (14 pays + variantes)
    'Australie': 'AU', 'Fidji': 'FJ', 'Îles Marshall': 'MH',
    'Iles Marshall': 'MH', 'Îles Salomon': 'SB', 'Iles Salomon': 'SB',
    'Kiribati': 'KI', 'Micronésie': 'FM', 'Micronesie': 'FM',
    'Nauru': 'NR', 'Nouvelle-Calédonie': 'NC', 'Nouvelle-Caledonie': 'NC',
    'Nouvelle-Zélande': 'NZ', 'Nouvelle-Zelande': 'NZ',
    'Palaos': 'PW', 'Palau': 'PW',
    'Papouasie-Nouvelle-Guinée': 'PG', 'Papouasie-Nouvelle-Guinee': 'PG',
    'Polynésie française': 'PF', 'Polynesie francaise': 'PF',
    'Samoa': 'WS', 'Tonga': 'TO', 'Tuvalu': 'TV', 'Vanuatu': 'VU',
    'Wallis-et-Futuna': 'WF'
};

// Story 4.6 — Cache liste des collecteurs
var collecteursList = [];

// Story 9.3 — Hiérarchie des statuts pour la gestion des dates
var STATUS_ORDER = {
    'Jamais édité, projet': 0,
    'Pré collecte': 1,
    'Collecte': 2,
    'Terminé': 3,
    'Pas de collecte': -1
};

// Story 9.3 — Calcule les mises à jour de dates lors d'un changement de statut
// Demande #16 — équivalent collecte de getDateUpdatesForStatusChange : les dates
// suivent le statut de la COLLECTE (colonnes date_pre / date_coll / date_fin).
function getCollecteDateUpdates(oldStatus, newStatus, collecte) {
    var today = new Date().toISOString().split('T')[0];
    var updates = {};
    var oldLevel = STATUS_ORDER[oldStatus] !== undefined ? STATUS_ORDER[oldStatus] : 0;
    var newLevel = STATUS_ORDER[newStatus] !== undefined ? STATUS_ORDER[newStatus] : 0;
    var c = collecte || {};

    if (newStatus === 'Pré collecte' && !c.date_pre)  updates.date_pre  = today;
    if (newStatus === 'Collecte'     && !c.date_coll) updates.date_coll = today;
    if (newStatus === 'Terminé'      && !c.date_fin)  updates.date_fin  = today;

    // Retour en arrière : effacer les dates des statuts supérieurs
    if (newLevel < 3 && oldLevel >= 3) updates.date_fin = null;
    if (newLevel < 2 && oldLevel >= 2) { updates.date_coll = null; updates.date_fin = null; }

    return updates;
}

// Scope d'une collecte déduit des versions déclarées sur le billet.
function scopeDepuisBillet(billet) {
    var aVariante = !!(billet && billet.HasVariante && billet.HasVariante !== 'N');
    var aNormale = !billet || (billet.VersionNormaleExiste !== false && billet.VersionNormaleExiste !== 'false');
    return aVariante ? (aNormale ? 'les_deux' : 'variante') : 'normal';
}

// Collectes connues d'un billet (chargées par loadAdminCollectes).
function collectesDuBillet(billetId) {
    return adminCollectesByBillet[billetId] || [];
}

// Le statut du billet étant dérivé, on le relit en base après action sur une
// collecte plutôt que de redupliquer la règle de priorité côté front.
function rafraichirStatutBillet(docId) {
    return supabaseFetch('/rest/v1/billets?id=eq.' + encodeURIComponent(docId) + '&select=Categorie')
        .then(function(rows) {
            var statut = (rows && rows[0]) ? rows[0].Categorie : null;
            if (!statut) return null;
            var badge = document.querySelector('.admin-badge-status[data-doc-id="' + docId + '"]');
            if (badge) updateBadgeUI(badge, statut);
            updateInMemoryStatus(docId, statut);
            var popup = document.getElementById('quick-status-popup-' + docId);
            if (popup) {
                var chipsContainer = popup.querySelector('.quick-status-chips');
                if (chipsContainer) chipsContainer.innerHTML = buildStatusChipsHtml(docId, statut);
            }
            renderStatusCounters();
            return statut;
        });
}
// ============================================================
// 2b. UPLOAD IMAGE CLOUDINARY
// ============================================================

function uploadImageToCloudinary(file) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    return fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
        method: 'POST',
        body: formData
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.secure_url) {
            return data.secure_url;
        }
        throw new Error(data.error ? data.error.message : 'Erreur upload');
    });
}

function initImageUpload() {
    var zone = document.getElementById('image-upload-zone');
    var fileInput = document.getElementById('field-image-file');
    var browseBtn = document.getElementById('btn-image-browse');
    var removeBtn = document.getElementById('btn-image-remove');
    var preview = document.getElementById('image-preview');
    var placeholder = document.getElementById('image-upload-placeholder');
    var progressBar = document.getElementById('image-upload-bar');
    var progressContainer = document.getElementById('image-upload-progress');
    var imageUrlField = document.getElementById('field-image-url');

    if (!zone || !fileInput) return;

    // Clic sur le bouton Parcourir ou la zone
    browseBtn.addEventListener('click', function() { fileInput.click(); });
    zone.addEventListener('click', function(e) {
        if (e.target === zone || e.target === placeholder || e.target.parentNode === placeholder) {
            fileInput.click();
        }
    });

    // Drag & drop
    zone.addEventListener('dragover', function(e) {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function() {
        zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageFile(files[0]);
        }
    });

    // Sélection via input file
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            handleImageFile(fileInput.files[0]);
        }
    });

    // Supprimer l'image
    removeBtn.addEventListener('click', function() {
        clearImageUpload();
    });

    // Changement manuel de l'URL — mettre à jour la prévisualisation
    imageUrlField.addEventListener('change', function() {
        var url = imageUrlField.value.trim();
        if (url) {
            showImagePreview(url);
        } else {
            clearImageUpload();
        }
    });

    function handleImageFile(file) {
        // Validation taille (max 10 MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('Image trop volumineuse (max 10 Mo)', 'error');
            return;
        }

        // Prévisualisation locale immédiate
        var reader = new FileReader();
        reader.onload = function(e) {
            showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);

        // Upload vers Cloudinary
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '30%';
        zone.classList.add('uploading');

        uploadImageToCloudinary(file)
            .then(function(url) {
                progressBar.style.width = '100%';
                imageUrlField.value = url;
                showImagePreview(url);
                showToast('Image uploadée avec succès', 'success');
                setTimeout(function() {
                    progressContainer.classList.add('hidden');
                    progressBar.style.width = '0%';
                    zone.classList.remove('uploading');
                }, 800);
            })
            .catch(function(error) {
                progressContainer.classList.add('hidden');
                progressBar.style.width = '0%';
                zone.classList.remove('uploading');
                showToast('Erreur upload image : ' + error.message, 'error');
                console.error('Erreur upload Cloudinary:', error);
            });
    }

    function showImagePreview(url) {
        preview.src = url;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    }
}

function clearImageUpload() {
    var preview = document.getElementById('image-preview');
    var placeholder = document.getElementById('image-upload-placeholder');
    var removeBtn = document.getElementById('btn-image-remove');
    var imageUrlField = document.getElementById('field-image-url');
    var imageIdField = document.getElementById('field-image-id');
    var fileInput = document.getElementById('field-image-file');
    var groupImageId = document.getElementById('group-image-id');

    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
    if (imageUrlField) imageUrlField.value = '';
    if (imageIdField) imageIdField.value = '';
    if (groupImageId) groupImageId.classList.add('hidden');
    if (fileInput) fileInput.value = '';
}

// ============================================================
// 3. INITIALISATION
// ============================================================
// Demande #16 (#35) — deux pages partagent admin.js :
//  - admin.html : la LISTE des billets (cartes, filtres, chips) ;
//  - admin-billet.html : la PAGE dédiée d'ajout/édition (le panneau, rendu pleine
//    page). La liste navigue vers elle ; enregistrer/annuler y ramènent.
var IS_BILLET_PAGE = !!(document.body && document.body.classList.contains('admin-billet-page'));

if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        if (IS_BILLET_PAGE) {
            // Page dédiée : uniquement ce qu'il faut au formulaire
            loadPays();
            loadCollecteurs();
            initPanel();
            initImageUpload();
            initBilletPage();
        } else {
            showAdminOnboarding();
            loadAdminBillets();
            loadAdminInscriptionCounts();
            loadAdminCollectes();
            loadPays();
            loadCollecteurs();
            initPanel();
            initImageUpload();
        }
    });
}

// Ouvre la page dédiée dans le bon mode selon l'URL (?id= / ?new= / ?dup=).
function initBilletPage() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (params.get('new') === '1') {
        openBilletPanel();
        return;
    }
    if (params.get('dup') === '1') {
        var stash = null;
        try { stash = JSON.parse(sessionStorage.getItem('bt_billet_dup') || 'null'); } catch (e) {}
        sessionStorage.removeItem('bt_billet_dup');
        if (!stash) { window.location.href = 'admin.html'; return; }
        openBilletPanel(null, null);        // mode ajout
        prefillForm(stash);                 // puis pré-remplir avec la copie
        var cf = document.getElementById('field-categorie');
        if (cf) cf.value = CATEGORIE_DEFAULT;
        return;
    }
    if (id) {
        // Édition : on recharge le billet à jour (pas de dépendance à une liste)
        supabaseFetch('/rest/v1/billets?id=eq.' + encodeURIComponent(id) + '&select=*')
            .then(function(rows) {
                var b = (rows && rows[0]) ? rows[0] : null;
                if (!b) { window.location.href = 'admin.html'; return; }
                b._id = b.id;
                // La page n'a pas de liste : on garnit adminBillets avec le billet
                // courant pour que saveCollecte / la réconciliation le retrouvent.
                adminBillets = [b];
                openBilletPanel(b, String(b.id));
            })
            .catch(function() { window.location.href = 'admin.html'; });
        return;
    }
    // URL sans paramètre → retour liste
    window.location.href = 'admin.html';
}

// ============================================================
// 4. CHARGEMENT DES BILLETS DEPUIS SUPABASE
// ============================================================
function loadAdminBillets() {
    var grid = document.getElementById('admin-cards-grid');
    if (!grid) return;
    currentPage = 1;

    supabaseFetch('/rest/v1/billets?select=*&order=date_effective.desc.nullslast&limit=10000', { method: 'GET' })
        .then(function(rows) {
            adminBillets = rows.map(function(row) {
                row._id = row.id;
                return row;
            });
            // Story 2.1b — Initialiser compteurs et filtres
            renderStatusCounters();
            adminApplyFilters();
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
// 4a-bis. CHARGEMENT DES COMPTEURS D'INSCRIPTIONS
// ============================================================
function loadAdminCollectes() {
    // Demande #16 — limit explicite : après la migration il y a une collecte par
    // billet (~5 300), au-delà du plafond de 1000 lignes de PostgREST.
    return supabaseFetch('/rest/v1/collectes?select=id,billet_id,nom,scope,categorie,collecteur,prix,prix_variante,payer_fdp,date_pre,date_coll,date_fin,nb_max&limit=10000')
        .then(function(data) {
            adminCollectesByBillet = {};
            adminCollecteInscriptionCounts = {};
            var collectes = data || [];
            collectes.forEach(function(c) {
                if (!adminCollectesByBillet[c.billet_id]) adminCollectesByBillet[c.billet_id] = [];
                adminCollectesByBillet[c.billet_id].push(c);
            });
            if (collectes.length === 0) {
                if (adminBillets.length > 0) renderAdminCards();
                return;
            }
            // Demande #16 — RPC au lieu d'un in.(<tous les uuid>) : avec une collecte
            // par billet, l'URL construite dépassait toute limite acceptable.
            return supabaseFetch('/rest/v1/rpc/compteurs_inscriptions_par_collecte')
                .then(function(rows) {
                    (rows || []).forEach(function(row) {
                        adminCollecteInscriptionCounts[row.collecte_id] = {
                            count: row.total_count || 0,
                            normaux: row.total_normaux || 0,
                            variantes: row.total_variantes || 0
                        };
                    });
                    if (adminBillets.length > 0) renderAdminCards();
                });
        })
        .catch(function(error) {
            console.warn('Erreur chargement collectes admin:', error);
        });
}

// Demande #16 — compteurs par billet via RPC : toutes les inscriptions du billet
// (toutes collectes confondues), agrégées côté serveur. Remplace le filtre
// collecte_id=is.null, vide après la migration, et lève au passage la limite
// de 1000 lignes de PostgREST qui tronquait déjà les compteurs.
function loadAdminInscriptionCounts() {
    return supabaseFetch('/rest/v1/rpc/compteurs_inscriptions')
        .then(function(data) {
            adminInscriptionCounts = {};
            (data || []).forEach(function(row) {
                adminInscriptionCounts[row.billet_id] = {
                    count: row.total_count || 0,
                    normaux: row.total_normaux || 0,
                    variantes: row.total_variantes || 0
                };
            });
            // Re-render si les billets sont déjà chargés
            if (adminBillets.length > 0) renderAdminCards();
        })
        .catch(function(error) {
            console.warn('Erreur chargement compteurs inscriptions:', error);
        });
}

// ============================================================
// 4b. CHARGEMENT DES PAYS (Story 4.3)
// ============================================================
function loadPays() {
    supabaseFetch('/rest/v1/pays?select=id,nom&order=nom.asc')
        .then(function(data) {
            paysListe = data || [];
            populatePaysSelect();
        })
        .catch(function(error) {
            console.warn('Erreur chargement pays:', error);
        });
}

function populatePaysSelect() {
    var select = document.getElementById('field-pays');
    if (!select) return;
    // Garder la premiere option (placeholder)
    select.length = 1;
    paysListe.forEach(function(pays) {
        var option = document.createElement('option');
        option.value = pays.nom;
        option.textContent = pays.nom;
        select.appendChild(option);
    });
}

// ============================================================
// 4c. MILLESIME SELECT (Story 4.4)
// ============================================================
function populateMillesimeSelect(mode) {
    var select = document.getElementById('field-millesime');
    if (!select) return;

    var currentYear = new Date().getFullYear();
    var options = [];

    if (mode === 'create') {
        // N+1, N, N-1, N-2, N-3
        for (var y = currentYear + 1; y >= currentYear - 3; y--) {
            options.push(String(y));
        }
    } else {
        // 2015 a N+1
        for (var y = currentYear + 1; y >= 2015; y--) {
            options.push(String(y));
        }
    }

    // Reinitialiser le select
    select.length = 1; // Garder l'option placeholder
    options.forEach(function(year) {
        var opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        select.appendChild(opt);
    });

    // En mode creation, pre-selectionner l'annee en cours
    if (mode === 'create') {
        select.value = String(currentYear);
    }
}

// ============================================================
// 4d. CHARGEMENT DES COLLECTEURS (Story 4.6)
// ============================================================
function loadCollecteurs() {
    supabaseFetch('/rest/v1/collecteurs?select=id,alias,masque,paypal_email&order=alias.asc')
        .then(function(data) {
            collecteursList = (data || []).filter(function(c) { return !c.masque; });
            populateCollecteurSelect();
        })
        .catch(function(error) {
            console.warn('Erreur chargement collecteurs:', error);
        });
}

function populateCollecteurSelect() {
    var select = document.getElementById('field-collecteur');
    if (!select) return;
    // Garder la premiere option (placeholder)
    select.length = 1;
    collecteursList.forEach(function(coll) {
        var option = document.createElement('option');
        option.value = coll.alias;
        option.textContent = coll.alias;
        select.appendChild(option);
    });
}

// ============================================================
// 5. RENDU DES CARTES BILLETS (Stories 2.1, 2.3, 2.4, 2.5)
// ============================================================
function getStatusColor(categorie) {
    var key = categorie || 'Non defini';
    return CATEGORIE_COLORS[key] || CATEGORIE_COLORS['Non defini'];
}

function getTextColorForBg(hex) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#333' : '#fff';
}

function renderAdminCards() {
    var grid = document.getElementById('admin-cards-grid');
    if (!grid) return;

    var source = getDisplayedBillets();

    if (source.length === 0) {
        var hasFilters = adminActiveStatusFilter !== 'tous' || adminFilterEnCours || getSearchText();
        if (hasFilters) {
            // Story 2.1b — Etat vide avec filtres actifs
            grid.innerHTML = '<div class="admin-empty-state">' +
                '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>' +
                '<p>Aucun billet ne correspond a votre recherche</p>' +
                '<button class="admin-empty-state__reset" onclick="adminResetFilters()">' +
                'Reinitialiser les filtres</button>' +
                '</div>';
        } else {
            grid.innerHTML = '<div class="admin-empty-state">' +
                '<i class="fa-solid fa-box-open"></i>' +
                '<p>Aucun billet dans le catalogue</p>' +
                '<button class="btn-admin-primary" onclick="openBilletPanel()">' +
                '<i class="fa-solid fa-plus"></i> Ajouter un premier billet</button>' +
                '</div>';
        }
        var paginationContainer = document.getElementById('admin-pagination');
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }

    var totalPages = Math.ceil(source.length / PAGE_SIZE);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    var start = (currentPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, source.length);

    var html = '';
    for (var i = start; i < end; i++) {
        var billet = source[i];
        var docId = billet._id;
        var nom = billet.NomBillet || 'Sans nom';
        var statut = billet.Categorie || '';
        var statusLabel = statut || 'Non defini';
        var statusColor = getStatusColor(statut);

        html += '<div class="admin-card-billet" data-doc-id="' + docId + '">' +
            '<div class="admin-card-header">' +
                '<h3 class="admin-card-title">' + escapeHtml(nom) + ' <span style="font-size:10px; color:#ccc; font-weight:normal;">(n\u00b0' + docId + ')</span></h3>' +
                '<div class="card-badge-wrapper">' +
                    '<span class="admin-badge-status clickable" ' +
                        'data-doc-id="' + docId + '" ' +
                        'data-current-status="' + escapeAttr(statut) + '" ' +
                        'style="background-color: ' + statusColor + '; color: ' + getTextColorForBg(statusColor) + ';">' +
                        escapeHtml(statusLabel) +
                    '</span>' +
                    // Story 2.5 — popup de statut rapide (cache par defaut)
                    '<div class="quick-status-popup" id="quick-status-popup-' + docId + '" style="display: none;">' +
                        '<div class="quick-status-chips">' +
                            buildStatusChipsHtml(docId, statut) +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="admin-card-meta">' +
                '<span>' + escapeHtml(billet.Ville || '') + '</span>' +
                '<span class="admin-card-ref">' +
                    escapeHtml(billet.Reference || '') +
                    (billet.Millesime ? ' - ' + escapeHtml(billet.Millesime) + (billet.Version ? '-' + escapeHtml(billet.Version) : '') : '') +
                '</span>' +
            '</div>' +
            // Story 4.5 — Badges version (normale + variante)
            (function() {
                var html = '';
                // Avertissement si la version normale n'existe pas
                if (billet.VersionNormaleExiste === false) {
                    html += '<span class="admin-card-version-warning">' +
                        '<i class="fa-solid fa-triangle-exclamation"></i> Pas de version normale' +
                        '</span>';
                }
                var label = varianteLabel(billet.HasVariante);
                if (label) {
                    html += '<span class="admin-card-variante-badge">' +
                        '<i class="fa-solid fa-star"></i> ' + escapeHtml(label) +
                        '</span>';
                }
                return html;
            })() +
            // Badge compteur inscriptions
            (function() {
                var data = adminInscriptionCounts[docId] || { count: 0, normaux: 0, variantes: 0 };
                var count = data.count;
                var detail = '';
                if (count > 0) {
                    var parts = [];
                    if (data.normaux > 0) parts.push(data.normaux + ' billet' + (data.normaux > 1 ? 's' : '') + ' normaux');
                    if (data.variantes > 0 && hasVarianteActive(billet.HasVariante)) {
                        var varLabel = varianteLabel(billet.HasVariante);
                        parts.push(data.variantes + ' billet' + (data.variantes > 1 ? 's' : '') + ' ' + varLabel);
                    }
                    if (parts.length > 0) detail = ' (' + parts.join(', ') + ')';
                }
                return '<button class="admin-card-inscriptions-badge" onclick="openInscriptionsModal(' + docId + ')" title="Voir les inscriptions">' +
                    '<i class="fa-solid fa-users"></i> ' + count + ' inscription' + (count !== 1 ? 's' : '') + detail +
                    '</button>';
            })() +
            // Badges collectes supplémentaires
            (function() {
                var collectes = adminCollectesByBillet[docId] || [];
                // Demande #16 — après la migration chaque billet a au moins une
                // collecte : on ne détaille que s'il y en a plusieurs, sinon le
                // badge du dessus (total du billet) dit déjà tout.
                if (collectes.length < 2) return '';
                var today = new Date().toISOString().slice(0, 10);
                return collectes.map(function(c) {
                    var isOpen = !c.date_fin || c.date_fin > today;
                    var cData = adminCollecteInscriptionCounts[c.id] || { count: 0, normaux: 0, variantes: 0 };
                    var statusIcon = isOpen ? 'fa-layer-group' : 'fa-circle-check';
                    var detail = '';
                    if (cData.count > 0) {
                        var parts = [];
                        if (cData.normaux > 0) parts.push(cData.normaux + ' billet' + (cData.normaux > 1 ? 's' : '') + ' normaux');
                        if (cData.variantes > 0 && hasVarianteActive(billet.HasVariante)) {
                            var varLabel = varianteLabel(billet.HasVariante);
                            parts.push(cData.variantes + ' billet' + (cData.variantes > 1 ? 's' : '') + ' ' + varLabel);
                        }
                        if (parts.length > 0) detail = ' (' + parts.join(', ') + ')';
                    }
                    return '<button class="admin-card-inscriptions-badge admin-card-collecte-supp-badge" onclick="openInscriptionsModal(' + docId + ')" title="Collecte supplémentaire : ' + escapeAttr(c.nom) + '">' +
                        '<i class="fa-solid ' + statusIcon + '"></i> ' + escapeHtml(c.nom) + ' : ' + cData.count + ' inscription' + (cData.count !== 1 ? 's' : '') + detail +
                        (isOpen ? '' : ' <em>(clôturée)</em>') +
                        '</button>';
                }).join('');
            })() +
            // Story 2.3/2.4 — Boutons d'action
            '<div class="admin-card-actions">' +
                '<button class="admin-card-edit-btn" data-doc-id="' + docId + '" title="Modifier">' +
                    '<i class="fa-solid fa-pen"></i> Modifier' +
                '</button>' +
                (function() {
                    var fb = (billet.LinkFB || '').trim();
                    if (fb && /^https?:\/\//i.test(fb)) {
                        return '<a href="' + escapeAttr(fb) + '" target="_blank" onclick="event.stopPropagation()" class="admin-card-fb-btn" title="Publication Facebook"><i class="fa-brands fa-facebook"></i></a>';
                    }
                    return '';
                })() +
                (function() {
                    var ls = (billet.LinkSheet || '').trim();
                    if (ls && /^https?:\/\//i.test(ls)) {
                        return '<a href="' + escapeAttr(ls) + '" target="_blank" onclick="event.stopPropagation()" class="admin-card-sheet-btn" title="Google Sheet"><i class="fa-solid fa-file-csv"></i></a>';
                    }
                    return '';
                })() +
                (function() {
                    var origUrl = '';
                    if (billet.ImageUrl) {
                        origUrl = billet.ImageUrl;
                    } else if (billet.ImageId) {
                        origUrl = 'https://lh3.googleusercontent.com/d/' + billet.ImageId;
                    }
                    if (!origUrl) return '';
                    return '<a href="' + escapeAttr(origUrl) + '" target="_blank" onclick="event.stopPropagation()" class="admin-card-image-btn" title="Image originale"><i class="fa-solid fa-image"></i></a>';
                })() +
                '<button class="admin-card-share-btn" onclick="openShareModal(' + docId + ')" title="Partager">' +
                    '<i class="fa-solid fa-share-nodes"></i>' +
                '</button>' +
                '<button class="admin-card-ebay-btn" onclick="openEbayModal(' + docId + ')" title="Annonce eBay">' +
                    '<i class="fa-brands fa-ebay"></i>' +
                '</button>' +
                '<button class="admin-card-copy-btn" data-doc-id="' + docId + '" title="Dupliquer">' +
                    '<i class="fa-solid fa-copy"></i>' +
                '</button>' +
                '<button class="admin-card-delete-btn" data-doc-id="' + docId + '" data-billet-name="' + escapeAttr(nom) + '" title="Supprimer">' +
                    '<i class="fa-solid fa-trash-can"></i>' +
                '</button>' +
            '</div>' +
            '</div>';
    }

    grid.innerHTML = html;
    renderPaginationControls(source.length, totalPages);
}

// Story 2.5 — Generer le HTML des chips de statut pour le popup rapide
function buildStatusChipsHtml(docId, currentStatus) {
    var html = '';
    var currentIndex = CATEGORIES.indexOf(currentStatus);

    CATEGORIES.forEach(function(statut, index) {
        var classes = 'status-chip';
        if (statut === currentStatus) classes += ' status-chip--active';
        if (currentIndex >= 0 && index === currentIndex + 1) classes += ' status-chip--next';

        var color = getStatusColor(statut);
        html += '<button class="' + classes + '" ' +
            'data-status="' + escapeAttr(statut) + '" ' +
            'data-doc-id="' + docId + '" ' +
            'style="background-color: ' + color + '; color: ' + getTextColorForBg(color) + ';" ' +
            'aria-pressed="' + (statut === currentStatus ? 'true' : 'false') + '">' +
            escapeHtml(statut) +
            '</button>';
    });

    return html;
}

// Utilitaires d'echappement
function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// 5b. PAGINATION — SOURCE DE DONNEES
// ============================================================
function getDisplayedBillets() {
    return adminFilteredBillets.length > 0 || adminActiveStatusFilter !== 'tous' || adminFilterEnCours || getSearchText()
        ? adminFilteredBillets
        : adminBillets;
}

function getSearchText() {
    var input = document.getElementById('admin-search-input');
    return input ? input.value.trim() : '';
}

// ============================================================
// 5c. PAGINATION — CONTROLES DE NAVIGATION
// ============================================================
function renderPaginationControls(totalItems, totalPages) {
    var container = document.getElementById('admin-pagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Pagination');
    var html = '';

    // Bouton precedent
    html += '<button class="admin-pagination-btn admin-pagination-prev"' +
        ' aria-label="Page précédente"' +
        (currentPage === 1 ? ' disabled' : '') +
        ' data-page="' + (currentPage - 1) + '">' +
        '<i class="fa-solid fa-chevron-left"></i> Précédent</button>';

    // Numeros de page (avec ellipses si > 7 pages)
    var pages = getPaginationRange(currentPage, totalPages);
    for (var i = 0; i < pages.length; i++) {
        if (pages[i] === '...') {
            html += '<span class="admin-pagination-ellipsis">...</span>';
        } else {
            html += '<button class="admin-pagination-btn admin-pagination-num' +
                (pages[i] === currentPage ? ' active' : '') + '"' +
                (pages[i] === currentPage ? ' aria-current="page"' : '') +
                ' aria-label="Page ' + pages[i] + '"' +
                ' data-page="' + pages[i] + '">' + pages[i] + '</button>';
        }
    }

    // Bouton suivant
    html += '<button class="admin-pagination-btn admin-pagination-next"' +
        ' aria-label="Page suivante"' +
        (currentPage === totalPages ? ' disabled' : '') +
        ' data-page="' + (currentPage + 1) + '">' +
        'Suivant <i class="fa-solid fa-chevron-right"></i></button>';

    // Compteur
    html += '<span class="admin-pagination-info">' +
        totalItems + ' billets — Page ' + currentPage + ' sur ' + totalPages +
        '</span>';

    container.innerHTML = html;
}

function getPaginationRange(current, total) {
    if (total <= 7) {
        var range = [];
        for (var i = 1; i <= total; i++) range.push(i);
        return range;
    }
    var pages = [];
    pages.push(1);
    var rangeStart = Math.max(2, current - 1);
    var rangeEnd = Math.min(total - 1, current + 1);
    // Etendre la fenetre si proche des bords
    if (rangeStart <= 3) {
        rangeEnd = Math.max(rangeEnd, 4);
        rangeStart = 2;
    }
    if (rangeEnd >= total - 2) {
        rangeStart = Math.min(rangeStart, total - 3);
        rangeEnd = total - 1;
    }
    if (rangeStart > 2) pages.push('...');
    for (var i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < total - 1) pages.push('...');
    pages.push(total);
    return pages;
}

// ============================================================
// 6. STORY 2.2 — PANEL LATERAL (ouverture / fermeture)
// ============================================================

function initPanel() {
    // Bouton "Ajouter un billet" (présent sur la liste) → page dédiée (#35)
    var addBtn = document.getElementById('btn-add-billet');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            window.location.href = 'admin-billet.html?new=1';
        });
    }

    // Bouton fermer le panel
    var closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeBilletPanel();
        });
    }

    // Clic sur l'overlay ferme le panel
    var overlay = document.getElementById('admin-panel-overlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            closeBilletPanel();
        });
    }

    // Story 9.2 — Toggle PrixVariante quand HasVariante change
    var hasVarianteSelect = document.getElementById('field-has-variante');
    if (hasVarianteSelect) {
        hasVarianteSelect.addEventListener('change', function() {
            togglePrixVarianteField();
        });
    }

    // Toggle prix normal quand VersionNormaleExiste change
    var cbVersionNormale = document.getElementById('field-version-normale');
    if (cbVersionNormale) {
        cbVersionNormale.addEventListener('change', function() {
            togglePrixVarianteField();
        });
    }

    // Story 9.3 — Mise à jour état des champs date quand catégorie change
    // Story 9.6 — Toggle prix fields quand catégorie change
    var categorieSelect = document.getElementById('field-categorie');
    if (categorieSelect) {
        categorieSelect.addEventListener('change', function() {
            var newCat = categorieSelect.value;
        });
    }

    // Auto-remplir le département avec le code ISO du pays sélectionné
    var paysSelect = document.getElementById('field-pays');
    if (paysSelect) {
        paysSelect.addEventListener('change', function() {
            var depField = document.getElementById('field-dep');
            if (!depField) return;
            var paysNom = paysSelect.value;
            var iso = paysIsoMap[paysNom];
            if (iso) {
                depField.value = iso + '-';
                depField.focus();
                // Placer le curseur après le tiret
                depField.setSelectionRange(depField.value.length, depField.value.length);
            }
        });
    }

    // Soumission du formulaire
    var form = document.getElementById('admin-billet-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!validateBilletForm()) return;

            var panel = document.getElementById('admin-panel');
            var billetData = collectFormData();

            // Demande #16 — Story 9.3 retirée d'ici : les dates suivent le statut
            // de la COLLECTE, pas celui du billet (colonnes DatePre/DateColl/
            // DateFin renommées *_deprecated en base).
            if (panel && panel.dataset.editId) {
                var editId = panel.dataset.editId;
                // Détecter un changement forcé de type (champs déverrouillés par l'admin)
                var forcedTypeChange = null;
                var cbNormaleEl = document.getElementById('field-version-normale');
                var hasVarianteEl2 = document.getElementById('field-has-variante');
                if (cbNormaleEl && cbNormaleEl.dataset.frozenValue !== undefined &&
                    hasVarianteEl2 && hasVarianteEl2.dataset.frozenValue !== undefined) {
                    var ancienNormale = cbNormaleEl.dataset.frozenValue === '1';
                    var ancienVariante = hasVarianteEl2.dataset.frozenValue || '';
                    var nouveauNormale = billetData.VersionNormaleExiste;
                    var nouveauVariante = billetData.HasVariante || '';
                    var ancienVarianteActive = ancienVariante && ancienVariante !== 'N';
                    var nouveauVarianteActive = nouveauVariante && nouveauVariante !== 'N';
                    if (ancienNormale !== nouveauNormale || ancienVariante !== nouveauVariante) {
                        var tc = {
                            supprimeNormale: ancienNormale && !nouveauNormale,
                            supprimeVariante: ancienVarianteActive && !nouveauVarianteActive,
                            ajouteNormale: !ancienNormale && nouveauNormale,
                            ajouteVariante: !ancienVarianteActive && nouveauVarianteActive
                        };
                        if (tc.supprimeNormale || tc.supprimeVariante || tc.ajouteNormale || tc.ajouteVariante) {
                            forcedTypeChange = tc;
                        }
                    }
                }
                updateBillet(editId, billetData, forcedTypeChange);
            } else {
                saveBillet(billetData);
            }
        });
    }

    // Story 2.5 — Delegation d'evenements sur la grille
    var cardsGrid = document.getElementById('admin-cards-grid');
    if (cardsGrid) {
        cardsGrid.addEventListener('click', function(event) {
            // Story 2.5 — Clic sur un chip de statut rapide
            var chip = event.target.closest('.status-chip');
            if (chip) {
                event.stopPropagation();
                handleQuickStatusChange(chip);
                return;
            }

            // Story 2.5 — Clic sur le badge de statut
            var badge = event.target.closest('.admin-badge-status.clickable');
            if (badge) {
                event.stopPropagation();
                handleBadgeClick(badge);
                return;
            }

            // Story 2.4 — Clic sur le bouton supprimer
            var deleteBtn = event.target.closest('.admin-card-delete-btn');
            if (deleteBtn) {
                event.stopPropagation();
                var docId = deleteBtn.getAttribute('data-doc-id');
                var billetName = deleteBtn.getAttribute('data-billet-name');
                if (docId && billetName) {
                    openDeleteModal(docId, billetName);
                }
                return;
            }

            // Story 2.3 / #35 — Clic sur « Modifier » → page dédiée d'édition
            var editBtn = event.target.closest('.admin-card-edit-btn');
            if (editBtn) {
                event.stopPropagation();
                var editDocId = editBtn.getAttribute('data-doc-id');
                if (editDocId) {
                    window.location.href = 'admin-billet.html?id=' + encodeURIComponent(editDocId);
                }
                return;
            }

            // Clic sur le bouton dupliquer
            var copyBtn = event.target.closest('.admin-card-copy-btn');
            if (copyBtn) {
                event.stopPropagation();
                var copyDocId = copyBtn.getAttribute('data-doc-id');
                if (copyDocId) {
                    var billetCopyData = findBilletById(copyDocId);
                    if (billetCopyData) {
                        copyBillet(billetCopyData);
                    }
                }
                return;
            }
        });
    }

    // Story 2.5 — Fermer les popups au clic en dehors
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.quick-status-popup') && !event.target.closest('.admin-badge-status')) {
            closeAllStatusPopups();
        }
    });

    // Story 2.5 — Fermer les popups avec Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAllStatusPopups();
        }
    });

    // Story 12.3 — Délégation sur la liste des collectes (clôture)
    var collectesList = document.getElementById('collectes-list');
    if (collectesList) {
        collectesList.addEventListener('click', function(e) {
            // Demande #38 — modifier une collecte
            var btnModifier = e.target.closest('.btn-modifier-collecte');
            if (btnModifier) {
                editerCollecte(btnModifier.dataset.collecteId);
                return;
            }
            var btnCloturer = e.target.closest('.btn-cloturer-collecte');
            if (btnCloturer) {
                cloturerCollecte(btnCloturer.dataset.collecteId, btnCloturer.dataset.billetId);
                return;
            }
            var btnSupprimer = e.target.closest('.btn-supprimer-collecte');
            if (btnSupprimer) {
                supprimerPreCollecte(btnSupprimer.dataset.collecteId, btnSupprimer.dataset.billetId, btnSupprimer.dataset.collecteNom);
            }
        });
    }

    // Demande #16 — le statut et le scope de la collecte pilotent l'affichage
    // et la saisissabilité des champs prix.
    ['field-collecte-categorie', 'field-collecte-scope'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', toggleCollectePrixFields);
    });

    // Story 12.3 — Bouton ajouter une collecte
    var btnAddCollecte = document.getElementById('btn-add-collecte');
    if (btnAddCollecte) {
        btnAddCollecte.addEventListener('click', function() {
            var section = document.getElementById('admin-collectes-supplementaires');
            if (!section) return;
            var billetId = section.dataset.billetId;
            if (!billetId) return;
            if (!validateCollecteForm()) return;
            // Demande #38 — même formulaire : PATCH si on édite, POST sinon.
            if (editingCollecteId) {
                modifierCollecte(editingCollecteId, billetId);
            } else {
                saveCollecte(billetId);
            }
        });
    }

    // Demande #38 — annuler l'édition d'une collecte (retour au mode ajout)
    var btnCancelEditCollecte = document.getElementById('btn-cancel-edit-collecte');
    if (btnCancelEditCollecte) {
        btnCancelEditCollecte.addEventListener('click', function() {
            sortirEditionCollecte();
        });
    }

    // Pagination — event delegation
    var paginationContainer = document.getElementById('admin-pagination');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', function(event) {
            var btn = event.target.closest('.admin-pagination-btn');
            if (!btn || btn.disabled) return;
            var page = parseInt(btn.getAttribute('data-page'), 10);
            if (isNaN(page) || page < 1 || page === currentPage) return;
            var source = getDisplayedBillets();
            var maxPage = Math.ceil(source.length / PAGE_SIZE);
            if (page > maxPage) return;
            currentPage = page;
            renderAdminCards();
            // Scroll vers le haut de la grille
            var grid = document.getElementById('admin-cards-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

// Trouver un billet par son ID dans le tableau en memoire
function findBilletById(docId) {
    for (var i = 0; i < adminBillets.length; i++) {
        if (String(adminBillets[i]._id) === String(docId)) {
            return adminBillets[i];
        }
    }
    return null;
}

// --- Ouverture du panel (mode ajout ou edition) ---
// Story 2.2 (ajout) + Story 2.3 (edition)
function openBilletPanel(billetData, docId) {
    var panel = document.getElementById('admin-panel');
    if (!panel) return;
    var overlay = document.getElementById('admin-panel-overlay');
    var form = document.getElementById('admin-billet-form');
    var title = document.getElementById('panel-title');
    var saveBtn = document.getElementById('panel-save-btn');

    // Reinitialiser le formulaire
    if (form) form.reset();

    // Nettoyer les erreurs de validation
    clearValidationErrors();

    // Reactiver le bouton de sauvegarde
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Sauvegarder';
    }

    // Story 5.2 — Reset des champs Google et du gel collecteur
    resetGoogleFields();
    resetCollecteurFreeze();

    // Reset prévisualisation image
    clearImageUpload();

    if (billetData && docId) {
        // --- Mode edition (Story 2.3) ---
        panel.dataset.editId = docId;
        if (title) title.textContent = 'Modifier le billet';
        if (saveBtn) saveBtn.textContent = 'Enregistrer les modifications';
        panel.setAttribute('aria-label', 'Modifier le billet');

        // Story 4.4 — Millesime en mode edition (2015 a N+1)
        populateMillesimeSelect('edit');

        // Pre-remplir tous les champs
        prefillForm(billetData);

        // Story 12.3 — Section collectes supplémentaires (mode edition uniquement)
        var sectionCollectes = document.getElementById('admin-collectes-supplementaires');
        if (sectionCollectes) {
            sectionCollectes.style.display = '';
            sectionCollectes.dataset.billetId = billetData.id || '';
            loadCollectesForBillet(billetData.id);
            var elDatePre = document.getElementById('field-collecte-date-pre');
            if (elDatePre) elDatePre.value = new Date().toISOString().slice(0, 10);
        }
        // Demande #16 — le collecteur se choisit sur chaque collecte (plus de défaut
        // repris du billet, billets.Collecteur supprimé).
        populateCollecteCollecteurSelect();

        // Story 5.2 — Gestion des champs Google en mode edition
        var hasGoogleData = (billetData.LinkSheet && billetData.LinkSheet !== '') ||
                            (billetData.Sondage && billetData.Sondage !== '');

        document.querySelectorAll('[data-google-field="true"]').forEach(function(group) {
            if (hasGoogleData) {
                group.style.display = '';
                var input = group.querySelector('input');
                if (input) {
                    input.setAttribute('readonly', 'readonly');
                    input.classList.add('admin-field-readonly');
                    // Bouton supprimer le lien Google
                    if (input.value && !group.querySelector('.btn-clear-google')) {
                        var wrapper = document.createElement('div');
                        wrapper.className = 'google-field-wrapper';
                        input.parentNode.insertBefore(wrapper, input);
                        wrapper.appendChild(input);
                        var clearBtn = document.createElement('button');
                        clearBtn.type = 'button';
                        clearBtn.className = 'btn-clear-google';
                        clearBtn.title = 'Supprimer ce lien';
                        clearBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                        clearBtn.onclick = function() {
                            input.value = '';
                            input.removeAttribute('readonly');
                            input.classList.remove('admin-field-readonly');
                            clearBtn.remove();
                        };
                        wrapper.appendChild(clearBtn);
                    }
                }
                var label = group.querySelector('label');
                if (label && !label.querySelector('.badge-ancien-systeme')) {
                    var badge = document.createElement('span');
                    badge.className = 'badge-ancien-systeme';
                    badge.textContent = 'Ancien système';
                    label.appendChild(badge);
                }
            } else {
                group.style.display = 'none';
            }
        });

        // Story 5.2 — Gel du type de billet si des inscriptions existent.
        // Demande #16 — le gel du collecteur a disparu (le collecteur n'est plus un
        // champ du billet ; il est sur la collecte).
        if (docId) {
            hasInscriptions(docId).then(function(frozen) {
                if (frozen) {
                    // Gel de VersionNormaleExiste
                    var cbNormale = document.getElementById('field-version-normale');
                    if (cbNormale) {
                        cbNormale.disabled = true;
                        cbNormale.classList.add('admin-field-frozen');
                        cbNormale.dataset.frozenValue = cbNormale.checked ? '1' : '0';
                    }
                    // Gel de HasVariante
                    var hasVarianteEl = document.getElementById('field-has-variante');
                    if (hasVarianteEl) {
                        hasVarianteEl.disabled = true;
                        hasVarianteEl.classList.add('admin-field-frozen');
                        hasVarianteEl.dataset.frozenValue = hasVarianteEl.value || '';
                    }
                    // Message d'avertissement sur la section Type, avec lien de déverrouillage admin
                    var typeLegend = cbNormale && cbNormale.closest('fieldset');
                    if (typeLegend && !typeLegend.querySelector('.type-frozen-hint')) {
                        var typeHint = document.createElement('small');
                        typeHint.className = 'type-frozen-hint';
                        typeHint.textContent = 'Type figé — des inscriptions existent pour ce billet. ';
                        var unlockLink = document.createElement('a');
                        unlockLink.href = '#';
                        unlockLink.className = 'type-frozen-unlock';
                        unlockLink.textContent = 'Modifier quand même';
                        (function(hint, cbN, hvEl) {
                            unlockLink.addEventListener('click', function(e) {
                                e.preventDefault();
                                var varianteActive = hvEl && hvEl.value && hvEl.value !== 'N';
                                var msg = 'Attention : modifier le type du billet peut supprimer des inscriptions existantes.\n\n';
                                if (cbN && cbN.checked) msg += '• Si vous décochez "Version normale", les inscriptions normales seront supprimées.\n';
                                if (varianteActive) msg += '• Si vous passez à "Pas de variante", les inscriptions variante seront supprimées.\n';
                                msg += '\nContinuer ?';
                                if (!confirm(msg)) return;
                                if (cbN) { cbN.disabled = false; cbN.classList.remove('admin-field-frozen'); }
                                if (hvEl) { hvEl.disabled = false; hvEl.classList.remove('admin-field-frozen'); }
                                hint.remove();
                            });
                        })(typeHint, cbNormale, hasVarianteEl);
                        typeHint.appendChild(unlockLink);
                        typeLegend.appendChild(typeHint);
                    }
                }
            });
        }
    } else {
        // --- Mode ajout (Story 2.2) ---
        delete panel.dataset.editId;
        if (title) title.textContent = 'Ajouter un billet';

        // Story 12.3 — Masquer la section collectes en mode création (le billet
        // n'existe pas encore ; la pré-collecte s'enchaîne juste après, B6)
        var sectionCollectes = document.getElementById('admin-collectes-supplementaires');
        if (sectionCollectes) sectionCollectes.style.display = 'none';
        // Demande #16 — un billet neuf n'a aucune collecte : statut manuel
        currentBilletCollectes = [];
        refreshStatutBilletUI();
        if (saveBtn) saveBtn.textContent = 'Sauvegarder';
        panel.setAttribute('aria-label', 'Ajouter un billet');

        // Story 4.4 — Millesime en mode creation (N-3 a N+1, defaut N)
        populateMillesimeSelect('create');

        // Statut par defaut
        var categorieField = document.getElementById('field-categorie');
        if (categorieField) categorieField.value = CATEGORIE_DEFAULT;

        // Auto-remplir la date de pré-collecte pour un nouveau billet

        // Story 9.6 — Bloquer les champs prix selon le statut par défaut

        // Story 5.2 — Masquer les champs Google en mode ajout
        document.querySelectorAll('[data-google-field="true"]').forEach(function(group) {
            group.style.display = 'none';
        });
    }

    // Ouvrir le panel
    panel.classList.add('open');
    // Demande #16 (#35) — sur la page dédiée, le panneau EST la page : pas de
    // verrou de scroll ni d'overlay ni de focus trap (le CSS le rend statique).
    if (!IS_BILLET_PAGE) {
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        initFocusTrap(panel);
    }

    // Focus sur le premier champ
    var firstInput = document.getElementById('field-nom-billet');
    if (firstInput) {
        setTimeout(function() { firstInput.focus(); }, 350);
    }
}

// Dupliquer un billet — ouvre le panel en mode ajout avec les données copiées
function copyBillet(billetData) {
    // Copier les données sans l'id, les dates et les champs Google
    var copy = {};
    for (var key in billetData) {
        if (billetData.hasOwnProperty(key)) {
            copy[key] = billetData[key];
        }
    }
    delete copy._id;
    delete copy.id;
    delete copy.DatePre;
    delete copy.DateColl;
    delete copy.DateFin;
    delete copy.Sondage;
    delete copy.LinkSondage;
    delete copy.LinkSheet;
    delete copy.LinkFB;
    delete copy.Commentaire;
    delete copy.Collecteur;
    delete copy.ImageUrl;
    delete copy.ImageId;
    copy.NomBillet = (copy.NomBillet || '') + ' (copie)';
    copy.Categorie = CATEGORIE_DEFAULT;

    // Demande #16 (#35) — la duplication se fait sur la PAGE dédiée : on stashe la
    // copie (objet en mémoire, non passable par l'URL) et on y navigue.
    try { sessionStorage.setItem('bt_billet_dup', JSON.stringify(copy)); } catch (e) {}
    window.location.href = 'admin-billet.html?dup=1';
}

// Story 2.3 — Pre-remplir le formulaire avec les donnees du billet
function prefillForm(data) {
    var fields = {
        'field-nom-billet': 'NomBillet',
        'field-ville': 'Ville',
        'field-reference': 'Reference',
        'field-millesime': 'Millesime',
        'field-version': 'Version',
        'field-has-variante': 'HasVariante',
        'field-dep': 'Dep',
        'field-cp': 'Cp',
        'field-pays': 'Pays',
        'field-categorie': 'Categorie',
        'field-theme': 'Theme',
        // Demande #16 — prix, prix variante, FDP et dates ne sont plus des champs
        // du billet : ils se saisissent sur la collecte (formulaire plus bas).
        'field-image-url': 'ImageUrl',
        'field-image-id': 'ImageId',
        'field-sondage': 'Sondage',
        'field-link-sondage': 'LinkSondage',
        'field-link-sheet': 'LinkSheet',
        'field-link-fb': 'LinkFB'
    };

    for (var fieldId in fields) {
        var el = document.getElementById(fieldId);
        if (el) el.value = data[fields[fieldId]] || '';
    }

    // Commentaire (textarea)
    var commentaireEl = document.getElementById('field-commentaire');
    if (commentaireEl) commentaireEl.value = data.Commentaire || '';

    // Story 4.3 — Pays select : ajouter l'option si elle n'existe pas
    var paysSelect = document.getElementById('field-pays');
    var paysValue = data.Pays || '';
    if (paysSelect && paysValue) {
        var paysOptionExists = Array.prototype.some.call(paysSelect.options, function(opt) {
            return opt.value === paysValue;
        });
        if (!paysOptionExists) {
            var newPaysOption = document.createElement('option');
            newPaysOption.value = paysValue;
            newPaysOption.textContent = paysValue + ' (ancien)';
            paysSelect.appendChild(newPaysOption);
        }
        paysSelect.value = paysValue;
    }

    // Story 4.4 — Millesime select : ajouter l'option si elle n'existe pas
    var millesimeSelect = document.getElementById('field-millesime');
    var millesimeValue = String(data.Millesime || '');
    if (millesimeSelect && millesimeValue) {
        var millesimeOptionExists = Array.prototype.some.call(millesimeSelect.options, function(opt) {
            return opt.value === millesimeValue;
        });
        if (!millesimeOptionExists) {
            var newMillesimeOption = document.createElement('option');
            newMillesimeOption.value = millesimeValue;
            newMillesimeOption.textContent = millesimeValue;
            millesimeSelect.appendChild(newMillesimeOption);
        }
        millesimeSelect.value = millesimeValue;
    }

    // Demande #16 — plus de select Collecteur sur le formulaire billet (le
    // collecteur est un champ de la collecte).

    // Statut — demande #16 : dérivé si le billet porte des collectes, manuel sinon.
    // L'état réel du select est posé par refreshStatutBilletUI() une fois les
    // collectes chargées ; ici on se contente d'afficher la valeur courante.
    var categorie = data.Categorie || CATEGORIE_DEFAULT;
    var categorieField = document.getElementById('field-categorie');
    if (categorieField) {
        if (categorie && !STATUTS_MANUELS.some(function(s) { return s === categorie; })) {
            // Statut dérivé (Pré collecte / Collecte / Terminé) : pas dans la liste
            // des options manuelles, on l'ajoute en lecture seule pour l'afficher.
            var opt = categorieField.querySelector('option[data-derive="1"]');
            if (!opt) {
                opt = document.createElement('option');
                opt.setAttribute('data-derive', '1');
                categorieField.appendChild(opt);
            }
            opt.value = categorie;
            opt.textContent = categorie + ' (dérivé des collectes)';
        }
        categorieField.value = categorie;
    }

    // Checkbox "Normale" — Story 9.9
    var cbNormale = document.getElementById('field-version-normale');
    if (cbNormale) {
        cbNormale.checked = data.VersionNormaleExiste !== false;
    }

    // Story 9.2 — Affichage conditionnel du champ PrixVariante
    togglePrixVarianteField();

    // Story 9.3 — Activer/désactiver les champs date selon le statut

    // Story 9.6 — Bloquer les champs prix en Pré-collecte

    // Prévisualisation image — priorité ImageUrl > ImageId (Google Drive)
    var imgUrl = data.ImageUrl || '';
    var imgId = data.ImageId || '';

    // Afficher le champ ImageId legacy uniquement si le billet en a un
    var groupImageId = document.getElementById('group-image-id');
    if (groupImageId) {
        if (imgId) {
            groupImageId.classList.remove('hidden');
        } else {
            groupImageId.classList.add('hidden');
        }
    }

    if (imgUrl) {
        var previewEl = document.getElementById('image-preview');
        var placeholderEl = document.getElementById('image-upload-placeholder');
        var removeBtnEl = document.getElementById('btn-image-remove');
        if (previewEl) {
            previewEl.src = imgUrl;
            previewEl.classList.remove('hidden');
        }
        if (placeholderEl) placeholderEl.classList.add('hidden');
        if (removeBtnEl) removeBtnEl.classList.remove('hidden');
    } else if (imgId) {
        var safeId = imgId.replace(/[^a-zA-Z0-9_-]/g, '');
        var driveUrl = 'https://drive.google.com/thumbnail?id=' + safeId + '&sz=w400';
        var previewEl2 = document.getElementById('image-preview');
        var placeholderEl2 = document.getElementById('image-upload-placeholder');
        var removeBtnEl2 = document.getElementById('btn-image-remove');
        if (previewEl2) {
            previewEl2.src = driveUrl;
            previewEl2.classList.remove('hidden');
        }
        if (placeholderEl2) placeholderEl2.classList.add('hidden');
        if (removeBtnEl2) removeBtnEl2.classList.remove('hidden');
    } else {
        clearImageUpload();
    }
}

// --- Story 9.9 — Affichage conditionnel des champs Prix / PrixVariante ---
// Demande #16 — l'affichage conditionnel des prix a migré dans
// toggleCollectePrixFields() (piloté par le scope de la collecte). Il ne reste
// ici que la remise à zéro de l'erreur de validation croisée normale/variante.
function togglePrixVarianteField() {
    var errorVariante = document.getElementById('error-has-variante');
    if (errorVariante) errorVariante.textContent = '';
}
// --- Fermeture du panel ---
// Demande #16 (B6) / demande #31 — après création d'un billet, sa pré-collecte est
// créée DIRECTEMENT : scope déduit des versions déclarées, pas de prix (on est en
// pré-collecte), collecteur repris du billet s'il a été saisi (facultatif). C'est
// elle qui déclenche les auto-inscriptions et donne son statut « Pré collecte » au
// billet. Si le billet ne doit pas être collecté, on supprime la pré-collecte
// ensuite (bouton « Supprimer la pré-collecte »).
function creerPreCollecteAuto(billet) {
    var aVariante = !!(billet.HasVariante && billet.HasVariante !== 'N');
    var aNormale = billet.VersionNormaleExiste !== false && billet.VersionNormaleExiste !== 'false';
    var body = {
        billet_id: billet.id,
        nom: 'Collecte ' + (billet.Millesime || new Date().getFullYear()),
        scope: aVariante ? (aNormale ? 'les_deux' : 'variante') : 'normal',
        categorie: 'Pré collecte',
        // Demande #16 (bascule collecteur) — pré-collecte sans collecteur : il se
        // règle sur la collecte quand elle passe en Collecte (facultatif en pré-collecte).
        collecteur: null,
        date_pre: new Date().toISOString().slice(0, 10)
    };
    supabaseFetch('/rest/v1/collectes', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(body)
    })
    .then(function(data) {
        var col = Array.isArray(data) ? data[0] : data;
        showToast('Billet créé avec sa pré-collecte', 'success');
        if (col && col.id) creerAutoInscriptions(billet, col);
        // Demande #16 (#35) — sur la page dédiée, on reste sur le billet fraîchement
        // créé (en édition) pour configurer sa collecte ; sinon (drawer) on ferme.
        if (IS_BILLET_PAGE) {
            window.location.href = 'admin-billet.html?id=' + billet.id;
            return;
        }
        closeBilletPanel();
        loadAdminBillets();
        loadAdminCollectes();
    })
    .catch(function(error) {
        console.error('Erreur création pré-collecte auto:', error);
        showToast('Billet créé, mais échec de la pré-collecte : ' + error.message, 'error');
        loadAdminBillets();
        closeBilletPanel();
    });
}

function closeBilletPanel() {
    // Demande #16 (#35) — sur la page dédiée, « fermer » = revenir à la liste
    if (IS_BILLET_PAGE) { window.location.href = 'admin.html'; return; }
    var panel = document.getElementById('admin-panel');
    if (!panel) return;
    var overlay = document.getElementById('admin-panel-overlay');

    panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';

    // Nettoyer le mode edition
    delete panel.dataset.editId;

    // Retirer le focus trap
    destroyFocusTrap();

    // Remettre le focus sur le bouton d'ajout
    var addBtn = document.getElementById('btn-add-billet');
    if (addBtn) addBtn.focus();
}

// ============================================================
// 7. STORY 2.2 — FOCUS TRAP & ESCAPE
// ============================================================

function initFocusTrap(panelElement) {
    destroyFocusTrap();

    focusTrapHandler = function(e) {
        if (e.key !== 'Tab') return;

        var focusableElements = panelElement.querySelectorAll(
            'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        var firstEl = focusableElements[0];
        var lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            }
        } else {
            if (document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        }
    };

    escapeHandler = function(e) {
        if (e.key === 'Escape') {
            var panel = document.getElementById('admin-panel');
            if (panel && panel.classList.contains('open')) {
                e.preventDefault();
                closeBilletPanel();
            }
        }
    };

    document.addEventListener('keydown', focusTrapHandler);
    document.addEventListener('keydown', escapeHandler);
}

function destroyFocusTrap() {
    if (focusTrapHandler) {
        document.removeEventListener('keydown', focusTrapHandler);
        focusTrapHandler = null;
    }
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }
}

// ============================================================
// 8. (Section supprimee — les chips statut sont remplaces par un select)
// ============================================================

// ============================================================
// 9. STORY 2.2 — VALIDATION DU FORMULAIRE
// ============================================================

function clearValidationErrors() {
    var errorGroups = document.querySelectorAll('.admin-form-group.has-error');
    errorGroups.forEach(function(group) {
        group.classList.remove('has-error');
    });
    var errorMsgs = document.querySelectorAll('.admin-form-error');
    errorMsgs.forEach(function(msg) {
        msg.textContent = '';
    });
}

function setFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    var group = field.closest('.admin-form-group');
    if (group) group.classList.add('has-error');
    var errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = message;
}

function validateBilletForm() {
    clearValidationErrors();
    var valid = true;
    var firstErrorField = null;

    var nomBillet = document.getElementById('field-nom-billet');
    if (nomBillet && nomBillet.value.trim() === '') {
        setFieldError('field-nom-billet', 'error-nom-billet', 'Le champ Nom est requis');
        valid = false;
        if (!firstErrorField) firstErrorField = nomBillet;
    }

    var reference = document.getElementById('field-reference');
    if (reference && reference.value.trim() === '') {
        setFieldError('field-reference', 'error-reference', 'Le champ Reference est requis');
        valid = false;
        if (!firstErrorField) firstErrorField = reference;
    }

    var version = document.getElementById('field-version');
    if (version && version.value.trim() === '') {
        setFieldError('field-version', 'error-version', 'Le champ Version est requis');
        valid = false;
        if (!firstErrorField) firstErrorField = version;
    }

    // Demande #16 — les règles « au moins une date », « prix obligatoire en
    // Collecte » et « prix variante obligatoire » ont migré dans
    // validateCollecteForm() : dates et prix sont des propriétés de la collecte.
    // Les garder ici rendait le formulaire billet insauvegardable (les champs
    // n'existent plus, la date manquante bloquait toute création).

    // Demande #16 (bascule collecteur) — le collecteur n'est plus un champ du billet ;
    // il est validé sur le formulaire COLLECTE (obligatoire au statut Collecte,
    // cf. validateCollecteForm).

    // Story 9.9 — Validation croisee : au moins un type (normale ou variante)
    var cbNormale = document.getElementById('field-version-normale');
    var hasVariante = document.getElementById('field-has-variante');
    if (cbNormale && hasVariante) {
        var normaleActive = cbNormale.checked;
        var varianteVal = hasVariante.value;
        var varianteActive = varianteVal && varianteVal !== 'N';
        if (!normaleActive && !varianteActive) {
            setFieldError('field-has-variante', 'error-has-variante', 'Un billet doit avoir au moins un type (normal ou variante)');
            valid = false;
            if (!firstErrorField) firstErrorField = hasVariante;
        }
    }

    // Demande #16 — Story 9.2 (validation du prix variante) déplacée dans
    // validateCollecteForm() : le prix appartient à la collecte.

    if (!valid && firstErrorField) {
        firstErrorField.focus();
    }

    return valid;
}

// ============================================================
// 10. STORY 2.2 — COLLECTE DES DONNEES DU FORMULAIRE
// ============================================================

function collectFormData() {
    var getValue = function(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    var panel = document.getElementById('admin-panel');
    var billetData = {
        NomBillet: getValue('field-nom-billet'),
        Ville: getValue('field-ville'),
        Reference: getValue('field-reference'),
        Millesime: getValue('field-millesime'),
        Version: getValue('field-version'),
        HasVariante: getValue('field-has-variante') || null,
        VersionNormaleExiste: (function() {
            var cb = document.getElementById('field-version-normale');
            return cb ? cb.checked : true;
        })(),
        Dep: getValue('field-dep'),
        Cp: getValue('field-cp'),
        Pays: getValue('field-pays'),
        Theme: getValue('field-theme'),
        // Demande #16 — Collecteur (bascule) + Prix / PrixVariante / PayerFDP /
        // FDP_Com / DatePre / DateColl / DateFin ne sont plus écrits ici : ils
        // appartiennent à la collecte (colonnes billet supprimées / *_deprecated).
        ImageUrl: getValue('field-image-url'),
        ImageId: getValue('field-image-id'),
        // Story 5.2 — Ne collecter les champs Google que si le panel est en mode edition
        Sondage: panel && panel.dataset.editId ? getValue('field-sondage') : '',
        LinkSondage: panel && panel.dataset.editId ? getValue('field-link-sondage') : '',
        LinkSheet: panel && panel.dataset.editId ? getValue('field-link-sheet') : '',
        LinkFB: getValue('field-link-fb'),
        Commentaire: getValue('field-commentaire')
    };

    // Demande #16 — Categorie n'est envoyée QUE si elle est encore saisissable,
    // c'est-à-dire si le billet n'a aucune collecte. Sinon elle est dérivée et
    // la base refuse l'écriture (même valeur inchangée : autant ne pas l'envoyer).
    var statutSaisi = getValue('field-categorie');
    if (billetAucuneCollecte() && STATUTS_MANUELS.indexOf(statutSaisi) !== -1) {
        billetData.Categorie = statutSaisi;
    }

    // Champ Recherche (concatenation des champs cles en minuscules)
    // DV2-4 — le statut n'y figure plus : il change désormais sans passer par le
    // front (dérivation par trigger), la valeur serait périmée. Le filtre de
    // statut du catalogue lit Categorie directement.
    billetData.Recherche = [
        billetData.NomBillet,
        billetData.Ville,
        billetData.Reference,
        billetData.Millesime,
        billetData.Dep,
        billetData.Pays,
        billetData.Theme
    ].join(' ').toLowerCase();

    return billetData;
}

// ============================================================
// 11. STORY 2.2 — SOUMISSION (AJOUT)
// ============================================================

function saveBillet(billetData) {
    var saveBtn = document.getElementById('panel-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enregistrement...';
    }

    supabaseFetch('/rest/v1/billets', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(billetData)
    })
        .then(function(data) {
            var newBillet = Array.isArray(data) ? data[0] : data;
            // Demande #16 (B6/Q2bis) — le flux nominal enchaîne sur la création
            // d'une pré-collecte : sans collecte, le billet reste en « Pas de
            // collecte » et aucune pré-inscription n'est générée (le hook
            // d'auto-inscription vit maintenant dans saveCollecte).
            // Demande #16 / demande #31 — flux nominal : la pré-collecte est créée
            // DIRECTEMENT, sans étape manuelle. Sauf si l'admin a explicitement
            // choisi un statut « sans collecte » (Masqué / Jamais édité, projet).
            var sansCollecte = newBillet && (newBillet.Categorie === 'Masqué' || newBillet.Categorie === 'Jamais édité, projet');
            if (newBillet && newBillet.id && !sansCollecte) {
                creerPreCollecteAuto(newBillet);
            } else {
                showToast('Billet créé', 'success');
                loadAdminBillets();
                closeBilletPanel();
            }
        })
        .catch(function(error) {
            showToast('Erreur lors de l\'ajout : ' + error.message, 'error');
            console.error('Erreur ajout billet:', error);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Sauvegarder';
            }
        });
}

// ============================================================
// 11b. AUTO-INSCRIPTIONS À LA CRÉATION D'UN BILLET
// ============================================================

// Charge la liste des emails bloqués par un admin (membre_blocages).
// Ces membres sont exclus des auto-inscriptions (y compris pré-collecte).
function chargerEmailsBloques() {
    return supabaseFetch('/rest/v1/membre_blocages?select=membre_email')
        .then(function(data) {
            var map = {};
            (data || []).forEach(function(b) { map[b.membre_email] = true; });
            return map;
        })
        .catch(function(err) {
            console.warn('Erreur chargement membres bloqués:', err);
            return {};
        });
}

// Demande #16 (D5/B1) — le hook se déclenche désormais à la création d'une
// COLLECTE, plus à celle du billet : une inscription doit porter un collecte_id
// (NOT NULL). Le scope de la collecte sert de masque sur nb_normaux/nb_variantes.
function creerAutoInscriptions(billet, collecte) {
    var isFrance = !billet.Pays || billet.Pays === 'France';
    var annee = parseInt(billet.Millesime) || new Date().getFullYear();
    var scope = (collecte && collecte.scope) || 'normal';
    // Le masque de scope prime sur ce que déclare le billet : une collecte
    // « variante » n'ouvre jamais la version normale, même si elle existe.
    var hasNormale = (scope !== 'variante')
        && billet.VersionNormaleExiste !== false && billet.VersionNormaleExiste !== 'false';
    var hasVariante = (scope !== 'normal') && !!billet.HasVariante;

    // Charger les paramétrages pour cette année + les membres bloqués
    // + (N1) les membres déjà inscrits sur une autre collecte recouvrante du billet
    Promise.all([
        supabaseFetch('/rest/v1/inscriptions_auto?annee=eq.' + annee + '&select=*'),
        chargerEmailsBloques(),
        chargerDejaInscrits(billet.id, collecte)
    ])
        .then(function(res) {
            var autoData = res[0];
            var emailsBloques = res[1] || {};
            var dejaInscrits = res[2] || {};
            if (!autoData || autoData.length === 0) return;

            // Filtrer selon type de billet, en excluant les membres bloqués et
            // (N1) ceux déjà inscrits sur une collecte au périmètre recouvrant.
            function eligible(a) {
                return !emailsBloques[a.membre_email] && !dejaInscrits[a.membre_email];
            }
            var qualifies;
            if (isFrance) {
                qualifies = autoData.filter(function(a) { return a.france && eligible(a); });
            } else {
                qualifies = autoData.filter(function(a) { return a.etranger && eligible(a); });
            }

            if (qualifies.length === 0) return;

            if (isFrance) {
                // Billet FR : on a toutes les infos, créer les inscriptions
                creerAutoInscriptionsBatch(billet, collecte, qualifies, [], isFrance, hasNormale, hasVariante);
            } else {
                // Billet étranger : charger les sélections pays pour vérifier la sélection fine
                supabaseFetch('/rest/v1/inscriptions_auto_pays?annee=eq.' + annee + '&select=*')
                    .then(function(paysData) {
                        creerAutoInscriptionsBatch(billet, collecte, qualifies, paysData || [], isFrance, hasNormale, hasVariante);
                    })
                    .catch(function(err) {
                        console.warn('Erreur chargement pays auto-inscriptions:', err);
                    });
            }
        })
        .catch(function(err) {
            console.warn('Erreur auto-inscriptions:', err);
        });
}

// N1 — anti-réinscription automatique. La nouvelle UK (collecte_id, membre_email)
// autorise volontairement un membre sur plusieurs collectes d'un même billet
// (reliquat, rachat : inscriptions manuelles). Le hook automatique, lui, ne doit
// jamais réinscrire quelqu'un dont une inscription couvre déjà la même version.
// Recouvrement : normal ∩ {normal, les_deux}, variante ∩ {variante, les_deux},
// les_deux ∩ tout. Désinscription = DELETE physique (AUD-N6), donc « déjà
// inscrit » se résume à « la ligne existe ».
function scopesSeRecouvrent(a, b) {
    if (!a || !b) return false;
    if (a === 'les_deux' || b === 'les_deux') return true;
    return a === b;
}

function chargerDejaInscrits(billetId, collecte) {
    var scopeNouvelle = (collecte && collecte.scope) || 'normal';
    var nouvelleId = collecte && collecte.id;
    return supabaseFetch('/rest/v1/inscriptions?billet_id=eq.' + billetId + '&select=membre_email,collecte_id')
        .then(function(inscriptions) {
            var autresIds = {};
            (inscriptions || []).forEach(function(i) {
                if (i.collecte_id && i.collecte_id !== nouvelleId) autresIds[i.collecte_id] = true;
            });
            var ids = Object.keys(autresIds);
            if (ids.length === 0) return {};
            return supabaseFetch('/rest/v1/collectes?id=in.(' + ids.join(',') + ')&select=id,scope')
                .then(function(collectes) {
                    var scopeParCollecte = {};
                    (collectes || []).forEach(function(c) { scopeParCollecte[c.id] = c.scope; });
                    var dejaInscrits = {};
                    (inscriptions || []).forEach(function(i) {
                        if (!i.collecte_id || i.collecte_id === nouvelleId) return;
                        if (scopesSeRecouvrent(scopeParCollecte[i.collecte_id], scopeNouvelle)) {
                            dejaInscrits[i.membre_email] = true;
                        }
                    });
                    return dejaInscrits;
                });
        })
        .catch(function(err) {
            console.warn('Erreur chargement des inscriptions existantes (N1):', err);
            return {};
        });
}

function creerAutoInscriptionsBatch(billet, collecte, qualifies, paysData, isFrance, hasNormale, hasVariante) {
    var inscriptions = [];

    for (var i = 0; i < qualifies.length; i++) {
        var auto = qualifies[i];
        var nbNormaux = 0;
        var nbVariantes = 0;

        if (isFrance) {
            nbNormaux = hasNormale ? auto.nb_normaux_fr : 0;
            nbVariantes = hasVariante ? auto.nb_variantes_fr : 0;
        } else {
            // Vérifier si le membre a des lignes pays spécifiques
            var membrePays = paysData.filter(function(p) {
                return p.membre_email === auto.membre_email && p.annee === auto.annee;
            });

            if (membrePays.length > 0) {
                // Mode sélection fine : chercher le pays spécifique
                var paysMatch = null;
                for (var mp = 0; mp < membrePays.length; mp++) {
                    if (membrePays[mp].pays_nom === billet.Pays) {
                        paysMatch = membrePays[mp];
                        break;
                    }
                }
                if (!paysMatch) continue; // pas de match pour ce pays → pas d'inscription
                nbNormaux = hasNormale ? paysMatch.nb_normaux : 0;
                nbVariantes = hasVariante ? paysMatch.nb_variantes : 0;
            } else {
                // Mode global : tous les pays étrangers
                nbNormaux = hasNormale ? auto.nb_normaux_etr_defaut : 0;
                nbVariantes = hasVariante ? auto.nb_variantes_etr_defaut : 0;
            }
        }

        if (nbNormaux + nbVariantes === 0) continue;

        // Construire adresse_snapshot depuis adminMembresCache
        var adresseSnapshot = {};
        var membreTrouve = false;
        if (adminMembresCache) {
            for (var m = 0; m < adminMembresCache.length; m++) {
                if (adminMembresCache[m].email === auto.membre_email) {
                    var membre = adminMembresCache[m];
                    adresseSnapshot = {
                        nom: membre.nom || '',
                        prenom: membre.prenom || '',
                        rue: membre.rue || '',
                        code_postal: membre.code_postal || '',
                        ville: membre.ville || '',
                        pays: membre.pays || ''
                    };
                    membreTrouve = true;
                    break;
                }
            }
        }
        if (!membreTrouve) {
            console.warn('Auto-inscription: membre non trouvé dans le cache pour ' + auto.membre_email + ', adresse_snapshot vide');
        }

        inscriptions.push({
            billet_id: billet.id,
            collecte_id: collecte.id,
            membre_email: auto.membre_email,
            nb_normaux: nbNormaux,
            nb_variantes: nbVariantes,
            mode_paiement: auto.mode_paiement,
            mode_envoi: auto.mode_envoi,
            commentaire: '',
            adresse_snapshot: adresseSnapshot,
            statut_paiement: 'non_paye',
            envoye: false,
            fdp_regles: false,
            pas_interesse: false,
            changed_by: 'pré-inscription'
        });
    }

    if (inscriptions.length === 0) return;

    // POST batch (Supabase accepte un array)
    // Demande #16 — cible de conflit alignée sur la nouvelle UK (corrige FR31)
    supabaseFetch('/rest/v1/inscriptions?on_conflict=collecte_id,membre_email', {
        method: 'POST',
        body: JSON.stringify(inscriptions),
        headers: { 'Prefer': 'return=minimal, resolution=ignore-duplicates' }
    })
    .then(function() {
        showToast(inscriptions.length + ' membre(s) pré-inscrit(s) automatiquement', 'info');
    })
    .catch(function(err) {
        console.warn('Erreur batch auto-inscriptions:', err);
    });
}

// ============================================================
// 12. STORY 2.3 — MODIFICATION (UPDATE)
// ============================================================

function updateBillet(docId, billetData, forcedTypeChange) {
    var saveBtn = document.getElementById('panel-save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enregistrement...';
    }

    supabaseFetch('/rest/v1/billets?id=eq.' + encodeURIComponent(docId), {
        method: 'PATCH',
        body: JSON.stringify(billetData)
    })
        .then(function() {
            showToast('Billet modifie avec succes', 'success');
            updateCardInList(docId, billetData);
            if (forcedTypeChange) {
                reconcilierTypeChangement(docId, billetData, forcedTypeChange);
            }
            closeBilletPanel();
        })
        .catch(function(error) {
            showToast('Erreur lors de la modification : ' + error.message, 'error');
            console.error('Erreur modification billet:', error);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Enregistrer les modifications';
            }
        });
}

// ============================================================
// 12b. RÉCONCILIATION DU TYPE APRÈS CHANGEMENT FORCÉ
// ============================================================

// Demande #16 (B5) — la réconciliation ne filtre plus sur collecte_id IS NULL
// (plus aucune inscription n'est dans ce cas) : quand le billet cesse de
// déclarer une version, les pré-inscriptions qui la portent sont sans objet
// SUR TOUTES ses collectes. Les inscriptions à valeur métier restent protégées
// par les filtres ci-dessous et par le trigger D12 côté base.
function reconcilierTypeChangement(billetId, billet, typeChange) {
    var promesses = [];

    // Supprimer / zéro-iser les inscriptions normales
    if (typeChange.supprimeNormale) {
        promesses.push(
            supabaseFetch('/rest/v1/inscriptions?billet_id=eq.' + billetId +
                '&nb_normaux=gt.0&select=id,nb_variantes' +
                '&changed_by=eq.' + encodeURIComponent('pré-inscription') +
                '&statut_paiement=eq.non_paye' +
                '&statut_livraison=eq.non_reparti' +
                '&envoye=eq.false' +
                '&fdp_regles=eq.false' +
                '&enveloppe_id=is.null' +
                '&pas_interesse=eq.false')
                .then(function(inscs) {
                    if (!inscs || inscs.length === 0) return;
                    var toDelete = inscs.filter(function(i) { return i.nb_variantes === 0; });
                    var toUpdate = inscs.filter(function(i) { return i.nb_variantes > 0; });
                    var p = [];
                    if (toDelete.length > 0) {
                        var ids = toDelete.map(function(i) { return i.id; }).join(',');
                        p.push(supabaseFetch('/rest/v1/inscriptions?id=in.(' + ids + ')', { method: 'DELETE' }));
                    }
                    if (toUpdate.length > 0) {
                        var ids2 = toUpdate.map(function(i) { return i.id; }).join(',');
                        p.push(supabaseFetch('/rest/v1/inscriptions?id=in.(' + ids2 + ')', {
                            method: 'PATCH',
                            body: JSON.stringify({ nb_normaux: 0 })
                        }));
                    }
                    return Promise.all(p);
                })
        );
    }

    // Supprimer / zéro-iser les inscriptions variante
    if (typeChange.supprimeVariante) {
        promesses.push(
            supabaseFetch('/rest/v1/inscriptions?billet_id=eq.' + billetId +
                '&nb_variantes=gt.0&select=id,nb_normaux' +
                '&changed_by=eq.' + encodeURIComponent('pré-inscription') +
                '&statut_paiement=eq.non_paye' +
                '&statut_livraison=eq.non_reparti' +
                '&envoye=eq.false' +
                '&fdp_regles=eq.false' +
                '&enveloppe_id=is.null' +
                '&pas_interesse=eq.false')
                .then(function(inscs) {
                    if (!inscs || inscs.length === 0) return;
                    var toDelete = inscs.filter(function(i) { return i.nb_normaux === 0; });
                    var toUpdate = inscs.filter(function(i) { return i.nb_normaux > 0; });
                    var p = [];
                    if (toDelete.length > 0) {
                        var ids = toDelete.map(function(i) { return i.id; }).join(',');
                        p.push(supabaseFetch('/rest/v1/inscriptions?id=in.(' + ids + ')', { method: 'DELETE' }));
                    }
                    if (toUpdate.length > 0) {
                        var ids2 = toUpdate.map(function(i) { return i.id; }).join(',');
                        p.push(supabaseFetch('/rest/v1/inscriptions?id=in.(' + ids2 + ')', {
                            method: 'PATCH',
                            body: JSON.stringify({ nb_variantes: 0 })
                        }));
                    }
                    return Promise.all(p);
                })
        );
    }

    Promise.all(promesses)
        .then(function() {
            if (typeChange.ajouteNormale || typeChange.ajouteVariante) {
                // Recalculer les pré-inscriptions avec le nouveau type (merge sur l'existant)
                billet.id = billet.id || billetId;
                recalculerAutoInscriptions(billet);
            } else if (typeChange.supprimeNormale || typeChange.supprimeVariante) {
                showToast('Inscriptions mises à jour après changement de type', 'info');
                loadAdminInscriptionCounts().then(function() {
                    if (String(adminCurrentBilletId) === String(billetId)) openInscriptionsModal(adminCurrentBilletId);
                });
            }
        })
        .catch(function(err) {
            showToast('Erreur lors de la mise à jour des inscriptions : ' + (err.message || err), 'error');
            console.error('Erreur réconciliation type:', err);
        });
}

// Recalcule les quantités des inscriptions existantes d'après les pré-inscriptions auto
// Utilise merge-duplicates pour mettre à jour nb_normaux/nb_variantes sans toucher les autres champs
function recalculerAutoInscriptions(billet) {
    adminRecalculEnCoursBilletId = String(billet.id);
    var isFrance = !billet.Pays || billet.Pays === 'France';
    var annee = parseInt(billet.Millesime) || new Date().getFullYear();

    // Demande #16 — le recalcul cible la collecte principale du billet et masque
    // par SON scope (source de vérité du périmètre ouvert), pas par les versions
    // déclarées du billet. Sans collecte, rien à recalculer.
    var collecte = collectePrincipaleBilletAdmin(billet.id);
    if (!collecte) return;
    var scope = collecte.scope || 'normal';
    var hasNormale = (scope !== 'variante')
        && billet.VersionNormaleExiste !== false && billet.VersionNormaleExiste !== 'false';
    var hasVariante = (scope !== 'normal') && !!(billet.HasVariante && billet.HasVariante !== 'N');

    Promise.all([
        supabaseFetch('/rest/v1/inscriptions_auto?annee=eq.' + annee + '&select=*'),
        chargerEmailsBloques()
    ])
        .then(function(res) {
            var autoData = res[0];
            var emailsBloques = res[1] || {};
            if (!autoData || autoData.length === 0) return;
            var qualifies = autoData.filter(function(a) { return (isFrance ? a.france : a.etranger) && !emailsBloques[a.membre_email]; });
            if (qualifies.length === 0) return;

            if (isFrance) {
                recalculerAutoInscriptionsBatch(billet, collecte, qualifies, [], isFrance, hasNormale, hasVariante);
            } else {
                supabaseFetch('/rest/v1/inscriptions_auto_pays?annee=eq.' + annee + '&select=*')
                    .then(function(paysData) {
                        recalculerAutoInscriptionsBatch(billet, collecte, qualifies, paysData || [], isFrance, hasNormale, hasVariante);
                    })
                    .catch(function(err) { console.warn('Erreur paysData recalcul:', err); });
            }
        })
        .catch(function(err) { console.warn('Erreur recalculerAutoInscriptions:', err); });
}

// Collecte principale d'un billet côté admin (depuis adminCollectesByBillet,
// alimenté par loadAdminCollectes) : « Collecte initiale » > ouverte > 1re.
function collectePrincipaleBilletAdmin(billetId) {
    var list = adminCollectesByBillet[billetId] || [];
    if (list.length === 0) return null;
    for (var i = 0; i < list.length; i++) { if (list[i].nom === 'Collecte initiale') return list[i]; }
    for (var j = 0; j < list.length; j++) { if (list[j].categorie !== 'Terminé') return list[j]; }
    return list[0];
}

function recalculerAutoInscriptionsBatch(billet, collecte, qualifies, paysData, isFrance, hasNormale, hasVariante) {
    var updates = [];

    for (var i = 0; i < qualifies.length; i++) {
        var auto = qualifies[i];
        var nbNormaux = 0;
        var nbVariantes = 0;

        if (isFrance) {
            nbNormaux = hasNormale ? auto.nb_normaux_fr : 0;
            nbVariantes = hasVariante ? auto.nb_variantes_fr : 0;
        } else {
            var membrePays = paysData.filter(function(p) {
                return p.membre_email === auto.membre_email && p.annee === auto.annee;
            });
            if (membrePays.length > 0) {
                var paysMatch = null;
                for (var mp = 0; mp < membrePays.length; mp++) {
                    if (membrePays[mp].pays_nom === billet.Pays) { paysMatch = membrePays[mp]; break; }
                }
                if (!paysMatch) continue;
                nbNormaux = hasNormale ? paysMatch.nb_normaux : 0;
                nbVariantes = hasVariante ? paysMatch.nb_variantes : 0;
            } else {
                nbNormaux = hasNormale ? auto.nb_normaux_etr_defaut : 0;
                nbVariantes = hasVariante ? auto.nb_variantes_etr_defaut : 0;
            }
        }

        updates.push({
            billet_id: billet.id,
            collecte_id: collecte.id,
            membre_email: auto.membre_email,
            nb_normaux: nbNormaux,
            nb_variantes: nbVariantes
        });
    }

    if (updates.length === 0) return;

    // Demande #16 — merge sur la nouvelle UK (collecte_id, membre_email) : corrige
    // nativement FR31 (merge-duplicates ne réinitialise plus les lignes existantes).
    supabaseFetch('/rest/v1/inscriptions?on_conflict=collecte_id,membre_email', {
        method: 'POST',
        body: JSON.stringify(updates),
        headers: { 'Prefer': 'return=minimal, resolution=merge-duplicates' }
    })
    .then(function() {
        adminRecalculEnCoursBilletId = null;
        showToast('Quantités recalculées d\'après les pré-inscriptions', 'info');
        loadAdminInscriptionCounts().then(function() {
            if (String(adminCurrentBilletId) === String(billet.id)) openInscriptionsModal(adminCurrentBilletId);
        });
    })
    .catch(function(err) {
        adminRecalculEnCoursBilletId = null;
        console.warn('Erreur recalculerAutoInscriptionsBatch:', err);
    });
}

// Story 2.3 — Rafraichir la carte dans le DOM apres modification
function updateCardInList(docId, billetData) {
    var card = document.querySelector('[data-doc-id="' + docId + '"]');
    if (!card) return;

    // Mise a jour des elements textuels
    var titleEl = card.querySelector('.admin-card-title');
    if (titleEl) titleEl.textContent = billetData.NomBillet || 'Sans nom';

    var metaEl = card.querySelector('.admin-card-meta');
    if (metaEl) {
        var villeSpan = metaEl.querySelector('span:first-child');
        if (villeSpan) villeSpan.textContent = billetData.Ville || '';
        var refSpan = metaEl.querySelector('.admin-card-ref');
        if (refSpan) {
            refSpan.textContent = (billetData.Reference || '') +
                (billetData.Millesime ? ' - ' + billetData.Millesime + (billetData.Version ? '-' + billetData.Version : '') : '');
        }
    }

    // Mise a jour du badge de statut
    var badge = card.querySelector('.admin-badge-status');
    if (badge) {
        var statut = billetData.Categorie || '';
        var statusLabel = statut || 'Non defini';
        var color = getStatusColor(statut);
        badge.textContent = statusLabel;
        badge.setAttribute('data-current-status', statut);
        badge.style.backgroundColor = color;
        badge.style.color = getTextColorForBg(color);
    }

    // Mise a jour du badge inscriptions (libellé variante peut avoir changé)
    var inscBadge = card.querySelector('.admin-card-inscriptions-badge');
    if (inscBadge) {
        var idata = adminInscriptionCounts[docId] || { count: 0, normaux: 0, variantes: 0 };
        var icount = idata.count;
        var idetail = '';
        if (icount > 0) {
            var iparts = [];
            if (idata.normaux > 0) iparts.push(idata.normaux + ' billet' + (idata.normaux > 1 ? 's' : '') + ' normaux');
            if (idata.variantes > 0 && hasVarianteActive(billetData.HasVariante)) {
                var varLabel = varianteLabel(billetData.HasVariante);
                iparts.push(idata.variantes + ' billet' + (idata.variantes > 1 ? 's' : '') + ' ' + varLabel);
            }
            if (iparts.length > 0) idetail = ' (' + iparts.join(', ') + ')';
        }
        inscBadge.innerHTML = '<i class="fa-solid fa-users"></i> ' + icount + ' inscription' + (icount !== 1 ? 's' : '') + idetail;
    }

    // Mise a jour du bouton supprimer (nom du billet)
    var deleteBtn = card.querySelector('.admin-card-delete-btn');
    if (deleteBtn) {
        deleteBtn.setAttribute('data-billet-name', billetData.NomBillet || '');
    }

    // Mise a jour du popup de statut rapide
    var popup = document.getElementById('quick-status-popup-' + docId);
    if (popup) {
        var chipsContainer = popup.querySelector('.quick-status-chips');
        if (chipsContainer) {
            chipsContainer.innerHTML = buildStatusChipsHtml(docId, billetData.Categorie || '');
        }
    }

    // Mise a jour des donnees en memoire
    for (var i = 0; i < adminBillets.length; i++) {
        if (String(adminBillets[i]._id) === String(docId)) {
            for (var key in billetData) {
                adminBillets[i][key] = billetData[key];
            }
            break;
        }
    }

    // Story 2.1b — Recalculer les compteurs
    renderStatusCounters();
}

// ============================================================
// 13. STORY 2.4 — MODALE DE SUPPRESSION
// ============================================================

function openDeleteModal(docId, nomBillet) {
    var overlay = document.getElementById('delete-modal-overlay');
    var billetNameEl = document.getElementById('delete-modal-billet-name');
    var confirmInput = document.getElementById('delete-confirm-input');
    var confirmBtn = document.getElementById('delete-confirm-btn');
    if (!overlay || !billetNameEl || !confirmInput || !confirmBtn) return;

    deleteTargetDocId = docId;
    deleteTargetName = nomBillet;

    billetNameEl.textContent = nomBillet;
    confirmInput.value = '';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Confirmer la suppression';

    overlay.style.display = 'flex';

    // Focus sur l'input apres ouverture
    setTimeout(function() { confirmInput.focus(); }, 100);

    // Ecouteurs
    confirmInput.addEventListener('input', onDeleteInputChange);
    document.addEventListener('keydown', onDeleteModalKeydown);
    overlay.addEventListener('click', onDeleteOverlayClick);
}

function closeDeleteModal() {
    var overlay = document.getElementById('delete-modal-overlay');
    var confirmInput = document.getElementById('delete-confirm-input');
    if (!overlay) return;

    overlay.style.display = 'none';
    deleteTargetDocId = null;
    deleteTargetName = '';

    if (confirmInput) {
        confirmInput.value = '';
        confirmInput.removeEventListener('input', onDeleteInputChange);
    }
    document.removeEventListener('keydown', onDeleteModalKeydown);
    overlay.removeEventListener('click', onDeleteOverlayClick);
}

function onDeleteInputChange(e) {
    var confirmBtn = document.getElementById('delete-confirm-btn');
    if (!confirmBtn) return;
    var typed = e.target.value.trim();
    confirmBtn.disabled = (typed !== deleteTargetName);
}

function onDeleteModalKeydown(e) {
    if (e.key === 'Escape') {
        closeDeleteModal();
        return;
    }
    // Focus trap dans la modale
    if (e.key === 'Tab') {
        var modal = document.getElementById('delete-modal');
        if (!modal) return;
        var focusable = modal.querySelectorAll('input, button:not(:disabled)');
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

function onDeleteOverlayClick(e) {
    if (e.target.id === 'delete-modal-overlay') {
        closeDeleteModal();
    }
}

function confirmDelete() {
    if (!deleteTargetDocId) return;

    var docId = deleteTargetDocId;
    var confirmBtn = document.getElementById('delete-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Suppression...';
    }

    supabaseFetch('/rest/v1/billets?id=eq.' + encodeURIComponent(docId), {
        method: 'DELETE'
    })
        .then(function() {
            showToast('Billet supprime avec succes', 'success');
            closeDeleteModal();
            // Retirer du tableau en memoire
            adminBillets = adminBillets.filter(function(b) {
                return String(b._id) !== String(docId);
            });
            // Story 2.1b — Recalculer compteurs et filtres
            renderStatusCounters();
            adminApplyFilters();
        })
        .catch(function(error) {
            console.error('Erreur suppression billet:', error);
            // Demande #16 / DV2-1 — la FK collectes.billet_id est passée en
            // RESTRICT : supprimer un billet n'emporte plus silencieusement ses
            // collectes, il faut les retirer d'abord. Message explicite plutôt
            // que l'erreur brute de PostgREST.
            var msg = String(error && error.message || '');
            if (msg.indexOf('collectes') !== -1 || msg.indexOf('foreign key') !== -1 || msg.indexOf('23503') !== -1) {
                showToast('Suppression impossible : ce billet porte des collectes. Supprimez-les d\'abord depuis sa fiche.', 'error');
            } else {
                showToast('Erreur lors de la suppression : ' + error.message, 'error');
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirmer la suppression';
            }
        });
}

// ============================================================
// 14. STORY 2.5 — CHANGEMENT DE STATUT RAPIDE
// ============================================================

function handleBadgeClick(badge) {
    var docId = badge.getAttribute('data-doc-id');
    if (!docId) return;

    // Fermer tout popup deja ouvert
    closeAllStatusPopups();

    var popup = document.getElementById('quick-status-popup-' + docId);
    if (!popup) return;

    popup.style.display = 'block';

    // Elever le z-index de la carte pour eviter la superposition
    var card = badge.closest('.admin-card-billet');
    if (card) card.classList.add('popup-open');

    // Mettre a jour les chips actifs
    var currentStatus = badge.getAttribute('data-current-status');
    highlightActiveAndNextChip(popup, currentStatus);
}

function closeAllStatusPopups() {
    var popups = document.querySelectorAll('.quick-status-popup');
    popups.forEach(function(popup) {
        popup.style.display = 'none';
    });
    // Retirer le z-index eleve de toutes les cartes
    var cards = document.querySelectorAll('.admin-card-billet.popup-open');
    cards.forEach(function(card) {
        card.classList.remove('popup-open');
    });
}

function highlightActiveAndNextChip(popup, currentStatus) {
    if (!popup) return;
    var chips = popup.querySelectorAll('.status-chip');
    var currentIndex = CATEGORIES.indexOf(currentStatus);

    chips.forEach(function(chip, index) {
        chip.classList.remove('status-chip--active', 'status-chip--next');
        chip.setAttribute('aria-pressed', 'false');
        if (chip.getAttribute('data-status') === currentStatus) {
            chip.classList.add('status-chip--active');
            chip.setAttribute('aria-pressed', 'true');
        }
        if (currentIndex >= 0 && index === currentIndex + 1) {
            chip.classList.add('status-chip--next');
        }
    });
}

function handleQuickStatusChange(chip) {
    var newStatus = chip.getAttribute('data-status');
    var docId = chip.getAttribute('data-doc-id');
    if (!newStatus || !docId) return;

    // Ne rien faire si on clique sur le statut actif
    var badge = document.querySelector('.admin-badge-status[data-doc-id="' + docId + '"]');
    if (!badge) return;
    var previousStatus = badge.getAttribute('data-current-status');
    if (previousStatus === newStatus) return;

    var billetData = null;
    for (var k = 0; k < adminBillets.length; k++) {
        if (String(adminBillets[k]._id) === String(docId)) { billetData = adminBillets[k]; break; }
    }

    // ===== Demande #16 — le chip agit sur la COLLECTE, pas sur le billet =====
    var collectes = collectesDuBillet(docId);

    // Cas 1 : statut manuel (Pas de collecte / Projet / Masqué)
    if (STATUTS_MANUELS.indexOf(newStatus) !== -1) {
        if (collectes.length > 0) {
            showToast('Impossible : ce billet porte ' + collectes.length + ' collecte(s). Son statut en découle — supprimez ou clôturez-les d\'abord.', 'error');
            closeAllStatusPopups();
            return;
        }
        updateBadgeUI(badge, newStatus);
        closeAllStatusPopups();
        supabaseFetch('/rest/v1/billets?id=eq.' + encodeURIComponent(docId), {
            method: 'PATCH',
            body: JSON.stringify({ Categorie: newStatus })
        })
            .then(function() {
                updateInMemoryStatus(docId, newStatus);
                var popup = document.getElementById('quick-status-popup-' + docId);
                if (popup) {
                    var chipsContainer = popup.querySelector('.quick-status-chips');
                    if (chipsContainer) chipsContainer.innerHTML = buildStatusChipsHtml(docId, newStatus);
                }
                renderStatusCounters();
                showToast('Statut mis a jour : ' + newStatus, 'success');
            })
            .catch(function(error) {
                console.error('Erreur changement statut:', error);
                updateBadgeUI(badge, previousStatus);
                showToast('Erreur : ' + error.message, 'error');
            });
        return;
    }

    // Cas 2 : statut dérivé, mais aucune collecte → il faut la créer
    if (collectes.length === 0) {
        showCollecteQuickForm(docId, billetData, newStatus);
        return;
    }

    // Cas 3 : plusieurs collectes → on ne devine pas laquelle
    if (collectes.length > 1) {
        showToast('Ce billet a ' + collectes.length + ' collectes : ouvrez-le pour choisir laquelle modifier.', 'error');
        closeAllStatusPopups();
        return;
    }

    // Cas 4 : une seule collecte → c'est elle qu'on fait changer d'état
    var collecte = collectes[0];
    // Passage en Collecte : le prix de la version ouverte devient obligatoire
    var prixManquant = (collecte.scope !== 'variante')
        ? (collecte.prix === null || collecte.prix === undefined || collecte.prix === '')
        : (collecte.prix_variante === null || collecte.prix_variante === undefined || collecte.prix_variante === '');
    if (newStatus === 'Collecte' && (prixManquant || !collecte.collecteur)) {
        showCollecteQuickForm(docId, billetData, newStatus, collecte);
        return;
    }

    var patchBody = Object.assign({ categorie: newStatus },
                                  getCollecteDateUpdates(collecte.categorie, newStatus, collecte));

    updateBadgeUI(badge, newStatus);
    closeAllStatusPopups();

    supabaseFetch('/rest/v1/collectes?id=eq.' + collecte.id, {
        method: 'PATCH',
        body: JSON.stringify(patchBody)
    })
        .then(function() {
            for (var dk in patchBody) { collecte[dk] = patchBody[dk]; }
            // Le statut du billet est dérivé : on le relit plutôt que de le deviner
            return rafraichirStatutBillet(docId);
        })
        .then(function(statut) {
            showToast('Collecte « ' + (collecte.nom || '') + ' » : ' + newStatus
                + (statut && statut !== newStatus ? ' (billet : ' + statut + ')' : ''), 'success');
        })
        .catch(function(error) {
            console.error('Erreur changement statut collecte:', error);
            updateBadgeUI(badge, previousStatus);
            showToast('Erreur : ' + error.message, 'error');
        });
}

function updateBadgeUI(badge, status) {
    if (!badge) return;
    badge.setAttribute('data-current-status', status);
    badge.textContent = status || 'Non defini';
    var color = getStatusColor(status);
    badge.style.backgroundColor = color;
    badge.style.color = getTextColorForBg(color);
}

function updateInMemoryStatus(docId, newStatus) {
    for (var i = 0; i < adminBillets.length; i++) {
        if (String(adminBillets[i]._id) === String(docId)) {
            adminBillets[i].Categorie = newStatus;
            break;
        }
    }
}

// ============================================================
// 14b. MINI-FORMULAIRE COLLECTE RAPIDE
// ============================================================

// Demande #16 — ce formulaire crée (ou complète) LA COLLECTE du billet.
// `cible` = statut visé ; `collecte` = collecte existante à compléter, sinon on
// en crée une nouvelle.
function showCollecteQuickForm(docId, billetData, cible, collecte) {
    var popup = document.getElementById('quick-status-popup-' + docId);
    if (!popup) return;
    billetData = billetData || {};
    quickCollecteContext[docId] = { cible: cible || 'Collecte', collecte: collecte || null };

    var existingCollecteur = (collecte && collecte.collecteur) || '';
    var existingPrix = (collecte && collecte.prix) || '';
    var existingPrixVariante = (collecte && collecte.prix_variante) || '';
    var scope = collecte ? collecte.scope : scopeDepuisBillet(billetData);
    // Le périmètre de la collecte décide des prix à saisir
    var versionNormaleExiste = (scope !== 'variante');
    var varianteVal = billetData.HasVariante || '';
    var varianteActive = (scope !== 'normal') && varianteVal && varianteVal !== 'N';

    // Construire les options du select collecteur
    var collecteurOptions = '<option value="">— Collecteur —</option>';
    collecteursList.forEach(function(coll) {
        var selected = coll.alias === existingCollecteur ? ' selected' : '';
        collecteurOptions += '<option value="' + escapeAttr(coll.alias) + '"' + selected + '>' + escapeHtml(coll.alias) + '</option>';
    });

    // Champ prix normal (masqué si pas de version normale)
    var prixNormalHtml = versionNormaleExiste
        ? '<div class="quick-collecte-form__field">' +
              '<label for="quick-prix-' + docId + '">Prix normal * (€)</label>' +
              '<input type="number" id="quick-prix-' + docId + '" class="quick-collecte-form__input" step="0.01" min="0" placeholder="2.00" value="' + escapeAttr(String(existingPrix)) + '">' +
          '</div>'
        : '';

    // Champ prix variante (affiché si variante active)
    var prixVarianteHtml = varianteActive
        ? '<div class="quick-collecte-form__field">' +
              '<label for="quick-prix-variante-' + docId + '">Prix ' + escapeHtml(varianteVal) + ' * (€)</label>' +
              '<input type="number" id="quick-prix-variante-' + docId + '" class="quick-collecte-form__input" step="0.01" min="0" placeholder="2.00" value="' + escapeAttr(String(existingPrixVariante)) + '">' +
          '</div>'
        : '';

    var titreForm = collecte
        ? 'Compléter la collecte « ' + escapeHtml(collecte.nom || '') + ' »'
        : 'Nouvelle collecte (' + escapeHtml(cible || 'Collecte') + ')';
    var formHtml =
        '<div class="quick-collecte-form" id="quick-collecte-form-' + docId + '">' +
            '<p class="quick-collecte-form__title">' + titreForm + '</p>' +
            '<div class="quick-collecte-form__field">' +
                '<label for="quick-collecteur-' + docId + '">Collecteur *</label>' +
                '<select id="quick-collecteur-' + docId + '" class="quick-collecte-form__select">' +
                    collecteurOptions +
                '</select>' +
            '</div>' +
            prixNormalHtml +
            prixVarianteHtml +
            '<div class="quick-collecte-form__field quick-collecte-form__field--checkbox">' +
                '<label class="quick-collecte-form__checkbox-label"><input type="checkbox" id="quick-payer-fdp-' + docId + '"> Payer les frais de port</label>' +
            '</div>' +
            '<div class="quick-collecte-form__actions">' +
                '<button type="button" class="quick-collecte-form__btn quick-collecte-form__btn--cancel" onclick="cancelQuickCollecte(\'' + escapeAttr(String(docId)) + '\')">Annuler</button>' +
                '<button type="button" class="quick-collecte-form__btn quick-collecte-form__btn--confirm" onclick="confirmQuickCollecte(\'' + escapeAttr(String(docId)) + '\')">Valider</button>' +
            '</div>' +
        '</div>';

    // Masquer les chips et afficher le formulaire
    var chipsContainer = popup.querySelector('.quick-status-chips');
    if (chipsContainer) chipsContainer.style.display = 'none';

    // Supprimer un formulaire précédent s'il existe
    var oldForm = popup.querySelector('.quick-collecte-form');
    if (oldForm) oldForm.remove();

    popup.insertAdjacentHTML('beforeend', formHtml);
}

function cancelQuickCollecte(docId) {
    var popup = document.getElementById('quick-status-popup-' + docId);
    if (!popup) return;

    var form = popup.querySelector('.quick-collecte-form');
    if (form) form.remove();

    var chipsContainer = popup.querySelector('.quick-status-chips');
    if (chipsContainer) chipsContainer.style.display = '';

    closeAllStatusPopups();
}

function confirmQuickCollecte(docId) {
    var collecteurSelect = document.getElementById('quick-collecteur-' + docId);
    var prixInput = document.getElementById('quick-prix-' + docId);
    var prixVarianteInput = document.getElementById('quick-prix-variante-' + docId);
    var payerFdpCheckbox = document.getElementById('quick-payer-fdp-' + docId);
    if (!collecteurSelect) return;

    var ctx = quickCollecteContext[docId] || { cible: 'Collecte', collecte: null };
    var cible = ctx.cible;
    var collecteExistante = ctx.collecte;

    var collecteur = collecteurSelect.value;
    var prix = prixInput ? prixInput.value : '';
    var prixVariante = prixVarianteInput ? prixVarianteInput.value : '';
    var payerFDP = payerFdpCheckbox && payerFdpCheckbox.checked ? 'oui' : '';

    // Validation — le prix n'est exigé qu'à partir du statut Collecte
    var errors = [];
    if (!collecteur) errors.push('Collecteur');
    if (cible !== 'Pré collecte') {
        if (prixInput && (!prix || parseFloat(prix) <= 0)) errors.push('Prix normal');
        if (prixVarianteInput && (!prixVariante || parseFloat(prixVariante) <= 0)) errors.push('Prix variante');
    }
    if (errors.length > 0) {
        showToast('Veuillez renseigner : ' + errors.join(' et '), 'error');
        return;
    }

    var billetData = null;
    for (var k = 0; k < adminBillets.length; k++) {
        if (String(adminBillets[k]._id) === String(docId)) { billetData = adminBillets[k]; break; }
    }

    var badge = document.querySelector('.admin-badge-status[data-doc-id="' + docId + '"]');
    if (!badge) return;
    var previousStatus = badge.getAttribute('data-current-status');

    var champs = {
        categorie: cible,
        collecteur: collecteur,
        payer_fdp: payerFDP
    };
    if (prixInput) champs.prix = parseFloat(prix);
    if (prixVarianteInput) champs.prix_variante = parseFloat(prixVariante);
    Object.assign(champs, getCollecteDateUpdates(
        collecteExistante ? collecteExistante.categorie : previousStatus, cible, collecteExistante));

    updateBadgeUI(badge, cible);
    closeAllStatusPopups();

    var requete;
    if (collecteExistante) {
        requete = supabaseFetch('/rest/v1/collectes?id=eq.' + collecteExistante.id, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(champs)
        });
    } else {
        // Création : nom et scope déduits du billet (le formulaire rapide reste rapide,
        // le formulaire complet du panel permet de tout régler)
        champs.billet_id = parseInt(docId, 10);
        champs.nom = 'Collecte ' + (billetData && billetData.Millesime ? billetData.Millesime : new Date().getFullYear());
        champs.scope = scopeDepuisBillet(billetData);
        requete = supabaseFetch('/rest/v1/collectes', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(champs)
        });
    }

    requete
        .then(function(data) {
            var collecte = Array.isArray(data) ? data[0] : data;
            // Une collecte neuve matérialise les pré-inscriptions (D5/B1/N1)
            if (!collecteExistante && billetData && collecte && collecte.id) {
                creerAutoInscriptions(billetData, collecte);
            }
            var popup = document.getElementById('quick-status-popup-' + docId);
            if (popup) {
                var form = popup.querySelector('.quick-collecte-form');
                if (form) form.remove();
                var chipsContainer = popup.querySelector('.quick-status-chips');
                if (chipsContainer) chipsContainer.style.display = '';
            }
            return loadAdminCollectes().then(function() { return rafraichirStatutBillet(docId); });
        })
        .then(function() {
            var toastPrix = prix ? prix + '€' : '';
            if (prixVariante) toastPrix += (toastPrix ? ' / Variante: ' : '') + prixVariante + '€';
            showToast('Collecte ' + (collecteExistante ? 'mise à jour' : 'créée') + ' : ' + cible
                + ' (Collecteur: ' + collecteur + (toastPrix ? ', Prix: ' + toastPrix : '') + ')', 'success');

            // Supprimer les inscriptions des membres blacklistés par ce collecteur
            nettoyerInscriptionsBlacklist(collecteur, docId);
        })
        .catch(function(error) {
            console.error('Erreur collecte rapide:', error);
            updateBadgeUI(badge, previousStatus);
            showToast('Erreur : ' + error.message, 'error');
        });
}

// Supprime les inscriptions de membres blacklistés quand un collecteur est assigné
function nettoyerInscriptionsBlacklist(collecteurAlias, billetId) {
    // Charger la blacklist du collecteur
    supabaseFetch('/rest/v1/collecteur_blacklist?collecteur_alias=eq.' + encodeURIComponent(collecteurAlias) + '&select=membre_email')
        .then(function(blacklist) {
            if (!blacklist || blacklist.length === 0) return;
            var emails = blacklist.map(function(e) { return e.membre_email; });
            // Supprimer les inscriptions blacklistées sur ce billet
            var emailsFilter = 'membre_email=in.(' + emails.map(function(e) { return '"' + e + '"'; }).join(',') + ')';
            return supabaseFetch('/rest/v1/inscriptions?billet_id=eq.' + billetId + '&' + emailsFilter, {
                method: 'DELETE'
            });
        })
        .catch(function(error) {
            console.warn('Erreur nettoyage blacklist inscriptions:', error);
        });
}

// ============================================================
// 15. STORY 2.1b — COMPTEURS DE STATUT
// ============================================================

function renderStatusCounters() {
    var container = document.getElementById('admin-status-counters');
    if (!container) return;

    // Compter par statut depuis le tableau complet (pas les filtres)
    var counts = {};
    var total = adminBillets.length;
    adminBillets.forEach(function(billet) {
        var statut = billet.Categorie || 'Non defini';
        counts[statut] = (counts[statut] || 0) + 1;
    });

    // Ordre des statuts
    var statutOrder = CATEGORIES.slice();
    // Ajouter les statuts non prevus
    Object.keys(counts).forEach(function(s) {
        if (statutOrder.indexOf(s) === -1) statutOrder.push(s);
    });

    var html = '<button class="admin-status-counter' +
        (adminActiveStatusFilter === 'tous' ? ' admin-status-counter--active' : '') +
        '" data-status="tous" onclick="adminFilterByStatus(\'tous\')" aria-pressed="' +
        (adminActiveStatusFilter === 'tous' ? 'true' : 'false') + '">' +
        '<span class="admin-status-counter__count">' + total + '</span>' +
        '<span class="admin-status-counter__label">Tous</span></button>';

    statutOrder.forEach(function(statut) {
        if (!counts[statut]) return;
        var isActive = adminActiveStatusFilter === statut;
        var color = getStatusColor(statut);
        html += '<button class="admin-status-counter' +
            (isActive ? ' admin-status-counter--active' : '') +
            '" data-status="' + escapeAttr(statut) + '" onclick="adminFilterByStatus(\'' +
            escapeAttr(statut) + '\')" aria-pressed="' +
            (isActive ? 'true' : 'false') +
            '" style="border-left-color: ' + color + ';">' +
            '<span class="admin-status-counter__count">' + counts[statut] + '</span>' +
            '<span class="admin-status-counter__label">' + escapeHtml(statut) + '</span></button>';
    });

    container.innerHTML = html;
}

// ============================================================
// 16. STORY 2.1b — FILTRAGE PAR STATUT
// ============================================================

function adminFilterByStatus(statut) {
    adminActiveStatusFilter = statut;
    currentPage = 1;
    renderStatusCounters();
    adminApplyFilters();
}

// ============================================================
// 17. STORY 2.1b — FILTRAGE COMBINE (recherche + statut + en cours)
// ============================================================

function adminApplyFilters() {
    var searchInput = document.getElementById('admin-search-input');
    var clearBtn = document.getElementById('admin-search-clear');
    if (!searchInput) return;

    var searchText = searchInput.value.toLowerCase().trim();

    // Afficher/masquer le bouton clear
    if (clearBtn) {
        if (searchText.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }

    adminFilteredBillets = adminBillets.filter(function(billet) {
        // Filtre statut
        if (adminActiveStatusFilter !== 'tous') {
            var billetStatut = billet.Categorie || 'Non defini';
            if (billetStatut !== adminActiveStatusFilter) {
                return false;
            }
        }

        // Filtre "En cours" (masquer les termines)
        if (adminFilterEnCours && billet.Categorie === 'Terminé') {
            return false;
        }

        // Recherche textuelle
        if (searchText) {
            // Demande #16 — le collecteur (bascule) est ajouté depuis les collectes
            // du billet (adminCollectesByBillet), plus de billet.Collecteur.
            var collecteursBillet = (adminCollectesByBillet[billet._id] || adminCollectesByBillet[billet.id] || [])
                .map(function(c) { return c.collecteur; }).filter(Boolean).join(' ');
            var fields = [
                billet.NomBillet, billet.Ville, billet.Reference,
                billet.Millesime, collecteursBillet, billet.Dep,
                billet.Cp, billet.Pays, billet.Categorie,
                billet.Theme, billet.Commentaire
            ];
            var match = fields.some(function(val) {
                return val && String(val).toLowerCase().indexOf(searchText) !== -1;
            });
            if (!match) return false;
        }

        return true;
    });

    renderAdminCards();
}

// ============================================================
// 18. STORY 2.1b — FONCTIONS UTILITAIRES DE RECHERCHE
// ============================================================

function adminClearSearch() {
    var input = document.getElementById('admin-search-input');
    if (input) input.value = '';
    currentPage = 1;
    adminApplyFilters();
}

function adminToggleEnCours() {
    adminFilterEnCours = !adminFilterEnCours;
    var btn = document.getElementById('admin-filter-en-cours');
    if (btn) {
        btn.setAttribute('aria-pressed', adminFilterEnCours ? 'true' : 'false');
        if (adminFilterEnCours) {
            btn.classList.add('admin-filter-toggle--active');
        } else {
            btn.classList.remove('admin-filter-toggle--active');
        }
    }
    currentPage = 1;
    adminApplyFilters();
}

function adminResetFilters() {
    // Reset recherche
    var input = document.getElementById('admin-search-input');
    if (input) input.value = '';

    // Reset statut
    adminActiveStatusFilter = 'tous';

    // Reset "En cours"
    adminFilterEnCours = false;
    var btn = document.getElementById('admin-filter-en-cours');
    if (btn) {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('admin-filter-toggle--active');
    }

    currentPage = 1;
    renderStatusCounters();
    adminApplyFilters();
}

// ============================================================
// 19. COMPATIBILITE — Ancien handler
// ============================================================
// Garde pour compatibilite si le onclick="handleAddBillet()" existe encore dans le HTML
function handleAddBillet() {
    openBilletPanel();
}

// ============================================================
// 20. STORY 5.2 — CHAMPS GOOGLE & GEL COLLECTEUR
// ============================================================

/**
 * Vérifie si des inscriptions existent pour un billet donné (Story 5.4).
 * @param {string|number} billetId - L'ID du billet
 * @returns {Promise} Résout avec un booléen
 */
function hasInscriptions(billetId) {
    return supabaseFetch('/rest/v1/inscriptions?billet_id=eq.' + billetId + '&pas_interesse=eq.false&select=id&limit=1')
        .then(function(data) { return data && data.length > 0; })
        .catch(function(error) {
            console.warn('Erreur vérification inscriptions:', error);
            return false;
        });
}

// Reset des champs Google (retirer readonly, badges, afficher)
function resetGoogleFields() {
    document.querySelectorAll('[data-google-field="true"]').forEach(function(group) {
        group.style.display = '';
        var input = group.querySelector('input');
        if (input) {
            input.removeAttribute('readonly');
            input.classList.remove('admin-field-readonly');
        }
        var badge = group.querySelector('.badge-ancien-systeme');
        if (badge) badge.remove();
    });
}

// Reset du gel collecteur
function resetCollecteurFreeze() {
    var collecteurSelect = document.getElementById('field-collecteur');
    if (collecteurSelect) {
        collecteurSelect.disabled = false;
        collecteurSelect.classList.remove('admin-field-frozen');
        var hint = collecteurSelect.parentNode.querySelector('.collecteur-frozen-hint');
        if (hint) hint.remove();
    }
    // Reset gel des champs type de billet
    var cbNormale = document.getElementById('field-version-normale');
    if (cbNormale) {
        cbNormale.disabled = false;
        cbNormale.classList.remove('admin-field-frozen');
    }
    var hasVarianteEl = document.getElementById('field-has-variante');
    if (hasVarianteEl) {
        hasVarianteEl.disabled = false;
        hasVarianteEl.classList.remove('admin-field-frozen');
    }
    // Retirer le message d'avertissement type
    var typeHints = document.querySelectorAll('.type-frozen-hint');
    typeHints.forEach(function(h) { h.remove(); });
}

// ============================================================
// FEAT-1 : MODALE PARTAGE (bouton Facebook/copie)
// ============================================================

function openShareModal(billetId) {
    var billet = adminBillets.find(function(b) { return b._id === billetId; });
    if (!billet) return;

    var textTopEl = document.getElementById('share-modal-text-top');
    var textBottomEl = document.getElementById('share-modal-text-bottom');
    var imgEl = document.getElementById('share-modal-image');
    var shareOverlay = document.getElementById('share-modal-overlay');
    var btn = document.getElementById('share-copy-btn');
    if (!textTopEl || !textBottomEl || !shareOverlay || !btn) return;

    var pays = billet.Pays || '';
    var ref = (billet.Reference || '') + ' ' + (billet.Millesime || 'XXXX') + '-' + (billet.Version || 'X');
    var nom = billet.NomBillet || '';
    var statut = billet.Categorie || '';

    // Partie haute : titre + statut + prix
    var topLines = [];
    topLines.push('🎫 ' + pays + ' - ' + ref + ' - ' + nom);

    var statutLine = '📌 Statut : ' + statut;
    // Demande #16 — le collecteur affiché vient de la collecte principale du billet
    var colPrincTip = collectePrincipaleBilletAdmin(billet.id);
    var collecteurTip = colPrincTip && colPrincTip.collecteur;
    if (statut === 'Collecte' && collecteurTip) {
        statutLine += ' | Collecteur : ' + collecteurTip;
        var collecteurObj = collecteursList.find(function(c) { return c.alias === collecteurTip; });
        if (collecteurObj && collecteurObj.paypal_email) {
            statutLine += ' (' + collecteurObj.paypal_email + ')';
        }
    }
    topLines.push(statutLine);

    var vne = billet.VersionNormaleExiste !== false;
    var varianteVal = billet.HasVariante || '';
    var varianteActive = varianteVal && varianteVal !== 'N';
    // Demande #16 — le prix vient des collectes du billet. Sur un billet à
    // plusieurs collectes on affiche celui de la première ouverte (le partage
    // Facebook annonce la collecte en cours).
    var collectesBillet = collectesDuBillet(billet.id);
    var collecteAffichee = null;
    for (var ci = 0; ci < collectesBillet.length; ci++) {
        if (collectesBillet[ci].categorie !== 'Terminé') { collecteAffichee = collectesBillet[ci]; break; }
    }
    if (!collecteAffichee && collectesBillet.length > 0) collecteAffichee = collectesBillet[0];
    var prixNormal = (collecteAffichee && collecteAffichee.prix) ? parseFloat(collecteAffichee.prix) : 0;
    var prixVar = (collecteAffichee && collecteAffichee.prix_variante !== null && collecteAffichee.prix_variante !== undefined && collecteAffichee.prix_variante !== '')
        ? parseFloat(collecteAffichee.prix_variante) : prixNormal;

    if (!vne && varianteActive && prixVar) {
        topLines.push('💰 Prix : ' + prixVar.toFixed(2) + '€ ' + varianteVal);
    } else if (vne && varianteActive && prixNormal) {
        topLines.push('💰 Prix : ' + prixNormal.toFixed(2) + '€ normal / ' + prixVar.toFixed(2) + '€ ' + varianteVal);
    } else if (prixNormal) {
        topLines.push('💰 Prix : ' + prixNormal.toFixed(2) + '€');
    }

    textTopEl.textContent = topLines.join('\n');

    // Image du billet — pour l'aperçu Facebook on partage l'URL Cloudinary
    // avec l'overlay QR appliqué (image protégée + scrapable par FB)
    var imgUrl = billet.ImageUrl || '';
    var imgUrlForCopy = '';
    var QR_OVERLAY_SHARE = 'l_fetch:aHR0cHM6Ly9hcGkucXJzZXJ2ZXIuY29tL3YxL2NyZWF0ZS1xci1jb2RlLz9zaXplPTE1MHgxNTAmZGF0YT1odHRwczovL2N5cmlsMjUuZ2l0aHViLmlvL0JpbGxldHNUb3VyaXN0aXF1ZXM=,w_0.1,x_0.088,fl_relative,g_west,o_70';
    if (imgUrl && imgUrl.indexOf('cloudinary.com') !== -1) {
        imgUrlForCopy = imgUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1200/' + QR_OVERLAY_SHARE + '/');
    } else if (billet.ImageId) {
        var driveUrl = 'https://lh3.googleusercontent.com/d/' + billet.ImageId;
        imgUrlForCopy = 'https://res.cloudinary.com/dxoyqxben/image/fetch/f_auto,q_auto,w_1200/' + QR_OVERLAY_SHARE + '/' + encodeURIComponent(driveUrl);
    }
    if (imgUrlForCopy) {
        imgEl.src = imgUrlForCopy;
        imgEl.style.display = '';
    } else {
        imgEl.style.display = 'none';
        imgEl.src = '';
    }

    // Partie basse : lien inscription + image Cloudinary
    var bottomLines = [];
    var baseUrl = 'https://cyril25.github.io/BilletsTouristiques/billets.html';
    bottomLines.push('👉 S\'inscrire : ' + baseUrl + '?billet=' + billetId);
    if (imgUrlForCopy) bottomLines.push(imgUrlForCopy);
    textBottomEl.textContent = bottomLines.join('\n\n');

    shareOverlay.style.display = '';

    // Reset bouton copie
    btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copier';
    btn.classList.remove('admin-modal-btn-success');
    btn.classList.add('admin-modal-btn-primary');
}

function closeShareModal() {
    var overlay = document.getElementById('share-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function copyShareText() {
    var top = document.getElementById('share-modal-text-top').textContent;
    var bottom = document.getElementById('share-modal-text-bottom').textContent;
    var text = top + '\n\n' + bottom;
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById('share-copy-btn');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
        btn.classList.remove('admin-modal-btn-primary');
        btn.classList.add('admin-modal-btn-success');
        setTimeout(function() {
            btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copier';
            btn.classList.remove('admin-modal-btn-success');
            btn.classList.add('admin-modal-btn-primary');
        }, 2000);
    }).catch(function() {
        showToast('Erreur lors de la copie', 'error');
    });
}

// ============================================================
// ANNONCE EBAY (superadmin uniquement)
// ============================================================
// Modèle fourni par Cyril (cf. notes/ebay-annonces.md) :
//   Titre : Billet Euro Schein Souvenir Touristique -{Nom}-{Ref} {Millésime}-{Version}
//   Description : Arial 14pt, lignes Nom / Version / Référence / N° de série,
//   enrichie de l'image, du lieu, du thème et de l'état.

// Référence complète façon annonce : « CHAX 2024-9 »
function buildEbayRef(billet) {
    var ref = billet.Reference || '';
    if (billet.Millesime) ref += (ref ? ' ' : '') + billet.Millesime;
    if (billet.Version) ref += '-' + billet.Version;
    return ref;
}

function buildEbayTitre(billet) {
    var prefix = 'Billet Euro Schein Souvenir Touristique -';
    var ref = buildEbayRef(billet);
    var suffix = ref ? '-' + ref : '';
    // eBay limite le titre à 80 caractères : on tronque le nom, jamais la référence
    var nom = billet.NomBillet || '';
    var maxNom = 80 - prefix.length - suffix.length;
    if (nom.length > maxNom) nom = nom.slice(0, maxNom).trim();
    return prefix + nom + suffix;
}

function buildEbayDescriptionHtml(billet) {
    // Version vendue : « Normale » par défaut ; libellé variante (Doré, Anniversaire)
    // si le billet n'existe qu'en variante. À ajuster à la main dans la modale si on
    // vend la variante d'un billet qui existe aussi en normal.
    var versionVendue = (billet.VersionNormaleExiste !== false) ? 'Normale' : (varianteLabel(billet.HasVariante) || 'Normale');

    var lignes = [
        ['Nom', billet.NomBillet],
        ['Version', versionVendue],
        ['Référence', buildEbayRef(billet)],
        ['Numéro de série', 'Aléatoire']
    ];

    var html = '<div style="font-family: Arial, sans-serif; font-size: 14pt;">';
    html += '<p>Billet Touristique 0 Euro Souvenir / 0-Euro Souvenir-Schein</p>';
    var items = [];
    lignes.forEach(function(l) {
        if (l[1] === null || l[1] === undefined || l[1] === '') return;
        items.push('<b>' + l[0] + '&nbsp;:</b> ' + escapeHtml(String(l[1])));
    });
    html += '<p>' + items.join('<br><br>') + '</p>';
    html += '</div>';
    return html;
}

function openEbayModal(billetId) {
    var billet = adminBillets.find(function(b) { return b._id === billetId; });
    if (!billet) return;

    var overlay = document.getElementById('ebay-modal-overlay');
    var titreInput = document.getElementById('ebay-titre-input');
    var htmlArea = document.getElementById('ebay-html-textarea');
    if (!overlay || !titreInput || !htmlArea) return;

    titreInput.value = buildEbayTitre(billet);
    htmlArea.value = buildEbayDescriptionHtml(billet);
    updateEbayTitreCount();
    updateEbayPreview();

    // Reset boutons copie
    resetEbayCopyBtn('ebay-copy-titre-btn', 'Copier');
    resetEbayCopyBtn('ebay-copy-html-btn', 'Copier le HTML');

    overlay.style.display = '';
}

function closeEbayModal() {
    var overlay = document.getElementById('ebay-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function updateEbayTitreCount() {
    var titreInput = document.getElementById('ebay-titre-input');
    var countEl = document.getElementById('ebay-titre-count');
    if (titreInput && countEl) countEl.textContent = titreInput.value.length;
}

function updateEbayPreview() {
    var htmlArea = document.getElementById('ebay-html-textarea');
    var preview = document.getElementById('ebay-preview');
    if (htmlArea && preview) preview.innerHTML = htmlArea.value;
}

function resetEbayCopyBtn(btnId, label) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.innerHTML = '<i class="fa-solid fa-copy"></i> ' + label;
    btn.classList.remove('admin-modal-btn-success');
    btn.classList.add('admin-modal-btn-primary');
}

function copyEbayField(value, btnId, label) {
    navigator.clipboard.writeText(value).then(function() {
        var btn = document.getElementById(btnId);
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copié !';
        btn.classList.remove('admin-modal-btn-primary');
        btn.classList.add('admin-modal-btn-success');
        setTimeout(function() { resetEbayCopyBtn(btnId, label); }, 2000);
    }).catch(function() {
        showToast('Erreur lors de la copie', 'error');
    });
}

function copyEbayTitre() {
    copyEbayField(document.getElementById('ebay-titre-input').value, 'ebay-copy-titre-btn', 'Copier');
}

function copyEbayHtml() {
    copyEbayField(document.getElementById('ebay-html-textarea').value, 'ebay-copy-html-btn', 'Copier le HTML');
}

// Fermer les modales avec Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var shareOverlay = document.getElementById('share-modal-overlay');
        if (shareOverlay && shareOverlay.style.display !== 'none') {
            closeShareModal();
        }
        var ebayOverlay = document.getElementById('ebay-modal-overlay');
        if (ebayOverlay && ebayOverlay.style.display !== 'none') {
            closeEbayModal();
        }
        var inscOverlay = document.getElementById('inscriptions-modal-overlay');
        if (inscOverlay && inscOverlay.style.display !== 'none') {
            closeInscriptionsModal();
        }
    }
});

// Fermer en cliquant sur l'overlay
var shareOverlayEl = document.getElementById('share-modal-overlay');
if (shareOverlayEl) {
    shareOverlayEl.addEventListener('click', function(e) {
        if (e.target === this) closeShareModal();
    });
}
var ebayOverlayEl = document.getElementById('ebay-modal-overlay');
if (ebayOverlayEl) {
    ebayOverlayEl.addEventListener('click', function(e) {
        if (e.target === this) closeEbayModal();
    });
}
var inscOverlayEl = document.getElementById('inscriptions-modal-overlay');
if (inscOverlayEl) {
    inscOverlayEl.addEventListener('click', function(e) {
        if (e.target === this) closeInscriptionsModal();
    });
}

// ============================================================
// FEAT-2 : MODALE GESTION DES INSCRIPTIONS
// ============================================================

var adminCurrentInscriptions = [];
var adminCurrentBilletId = null;
var adminRecalculEnCoursBilletId = null; // billet dont le recalcul des inscriptions est en cours

function openInscriptionsModal(billetId) {
    var billet = adminBillets.find(function(b) { return b._id === billetId; });
    if (!billet) return;

    var titleEl = document.getElementById('inscriptions-modal-title');
    var bodyEl = document.getElementById('inscriptions-modal-body');
    var overlayEl = document.getElementById('inscriptions-modal-overlay');
    if (!titleEl || !bodyEl || !overlayEl) return;

    adminCurrentBilletId = billetId;
    titleEl.innerHTML =
        '<i class="fa-solid fa-users"></i> Inscriptions — ' + escapeHtml(billet.NomBillet || 'Sans nom');
    overlayEl.style.display = '';

    // Si un recalcul est en cours pour ce billet, attendre qu'il finisse
    if (adminRecalculEnCoursBilletId && String(adminRecalculEnCoursBilletId) === String(billetId)) {
        bodyEl.innerHTML =
            '<p style="text-align:center; padding:20px; color:var(--color-text-light, #666);"><i class="fa-solid fa-spinner fa-spin"></i> Recalcul des inscriptions en cours…</p>';
        return;
    }

    bodyEl.innerHTML =
        '<p style="text-align:center; padding:20px; color:var(--color-text-light, #666);"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</p>';

    // Charger les inscriptions et les membres en parallèle
    Promise.all([
        supabaseFetch('/rest/v1/inscriptions?billet_id=eq.' + billetId + '&pas_interesse=eq.false&select=*&order=date_inscription.desc'),
        chargerAdminMembres()
    ])
        .then(function(results) {
            adminCurrentInscriptions = results[0] || [];
            renderInscriptionsModalContent(billet);
        })
        .catch(function(error) {
            console.error('Erreur chargement inscriptions:', error);
            var errBody = document.getElementById('inscriptions-modal-body');
            if (errBody) errBody.innerHTML =
                '<p style="text-align:center; padding:20px; color:var(--color-danger);">Erreur lors du chargement</p>';
        });
}

function closeInscriptionsModal() {
    var overlay = document.getElementById('inscriptions-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    adminCurrentBilletId = null;
    adminCurrentInscriptions = [];
}

function renderInscriptionsModalContent(billet) {
    var body = document.getElementById('inscriptions-modal-body');
    var vne = billet.VersionNormaleExiste !== false;
    var varianteVal = billet.HasVariante || '';
    var varianteActive = varianteVal && varianteVal !== 'N';

    var html = '';

    // Bouton ajouter
    html += '<div class="admin-insc-toolbar">' +
        '<button class="admin-modal-btn admin-modal-btn-primary" onclick="openAdminAddInscription()">' +
        '<i class="fa-solid fa-user-plus"></i> Ajouter une inscription</button>' +
        '</div>';

    // Résumé des totaux
    if (adminCurrentInscriptions.length > 0) {
        var totalNormaux = 0, totalVariantes = 0;
        adminCurrentInscriptions.forEach(function(i) {
            totalNormaux += (i.nb_normaux || 0);
            totalVariantes += (i.nb_variantes || 0);
        });
        var summaryParts = [];
        summaryParts.push(adminCurrentInscriptions.length + ' inscription' + (adminCurrentInscriptions.length > 1 ? 's' : ''));
        var detailParts = [];
        if (totalNormaux > 0) detailParts.push(totalNormaux + ' billet' + (totalNormaux > 1 ? 's' : '') + ' normaux');
        if (totalVariantes > 0) {
            var vLabel = varianteLabelShort(varianteVal) || varianteVal;
            detailParts.push(totalVariantes + ' billet' + (totalVariantes > 1 ? 's' : '') + ' ' + vLabel);
        }
        if (detailParts.length > 0) summaryParts.push('(' + detailParts.join(', ') + ')');
        html += '<p class="admin-insc-summary"><i class="fa-solid fa-chart-simple"></i> ' + summaryParts.join(' ') + '</p>';
    }

    // Tri par nom puis prénom
    if (adminMembresCache) {
        adminCurrentInscriptions.sort(function(a, b) {
            var ma = adminMembresCache.find(function(m) { return m.email === a.membre_email; }) || {};
            var mb = adminMembresCache.find(function(m) { return m.email === b.membre_email; }) || {};
            var na = (ma.nom || '').toLowerCase(), nb = (mb.nom || '').toLowerCase();
            if (na < nb) return -1; if (na > nb) return 1;
            var pa = (ma.prenom || '').toLowerCase(), pb = (mb.prenom || '').toLowerCase();
            if (pa < pb) return -1; if (pa > pb) return 1;
            return 0;
        });
    }

    if (adminCurrentInscriptions.length === 0) {
        html += '<p style="text-align:center; padding:20px; color:var(--color-text-light, #666);">Aucune inscription pour ce billet</p>';
    } else {
        html += '<div class="admin-insc-table-wrapper"><table class="admin-insc-table">';
        html += '<thead><tr><th>Membre</th>';
        if (vne) html += '<th>Normaux</th>';
        if (varianteActive) html += '<th>Variantes</th>';
        html += '<th>Actions</th></tr></thead><tbody>';

        adminCurrentInscriptions.forEach(function(insc) {
            var membreObj = adminMembresCache ? adminMembresCache.find(function(m) { return m.email === insc.membre_email; }) : null;
            var nomMembre = membreObj ? ((membreObj.nom || '') + ' ' + (membreObj.prenom || '')).trim() || insc.membre_email : insc.membre_email;

            html += '<tr id="admin-insc-row-' + insc.id + '">';
            html += '<td title="' + escapeAttr(insc.membre_email) + '">' + escapeHtml(nomMembre) + '</td>';

            if (vne) {
                html += '<td class="admin-insc-qty" id="admin-insc-normaux-' + insc.id + '">' + (insc.nb_normaux || 0) + '</td>';
            }
            if (varianteActive) {
                html += '<td class="admin-insc-qty" id="admin-insc-variantes-' + insc.id + '">' + (insc.nb_variantes || 0) + '</td>';
            }

            html += '<td class="admin-insc-actions">' +
                '<button class="btn-modifier-inscription" onclick="openAdminEditInscription(' + insc.id + ')" title="Modifier">' +
                '<i class="fa-solid fa-pen"></i></button>' +
                '<button class="btn-supprimer-inscription" onclick="confirmAdminDeleteInscription(' + insc.id + ')" title="Supprimer">' +
                '<i class="fa-solid fa-trash-can"></i></button>' +
                '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    }

    // Zone formulaire ajout/modification (cachée par défaut)
    html += '<div id="admin-insc-form-container" style="display:none;"></div>';

    body.innerHTML = html;
}

// --- Chargement des membres (cache admin) ---
function chargerAdminMembres() {
    if (adminMembresCache) return Promise.resolve(adminMembresCache);
    return supabaseFetch('/rest/v1/membres?select=email,nom,prenom,rue,code_postal,ville,pays&order=nom.asc')
        .then(function(data) {
            adminMembresCache = data || [];
            return adminMembresCache;
        });
}

// --- Ajout inscription ---
function openAdminAddInscription() {
    var billet = adminBillets.find(function(b) { return b._id === adminCurrentBilletId; });
    if (!billet) return;

    chargerAdminMembres().then(function(membres) {
        renderAdminInscriptionForm(billet, membres, null);
    }).catch(function(error) {
        console.error('Erreur chargement membres:', error);
        showToast('Erreur lors du chargement des membres', 'error');
    });
}

// --- Modification inscription ---
function openAdminEditInscription(inscriptionId) {
    var billet = adminBillets.find(function(b) { return b._id === adminCurrentBilletId; });
    if (!billet) return;

    var inscription = adminCurrentInscriptions.find(function(i) { return i.id === inscriptionId; });
    if (!inscription) return;

    chargerAdminMembres().then(function(membres) {
        renderAdminInscriptionForm(billet, membres, inscription);
    }).catch(function(error) {
        console.error('Erreur chargement membres:', error);
        showToast('Erreur lors du chargement des membres', 'error');
    });
}

function renderAdminInscriptionForm(billet, membres, editInscription) {
    var container = document.getElementById('admin-insc-form-container');
    if (!container) return;

    var isEdit = !!editInscription;
    var titre = isEdit ? 'Modifier l\'inscription' : 'Inscrire un membre';
    var varianteActive = billet.HasVariante && billet.HasVariante !== 'N';
    var vne = billet.VersionNormaleExiste !== false;

    var defEmail = isEdit ? editInscription.membre_email : '';
    var defNormaux = isEdit ? (editInscription.nb_normaux || 0) : (varianteActive && vne ? 0 : (vne ? 1 : 0));
    var defVariantes = isEdit ? (editInscription.nb_variantes || 0) : (!vne ? 1 : 0);
    var defPaiement = isEdit ? (editInscription.mode_paiement || 'PayPal') : 'PayPal';
    var defEnvoi = isEdit ? (editInscription.mode_envoi || 'Normal') : 'Normal';
    var defCommentaire = isEdit ? (editInscription.commentaire || '') : '';

    // Filtrer les membres déjà inscrits
    var emailsInscrits = {};
    if (!isEdit) {
        adminCurrentInscriptions.forEach(function(ins) {
            emailsInscrits[ins.membre_email] = true;
        });
    }

    var optionsMembres = '<option value="">— Sélectionner un membre —</option>';
    membres.forEach(function(m) {
        if (!isEdit && emailsInscrits[m.email]) return;
        var label = ((m.nom || '') + ' ' + (m.prenom || '')).trim() || m.email;
        var selected = (m.email === defEmail) ? ' selected' : '';
        optionsMembres += '<option value="' + m.email + '"' + selected + '>' + escapeHtml(label) + ' (' + escapeHtml(m.email) + ')</option>';
    });

    var html = '<div class="admin-insc-form">';
    html += '<h3><i class="fa-solid fa-user-plus"></i> ' + titre + '</h3>';

    // Sélecteur de membre
    if (isEdit) {
        var membreEdit = adminMembresCache ? adminMembresCache.find(function(m) { return m.email === defEmail; }) : null;
        var nomAffiche = membreEdit ? ((membreEdit.nom || '') + ' ' + (membreEdit.prenom || '')).trim() || defEmail : defEmail;
        html += '<div class="admin-insc-form-field"><label>Membre</label><span class="admin-insc-readonly">' + escapeHtml(nomAffiche) + '</span></div>';
    } else {
        html += '<div class="admin-insc-form-field"><label>Membre</label>' +
            '<input type="text" id="admin-insc-membre-search" placeholder="Rechercher un membre..." oninput="filtrerAdminMembresModal()" autocomplete="off">' +
            '<select id="admin-insc-membre-email" size="5" class="admin-insc-membre-select">' + optionsMembres + '</select></div>';
    }

    // Champs quantités
    if (vne) {
        html += '<div class="admin-insc-form-field"><label>Nb normaux</label><input type="number" id="admin-insc-nb-normaux" value="' + defNormaux + '" min="0"></div>';
    }
    if (varianteActive) {
        html += '<div class="admin-insc-form-field"><label>Nb variantes</label><input type="number" id="admin-insc-nb-variantes" value="' + defVariantes + '" min="0"></div>';
    }

    // Mode paiement et envoi
    html += '<div class="admin-insc-form-field"><label>Paiement</label><select id="admin-insc-paiement">' +
        '<option value="PayPal"' + (defPaiement === 'PayPal' ? ' selected' : '') + '>PayPal</option>' +
        '<option value="Chèque"' + (defPaiement === 'Chèque' ? ' selected' : '') + '>Chèque</option></select></div>';

    html += '<div class="admin-insc-form-field"><label>Envoi</label><select id="admin-insc-envoi">' +
        '<option value="Normal"' + (defEnvoi === 'Normal' ? ' selected' : '') + '>Normal</option>' +
        '<option value="Suivi"' + (defEnvoi === 'Suivi' ? ' selected' : '') + '>Suivi</option>' +
        '<option value="R1"' + (defEnvoi === 'R1' ? ' selected' : '') + '>Recommandé R1</option>' +
        '<option value="R2"' + (defEnvoi === 'R2' ? ' selected' : '') + '>Recommandé R2</option>' +
        '<option value="R3"' + (defEnvoi === 'R3' ? ' selected' : '') + '>Recommandé R3</option></select></div>';

    // Commentaire
    html += '<div class="admin-insc-form-field"><label>Commentaire</label><textarea id="admin-insc-commentaire" rows="2">' + escapeHtml(defCommentaire) + '</textarea></div>';

    // Boutons
    html += '<div class="admin-insc-form-actions">';
    if (isEdit) {
        html += '<button onclick="submitAdminEditInscription(' + editInscription.id + ')" class="admin-modal-btn admin-modal-btn-primary"><i class="fa-solid fa-check"></i> Enregistrer</button>';
    } else {
        html += '<button onclick="submitAdminAddInscription()" class="admin-modal-btn admin-modal-btn-primary"><i class="fa-solid fa-check"></i> Inscrire</button>';
    }
    html += '<button onclick="cancelAdminInscriptionForm()" class="admin-modal-btn admin-modal-btn-secondary">Annuler</button>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
    container.style.display = '';
    container.scrollIntoView({ behavior: 'smooth' });
}

function filtrerAdminMembresModal() {
    var searchInput = document.getElementById('admin-insc-membre-search');
    var selectEl = document.getElementById('admin-insc-membre-email');
    if (!searchInput || !selectEl || !adminMembresCache) return;

    var terme = searchInput.value.toLowerCase().trim();
    var emailsInscrits = {};
    adminCurrentInscriptions.forEach(function(ins) {
        emailsInscrits[ins.membre_email] = true;
    });

    var html = '<option value="">— Sélectionner un membre —</option>';
    adminMembresCache.forEach(function(m) {
        if (emailsInscrits[m.email]) return;
        var label = ((m.nom || '') + ' ' + (m.prenom || '')).trim() || m.email;
        var searchable = (label + ' ' + m.email).toLowerCase();
        if (terme && searchable.indexOf(terme) === -1) return;
        html += '<option value="' + m.email + '">' + escapeHtml(label) + ' (' + escapeHtml(m.email) + ')</option>';
    });
    selectEl.innerHTML = html;
}

function cancelAdminInscriptionForm() {
    var container = document.getElementById('admin-insc-form-container');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

function submitAdminAddInscription() {
    var selectEl = document.getElementById('admin-insc-membre-email');
    if (!selectEl || !selectEl.value) {
        showToast('Veuillez sélectionner un membre', 'error');
        return;
    }
    var email = selectEl.value;
    var normauxEl = document.getElementById('admin-insc-nb-normaux');
    var nbNormaux = normauxEl ? parseInt(normauxEl.value) || 0 : 0;
    var variantesEl = document.getElementById('admin-insc-nb-variantes');
    var nbVariantes = variantesEl ? parseInt(variantesEl.value) || 0 : 0;

    if (nbNormaux + nbVariantes === 0) {
        showToast('Sélectionnez au moins un billet', 'error');
        return;
    }

    // Demande #16 — l'inscription porte sur la collecte principale du billet
    var collecteInsc = collectePrincipaleBilletAdmin(adminCurrentBilletId);
    if (!collecteInsc) {
        showToast('Ce billet n\'a pas de collecte : créez-en une avant d\'inscrire un membre', 'error');
        return;
    }

    // Snapshot adresse du membre
    var membre = null;
    if (adminMembresCache) {
        for (var i = 0; i < adminMembresCache.length; i++) {
            if (adminMembresCache[i].email === email) {
                membre = adminMembresCache[i];
                break;
            }
        }
    }
    var adresseSnapshot = {};
    if (membre) {
        adresseSnapshot = {
            nom: membre.nom || '',
            prenom: membre.prenom || '',
            rue: membre.rue || '',
            code_postal: membre.code_postal || '',
            ville: membre.ville || '',
            pays: membre.pays || ''
        };
    }

    var body = {
        billet_id: adminCurrentBilletId,
        collecte_id: collecteInsc.id,
        membre_email: email,
        nb_normaux: nbNormaux,
        nb_variantes: nbVariantes,
        mode_paiement: document.getElementById('admin-insc-paiement').value,
        mode_envoi: document.getElementById('admin-insc-envoi').value,
        commentaire: (document.getElementById('admin-insc-commentaire').value || '').trim(),
        adresse_snapshot: adresseSnapshot,
        statut_paiement: 'non_paye',
        envoye: false,
        fdp_regles: false
    };

    supabaseFetch('/rest/v1/inscriptions', {
        method: 'POST',
        body: JSON.stringify(body)
    })
    .then(function() {
        showToast('Membre inscrit avec succès !', 'success');
        cancelAdminInscriptionForm();
        // Recharger les compteurs depuis l'API (le cache stocke des objets, pas des nombres)
        loadAdminInscriptionCounts();
        // Recharger la liste des inscriptions dans la modale
        openInscriptionsModal(adminCurrentBilletId);
    })
    .catch(function(error) {
        console.error('Erreur inscription:', error);
        if (error.message && error.message.indexOf('unique') !== -1) {
            showToast('Ce membre est déjà inscrit à cette collecte', 'error');
        } else {
            showToast('Erreur lors de l\'inscription', 'error');
        }
    });
}

function submitAdminEditInscription(inscriptionId) {
    var normauxEl = document.getElementById('admin-insc-nb-normaux');
    var nbNormaux = normauxEl ? parseInt(normauxEl.value) || 0 : 0;
    var variantesEl = document.getElementById('admin-insc-nb-variantes');
    var nbVariantes = variantesEl ? parseInt(variantesEl.value) || 0 : 0;

    if (nbNormaux + nbVariantes === 0) {
        showToast('Sélectionnez au moins un billet', 'error');
        return;
    }

    var body = {
        nb_normaux: nbNormaux,
        nb_variantes: nbVariantes,
        mode_paiement: document.getElementById('admin-insc-paiement').value,
        mode_envoi: document.getElementById('admin-insc-envoi').value,
        commentaire: (document.getElementById('admin-insc-commentaire').value || '').trim()
    };

    supabaseFetch('/rest/v1/inscriptions?id=eq.' + inscriptionId, {
        method: 'PATCH',
        body: JSON.stringify(body)
    })
    .then(function() {
        showToast('Inscription modifiée !', 'success');
        cancelAdminInscriptionForm();
        openInscriptionsModal(adminCurrentBilletId);
    })
    .catch(function(error) {
        console.error('Erreur modification inscription:', error);
        showToast('Erreur lors de la modification', 'error');
    });
}

function confirmAdminDeleteInscription(inscriptionId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) return;

    supabaseFetch('/rest/v1/inscriptions?id=eq.' + inscriptionId, {
        method: 'DELETE'
    })
    .then(function() {
        showToast('Inscription supprimée', 'success');
        // Recharger les compteurs depuis l'API (le cache stocke des objets, pas des nombres)
        loadAdminInscriptionCounts();
        openInscriptionsModal(adminCurrentBilletId);
    })
    .catch(function(error) {
        console.error('Erreur suppression inscription:', error);
        showToast('Erreur lors de la suppression', 'error');
    });
}

// ============================================================
// STORY 12.3 — GESTION DES COLLECTES SUPPLÉMENTAIRES
// ============================================================

// Demande #16 — collectes du billet actuellement ouvert dans le panel. Sert à
// savoir si le statut du billet est encore saisissable (0 collecte) ou dérivé.
var currentBilletCollectes = [];

// Demande #38 — id de la collecte en cours d'édition dans le formulaire réutilisé
// (null = mode « ajout d'une collecte »).
var editingCollecteId = null;

function billetAucuneCollecte() {
    return currentBilletCollectes.length === 0;
}

// Active ou verrouille le select de statut selon la présence de collectes.
function refreshStatutBilletUI() {
    var select = document.getElementById('field-categorie');
    var msgDerive = document.getElementById('statut-derive-msg');
    var msgManuel = document.getElementById('statut-manuel-msg');
    var derive = !billetAucuneCollecte();
    if (select) select.disabled = derive;
    if (msgDerive) msgDerive.style.display = derive ? '' : 'none';
    if (msgManuel) msgManuel.style.display = derive ? 'none' : '';
}

function loadCollectesForBillet(billetId) {
    if (!billetId) return;
    var container = document.getElementById('collectes-list');
    if (container) container.innerHTML = '<p style="font-style:italic; color: var(--color-text-light, #666);">Chargement...</p>';
    supabaseFetch('/rest/v1/collectes?billet_id=eq.' + billetId + '&order=created_at.asc')
        .then(function(data) {
            currentBilletCollectes = data || [];
            // #35 — sur la page dédiée, adminCollectesByBillet n'est pas chargé
            // (pas de liste) : on le garnit pour ce billet (collectePrincipaleBilletAdmin).
            adminCollectesByBillet[billetId] = currentBilletCollectes;
            refreshStatutBilletUI();
            renderCollectesList(currentBilletCollectes, billetId);
        })
        .catch(function(error) {
            console.error('Erreur chargement collectes:', error);
            var c = document.getElementById('collectes-list');
            if (c) c.innerHTML = '<p style="color: var(--color-danger);">Erreur de chargement.</p>';
        });
}

function renderCollectesList(collectes, billetId) {
    var container = document.getElementById('collectes-list');
    if (!container) return;
    if (!collectes || collectes.length === 0) {
        // Demande #16 — un billet sans collecte est un billet à statut manuel :
        // ce n'est plus un cas exotique, c'est l'état de départ.
        container.innerHTML = '<p class="collectes-empty">Aucune collecte : le statut du billet se saisit à la main. Créez une pré-collecte ci-dessous pour lancer le cycle.</p>';
        return;
    }
    var html = collectes.map(function(c) {
        // Demande #16 — l'état vient de categorie (source du statut du billet),
        // plus de la seule présence d'une date de fin.
        var isOpen = c.categorie !== 'Terminé';
        var statusClass = isOpen ? 'ouverte' : 'cloturee';
        var statusLabel = c.categorie || 'Sans statut';
        var estPreCollecte = c.categorie === 'Pré collecte';
        var prixHtml = '';
        if (c.prix !== null && c.prix !== undefined && c.prix !== '') {
            prixHtml = '<span class="collecte-meta">' + parseFloat(c.prix).toFixed(2) + ' €'
                + ((c.prix_variante !== null && c.prix_variante !== undefined && c.prix_variante !== '')
                    ? ' / ' + parseFloat(c.prix_variante).toFixed(2) + ' € var.' : '')
                + (c.payer_fdp === 'oui' ? ' + FDP' : '') + '</span>';
        }
        // Demande #24 — plafond de billets (nb_max) + compte courant si disponible
        var capaciteHtml = '';
        if (c.nb_max !== null && c.nb_max !== undefined) {
            var cnt = adminCollecteInscriptionCounts[c.id];
            var totalBillets = cnt ? (cnt.normaux || 0) + (cnt.variantes || 0) : null;
            var plein = totalBillets !== null && totalBillets >= c.nb_max;
            capaciteHtml = '<span class="collecte-badge-capacite' + (plein ? ' collecte-badge-capacite--plein' : '') + '">'
                + (totalBillets !== null ? totalBillets + ' / ' : 'max ') + c.nb_max + ' billet(s)'
                + (plein ? ' — complète' : '') + '</span>';
        }
        return '<div class="collecte-item" data-collecte-id="' + c.id + '">' +
            '<span class="collecte-badge-nom collecte-scope-' + escapeAttr(c.scope || '') + '">' + escapeHtml(c.nom || '') + '</span>' +
            '<span class="collecte-badge-status ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
            capaciteHtml +
            '<span class="collecte-meta">' + escapeHtml(c.collecteur || '—') + '</span>' +
            prixHtml +
            // Demande #38 — modifier une collecte existante (prix, dates, collecteur, statut…)
            '<button type="button" class="btn-modifier-collecte" data-collecte-id="' + c.id + '" data-billet-id="' + (billetId || '') + '">Modifier</button>' +
            (isOpen ? '<button type="button" class="btn-cloturer-collecte" data-collecte-id="' + c.id + '" data-billet-id="' + (billetId || '') + '">Clôturer</button>' : '') +
            // B6 / AM4 — abandon d'une pré-collecte : on la supprime, le billet
            // retombe en « Pas de collecte » via la dérivation.
            (estPreCollecte ? '<button type="button" class="btn-supprimer-collecte" data-collecte-id="' + c.id + '" data-billet-id="' + (billetId || '') + '" data-collecte-nom="' + escapeAttr(c.nom || '') + '">Supprimer la pré-collecte</button>' : '') +
            '</div>';
    }).join('');
    container.innerHTML = html;
}

function validateCollecteForm() {
    var nomEl = document.getElementById('field-collecte-nom');
    var scopeEl = document.getElementById('field-collecte-scope');
    var errorNom = document.getElementById('error-collecte-nom');
    var errorScope = document.getElementById('error-collecte-scope');
    var valid = true;

    if (errorNom) errorNom.textContent = '';
    if (errorScope) errorScope.textContent = '';
    if (nomEl && nomEl.closest('.admin-form-group')) nomEl.closest('.admin-form-group').classList.remove('has-error');
    if (scopeEl && scopeEl.closest('.admin-form-group')) scopeEl.closest('.admin-form-group').classList.remove('has-error');

    if (!nomEl || nomEl.value.trim() === '') {
        if (errorNom) errorNom.textContent = 'Le nom est obligatoire';
        if (nomEl && nomEl.closest('.admin-form-group')) nomEl.closest('.admin-form-group').classList.add('has-error');
        valid = false;
    }
    if (!scopeEl || scopeEl.value === '') {
        if (errorScope) errorScope.textContent = 'Le scope est obligatoire';
        if (scopeEl && scopeEl.closest('.admin-form-group')) scopeEl.closest('.admin-form-group').classList.add('has-error');
        valid = false;
    }

    // Demande #16 — règles de prix reprises du formulaire billet (Story 9.6/9.9),
    // désormais portées par la collecte et pilotées par son scope.
    var catEl = document.getElementById('field-collecte-categorie');
    var prixEl = document.getElementById('field-collecte-prix');
    var prixVarEl = document.getElementById('field-collecte-prix-variante');
    var scope = scopeEl ? scopeEl.value : '';
    var categorie = catEl ? catEl.value : '';
    setFieldError('field-collecte-prix', 'error-collecte-prix', '');
    setFieldError('field-collecte-prix-variante', 'error-collecte-prix-variante', '');

    function nombrePositifInvalide(el) {
        return el && el.value !== '' && (isNaN(parseFloat(el.value)) || parseFloat(el.value) < 0);
    }
    if (nombrePositifInvalide(prixEl)) {
        setFieldError('field-collecte-prix', 'error-collecte-prix', 'Le prix doit être un nombre positif');
        valid = false;
    }
    if (nombrePositifInvalide(prixVarEl)) {
        setFieldError('field-collecte-prix-variante', 'error-collecte-prix-variante', 'Le prix variante doit être un nombre positif');
        valid = false;
    }
    // À partir de « Collecte », le prix de chaque version ouverte est obligatoire,
    // et le collecteur aussi (demande #16 : le collecteur vit sur la collecte).
    if (categorie === 'Collecte') {
        if (scope !== 'variante' && (!prixEl || prixEl.value === '')) {
            setFieldError('field-collecte-prix', 'error-collecte-prix', 'Le prix est obligatoire à partir du statut Collecte');
            valid = false;
        }
        if (scope === 'variante' && (!prixVarEl || prixVarEl.value === '')) {
            setFieldError('field-collecte-prix-variante', 'error-collecte-prix-variante', 'Le prix variante est obligatoire à partir du statut Collecte');
            valid = false;
        }
        var collEl = document.getElementById('field-collecte-collecteur');
        if (!collEl || collEl.value === '') {
            setFieldError('field-collecte-collecteur', 'error-collecte-collecteur', 'Le collecteur est obligatoire à partir du statut Collecte');
            valid = false;
        }
    }
    return valid;
}

// Demande #16 — équivalent collecte des Stories 9.6 / 9.9 : le prix variante ne
// s'affiche que si le scope l'ouvre, et rien ne se saisit en pré-collecte.
function toggleCollectePrixFields() {
    var catEl = document.getElementById('field-collecte-categorie');
    var scopeEl = document.getElementById('field-collecte-scope');
    var prixEl = document.getElementById('field-collecte-prix');
    var prixVarEl = document.getElementById('field-collecte-prix-variante');
    var groupPrixVar = document.getElementById('group-collecte-prix-variante');
    var msgEl = document.getElementById('collecte-prix-precollecte-msg');
    if (!catEl || !prixEl) return;

    var scope = scopeEl ? scopeEl.value : '';
    var isPreCollecte = (catEl.value === 'Pré collecte');

    // Prix normal : masqué si la collecte ne porte que la variante
    var groupPrix = prixEl.closest('.admin-form-group');
    if (groupPrix) groupPrix.style.display = (scope === 'variante') ? 'none' : '';
    // Prix variante : visible seulement si le scope l'ouvre
    if (groupPrixVar) groupPrixVar.style.display = (scope === 'variante' || scope === 'les_deux') ? '' : 'none';

    prixEl.disabled = isPreCollecte;
    if (prixVarEl) prixVarEl.disabled = isPreCollecte;
    if (isPreCollecte) {
        prixEl.value = '';
        if (prixVarEl) prixVarEl.value = '';
    }
    if (msgEl) msgEl.style.display = isPreCollecte ? '' : 'none';
}

function saveCollecte(billetId) {
    var getValue = function(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };
    var nbMaxRaw = getValue('field-collecte-nb-max');
    var nbMax = nbMaxRaw !== '' ? parseInt(nbMaxRaw, 10) : null;
    if (nbMax !== null && (isNaN(nbMax) || nbMax < 1)) nbMax = null;
    var payerFdpEl = document.getElementById('field-collecte-payer-fdp');
    var body = {
        billet_id: parseInt(billetId, 10),
        nom: getValue('field-collecte-nom'),
        scope: getValue('field-collecte-scope'),
        // Demande #16 — categorie pilote le statut du billet (dérivation) et
        // prix/FDP quittent le billet pour vivre ici.
        categorie: getValue('field-collecte-categorie') || 'Pré collecte',
        prix: getValue('field-collecte-prix') ? parseFloat(getValue('field-collecte-prix')) : null,
        prix_variante: getValue('field-collecte-prix-variante') ? parseFloat(getValue('field-collecte-prix-variante')) : null,
        payer_fdp: payerFdpEl && payerFdpEl.checked ? 'oui' : '',
        fdp_com: getValue('field-collecte-fdp-com'),
        collecteur: getValue('field-collecte-collecteur') || null,
        date_pre: getValue('field-collecte-date-pre') || null,
        date_coll: getValue('field-collecte-date-coll') || null,
        date_fin: getValue('field-collecte-date-fin') || null,
        nb_max: nbMax
    };
    supabaseFetch('/rest/v1/collectes', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(body)
    })
    .then(function(data) {
        var nouvelleCollecte = Array.isArray(data) ? data[0] : data;
        showToast('Collecte ajoutée', 'success');

        // Demande #16 (D5/B1) — c'est ici que naissent les pré-inscriptions,
        // masquées par le scope de la collecte et dédupliquées (N1).
        var billet = null;
        for (var i = 0; i < adminBillets.length; i++) {
            if (String(adminBillets[i].id) === String(billetId)) { billet = adminBillets[i]; break; }
        }
        if (billet && nouvelleCollecte && nouvelleCollecte.id) {
            creerAutoInscriptions(billet, nouvelleCollecte);
        }
        var ids = ['field-collecte-nom', 'field-collecte-scope', 'field-collecte-collecteur',
                   'field-collecte-date-pre', 'field-collecte-date-coll', 'field-collecte-date-fin', 'field-collecte-nb-max',
                   'field-collecte-prix', 'field-collecte-prix-variante', 'field-collecte-fdp-com'];
        ids.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        var cbFdp = document.getElementById('field-collecte-payer-fdp');
        if (cbFdp) cbFdp.checked = false;
        var selCat = document.getElementById('field-collecte-categorie');
        if (selCat) selCat.value = 'Pré collecte';
        toggleCollectePrixFields();
        var elDatePre = document.getElementById('field-collecte-date-pre');
        if (elDatePre) elDatePre.value = new Date().toISOString().slice(0, 10);
        var section = document.getElementById('admin-collectes-supplementaires');
        var defaultColl = section ? section.dataset.billetCollecteur : '';
        var selColl = document.getElementById('field-collecte-collecteur');
        if (selColl && defaultColl) selColl.value = defaultColl;
        loadCollectesForBillet(billetId);
        loadAdminCollectes();
    })
    .catch(function(error) {
        console.error('Erreur ajout collecte:', error);
        showToast('Erreur lors de l\'ajout', 'error');
    });
}

// Demande #38 — remet le formulaire de collecte dans son état « ajout » vierge.
function resetCollecteForm() {
    var ids = ['field-collecte-nom', 'field-collecte-scope', 'field-collecte-collecteur',
               'field-collecte-date-pre', 'field-collecte-date-coll', 'field-collecte-date-fin', 'field-collecte-nb-max',
               'field-collecte-prix', 'field-collecte-prix-variante', 'field-collecte-fdp-com'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var cbFdp = document.getElementById('field-collecte-payer-fdp');
    if (cbFdp) cbFdp.checked = false;
    var selCat = document.getElementById('field-collecte-categorie');
    if (selCat) selCat.value = 'Pré collecte';
    toggleCollectePrixFields();
    var elDatePre = document.getElementById('field-collecte-date-pre');
    if (elDatePre) elDatePre.value = new Date().toISOString().slice(0, 10);
    var section = document.getElementById('admin-collectes-supplementaires');
    var defaultColl = section ? section.dataset.billetCollecteur : '';
    var selColl = document.getElementById('field-collecte-collecteur');
    if (selColl && defaultColl) selColl.value = defaultColl;
    // vider les erreurs éventuelles
    ['error-collecte-nom', 'error-collecte-scope', 'error-collecte-prix',
     'error-collecte-prix-variante', 'error-collecte-collecteur'].forEach(function(id) {
        var e = document.getElementById(id); if (e) e.textContent = '';
    });
}

// Demande #38 — pré-remplit le formulaire avec une collecte existante et bascule en
// mode édition (PATCH à l'enregistrement).
function editerCollecte(collecteId) {
    var c = null;
    for (var i = 0; i < currentBilletCollectes.length; i++) {
        if (String(currentBilletCollectes[i].id) === String(collecteId)) { c = currentBilletCollectes[i]; break; }
    }
    if (!c) return;
    editingCollecteId = c.id;

    var setVal = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.value = (v === null || v === undefined) ? '' : v;
    };
    setVal('field-collecte-nom', c.nom);
    setVal('field-collecte-categorie', c.categorie || 'Pré collecte');
    setVal('field-collecte-scope', c.scope || '');
    setVal('field-collecte-collecteur', c.collecteur || '');
    setVal('field-collecte-prix', c.prix);
    setVal('field-collecte-prix-variante', c.prix_variante);
    setVal('field-collecte-fdp-com', c.fdp_com);
    setVal('field-collecte-date-pre', c.date_pre);
    setVal('field-collecte-date-coll', c.date_coll);
    setVal('field-collecte-date-fin', c.date_fin);
    setVal('field-collecte-nb-max', c.nb_max);
    var cbFdp = document.getElementById('field-collecte-payer-fdp');
    if (cbFdp) cbFdp.checked = (c.payer_fdp === 'oui');

    // Le scope n'est pas modifiable après création (il fige les inscriptions).
    var scopeEl = document.getElementById('field-collecte-scope');
    if (scopeEl) scopeEl.disabled = true;
    var scopeHint = document.getElementById('collecte-scope-edit-hint');
    if (scopeHint) scopeHint.style.display = '';

    toggleCollectePrixFields();

    var title = document.getElementById('collecte-form-title');
    if (title) title.textContent = 'Modifier la collecte « ' + (c.nom || '') + ' »';
    var btnAdd = document.getElementById('btn-add-collecte');
    if (btnAdd) btnAdd.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications';
    var btnCancel = document.getElementById('btn-cancel-edit-collecte');
    if (btnCancel) btnCancel.style.display = '';

    var form = document.getElementById('collecte-add-form');
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Demande #38 — sort du mode édition et remet le formulaire en mode « ajout ».
function sortirEditionCollecte() {
    editingCollecteId = null;
    var scopeEl = document.getElementById('field-collecte-scope');
    if (scopeEl) scopeEl.disabled = false;
    var scopeHint = document.getElementById('collecte-scope-edit-hint');
    if (scopeHint) scopeHint.style.display = 'none';
    var title = document.getElementById('collecte-form-title');
    if (title) title.textContent = 'Ajouter une collecte';
    var btnAdd = document.getElementById('btn-add-collecte');
    if (btnAdd) btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter cette collecte';
    var btnCancel = document.getElementById('btn-cancel-edit-collecte');
    if (btnCancel) btnCancel.style.display = 'none';
    resetCollecteForm();
}

// Demande #38 — enregistre les modifications d'une collecte existante (PATCH).
function modifierCollecte(collecteId, billetId) {
    var getValue = function(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };
    var nbMaxRaw = getValue('field-collecte-nb-max');
    var nbMax = nbMaxRaw !== '' ? parseInt(nbMaxRaw, 10) : null;
    if (nbMax !== null && (isNaN(nbMax) || nbMax < 1)) nbMax = null;
    var payerFdpEl = document.getElementById('field-collecte-payer-fdp');
    var body = {
        nom: getValue('field-collecte-nom'),
        // scope verrouillé en édition : on ne le renvoie pas (il ne change pas).
        categorie: getValue('field-collecte-categorie') || 'Pré collecte',
        prix: getValue('field-collecte-prix') ? parseFloat(getValue('field-collecte-prix')) : null,
        prix_variante: getValue('field-collecte-prix-variante') ? parseFloat(getValue('field-collecte-prix-variante')) : null,
        payer_fdp: payerFdpEl && payerFdpEl.checked ? 'oui' : '',
        fdp_com: getValue('field-collecte-fdp-com'),
        collecteur: getValue('field-collecte-collecteur') || null,
        date_pre: getValue('field-collecte-date-pre') || null,
        date_coll: getValue('field-collecte-date-coll') || null,
        date_fin: getValue('field-collecte-date-fin') || null,
        nb_max: nbMax
    };
    supabaseFetch('/rest/v1/collectes?id=eq.' + collecteId, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(body)
    })
    .then(function() {
        showToast('Collecte modifiée', 'success');
        sortirEditionCollecte();
        loadCollectesForBillet(billetId);
        loadAdminCollectes();
    })
    .catch(function(error) {
        console.error('Erreur modification collecte:', error);
        showToast('Erreur lors de la modification', 'error');
    });
}

function cloturerCollecte(collecteId, billetId) {
    supabaseFetch('/rest/v1/collectes?id=eq.' + collecteId, {
        method: 'PATCH',
        // Demande #16 — poser categorie='Terminé' : c'est elle qui fait basculer
        // le statut du billet, date_fin seule ne suffit plus.
        body: JSON.stringify({ categorie: 'Terminé', date_fin: new Date().toISOString().slice(0, 10) })
    })
    .then(function() {
        showToast('Collecte clôturée', 'success');
        loadCollectesForBillet(billetId);
        loadAdminCollectes();
    })
    .catch(function(error) {
        console.error('Erreur clôture collecte:', error);
        showToast('Erreur lors de la clôture', 'error');
    });
}

// ============================================================
// B6 / AM4 — Abandon d'une pré-collecte (demande #16)
// ============================================================
// Le billet s'avère non collectable : on supprime sa pré-collecte, il retombe
// en « Pas de collecte » par dérivation. La FK est en RESTRICT : les
// pré-inscriptions automatiques doivent être purgées d'abord, et la suppression
// est refusée s'il reste la moindre inscription à valeur métier.
function supprimerPreCollecte(collecteId, billetId, nomCollecte) {
    if (!collecteId) return;
    if (!confirm('Supprimer la pré-collecte « ' + (nomCollecte || '') + ' » ?\n\n'
        + 'Les pré-inscriptions automatiques seront supprimées.\n'
        + 'Le billet repassera en « Pas de collecte ».')) return;

    supabaseFetch('/rest/v1/inscriptions?collecte_id=eq.' + collecteId + '&select=id,membre_email,statut_paiement,envoye,fdp_regles,changed_by')
        .then(function(inscriptions) {
            var toutes = inscriptions || [];
            // Définition « valeur métier » alignée sur le trigger D12 côté base.
            var aValeurMetier = toutes.filter(function(i) {
                return (i.statut_paiement && i.statut_paiement !== 'non_paye')
                    || i.envoye === true
                    || i.fdp_regles === true
                    || (i.changed_by || '') !== 'pré-inscription';
            });
            if (aValeurMetier.length > 0) {
                showToast('Suppression refusée : ' + aValeurMetier.length + ' inscription(s) à valeur métier sur cette collecte', 'error');
                return null;
            }
            if (toutes.length === 0) return true;
            // Purge explicite des pré-inscriptions (pas de cascade DB)
            return supabaseFetch('/rest/v1/inscriptions?collecte_id=eq.' + collecteId, { method: 'DELETE' })
                .then(function() { return true; });
        })
        .then(function(ok) {
            if (!ok) return null;
            return supabaseFetch('/rest/v1/collectes?id=eq.' + collecteId, { method: 'DELETE' })
                .then(function() {
                    showToast('Pré-collecte supprimée — billet en « Pas de collecte »', 'success');
                    loadCollectesForBillet(billetId);
                    loadAdminCollectes();
                    loadAdminInscriptionCounts();
                });
        })
        .catch(function(error) {
            console.error('Erreur suppression pré-collecte:', error);
            showToast('Erreur lors de la suppression', 'error');
        });
}

function populateCollecteCollecteurSelect() {
    var select = document.getElementById('field-collecte-collecteur');
    if (!select) return;
    select.length = 1;
    (collecteursList || []).forEach(function(coll) {
        var option = document.createElement('option');
        option.value = coll.alias;
        option.textContent = coll.alias;
        select.appendChild(option);
    });
}
