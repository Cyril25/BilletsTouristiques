// ============================================================
// 1. INITIALISATION FIREBASE (VIGILANCE ACCRUE)
// ============================================================

// On vérifie d'abord si la librairie Firebase est bien chargée dans le HTML
if (typeof firebase === 'undefined') {
    console.error("ERREUR CRITIQUE : Les scripts Firebase (app.js et auth.js) ne sont pas chargés dans le HTML avant global.js !");
} else {
    // FIX CRITIQUE: Forcer l'initialisation avec les clés explicites.
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey: "AIzaSyCZ_uO-eolAZJs6As82aicoSuZYmT-DeaY",
            authDomain: "asso-billet-site.firebaseapp.com",
            projectId: "asso-billet-site",
            storageBucket: "asso-billet-site.appspot.com",
            messagingSenderId: "644448143950",
            appId: "1:644448143950:web:f64ccc8f62883507ea111f"
        });
        console.log("Firebase initialisé avec succès (mode explicite).");
    }
}

// ============================================================
// 2. LE VIGILE (SÉCURITÉ & NAVIGATION)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // Sécurité supplémentaire
    if (typeof firebase === 'undefined') return;

    const auth = firebase.auth();

    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        const isLoginPage = (page === "login.html" || page === "login");
        
        // Définition des pages protégées pour une meilleure lisibilité
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const protectedPages = ["index.html", "billets.html", "annuaire.html", "infos-collecteurs.html", "frais-port.html", "contact.html"];
        const isProtectedPage = protectedPages.includes(currentPath);

        if (user) {
            console.log("Utilisateur détecté : " + user.email);

            // --- VÉRIFICATION DANS FIRESTORE ---
            const db = firebase.firestore();
            
            db.collection("whitelist").doc(user.email).get()
            .then((doc) => {
                if (doc.exists) {
                    // Accès autorisé
                    console.log("Accès autorisé pour : " + user.email);
                    
                    if (isLoginPage) {
                        window.location.href = "index.html";
                    } else {
                        loadMenu(); 
                        const appContent = document.getElementById('app-content');
                        if (appContent) appContent.style.display = 'block';
                    }
                } else {
                    // Accès REFUSÉ (Pas dans la whitelist)
                    console.warn("Accès REFUSÉ. Email inconnu dans la whitelist.");
                    alert("Désolé, votre email (" + user.email + ") n'est pas autorisé.");
                    
                    auth.signOut().then(() => {
                        window.location.href = "login.html";
                    });
                }
            })
            .catch((error) => {
                console.error("Erreur lors de la vérification Firestore :", error);
            });
        
        } else {
            // --- NON CONNECTÉ ---
            console.log("Non connecté -> Redirection");
            if (isProtectedPage) {
                window.location.href = "login.html";
            } else if (isLoginPage) {
                // Affiche le contenu de login.html
                const appContent = document.getElementById('app-content');
                if (appContent) appContent.style.display = 'block';
                
                // Gérer les erreurs de la redirection (si l'utilisateur revient du serveur Google sans succès)
                firebase.auth().getRedirectResult().catch(error => {
                    console.error("Erreur de connexion après redirection :", error);
                    const errorDiv = document.getElementById('error-msg');
                    if(errorDiv) {
                        errorDiv.textContent = `Erreur de connexion: ${error.message}. Veuillez réessayer.`;
                        errorDiv.style.display = 'block';
                    }
                });
            }
        }
    });
});

// ============================================================
// 3. FONCTIONS AUTH
// ============================================================
function loginWithGoogle() {
    if (typeof firebase === 'undefined') return;
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // NOUVEAU FIX POUR MODE PRIVÉ / iOS / Stockage bloqué :
    // Utilise setCustomParameters pour forcer une session de connexion propre 
    // et éviter l'erreur "missing initial state".
    provider.setCustomParameters({
        'prompt': 'select_account' 
    });

    // Passage à signInWithRedirect (méthode la plus compatible)
    firebase.auth().signInWithRedirect(provider);
}

function logout() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
    });
}

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
    if(page === "") page = "index.html";
    
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
