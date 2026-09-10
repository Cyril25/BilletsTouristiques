// ============================================================
// demande.js — BilletsTouristiques — Fiche d'une demande (#58)
// ------------------------------------------------------------
// Pleine page, réservée aux admins. Remplace l'édition en popup :
// le champ « journal de traitement » y était trop étroit alors que
// c'est là que s'écrivent les questions de cadrage. La popup de
// admin-demandes.html ne sert plus qu'à CRÉER une demande.
//
// Trois apports par rapport à la popup :
//   - description et journal au large ;
//   - les documents de spec du dépôt, rendus dans la page ;
//   - un fil de commentaires entre admins pour les relire.
// ============================================================

// ============================================================
// 1. TOAST
// ============================================================
function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type === 'success' || type === 'info') {
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 4000);
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
    div.appendChild(document.createTextNode(text == null ? '' : text));
    return div.innerHTML;
}

function escapeAttr(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateFr(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateHeureFr(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// ============================================================
// 3. RÉFÉRENTIELS
// ------------------------------------------------------------
// Source unique dans global.js depuis la demande #59.
// ============================================================

// ============================================================
// 4. ÉTAT EN MÉMOIRE
// ============================================================
var laDemande = null;
var membresMap = {};
var lesCommentaires = [];
var commentairesIndisponibles = false;   // migration #58 pas encore jouée
var docsAttaches = [];                   // chemins validés
var docCourant = null;                   // chemin affiché
var titresDocCourant = [];               // pour le sommaire et le choix de section
var commentaireEnEdition = null;
// Demande #59 — qui a validé l'analyse de CETTE demande.
var lesValidations = [];
var validationsIndisponibles = false;   // migration #59 pas encore jouée

// ============================================================
// 5. INITIALISATION
// ============================================================
function getDemandeIdFromUrl() {
    var m = /[?&]id=(\d+)/.exec(window.location.search);
    return m ? parseInt(m[1], 10) : null;
}

if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) chargerFiche();
    });
}

function afficherIntrouvable(message) {
    var bloc = document.getElementById('fd-introuvable');
    var texte = document.getElementById('fd-introuvable-texte');
    var contenu = document.getElementById('fd-contenu');
    if (texte && message) texte.textContent = message;
    if (bloc) bloc.style.display = 'block';
    if (contenu) contenu.style.display = 'none';
}

// ============================================================
// 6. CHARGEMENT
// ============================================================
function chargerFiche() {
    var id = getDemandeIdFromUrl();
    if (!id) {
        afficherIntrouvable('Aucune demande indiquée. Revenez à la liste et cliquez une ligne.');
        return;
    }

    Promise.all([
        supabaseFetch('/rest/v1/demandes?id=eq.' + id + '&select=*'),
        // Un échec ici ne doit pas empêcher la fiche de s'afficher : on retombe
        // sur la partie locale de l'adresse pour nommer les gens (même repli
        // que la liste, demande #49).
        supabaseFetch('/rest/v1/membres?select=email,nom,prenom').catch(function() { return []; }),
        chargerCommentaires(id),
        chargerValidations(id)
    ])
        .then(function(res) {
            var rows = res[0] || [];
            if (rows.length === 0) {
                afficherIntrouvable('La demande #' + id + ' n\'existe pas (ou plus).');
                return;
            }
            laDemande = rows[0];
            membresMap = {};
            (res[1] || []).forEach(function(m) { membresMap[(m.email || '').toLowerCase()] = m; });

            document.getElementById('fd-contenu').style.display = '';
            renderFiche();
            renderDocs();
            renderValidation();
            renderCommentaires();
        })
        .catch(function(error) {
            showToast('Erreur chargement : ' + error.message, 'error');
            afficherIntrouvable('Impossible de charger cette demande : ' + error.message);
        });
}

// La table demande_commentaires n'existe qu'une fois la migration #58 jouée.
// Tant qu'elle manque, la fiche doit rester utilisable et le DIRE — c'est le
// même parti pris qu'en #51 pour l'envoi ciblé : l'écran nomme le script.
function chargerCommentaires(id) {
    return supabaseFetch('/rest/v1/demande_commentaires?demande_id=eq.' + id
                       + '&select=*&order=created_at.asc')
        .then(function(rows) {
            lesCommentaires = rows || [];
            commentairesIndisponibles = false;
            return lesCommentaires;
        })
        .catch(function() {
            lesCommentaires = [];
            commentairesIndisponibles = true;
            return [];
        });
}

