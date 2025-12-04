// ============================================================
// CONFIGURATION
// ============================================================
const scriptUrl = "https://script.google.com/macros/s/AKfycbzlv-bgfLieBK29R07VN8R2a6Qv1UQmznzSZ_sIYcvgsKkSGz2d-kOXoLCS8zqlrjWp/exec"; 

let allData = [];
let currentData = [];
let displayedCount = 0;
const BATCH_SIZE = 50;
let isFullLoaded = false;

// Référence au slider (div vide dans le HTML)
let dateSlider = document.getElementById('date-slider');

document.addEventListener('DOMContentLoaded', () => { 
    fetchFastThenSlow(); 
});

// ============================================================
// 1. CHARGEMENT DES DONNÉES (RAPIDE PUIS COMPLET)
// ============================================================
function fetchFastThenSlow() {
    const counter = document.getElementById('counter');
    
    // ÉTAPE 1 : Appel rapide (50 derniers billets)
    fetch(scriptUrl + "?limit=50")
        .then(res => res.json())
        .then(data => {
            // Si le chargement complet n'est pas déjà fini
            if (!isFullLoaded) {
                allData = data;
                populateFilters(); 
                applyFilters(false); // false = Reset de l'affichage
                
                if(counter) {
                    counter.innerText = "Chargement suite...";
                    counter.style.backgroundColor = "#fff3cd"; // Jaune
                }
            }
        })
        .then(() => { 
            // ÉTAPE 2 : Appel complet (Arrière-plan)
            return fetch(scriptUrl); 
        })
        .then(res => res.json())
        .then(fullData => {
            console.log("Données complètes reçues :", fullData.length);
            allData = fullData;
            isFullLoaded = true;
            
            // On met à jour les listes déroulantes avec toutes les données
            populateFilters(); 
            
            // --- C'EST ICI QU'ON LANCE LE SLIDER ---
            // Maintenant qu'on a toutes les dates, on peut caler le min et le max
            initSlider(); 
            
            // On applique les filtres en mode silencieux (pour ne pas faire sauter l'écran)
            applyFilters(true); 
            
            if(counter) {
                counter.innerText = allData.length + " billets";
                counter.style.backgroundColor = "#d4edda"; // Vert
            }
        })
        .catch(err => console.error("Erreur chargement :", err));
}

// ============================================================
// 2. GESTION DU SLIDER DATE (NOUISLIDER)
// ============================================================
function initSlider() {
    // Si le div n'existe pas (ex: sur une autre page que billets.html), on arrête
    if (!dateSlider) return;

    // 1. On récupère toutes les dates valides et on les convertit en Timestamp (nombre)
    const dates = allData
        .map(d => normalizeDate(d.Date)) // On nettoie le format
        .filter(d => d.length > 0)       // On enlève les vides
        .map(d => new Date(d).getTime()) // On convertit en millisecondes
        .filter(t => !isNaN(t));         // On enlève les dates invalides

    if (dates.length === 0) return;

    // 2. On trouve le Min et le Max
    const minTimestamp = Math.min(...dates);
    const maxTimestamp = Math.max(...dates);

    // 3. Si le slider existe déjà (re-chargement), on le détruit proprement
    if (dateSlider.noUiSlider) {
        dateSlider.noUiSlider.destroy();
    }

    // 4. Création du slider
    noUiSlider.create(dateSlider, {
        start: [minTimestamp, maxTimestamp], // Poignées au début et à la fin
        connect: true, // Barre colorée entre les deux
        range: {
            'min': minTimestamp,
            'max': maxTimestamp
        },
        step: 24 * 60 * 60 * 1000, // Pas de 1 jour
        tooltips: false // Pas de bulle (on a les inputs en dessous)
    });

    // 5. Quand le slider bouge -> On met à jour les inputs dates
    dateSlider.noUiSlider.on('update', function (values, handle) {
        // values[handle] est un timestamp en string
        const dateObj = new Date(parseInt(values[handle]));
        // On formatte en YYYY-MM-DD pour l'input HTML
        const dateStr = dateObj.toISOString().split('T')[0];
        
        if (handle === 0) {
            document.getElementById('date-start').value = dateStr;
        } else {
            document.getElementById('date-end').value = dateStr;
        }
    });

    // 6. Quand on lâche la souris -> On lance le filtre
    dateSlider.noUiSlider.on('change', function () {
        applyFilters();
    });
}

