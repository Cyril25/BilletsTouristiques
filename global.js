// ============================================================
// 1. IMPORTS DES FONCTIONS FIREBASE (MODULAIRE V10)
// ============================================================
// Note: Puisque le chargement se fait par CDN dans le HTML, nous utilisons le global 'firebase'
// pour importer les fonctions spécifiques au lieu des URLs de modules.

const { initializeApp } = firebase;
const { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithRedirect, signOut, getRedirectResult, setPersistence, inMemoryPersistence } = firebase.auth;
const { getFirestore, doc, getDoc } = firebase.firestore;

// ============================================================
// 1b. CONFIGURATION & INITIALISATION
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCZ_uO-eolAZJs6As82aicoSuZYmT-DeaY",
    authDomain: "asso-billet-site.firebaseapp.com",
    projectId: "asso-billet-site",
    storageBucket: "asso-billet-site.appspot.com",
    messagingSenderId: "644448143950",
    appId: "1:644448143950:web:f64ccc8f62883507ea111f"
};

// INITIALISATION (MODULAIRE)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialisé avec succès (MODULAIRE v10).");


// ============================================================
// 2. LE VIGILE (SÉCURITÉ & NAVIGATION)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // onAuthStateChanged (MODULAIRE)
    onAuthStateChanged(auth, user => {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        const isLoginPage = (page === "login.html" || page === "login");
        
        // Définition des pages protégées 
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const protectedPages = ["index.html", "billets.html", "annuaire.html", "infos-collecteurs.html", "frais-port.html", "contact.html"];
        const isProtectedPage = protectedPages.includes(currentPath);

        if (user) {
            console.log("LOG 1: AUTHENTIFICATION RÉUSSIE. Utilisateur détecté : " + user.email);

            // --- VÉRIFICATION DANS FIRESTORE (WHITELIST) ---
            console.log("LOG 2: Lancement de la vérification Whitelist Firestore...");
            
            // getDoc(doc(db, collectionName, docId)) (MODULAIRE)
            getDoc(doc(db, "whitelist", user.email))
            .then((docSnapshot) => {
                if (docSnapshot.exists()) {
                    // Accès autorisé
                    console.log("LOG 3: WHITELIST OK. Accès autorisé.");
                    
                    if (isLoginPage) {
                        window.location.href = "index.html";
                    } else {
                        loadMenu(); 
                        const appContent = document.getElementById('app-content');
                        if (appContent) appContent.style.display = 'block';
                    }
                } else {
                    // Accès REFUSÉ (Pas dans la whitelist)
                    console.warn("LOG 3: WHITELIST ÉCHEC. Email non trouvé dans la liste.");
                    alert("Désolé, votre email (" + user.email + ") n'est pas autorisé.");
                    
                    // signOut (MODULAIRE)
                    signOut(auth).then(() => {
                        window.location.href = "login.html";
                    });
                }
            })
            .catch((error) => {
                console.error("LOG 4: Erreur critique Firestore lors de la vérification :", error);
            });
        
        } else {
            // --- NON CONNECTÉ ---
            console.log("LOG 0: Détecté non connecté. Vérification si page protégée...");
            if (isProtectedPage) {
                console.log("LOG 0b: Page protégée. Redirection vers login.html");
                window.location.href = "login.html";
            } else if (isLoginPage) {
                // Affiche le contenu de login.html
                const appContent = document.getElementById('app-content');
                if (appContent) appContent.style.display = 'block';
                
                // Gérer les erreurs de la redirection (MODULAIRE)
                getRedirectResult(auth).catch(error => {
                    console.error("LOG 5: Erreur de connexion après redirection :", error);
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
// 3. FONCTIONS AUTH (MODULAIRE)
// ============================================================
function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    // FIX RADICAL POUR MODE PRIVÉ / iOS : Changer la persistance (MODULAIRE)
    // inMemoryPersistence est l'équivalent moderne de Auth.Persistence.NONE
    setPersistence(auth, inMemoryPersistence)
    .then(() => {
        // Paramètres pour éviter les problèmes de session
        provider.setCustomParameters({
            'prompt': 'select_account' 
        });

        // Lancer la connexion par redirection (MODULAIRE)
        return signInWithRedirect(auth, provider);
    })
    .catch((error) => {
        console.error("Erreur setPersistence ou Redirection :", error);
        alert("Erreur critique de connexion. Code: " + error.code + ". Veuillez vider votre cache et réessayer.");
    });
}

function logout() {
    // signOut (MODULAIRE)
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
}

// Rendre les fonctions globales pour qu'elles puissent être appelées depuis le HTML (onclick)
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
// -------------------------------------------------------------


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

            // 3. ON AFFICHE L'EMAIL (MODULAIRE)
            const user = auth.currentUser;
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

// Rendre les fonctions globales pour qu'elles puissent être appelées depuis le HTML (onclick)
window.loadMenu = loadMenu;
window.highlightActiveLink = highlightActiveLink;
window.toggleMenu = toggleMenu;