// Même repli que les commentaires : tant que la migration #59 n'est pas jouée,
// la table n'existe pas et la fiche doit rester utilisable.
function chargerValidations(id) {
    return supabaseFetch('/rest/v1/demande_validations?demande_id=eq.' + id
                       + '&select=*&order=created_at.asc')
        .then(function(rows) {
            lesValidations = rows || [];
            validationsIndisponibles = false;
            return lesValidations;
        })
        .catch(function() {
            lesValidations = [];
            validationsIndisponibles = true;
            return [];
        });
}

function nomAffiche(email) {
    var e = (email || '').trim();
    if (!e) return 'Inconnu';
    var m = membresMap[e.toLowerCase()];
    if (m && (m.prenom || m.nom)) return (m.prenom || m.nom);
    return e.indexOf('@') > 0 ? e.slice(0, e.indexOf('@')) : e;
}

// ============================================================
// 7. RENDU DE L'EN-TÊTE ET DES CHAMPS
// ============================================================
function renderFiche() {
    var d = laDemande;

    document.title = 'Demande #' + d.id + ' - BilletsTouristiques';
    document.getElementById('fd-titre').textContent = 'Demande #' + d.id;

    var selEtat = document.getElementById('fd-etat');
    selEtat.innerHTML = ETATS.map(function(e) {
        return '<option value="' + e.value + '"' + (e.value === d.etat ? ' selected' : '') + '>'
             + escapeHtml(e.label) + '</option>';
    }).join('');
    var def = getEtatDef(d.etat);
    selEtat.style.borderColor = def.color;
    selEtat.style.color = def.color;
    selEtat.onchange = function() {
        var nd = getEtatDef(this.value);
        this.style.borderColor = nd.color;
        this.style.color = nd.color;
    };

    document.getElementById('fd-priorite').value = d.priorite || 'normale';
    document.getElementById('fd-complexite').value = d.complexite || '';
    document.getElementById('fd-ecran').value = d.ecran || '';
    document.getElementById('fd-description').value = d.description || '';
    document.getElementById('fd-commentaire').value = d.commentaire || '';
    document.getElementById('fd-docs').value = d.docs || '';

    var quiValues = parseQui(d.qui);
    QUI_VALUES.forEach(function(v) {
        document.getElementById('fd-qui-' + v).checked = (quiValues.indexOf(v) !== -1);
    });

    document.getElementById('fd-demandeur').textContent = d.demandeur || '—';

    var dates = 'Créée le ' + formatDateFr(d.created_at);
    if (d.updated_at && d.updated_at.slice(0, 10) !== (d.created_at || '').slice(0, 10)) {
        dates += ' — modifiée le ' + formatDateFr(d.updated_at);
    }
    document.getElementById('fd-dates').textContent = dates;
}

// ============================================================
// 8. ENREGISTREMENT / SUPPRESSION
// ============================================================
// Reprise de la règle de la demande #48 : « Terminé » est la conclusion du
// DEMANDEUR. Garde d'écran et non de RLS — convention entre six admins.
function peutTerminer(demande) {
    if (!demande) return true;
    if (window.userRole === 'superadmin') return true;
    var moi = (window.getActiveEmail() || '').trim().toLowerCase();
    var dem = (demande.demandeur || '').trim().toLowerCase();
    return !!moi && moi === dem;
}

function enregistrerFiche() {
    var description = document.getElementById('fd-description').value.trim();
    if (!description) {
        showToast('La description est obligatoire', 'error');
        return;
    }
    var quiValues = QUI_VALUES.filter(function(v) {
        return document.getElementById('fd-qui-' + v).checked;
    });
    if (quiValues.length === 0) {
        showToast('Cochez au moins un public concerné', 'error');
        return;
    }

    var nouvelEtat = document.getElementById('fd-etat').value;
    var ancienEtat = laDemande.etat;
    if (nouvelEtat === 'terminee' && ancienEtat !== 'terminee' && !peutTerminer(laDemande)) {
        var dem = laDemande.demandeur || 'le demandeur';
        showToast('Seul ' + dem + ' peut clore cette demande : c\'est à lui de vérifier que le '
                + 'développement répond à son besoin.', 'error');
        document.getElementById('fd-etat').value = ancienEtat;
        return;
    }

    var data = {
        description: description,
        ecran: document.getElementById('fd-ecran').value.trim(),
        qui: quiValues.join(','),
        priorite: document.getElementById('fd-priorite').value,
        complexite: document.getElementById('fd-complexite').value,
        etat: nouvelEtat,
        commentaire: document.getElementById('fd-commentaire').value.trim()
    };

    supabaseFetch('/rest/v1/demandes?id=eq.' + laDemande.id, {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
        .then(function() {
            for (var k in data) { if (data.hasOwnProperty(k)) laDemande[k] = data[k]; }
            showToast('Demande enregistrée', 'success');
            notifierDemandeurSiSuivi(laDemande, nouvelEtat, ancienEtat);
        })
        .catch(function(error) {
            showToast('Erreur enregistrement : ' + error.message, 'error');
        });
}

// Reprise de admin-demandes.js : prévenir l'auteur quand sa demande passe
// « À cadrer » ou « À tester ». Best-effort — un échec ne bloque rien.
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
    var email = (demande.demandeur || '').trim();
    if (!estEmailValide(email)) return;

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
        body: JSON.stringify({ type: 'demande_suivi', titre: titre, texte: texte, cible_email: email })
    }).catch(function(e) {
        console.warn('Notif demandeur (#33) : échec', e);
    });
}

