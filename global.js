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
// 2. LE VIGILE (SÉCURITÉ & NAVIGATION)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // Sécurité supplémentaire
    if (typeof firebase === 'undefined') return;

    const auth = firebase.auth();
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const protectedPages = ["index.html", "billets.html", "annuaire.html", "infos-collecteurs.html", "frais-port.html", "contact.html"];
    const isProtectedPage = protectedPages.includes(currentPath);
    const isLoginPage = currentPath === "login.html";

    auth.onAuthStateChanged(user => {
        const appContent = document.getElementById('app-content');
        
        if (user) {
            // Utilisateur connecté
            if (isLoginPage) {
                // S'il est connecté et sur la page de login, on le redirige vers l'accueil
                window.location.href = "index.html";
            } else {
                // S'il est connecté et sur une page protégée, on affiche le contenu et le menu
                if (appContent) appContent.style.display = 'block';
                loadMenu();
            }
        } else {
            // Utilisateur déconnecté
            if (isProtectedPage) {
                // S'il est déconnecté et sur une page protégée, on le redirige vers le login
                window.location.href = "login.html";
            } else if (isLoginPage) {
                 // S'il est déconnecté et sur la page de login, on affiche le contenu du login
                // Cela est important pour que le bouton de connexion apparaisse.
                if (appContent) appContent.style.display = 'block';
                
                // Gérer le résultat de la redirection (utile pour capter les erreurs après redirection)
                firebase.auth().getRedirectResult().catch(error => {
                    console.error("Erreur de connexion après redirection :", error);
                    const errorDiv = document.getElementById('error-msg');
                    if(errorDiv) {
                        // On affiche le message d'erreur à l'utilisateur
                        errorDiv.textContent = `Erreur de connexion: ${error.message}`;
                        errorDiv.style.display = 'block';
                    }
                });
            }
        }
    });
});

// ============================================================
// 3. AUTHENTIFICATION (Login & Logout)
// ============================================================
// Fonction appelée par le bouton "Se connecter" sur login.html
function loginWithGoogle() {
    if (typeof firebase === 'undefined') return;
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // FIX pour l'erreur "missing initial state": 
    // Passage à signInWithRedirect pour une meilleure compatibilité des navigateurs.
    firebase.auth().signInWithRedirect(provider);
}


// Fonction de déconnexion
function logout() {
    firebase.auth().signOut().then(() => {
        // Rediriger vers la page de connexion après déconnexion réussie
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
