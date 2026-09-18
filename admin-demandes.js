// ============================================================
// admin-demandes.js — BilletsTouristiques Gestion des demandes (B0)
// Registre des demandes d'amélioration/correction (remplace le
// Google Sheet). Réservé aux admins (RLS is_admin()).
// ============================================================

// ============================================================
// 1. TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    if (type === 'success' || type === 'info') {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    }
}

// ============================================================
// 2. UTILITAIRES
// ============================================================
function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateFr(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================
// 3. RÉFÉRENTIELS
// ------------------------------------------------------------
// ETATS, ETATS_ACTIFS, PRIORITE_*, QUI_* , parseQui(), quiLabel(),
// getEtatDef() et attendValidationSpec() vivent dans global.js depuis la
// demande #59 : ils étaient dupliqués ici et dans demande.js.
// ============================================================

// ============================================================
// 4. DONNÉES EN MÉMOIRE
// ============================================================
var demandesList = [];
// Demande #49 — pour nommer le testeur sur la ligne. La colonne « demandeur » ne porte
// qu'une icône et son tooltip : il fallait survoler chaque ligne pour savoir si on était
// concerné. On charge les membres pour afficher un prénom plutôt qu'une adresse e-mail.
var membresDemandes = {};
// Demande #59 — { demande_id: [emails des admins ayant validé l'analyse] }
var validationsParDemande = {};
// Demande #68 — { demande_id: [commentaires {auteur_id, created_at}, du plus ancien au plus
// récent] }. Sur une « Analyse à valider », le fil dit à qui c'est le tour. Même règle que le
// rituel des demandes (scripts/rituel-demandes.mjs, etat()) : l'écran et l'assistant ne doivent
// pas se contredire.
var commentairesParDemande = {};
// L'adresse sous laquelle l'assistant publie ses réponses (scripts/rituel-demandes.mjs).
var ASSISTANT_EMAIL = 'claude-code@assistant.local';
var currentEtatFilter = 'actives';

// ============================================================
// 5. INITIALISATION
// ============================================================
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            populateEtatSelect();
            loadDemandes();
        }
    });
}

function populateEtatSelect() {
    var select = document.getElementById('dm-etat');
    if (!select) return;
    select.innerHTML = ETATS.map(function(e) {
        return '<option value="' + e.value + '">' + escapeHtml(e.label) + '</option>';
    }).join('');
}

// ============================================================
// 6. CHARGEMENT DEPUIS SUPABASE
// ============================================================
function loadDemandes() {
    Promise.all([
        supabaseFetch('/rest/v1/demandes?select=*&order=created_at.desc', { method: 'GET' }),
        // Demande #49 — un échec ici ne doit pas empêcher la liste de s'afficher :
        // on retombe alors sur la partie locale de l'adresse.
        supabaseFetch('/rest/v1/membres?select=id,email,nom,prenom', { method: 'GET' })
            .catch(function() { return []; }),
        // Demande #59 — qui a validé quelle analyse. Même repli que ci-dessus :
        // tant que la migration n'est pas jouée, la table n'existe pas et la
        // liste doit quand même s'afficher.
        supabaseFetch('/rest/v1/demande_validations?select=demande_id,admin_id', { method: 'GET' })
            .catch(function() { return []; }),
        // Demande #68 — même repli : sans les commentaires, la liste s'affiche comme avant.
        supabaseFetch('/rest/v1/demande_commentaires?select=demande_id,auteur_id,created_at&order=created_at.asc', { method: 'GET' })
            .catch(function() { return []; }),
        // Demande #62 — mon numéro de membre : « à moi de tester », « j'ai validé »,
        // et le droit de clore une demande s'y comparent.
        window.chargerMembreIdActif().catch(function() { return null; })
    ])
        .then(function(res) {
            monNumeroDemandes = res[4] || null;
            var rows = res[0];
            membresDemandes = {};
            membresParNumero = {};
            (res[1] || []).forEach(function(m) {
                membresDemandes[(m.email || '').toLowerCase()] = m;
                membresParNumero[m.id] = m;                       // demande #62
                if ((m.email || '').toLowerCase() === ASSISTANT_EMAIL) numeroAssistant = m.id;
            });
            validationsParDemande = {};
            (res[2] || []).forEach(function(v) {
                if (!validationsParDemande[v.demande_id]) validationsParDemande[v.demande_id] = [];
                validationsParDemande[v.demande_id].push(v.admin_id);   // demande #62
            });
            commentairesParDemande = {};
            // Triés par date croissante : chaque fil garde l'ordre chronologique.
            (res[3] || []).forEach(function(c) {
                if (!commentairesParDemande[c.demande_id]) commentairesParDemande[c.demande_id] = [];
                commentairesParDemande[c.demande_id].push(c);
            });
            demandesList = rows || [];
            renderEtatFilter();
            renderDemandes();
        })
        .catch(function(error) {
            showToast('Erreur chargement demandes : ' + error.message, 'error');
            console.error('Erreur chargement demandes:', error);
        });
}