function ouvrirSuppressionFiche() {
    var o = document.getElementById('fd-delete-overlay');
    if (o) o.style.display = 'flex';
}

function fermerSuppressionFiche() {
    var o = document.getElementById('fd-delete-overlay');
    if (o) o.style.display = 'none';
}

function confirmerSuppressionFiche() {
    supabaseFetch('/rest/v1/demandes?id=eq.' + laDemande.id, { method: 'DELETE' })
        .then(function() { window.location.href = 'admin-demandes.html'; })
        .catch(function(error) {
            showToast('Erreur suppression : ' + error.message, 'error');
            fermerSuppressionFiche();
        });
}

// ============================================================
// 9. DOCUMENTS DE SPEC
// ============================================================
// Garde-fou : le champ ne doit jamais pouvoir désigner autre chose qu'une
// spec du dépôt. Sans ça, il devient un lecteur de fichiers arbitraire du
// site. La même règle est redite par une contrainte CHECK en base.
function cheminDocValide(chemin) {
    var c = String(chemin || '').trim();
    if (!c) return false;
    if (c.indexOf('..') !== -1) return false;
    if (c.indexOf('\\') !== -1) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(c)) return false;   // aucun schéma d'URL
    return /^specs\/[A-Za-z0-9_.\/-]+\.md$/.test(c);
}

function parseDocs(docs) {
    return String(docs || '')
        .split('\n')
        .map(function(l) { return l.trim(); })
        .filter(function(l) { return l !== ''; });
}

function nomCourtDoc(chemin) {
    var base = chemin.split('/').pop().replace(/\.md$/, '');
    return base.replace(/-/g, ' ');
}

function renderDocs() {
    var lignes = parseDocs(laDemande.docs);
    var invalides = lignes.filter(function(l) { return !cheminDocValide(l); });
    docsAttaches = lignes.filter(cheminDocValide);

    var onglets = document.getElementById('fd-docs-onglets');
    var rendu = document.getElementById('fd-docs-rendu');
    var sommaire = document.getElementById('fd-docs-sommaire');

    if (invalides.length > 0) {
        showToast(invalides.length + ' chemin(s) de document ignoré(s) : seuls les fichiers '
                + 'specs/… .md sont acceptés.', 'error');
    }

    if (docsAttaches.length === 0) {
        onglets.innerHTML = '';
        sommaire.style.display = 'none';
        rendu.innerHTML = '<p class="fiche-aide">Aucun document attaché. Ouvrez « Documents attachés '
                        + 'à cette demande » ci-dessous pour en ajouter un.</p>';
        remplirSelectSection([]);
        return;
    }

    onglets.innerHTML = docsAttaches.map(function(chemin, i) {
        var actif = (chemin === docCourant) || (docCourant === null && i === 0);
        return '<button type="button" class="fiche-doc-onglet' + (actif ? ' active' : '') + '" '
             + 'onclick="afficherDoc(\'' + escapeAttr(chemin) + '\')">'
             + '<i class="fa-solid fa-file-lines"></i> ' + escapeHtml(nomCourtDoc(chemin)) + '</button>';
    }).join('');

    afficherDoc(docCourant && docsAttaches.indexOf(docCourant) !== -1 ? docCourant : docsAttaches[0]);
}

