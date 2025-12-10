// ============================================================
// 1. INITIALISATION FIREBASE (VIGILANCE ACCRUE)
// ============================================================

// On vérifie d'abord si la librairie Firebase est bien chargée dans le HTML
if (typeof firebase === 'undefined') {
    console.error("ERREUR CRITIQUE : Les scripts Firebase (app.js et auth.js) ne sont pas chargés dans le HTML avant global.js !");
} else {
    // On ne lance l'initialisation QUE si aucune app n'existe déjà
    if (!firebase.apps.length) {
        // REMPLACEZ LES ... PAR VOS CLES CI-DESSOUS
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
// 1b. CHARGEMENT STATIQUE DES BILLETS (NOUVELLE FONCTION)
// ============================================================

// 🚨 URL STATIQUE DU FICHIER JSON (Google Drive)
const URL_JSON_STATIQUE = "https://drive.google.com/uc?export=download&id=1BTGJyOAOj8kFgrpDcBSol6g3v24qkSWr"; 

/**
 * Charge les données des billets instantanément depuis le fichier JSON statique de Google Drive.
 * Cette fonction remplace l'ancien appel au Google Apps Script.
 */
function chargerBillets() {
    // Appel direct et instantané (plus de cold start de GAS)
    fetch(URL_JSON_STATIQUE)
        .then(response => {
            if (!response.ok) {
                // Si le statut est 404 ou 403, le lien Drive est incorrect ou non public
                throw new Error(`Erreur HTTP: ${response.status}. Vérifiez le lien Drive.`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Billets chargés instantanément ! Nombre d'éléments :", data.length);
            
            // 🚨 LOGIQUE DE TRAITEMENT : Vous devez appeler votre fonction qui traite les données (affichage, filtres, etc.)
            // Exemple : traiterDonneesBillets(data); 
            
        })
        .catch(error => {
            console.error("Échec du chargement du JSON statique :", error);
            // Afficher un message d'erreur d'interface si nécessaire
        });
}


// ============================================================
// 2. LE VIGILE (SÉCURITÉ & NAVIGATION)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {

    // Sécurité supplémentaire
    if (typeof firebase === 'undefined') return;

    const auth = firebase.auth();
    const db = firebase.firestore();

    // On s'assure que la persistance est NONE (NONE est le mode inMemory de la V8)
    // Cela corrige les problèmes de session dans les navigateurs stricts
    auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(function() {
        console.log("Persistance réglée sur NONE.");
    })
    .catch(function(error) {
        console.warn("Erreur lors du réglage de la persistance:", error.code);
    });

    
    auth.onAuthStateChanged(function(user) {
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const isLoginPage = (currentPath === "login.html" || currentPath === "");

        if (user) {
            console.log("LOG 1: Utilisateur connecté : " + user.email);
            
            // --- VÉRIFICATION FIRESTORE (WHITELIST) ---
            db.collection("whitelist").doc(user.email).get()
            .then((doc) => {
                if (doc.exists) {
                    console.log("LOG 3: WHITELIST OK. Accès autorisé.");
                    if (isLoginPage) {
                        window.location.href = "index.html";
                    } else {
                        // Affiche la page protégée
                        const appContent = document.getElementById('app-content');
                        if (appContent) appContent.style.display = 'block';
                        
                        // 🚀 NOUVEL APPEL : CHARGEMENT INSTANTANÉ DES BILLETS
                        chargerBillets();
                        
                    }
                } else {
                    // Accès REFUSÉ
                    console.warn("LOG 3: WHITELIST ÉCHEC.");
                    alert("Accès refusé. Votre email n'est pas autorisé.");
                    auth.signOut().then(() => {
                        window.location.href = "login.html";
                    });
                }
            })
            .catch((error) => {
                console.error("LOG 4: Erreur critique Firestore lors de la vérification :", error);
            });
        
        } else {
            // --- NON CONNECTÉ ---
            if (!isLoginPage) {
                console.log("LOG 0: Détecté non connecté. Redirection vers login.");
                window.location.href = "login.html";
            } else {
                // LOG 5: Capture l'erreur de redirection (si le jeton est rejeté)
                auth.getRedirectResult().catch(function(error) {
                    console.error("LOG 5: Erreur de connexion après redirection :", error);
                    const errorDiv = document.getElementById('error-msg');
                    if (errorDiv) { 
                        errorDiv.innerText = "Erreur de connexion : " + error.message;
                        errorDiv.style.display = 'block';
                    }
                });
            }
        }
    });

    // Chargement du menu
    loadMenu();
});


// ============================================================
// 3. FONCTIONS AUTH
// ============================================================
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    provider.setCustomParameters({
        'prompt': 'select_account' 
    });

    firebase.auth().signInWithRedirect(provider).catch((error) => {
        console.error("Erreur avant la redirection :", error);
    });
}

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
    });
}

// Rendre les fonctions globales pour qu'elles puissent être appelées depuis le HTML (onclick)
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;


// ============================================================
// 4. MENU (Mise à jour)
// ============================================================
function loadMenu() {
    const placeholder = document.getElementById("menu-placeholder");
    if (!placeholder) return;

    fetch("menu.html")
        .then(response => response.text())
        .then(html => {
            // 1. On injecte le HTML
            placeholder.innerHTML = html;

            // 2. On gère le lien actif
            highlightActiveLink();

            // 3. ON AFFICHE L'EMAIL
            const user = firebase.auth().currentUser;
            const emailSpan = document.getElementById("user-email-display");

            // On vérifie si l'utilisateur est là et si le span existe
            if (user && emailSpan) {
                emailSpan.textContent = user.email;


            }
        })
        .catch(err => console.error("Menu introuvable :", err));
}

function highlightActiveLink() {
    let page = window.location.pathname.split("/").pop();
    if(page === "") page = index.html;

    setTimeout(() => {
        const links = document.querySelectorAll(".nav-links a");
        links.forEach(link => {
            if(link.getAttribute("href") === page) link.classList.add("active");
        });
    }, 100);
}

function toggleMenu() {
    const nav = document.getElementById('nav-links');
    if(nav) nav.classList.toggle('active');
}