// ============================================================
// 7. FILTRES
// ============================================================
function renderEtatFilter() {
    var wrap = document.getElementById('demande-etat-filter');
    if (!wrap) return;

    var counts = {};
    var nbActives = 0;
    demandesList.forEach(function(d) {
        counts[d.etat] = (counts[d.etat] || 0) + 1;
        if (ETATS_ACTIFS.indexOf(d.etat) !== -1) nbActives++;
    });

    var html = filterBtnHtml('actives', 'Actives', nbActives);
    ETATS.forEach(function(e) {
        html += filterBtnHtml(e.value, e.label, counts[e.value] || 0);
    });
    html += filterBtnHtml('toutes', 'Toutes', demandesList.length);
    wrap.innerHTML = html;
}

function filterBtnHtml(value, label, count) {
    var active = (currentEtatFilter === value) ? ' active' : '';
    return '<button type="button" class="user-role-filter-btn' + active + '" onclick="filtrerParEtat(\'' + value + '\')">'
        + escapeHtml(label) + ' (' + count + ')</button>';
}

function filtrerParEtat(value) {
    currentEtatFilter = value;
    renderEtatFilter();
    renderDemandes();
}

function clearDemandeSearch() {
    var input = document.getElementById('demande-search-input');
    if (input) input.value = '';
    renderDemandes();
}

function getDemandesFiltrees() {
    var searchInput = document.getElementById('demande-search-input');
    var terme = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var clearBtn = document.getElementById('demande-search-clear');
    if (clearBtn) clearBtn.style.display = terme ? '' : 'none';

    return demandesList.filter(function(d) {
        if (currentEtatFilter === 'actives') {
            if (ETATS_ACTIFS.indexOf(d.etat) === -1) return false;
        } else if (currentEtatFilter !== 'toutes') {
            if (d.etat !== currentEtatFilter) return false;
        }
        if (!terme) return true;
        var texte = (d.description + ' ' + d.commentaire + ' ' + d.ecran + ' ' + (adresseDuNumero(d.demandeur_id) || d.demandeur)).toLowerCase();
        return texte.indexOf(terme) !== -1;
    });
}

// ============================================================
// 8. RENDU DU TABLEAU (tri par colonnes)
// ============================================================
var COMPLEXITE_ORDER = { 'S': 0, 'M': 1, 'L': 2, '': 3 };
var sortState = { key: 'priorite', dir: 1 };

function getEtatIndex(etat) {
    for (var i = 0; i < ETATS.length; i++) {
        if (ETATS[i].value === etat) return i;
    }
    return ETATS.length;
}

function getSortValue(d, key) {
    switch (key) {
        case 'etat': return getEtatIndex(d.etat);
        case 'priorite': return PRIORITE_ORDER[d.priorite] !== undefined ? PRIORITE_ORDER[d.priorite] : 1;
        case 'complexite': return COMPLEXITE_ORDER[d.complexite] !== undefined ? COMPLEXITE_ORDER[d.complexite] : 3;
        case 'ecran': return (d.ecran || '').toLowerCase();
        case 'demandeur': return (adresseDuNumero(d.demandeur_id) || d.demandeur || '').toLowerCase();
        case 'date': return d.created_at || '';
        default: return 0;
    }
}