// Fonction appelée quand on change l'input date à la main
function manualDateChange() {
    const startVal = document.getElementById('date-start').value;
    const endVal = document.getElementById('date-end').value;

    // Si le slider est actif, on met à jour ses poignées
    if(dateSlider && dateSlider.noUiSlider && startVal && endVal) {
        const startTs = new Date(startVal).getTime();
        const endTs = new Date(endVal).getTime();
        dateSlider.noUiSlider.set([startTs, endTs]);
    }
    applyFilters();
}

// ============================================================
// 3. FONCTIONS UTILITAIRES & FILTRES
// ============================================================

// Change l'affichage (Collecte / Liste / Galerie)
function changeView(mode) {
    const container = document.getElementById('app-content');
    container.classList.remove('view-liste', 'view-galerie');
    if (mode === 'liste') container.classList.add('view-liste');
    else if (mode === 'galerie') container.classList.add('view-galerie');
}

// Convertit 25/12/2025 ou 2025-12-25T10:00 en 2025-12-25
function normalizeDate(str) {
    if (!str) return "";
    let clean = str.substring(0, 10); // Enlève l'heure
    // Si format français JJ/MM/AAAA
    if (clean.includes('/')) {
        const parts = clean.split('/');
        if(parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return clean;
}

function populateFilters() {
    const maps = [
        { id: 'sel-cat', key: 'Categorie' },
        { id: 'sel-pays', key: 'Pays' },
        { id: 'sel-year', key: 'Millesime' },
        { id: 'sel-theme', key: 'Theme' },
        { id: 'sel-coll', key: 'Collecteur' }
    ];
    maps.forEach(m => {
        const select = document.getElementById(m.id);
        if(!select) return; // Sécurité si on est sur une autre page
        
        const currentVal = select.value;
        let h = '<option value="">Tout</option>';
        // Récupère valeurs uniques triées
        [...new Set(allData.map(item => item[m.key]).filter(v => v))].sort().forEach(val => {
            h += `<option value="${val}" ${val===currentVal?'selected':''}>${val}</option>`;
        });
        select.innerHTML = h;
    });
}

function applyFilters(silent = false) {
    // Si on est sur une page sans grille (ex: Accueil), on arrête
    if(!document.getElementById('cards-grid')) return;

    const s = document.getElementById('search-input').value.toLowerCase();
    const fCat = document.getElementById('sel-cat').value;
    const fPays = document.getElementById('sel-pays').value;
    const fYear = document.getElementById('sel-year').value;
    const fTheme = document.getElementById('sel-theme').value;
    const fColl = document.getElementById('sel-coll').value;
    
    // Dates (Input text YYYY-MM-DD)
    const fStart = document.getElementById('date-start').value; 
    const fEnd = document.getElementById('date-end').value;

    currentData = allData.filter(item => {
        const txt = !s || (item.NomBillet && item.NomBillet.toLowerCase().includes(s)) ||
                          (item.Ville && item.Ville.toLowerCase().includes(s)) ||
                          (item.Recherche && item.Recherche.toLowerCase().includes(s));
        
        // Comparaison de dates normalisées
        const itemDate = normalizeDate(item.Date);
        const matchDate = (!fStart || (itemDate && itemDate >= fStart)) &&
                          (!fEnd || (itemDate && itemDate <= fEnd));

        return txt && matchDate &&
               (!fCat || item.Categorie === fCat) &&
               (!fPays || item.Pays === fPays) && (!fYear || item.Millesime == fYear) &&
               (!fTheme || item.Theme === fTheme) && (!fColl || item.Collecteur === fColl);
    });

    if (!silent) {
        document.getElementById('cards-grid').innerHTML = ""; 
        displayedCount = 0; 
        showMore();
    } else {
        updateLoadMoreButton();
    }
    
    // Mise à jour compteur global
    const counterBtn = document.getElementById('counter');
    if(isFullLoaded && counterBtn) counterBtn.innerText = currentData.length + " billets";
}

// ============================================================
// 4. RENDU HTML (TEMPLATE)
// ============================================================
function showMore() {
    const grid = document.getElementById('cards-grid');
    const batch = currentData.slice(displayedCount, displayedCount + BATCH_SIZE);
    
    if(batch.length === 0 && displayedCount === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Aucun résultat.</p>";
        updateLoadMoreButton(); return;
    }

    let html = "";
    batch.forEach(item => {
        // Image HD
        const imgUrl = item.ImageId ? `https://drive.google.com/thumbnail?id=${item.ImageId}&sz=w800` : '';
        const downloadLink = item.ImageId ? `https://drive.usercontent.google.com/download?id=${item.ImageId}` : '#';
        const couleur = item.Couleur || '#666'; 

        html += `
        <div class="global-container" style="border-top: 8px solid ${couleur};">
            
            <div class="header-container">
                 <div class="image-bg" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%), url(${imgUrl}) no-repeat; "></div>
                 
                 <div class="category" style="background-color: ${couleur}; color: white;">
                    ${item.Categorie}
                 </div>
                 
                 <div class="header-info">
                     <h1 style="border-bottom: 3px solid ${couleur};">
                        ${item.Ville || ''}
                     </h1>
                 </div>
            </div>
            
            <div class="content">
                <div class="description">
                    ${item.Dep || ''} ${item.Reference || ''} ${item.Millesime || ''}-${item.Version || ''}<br />
                    ${item.Cp || ''} ${item.Ville || ''}<br />
                    ${item.NomBillet || ''}
                </div>
                
                <div class="${item.CollecteCache || ''}">
                    Par ${item.Collecteur || '?'} au prix de ${item.Prix || '?'} euros ${item.FDP || ''} ${item.FDP_Com || ''}
                    <br><br>
                    <!-- CORRECTION : Alignement Gauche -->
                    <div style="text-align:left; font-size:1.1em;">
                        ${item.InfoPaiement || ''}
                    </div>
                </div>
                
                <div class="${item.ComCache || ''}" style="margin-top:15px;">
                    Commentaire : ${item.Commentaire || ''}
                </div>
            </div>

            <div class="more">
                <center>
                    <table class="dates">
                        <tr><td>Pré Collecte :</td><td><b>${item.DatePre || ''}</b></td></tr>
                        <tr><td>Collecte :</td><td><b>${item.DateColl || ''}</b></td></tr>
                        <tr><td>Terminé :</td><td><b>${item.DateFin || ''}</b></td></tr>
                    </table>
                </center>
            </div>

            <div class="more">
                <center>${item.CompteurBT || ''}</center>
            </div>

            <div class="more action-icons">
                ${item.Sondage ? `
                    <a href="${item.Sondage}" target="_blank" class="icon-btn ico-form" title="Répondre au sondage">
                        <i class="fa-solid fa-clipboard-question"></i>
                    </a>` : ''}

                ${item.LinkSheet ? `
                    <a href="${item.LinkSheet}" target="_blank" class="icon-btn ico-sheet" title="Voir le fichier Excel">
                        <i class="fa-solid fa-file-csv"></i>
                    </a>` : ''}

                ${item.LinkFB ? `
                    <a href="${item.LinkFB}" target="_blank" class="icon-btn ico-fb" title="Voir sur Facebook">
                        <i class="fa-brands fa-facebook"></i>
                    </a>` : ''}

                ${item.ImageId ? `
                    <a href="${downloadLink}" target="_blank" class="icon-btn ico-dl" title="Télécharger l'image HD">
                        <i class="fa-solid fa-download"></i>
                    </a>` : ''}
                    
                 <span style='font-size:10px; color:#ccc; align-self:center;'>(n°${item.Timestamp || ''})</span>
            </div>
        </div>`;
    });

    grid.insertAdjacentHTML('beforeend', html);
    displayedCount += batch.length;
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const btn = document.getElementById('btn-load-more');
    if (!btn) return;
    
    if (displayedCount < currentData.length) {
        btn.style.display = 'inline-block';
        btn.innerText = `Voir la suite (${currentData.length - displayedCount})`;
    } else {
        btn.style.display = 'none';
    }
}