function afficherDoc(chemin) {
    if (!cheminDocValide(chemin)) return;
    docCourant = chemin;

    var onglets = document.getElementById('fd-docs-onglets');
    if (onglets) {
        var btns = onglets.getElementsByClassName('fiche-doc-onglet');
        for (var i = 0; i < btns.length; i++) {
            btns[i].className = 'fiche-doc-onglet' + (docsAttaches[i] === chemin ? ' active' : '');
        }
    }

    var rendu = document.getElementById('fd-docs-rendu');
    rendu.innerHTML = '<p class="fiche-aide"><i class="fa-solid fa-spinner fa-spin"></i> Chargement…</p>';

    // Chemin RELATIF : demande.html et specs/ partagent le même préfixe de
    // déploiement, donc la même URL marche en prod (/BilletsTouristiques/) et
    // en test (/BilletsTouristiques-TestEnv/), sans configuration d'env.
    // no-cache : une spec qu'on vient de pousser doit être lue à jour.
    fetch(chemin, { cache: 'no-cache' })
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        })
        .then(function(md) {
            var resultat = mdToHtml(md);
            titresDocCourant = resultat.titres;
            rendu.innerHTML = resultat.html;
            renderSommaire(resultat.titres);
            remplirSelectSection(resultat.titres);
        })
        .catch(function(e) {
            titresDocCourant = [];
            renderSommaire([]);
            remplirSelectSection([]);
            rendu.innerHTML = '<p class="fiche-erreur"><i class="fa-solid fa-triangle-exclamation"></i> '
                            + 'Document introuvable : <code>' + escapeHtml(chemin) + '</code>. '
                            + 'A-t-il été renommé, ou pas encore poussé en ligne ? (' + escapeHtml(e.message) + ')</p>';
        });
}

function renderSommaire(titres) {
    var bloc = document.getElementById('fd-docs-sommaire');
    if (!bloc) return;
    var majeurs = titres.filter(function(t) { return t.niveau <= 2; });
    if (majeurs.length < 3) { bloc.style.display = 'none'; return; }
    bloc.style.display = '';
    bloc.innerHTML = '<span class="fiche-sommaire-label">Sommaire</span>'
        + majeurs.map(function(t) {
            return '<a href="#' + escapeAttr(t.ancre) + '">' + escapeHtml(t.texte) + '</a>';
          }).join('');
}

function enregistrerDocs() {
    var valeur = document.getElementById('fd-docs').value;
    var lignes = parseDocs(valeur);
    var invalides = lignes.filter(function(l) { return !cheminDocValide(l); });
    if (invalides.length > 0) {
        showToast('Chemin refusé : « ' + invalides[0] +' ». Attendu : specs/…/fichier.md, sans « .. ».', 'error');
        return;
    }

    supabaseFetch('/rest/v1/demandes?id=eq.' + laDemande.id, {
        method: 'PATCH',
        body: JSON.stringify({ docs: lignes.join('\n') })
    })
        .then(function() {
            laDemande.docs = lignes.join('\n');
            docCourant = null;
            showToast('Documents enregistrés', 'success');
            renderDocs();
        })
        .catch(function(error) {
            var msg = error.message || '';
            if (msg.indexOf('docs') !== -1 || msg.indexOf('column') !== -1) {
                showToast('La colonne « docs » n\'existe pas encore : jouez '
                        + 'scripts/migration-demande-58-docs-et-commentaires.sql', 'error');
            } else {
                showToast('Erreur enregistrement : ' + msg, 'error');
            }
        });
}

