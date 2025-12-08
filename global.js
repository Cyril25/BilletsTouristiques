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
    
    // NOUVEAU FIX V8 FINAL : Régler la persistance sur NONE dès le chargement (hors fonction de clic)
    auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(() => {
        console.log("Persistance Firebase réglée sur NONE (compatible mode privé).");
    })
    .catch(error => {
        console.warn("Avertissement : Erreur lors du réglage de la persistance. La session sera courte. Code:", error.code);
    });
    // FIN FIX DE PERSISTANCE
    
    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        const isLoginPage = (page === "login.html" || page === "login");
        
        // Définition des pages protégées 
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const protectedPages = ["index.html", "billets.html", "annuaire.html", "infos-collecteurs.html", "frais-port.html", "contact.html"];
        const isProtectedPage = protectedPages.includes(currentPath);

        if (user) {
            console.log("Utilisateur détecté : " + user.email);

            // --- VÉRIFICATION DANS FIRESTORE ---
            const db = firebase.firestore();

            // On cherche le document qui a pour ID l'email de l'utilisateur
            db.collection("whitelist").doc(user.email).get()
            .then((doc) => {
                if (doc.exists) {
                    // --- C'EST GAGNÉ : IL EST DANS LA LISTE ---
                    console.log("Accès autorisé pour : " + user.email);

                    if (isLoginPage) {
                        window.location.href = "index.html";
                    } else {
                        loadMenu(); 
                        const appContent = document.getElementById('app-content');
                        if (appContent) appContent.style.display = 'block';
                    }
                } else {
                    // --- PERDU : IL N'EST PAS DANS LA LISTE ---
                    console.warn("Accès REFUSÉ. Email inconnu dans la whitelist.");
                    alert("Désolé, votre email (" + user.email + ") n'est pas autorisé.");

                    // On le déconnecte
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
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // FIX COMPATIBILITÉ V8 : La persistance est déjà réglée. On lance la redirection directement.
    provider.setCustomParameters({
        'prompt': 'select_account' 
    });
    
    // On passe à signInWithRedirect (plus robuste que signInWithPopup)
    firebase.auth().signInWithRedirect(provider);
    
    // Note: L'erreur est gérée par getRedirectResult dans onAuthStateChanged.
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
