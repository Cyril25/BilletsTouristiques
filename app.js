// ============================================================
// CONFIGURATION
// ============================================================
const scriptUrl = "https://script.google.com/macros/s/AKfycbzlv-bgfLieBK29R07VN8R2a6Qv1UQmznzSZ_sIYcvgsKkSGz2d-kOXoLCS8zqlrjWp/exec"; 

let allData = [];
let currentData = [];
let displayedCount = 0;
const BATCH_SIZE = 50;
let isFullLoaded = false;

document.addEventListener('DOMContentLoaded', () => { fetchFastThenSlow(); });

// --- CHARGEMENT INTELLIGENT ---
function fetchFastThenSlow() {
    const counter = document.getElementById('counter');
    // 1. Appel rapide (50 derniers)
    fetch(scriptUrl + "?limit=50")
        .then(res => res.json())
        .then(data => {
            if (!isFullLoaded) {
                allData = data;
                populateFilters(); applyFilters(false);
                counter.innerText = "Chargement suite...";
                counter.style.backgroundColor = "#fff3cd";
            }
        })
        .then(() => { 
            // 2. Appel complet (Arrière-plan)
            return fetch(scriptUrl); 
        })
        .then(res => res.json())
        .then(fullData => {
            allData = fullData;
            isFullLoaded = true;
            populateFilters(); applyFilters(true); // Mode silencieux
            counter.innerText = allData.length + " billets";
            counter.style.backgroundColor = "#d4edda";
        })
        .catch(err => console.error(err));
}

// --- GESTION DES FILTRES ---
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
        const currentVal = select.value;
        let h = '<option value="">Tout</option>';
        [...new Set(allData.map(item => item[m.key]).filter(v => v))].sort().forEach(val => {
            h += `<option value="${val}" ${val===currentVal?'selected':''}>${val}</option>`;
        });
        select.innerHTML = h;
    });
}

// --- MOTEUR DE RECHERCHE ---
function applyFilters(silent = false) {
    const s = document.getElementById('search-input').value.toLowerCase();
    const fCat = document.getElementById('sel-cat').value;
    const fPays = document.getElementById('sel-pays').value;
    const fYear = document.getElementById('sel-year').value;
    const fTheme = document.getElementById('sel-theme').value;
    const fColl = document.getElementById('sel-coll').value;
    
    const fStart = document.getElementById('date-start').value; 
    const fEnd = document.getElementById('date-end').value;

    currentData = allData.filter(item => {
        const txt = !s || (item.NomBillet && item.NomBillet.toLowerCase().includes(s)) ||
                          (item.Ville && item.Ville.toLowerCase().includes(s)) ||
                          (item.Recherche && item.Recherche.toLowerCase().includes(s));
        
        const matchDate = (!fStart || (item.Date && item.Date >= fStart)) &&
                          (!fEnd || (item.Date && item.Date <= fEnd));

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
    if(isFullLoaded) document.getElementById('counter').innerText = currentData.length + " billets";
}

// --- AFFICHAGE (RENDU HTML) ---
function showMore() {
    const grid = document.getElementById('cards-grid');
    const batch = currentData.slice(displayedCount, displayedCount + BATCH_SIZE);
    
    if(batch.length === 0 && displayedCount === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Aucun résultat.</p>";
        updateLoadMoreButton(); return;
    }

    let html = "";
    batch.forEach(item => {
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
    if (displayedCount < currentData.length) {
        btn.style.display = 'inline-block';
        btn.innerText = `Voir la suite (${currentData.length - displayedCount})`;
    } else {
        btn.style.display = 'none';
    }
}