function trierDemandes(key) {
    if (sortState.key === key) {
        sortState.dir = -sortState.dir;
    } else {
        sortState.key = key;
        sortState.dir = 1;
    }
    renderDemandes();
}

function headerCell(key, labelHtml, sortTitle) {
    var arrow = '';
    if (sortState.key === key) {
        arrow = ' <i class="fa-solid fa-caret-' + (sortState.dir === 1 ? 'up' : 'down') + '"></i>';
    }
    return '<th class="demandes-th-sort" onclick="trierDemandes(\'' + key + '\')" title="Trier par ' + escapeAttr(sortTitle) + '">' + labelHtml + arrow + '</th>';
}

function renderDemandes() {
    var list = document.getElementById('demandes-list');
    var emptyState = document.getElementById('demande-empty-state');
    var countEl = document.getElementById('demande-count');
    if (!list) return;

    var demandes = getDemandesFiltrees();

    demandes.sort(function(a, b) {
        var va = getSortValue(a, sortState.key);
        var vb = getSortValue(b, sortState.key);
        if (va < vb) return -sortState.dir;
        if (va > vb) return sortState.dir;
        // Égalité : plus récentes en premier
        return (a.created_at < b.created_at) ? 1 : -1;
    });

    if (countEl) {
        countEl.textContent = demandes.length + ' demande' + (demandes.length > 1 ? 's' : '');
    }

    if (demandes.length === 0) {
        list.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = '<table class="demandes-table"><thead><tr>'
        + '<th title="Numéro de la demande">N°</th>'
        + headerCell('etat', 'État', 'état')
        + headerCell('priorite', 'Prio', 'priorité')
        + headerCell('complexite', 'Cplx', 'complexité')
        + '<th>Qui</th>'
        + headerCell('ecran', 'Écran', 'écran')
        + '<th>Description</th>'
        + headerCell('demandeur', '<i class="fa-solid fa-user"></i>', 'demandeur')
        + headerCell('date', '<i class="fa-solid fa-calendar-day"></i>', 'date')
        + '<th></th>'
        + '</tr></thead><tbody>'
        + demandes.map(renderDemandeRow).join('')
        + '</tbody></table>';
}

// Demande #68 — un commentaire publié par l'assistant (rituel des demandes).
// Demande #62 — l'assistant a une fiche de membre : on le reconnait a son numero
function estAssistant(membreId) {
    return !!numeroAssistant && membreId === numeroAssistant;
}

// Demande #68 (complément du 14/09, retour de test de Cyril) — les personnes dont on attend la
// réaction : on remonte la dernière série de réponses de l'assistant, puis les commentaires
// d'admins écrits depuis sa réponse précédente. Leurs auteurs, une fois chacun, sauf ceux qui
// ont validé l'analyse : valider, c'est avoir réagi. Adresses en minuscules.
function personnesAttendues(fil, validations) {
    var i = fil.length - 1;
    while (i >= 0 && estAssistant(fil[i].auteur_id)) i--;
    var personnes = [];
    for (var j = i; j >= 0 && !estAssistant(fil[j].auteur_id); j--) {
        var e = fil[j].auteur_id;
        if (e && personnes.indexOf(e) === -1 && validations.indexOf(e) === -1) personnes.push(e);
    }
    return personnes.reverse();
}

// Demande #49 — le prénom suffit : l'équipe compte six personnes, et une adresse e-mail
// complète dans un libellé de liste déroulante serait illisible. Repli sur la partie
// gauche de l'adresse pour les demandes importées, qui n'ont pas de membre associé.
// Demande #62 — l'ecran travaille en numeros de membre. L'annuaire donne nom et
// adresse ; une demande importee garde son libelle.
var membresParNumero = {};
var numeroAssistant = null;
var monNumeroDemandes = null;

function adresseDuNumero(membreId) {
    var m = membresParNumero[membreId];
    return m ? (m.email || '') : '';
}

function nomTesteurParNumero(membreId, repli) {
    var m = membresParNumero[membreId];
    if (m && (m.prenom || m.nom)) return (m.prenom || m.nom);
    if (m && m.email) return m.email.indexOf('@') > 0 ? m.email.slice(0, m.email.indexOf('@')) : m.email;
    return repli || (membreId ? 'membre n' + String.fromCharCode(176) + ' ' + membreId : '');
}

function nomTesteur(email) {
    var e = (email || '').trim();
    if (!e) return '';
    var m = membresDemandes[e.toLowerCase()];
    if (m && (m.prenom || m.nom)) return (m.prenom || m.nom);
    return e.indexOf('@') > 0 ? e.slice(0, e.indexOf('@')) : e;
}

function renderDemandeRow(d) {
    var etatDef = getEtatDef(d.etat);
    var estClose = (d.etat === 'terminee' || d.etat === 'abandonnee');

    var dateInfo = 'Créée le ' + formatDateFr(d.created_at);
    if (d.updated_at && d.updated_at.slice(0, 10) !== d.created_at.slice(0, 10)) {
        dateInfo += ' — modifiée le ' + formatDateFr(d.updated_at);
    }

    // Demande #49 — sur une demande À TESTER, l'option correspondante annonce qui doit
    // tester. On ne crée aucun statut supplémentaire : la liste garde ses sept entrées,
    // c'est le libellé de l'une d'elles qui se précise, et seulement sur cette ligne.
    var testeur = (d.etat === 'a_tester') ? nomTesteurParNumero(d.demandeur_id, d.demandeur) : '';
    var etatOptions = ETATS.map(function(e) {
        var label = (e.value === 'a_tester' && testeur) ? (e.label + ' par ' + testeur) : e.label;
        return '<option value="' + e.value + '"' + (e.value === d.etat ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
    }).join('');

    // Et si c'est à MOI de tester, la ligne se signale d'elle-même : c'est la question
    // qu'on se pose en ouvrant l'écran, elle ne doit pas demander un survol.
    var aMoiDeTester = (d.etat === 'a_tester') && !!monNumeroDemandes && d.demandeur_id === monNumeroDemandes;

    var commentaireIcon = d.commentaire
        ? ' <i class="fa-solid fa-comment-dots demande-desc-comment" title="' + escapeAttr(d.commentaire) + '"></i>'
        : '';

    // Demande #59 — la question qu'on se pose en ouvrant l'écran est « qu'est-ce
    // qui attend quelque chose de MOI ». Avant, il fallait ouvrir la fiche pour
    // découvrir qu'une spec y dormait.
    var validations = validationsParDemande[d.id] || [];
    var jaiValide = validations.indexOf(monNumeroDemandes) !== -1;   // demande #62
    var aRelire = attendValidationSpec(d.etat);
    // Demande #68 — si le dernier commentaire n'est pas de l'assistant, une remarque attend sa
    // réponse : ce n'est pas le tour des admins, la ligne ne doit pas dire « à vous ».
    var fil = commentairesParDemande[d.id] || [];
    var dernierCom = fil.length ? fil[fil.length - 1] : null;
    var attendAssistant = aRelire && !!dernierCom && !estAssistant(dernierCom.auteur_id);
    // Et quand l'assistant a répondu en dernier : de qui attend-on la réaction ?
    var attendus = (aRelire && dernierCom && !attendAssistant) ? personnesAttendues(fil, validations) : [];
    var aMoiDeRelire = aRelire && !jaiValide && !attendAssistant;

    var specIcon = '';
    if (d.docs && d.docs.trim()) {
        var nbDocs = d.docs.split('\n').filter(function(l) { return l.trim(); }).length;
        specIcon = ' <i class="fa-solid fa-file-lines demande-desc-spec" title="'
                 + nbDocs + ' document(s) de spec attaché(s)"></i>';
    }
    if (aRelire) {
        var titreValid = validations.length === 0
            ? 'Analyse à relire — aucune validation pour l\'instant'
            : validations.length + ' validation(s)' + (jaiValide ? ', dont la vôtre' : ', pas la vôtre');
        if (dernierCom && !attendAssistant) {
            titreValid += ' — dernier commentaire : l\'assistant, le ' + formatDateFr(dernierCom.created_at);
        }
        specIcon += ' <span class="demande-badge demande-badge-validation'
                 + (jaiValide ? ' demande-badge-validation--faite' : '')
                 + '" title="' + escapeAttr(titreValid) + '">'
                 + '<i class="fa-solid fa-' + (jaiValide ? 'circle-check' : 'eye') + '"></i> '
                 + validations.length + '</span>';
        if (attendAssistant) {
            specIcon += ' <span class="demande-badge demande-badge-attente-assistant" title="'
                     + escapeAttr('Remarque de ' + nomTesteurParNumero(dernierCom.auteur_id) + ' le '
                         + formatDateFr(dernierCom.created_at) + ' — réponse de l\'assistant attendue') + '">'
                     + '<i class="fa-solid fa-hourglass-half"></i> Assistant</span>';
        }
        attendus.forEach(function(email) {
            var nom = nomTesteur(email);
            specIcon += ' <span class="demande-badge demande-badge-attente-personne" title="'
                     + escapeAttr('L\'assistant a répondu à ' + nom + ' le ' + formatDateFr(dernierCom.created_at)
                         + ' — sa réaction est attendue') + '">'
                     + '<i class="fa-solid fa-hourglass-half"></i> ' + escapeHtml(nom) + '</span>';
        });
    }

    return '<tr class="demande-row' + (estClose ? ' demande-row--close' : '')
        + (aMoiDeTester ? ' demande-row--a-tester-moi' : '')
        + (aMoiDeRelire ? ' demande-row--a-relire-moi' : '') + '" onclick="ouvrirFicheDemande(' + d.id + ')">'
        + '<td class="demande-id-cell" title="Demande n°' + d.id + '">#' + d.id + '</td>'
        + '<td class="demande-etat-cell">'
        +   '<select class="demande-etat-select" style="border-color:' + etatDef.color + ';color:' + etatDef.color + ';" '
        +       'onclick="event.stopPropagation()" onchange="changerEtat(' + d.id + ', this.value)" title="Changer l\'état">' + etatOptions + '</select>'
        + '</td>'
        + '<td><span class="demande-badge demande-badge-priorite demande-badge-priorite--' + escapeAttr(d.priorite) + '">'
        +   escapeHtml(PRIORITE_LABELS[d.priorite] || d.priorite) + '</span></td>'
        + '<td>' + (d.complexite ? '<span class="demande-badge demande-badge-complexite" title="Complexité estimée">' + escapeHtml(d.complexite) + '</span>' : '') + '</td>'
        + '<td class="demande-qui-cell"><span class="demande-badge demande-badge-qui" title="Qui est concerné"><i class="fa-solid fa-user-group"></i> ' + escapeHtml(quiLabel(d.qui)) + '</span></td>'
        + '<td class="demande-ecran-cell">' + (d.ecran ? '<span class="demande-badge demande-badge-ecran"><i class="fa-solid fa-display"></i> ' + escapeHtml(d.ecran) + '</span>' : '') + '</td>'
        + '<td class="demande-desc-cell"><span class="demande-desc-text" title="' + escapeAttr(d.description) + '">' + escapeHtml(d.description) + '</span>' + commentaireIcon + specIcon + '</td>'
        + '<td class="demande-demandeur-cell" title="Demandé par ' + escapeAttr(adresseDuNumero(d.demandeur_id) || d.demandeur) + '"><i class="fa-solid fa-user"></i></td>'
        + '<td class="demande-date-cell" title="' + escapeAttr(dateInfo) + '"><i class="fa-solid fa-calendar-day"></i></td>'
        + '<td class="demande-actions-cell"><button type="button" class="demande-edit-btn" onclick="event.stopPropagation(); ouvrirFicheDemande(' + d.id + ')" title="Ouvrir la fiche de la demande"><i class="fa-solid fa-up-right-from-square"></i></button></td>'
        + '</tr>';
}

// ============================================================
// 9. CHANGEMENT D'ÉTAT RAPIDE (depuis la carte)
// ============================================================
// Demande #48 — « Terminé » est la conclusion du DEMANDEUR : c'est lui qui a demandé
// l'évolution, à lui de dire qu'elle répond à son besoin. Le reste du cycle ne change pas.
// Le superadmin garde la main : sans ce filet, les demandes importées du Google Sheet —
// sans demandeur nominatif — n'auraient personne pour les clore.
// Garde d'écran et non de RLS : c'est une convention de travail entre six admins, pas une
// frontière de sécurité ; une policy de plus à maintenir pour un abus que personne ne
// cherche à commettre serait un mauvais échange.
function peutTerminer(demande) {
    if (!demande) return true;
    if (window.userRole === 'superadmin') return true;
    // Demande #62 — comparaison de numeros de membre
    return !!monNumeroDemandes && demande.demandeur_id === monNumeroDemandes;
}

function refuserCloture(demande) {
    var dem = (demande && (adresseDuNumero(demande.demandeur_id) || demande.demandeur)) || 'le demandeur';
    showToast('Seul ' + dem + ' peut clore cette demande : c\'est à lui de vérifier que le développement répond à son besoin.', 'error');
}

function changerEtat(id, nouvelEtat) {
    // Snapshot (demandeur + état d'avant) pour la notif de suivi au demandeur (#33).
    var demande = null, ancienEtat = null;
    for (var j = 0; j < demandesList.length; j++) {
        if (demandesList[j].id === id) { demande = demandesList[j]; ancienEtat = demande.etat; break; }
    }
    if (nouvelEtat === 'terminee' && !peutTerminer(demande)) {   // #48
        refuserCloture(demande);
        renderDemandes();   // le select revient sur l'état réel
        return;
    }
    supabaseFetch('/rest/v1/demandes?id=eq.' + id, {
        method: 'PATCH',
        body: JSON.stringify({ etat: nouvelEtat })
    })
        .then(function() {
            for (var i = 0; i < demandesList.length; i++) {
                if (demandesList[i].id === id) demandesList[i].etat = nouvelEtat;
            }
            renderEtatFilter();
            renderDemandes();
            showToast('État mis à jour : ' + getEtatDef(nouvelEtat).label, 'success');
            notifierDemandeurSiSuivi(demande, nouvelEtat, ancienEtat);
        })
        .catch(function(error) {
            showToast('Erreur mise à jour : ' + error.message, 'error');
            renderDemandes();
        });
}

// ============================================================
// 9b. NOTIFICATION AU DEMANDEUR (Demande #33)
// ------------------------------------------------------------
// Quand une demande passe « À cadrer » (précision attendue) ou « À tester »
// (développée), prévenir son auteur via une notification PRIVÉE (cible_email) :
// visible de lui seul dans la cloche et sur la page Nouveautés.
// Best-effort : un échec (p.ex. migration `cible_email` pas encore jouée, ou
// demandeur non nominatif) ne doit jamais bloquer le changement d'état.
// ============================================================
function estEmailValide(s) {
    return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function resumeDemande(d) {
    var txt = (d && d.description ? String(d.description) : '').trim().replace(/\s+/g, ' ');
    if (!txt) txt = (d && d.ecran) ? ('écran ' + d.ecran) : 'votre demande';
    return txt.length > 70 ? (txt.slice(0, 69) + '…') : txt;
}

function notifierDemandeurSiSuivi(demande, nouvelEtat, ancienEtat) {
    if (!demande || nouvelEtat === ancienEtat) return;
    if (nouvelEtat !== 'a_cadrer' && nouvelEtat !== 'a_tester') return;
    // Demande #62 — le destinataire est designe par son numero ; une demande
    // importee n'en a pas, il n'y a personne a prevenir.
    if (!demande.demandeur_id) return;

    var resume = resumeDemande(demande);
    var titre, texte;
    if (nouvelEtat === 'a_cadrer') {
        titre = 'Votre demande a besoin d\'une précision';
        texte = 'Votre demande « ' + resume + ' » est passée « À cadrer » : une précision '
              + 'est nécessaire avant de pouvoir la développer. Un admin reviendra vers vous'
              + (demande.commentaire ? ' (voir le commentaire ajouté).' : '.');
    } else {
        titre = 'Votre demande est prête à tester';
        texte = 'Votre demande « ' + resume + ' » a été développée et passe « À tester ». '
              + 'Merci de vérifier qu\'elle répond bien à votre besoin.';
    }

    supabaseFetch('/rest/v1/notifications', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
            type: 'demande_suivi',
            titre: titre,
            texte: texte,
            cible_membre_id: demande.demandeur_id
        })
    }).catch(function(e) {
        console.warn('Notif demandeur (#33) : échec — migration cible_email jouée ?', e);
    });
}