// ============================================================
// 10. CONVERTISSEUR MARKDOWN
// ------------------------------------------------------------
// Fait maison, et volontairement : la règle de sûreté est « ON ÉCHAPPE
// D'ABORD, ON TRANSFORME ENSUITE ». Tout le contenu du fichier passe par
// escapeHtml avant la moindre règle, donc AUCUNE balise ne peut naître du
// document — un <script> écrit dans un .md s'affiche comme du texte.
// Une bibliothèque type marked aurait fait l'inverse (elle laisse passer le
// HTML brut) et aurait exigé un sanitizer en plus : deux dépendances au lieu
// de zéro, pour un sous-ensemble de markdown qu'on maîtrise.
//
// Sous-ensemble couvert : titres, tableaux, listes (imbriquées), citations,
// blocs et fragments de code, gras, barré, liens, séparateurs.
// NON couvert volontairement : _italique_ avec des underscores — le projet
// écrit sans cesse des noms comme pas_interesse ou prix_variante, qui
// deviendraient de l'italique au milieu d'une phrase. *italique* suffit.
// ============================================================
function decodeEntites(s) {
    return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function ancreDepuisTitre(texte, index) {
    var base = texte.toLowerCase()
        .replace(/<[^>]*>/g, '')
        .replace(/[^a-z0-9éèêàùçôîû]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return 'sec-' + index + (base ? '-' + base.slice(0, 40) : '');
}

function urlSure(u) {
    if (/["'<>]/.test(u)) return false;
    if (/^#/.test(u)) return true;
    if (/^https?:\/\//i.test(u)) return true;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false;   // javascript:, data:, file:…
    return true;                                         // chemin relatif
}

function mdInline(s) {
    // Les fragments `code` sont isoles par DECOUPAGE, et non par des marqueurs
    // inseres dans le texte : un marqueur sur suppose une chaine qui ne peut
    // pas apparaitre dans le document, ce qui n'existe pas vraiment. Le split
    // rend la question sans objet — les morceaux de code ne traversent
    // simplement aucune des regles suivantes.
    return String(s).split(/(`[^`]+`)/).map(function(part) {
        if (/^`[^`]+`$/.test(part)) {
            return '<code>' + part.slice(1, -1) + '</code>';
        }

        part = part.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(tout, texte, url) {
            if (!urlSure(url)) return texte;
            var externe = /^https?:\/\//i.test(url);
            return '<a href="' + url + '"'
                 + (externe ? ' target="_blank" rel="noopener noreferrer"' : '')
                 + '>' + texte + '</a>';
        });

        part = part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        part = part.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        part = part.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        return part;
    }).join('');
}

function mdToHtml(source) {
    // 1. Échappement global — voir le commentaire de section.
    var texte = escapeHtml(String(source == null ? '' : source).replace(/\r\n?/g, '\n'));
    var lignes = texte.split('\n');

    var html = [];
    var titres = [];
    var i = 0;
    var n = lignes.length;

    function estDebutBloc(l) {
        return /^```/.test(l)
            || /^#{1,6}\s+/.test(l)
            || /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)
            || /^&gt;\s?/.test(l)
            || /^\s*[-*+]\s+/.test(l)
            || /^\s*\d+\.\s+/.test(l)
            || /^\s*\|/.test(l)
            || l.trim() === '';
    }

    while (i < n) {
        var ligne = lignes[i];

        // ---- Bloc de code ----
        if (/^```/.test(ligne)) {
            var corps = [];
            i++;
            while (i < n && !/^```/.test(lignes[i])) { corps.push(lignes[i]); i++; }
            i++;   // ferme la clôture
            html.push('<pre class="fiche-code"><code>' + corps.join('\n') + '</code></pre>');
            continue;
        }

        // ---- Titre ----
        var mTitre = /^(#{1,6})\s+(.*)$/.exec(ligne);
        if (mTitre) {
            var niveau = mTitre[1].length;
            var brut = mTitre[2].replace(/\s+#+\s*$/, '');
            var ancre = ancreDepuisTitre(brut, titres.length);
            titres.push({ niveau: niveau, texte: decodeEntites(brut.replace(/[*`]/g, '')), ancre: ancre });
            // Décalé d'un cran : la page porte déjà un h1.
            var balise = 'h' + Math.min(niveau + 1, 6);
            html.push('<' + balise + ' id="' + ancre + '">' + mdInline(brut) + '</' + balise + '>');
            i++;
            continue;
        }

        // ---- Séparateur ----
        if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(ligne)) {
            html.push('<hr>');
            i++;
            continue;
        }

        // ---- Tableau ----
        if (/^\s*\|/.test(ligne) && i + 1 < n && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lignes[i + 1])) {
            var cellules = function(l) {
                var t = l.trim().replace(/^\|/, '').replace(/\|$/, '');
                return t.split('|').map(function(c) { return mdInline(c.trim()); });
            };
            var entete = cellules(ligne);
            i += 2;
            var corpsTable = [];
            while (i < n && /^\s*\|/.test(lignes[i])) { corpsTable.push(cellules(lignes[i])); i++; }

            // Enveloppé dans un conteneur qui défile : un tableau large ne doit
            // jamais faire défiler la PAGE horizontalement (les specs en ont
            // beaucoup, et l'écran est souvent un téléphone).
            html.push('<div class="fiche-table-wrap"><table class="fiche-table"><thead><tr>'
                + entete.map(function(c) { return '<th>' + c + '</th>'; }).join('')
                + '</tr></thead><tbody>'
                + corpsTable.map(function(r) {
                    return '<tr>' + r.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
                  }).join('')
                + '</tbody></table></div>');
            continue;
        }

        // ---- Citation ----
        if (/^&gt;\s?/.test(ligne)) {
            var cit = [];
            while (i < n && /^&gt;\s?/.test(lignes[i])) {
                cit.push(lignes[i].replace(/^&gt;\s?/, ''));
                i++;
            }
            html.push('<blockquote>' + mdInline(cit.join(' ')) + '</blockquote>');
            continue;
        }

        // ---- Listes (imbriquées par l'indentation) ----
        if (/^\s*([-*+]|\d+\.)\s+/.test(ligne)) {
            var pile = [];
            var res = [];
            while (i < n && /^\s*([-*+]|\d+\.)\s+/.test(lignes[i])) {
                var m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lignes[i]);
                var indent = m[1].replace(/\t/g, '  ').length;
                var ordonnee = /\d/.test(m[2]);
                var contenu = m[3];

                // Les lignes de continuation d'un item (plus indentées, sans puce)
                // se recollent à l'item courant : les specs y mettent des phrases
                // entières, les couper produirait des paragraphes orphelins.
                var j = i + 1;
                while (j < n && lignes[j].trim() !== ''
                       && !/^\s*([-*+]|\d+\.)\s+/.test(lignes[j])
                       && /^\s+/.test(lignes[j])) {
                    contenu += ' ' + lignes[j].trim();
                    j++;
                }
                i = j;

                while (pile.length > 0 && indent < pile[pile.length - 1].indent) {
                    res.push(pile.pop().ordonnee ? '</ol>' : '</ul>');
                }
                if (pile.length === 0 || indent > pile[pile.length - 1].indent) {
                    pile.push({ indent: indent, ordonnee: ordonnee });
                    res.push(ordonnee ? '<ol>' : '<ul>');
                }
                res.push('<li>' + mdInline(contenu) + '</li>');
            }
            while (pile.length > 0) { res.push(pile.pop().ordonnee ? '</ol>' : '</ul>'); }
            html.push(res.join(''));
            continue;
        }

        // ---- Ligne vide ----
        if (ligne.trim() === '') { i++; continue; }

        // ---- Paragraphe ----
        var para = [];
        while (i < n && !estDebutBloc(lignes[i])) { para.push(lignes[i].trim()); i++; }
        if (para.length > 0) html.push('<p>' + mdInline(para.join(' ')) + '</p>');
    }

    return { html: html.join('\n'), titres: titres };
}

