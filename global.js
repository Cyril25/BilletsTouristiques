// ============================================================
// 1. INITIALISATION FIREBASE (VIGILANCE ACCRUE)
// ============================================================

// On vérifie d'abord si la librairie Firebase est bien chargée dans le HTML
if (typeof firebase === 'undefined') {
    console.error("ERREUR CRITIQUE : Les scripts Firebase (app.js et auth.js) ne sont pas chargés dans le HTML avant global.js !");
} else {
    // On ne lance l'initialisation QUE si aucune app n'existe déjà
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyCZ_uO-eolAZJs6As82aicoSuZYmT-DeaY",
            authDomain: "asso-billet-site.firebaseapp.com",
            projectId: "asso-billet-site",
            storageBucket: "asso-billet-site.appspot.com",
            messagingSenderId: "644448143950",
            appId: "1:644448143950:web:f64ccc8f62883507ea111f"
        });
        console.log("Firebase initialisé avec succès.");
    }
}

// ============================================================
// 1b. CONFIGURATION SUPABASE
// ============================================================
// Base de production. La clé anon est publique (l'accès est fermé par les
// policies RLS, pas par le secret de la clé) : elle est safe en clair.
var SUPABASE_URL_PROD = 'https://lhwcoybugdsggcclhtgb.supabase.co';
var SUPABASE_URL = SUPABASE_URL_PROD;
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2NveWJ1Z2RzZ2djY2xodGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODY5MzQsImV4cCI6MjA4ODU2MjkzNH0.I1CvqdFT4XPCCfIzJRlYNwKay2MVQ9YBB1_8qfJmQqQ';

// L'environnement est déterminé par la base RÉELLEMENT utilisée (pas par le seul
// chemin) : « pas la prod » ⇔ SUPABASE_URL ≠ URL de prod. Le bandeau ne peut donc
// pas mentir — il reflète exactement la base que toutes les requêtes vont taper.
var BT_ON_PROD = (SUPABASE_URL === SUPABASE_URL_PROD);

if (!BT_ON_PROD) console.warn('[BT] ENVIRONNEMENT DE TEST — base : ' + SUPABASE_URL + ' (PAS la production)');

// ============================================================
// 1c. DESTINATION D'EXPÉDITION (frais de port)
// ============================================================
// Règle métier unique : la destination des frais de port est « france » ou
// « international », déterminée par le pays du membre. Un pays VIDE = France :
// c'est la valeur par défaut, la plupart des membres français ne renseignent
// jamais leur pays (voir profil.html). La comparaison est tolérante à la casse
// et aux espaces. Utilisée partout (catalogue, mes-inscriptions, mes-collectes).
function destinationPays(pays) {
    return (!pays || String(pays).trim().toLowerCase() === 'france') ? 'france' : 'international';
}
window.destinationPays = destinationPays;

// Bandeau visible quand on n'est pas sur la prod (test / copie migrée / autre).
function showEnvBanner() {
    if (BT_ON_PROD) return;                                  // prod → aucun bandeau
    if (document.getElementById('bt-env-banner')) return;    // déjà posé
    if (!document.body) { document.addEventListener('DOMContentLoaded', showEnvBanner); return; }

    var ref = '';
    try { ref = JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1])).ref || ''; } catch (e) {}

    var bar = document.createElement('div');
    bar.id = 'bt-env-banner';
    bar.setAttribute('role', 'status');
    bar.textContent = '🧪 ENVIRONNEMENT DE TEST — vous n’êtes PAS sur la production'
        + (ref ? ' (base ' + ref + ')' : '');
    bar.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
        'background:repeating-linear-gradient(45deg,var(--color-nocollecte),#b71c1c 18px,#8e0000 18px,#8e0000 36px)',
        'color:var(--color-text-inverse)', 'font:700 13px/1.4 system-ui,Segoe UI,Arial,sans-serif',
        'letter-spacing:.02em', 'text-align:center', 'padding:6px 40px',
        'box-shadow:0 2px 6px rgba(0,0,0,.35)', 'pointer-events:none', 'user-select:none'
    ].join(';');

    document.body.appendChild(bar);
    // Décale le contenu pour ne pas masquer le haut de page (menu compris)
    var h = bar.offsetHeight || 30;
    document.body.style.paddingTop = ((parseFloat(getComputedStyle(document.body).paddingTop) || 0) + h) + 'px';
}
showEnvBanner();

// --- Impersonation globale (superadmin uniquement) ---
window.impersonatedEmail = sessionStorage.getItem('impersonatedEmail') || '';
window.getActiveEmail = function() {
    return window.impersonatedEmail || (firebase.auth().currentUser && firebase.auth().currentUser.email) || '';
};

/**
 * Helper : fetch authentifié vers Supabase.
 * Récupère le Firebase ID token et l'envoie en Bearer.
 * @param {string} path - Chemin REST (ex: '/rest/v1/billets?select=*')
 * @param {object} options - Options fetch (method, body, headers supplémentaires)
 * @returns {Promise} - Promise avec les données JSON ou null (204)
 */
function supabaseFetch(path, options) {
    if (!options) options = {};
    // SEC-10 — Verifier que l'utilisateur est connecte avant d'appeler getIdToken
    if (!firebase.auth().currentUser) {
        return Promise.reject(new Error('Non authentifie'));
    }
    return firebase.auth().currentUser.getIdToken(false)
        .then(function(token) {
            var headers = {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            };
            // Fusionner les headers supplémentaires (ex: Prefer)
            if (options.headers) {
                var extra = options.headers;
                for (var key in extra) {
                    if (extra.hasOwnProperty(key)) {
                        headers[key] = extra[key];
                    }
                }
            }
            var fetchOptions = { method: options.method || 'GET', headers: headers };
            if (options.body) fetchOptions.body = options.body;
            return fetch(SUPABASE_URL + path, fetchOptions);
        })
        .then(function(response) {
            // SEC-15 — 204 n'a pas de body, 201 peut en avoir
            if (response.status === 204) return null;
            if (response.status === 201) return response.json().catch(function() { return null; });
            if (!response.ok) {
                return response.text().then(function(text) {
                    var msg = 'Erreur Supabase ' + response.status;
                    try { msg = JSON.parse(text).message || msg; } catch(e) {}
                    throw new Error(msg);
                });
            }
            return response.text().then(function(text) {
                if (!text) return null;
                return JSON.parse(text);
            });
        });
}

