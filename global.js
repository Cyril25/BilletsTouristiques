// ============================================================
// 1. IMPORTS DES FONCTIONS FIREBASE (MODULAIRE V10)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signInWithRedirect, 
    signOut, 
    getRedirectResult, 
    setPersistence, 
    inMemoryPersistence 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";


// ============================================================
// 1b. CONFIGURATION & INITIALISATION
// ============================================================
const firebaseConfig = {
    // VOS CLES RÉELLES SONT DÉJÀ INSÉRÉES ICI
    apiKey: "AIzaSyCZ_uO-eolAZJs6As82aicoSuZYmT-DeaY",
    authDomain: "asso-billet-site.firebaseapp.com",
    projectId: "asso-billet-site",
    storageBucket: "asso-billet-site.appspot.com",
    messagingSenderId: "644448143950",
    appId: "1:644448143950:web:f64ccc8f62883507ea111f"
};

// INITIALISATION
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); 

console.log("Firebase initialisé avec succès (MODULAIRE v10).");

// ============================================================
// 2. NOUVELLE FONCTION : CHARGEMENT STATIQUE DES BILLETS
// ============================================================

// 🚨 URL DE TÉLÉCHARGEMENT DIRECT DE VOTRE FICHIER JSON STATIQUE
const URL_JSON_STATIQUE = "https://drive.google.com/uc?export=download&id=1BTGJyOAOj8kFgrpDcBSol6g3v24qkSWr"; 

/**
 * Charge les données des billets instantanément depuis le fichier JSON statique de Google Drive.
 * Cette fonction élimine le Cold Start du Google Apps Script.
 */
function chargerBillets() {
    // 1. Appel direct et instantané (plus de cold start de GAS)
    fetch(URL_JSON_STATIQUE)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}. Vérifiez le lien Drive.`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Billets chargés instantanément ! Nombre d'éléments :", data.length);
            
            // 🚨 REMPLACEZ PAR VOTRE FONCTION DE TRAITEMENT RÉELLE 
            // Exemple : afficherBillets(data); 
            // Le reste de votre logique d'affichage, filtres et initialisation doit se faire ici.
            
        })
        .catch(error => {
            console.error("Échec du chargement du JSON statique :", error);
            // Afficher un message d'erreur d'interface si nécessaire
        });
}


// ============================================================
// 3. LE VIGILE (SÉCURITÉ & NAVIGATION)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // FIX PERSISTANCE : Réglage en mémoire pour compatibilité avec le mode privé
    setPersistence(auth, inMemoryPersistence)
    .then(() => {
        console.log("Persistance réglée sur NONE.");
    })
    .catch(error => {
        console.warn("Erreur lors du réglage de la persistance:", error.code);
    });

    
    onAuthStateChanged(auth, user => {
        const currentPath = window.location.pathname.split("/").pop() || "index.html";
        const isLoginPage = (currentPath === "login.html");

        if (user) {
            console.log("LOG 1: Utilisateur connecté : " + user.email);
            
            // --- VÉRIFICATION FIRESTORE (WHITELIST) ---
            getDoc(doc(db, "whitelist", user.email))
            .then((docSnapshot) => {
                if (docSnapshot.exists()) {
                    console.log("LOG 3: WHITELIST OK. Accès autorisé.");
                    if (isLoginPage) {
                        window.location.href = "index.html";
                    } else {
                        // Affiche la page protégée
                        const appContent = document.getElementById('app-content');
                        if (appContent) appContent.style.display = 'block';
                        const userInfo = document.getElementById('user-info');
                        if (userInfo) userInfo.innerText = "Utilisateur : " + user.email;
                        
                        // 🚀 CHARGEMENT INSTANTANÉ DES BILLETS APRÈS WHISTELIST
                        chargerBillets(); 
                        
                    }
                } else {
                    // Accès REFUSÉ
                    console.warn("LOG 3: WHITELIST ÉCHEC.");
                    alert("Accès refusé. Votre email n'est pas autorisé.");
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
            if (!isLoginPage) {
                console.log("LOG 0: Détecté non connecté. Redirection vers login.");
                window.location.href = "login.html";
            } else {
                // Affiche le contenu de login
                const loginCard = document.querySelector('.login-card');
                if (loginCard) loginCard.style.display = 'block';

                // LOG 5: Capture l'erreur de redirection (si le jeton est rejeté)
                getRedirectResult(auth).catch(error => {
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
});

// ============================================================
// 4. FONCTIONS AUTH (MODULAIRE)
// ============================================================
function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    
    provider.setCustomParameters({
        'prompt': 'select_account' 
    });

    signInWithRedirect(auth, provider).catch((error) => {
        console.error("Erreur avant la redirection :", error);
    });
}

function logout() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
}

// Rendre les fonctions globales pour qu'elles puissent être appelées depuis le HTML (onclick)
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