// ============================================================
// 11. VALIDATION DE L'ANALYSE (demande #59)
// ------------------------------------------------------------
// Une demande estimée L au moment du tri passe par une analyse, qu'au moins un
// admin doit relire avant que le dev commence. UNE validation suffit : c'est le
// trigger `trg_demande_validation` qui fait basculer la demande en « Prêt à dev »,
// en base et pas ici — une règle de cohérence ne doit pas dépendre du chemin
// emprunté (même raisonnement qu'en #44).
//
// Retirer sa validation ne fait PAS revenir en arrière : le compteur baisse,
// l'état reste. Une demande qui retomberait toute seule en analyse parce que
// quelqu'un a décoché serait plus déroutante qu'utile.
// ============================================================
function renderValidation() {
    var bloc = document.getElementById('fd-validation-bloc');
    if (!bloc) return;

    var aRelire = attendValidationSpec(laDemande.etat);

    // Rien à montrer : ni relecture attendue, ni validation passée à afficher.
    if (!aRelire && lesValidations.length === 0) {
        bloc.style.display = 'none';
        return;
    }
    bloc.style.display = '';

    var aide = document.getElementById('fd-validation-aide');
    if (validationsIndisponibles) {
        aide.innerHTML = '<span class="fiche-erreur"><i class="fa-solid fa-triangle-exclamation"></i> '
            + 'Migration <code>scripts/migration-demande-59-flux-analyse-validation.sql</code> '
            + 'non jouée : la validation n\'est pas encore disponible.</span>';
        document.getElementById('fd-validation-liste').innerHTML = '';
        document.getElementById('fd-validation-actions').innerHTML = '';
        return;
    }

    aide.textContent = aRelire
        ? 'Une seule validation suffit : dès qu\'un admin valide, la demande passe en « Prêt à dev ».'
        : 'Analyse déjà validée — la demande a quitté la phase de relecture.';

    var liste = document.getElementById('fd-validation-liste');
    if (lesValidations.length === 0) {
        liste.innerHTML = '<p class="fiche-validation-vide">Personne n\'a encore relu cette analyse.</p>';
    } else {
        liste.innerHTML = lesValidations.map(function(v) {
            return '<div class="fiche-validation-ligne"><i class="fa-solid fa-circle-check"></i> '
                 + '<strong>' + escapeHtml(nomAffiche(v.admin_email)) + '</strong> a validé '
                 + '<span class="fiche-validation-date">le ' + escapeHtml(formatDateHeureFr(v.created_at)) + '</span>'
                 + '</div>';
        }).join('');
    }

    var moi = (window.getActiveEmail() || '').trim().toLowerCase();
    var maValidation = null;
    for (var i = 0; i < lesValidations.length; i++) {
        if ((lesValidations[i].admin_email || '').trim().toLowerCase() === moi) {
            maValidation = lesValidations[i];
        }
    }

    var actions = document.getElementById('fd-validation-actions');
    if (maValidation) {
        actions.innerHTML = '<button type="button" class="user-modal-btn" onclick="retirerValidation('
            + maValidation.id + ')"><i class="fa-solid fa-rotate-left"></i> Retirer ma validation</button>';
    } else {
        actions.innerHTML = '<button type="button" class="user-modal-btn user-modal-btn-primary" '
            + 'onclick="validerSpec()"><i class="fa-solid fa-circle-check"></i> '
            + 'J\'ai lu et je valide l\'analyse</button>';
    }
}