// ============================================================
// 1c. COULEURS DE STATUT — SOURCE UNIQUE (demande #44)
// ============================================================
// Auparavant dupliquée dans app-new.js, admin.js et billet.js. global.js étant
// chargé sur toutes les pages, on centralise ici la table + les helpers.
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
// Alias historique (admin) — même source.
function getStatusColor(categorie) { return getCategorieColor(categorie); }
// Demande #47 — couleur du TEXTE d'une pastille de statut. Le jaune « Pré collecte »
// est trop clair pour du blanc : on y met l'olive foncé (#6b6b00) — la valeur la plus
// lisible des trois qui coexistaient, retenue par Cyril — et du blanc partout ailleurs.
// Source unique pour que toutes les pastilles (carte, zone collecte, accordéons du
// catalogue et de la fiche) s'accordent.
function couleurTexteStatut(categorie) {
    return (categorie === 'Pré collecte') ? '#6b6b00' : '#fff';
}
window.couleurTexteStatut = couleurTexteStatut;
// Noir ou blanc selon la luminance du fond.
function getTextColorForBg(hex) {
    if (!hex || hex.charAt(0) !== '#') return '#000';
    var r = parseInt(hex.substr(1, 2), 16);
    var g = parseInt(hex.substr(3, 2), 16);
    var b = parseInt(hex.substr(5, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#000' : '#fff';
}

// ============================================================
// 1c-bis. DEMANDES — ÉTATS, PRIORITÉS ET PUBLICS (source unique, demande #59)
// ------------------------------------------------------------
// Étaient dupliqués dans admin-demandes.js ET demande.js. #59 ajoutant deux
// états, maintenir deux copies coûtait plus cher que centraliser.
//
// LE FLUX. Une demande S ou M va de « Nouvelle » à « Prêt à dev » puis au dev.
// Une demande estimée L AU MOMENT DU TRI passe d'abord par une phase d'analyse :
//
//   Nouvelle → À cadrer → Prêt à analyser → Analyse à valider → Prêt à dev
//            → En cours (dev) → À tester → Terminée
//
// ⚠ « En cours » a CHANGÉ DE SENS en #59 : il désignait la phase d'analyse d'une
// demande L, il désigne maintenant le DÉVELOPPEMENT. L'analyse a ses deux états
// propres. Les demandes qui étaient en `en_cours` au moment de la migration
// (leur analyse écrite, pas encore relue) sont passées en `analyse_a_valider`.
//
// Une ré-estimation de complexité n'éjecte pas du flux : c'est le L du tri qui
// engage l'analyse. Cas vécu : #1 et #22, repassées à M après leur cadrage.
var ETATS = [
    { value: 'nouvelle',          label: 'Nouvelle',          color: '#1976D2' },
    { value: 'a_cadrer',          label: 'À cadrer',          color: '#EF6C00' },
    // Indigo et ambre : les deux plus grands écarts de teinte libres dans la
    // palette existante, pour que les neuf pastilles restent distinguables.
    { value: 'a_analyser',        label: 'Prêt à analyser',   color: '#3949AB' },
    { value: 'analyse_a_valider', label: 'Analyse à valider', color: '#F9A825' },
    { value: 'validee',           label: 'Prêt à dev',        color: '#6A1B9A' },
    { value: 'en_cours',          label: 'En cours (dev)',    color: '#00838F' },
    { value: 'a_tester',          label: 'À tester',          color: '#C2185B' },
    { value: 'terminee',          label: 'Terminée',          color: '#2E7D32' },
    { value: 'abandonnee',        label: 'Abandonnée',        color: '#757575' }
];

// États considérés comme « actifs » (filtre par défaut de la liste).
var ETATS_ACTIFS = ['nouvelle', 'a_cadrer', 'a_analyser', 'analyse_a_valider',
                    'validee', 'en_cours', 'a_tester'];

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

// Une analyse qui attend d'être relue par un admin. C'est le seul état où une
// validation a un sens — et celui qui doit sauter aux yeux dans la liste.
function attendValidationSpec(etat) {
    return etat === 'analyse_a_valider';
}

// ============================================================
// 1d. PÉRIMÈTRE DE VERSIONS D'UNE COLLECTE — SOURCE UNIQUE (demande #46)
// ============================================================
// Depuis #16, ce qu'une collecte vend (version normale, variante, ou les deux)
// est porté par son `scope`, pas par les versions déclarées du billet. Les écrans
// qui testaient encore `billet.VersionNormaleExiste` / `billet.HasVariante`
// ignoraient les quantités et le prix « variante » d'une collecte de scope
// « variante » (ils retombaient sur les « normaux »).
// Règle : le scope décide ; le billet ne fournit que le LIBELLÉ de la variante,
// et sert de repli quand la collecte est inconnue ou n'a pas de scope.
function versionsOuvertesCollecte(billet, collecte) {
    billet = billet || {};
    var scope = (collecte && collecte.scope) || '';
    var libelle = (billet.HasVariante && billet.HasVariante !== 'N') ? billet.HasVariante : '';
    return {
        normale: scope ? (scope !== 'variante') : (billet.VersionNormaleExiste !== false),
        variante: scope ? (scope !== 'normal') : !!libelle,
        libelleVariante: libelle
    };
}
// Union sur plusieurs collectes (un écran peut lister les inscriptions de
// plusieurs collectes du même billet : une colonne s'affiche dès qu'UNE l'ouvre).
function versionsOuvertesCollectes(billet, collectes) {
    var liste = collectes || [];
    if (liste.length === 0) return versionsOuvertesCollecte(billet, null);
    var res = { normale: false, variante: false, libelleVariante: '' };
    liste.forEach(function(c) {
        var v = versionsOuvertesCollecte(billet, c);
        res.normale = res.normale || v.normale;
        res.variante = res.variante || v.variante;
        res.libelleVariante = res.libelleVariante || v.libelleVariante;
    });
    return res;
}
window.versionsOuvertesCollecte = versionsOuvertesCollecte;
window.versionsOuvertesCollectes = versionsOuvertesCollectes;

// ============================================================
// 2. LE VIGILE (SÉCURITÉ & NAVIGATION)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {

    // Sécurité supplémentaire
    if (typeof firebase === 'undefined') return;

    var auth = firebase.auth();

    auth.onAuthStateChanged(function(user) {
        var path = window.location.pathname;
        var page = path.split("/").pop();
        var isLoginPage = (page === "login.html" || page === "login"); // petit fix au cas où

        if (user) {
            console.log("Utilisateur détecté : " + user.email);

            // --- VÉRIFICATION MEMBRES VIA SUPABASE ---
            firebase.auth().currentUser.getIdToken(false)
            .then(function(token) {
                return fetch(
                    SUPABASE_URL + '/rest/v1/membres?email=eq.' + encodeURIComponent(user.email) + '&select=role,statut,demande_at,refuse_motif',
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': 'Bearer ' + token
                        }
                    }
                );
            })
            .then(function(response) {
                if (!response.ok) throw new Error('Erreur Supabase ' + response.status);
                return response.json();
            })
            .then(function(rows) {
                // --- Statut non-actif : en_attente ou refuse ---
                if (rows && rows.length > 0 && rows[0].statut && rows[0].statut !== 'actif') {
                    var statut = rows[0].statut;
                    console.warn('Accès non actif (statut=' + statut + ') pour : ' + user.email);
                    if (isLoginPage) {
                        if (statut === 'en_attente' && typeof window.showStatusPending === 'function') {
                            window.showStatusPending(rows[0].demande_at);
                        } else if (statut === 'refuse' && typeof window.showStatusRefused === 'function') {
                            window.showStatusRefused(rows[0].refuse_motif);
                        }
                    } else {
                        // Sur les autres pages : rediriger vers login pour voir le statut
                        window.location.href = 'login.html';
                    }
                    return;
                }
                if (rows && rows.length > 0) {
                    // --- AUTORISÉ : l'email est dans la table membres ---
                    console.log("Accès autorisé pour : " + user.email);
                    window.userRole = rows[0].role || 'member';
                    // Classe CSS pour les éléments réservés au superadmin (rôle réel, même en impersonation)
                    if (window.userRole === 'superadmin') document.body.classList.add('is-superadmin');

                    // Fire-and-forget : mettre à jour last_active_at
                    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(user.email), {
                        method: 'PATCH',
                        body: JSON.stringify({ last_active_at: new Date().toISOString() })
                    }).catch(function() {});

                    if (isLoginPage) {
                        window.location.href = "index.html";
                    } else {
                        // Guard admin : vérifier si la page requiert le rôle admin
                        // En impersonation, on utilise le rôle effectif (celui du membre impersonné)
                        var guardRole = window.userRole;
                        if (window.impersonatedEmail && (window.userRole === 'superadmin' || window.userRole === 'admin')) {
                            guardRole = 'member'; // sera vérifié ci-dessous via la requête
                        }
                        if (document.body.getAttribute('data-require-admin') === 'true' && guardRole !== 'admin' && guardRole !== 'superadmin') {
                            // En impersonation, on vérifie le rôle réel du membre impersonné
                            if (window.impersonatedEmail) {
                                var activeEmail = window.getActiveEmail();
                                supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(activeEmail) + '&select=role')
                                    .then(function(rows) {
                                        var role = (rows && rows.length > 0) ? rows[0].role || 'member' : 'member';
                                        if (role !== 'admin' && role !== 'superadmin') {
                                            window.location.href = 'index.html';
                                        } else {
                                            loadMenu();
                                            var appContent = document.getElementById('app-content');
                                            if (appContent) appContent.style.display = 'block';
                                        }
                                    })
                                    .catch(function() { window.location.href = 'index.html'; });
                                return;
                            }
                            window.location.href = 'index.html';
                            return;
                        }


                        loadMenu();
                        var appContent = document.getElementById('app-content');
                        if (appContent) appContent.style.display = 'block';
                    }
                } else {
                    // --- Email inconnu de la table membres ---
                    // Si on est sur login.html ET que l'utilisateur a cliqué "Demander un accès"
                    // → afficher le formulaire d'inscription (il reste connecté à Firebase).
                    var wantsSignup = sessionStorage.getItem('wantsSignup') === '1';
                    if (isLoginPage && wantsSignup && typeof window.showSignupForm === 'function') {
                        console.log('Email inconnu + demande d\'accès → affichage formulaire inscription.');
                        window.showSignupForm(user.email);
                        return;
                    }
                    // Sinon : comportement historique (refus + redirection)
                    console.warn("Accès REFUSÉ. Email inconnu dans la table membres.");
                    auth.signOut().then(function() {
                        window.location.href = 'login.html?error=unauthorized';
                    });
                }
            })
            .catch(function(error) {
                console.error("Erreur lors de la vérification membres :", error);
                // SEC-09 — Afficher un message d'erreur au lieu d'une page blanche
                var appContent = document.getElementById('app-content');
                if (appContent) {
                    appContent.style.display = 'block';
                    appContent.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-danger, var(--color-danger));">' +
                        '<i class="fa-solid fa-circle-exclamation" style="font-size:2em;margin-bottom:12px;display:block;"></i>' +
                        '<strong>Erreur de connexion au serveur.</strong><br>' +
                        '<span style="color:var(--color-text-light, var(--color-text-muted));">Veuillez rafraichir la page ou reessayer plus tard.</span>' +
                        '</div>';
                }
            });

        } else {
            // --- NON CONNECTÉ ---
            console.log("Non connecté -> Redirection");
            if (!isLoginPage) {
                window.location.href = "login.html";
            }
        }
    });
});