// ============================================================
// 10. OUVERTURE DE LA FICHE (demande #58)
// ------------------------------------------------------------
// L'édition d'une demande a quitté la popup : le champ « journal de
// traitement » y était trop étroit, alors que c'est justement là que
// s'écrivent les questions de cadrage. Cliquer une ligne mène désormais à
// demande.html, qui porte aussi les documents de spec et le fil de relecture
// entre admins.
// ============================================================
function ouvrirFicheDemande(id) {
    window.location.href = 'demande.html?id=' + id;
}

// ============================================================
// 11. MODALE — CRÉATION UNIQUEMENT
// ------------------------------------------------------------
// Elle survit parce que consigner une demande entendue sur Facebook, c'est
// trois champs et dix secondes : ouvrir une fiche pleine page pour ça serait
// un détour à chaque fois. La demande naît ici, elle vit sur sa fiche.
// La suppression a suivi l'édition : elle est sur la fiche.
// ============================================================
function ouvrirNouvelleDemande() {
    var overlay = document.getElementById('demande-modal-overlay');
    if (!overlay) return;

    document.getElementById('dm-description').value = '';
    document.getElementById('dm-ecran').value = '';
    QUI_VALUES.forEach(function(v) {
        document.getElementById('dm-qui-' + v).checked = true;
    });
    document.getElementById('dm-priorite').value = 'normale';
    document.getElementById('dm-complexite').value = '';
    document.getElementById('dm-etat').value = 'nouvelle';
    document.getElementById('dm-commentaire').value = '';

    overlay.style.display = 'flex';
    document.getElementById('dm-description').focus();
}

function fermerModaleDemande() {
    var overlay = document.getElementById('demande-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function creerDemande() {
    var description = document.getElementById('dm-description').value.trim();
    if (!description) {
        showToast('La description est obligatoire', 'error');
        return;
    }

    var quiValues = QUI_VALUES.filter(function(v) {
        return document.getElementById('dm-qui-' + v).checked;
    });
    if (quiValues.length === 0) {
        showToast('Cochez au moins un public concerné', 'error');
        return;
    }

    var data = {
        description: description,
        ecran: document.getElementById('dm-ecran').value.trim(),
        qui: quiValues.join(','),
        priorite: document.getElementById('dm-priorite').value,
        complexite: document.getElementById('dm-complexite').value,
        etat: document.getElementById('dm-etat').value,
        commentaire: document.getElementById('dm-commentaire').value.trim(),
        demandeur_id: monNumeroDemandes
    };

    supabaseFetch('/rest/v1/demandes', {
        method: 'POST',
        body: JSON.stringify(data)
    })
        .then(function() {
            showToast('Demande ajoutée', 'success');
            fermerModaleDemande();
            loadDemandes();
        })
        .catch(function(error) {
            showToast('Erreur enregistrement : ' + error.message, 'error');
        });
}