function validerSpec() {
    var email = (window.getActiveEmail() || '').trim();
    if (!email) {
        showToast('Session expirée : reconnectez-vous', 'error');
        return;
    }
    supabaseFetch('/rest/v1/demande_validations', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ demande_id: laDemande.id, admin_email: email })
    })
        .then(function(rows) {
            if (rows && rows.length) lesValidations.push(rows[0]);
            // L'état a changé EN BASE (trigger) : on relit plutôt que de le
            // deviner, sinon la fiche afficherait encore « Analyse à valider ».
            return supabaseFetch('/rest/v1/demandes?id=eq.' + laDemande.id + '&select=*');
        })
        .then(function(rows) {
            if (rows && rows.length) laDemande = rows[0];
            renderFiche();
            renderValidation();
            showToast('Analyse validée — la demande passe en « ' + getEtatDef(laDemande.etat).label + ' »', 'success');
        })
        .catch(function(error) {
            showToast('Erreur validation : ' + error.message, 'error');
        });
}

function retirerValidation(id) {
    supabaseFetch('/rest/v1/demande_validations?id=eq.' + id, { method: 'DELETE' })
        .then(function() {
            lesValidations = lesValidations.filter(function(v) { return v.id !== id; });
            renderValidation();
            showToast('Validation retirée — l\'état de la demande, lui, ne change pas', 'info');
        })
        .catch(function(error) {
            showToast('Erreur : ' + error.message, 'error');
        });
}

// ============================================================
// 12. FIL DE COMMENTAIRES
// ============================================================
function remplirSelectSection(titres) {
    var sel = document.getElementById('fd-com-section');
    if (!sel) return;
    var html = '<option value="">— La demande en général —</option>';
    titres.forEach(function(t) {
        var prefixe = new Array(Math.max(t.niveau - 1, 0) + 1).join('　');
        html += '<option value="' + escapeAttr(t.texte) + '">' + prefixe + escapeHtml(t.texte) + '</option>';
    });
    sel.innerHTML = html;
}

function renderCommentaires() {
    var liste = document.getElementById('fd-commentaires-liste');
    var form = document.getElementById('fd-commentaire-form');
    if (!liste) return;

    if (commentairesIndisponibles) {
        liste.innerHTML = '<p class="fiche-erreur"><i class="fa-solid fa-triangle-exclamation"></i> '
            + 'Les commentaires ne sont pas encore disponibles : la migration '
            + '<code>scripts/migration-demande-58-docs-et-commentaires.sql</code> n\'a pas été jouée. '
            + 'Le reste de la fiche fonctionne normalement.</p>';
        if (form) form.style.display = 'none';
        return;
    }
    if (form) form.style.display = '';

    if (lesCommentaires.length === 0) {
        liste.innerHTML = '<p class="fiche-aide">Aucun commentaire pour l\'instant. '
                        + 'Soyez le premier à relire.</p>';
        return;
    }

    var moi = (window.getActiveEmail() || '').trim().toLowerCase();
    liste.innerHTML = lesCommentaires.map(function(c) {
        var estMien = (c.auteur_email || '').trim().toLowerCase() === moi;
        var contexte = '';
        if (c.doc) {
            contexte = '<span class="fiche-com-contexte"><i class="fa-solid fa-file-lines"></i> '
                     + escapeHtml(nomCourtDoc(c.doc))
                     + (c.section ? ' › ' + escapeHtml(c.section) : '') + '</span>';
        }
        var modifie = c.updated_at ? ' <span class="fiche-com-modifie">(modifié)</span>' : '';

        if (commentaireEnEdition === c.id) {
            return '<article class="fiche-com">'
                + '<header class="fiche-com-tete"><strong>' + escapeHtml(nomAffiche(c.auteur_email)) + '</strong>'
                + '<span class="fiche-com-date">' + escapeHtml(formatDateHeureFr(c.created_at)) + '</span>'
                + contexte + '</header>'
                + '<textarea class="fiche-textarea" id="fd-com-edit-' + c.id + '" rows="4">'
                + escapeHtml(c.texte) + '</textarea>'
                + '<div class="fiche-com-actions">'
                + '<button type="button" class="fiche-com-lien" onclick="annulerEditionCommentaire()">Annuler</button>'
                + '<button type="button" class="fiche-com-lien" onclick="enregistrerEditionCommentaire(' + c.id + ')">Enregistrer</button>'
                + '</div></article>';
        }

        return '<article class="fiche-com">'
            + '<header class="fiche-com-tete"><strong>' + escapeHtml(nomAffiche(c.auteur_email)) + '</strong>'
            + '<span class="fiche-com-date">' + escapeHtml(formatDateHeureFr(c.created_at)) + '</span>'
            + modifie + contexte + '</header>'
            + '<div class="fiche-com-texte">' + escapeHtml(c.texte).replace(/\n/g, '<br>') + '</div>'
            + (estMien
                ? '<div class="fiche-com-actions">'
                  + '<button type="button" class="fiche-com-lien" onclick="editerCommentaire(' + c.id + ')">Modifier</button>'
                  + '<button type="button" class="fiche-com-lien fiche-com-lien--danger" onclick="supprimerCommentaire(' + c.id + ')">Supprimer</button>'
                  + '</div>'
                : '')
            + '</article>';
    }).join('');
}