// ============================================================
// 3. FONCTIONS AUTH
// ============================================================
function loginWithGoogle() {
    if (typeof firebase === 'undefined') return;
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .catch(function(error) {
            console.error(error);
            alert("Erreur connexion : " + error.message);


        });








}

function logout() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().signOut().then(function() {
        window.location.href = "login.html";
    });
}

// ============================================================
// 3b. DICTIONNAIRE DES VARIANTES
// ============================================================
// Codes BDD : NULL = Non renseigné (à vérifier), 'N' = Pas de variante (confirmé),
//             'A' = Anniversaire, 'D' = Doré
// Dictionnaire COMPLET (inclut NULL et N pour les contextes qui veulent expliciter l'état)
window.VARIANTE_LABELS_ALL = {
    '_null': 'Non renseigné',
    'N':     'Pas de variante',
    'A':     'Anniversaire',
    'D':     'Doré'
};
window.VARIANTE_LABELS_ALL_SHORT = {
    '_null': '?',
    'N':     'aucune',
    'A':     'anniv',
    'D':     'dorés'
};

// Vrai si le billet possède effectivement une variante (A/D uniquement)
function hasVarianteActive(code) {
    return !!(code && code !== 'N');
}

// Demande #27 — Statut vacances effectif : actif si coché ET (pas de date de fin OU date non passée).
// La date de fin est incluse (encore en vacances le jour J, inactif à J+1).
window.estEnVacancesEffectif = function(enVacances, jusquAu) {
    if (enVacances !== true) return false;
    if (!jusquAu) return true;
    var today = new Date().toISOString().slice(0, 10);
    return jusquAu >= today;
};

// Demandes #2 / #26 — mapping pays → drapeau emoji (clé normalisée : minuscules, accents retirés)
window._normPays = function(s) {
    return (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
};
window.PAYS_FLAGS = {
    'afrique du sud': '🇿🇦', 'allemagne': '🇩🇪', 'andorre': '🇦🇩', 'arabie saoudite': '🇸🇦',
    'argentine': '🇦🇷', 'armenie': '🇦🇲', 'australie': '🇦🇺', 'autriche': '🇦🇹', 'bahamas': '🇧🇸',
    'bahrein': '🇧🇭', 'belgique': '🇧🇪', 'birmanie': '🇲🇲', 'bresil': '🇧🇷', 'bulgarie': '🇧🇬',
    'cambodge': '🇰🇭', 'canada': '🇨🇦', 'chine': '🇨🇳', 'croatie': '🇭🇷', 'cuba': '🇨🇺',
    'danemark': '🇩🇰', 'egypte': '🇪🇬', 'emirats arabes unis': '🇦🇪', 'espagne': '🇪🇸',
    'estonie': '🇪🇪', 'etats-unis': '🇺🇸', 'finlande': '🇫🇮', 'france': '🇫🇷', 'georgie': '🇬🇪',
    'grande-bretagne': '🇬🇧', 'grece': '🇬🇷', 'haiti': '🇭🇹', 'hongrie': '🇭🇺', 'ile maurice': '🇲🇺',
    'inde': '🇮🇳', 'indonesie': '🇮🇩', 'iraq': '🇮🇶', 'irlande': '🇮🇪', 'islande': '🇮🇸',
    'israel': '🇮🇱', 'italie': '🇮🇹', 'japon': '🇯🇵', 'jordanie': '🇯🇴', 'kosovo': '🇽🇰',
    'koweit': '🇰🇼', 'lettonie': '🇱🇻', 'liban': '🇱🇧', 'libye': '🇱🇾', 'lituanie': '🇱🇹',
    'luxembourg': '🇱🇺', 'madagascar': '🇲🇬', 'malte': '🇲🇹', 'maroc': '🇲🇦', 'mexique': '🇲🇽',
    'monaco': '🇲🇨', 'norvege': '🇳🇴', 'oman': '🇴🇲', 'palestine': '🇵🇸', 'pays-bas': '🇳🇱',
    'perou': '🇵🇪', 'pologne': '🇵🇱', 'portugal': '🇵🇹', 'qatar': '🇶🇦', 'republique tcheque': '🇨🇿',
    'roumanie': '🇷🇴', 'russie': '🇷🇺', 'slovaquie': '🇸🇰', 'slovenie': '🇸🇮', 'suede': '🇸🇪',
    'suisse': '🇨🇭', 'syrie': '🇸🇾', 'thailande': '🇹🇭', 'togo': '🇹🇬', 'turquie': '🇹🇷',
    'ukraine': '🇺🇦', 'vatican': '🇻🇦'
};
window.flagPays = function(pays) {
    return window.PAYS_FLAGS[window._normPays(pays)] || '';
};
// Code pays ISO 2 lettres (FR, BE…) dérivé de l'emoji drapeau.
// Fiable sur tous les navigateurs, contrairement aux emojis drapeaux (non rendus sous Windows).
window.paysCode = function(pays) {
    var emoji = window.flagPays(pays);
    if (!emoji) return '';
    var cps = Array.from(emoji);
    if (cps.length < 2) return '';
    var a = cps[0].codePointAt(0) - 0x1F1E6;
    var b = cps[1].codePointAt(0) - 0x1F1E6;
    if (a < 0 || a > 25 || b < 0 || b > 25) return '';
    return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
};
// Vraie image de drapeau, hébergée dans le repo (flags/<code>.svg), affichée partout (Windows inclus).
window.flagImg = function(pays) {
    var code = window.paysCode(pays);
    if (!code) return '';
    var titre = String(pays == null ? '' : pays).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<img class="pays-flag" src="flags/' + code.toLowerCase() + '.svg" alt="' + code + '" title="' + titre + '" loading="lazy">';
};

// ============================================================
// Demande #63 — Position d'un membre (carte de la page Statistiques)
// ============================================================
// La position affichée sur la carte est celle du CENTRE DE LA COMMUNE, jamais
// celle de la rue : les membres ont donné leur adresse pour recevoir des billets,
// pas pour être pointés sur une carte. On ne géocode donc que le couple
// code postal + ville.
(function() {

    function geoJson(url) {
        return fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function(r) { return r.ok ? r.json() : null; })
            .catch(function() { return null; });
    }

    // Base Adresse Nationale : GeoJSON, coordonnées en [longitude, latitude].
    function posBan(data) {
        var f = data && data.features && data.features[0];
        var c = f && f.geometry && f.geometry.coordinates;
        return (c && c.length === 2) ? { lat: c[1], lng: c[0] } : null;
    }

    function posNominatim(data) {
        var hit = data && data[0];
        return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
    }

    // Clé normalisée de l'adresse géocodée (colonne membres.geo_adresse). Elle dit
    // si la position en base correspond encore à l'adresse courante.
    window.cleGeoAdresse = function(cp, ville, pays) {
        var n = window._normPays; // minuscules, accents retirés
        // Pays vide = France : les 8 cas connus ont tous un code postal français,
        // et la BAN les a tous reconnus.
        return [n(cp), n(ville), n(pays) || 'france'].join('|');
    };

    // Géocode un couple code postal + ville au niveau de la commune.
    // Rend une Promise de {lat, lng} ou de null — elle ne rejette jamais.
    window.geocoderCommune = function(cp, ville, pays) {
        cp = (cp || '').trim();
        ville = (ville || '').trim();
        if (!cp && !ville) return Promise.resolve(null);

        var code = window.paysCode(pays); // ISO2 déduit de la table des drapeaux
        if (!code || code === 'FR') {
            // La BAN est gratuite, sans clé, et son type=municipality donne
            // exactement le centre de commune cherché. Éprouvée sur les 56 adresses
            // françaises existantes : 56 sur 56.
            return geoJson('https://api-adresse.data.gouv.fr/search/?limit=1&type=municipality&q='
                + encodeURIComponent((cp + ' ' + ville).trim())).then(posBan);
        }

        // La BAN ne connaît pas l'étranger : Nominatim, en trois essais de plus en
        // plus tolérants. Le premier suffit le plus souvent, les deux autres
        // rattrapent les champs « ville » bruités — et ils sont la règle plus que
        // l'exception sur ces lignes : « 4300 - WAREMME » (le code postal répété),
        // « MOSTOLES MADRID » (la province collée), voire un code postal faux d'un
        // chiffre que seul le nom de la ville permet de retrouver. Sans cette
        // cascade, 4 des 11 membres étrangers restaient sans point.
        var pc = code.toLowerCase();
        var essais = [
            'postalcode=' + encodeURIComponent(cp) + '&city=' + encodeURIComponent(ville) + '&countrycodes=' + pc,
            'postalcode=' + encodeURIComponent(cp) + '&countrycodes=' + pc,
            'q=' + encodeURIComponent((cp + ' ' + ville + ', ' + (pays || '')).trim())
        ];
        return essais.reduce(function(chaine, params) {
            return chaine.then(function(pos) {
                if (pos) return pos; // déjà trouvé : on n'interroge pas pour rien
                return geoJson('https://nominatim.openstreetmap.org/search?format=json&limit=1&' + params)
                    .then(posNominatim);
            });
        }, Promise.resolve(null));
    };

    // Met à jour la position d'un membre si son adresse a bougé.
    // À appeler APRÈS un enregistrement d'adresse réussi, en MEILLEUR EFFORT : la
    // sauvegarde est déjà confirmée à l'utilisateur, une panne de géocodeur ne doit
    // ni la remettre en cause ni lui être signalée. Le manque se voit là où il
    // compte : le compteur « sans position » sous la carte des stats.
    window.majPositionMembre = function(email) {
        if (!email) return Promise.resolve(null);

        return supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email)
                + '&select=code_postal,ville,pays,latitude,geo_adresse')
            .then(function(rows) {
                var m = rows && rows[0];
                if (!m) return null;

                var cp = (m.code_postal || '').trim();
                var ville = (m.ville || '').trim();
                if (!cp && !ville) return null;

                var cle = window.cleGeoAdresse(cp, ville, m.pays);
                // La position en base correspond déjà à cette adresse : ne pas rappeler
                // le géocodeur (le mode vacances, par exemple, passe par le même PATCH).
                if (m.geo_adresse === cle && m.latitude != null) return null;

                return window.geocoderCommune(cp, ville, m.pays).then(function(pos) {
                    // geo_adresse est écrite même quand la commune est introuvable :
                    // c'est ce qui distingue « essayé, échoué » de « jamais tenté », et
                    // ce qui évite de réinterroger le géocodeur à chaque sauvegarde.
                    return supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email), {
                        method: 'PATCH',
                        body: JSON.stringify({
                            latitude: pos ? pos.lat : null,
                            longitude: pos ? pos.lng : null,
                            geo_adresse: cle
                        })
                    }).then(function() { return pos; });
                });
            })
            .catch(function(err) {
                // Colonnes absentes (migration #63 pas encore jouée), réseau, géocodeur
                // en panne : on n'embête personne avec ça.
                console.warn('Demande #63 — position non mise à jour pour ' + email, err);
                return null;
            });
    };

})();

