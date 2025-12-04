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

    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        // Gère le cas où l'url est vide (racine) ou index.html
        const isLoginPage = (page === "login.html");

        if (user) {
            // --- CONNECTÉ ---
            console.log("Connecté : " + user.email);
            
            if (isLoginPage) {
                window.location.href = index.html;
            } else {
                loadMenu(); // Charge le menu
                
                // LEVE LE RIDEAU (Affiche le contenu)
                const appContent = document.getElementById('app-content');
                if (appContent) appContent.style.display = 'block';
            }

        } else {
            // --- NON CONNECTÉ ---
            console.log("Non connecté -> Redirection");
            
            if (!isLoginPage) {
                window.location.href = "login.html";
            } else {
                // Si on est sur le login, on s'assure qu'il est visible (au cas où)
                // Note : login.html n'utilise pas #app-content mais .login-card, donc c'est bon.
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
    firebase.auth().signInWithPopup(provider)
        .catch(error => {
            console.error(error);
            alert("Erreur connexion : " + error.message);
        });
}

function logout() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
    });
}

// ============================================================
// 4. MENU
// ============================================================
function loadMenu() {
    const placeholder = document.getElementById("menu-placeholder");
    if (!placeholder) return;

    fetch("menu.html")
        .then(response => response.text())
        .then(html => {
            placeholder.innerHTML = html;
            highlightActiveLink();
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