function posterCommentaire() {
    var texte = document.getElementById('fd-com-texte').value.trim();
    if (!texte) {
        showToast('Écrivez votre remarque avant de publier', 'error');
        return;
    }
    var email = (window.getActiveEmail() || '').trim();
    if (!email) {
        showToast('Session expirée : reconnectez-vous', 'error');
        return;
    }
    var section = document.getElementById('fd-com-section').value || null;

    supabaseFetch('/rest/v1/demande_commentaires', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
            demande_id: laDemande.id,
            doc: docCourant || null,
            section: section,
            auteur_email: email,
            texte: texte
        })
    })
        .then(function(rows) {
            if (rows && rows.length) lesCommentaires.push(rows[0]);
            document.getElementById('fd-com-texte').value = '';
            document.getElementById('fd-com-section').value = '';
            renderCommentaires();
            showToast('Commentaire publié', 'success');
            notifierAdmins(texte, section);
        })
        .catch(function(error) {
            showToast('Erreur publication : ' + error.message, 'error');
        });
}

// Un commentaire que personne ne voit ne sert à rien : les autres admins sont
// prévenus par la cloche. Best-effort — l'échec d'une notification ne doit
// jamais faire croire que le commentaire n'est pas passé.
function notifierAdmins(texte, section) {
    var extrait = texte.replace(/\s+/g, ' ');
    if (extrait.length > 120) extrait = extrait.slice(0, 119) + '…';
    var qui = nomAffiche(window.getActiveEmail());

    supabaseFetch('/rest/v1/notifications', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
            type: 'demande_commentaire',
            cible: 'admins',
            titre: qui + ' a commenté la demande #' + laDemande.id,
            texte: (section ? '(sur « ' + section + ' ») ' : '') + extrait,
            lien: 'demande.html?id=' + laDemande.id
        })
    }).catch(function(e) {
        console.warn('Notif admins (#58) : échec', e);
    });
}

function editerCommentaire(id) {
    commentaireEnEdition = id;
    renderCommentaires();
}

function annulerEditionCommentaire() {
    commentaireEnEdition = null;
    renderCommentaires();
}

function enregistrerEditionCommentaire(id) {
    var champ = document.getElementById('fd-com-edit-' + id);
    if (!champ) return;
    var texte = champ.value.trim();
    if (!texte) {
        showToast('Un commentaire vide s\'appelle une suppression', 'error');
        return;
    }
    supabaseFetch('/rest/v1/demande_commentaires?id=eq.' + id, {
        method: 'PATCH',
        body: JSON.stringify({ texte: texte, updated_at: new Date().toISOString() })
    })
        .then(function() {
            for (var i = 0; i < lesCommentaires.length; i++) {
                if (lesCommentaires[i].id === id) {
                    lesCommentaires[i].texte = texte;
                    lesCommentaires[i].updated_at = new Date().toISOString();
                }
            }
            commentaireEnEdition = null;
            renderCommentaires();
            showToast('Commentaire modifié', 'success');
        })
        .catch(function(error) {
            showToast('Erreur modification : ' + error.message, 'error');
        });
}

function supprimerCommentaire(id) {
    supabaseFetch('/rest/v1/demande_commentaires?id=eq.' + id, { method: 'DELETE' })
        .then(function() {
            lesCommentaires = lesCommentaires.filter(function(c) { return c.id !== id; });
            renderCommentaires();
            showToast('Commentaire supprimé', 'success');
        })
        .catch(function(error) {
            showToast('Erreur suppression : ' + error.message, 'error');
        });
}