// Demande #28 / #26 — audience effective (rôle + statut collecteur) de l'identité active.
// On interroge toujours la table membres pour le rôle de l'email actif (impersonné ou réel),
// afin de ne pas dépendre de window.userRole qui peut ne pas être encore défini (course au
// chargement d'une page qui utilise ce helper avant que global.js ait renseigné le rôle).
window.getEffectiveNotifAudience = function() {
    var email = window.getActiveEmail();
    if (!email) return Promise.resolve({ isAdmin: false, isCollecteur: false });
    return supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email) + '&select=role')
        .then(function(rows) { return (rows && rows[0]) ? (rows[0].role || 'member') : 'member'; })
        .catch(function() { return 'member'; })
        .then(function(role) {
            var isAdmin = (role === 'admin' || role === 'superadmin');
            if (isAdmin) return { isAdmin: true, isCollecteur: true };
            return supabaseFetch('/rest/v1/collecteurs?email_membre=eq.' + encodeURIComponent(email) + '&select=alias&limit=1')
                .then(function(rows) { return { isAdmin: false, isCollecteur: !!(rows && rows.length) }; })
                .catch(function() { return { isAdmin: false, isCollecteur: false }; });
        });
};

// Une notif (selon sa cible) est-elle visible pour cette audience ?
window.notifVisiblePour = function(cible, aud) {
    cible = cible || 'tous';
    return cible === 'tous' || aud.isAdmin || (cible === 'collecteurs' && aud.isCollecteur);
};

// Demande #29 — badge de cible d'une notif, pour la page Nouveautés.
// Rien pour 'tous' (cas par défaut, le badge n'apprendrait rien) ; libellé + icône sinon.
// Une cible inconnue est affichée telle quelle plutôt qu'ignorée.
window.NOTIF_CIBLE_BADGES = {
    collecteurs: { label: 'Collecteurs', icone: 'fa-user-group' },
    admins:      { label: 'Admins',      icone: 'fa-user-shield' }
};
window.notifCibleBadge = function(cible) {
    cible = cible || 'tous';
    if (cible === 'tous') return null;
    return window.NOTIF_CIBLE_BADGES[cible] || { label: cible, icone: 'fa-user-tag' };
};
// Libellé long pour variante ACTIVE uniquement ('Anniversaire', 'Doré') ou '' sinon.
// → À utiliser pour les badges ⭐ qui ne doivent apparaître que s'il y a une variante.
function varianteLabel(code) {
    if (!hasVarianteActive(code)) return '';
    return window.VARIANTE_LABELS_ALL[code] || code;
}
// Idem, version courte ('anniv', 'dorés').
function varianteLabelShort(code) {
    if (!hasVarianteActive(code)) return '';
    return window.VARIANTE_LABELS_ALL_SHORT[code] || code;
}
// Libellé pour TOUS les états (y compris NULL et N).
// → À utiliser dans les filtres admin, fiche détail, exports, où on veut expliciter
//   la différence entre « Non renseigné » et « Pas de variante ».
function varianteLabelAny(code) {
    if (code == null) return window.VARIANTE_LABELS_ALL._null;
    return window.VARIANTE_LABELS_ALL[code] || code;
}
function varianteLabelAnyShort(code) {
    if (code == null) return window.VARIANTE_LABELS_ALL_SHORT._null;
    return window.VARIANTE_LABELS_ALL_SHORT[code] || code;
}

// Formate une date stockée (AAAA-MM-JJ ou ISO) au format français JJ/MM/AAAA.
// Renvoie '' si vide/invalide. Sans dépendance au fuseau horaire (parse direct).
window.formatDateFr = function(str) {
    if (!str) return '';
    var s = String(str).trim();
    // Format ISO / AAAA-MM-JJ (éventuellement suivi d'une heure)
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    // Déjà au format JJ/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.substring(0, 10);
    return s;
};

// Copie en presse-papier le texte d'un bloc adresse cliquable. Le wrapper
// doit contenir un <pre> dont textContent sera copié. Confirmation visuelle
// pendant 2s via la classe .adresse-copiee.
window.copierAdresse = function(wrapper, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    var pre = wrapper.querySelector('pre');
    if (!pre || !navigator.clipboard) return;
    navigator.clipboard.writeText(pre.textContent).then(function() {
        wrapper.classList.add('adresse-copiee');
        setTimeout(function() { wrapper.classList.remove('adresse-copiee'); }, 2000);
    });
};

// ============================================================
// 4. MENU (Mise à jour)
// ============================================================

// Ajoute/retire la classe .is-stuck sur la navbar selon le défilement,
// pour renforcer l'ombre et coller proprement le bandeau en haut de l'écran.
function setupStickyNavbar() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;

    function onScroll() {
        // Au-delà de quelques pixels, le bandeau est considéré "collé".
        navbar.classList.toggle('is-stuck', window.scrollY > 8);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // état initial (utile si la page est déjà défilée)
}

