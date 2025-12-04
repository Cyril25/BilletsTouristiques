// ============================================================
// 1. CONFIGURATION FIREBASE (A REMPLIR)
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCZ_uO-eolAZJs6As82aicoSuZYmT-DeaY",
    authDomain: "asso-billet-site.firebaseapp.com",
    projectId: "asso-billet-site",
    storageBucket: "asso-billet-site.appspot.com",
    messagingSenderId: "644448143950",
    appId: "1:644448143950:web:f64ccc8f62883507ea111f"
};

// Initialisation de Firebase (une seule fois)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ============================================================
// 2. LE VIGILE (SÉCURITÉ)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // Si Firebase n'est pas chargé (erreur script), on arrête
    if (typeof firebase === 'undefined') {
        console.error("Erreur : Les scripts Firebase manquent dans le fichier HTML.");
        return;
    }

    const auth = firebase.auth();

    // Cette fonction surveille en permanence si on est connecté ou pas
    auth.onAuthStateChanged(user => {
        // On regarde sur quelle page on est
        const path = window.location.pathname;
        const page = path.split("/").pop();
        const isLoginPage = (page === "login.html");

        if (user) {
            // --- CAS 1 : L'UTILISATEUR EST CONNECTÉ ---
            console.log("Utilisateur identifié : " + user.email);
            
            if (isLoginPage) {
                // S'il est sur la page de connexion, ça ne sert à rien -> Hop, Accueil !
                window.location.href = "index.html";
            } else {
                // S'il est sur une page normale, on charge le menu
                loadMenu(user);
                
                // ET SURTOUT : On lève le rideau (on affiche le contenu caché)
                const appContent = document.getElementById('app-content');
                if (appContent) appContent.style.display = 'block';
            }

        } else {
            // --- CAS 2 : PAS CONNECTÉ (INTRUS OU NOUVEAU) ---
            console.log("Non connecté -> Redirection vers Login");
            
            if (!isLoginPage) {
                // Si ce n'est pas la page de login, on le vire dessus !
                window.location.href = "login.html";
            }
        }
    });
});

// ============================================================
// 3. FONCTIONS DE CONNEXION / DECONNEXION
// ============================================================
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Ouvre la fenêtre pop-up Google
    firebase.auth().signInWithPopup(provider)
        .catch(error => {
            console.error("Erreur login:", error);
            alert("Erreur de connexion : " + error.message);
        });
}

function logout() {
    firebase.auth().signOut().then(() => {
        console.log("Déconnecté");
        window.location.href = "login.html";
    });
}

// ============================================================
// 4. LE MENU AUTOMATIQUE
// ============================================================
function loadMenu(user) {
    const placeholder = document.getElementById("menu-placeholder");
    if (!placeholder) return;

    fetch("menu.html")
        .then(response => response.text())
        .then(html => {
            placeholder.innerHTML = html;
            highlightActiveLink();
        })
        .catch(err => console.error("Impossible de charger le menu :", err));
}

// Petite fonction pour mettre en gras le lien de la page actuelle
function highlightActiveLink() {
    let page = window.location.pathname.split("/").pop();
    if(page === "") page = "index.html"; // Si on est à la racine
    
    // On attend un peu que le menu soit inséré dans le DOM
    setTimeout(() => {
        const links = document.querySelectorAll(".nav-links a");
        links.forEach(link => {
            if(link.getAttribute("href") === page) link.classList.add("active");
        });
    }, 100);
}

// Pour le menu mobile
function toggleMenu() {
    const nav = document.getElementById('nav-links');
    if(nav) nav.classList.toggle('active');
}
