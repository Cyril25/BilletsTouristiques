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
var SUPABASE_URL = 'https://lhwcoybugdsggcclhtgb.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2NveWJ1Z2RzZ2djY2xodGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODY5MzQsImV4cCI6MjA4ODU2MjkzNH0.I1CvqdFT4XPCCfIzJRlYNwKay2MVQ9YBB1_8qfJmQqQ';

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
                    appContent.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-danger, #CC4444);">' +
                        '<i class="fa-solid fa-circle-exclamation" style="font-size:2em;margin-bottom:12px;display:block;"></i>' +
                        '<strong>Erreur de connexion au serveur.</strong><br>' +
                        '<span style="color:var(--color-text-light, #666);">Veuillez rafraichir la page ou reessayer plus tard.</span>' +
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
        supabaseFetch('/rest/v1/inscriptions?membre_email=eq.' + e + '&pas_interesse=eq.false&statut_paiement=eq.non_paye&select=billet_id,nb_normaux,nb_variantes,mode_envoi'),
        supabaseFetch('/rest/v1/collecteurs?email_membre=eq.' + e + '&select=alias'),
        supabaseFetch('/rest/v1/membres?email=eq.' + e + '&select=pays'),
        supabaseFetch('/rest/v1/frais_port?annee=eq.' + annee + '&select=destination,type_envoi,qte_min,qte_max,prix'),
        supabaseFetch('/rest/v1/enveloppes?membre_email=eq.' + e + '&prix_envoi_reel=not.is.null&statut_paiement_port=eq.non_paye&select=prix_envoi_reel')
    ])
    .then(function(res) {
        var inscriptions = res[0] || [];
        var monAlias = (res[1] && res[1][0]) ? res[1][0].alias : null;
        var pays = (res[2] && res[2][0]) ? res[2][0].pays : '';
        var fraisPort = res[3] || [];
        var enveloppesPort = res[4] || [];
        var dest = (pays === 'France') ? 'france' : 'international';

        function findFdp(nb, typeEnvoi) {
            for (var i = 0; i < fraisPort.length; i++) {
                var r = fraisPort[i];
                if (r.destination === dest && r.type_envoi === typeEnvoi && nb >= r.qte_min && nb <= r.qte_max) return parseFloat(r.prix);
            }
            return 0;
        }

        var billetIds = [];
        inscriptions.forEach(function(i) { if (billetIds.indexOf(i.billet_id) === -1) billetIds.push(i.billet_id); });
        var billetsPromise = billetIds.length
            ? supabaseFetch('/rest/v1/billets?id=in.(' + billetIds.join(',') + ')&select=id,Prix,PrixVariante,PayerFDP,Categorie,Collecteur')
            : Promise.resolve([]);

        return billetsPromise.then(function(billets) {
            var bMap = {};
            (billets || []).forEach(function(b) { bMap[b.id] = b; });
            var total = 0;
            inscriptions.forEach(function(insc) {
                var billet = bMap[insc.billet_id];
                if (!billet) return;
                if (billet.Categorie === 'Pré collecte' || billet.Categorie === 'Pas de collecte') return;
                if (monAlias && billet.Collecteur === monAlias) return; // le collecteur est bénéficiaire : il ne se doit rien
                var prix = parseFloat(billet.Prix || 0);
                var prixVar = (billet.PrixVariante !== null && billet.PrixVariante !== undefined && billet.PrixVariante !== '') ? parseFloat(billet.PrixVariante) : prix;
                var nbN = insc.nb_normaux || 0, nbV = insc.nb_variantes || 0;
                var montant = (prix * nbN) + (prixVar * nbV);
                if (billet.PayerFDP === 'oui') {
                    montant += findFdp(nbN + nbV, (insc.mode_envoi || 'Normal').toLowerCase());
                }
                total += montant;
            });
            enveloppesPort.forEach(function(env) { total += parseFloat(env.prix_envoi_reel || 0); });

            var montantEl = document.getElementById('somme-due-montant');
            if (total > 0) {
                if (montantEl) montantEl.textContent = total.toFixed(2).replace('.', ',') + ' €';
                pill.style.display = '';
            } else {
                pill.style.display = 'none';
            }
        });
    })
    .catch(function(err) { console.warn('Erreur calcul somme due:', err); });
}

function loadMenu() {
    var placeholder = document.getElementById("menu-placeholder");
    if (!placeholder) return;

    fetch("menu.html?v=162")
        .then(function(response) { return response.text(); })
        .then(function(html) {
            // 1. On injecte le HTML
            placeholder.innerHTML = html;

            // 2. On gère le lien actif
            highlightActiveLink();

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
                        href: n.lien || 'notifications.html'
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

    Promise.all(promises).then(renderNotifications);
}

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
            var icon = n.type === 'broadcast' ? '<i class="fa-solid fa-bullhorn"></i> ' : '';
            // Une nouveauté : clic = marquer lue (par ce membre) puis naviguer
            var onclick = n.type === 'broadcast'
                ? ' onclick="marquerNotifLue(event, \'' + n.notifId + '\', \'' + notifEscHtml(n.href) + '\')"'
                : '';
            html += '<a class="notif-item" href="' + notifEscHtml(n.href) + '"' + onclick + '>' +
                    '<div class="notif-item-title">' + icon + notifEscHtml(n.title) + '</div>' +
                    '<div class="notif-item-meta">' + notifEscHtml(n.subtitle) + (dateStr ? ' · ' + dateStr : '') + '</div>' +
                    '</a>';
        });
        body.innerHTML = html;
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