// Demande #4 — Calcule ce que le membre doit (billets non payés + frais de port dus)
// et l'affiche dans la barre de menu (pastille à côté de la cloche).
function loadSommeDue() {
    var pill = document.getElementById('somme-due-pill');
    if (!pill) return;
    var email = window.getActiveEmail();
    if (!email) return;
    var annee = new Date().getFullYear();
    var e = encodeURIComponent(email);

    Promise.all([
        // Demande #16 — prix / FDP / collecteur viennent de la collecte (embed
        // PostgREST, même requête, ce code tourne sur chaque page). billets.Collecteur
        // supprimé (bascule collecteur).
        supabaseFetch('/rest/v1/inscriptions?membre_email=eq.' + e + '&pas_interesse=eq.false&statut_paiement=eq.non_paye&select=billet_id,nb_normaux,nb_variantes,mode_envoi,collectes(prix,prix_variante,payer_fdp,categorie,collecteur)'),
        supabaseFetch('/rest/v1/collecteurs?email_membre=eq.' + e + '&select=alias'),
        supabaseFetch('/rest/v1/membres?email=eq.' + e + '&select=pays'),
        supabaseFetch('/rest/v1/frais_port?annee=eq.' + annee + '&select=destination,type_envoi,qte_min,qte_max,prix'),
        supabaseFetch('/rest/v1/enveloppes?membre_email=eq.' + e + '&prix_envoi_reel=not.is.null&statut_paiement_port=eq.non_paye&select=prix_envoi_reel'),
        // Demande #44 — les écarts de prix non réglés. Seules les DETTES comptent :
        // un avoir n'est pas une somme due, le retrancher reviendrait à compenser.
        supabaseFetch('/rest/v1/dettes?membre_email=eq.' + e + '&statut_paiement=eq.non_paye&montant=gt.0&select=montant')
            .catch(function() { return []; })   // migration pas encore jouée : la pastille ne doit pas disparaître
    ])
    .then(function(res) {
        var inscriptions = res[0] || [];
        var monAlias = (res[1] && res[1][0]) ? res[1][0].alias : null;
        var pays = (res[2] && res[2][0]) ? res[2][0].pays : '';
        var fraisPort = res[3] || [];
        var enveloppesPort = res[4] || [];
        var dettesDues = res[5] || [];   // #44
        var dest = destinationPays(pays);

        function findFdp(nb, typeEnvoi) {
            for (var i = 0; i < fraisPort.length; i++) {
                var r = fraisPort[i];
                if (r.destination === dest && r.type_envoi === typeEnvoi && nb >= r.qte_min && nb <= r.qte_max) return parseFloat(r.prix);
            }
            return 0;
        }

        // Les embeds to-one de PostgREST peuvent arriver en objet ou en tableau
        // selon la version : on normalise pour ne pas dépendre de ce détail.
        function embed(v) { return Array.isArray(v) ? (v[0] || null) : (v || null); }

        var total = 0;
        inscriptions.forEach(function(insc) {
            var collecte = embed(insc.collectes);
            if (!collecte) return;
            // Pré collecte = prix pas encore fixé, rien n'est dû
            if (collecte.categorie === 'Pré collecte') return;
            // Le collecteur de la collecte est bénéficiaire : il ne se doit rien
            if (monAlias && collecte.collecteur === monAlias) return;

            var prix = parseFloat(collecte.prix || 0);
            var prixVar = (collecte.prix_variante !== null && collecte.prix_variante !== undefined && collecte.prix_variante !== '') ? parseFloat(collecte.prix_variante) : prix;
            var nbN = insc.nb_normaux || 0, nbV = insc.nb_variantes || 0;
            var montant = (prix * nbN) + (prixVar * nbV);
            // AC26 — comparaison enfin vraie : payer_fdp est normalisé en minuscules
            // au backfill (les 4 billets 'Oui' n'ajoutaient jamais les FDP avant).
            if (collecte.payer_fdp === 'oui') {
                montant += findFdp(nbN + nbV, (insc.mode_envoi || 'Normal').toLowerCase());
            }
            total += montant;
        });
        enveloppesPort.forEach(function(env) { total += parseFloat(env.prix_envoi_reel || 0); });
        dettesDues.forEach(function(d) { total += parseFloat(d.montant || 0); });   // #44

        var montantEl = document.getElementById('somme-due-montant');
        if (total > 0) {
            if (montantEl) montantEl.textContent = total.toFixed(2).replace('.', ',') + ' €';
            pill.style.display = '';
        } else {
            pill.style.display = 'none';
        }
    })
    .catch(function(err) { console.warn('Erreur calcul somme due:', err); });
}

function loadMenu() {
    var placeholder = document.getElementById("menu-placeholder");
    if (!placeholder) return;

    fetch("menu.html?v=201")
        .then(function(response) { return response.text(); })
        .then(function(html) {
            // 1. On injecte le HTML
            placeholder.innerHTML = html;

            // 2. On gère le lien actif
            highlightActiveLink();

            // 2ter. Demande #56 — sous-menus repliables sur telephone
            setupMobileDropdowns();

            // 2quater. Demande #54 — etat du bouton de theme
            majBoutonTheme(themeCourant());

            // 2bis. Bandeau figé : ombre + coins droits dès qu'on scrolle
            setupStickyNavbar();

            // PWA — Afficher le bouton "Installer" si pertinent (iOS ou prompt déjà capturé)
            if (typeof window.__showInstallButtonIfRelevant === 'function') {
                window.__showInstallButtonIfRelevant();
            }

            // Demande #4 — Somme due par le membre, à côté de la cloche
            loadSommeDue();

            // 3. ON AFFICHE L'EMAIL
            var user = firebase.auth().currentUser;
            var emailSpan = document.getElementById("user-email-display");

            // On vérifie si l'utilisateur est là et si le span existe
            if (user && emailSpan) {
                emailSpan.textContent = window.impersonatedEmail || user.email;
                // Bouton impersonation pour superadmin
                if (window.userRole === 'superadmin' && !document.getElementById('global-impersonate-btn')) {
                    var impBtn = document.createElement('button');
                    impBtn.id = 'global-impersonate-btn';
                    impBtn.className = 'btn-impersonate';
                    impBtn.title = 'Se connecter en tant que...';
                    impBtn.innerHTML = '<i class="fa-solid fa-user-secret"></i>';
                    impBtn.onclick = function() { window.showImpersonateModal(); };
                    emailSpan.parentNode.insertBefore(impBtn, emailSpan.nextSibling);
                }
                // Bannière impersonation
                renderImpersonateBanner();
            }

            // STORY 1.2 — Menu conditionnel : afficher les liens admin uniquement pour les admins
            // En mode impersonation, on affiche le menu selon le rôle de la personne impersonnée
            var activeEmail = window.getActiveEmail();
            var menuRolePromise;
            if (window.impersonatedEmail && (window.userRole === 'superadmin' || window.userRole === 'admin')) {
                menuRolePromise = supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(activeEmail) + '&select=role')
                    .then(function(rows) {
                        return (rows && rows.length > 0) ? rows[0].role || 'member' : 'member';
                    })
                    .catch(function() { return 'member'; });
            } else {
                menuRolePromise = Promise.resolve(window.userRole);
            }

            menuRolePromise.then(function(effectiveRole) {
                var adminLinks = document.querySelectorAll('[data-admin-only], .admin-only');
                if (effectiveRole === 'admin' || effectiveRole === 'superadmin') {
                    adminLinks.forEach(function(el) {
                        el.setAttribute('data-admin-only', '');
                        el.classList.remove('admin-only');
                    });
                } else {
                    adminLinks.forEach(function(el) {
                        el.classList.add('admin-only');
                    });
                }

                // QW-1 — Masquer "Mes collectes" pour les non-collecteurs
                supabaseFetch('/rest/v1/collecteurs?email_membre=eq.' + encodeURIComponent(activeEmail) + '&select=id')
                    .then(function(data) {
                        if (!data || data.length === 0) {
                            var collectesLink = document.querySelector('a[href="mes-collectes.html"]');
                            if (collectesLink) collectesLink.style.display = 'none';
                        }
                    })
                    .catch(function() {});

                // Notifications : nouveautés pour tous + demandes d'inscription pour les admins
                refreshNotifications(effectiveRole);
            });
        })
        .catch(function(err) { console.error("Menu introuvable :", err); });
}

// ============================================================
// 4b. NOTIFICATIONS (cloche du menu)
// ============================================================
// Modèle générique : chaque source peut pousser des items dans window.__notifs.
// Sources :
//   - broadcast (tous) : table `notifications`, non encore vues par le membre (Demande #28)
//   - signup_request (admin) : demandes d'inscription en attente
//   - billet_report (admin) : signalements d'erreur sur un billet à l'état `nouveau` (Demande #5)
//   - signalement_traite (auteur) : ses signalements clôturés qu'il n'a pas encore vus (Demande #5)
window.__notifs = [];

function refreshNotifications(effectiveRole) {
    window.__notifs = [];
    var email = window.getActiveEmail();
    var promises = [];

    // Nouveautés (broadcast) — pour tout membre connecté, non encore lues par lui.
    // Filtre selon l'identité EFFECTIVE (rôle + statut collecteur), pour rester fidèle en
    // impersonation : la RLS filtre selon le vrai jeton (superadmin voit tout), donc on
    // ré-applique côté front le filtrage du point de vue de la personne impersonnée.
    if (email) {
        var effIsAdmin = (effectiveRole === 'admin' || effectiveRole === 'superadmin');
        var collecteurPromise = effIsAdmin
            ? Promise.resolve(true)
            : supabaseFetch('/rest/v1/collecteurs?email_membre=eq.' + encodeURIComponent(email) + '&select=alias&limit=1')
                .then(function(rows) { return !!(rows && rows.length); })
                .catch(function() { return false; });

        promises.push(
            Promise.all([
                supabaseFetch('/rest/v1/notifications?select=id,type,titre,texte,lien,cible,created_at&order=created_at.desc'),
                supabaseFetch('/rest/v1/notifications_vues?membre_email=eq.' + encodeURIComponent(email) + '&select=notification_id'),
                collecteurPromise
            ]).then(function(res) {
                var notifs = res[0] || [];
                var vues = {};
                (res[1] || []).forEach(function(v) { vues[v.notification_id] = true; });
                var aud = { isAdmin: effIsAdmin, isCollecteur: res[2] === true };
                notifs.forEach(function(n) {
                    if (vues[n.id]) return; // déjà lue par ce membre
                    if (!window.notifVisiblePour(n.cible, aud)) return; // hors cible pour l'identité effective
                    window.__notifs.push({
                        type: 'broadcast',
                        notifId: n.id,
                        title: n.titre,
                        subtitle: n.texte || '',
                        date: n.created_at,
                        // Demande #46 — le clic mène à la page Nouveautés, ancré sur la
                        // notification, et non plus directement au lien métier : dans la
                        // cloche le texte est tronqué, il faut d'abord pouvoir le lire en
                        // entier. Le lien métier reste accessible, par le bouton « Y aller »
                        // de la carte, qui existe déjà.
                        href: 'notifications.html#notif-' + n.id
                    });
                });
            }).catch(function(e) { console.warn('Notifs nouveautés : échec chargement', e); })
        );
    }

    // Demandes d'inscription — admins uniquement
    if (effectiveRole === 'admin' || effectiveRole === 'superadmin') {
        promises.push(
            supabaseFetch('/rest/v1/membres?statut=eq.en_attente&select=email,prenom,nom,demande_at&order=demande_at.desc')
                .then(function(rows) {
                    (rows || []).forEach(function(r) {
                        window.__notifs.push({
                            type: 'signup_request',
                            title: 'Demande d\'inscription',
                            subtitle: ((r.prenom || '') + ' ' + (r.nom || '')).trim() + ' (' + r.email + ')',
                            date: r.demande_at,
                            href: 'admin-inscriptions.html'
                        });
                    });
                })
                .catch(function(e) { console.warn('Notifs inscription : échec chargement', e); })
        );
    }

    // Demande #5 — Signalements d'erreur sur un billet, à traiter (admins uniquement)
    if (effectiveRole === 'admin' || effectiveRole === 'superadmin') {
        promises.push(
            supabaseFetch('/rest/v1/signalements?etat=eq.nouveau&select=id,billet_ref,motif,created_at&order=created_at.desc')
                .then(function(rows) {
                    (rows || []).forEach(function(s) {
                        window.__notifs.push({
                            type: 'billet_report',
                            title: 'Signalement d\'erreur',
                            subtitle: (s.billet_ref || 'Billet') + ' — ' + window.signalementMotifLabel(s.motif),
                            date: s.created_at,
                            href: 'admin-signalements.html'
                        });
                    });
                })
                .catch(function(e) { console.warn('Notifs signalements : échec chargement', e); })
        );
    }

    // Demande #5 — Réponse à MES signalements (clôturés et pas encore vus).
    // Toujours sur l'email RÉEL : la RLS filtre sur le vrai JWT, pas sur l'identité impersonnée.
    var realEmail = firebase.auth().currentUser && firebase.auth().currentUser.email;
    if (realEmail) {
        promises.push(
            supabaseFetch('/rest/v1/signalements?auteur_email=eq.' + encodeURIComponent(realEmail) +
                          '&etat=in.(traite,rejete)&auteur_vu_at=is.null' +
                          '&select=id,billet_id,billet_ref,etat,reponse_admin,traite_at&order=traite_at.desc')
                .then(function(rows) {
                    (rows || []).forEach(function(s) {
                        window.__notifs.push({
                            type: 'signalement_traite',
                            signalementId: s.id,
                            title: 'Signalement ' + (s.etat === 'traite' ? 'traité' : 'non retenu'),
                            subtitle: (s.billet_ref || 'Billet') + (s.reponse_admin ? ' — ' + s.reponse_admin : ''),
                            date: s.traite_at,
                            href: 'billet.html?id=' + encodeURIComponent(s.billet_id)
                        });
                    });
                })
                .catch(function(e) { console.warn('Notifs mes signalements : échec chargement', e); })
        );
    }

    Promise.all(promises).then(renderNotifications);
}

// Demande #5 — Libellés des motifs de signalement (partagés fiche billet / admin / cloche)
window.SIGNALEMENT_MOTIFS = [
    // Demande #50 — la fiche d'un billet SANS image est desormais atteignable
    // depuis le catalogue : « incorrecte » seul ne decrivait pas ce cas.
    // Libelle seul — le code stocke reste 'image', aucune reprise de donnees.
    { code: 'image',      label: 'Image incorrecte ou manquante' },
    { code: 'infos',      label: 'Nom ou lieu erroné' },
    { code: 'millesime',  label: 'Millésime ou version' },
    { code: 'categorie',  label: 'Catégorie ou thème' },
    { code: 'doublon',    label: 'Billet en double' },
    { code: 'autre',      label: 'Autre' }
];

window.signalementMotifLabel = function(code) {
    for (var i = 0; i < window.SIGNALEMENT_MOTIFS.length; i++) {
        if (window.SIGNALEMENT_MOTIFS[i].code === code) return window.SIGNALEMENT_MOTIFS[i].label;
    }
    return code || '';
};

// Demande #5 — L'auteur acquitte la réponse à son signalement, puis navigue.
// Passe par la fonction SECURITY DEFINER : l'auteur n'a aucun droit d'UPDATE sur la table.
window.marquerSignalementVu = function(e, signalementId, href) {
    if (e) e.preventDefault();
    var dest = href || 'index.html';
    if (!signalementId) { window.location.href = dest; return; }
    supabaseFetch('/rest/v1/rpc/marquer_signalement_vu', {
        method: 'POST',
        body: JSON.stringify({ p_id: signalementId })
    })
    .then(function() { window.location.href = dest; })
    .catch(function() { window.location.href = dest; });
};

// Demande #28 — marquer une nouveauté comme lue (par ce membre) puis naviguer
window.marquerNotifLue = function(e, notifId, href) {
    if (e) e.preventDefault();
    var email = window.getActiveEmail();
    var dest = href || 'notifications.html';
    if (!email || !notifId) { window.location.href = dest; return; }
    supabaseFetch('/rest/v1/notifications_vues', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({ notification_id: notifId, membre_email: email })
    })
    .then(function() { window.location.href = dest; })
    .catch(function() { window.location.href = dest; });
};

function renderNotifications() {
    var badge = document.getElementById('notif-bell-badge');
    var btn = document.getElementById('notif-bell-btn');
    var body = document.getElementById('notif-dropdown-body');
    if (!badge || !btn || !body) return;

    var count = window.__notifs.length;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = '';
        btn.classList.add('has-notifs');
    } else {
        badge.style.display = 'none';
        btn.classList.remove('has-notifs');
    }

    if (count === 0) {
        body.innerHTML = '<p class="notif-empty">Aucune nouvelle notification.</p>';
    } else {
        // Tri par date décroissante, tous types confondus
        var items = window.__notifs.slice().sort(function(a, b) {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        var html = '';
        // Afficher max 5 items, lien "voir tout" en pied
        items.slice(0, 5).forEach(function(n) {
            var dateStr = '';
            if (n.date) {
                try { dateStr = new Date(n.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }); } catch(e) {}
            }
            var icon = n.type === 'broadcast' ? '<i class="fa-solid fa-bullhorn"></i> '
                     : n.type === 'billet_report' ? '<i class="fa-solid fa-flag"></i> '
                     : n.type === 'signalement_traite' ? '<i class="fa-solid fa-flag-checkered"></i> '
                     : '';
            // Une nouveauté : clic = marquer lue (par ce membre) puis naviguer
            // Un signalement clôturé : clic = acquitter (auteur_vu_at) puis naviguer
            var onclick = '';
            if (n.type === 'broadcast') {
                onclick = ' onclick="marquerNotifLue(event, \'' + n.notifId + '\', \'' + notifEscHtml(n.href) + '\')"';
            } else if (n.type === 'signalement_traite') {
                onclick = ' onclick="marquerSignalementVu(event, ' + Number(n.signalementId) + ', \'' + notifEscHtml(n.href) + '\')"';
            }
            html += '<a class="notif-item" href="' + notifEscHtml(n.href) + '"' + onclick + '>' +
                    '<div class="notif-item-title">' + icon + notifEscHtml(n.title) + '</div>' +
                    '<div class="notif-item-meta">' + notifEscHtml(accrocheNotif(n.subtitle)) + (dateStr ? ' · ' + dateStr : '') + '</div>' +   // #46
                    '</a>';
        });
        body.innerHTML = html;
    }

    // Demande #46 — la cloche affichait le texte ENTIER de la notification, illisible sur
    // quelques lignes. On n'y met qu'une accroche : le but est de donner envie d'aller lire.
    function accrocheNotif(txt) {
        var t = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
        return t.length > 110 ? t.slice(0, 109) + '\u2026' : t;
    }

    // Pied toujours présent : accès à la page Nouveautés, même sans notification non lue
    var dropdown = document.getElementById('notif-dropdown');
    var oldFooter = document.getElementById('notif-dropdown-footer');
    if (oldFooter) oldFooter.remove();
    if (dropdown) {
        var footer = document.createElement('div');
        footer.id = 'notif-dropdown-footer';
        footer.className = 'notif-dropdown-footer';
        footer.innerHTML = '<a href="notifications.html">Voir toutes les notifications</a>';
        dropdown.appendChild(footer);
    }
}

function toggleNotifDropdown(e) {
    if (e) e.stopPropagation();
    var dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    var isOpen = dd.style.display !== 'none';
    dd.style.display = isOpen ? 'none' : 'block';

    if (!isOpen) {
        // Fermer au prochain clic hors dropdown
        setTimeout(function() {
            document.addEventListener('click', closeNotifDropdownOnce, { once: true });
        }, 0);
    }
}

function closeNotifDropdownOnce(e) {
    var dd = document.getElementById('notif-dropdown');
    var btn = document.getElementById('notif-bell-btn');
    if (!dd) return;
    if (btn && btn.contains(e.target)) return;
    if (dd.contains(e.target)) {
        // Clic sur un lien de la dropdown : laisser la navigation se faire
        return;
    }
    dd.style.display = 'none';
}

function notifEscHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
        return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
}

// ============================================================
// Demande #56 — Sous-menus repliables sur telephone
// ------------------------------------------------------------
// Sur mobile, les trois groupes etaient toujours deplies : pour un admin, le
// menu faisait une trentaine de lignes d'affilee. On les replie, un seul
// ouvert a la fois — c'est ce qui raccourcit vraiment la liste. Sur grand
// ecran, rien ne change : le survol continue de gouverner les sous-menus.
// ============================================================
// ============================================================
// Demande #54 — Bascule de theme (clair / sombre / automatique)
// ------------------------------------------------------------
// Trois etats, pas deux : l'absence de data-theme signifie "automatique" et
// laisse prefers-color-scheme decider. Le choix vit dans localStorage, donc sur
// l'appareil — c'est ce qui permet au <head> de chaque page de le poser avant
// le premier rendu, sans attendre l'authentification ni clignoter.
// ============================================================
var BT_THEMES = ['auto', 'light', 'dark'];

function themeCourant() {
    try {
        var t = localStorage.getItem('bt-theme');
        return (t === 'light' || t === 'dark') ? t : 'auto';
    } catch (e) {
        return 'auto';
    }
}

function majBoutonTheme(t) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var conf = {
        auto:  ['fa-circle-half-stroke', 'Theme : automatique, selon votre appareil'],
        light: ['fa-sun',                'Theme : clair'],
        dark:  ['fa-moon',               'Theme : sombre']
    }[t] || ['fa-circle-half-stroke', 'Theme'];
    var ic = btn.querySelector('i');
    if (ic) ic.className = 'fa-solid ' + conf[0];
    btn.title = conf[1];
    btn.setAttribute('aria-label', conf[1]);
}

function appliquerTheme(t) {
    if (t === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', t);
    }
    try {
        if (t === 'auto') localStorage.removeItem('bt-theme');
        else localStorage.setItem('bt-theme', t);
    } catch (e) {
        // navigation privee ou stockage refuse : le theme vaut pour la page courante
    }
    majBoutonTheme(t);
}

function cycleTheme() {
    var i = BT_THEMES.indexOf(themeCourant());
    appliquerTheme(BT_THEMES[(i + 1) % BT_THEMES.length]);
}

function setupMobileDropdowns() {
    var nav = document.getElementById('nav-links');
    if (!nav) return;

    var surMobile = function() {
        return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    };

    // Le groupe qui contient la page courante s'ouvre d'emblee : on arrive dans
    // le menu la ou on se trouve. On repart de l'URL et non de la classe
    // .active, que highlightActiveLink() ne pose que 100 ms plus tard.
    var page = window.location.pathname.split('/').pop() || 'index.html';
    var lienCourant = nav.querySelector('.dropdown-content a[href="' + page + '"]');
    if (lienCourant && lienCourant.closest) {
        var groupeCourant = lienCourant.closest('.dropdown');
        if (groupeCourant) groupeCourant.classList.add('open');
    }

    var majAria = function() {
        nav.querySelectorAll('.dropdown').forEach(function(dd) {
            var btn = dd.querySelector('.dropbtn');
            if (btn) btn.setAttribute('aria-expanded', dd.classList.contains('open') ? 'true' : 'false');
        });
    };
    majAria();

    // Delegation : le menu est injecte d'un bloc, un seul ecouteur suffit.
    nav.addEventListener('click', function(e) {
        if (!surMobile()) return;
        var btn = e.target.closest ? e.target.closest('.dropbtn') : null;
        if (!btn) return;

        var dd = btn.closest('.dropdown');
        if (!dd) return;

        var etaitOuvert = dd.classList.contains('open');
        nav.querySelectorAll('.dropdown.open').forEach(function(autre) {
            autre.classList.remove('open');
        });
        if (!etaitOuvert) dd.classList.add('open');

        majAria();
        e.preventDefault();
    });
}

function highlightActiveLink() {
    var page = window.location.pathname.split("/").pop();
    if(page === "") page = "index.html";

    setTimeout(function() {
        // QW-2 — Marquer le lien actif dans la navbar ET les dropdowns
        var links = document.querySelectorAll(".nav-links a");
        links.forEach(function(link) {
            if(link.getAttribute("href") === page) {
                link.classList.add("active");
                // Si le lien actif est dans un dropdown, marquer aussi le bouton parent
                var dropdown = link.closest('.dropdown');
                if (dropdown) {
                    var dropbtn = dropdown.querySelector('.dropbtn');
                    if (dropbtn) dropbtn.classList.add('active');
                }
            }
        });
    }, 100);
}

function toggleMenu() {
    var nav = document.getElementById('nav-links');
    if(nav) nav.classList.toggle('active');
}

// ============================================================
// 5. STORY 5.3 — VERIFICATION PROFIL COMPLET
// ============================================================

/**
 * Vérifie si le profil du membre connecté est complet (5 champs adresse renseignés).
 * Utilisée par Story 5.4 avant inscription.
 * @param {function} callback - Fonction appelée avec un booléen (true = complet)
 */
function isProfilComplet(callback) {
    var email = window.getActiveEmail();
    if (!email) { callback(false); return; }
    supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email) + '&select=nom,prenom,rue,code_postal,ville,pays')
        .then(function(data) {
            if (!data || data.length === 0) { callback(false); return; }
            var m = data[0];
            var complet = m.nom && m.prenom && m.rue && m.code_postal && m.ville && m.pays;
            callback(!!complet);
        })
        .catch(function() { callback(false); });
}

// ============================================================
// 6. SERVICE WORKER (Cache des assets statiques)
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .catch(function(err) { console.warn('Service Worker non enregistré :', err); });
    });
}

// ============================================================
// 6b. PWA — Installation sur l'écran d'accueil
// ============================================================
// Injection du manifest et des meta PWA sur toutes les pages (évite de modifier chaque HTML)
(function injectPwaMeta() {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    function add(tag, attrs) {
        var el = document.createElement(tag);
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        head.appendChild(el);
    }
    if (!document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: 'manifest.json' });
    if (!document.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#5D3A7E' });
    if (!document.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: 'icon.svg' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
    if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) add('meta', { name: 'apple-mobile-web-app-title', content: 'Billets T.' });
})();

// Détection iOS (Safari ne supporte pas beforeinstallprompt)
window.__isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
// Détection mode standalone (déjà installée)
window.__isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

window.__deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    window.__deferredInstallPrompt = e;
    var btn = document.getElementById('btn-install-pwa');
    if (btn) btn.style.display = '';
});
window.addEventListener('appinstalled', function() {
    window.__deferredInstallPrompt = null;
    var btn = document.getElementById('btn-install-pwa');
    if (btn) btn.style.display = 'none';
});

// Affiche le bouton sur iOS (pas de prompt natif → instructions manuelles)
window.__showInstallButtonIfRelevant = function() {
    var btn = document.getElementById('btn-install-pwa');
    if (!btn) return;
    if (window.__isStandalone) { btn.style.display = 'none'; return; }
    if (window.__isIos || window.__deferredInstallPrompt) {
        btn.style.display = '';
    }
};

window.installPwa = function() {
    // Cas iOS : afficher les instructions
    if (window.__isIos) {
        window.showIosInstallInstructions();
        return;
    }
    var p = window.__deferredInstallPrompt;
    if (!p) {
        alert("L'installation n'est pas disponible sur ce navigateur. Essayez Chrome ou Edge, ou utilisez le menu du navigateur \u00ab Installer l'application \u00bb.");
        return;
    }
    p.prompt();
    p.userChoice.then(function(res) {
        if (res && res.outcome === 'accepted') {
            var btn = document.getElementById('btn-install-pwa');
            if (btn) btn.style.display = 'none';
        }
        window.__deferredInstallPrompt = null;
    });
};

window.showIosInstallInstructions = function() {
    if (document.getElementById('ios-install-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'ios-install-overlay';
    overlay.className = 'ios-install-overlay';
    overlay.onclick = function() { overlay.remove(); };
    overlay.innerHTML =
        '<div class="ios-install-modal" onclick="event.stopPropagation()">' +
            '<button class="ios-install-close" onclick="document.getElementById(\'ios-install-overlay\').remove()" aria-label="Fermer">&times;</button>' +
            '<h3><i class="fa-solid fa-mobile-screen"></i> Installer sur l\'écran d\'accueil</h3>' +
            '<p>Sur iPhone / iPad (Safari) :</p>' +
            '<ol>' +
                '<li>Touchez l\'icône <strong>Partager</strong> <i class="fa-solid fa-arrow-up-from-bracket"></i> en bas de l\'écran.</li>' +
                '<li>Faites défiler puis choisissez <strong>« Sur l\'écran d\'accueil »</strong> <i class="fa-regular fa-square-plus"></i>.</li>' +
                '<li>Touchez <strong>« Ajouter »</strong> en haut à droite.</li>' +
            '</ol>' +
            '<p class="ios-install-note">L\'icône Billets Touristiques apparaîtra sur votre écran d\'accueil.</p>' +
        '</div>';
    document.body.appendChild(overlay);
};

// ============================================================
// 7. IMPERSONATION GLOBALE (superadmin uniquement)
// ============================================================

function renderImpersonateBanner() {
    var banner = document.getElementById('global-impersonate-banner');
    if (window.impersonatedEmail) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'global-impersonate-banner';
            banner.className = 'impersonate-banner';
            var body = document.body;
            body.insertBefore(banner, body.firstChild);
        }
        banner.innerHTML = '<i class="fa-solid fa-user-secret"></i> Vue en tant que <strong>' + window.impersonatedEmail + '</strong> ' +
            '<button class="btn-link" onclick="window.stopImpersonate()"><i class="fa-solid fa-xmark"></i> Revenir à mon compte</button>';
        banner.style.display = '';
        document.body.classList.add('has-impersonate-banner');
    } else if (banner) {
        banner.style.display = 'none';
        document.body.classList.remove('has-impersonate-banner');
    }
}

window.showImpersonateModal = function() {
    if (window.userRole !== 'superadmin') return;

    supabaseFetch('/rest/v1/membres?select=email,prenom,nom')
    .then(function(membres) {
        membres.sort(function(a, b) {
            var na = ((a.nom || '') + ' ' + (a.prenom || '')).trim().toLowerCase() || a.email.toLowerCase();
            var nb = ((b.nom || '') + ' ' + (b.prenom || '')).trim().toLowerCase() || b.email.toLowerCase();
            return na.localeCompare(nb);
        });
        var html = '<div class="impersonate-modal-overlay" onclick="window.closeImpersonateModal()">';
        html += '<div class="impersonate-modal" onclick="event.stopPropagation()">';
        html += '<button class="impersonate-modal-close" onclick="window.closeImpersonateModal()">&times;</button>';
        html += '<h2>Se connecter en tant que...</h2>';
        html += '<div class="impersonate-list">';
        var realEmail = firebase.auth().currentUser.email;
        membres.forEach(function(m) {
            var label = ((m.nom || '') + ' ' + (m.prenom || '')).trim() || m.email;
            var isSelf = m.email === realEmail;
            html += '<div class="impersonate-item' + (isSelf ? ' impersonate-item-self' : '') + '" onclick="window.selectImpersonate(\'' + m.email.replace(/'/g, "\\'") + '\')">';
            html += '<strong>' + label + '</strong><br><small>' + m.email + '</small>';
            if (isSelf) html += ' <em>(moi)</em>';
            html += '</div>';
        });
        html += '</div></div></div>';

        var container = document.getElementById('impersonate-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'impersonate-modal-container';
            document.body.appendChild(container);
        }
        container.innerHTML = html;
    })
    .catch(function(err) {
        console.error('Erreur chargement membres:', err);
    });
};

window.closeImpersonateModal = function() {
    var container = document.getElementById('impersonate-modal-container');
    if (container) container.innerHTML = '';
};

window.selectImpersonate = function(email) {
    window.closeImpersonateModal();
    var realEmail = firebase.auth().currentUser.email;
    window.impersonatedEmail = (email === realEmail) ? '' : email;
    sessionStorage.setItem('impersonatedEmail', window.impersonatedEmail);

    // Mettre à jour l'affichage email
    var emailSpan = document.getElementById('user-email-display');
    if (emailSpan) emailSpan.textContent = window.impersonatedEmail || realEmail;

    renderImpersonateBanner();

    // Recharger la page pour appliquer le changement
    window.location.reload();
};

// ── Masques de saisie nom / prénom ──────────────────────────
// Nom → MAJUSCULES, Prénom → Première lettre de chaque mot en majuscule
// Fonctionne sur tout input ayant la classe .input-uppercase ou .input-capitalize,
// y compris ceux injectés dynamiquement (event delegation).
function toUpperCaseValue(val) {
    return val.toUpperCase();
}
function toCapitalizeValue(val) {
    return val.replace(/(^|\s|-|')(\S)/g, function(match, sep, letter) {
        return sep + letter.toUpperCase();
    });
}
document.addEventListener('input', function(e) {
    var el = e.target;
    if (el.tagName !== 'INPUT') return;
    if (el.classList.contains('input-uppercase')) {
        var start = el.selectionStart, end = el.selectionEnd;
        el.value = toUpperCaseValue(el.value);
        el.setSelectionRange(start, end);
    } else if (el.classList.contains('input-capitalize')) {
        var start = el.selectionStart, end = el.selectionEnd;
        el.value = toCapitalizeValue(el.value);
        el.setSelectionRange(start, end);
    }
});

window.stopImpersonate = function() {
    window.impersonatedEmail = '';
    sessionStorage.removeItem('impersonatedEmail');
    var emailSpan = document.getElementById('user-email-display');
    if (emailSpan) emailSpan.textContent = firebase.auth().currentUser.email;
    renderImpersonateBanner();
    window.location.reload();
};
