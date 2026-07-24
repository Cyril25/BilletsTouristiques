// ============================================================
// MES INSCRIPTIONS — Vue membre de toutes ses inscriptions
// Story 5.6
// ============================================================

var mesInscriptions = [];
var billetsMap = {};
var collecteursMap = {};
// Demande #16 — {collecte_id: {nom, prix, prix_variante, payer_fdp, fdp_com, scope,
// categorie, collecteur}}. Porte désormais tout le commercial, lu sur le billet avant.
var collectesMap = {};
var membrePays = '';
var fraisPortData = [];
var mesFraisPort = []; // Frais de port dus (enveloppes expédiées avec prix saisi, non confirmés)
var currentInscFilter = 'tous'; // #9 — filtre actif
var currentInscSearch = ''; // Recherche texte (billet / référence / collecteur / collecte)
var modifierInscCurrent = null; // Inscription en cours de modification (pré-collecte)

// #14 — Onboarding membre inscriptions
function getOnboardingMembreHtml() {
    var key = 'bt_onboarding_membre_dismissed';
    if (localStorage.getItem(key)) return '';

    return '<div class="onboarding-banner" id="onboarding-membre">'
        + '<button class="onboarding-close" onclick="dismissOnboardingMembre()" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>'
        + '<h3 class="onboarding-title"><i class="fa-solid fa-hand-wave"></i> Bienvenue sur vos inscriptions !</h3>'
        + '<p class="onboarding-subtitle">Nouveau système : fini le Google Form ! Voici comment s\'inscrire à une collecte :</p>'
        + '<div class="onboarding-steps">'
        + '<div class="onboarding-step">'
        + '<div class="onboarding-step-num">1</div>'
        + '<div class="onboarding-step-content">'
        + '<strong>Choisissez un billet dans le catalogue</strong>'
        + '<p>Depuis la page <a href="billets.html">Les billets</a>, cliquez sur <em>« S\'inscrire »</em> sur la collecte qui vous intéresse.</p>'
        + '</div></div>'
        + '<div class="onboarding-step">'
        + '<div class="onboarding-step-num">2</div>'
        + '<div class="onboarding-step-content">'
        + '<strong>Indiquez la quantité voulue</strong>'
        + '<p>Choisissez le nombre de billets (normal et/ou variante) puis validez.</p>'
        + '</div></div>'
        + '<div class="onboarding-step">'
        + '<div class="onboarding-step-num">3</div>'
        + '<div class="onboarding-step-content">'
        + '<strong>Payez le collecteur</strong>'
        + '<p>Réglez le collecteur (virement, chèque…), puis déclarez votre paiement ici avec le bouton <em>« Déclarer paiement »</em>.</p>'
        + '</div></div>'
        + '<div class="onboarding-step">'
        + '<div class="onboarding-step-num">4</div>'
        + '<div class="onboarding-step-content">'
        + '<strong>Recevez vos billets par courrier</strong>'
        + '<p>Le collecteur prépare votre enveloppe et vous l\'envoie. Vous pouvez suivre l\'avancement dans l\'onglet <em>« Mes envois »</em>.</p>'
        + '</div></div>'
        + '</div>'
        + '</div>';
}

function dismissOnboardingMembre() {
    localStorage.setItem('bt_onboarding_membre_dismissed', '1');
    var el = document.getElementById('onboarding-membre');
    if (el) el.remove();
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'success');
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    } else {
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }
}

// ============================================================
// 1. CHARGEMENT DES DONNÉES
// ============================================================

function loadMesInscriptions() {
    var email = window.getActiveEmail();
    if (!email) return;

    var annee = new Date().getFullYear();

    // Étape 1 : charger les inscriptions du membre (pas_interesse = false)
    supabaseFetch('/rest/v1/inscriptions?membre_email=eq.' + encodeURIComponent(email) + '&pas_interesse=eq.false&select=*&order=date_inscription.desc')
        .then(function(data) {
            mesInscriptions = data || [];

            // Étape 2 : charger les billets associés pour noms, villes, prix, PayerFDP
            var billetIds = mesInscriptions.map(function(i) { return i.billet_id; });
            if (billetIds.length === 0) {
                renderInscriptions();
                return;
            }
            var idsParam = 'id=in.(' + billetIds.join(',') + ')';
            // Demande #16 — Prix/PrixVariante/PayerFDP/Categorie retirés du select :
            // ils vivent sur la collecte. Le billet ne garde que son identité.
            return supabaseFetch('/rest/v1/billets?' + idsParam + '&select=id,"NomBillet","Ville","Reference","Millesime","Version","HasVariante"');
        })
        .then(function(billets) {
            if (billets) {
                billetsMap = {};
                billets.forEach(function(b) { billetsMap[b.id] = b; });
            }

            // Si le billet n'a pas de variante (HasVariante absent ou 'N'),
            // ignorer toute valeur résiduelle de nb_variantes côté affichage/totaux
            mesInscriptions.forEach(function(insc) {
                var b = billetsMap[insc.billet_id];
                if (b && (!b.HasVariante || b.HasVariante === 'N')) {
                    insc.nb_variantes = 0;
                }
            });

            // Étape 3 : charger collecteurs, pays du membre, frais de port, enveloppes dues en parallèle
            var promises = [
                supabaseFetch('/rest/v1/collecteurs?select=alias,paypal_email,paypal_me,email_membre'),
                supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(email) + '&select=pays'),
                supabaseFetch('/rest/v1/frais_port?annee=eq.' + annee + '&select=*'),
                // Frais de port dus : enveloppes avec prix saisi, non encore confirmé payé
                supabaseFetch('/rest/v1/enveloppes?membre_email=eq.' + encodeURIComponent(email) + '&prix_envoi_reel=not.is.null&statut_paiement_port=neq.confirme&select=*&order=date_expedition.asc')
            ];
            // Demande #16 — la collecte porte prix/FDP/statut : on la charge toujours,
            // et en entier (avant, seulement le nom, pour les collectes supplémentaires).
            var collecteIds = mesInscriptions
                .filter(function(i) { return i.collecte_id; })
                .map(function(i) { return i.collecte_id; });
            if (collecteIds.length > 0) {
                promises.push(supabaseFetch('/rest/v1/collectes?id=in.(' + collecteIds.join(',') +
                    ')&select=id,nom,prix,prix_variante,payer_fdp,fdp_com,scope,categorie,collecteur'));
            }
            return Promise.all(promises);
        })
        .then(function(results) {
            if (!results) return;
            var collecteurs = results[0];
            var membres = results[1];
            var fraisPort = results[2];
            var enveloppesPort = results[3] || [];

            if (collecteurs) {
                collecteursMap = {};
                collecteurs.forEach(function(c) { collecteursMap[c.alias] = c; });
            }
            membrePays = (membres && membres[0]) ? (membres[0].pays || '') : '';
            fraisPortData = fraisPort || [];
            // Ne garder que les frais de port réellement dus (prix > 0)
            mesFraisPort = enveloppesPort.filter(function(e) {
                return e.prix_envoi_reel !== null && e.prix_envoi_reel !== undefined && parseFloat(e.prix_envoi_reel) > 0;
            });
            // Demande #16 — collectesMap stocke l'objet complet (index 4)
            collectesMap = {};
            if (results[4]) {
                results[4].forEach(function(c) { collectesMap[c.id] = c; });
            }

            renderInscriptions();
        })
        .catch(function(error) {
            console.error('Erreur chargement inscriptions:', error);
        });
}

// ============================================================
// 2. RENDU DE LA LISTE
// ============================================================

// ============================================================
// Demande #16 — source unique des données commerciales : la COLLECTE
// ============================================================
// Avant, prix / prix variante / PayerFDP / statut se lisaient sur le billet, avec
// le même bloc de calcul recopié à 6 endroits. Tout passe désormais par ici.

// Renvoie {prix, prixVar, payerFdp, categorie, nom, collecteur, indisponible}.
// indisponible = collecte absente de la map : on n'invente pas de montant (AC14).
function getTarif(insc) {
    var c = (insc && insc.collecte_id) ? collectesMap[insc.collecte_id] : null;
    if (!c) {
        console.warn('[#16] Collecte introuvable pour l\'inscription', insc && insc.id);
        return { prix: 0, prixVar: 0, payerFdp: '', categorie: '', nom: '', collecteur: null, scope: '', indisponible: true };
    }
    var prix = parseFloat(c.prix || 0);
    var prixVar = (c.prix_variante !== null && c.prix_variante !== undefined && c.prix_variante !== '')
        ? parseFloat(c.prix_variante) : prix;
    return {
        prix: prix,
        prixVar: prixVar,
        payerFdp: c.payer_fdp || '',
        categorie: c.categorie || '',
        nom: c.nom || '',
        collecteur: c.collecteur || null,
        scope: c.scope || 'normal',
        indisponible: false
    };
}

// Rien n'est dû tant que la collecte est en pré-collecte (prix pas encore fixé),
// ni si la collecte est introuvable. Remplace les gardes sur billet.Categorie.
function montantExigible(insc) {
    var t = getTarif(insc);
    return !t.indisponible && t.categorie !== 'Pré collecte';
}

function findFdpPrice(nbBillets, destination, typeEnvoi) {
    for (var i = 0; i < fraisPortData.length; i++) {
        var r = fraisPortData[i];
        if (r.destination === destination && r.type_envoi === typeEnvoi &&
            nbBillets >= r.qte_min && nbBillets <= r.qte_max) {
            return parseFloat(r.prix);
        }
    }
    return 0;
}

// #9 — Filtrage par statut de paiement
function filterInscriptions(statut) {
    currentInscFilter = statut;
    // Mettre à jour les boutons actifs
    var btns = document.querySelectorAll('.inscriptions-filter-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }
    // Trouver le bouton correspondant par son attribut onclick (résistant aux réordonnements)
    for (var j = 0; j < btns.length; j++) {
        if (btns[j].getAttribute('onclick') === "filterInscriptions('" + statut + "')") {
            btns[j].classList.add('active');
            break;
        }
    }
    renderInscriptions();
}

// Recherche texte — filtre saisi dans la barre de recherche
function searchInscriptions(q) {
    currentInscSearch = (q || '').trim().toLowerCase();
    // Une recherche ne doit pas être masquée par un filtre de statut resté actif :
    // repasser sur « Tous » dès qu'un texte est saisi.
    if (currentInscSearch && currentInscFilter !== 'tous') {
        currentInscFilter = 'tous';
        var btns = document.querySelectorAll('.inscriptions-filter-btn');
        for (var i = 0; i < btns.length; i++) {
            var isTous = btns[i].getAttribute('onclick') === "filterInscriptions('tous')";
            btns[i].classList.toggle('active', isTous);
        }
    }
    renderInscriptions();
}

// L'inscription correspond-elle à la recherche courante ? (nom billet / référence / collecteur / collecte)
function inscMatchesSearch(insc) {
    if (!currentInscSearch) return true;
    var billet = billetsMap[insc.billet_id] || {};
    var haystack = [
        billet.NomBillet, billet.Reference, billet.Millesime, billet.Version,
        billet.Ville, getTarif(insc).collecteur,
        getTarif(insc).nom
    ].join(' ').toLowerCase();
    return haystack.indexOf(currentInscSearch) !== -1;
}

// Un pseudo-item frais de port correspond-il à la recherche ? (collecteur uniquement)
function portMatchesSearch(env) {
    if (!currentInscSearch) return true;
    return String(env.collecteur_alias || '').toLowerCase().indexOf(currentInscSearch) !== -1;
}

function estBeneficiaire(insc, activeEmail) {
    // Demande #16 (bascule) — le collecteur vient de la collecte de l'inscription
    var col = collecteursMap[getTarif(insc).collecteur];
    return !!(col && col.email_membre && col.email_membre === activeEmail);
}

// Le membre est-il le collecteur (bénéficiaire) de cette enveloppe ? → pas de frais à payer
function estBeneficiairePort(env, activeEmail) {
    var col = collecteursMap[env.collecteur_alias];
    return !!(col && col.email_membre && col.email_membre === activeEmail);
}

// Construit un "pseudo-item" frais de port pour traverser le même regroupement que les inscriptions
function makePortItem(env) {
    return {
        _isPort: true,
        env: env,
        collecteur: env.collecteur_alias || '(sans collecteur)',
        statut: env.statut_paiement_port || 'non_paye',
        montant: parseFloat(env.prix_envoi_reel || 0)
    };
}

// Badge / bouton de paiement des frais de port (côté membre)
function badgePaiementPortMembre(statut, enveloppeId) {
    if (statut === 'confirme') return '<span class="badge-paiement badge-paye">Payé</span>';
    if (statut === 'declare') {
        return '<span class="badge-paiement badge-declare" title="En attente de vérification par le collecteur">En attente</span>'
            + '<button class="btn-annuler-declaration" title="Déclaré par erreur ? Annuler la déclaration de paiement" onclick="annulerDeclaration(' + enveloppeId + ', true)"><i class="fa-solid fa-rotate-left"></i> Annuler</button>';
    }
    return '<button class="btn-jai-paye" title="Cliquez pour déclarer le paiement des frais de port" onclick="declarerPaiementPort(' + enveloppeId + ')"><i class="fa-solid fa-hand-holding-dollar"></i> J\'ai payé</button>';
}

// Carte dédiée pour des frais de port dus (distincte d'une carte billet)
function renderPortCard(item) {
    var env = item.env;
    var statut = item.statut;
    var montant = item.montant;
    var collecteur = collecteursMap[item.collecteur] || {};
    var dateExp = env.date_expedition ? new Date(env.date_expedition).toLocaleDateString('fr-FR') : '';

    var paypalNoteHtml = '';
    var paypalBtnHtml = '';
    if (statut === 'non_paye' && (collecteur.paypal_me || collecteur.paypal_email)) {
        var note = 'Frais d\'envoi ' + item.collecteur + ' = ' + montant.toFixed(2) + '€';
        var noteJs = note.replace(/'/g, "\\'");
        var paypalUrl = '';
        var paypalManualHint = '';
        if (collecteur.paypal_me) {
            paypalUrl = 'https://paypal.me/' + encodeURIComponent(collecteur.paypal_me) + '/' + montant.toFixed(2);
        } else if (collecteur.paypal_email) {
            paypalUrl = 'https://www.paypal.com/myaccount/transfer/homepage/pay';
            var emailJs = collecteur.paypal_email.replace(/'/g, "\\'");
            paypalManualHint = '<div class="paypal-note-hint"><i class="fa-solid fa-circle-info"></i> Envoyer <strong>' + montant.toFixed(2) + '€</strong> à <code>' + escapeHtml(collecteur.paypal_email) + '</code> <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + emailJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier email\'},2000)"><i class="fa-solid fa-copy"></i> Copier email</button> — cocher <strong>«&nbsp;Entre proches&nbsp;»</strong></div>';
        }
        if (paypalUrl) {
            paypalNoteHtml = '<div class="paypal-note-hint"><i class="fa-solid fa-paste"></i> Note à coller : ' + escapeHtml(note) + ' <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + noteJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier\'},2000)"><i class="fa-solid fa-copy"></i> Copier</button></div>' + paypalManualHint;
            paypalBtnHtml = '<a href="' + paypalUrl + '" target="_blank" class="btn-payer"><i class="fa-brands fa-paypal"></i> Payer via PayPal</a>';
        }
    }

    var montantClass = statut === 'confirme' ? 'montant-paye' : 'montant-non-paye';
    return '<div class="inscription-card inscription-card-port">'
        + '<div class="inscription-card-header">'
        + '<strong><i class="fa-solid fa-truck-fast"></i> Frais d\'envoi</strong>'
        + '<span class="badge-frais-port">Frais de port</span>'
        + (item.collecteur ? '<span class="inscription-collecteur"><i class="fa-solid fa-user"></i> ' + escapeHtml(item.collecteur) + '</span>' : '')
        + '</div>'
        + '<div class="inscription-card-details">'
        + '<span class="' + montantClass + '"><i class="fa-solid fa-euro-sign"></i> ' + montant.toFixed(2) + ' €</span>'
        + '<span class="frais-port-info"><i class="fa-solid fa-circle-info"></i> Avancés par le collecteur pour votre envoi' + (dateExp ? ' du ' + dateExp : '') + '</span>'
        + '</div>'
        + '<div class="inscription-card-statuts">'
        + badgePaiementPortMembre(statut, env.id)
        + '</div>'
        + paypalNoteHtml
        + (paypalBtnHtml ? '<div class="inscription-card-footer">' + paypalBtnHtml + '</div>' : '')
        + '</div>';
}

function renderInscriptions() {
    var container = document.getElementById('inscriptions-list');
    var emptyState = document.getElementById('inscriptions-empty');
    var summary = document.getElementById('inscriptions-summary');
    if (!container) return;

    // #14 — Onboarding membre
    var onboardingHtml = getOnboardingMembreHtml();

    // État vide
    if (mesInscriptions.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = '';
        if (summary) summary.innerHTML = onboardingHtml;
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    // #9 — Filtrer par statut
    var filteredInscriptions = mesInscriptions;
    if (currentInscFilter === 'prix_non_defini') {
        filteredInscriptions = mesInscriptions.filter(function(insc) {
            return getTarif(insc).categorie === 'Pré collecte';
        });
    } else if (currentInscFilter === 'pas_de_collecte') {
        // Demande #16 — ce filtre ne peut plus rien remonter : une inscription est
        // désormais toujours rattachée à une collecte (FK NOT NULL). Conservé le
        // temps que le chip disparaisse de l'UI.
        filteredInscriptions = [];
    } else if (currentInscFilter === 'non_paye') {
        filteredInscriptions = mesInscriptions.filter(function(insc) {
            return (insc.statut_paiement || 'non_paye') === 'non_paye' && montantExigible(insc);
        });
    } else if (currentInscFilter !== 'tous') {
        filteredInscriptions = mesInscriptions.filter(function(insc) {
            return (insc.statut_paiement || 'non_paye') === currentInscFilter;
        });
    }

    // Recherche texte par-dessus le filtre de statut
    if (currentInscSearch) {
        filteredInscriptions = filteredInscriptions.filter(inscMatchesSearch);
    }

    var activeEmail = window.getActiveEmail();
    var totalDu = 0;
    var totalEnAttente = 0;


    function renderInscriptionCard(insc) {
        var billet = billetsMap[insc.billet_id] || {};
        var tarif = getTarif(insc);
        var prix = tarif.prix;
        var prixVar = tarif.prixVar;
        var nbNormaux = insc.nb_normaux || 0;
        var nbVariantes = insc.nb_variantes || 0;
        var montant = (prix * nbNormaux) + (prixVar * nbVariantes);
        var statut = insc.statut_paiement || 'non_paye';
        var isBenef = estBeneficiaire(insc, activeEmail);
        var exigible = montantExigible(insc);

        var fdpMontant = 0;
        if (tarif.payerFdp === 'oui' && exigible) {
            var nbTotal = nbNormaux + nbVariantes;
            var dest = destinationPays(membrePays);
            var typeEnvoi = (insc.mode_envoi || 'Normal').toLowerCase();
            fdpMontant = findFdpPrice(nbTotal, dest, typeEnvoi);
        }
        var montantAvecFdp = montant + fdpMontant;

        if (exigible) {
            if (statut === 'non_paye' && !isBenef) totalDu += montantAvecFdp;
            else if (statut === 'declare' && !isBenef) totalEnAttente += montantAvecFdp;
        }

        var collecteur = collecteursMap[tarif.collecteur] || {};
        var paypalNoteHtml = '';
        var paypalBtnHtml = '';
        if (statut === 'non_paye' && !isBenef && insc.mode_paiement === 'PayPal' && exigible) {
            // Construire la note PayPal : Ref année-version titre - détail quantités = total
            var refPart = (billet.Reference || '') + ' ' + (billet.Millesime || '') + (billet.Version ? '-' + billet.Version : '');
            var noteparts = [refPart.trim(), billet.NomBillet || ''];
            var detailParts = [];
            if (nbNormaux > 0) detailParts.push(prix.toFixed(2) + '€ x ' + nbNormaux);
            if (nbVariantes > 0) detailParts.push(prixVar.toFixed(2) + '€ x ' + nbVariantes + ' var.');
            var paypalNote = noteparts.join(' ') + ' - ' + detailParts.join(' + ') + ' = ' + montantAvecFdp.toFixed(2) + '€';
            var paypalNoteJs = paypalNote.replace(/'/g, "\\'");

            var paypalUrl = '';
            var paypalManualHint = '';
            if (collecteur.paypal_me) {
                paypalUrl = 'https://paypal.me/' + encodeURIComponent(collecteur.paypal_me) + '/' + montantAvecFdp.toFixed(2);
            } else if (collecteur.paypal_email) {
                paypalUrl = 'https://www.paypal.com/myaccount/transfer/homepage/pay';
                var emailJs = collecteur.paypal_email.replace(/'/g, "\\'");
                paypalManualHint = '<div class="paypal-note-hint"><i class="fa-solid fa-circle-info"></i> Envoyer <strong>' + montantAvecFdp.toFixed(2) + '€</strong> à <code>' + escapeHtml(collecteur.paypal_email) + '</code> <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + emailJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier email\'},2000)"><i class="fa-solid fa-copy"></i> Copier email</button> — cocher <strong>«&nbsp;Entre proches&nbsp;»</strong></div>';
            }
            if (paypalUrl) {
                paypalNoteHtml = '<div class="paypal-note-hint"><i class="fa-solid fa-paste"></i> Note à coller : ' + escapeHtml(paypalNote) + ' <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + paypalNoteJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier\'},2000)"><i class="fa-solid fa-copy"></i> Copier</button></div>' + paypalManualHint;
                paypalBtnHtml = '<a href="' + paypalUrl + '" target="_blank" class="btn-payer"><i class="fa-brands fa-paypal"></i> Payer via PayPal</a>';
            }
        }

        var dateInsc = insc.date_inscription ? new Date(insc.date_inscription).toLocaleDateString('fr-FR') : '';
        var montantClass = isBenef ? 'montant-indefini' : (statut === 'confirme' ? 'montant-paye' : 'montant-non-paye');

        return '<div class="inscription-card">'
            + '<div class="inscription-card-header">'
            + '<strong>' + escapeHtml(((billet.Reference ? billet.Reference + ' ' : '') + (billet.Millesime || '') + (billet.Version ? '-' + billet.Version : '') + (billet.NomBillet ? ' - ' + billet.NomBillet : '')).trim() || 'Billet inconnu') + '</strong>'
            + (tarif.nom ? '<span class="badge-nom-collecte-insc">' + escapeHtml(tarif.nom) + '</span>' : '')
            + (tarif.collecteur ? '<span class="inscription-collecteur"><i class="fa-solid fa-user"></i> ' + escapeHtml(tarif.collecteur) + '</span>' : '')
            + '</div>'
            + '<div class="inscription-card-details">'
            // Demande #16 — le périmètre ouvert vient du scope de la collecte
            // (billet.VersionNormaleExiste n'était même pas dans le select : la
            // branche « variante seule » ne se déclenchait jamais).
            + '<span><i class="fa-solid fa-ticket"></i> ' + (tarif.scope === 'variante' ? (nbVariantes + ' var.') : (nbNormaux + (nbVariantes > 0 ? ' + ' + nbVariantes + ' var.' : ''))) + '</span>'
            + (tarif.categorie === 'Pré collecte'
                ? '<span class="montant-indefini"><i class="fa-solid fa-euro-sign"></i> Prix non défini</span>'
                : tarif.indisponible
                ? '<span class="montant-indefini"><i class="fa-solid fa-ban"></i> Prix indisponible</span>'
                : (fdpMontant > 0
                    ? '<span class="' + montantClass + '"><i class="fa-solid fa-euro-sign"></i> ' + montant.toFixed(2) + ' \u20AC + fdp ' + fdpMontant.toFixed(2) + ' \u20AC, soit ' + montantAvecFdp.toFixed(2) + ' \u20AC</span>'
                    : '<span class="' + montantClass + '"><i class="fa-solid fa-euro-sign"></i> ' + montant.toFixed(2) + ' \u20AC</span>'))
            + '</div>'
            + '<div class="inscription-card-statuts">'
            + badgeCollecte(tarif.categorie)
            + badgePaiementMembre(statut, insc.id, tarif.categorie, isBenef)
            + '<span class="badge-paiement ' + (insc.envoye ? 'badge-envoye' : 'badge-non-envoye') + '">' + (insc.envoye ? 'Envoy\u00E9' : 'Non envoy\u00E9') + '</span>'
            + '</div>'
            + paypalNoteHtml
            + '<div class="inscription-card-footer">'
            + '<span class="inscription-date"><i class="fa-regular fa-calendar"></i> ' + dateInsc + '</span>'
            + paypalBtnHtml
            + '</div>'
            + (tarif.categorie === 'Pré collecte'
                ? '<div class="inscription-card-actions">'
                    + '<button class="btn-modifier-insc" onclick="ouvrirModifierPreCollecte(' + insc.id + ')"><i class="fa-solid fa-pen"></i> Modifier</button>'
                    + '<button class="btn-desinscrire" onclick="desinscriprePreCollecte(' + insc.id + ')"><i class="fa-solid fa-xmark"></i> Se désinscrire</button>'
                    + '</div>'
                : '')
            + '</div>';
    }

    // Récap global par collecteur (uniquement section "À payer")
    function buildCollecteurRecapHtml(collecteurNom, inscList) {
        var totalGlobal = 0;
        var ids = [];
        var portIds = [];
        var paypalParts = [];
        var totalPaypal = 0;
        var collecteurObj = collecteursMap[collecteurNom] || {};
        var collecteurAPaypal = !!(collecteurObj.paypal_me || collecteurObj.paypal_email);

        inscList.forEach(function(insc) {
            if (insc._isPort) {
                var totalPort = insc.montant;
                totalGlobal += totalPort;
                portIds.push(insc.env.id);
                // Les frais de port sont payables via PayPal dès que le collecteur en a un
                if (collecteurAPaypal) {
                    paypalParts.push('Frais d\'envoi ' + totalPort.toFixed(2) + '€');
                    totalPaypal += totalPort;
                }
                return;
            }
            var billet = billetsMap[insc.billet_id] || {};
            var tarifI = getTarif(insc);
            var prix = tarifI.prix;
            var prixVar = tarifI.prixVar;
            var nbN = insc.nb_normaux || 0;
            var nbV = insc.nb_variantes || 0;
            var montant = (prix * nbN) + (prixVar * nbV);
            var fdp = 0;
            if (tarifI.payerFdp === 'oui' && montantExigible(insc)) {
                var dest = destinationPays(membrePays);
                fdp = findFdpPrice(nbN + nbV, dest, (insc.mode_envoi || 'Normal').toLowerCase());
            }
            var total = montant + fdp;
            totalGlobal += total;
            ids.push(insc.id);

            if (insc.mode_paiement === 'PayPal') {
                var refCompact = ((billet.Reference || '') + ' ' + (billet.Millesime || '') + (billet.Version ? '-' + billet.Version : '')).trim();
                paypalParts.push(refCompact + ' ' + total.toFixed(2) + '\u20AC');
                totalPaypal += total;
            }
        });

        if (inscList.length < 2) return ''; // pas la peine pour 1 seule inscription

        var btnPaye = '<button class="btn-jai-paye btn-jai-paye-groupe" onclick="declarerPaiementGroupe(\'' + ids.join(',') + '\',\'' + portIds.join(',') + '\')"><i class="fa-solid fa-hand-holding-dollar"></i> J\'ai payé (' + totalGlobal.toFixed(2) + '\u20AC)</button>';

        var paypalNoteHtml = '';
        var paypalBtnHtml = '';
        if (paypalParts.length > 0 && (collecteurObj.paypal_me || collecteurObj.paypal_email)) {
            var note = paypalParts.join(', ') + ' = ' + totalPaypal.toFixed(2) + '\u20AC';
            var noteJs = note.replace(/'/g, "\\'");
            var paypalUrl;
            var paypalManualHint = '';
            if (collecteurObj.paypal_me) {
                paypalUrl = 'https://paypal.me/' + encodeURIComponent(collecteurObj.paypal_me) + '/' + totalPaypal.toFixed(2);
            } else {
                paypalUrl = 'https://www.paypal.com/myaccount/transfer/homepage/pay';
                var emailJs = collecteurObj.paypal_email.replace(/'/g, "\\'");
                paypalManualHint = '<div class="paypal-note-hint"><i class="fa-solid fa-circle-info"></i> Envoyer <strong>' + totalPaypal.toFixed(2) + '€</strong> à <code>' + escapeHtml(collecteurObj.paypal_email) + '</code> <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + emailJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier email\'},2000)"><i class="fa-solid fa-copy"></i> Copier email</button> — cocher <strong>« Entre proches »</strong></div>';
            }
            paypalNoteHtml = '<div class="paypal-note-hint"><i class="fa-solid fa-paste"></i> Note à coller : ' + escapeHtml(note)
                + ' <button type="button" class="btn-copier-note" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + noteJs + '\');this.innerHTML=\'<i class=fa-solid fa-check></i> Copié !\';var b=this;setTimeout(function(){b.innerHTML=\'<i class=fa-solid fa-copy></i> Copier\'},2000)"><i class="fa-solid fa-copy"></i> Copier</button></div>' + paypalManualHint;
            paypalBtnHtml = '<a href="' + paypalUrl + '" target="_blank" class="btn-payer"><i class="fa-brands fa-paypal"></i> Payer ' + totalPaypal.toFixed(2) + '\u20AC via PayPal</a>';
        }

        return '<div class="insc-collecteur-recap">'
            + '<div class="insc-collecteur-recap-total"><i class="fa-solid fa-coins"></i> Total dû : <strong>' + totalGlobal.toFixed(2) + ' \u20AC</strong> (' + ids.length + ' inscription' + (ids.length > 1 ? 's' : '') + (portIds.length > 0 ? ' + frais de port' : '') + ')</div>'
            + paypalNoteHtml
            + '<div class="insc-collecteur-recap-actions">' + btnPaye + paypalBtnHtml + '</div>'
            + '</div>';
    }

    // Double tri : statut (priorité action) puis sous-groupes par collecteur
    var statGroups = [
        { key: 'non_paye',        label: 'À payer',                        icon: 'fa-circle-exclamation', items: [] },
        { key: 'declare',         label: 'Validation paiement en attente', icon: 'fa-clock',              items: [] },
        { key: 'confirme',        label: 'Payés',                          icon: 'fa-check-circle',       items: [] },
        { key: 'prix_non_defini', label: 'Prix non défini',                icon: 'fa-tag',                items: [] },
        { key: 'pas_de_collecte', label: 'Pas de collecte',                icon: 'fa-ban',                items: [] },
        { key: 'beneficiaire',    label: 'Bénéficiaire',                   icon: 'fa-star',               items: [] }
    ];

    filteredInscriptions.forEach(function(insc) {
        var tarifG = getTarif(insc);
        if (tarifG.categorie === 'Pré collecte' || tarifG.indisponible) {
            statGroups[3].items.push(insc);
        } else if (estBeneficiaire(insc, activeEmail)) {
            statGroups[5].items.push(insc);
        } else {
            var statut = insc.statut_paiement || 'non_paye';
            if (statut === 'non_paye')     statGroups[0].items.push(insc);
            else if (statut === 'declare') statGroups[1].items.push(insc);
            else                           statGroups[2].items.push(insc);
        }
    });

    // Frais de port dus : même filtrage par statut (non chargés si déjà confirmés)
    var filteredPort = mesFraisPort.filter(function(env) {
        if (estBeneficiairePort(env, activeEmail)) return false;
        if (!portMatchesSearch(env)) return false;
        var s = env.statut_paiement_port || 'non_paye';
        if (currentInscFilter === 'prix_non_defini' || currentInscFilter === 'pas_de_collecte') return false;
        if (currentInscFilter === 'tous') return true;
        return s === currentInscFilter;
    });
    filteredPort.forEach(function(env) {
        var item = makePortItem(env);
        if (item.statut === 'declare')      statGroups[1].items.push(item);
        else if (item.statut === 'confirme') statGroups[2].items.push(item);
        else                                 statGroups[0].items.push(item);
    });

    var html = '';
    statGroups.forEach(function(group) {
        if (group.items.length === 0) return;
        html += '<div class="insc-statut-section">'
            + '<div class="insc-statut-header" role="heading" aria-level="2">'
            + '<i class="fa-solid ' + group.icon + '"></i> '
            + group.label
            + ' <span class="insc-statut-count">(' + group.items.length + ')</span>'
            + '</div>';

        if (group.key === 'prix_non_defini' || group.key === 'pas_de_collecte') {
            // Pré-collectes / Pas de collecte : liste simple, pas de regroupement par collecteur
            group.items.forEach(function(insc) { html += renderInscriptionCard(insc); });
        } else {
            // Sous-groupes par collecteur (ordre d'apparition)
            var byCollecteur = {};
            var colOrder = [];
            group.items.forEach(function(insc) {
                // Demande #16 — on regroupe par le collecteur de la COLLECTE (c'est
                // lui qu'on paie), avec repli sur celui du billet.
                var col = insc._isPort
                    ? insc.collecteur
                    : (getTarif(insc).collecteur || '(sans collecteur)');
                if (!byCollecteur[col]) { byCollecteur[col] = []; colOrder.push(col); }
                byCollecteur[col].push(insc);
            });
            colOrder.forEach(function(col) {
                var headerExtra = '';
                if (group.key === 'non_paye') {
                    headerExtra = buildCollecteurRecapHtml(col, byCollecteur[col]);
                }
                html += '<div class="insc-collecteur-group">'
                    + '<div class="insc-collecteur-header" role="heading" aria-level="3">'
                    + '<div class="insc-collecteur-header-title"><i class="fa-solid fa-user"></i> ' + escapeHtml(col) + '</div>'
                    + headerExtra
                    + '</div>';
                byCollecteur[col].forEach(function(insc) {
                    html += insc._isPort ? renderPortCard(insc) : renderInscriptionCard(insc);
                });
                html += '</div>';
            });
        }
        html += '</div>';
    });

    if (html === '' && (mesInscriptions.length > 0 || mesFraisPort.length > 0)) {
        html = '<div class="inscriptions-empty-state"><i class="fa-solid fa-filter"></i><p>Aucune inscription avec ce filtre.</p></div>';
    }

    container.innerHTML = html;

    // Résumé en haut (calcul sur toutes les inscriptions, pas le filtre)
    var totalDuGlobal = 0;
    var totalEnAttenteGlobal = 0;
    mesInscriptions.forEach(function(insc) {
        var t = getTarif(insc);
        var exigible = montantExigible(insc);
        var m = (t.prix * (insc.nb_normaux || 0)) + (t.prixVar * (insc.nb_variantes || 0));
        var fdp = 0;
        if (t.payerFdp === 'oui' && exigible) {
            var d = destinationPays(membrePays);
            fdp = findFdpPrice((insc.nb_normaux || 0) + (insc.nb_variantes || 0), d, (insc.mode_envoi || 'Normal').toLowerCase());
        }
        var total = m + fdp;
        var s = insc.statut_paiement || 'non_paye';
        if (exigible && !estBeneficiaire(insc, activeEmail)) {
            if (s === 'non_paye') totalDuGlobal += total;
            else if (s === 'declare') totalEnAttenteGlobal += total;
        }
    });
    // Inclure les frais de port dus dans le total
    mesFraisPort.forEach(function(env) {
        if (estBeneficiairePort(env, activeEmail)) return;
        var s = env.statut_paiement_port || 'non_paye';
        var m = parseFloat(env.prix_envoi_reel || 0);
        if (s === 'non_paye') totalDuGlobal += m;
        else if (s === 'declare') totalEnAttenteGlobal += m;
    });

    if (summary) {
        summary.innerHTML = onboardingHtml + '<div class="inscriptions-resume">'
            + '<span>' + mesInscriptions.length + ' inscription(s)</span>'
            + '<span class="inscriptions-resume-montants">'
            + '<span class="montant-non-paye"><strong>' + totalDuGlobal.toFixed(2) + ' \u20AC restant \u00E0 payer</strong></span>'
            + (totalEnAttenteGlobal > 0 ? '<span class="montant-en-attente"><strong>' + totalEnAttenteGlobal.toFixed(2) + ' \u20AC en attente de validation par les collecteurs</strong></span>' : '')
            + '</span>'
            + '</div>';
    }

    // #12 — Compteur sur l'onglet "Mes inscriptions"
    var tabBtns = document.querySelectorAll('#inscriptions-tabs .tab-btn');
    if (tabBtns[0]) {
        tabBtns[0].innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Mes inscriptions <span class="tab-badge">' + mesInscriptions.length + '</span>';
    }
}

// ============================================================
// 3. BADGE PAIEMENT ET DECLARATION
// ============================================================

// Story 9.7 — Badge statut collecte
function badgeCollecte(categorie) {
    var cat = categorie || 'Pré collecte';
    if (cat === 'Terminé') {
        return '<span class="badge-collecte badge-collecte-termine">Collecte terminée</span>';
    }
    if (cat === 'Collecte') {
        return '<span class="badge-collecte badge-collecte-en-cours">Collecte en cours</span>';
    }
    if (cat === 'Pas de collecte') {
        return '<span class="badge-collecte badge-collecte-pas">Pas de collecte</span>';
    }
    // Pré collecte (défaut)
    return '<span class="badge-collecte badge-collecte-pre">Pré-collecte</span>';
}

function badgePaiementMembre(statut, inscriptionId, categorie, isBeneficiaire) {
    // Pas de collecte : le billet ne sera pas distribué — prime sur le statut paiement
    if (categorie === 'Pas de collecte') {
        return '<span class="badge-paiement badge-pas-de-collecte" title="La collecte n\'aura pas lieu : ce billet ne sera pas distribué">Pas de collecte</span>';
    }
    if (isBeneficiaire) return '<span class="badge-paiement badge-beneficiaire">Bénéficiaire</span>';
    if (statut === 'confirme') {
        return '<span class="badge-paiement badge-paye">Payé</span>';
    }
    if (statut === 'declare') {
        // QW-4 — Badge raccourci avec tooltip pour le détail
        return '<span class="badge-paiement badge-declare" title="En attente de vérification par le collecteur">En attente</span>'
            + '<button class="btn-annuler-declaration" title="Déclaré par erreur ? Annuler la déclaration de paiement" onclick="annulerDeclaration(' + inscriptionId + ', false)"><i class="fa-solid fa-rotate-left"></i> Annuler</button>';
    }
    // non_paye — Story 9.8 : bloquer en pré-collecte
    if (categorie === 'Pré collecte') {
        return '<span class="badge-paiement badge-prix-indefini">Prix non défini</span>';
    }
    return '<button class="btn-jai-paye" title="Cliquez pour déclarer votre paiement" onclick="declarerPaiement(' + inscriptionId + ')"><i class="fa-solid fa-hand-holding-dollar"></i> J\'ai payé</button>';
}

// QW-3 — Confirmation avant déclaration de paiement
var pendingDeclarationId = null;
var pendingDeclarationIds = null; // mode groupé
var pendingDeclarationPortIds = null; // frais de port (enveloppes)

function declarerPaiementGroupe(idsCsv, portIdsCsv) {
    var ids = String(idsCsv || '').split(',').map(function(s) { return parseInt(s, 10); }).filter(function(n) { return !isNaN(n); });
    var portIds = String(portIdsCsv || '').split(',').map(function(s) { return parseInt(s, 10); }).filter(function(n) { return !isNaN(n); });
    if (ids.length === 0 && portIds.length === 0) return;
    var totalGlobal = 0;
    var collecteur = '';
    ids.forEach(function(id) {
        for (var i = 0; i < mesInscriptions.length; i++) {
            if (mesInscriptions[i].id !== id) continue;
            var insc = mesInscriptions[i];
            var billet = billetsMap[insc.billet_id] || {};
            var t = getTarif(insc);
            if (!collecteur) collecteur = t.collecteur || '';
            var m = (t.prix * (insc.nb_normaux || 0)) + (t.prixVar * (insc.nb_variantes || 0));
            var fdp = 0;
            if (t.payerFdp === 'oui' && montantExigible(insc)) {
                var dest = destinationPays(membrePays);
                fdp = findFdpPrice((insc.nb_normaux || 0) + (insc.nb_variantes || 0), dest, (insc.mode_envoi || 'Normal').toLowerCase());
            }
            totalGlobal += m + fdp;
            break;
        }
    });
    portIds.forEach(function(id) {
        for (var i = 0; i < mesFraisPort.length; i++) {
            if (mesFraisPort[i].id !== id) continue;
            if (!collecteur) collecteur = mesFraisPort[i].collecteur_alias || '';
            totalGlobal += parseFloat(mesFraisPort[i].prix_envoi_reel || 0);
            break;
        }
    });
    pendingDeclarationIds = ids;
    pendingDeclarationPortIds = portIds;
    pendingDeclarationId = null;
    var modal = document.getElementById('confirm-paiement-modal');
    var msgEl = document.getElementById('confirm-paiement-msg');
    if (msgEl) {
        msgEl.innerHTML = 'Confirmez-vous avoir payé <strong>' + totalGlobal.toFixed(2) + ' \u20AC</strong>'
            + (collecteur ? ' à <strong>' + escapeHtml(collecteur) + '</strong>' : '')
            + ' pour <strong>' + (ids.length + portIds.length) + ' élément' + ((ids.length + portIds.length) > 1 ? 's' : '') + '</strong>'
            + (portIds.length > 0 ? ' (dont frais de port)' : '') + ' ?';
    }
    if (modal) modal.style.display = 'flex';
}

// Déclaration du paiement des frais de port (enveloppe) — bouton individuel
function declarerPaiementPort(enveloppeId) {
    var env = null;
    for (var i = 0; i < mesFraisPort.length; i++) {
        if (mesFraisPort[i].id === enveloppeId) { env = mesFraisPort[i]; break; }
    }
    if (!env) return;
    var montant = parseFloat(env.prix_envoi_reel || 0);
    var collecteur = env.collecteur_alias || '';

    pendingDeclarationPortIds = [enveloppeId];
    pendingDeclarationIds = null;
    pendingDeclarationId = null;
    var modal = document.getElementById('confirm-paiement-modal');
    var msgEl = document.getElementById('confirm-paiement-msg');
    if (msgEl) {
        msgEl.innerHTML = 'Confirmez-vous avoir payé <strong>' + montant.toFixed(2) + ' €</strong> de frais d\'envoi'
            + (collecteur ? ' à <strong>' + escapeHtml(collecteur) + '</strong>' : '') + ' ?';
    }
    if (modal) modal.style.display = 'flex';
}

function declarerPaiement(inscriptionId) {
    // Trouver le billet associé pour afficher le montant
    var insc = null;
    for (var i = 0; i < mesInscriptions.length; i++) {
        if (mesInscriptions[i].id === inscriptionId) { insc = mesInscriptions[i]; break; }
    }
    var billet = insc ? billetsMap[insc.billet_id] : null;
    var tarif = insc ? getTarif(insc) : null;
    var collecteur = (tarif && tarif.collecteur) || '';
    var montant = (insc && tarif) ? (tarif.prix * (insc.nb_normaux || 0)) + (tarif.prixVar * (insc.nb_variantes || 0)) : 0;

    pendingDeclarationId = inscriptionId;
    var modal = document.getElementById('confirm-paiement-modal');
    var msgEl = document.getElementById('confirm-paiement-msg');
    if (msgEl) {
        msgEl.innerHTML = 'Confirmez-vous avoir payé <strong>' + montant.toFixed(2) + ' \u20AC</strong>'
            + (collecteur ? ' à <strong>' + escapeHtml(collecteur) + '</strong>' : '') + ' ?';
    }
    if (modal) modal.style.display = 'flex';
}

function confirmerDeclarationPaiement() {
    var modal = document.getElementById('confirm-paiement-modal');
    if (modal) modal.style.display = 'none';

    var ids = [];
    if (pendingDeclarationIds && pendingDeclarationIds.length > 0) {
        ids = pendingDeclarationIds.slice();
    } else if (pendingDeclarationId) {
        ids = [pendingDeclarationId];
    }
    var portIds = (pendingDeclarationPortIds && pendingDeclarationPortIds.length > 0) ? pendingDeclarationPortIds.slice() : [];
    pendingDeclarationId = null;
    pendingDeclarationIds = null;
    pendingDeclarationPortIds = null;
    if (ids.length === 0 && portIds.length === 0) return;

    var tasks = [];
    if (ids.length > 0) {
        var query = ids.length === 1 ? 'id=eq.' + ids[0] : 'id=in.(' + ids.join(',') + ')';
        tasks.push(supabaseFetch('/rest/v1/inscriptions?' + query, {
            method: 'PATCH',
            body: JSON.stringify({ statut_paiement: 'declare' })
        }));
    }
    if (portIds.length > 0) {
        var portQuery = portIds.length === 1 ? 'id=eq.' + portIds[0] : 'id=in.(' + portIds.join(',') + ')';
        tasks.push(supabaseFetch('/rest/v1/enveloppes?' + portQuery, {
            method: 'PATCH',
            body: JSON.stringify({ statut_paiement_port: 'declare' })
        }));
    }

    Promise.all(tasks)
    .then(function() {
        for (var i = 0; i < mesInscriptions.length; i++) {
            if (ids.indexOf(mesInscriptions[i].id) !== -1) {
                mesInscriptions[i].statut_paiement = 'declare';
            }
        }
        for (var j = 0; j < mesFraisPort.length; j++) {
            if (portIds.indexOf(mesFraisPort[j].id) !== -1) {
                mesFraisPort[j].statut_paiement_port = 'declare';
            }
        }
        renderInscriptions();
        var n = ids.length + portIds.length;
        showToast(n > 1 ? (n + ' paiements déclarés — le collecteur sera notifié') : 'Paiement déclaré — le collecteur sera notifié');
    })
    .catch(function(error) {
        console.error('Erreur déclaration paiement:', error);
        showToast('Erreur lors de la déclaration', 'error');
    });
}

function annulerDeclarationPaiement() {
    var modal = document.getElementById('confirm-paiement-modal');
    if (modal) modal.style.display = 'none';
    pendingDeclarationId = null;
    pendingDeclarationIds = null;
    pendingDeclarationPortIds = null;
}

// Annulation d'une déclaration de paiement faite par erreur
// (uniquement en statut 'declare' — impossible une fois validé par le collecteur)
var pendingAnnulationId = null;
var pendingAnnulationIsPort = false;

function annulerDeclaration(id, isPort) {
    var statut = null;
    if (isPort) {
        for (var i = 0; i < mesFraisPort.length; i++) {
            if (mesFraisPort[i].id === id) { statut = mesFraisPort[i].statut_paiement_port; break; }
        }
    } else {
        for (var j = 0; j < mesInscriptions.length; j++) {
            if (mesInscriptions[j].id === id) { statut = mesInscriptions[j].statut_paiement; break; }
        }
    }
    if (statut !== 'declare') return; // déjà validé (ou introuvable) : pas d'annulation possible

    pendingAnnulationId = id;
    pendingAnnulationIsPort = !!isPort;
    var modal = document.getElementById('annuler-declaration-modal');
    if (modal) modal.style.display = 'flex';
}

function fermerAnnulationDeclaration() {
    var modal = document.getElementById('annuler-declaration-modal');
    if (modal) modal.style.display = 'none';
    pendingAnnulationId = null;
}

function confirmerAnnulationDeclaration() {
    var modal = document.getElementById('annuler-declaration-modal');
    if (modal) modal.style.display = 'none';
    var id = pendingAnnulationId;
    var isPort = pendingAnnulationIsPort;
    pendingAnnulationId = null;
    if (!id) return;

    var url = isPort
        ? '/rest/v1/enveloppes?id=eq.' + id + '&statut_paiement_port=eq.declare'
        : '/rest/v1/inscriptions?id=eq.' + id + '&statut_paiement=eq.declare';
    var body = isPort ? { statut_paiement_port: 'non_paye' } : { statut_paiement: 'non_paye' };

    supabaseFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Prefer': 'return=representation' }
    })
    .then(function(rows) {
        if (!rows || rows.length === 0) {
            // Le collecteur a validé entre-temps : rien n'a été annulé
            showToast('Annulation impossible : le paiement a déjà été validé par le collecteur', 'error');
            loadMesInscriptions();
            return;
        }
        if (isPort) {
            for (var i = 0; i < mesFraisPort.length; i++) {
                if (mesFraisPort[i].id === id) { mesFraisPort[i].statut_paiement_port = 'non_paye'; break; }
            }
        } else {
            for (var j = 0; j < mesInscriptions.length; j++) {
                if (mesInscriptions[j].id === id) { mesInscriptions[j].statut_paiement = 'non_paye'; break; }
            }
        }
        renderInscriptions();
        showToast('Déclaration de paiement annulée');
    })
    .catch(function(error) {
        console.error('Erreur annulation déclaration:', error);
        showToast('Erreur lors de l\'annulation', 'error');
    });
}

// ============================================================
// Modifier / se désinscrire d'une pré-collecte
// ============================================================

function ouvrirModifierPreCollecte(inscId) {
    var insc = null;
    for (var i = 0; i < mesInscriptions.length; i++) {
        if (mesInscriptions[i].id === inscId) { insc = mesInscriptions[i]; break; }
    }
    if (!insc) return;
    var billet = billetsMap[insc.billet_id] || {};
    modifierInscCurrent = { id: inscId, billet: billet };

    var titre = ((billet.Reference ? billet.Reference + ' ' : '') + (billet.Millesime || '') + (billet.Version ? '-' + billet.Version : '') + (billet.NomBillet ? ' - ' + billet.NomBillet : '')).trim();
    // Demande #16 — les champs proposés suivent le périmètre de la collecte : le
    // trigger D4 refuse en base un nb_variantes > 0 sur une collecte « normal »
    // (et inversement), donc l'UI ne doit pas laisser saisir l'impossible.
    var scope = getTarif(insc).scope;
    var hasNormale  = scope !== 'variante';
    var hasVariante = scope !== 'normal' && !!(billet.HasVariante && billet.HasVariante !== 'N');

    document.getElementById('modifier-preinsc-titre').textContent = titre || 'Billet inconnu';

    var fields = '';
    if (hasNormale) {
        fields += '<div class="preinsc-qty-field">'
            + '<label for="modifier-preinsc-normaux">Billets normaux</label>'
            + '<input type="number" id="modifier-preinsc-normaux" min="0" value="' + (insc.nb_normaux || 0) + '">'
            + '</div>';
    }
    if (hasVariante) {
        fields += '<div class="preinsc-qty-field">'
            + '<label for="modifier-preinsc-variantes">Variantes</label>'
            + '<input type="number" id="modifier-preinsc-variantes" min="0" value="' + (insc.nb_variantes || 0) + '">'
            + '</div>';
    }
    document.getElementById('modifier-preinsc-fields').innerHTML = fields;
    document.getElementById('modifier-preinsc-modal').style.display = 'flex';
}

function fermerModifierPreCollecte() {
    var modal = document.getElementById('modifier-preinsc-modal');
    if (modal) modal.style.display = 'none';
    modifierInscCurrent = null;
}

function confirmerModifierPreCollecte() {
    if (!modifierInscCurrent) return;
    var billet = modifierInscCurrent.billet;
    var hasNormale = billet.VersionNormaleExiste !== false && billet.VersionNormaleExiste !== 'false';
    var hasVariante = !!(billet.HasVariante && billet.HasVariante !== 'N');

    var normauxEl = document.getElementById('modifier-preinsc-normaux');
    var variantesEl = document.getElementById('modifier-preinsc-variantes');
    var nbNormaux = (hasNormale && normauxEl) ? (parseInt(normauxEl.value) || 0) : 0;
    var nbVariantes = (hasVariante && variantesEl) ? (parseInt(variantesEl.value) || 0) : 0;

    if (nbNormaux + nbVariantes === 0) {
        showToast('Sélectionnez au moins un billet', 'error');
        return;
    }

    var inscId = modifierInscCurrent.id;
    fermerModifierPreCollecte();

    supabaseFetch('/rest/v1/inscriptions?id=eq.' + inscId, {
        method: 'PATCH',
        body: JSON.stringify({ nb_normaux: nbNormaux, nb_variantes: nbVariantes })
    })
    .then(function() {
        for (var i = 0; i < mesInscriptions.length; i++) {
            if (mesInscriptions[i].id === inscId) {
                mesInscriptions[i].nb_normaux = nbNormaux;
                mesInscriptions[i].nb_variantes = nbVariantes;
                break;
            }
        }
        renderInscriptions();
        showToast('Inscription mise à jour');
    })
    .catch(function() {
        showToast('Erreur lors de la modification', 'error');
    });
}

function desinscriprePreCollecte(inscId) {
    var insc = null;
    for (var i = 0; i < mesInscriptions.length; i++) {
        if (mesInscriptions[i].id === inscId) { insc = mesInscriptions[i]; break; }
    }
    var billet = insc ? (billetsMap[insc.billet_id] || {}) : {};
    var titre = billet.NomBillet || 'cette collecte';

    if (!confirm('Se désinscrire de « ' + titre + ' » ?\n\nVotre inscription sera supprimée.')) return;

    supabaseFetch('/rest/v1/inscriptions?id=eq.' + inscId, { method: 'DELETE' })
    .then(function() {
        mesInscriptions = mesInscriptions.filter(function(i) { return i.id !== inscId; });
        renderInscriptions();
        showToast('Désinscription effectuée');
    })
    .catch(function() {
        showToast('Erreur lors de la désinscription', 'error');
    });
}

// ============================================================
// 4. ONGLETS + MES ENVOIS — VUE MEMBRE (Story 5.10 + 5.11)
// ============================================================

function showInscriptionsTab(tab) {
    var inscView = document.getElementById('inscriptions-view');
    var envoisView = document.getElementById('envois-view');
    if (!inscView || !envoisView) return;

    inscView.style.display = tab === 'inscriptions' ? '' : 'none';
    envoisView.style.display = tab === 'envois' ? '' : 'none';

    var btns = document.querySelectorAll('#inscriptions-tabs .tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }
    var idx = tab === 'inscriptions' ? 0 : 1;
    if (btns[idx]) btns[idx].classList.add('active');

    if (tab === 'envois') loadMesEnvois();
}

var envoisData = { enveloppes: [], inscByEnv: {}, billetsEnvoisMap: {}, collectesEnvoisMap: {}, inscSansEnveloppe: [] };

function loadMesEnvois() {
    var email = window.getActiveEmail();
    if (!email) return;

    // Charger en parallèle : enveloppes + toutes les inscriptions actives du membre
    var pEnveloppes = supabaseFetch('/rest/v1/enveloppes?membre_email=eq.' + encodeURIComponent(email) + '&select=*&order=date_creation.desc');
    var pInscriptions = supabaseFetch('/rest/v1/inscriptions?membre_email=eq.' + encodeURIComponent(email) + '&pas_interesse=eq.false&select=*');

    Promise.all([pEnveloppes, pInscriptions])
        .then(function(results) {
            var enveloppes = results[0] || [];
            var toutesInscriptions = results[1] || [];
            envoisData.enveloppes = enveloppes;

            // Séparer inscriptions avec/sans enveloppe
            var inscByEnv = {};
            var inscSansEnveloppe = [];
            toutesInscriptions.forEach(function(insc) {
                if (insc.enveloppe_id) {
                    if (!inscByEnv[insc.enveloppe_id]) inscByEnv[insc.enveloppe_id] = [];
                    inscByEnv[insc.enveloppe_id].push(insc);
                } else if (!insc.envoye) {
                    // Inscription sans enveloppe et pas encore envoyée
                    inscSansEnveloppe.push(insc);
                }
            });
            envoisData.inscByEnv = inscByEnv;
            envoisData.inscSansEnveloppe = inscSansEnveloppe;

            // Charger les billets pour toutes les inscriptions
            var billetIds = toutesInscriptions.map(function(i) { return i.billet_id; });
            var uniqueIds = billetIds.filter(function(id, idx) { return billetIds.indexOf(id) === idx; });
            if (uniqueIds.length === 0) {
                envoisData.billetsEnvoisMap = {};
                renderMesEnvois();
                return;
            }

            // Demande #16 — statut et FDP se lisent sur la collecte de l'inscription :
            // un billet peut porter plusieurs collectes d'états différents.
            var collecteIdsEnvois = toutesInscriptions
                .filter(function(i) { return i.collecte_id; })
                .map(function(i) { return i.collecte_id; });
            var pCollectes = collecteIdsEnvois.length
                ? supabaseFetch('/rest/v1/collectes?id=in.(' + collecteIdsEnvois.join(',') + ')&select=id,categorie,payer_fdp,collecteur')
                : Promise.resolve([]);

            return Promise.all([
                supabaseFetch('/rest/v1/billets?id=in.(' + uniqueIds.join(',') + ')&select=id,"NomBillet"'),
                pCollectes
            ]).then(function(res2) {
                    var map = {};
                    (res2[0] || []).forEach(function(b) { map[b.id] = b; });
                    envoisData.billetsEnvoisMap = map;

                    var cMap = {};
                    (res2[1] || []).forEach(function(c) { cMap[c.id] = c; });
                    envoisData.collectesEnvoisMap = cMap;

                    // Exclure les pré-collectes de la section "En attente de préparation"
                    envoisData.inscSansEnveloppe = envoisData.inscSansEnveloppe.filter(function(insc) {
                        var c = cMap[insc.collecte_id];
                        return !(c && c.categorie === 'Pré collecte');
                    });
                    renderMesEnvois();
                });
        })
        .catch(function(error) {
            console.error('Erreur chargement envois:', error);
        });
}

function renderMesEnvois() {
    var container = document.getElementById('envois-view');
    if (!container) return;

    var enveloppes = envoisData.enveloppes;
    var inscByEnv = envoisData.inscByEnv;
    var billetsMap2 = envoisData.billetsEnvoisMap;
    var inscSansEnveloppe = envoisData.inscSansEnveloppe;

    var enCours = enveloppes.filter(function(e) { return e.statut === 'en_cours'; });
    var expediees = enveloppes.filter(function(e) { return e.statut === 'expediee' || e.statut === 'distribuee'; });
    var recues = enveloppes.filter(function(e) { return e.statut === 'recue'; });

    // Enveloppes en cours avec billets prêts
    var enCoursAvecBillets = enCours.filter(function(env) {
        var inscs = inscByEnv[env.id] || [];
        return inscs.some(function(i) { return i.statut_livraison === 'pret_a_envoyer'; });
    });

    // Grouper inscriptions sans enveloppe par collecteur
    var sansEnvParCollecteur = {};
    inscSansEnveloppe.forEach(function(insc) {
        // Demande #16 (bascule) — regrouper par le collecteur de la collecte
        var c = envoisData.collectesEnvoisMap[insc.collecte_id];
        var collecteur = (c && c.collecteur) || '(sans collecteur)';
        if (!sansEnvParCollecteur[collecteur]) sansEnvParCollecteur[collecteur] = [];
        sansEnvParCollecteur[collecteur].push(insc);
    });
    var collecteursSansEnv = Object.keys(sansEnvParCollecteur);

    var rien = enCoursAvecBillets.length === 0 && collecteursSansEnv.length === 0 && expediees.length === 0 && recues.length === 0;
    if (rien) {
        container.innerHTML = '<div class="inscriptions-empty-state">'
            + '<i class="fa-solid fa-circle-info"></i>'
            + '<p>Aucun envoi en cours.</p>'
            + '</div>';
        return;
    }

    var html = '';

    // === Section "Chez le collecteur" ===
    if (enCoursAvecBillets.length > 0 || collecteursSansEnv.length > 0) {
        html += '<div class="envois-section">'
            + '<h3><i class="fa-solid fa-box-archive"></i> Chez le collecteur</h3>';

        // Enveloppes en cours avec billets prêts à envoyer
        enCoursAvecBillets.forEach(function(env) {
            var inscs = (inscByEnv[env.id] || []).filter(function(i) {
                return i.statut_livraison === 'pret_a_envoyer';
            });
            var nbBillets = inscs.reduce(function(sum, i) {
                return sum + (i.nb_normaux || 0) + (i.nb_variantes || 0);
            }, 0);
            var nomsBillets = inscs.map(function(i) {
                var b = billetsMap2[i.billet_id];
                return b ? b.NomBillet : 'Billet';
            }).join(', ');

            // Vérifier si TOUTES les collectes de cette enveloppe ont FDP demandé
            var tousAvecFDP = inscs.length > 0 && inscs.every(function(i) {
                var c = envoisData.collectesEnvoisMap[i.collecte_id];
                return c && c.payer_fdp === 'oui';
            });

            html += '<div class="envoi-carte">'
                + '<div class="envoi-carte-header">'
                + '<span><i class="fa-solid fa-user"></i> ' + escapeHtml(env.collecteur_alias || '') + '</span>'
                + '<span class="envoi-nb-billets">' + nbBillets + ' billet(s) prêt(s) à envoyer</span>'
                + '</div>'
                + '<div class="envoi-carte-details">'
                + '<span>' + escapeHtml(nomsBillets) + '</span>'
                + '</div>';

            if (tousAvecFDP) {
                html += '<span class="envoi-info-fdp"><i class="fa-solid fa-info-circle"></i> '
                    + 'Le collecteur vous enverra ces billets dès qu\'il les aura répartis.'
                    + '</span>';
            } else if (env.demande_envoi) {
                var dateStr = env.date_demande_envoi ? new Date(env.date_demande_envoi).toLocaleDateString('fr-FR') : '';
                var modeDemande = env.mode_envoi || 'normal';
                var modeLabelDemande = { normal: 'Normal', suivi: 'Suivi', recommande_r1: 'Recommandé R1', recommande_r2: 'Recommandé R2', recommande_r3: 'Recommandé R3' }[modeDemande] || modeDemande;
                html += '<span class="demande-envoyee"><i class="fa-solid fa-check"></i> Demande d\'envoi transmise le ' + dateStr + ' — ' + modeLabelDemande + '</span>';
            } else {
                html += '<div id="demande-envoi-' + env.id + '">'
                    + '<button onclick="afficherFormDemandeEnvoi(' + env.id + ')" class="btn-demande-envoi">'
                    + '<i class="fa-solid fa-paper-plane"></i> Je souhaite recevoir mes billets'
                    + '</button>'
                    + '</div>';
            }

            html += '</div>';
        });

        // Inscriptions sans enveloppe (en attente de préparation par le collecteur)
        collecteursSansEnv.forEach(function(collecteur) {
            var inscs = sansEnvParCollecteur[collecteur];
            var nbBillets = inscs.reduce(function(sum, i) {
                return sum + (i.nb_normaux || 0) + (i.nb_variantes || 0);
            }, 0);
            var nomsBillets = inscs.map(function(i) {
                var b = billetsMap2[i.billet_id];
                return b ? b.NomBillet : 'Billet';
            }).join(', ');

            html += '<div class="envoi-carte envoi-carte-attente">'
                + '<div class="envoi-carte-header">'
                + '<span><i class="fa-solid fa-user"></i> ' + escapeHtml(collecteur) + '</span>'
                + '<span class="envoi-nb-billets">' + nbBillets + ' billet(s)</span>'
                + '</div>'
                + '<div class="envoi-carte-details">'
                + '<span>' + escapeHtml(nomsBillets) + '</span>'
                + '</div>'
                + '<span class="envoi-info-fdp"><i class="fa-solid fa-hourglass-half"></i> '
                + 'En attente de préparation par le collecteur'
                + '</span>'
                + '</div>';
        });

        html += '</div>';
    }

    // === Section "En cours d'acheminement" (expédiées) ===
    if (expediees.length > 0) {
        html += '<div class="envois-section">'
            + '<h3><i class="fa-solid fa-truck"></i> En cours d\'acheminement</h3>';

        expediees.forEach(function(env) {
            html += renderEnvoiCarteExpediee(env, inscByEnv, billetsMap2, false);
        });

        html += '</div>';
    }

    // === Section "Reçus" ===
    if (recues.length > 0) {
        html += '<div class="envois-section">'
            + '<h3><i class="fa-solid fa-circle-check"></i> Reçus</h3>';

        recues.forEach(function(env) {
            html += renderEnvoiCarteExpediee(env, inscByEnv, billetsMap2, true);
        });

        html += '</div>';
    }

    container.innerHTML = html;
}

function renderEnvoiCarteExpediee(env, inscByEnv, billetsMap2, estRecue) {
    var inscs = inscByEnv[env.id] || [];
    var nbBillets = inscs.reduce(function(sum, i) {
        return sum + (i.nb_normaux || 0) + (i.nb_variantes || 0);
    }, 0);
    var nomsBillets = inscs.map(function(i) {
        var b = billetsMap2[i.billet_id];
        return b ? b.NomBillet : 'Billet';
    }).join(', ');

    var dateExp = env.date_expedition ? new Date(env.date_expedition).toLocaleDateString('fr-FR') : '';
    var modeEnvoi = env.mode_envoi_reel || 'normal';
    var modeLabel = { normal: 'Normal', suivi: 'Suivi', r1: 'Recommandé R1', r2: 'Recommandé R2', r3: 'Recommandé R3' }[modeEnvoi] || modeEnvoi;

    var html = '<div class="envoi-carte' + (estRecue ? ' envoi-carte-recue' : ' envoi-carte-expedition') + '">'
        + '<div class="envoi-carte-header">'
        + '<span><i class="fa-solid fa-user"></i> ' + escapeHtml(env.collecteur_alias || '') + '</span>'
        + '<span class="envoi-date"><i class="fa-solid fa-calendar"></i> Expédié le ' + dateExp + '</span>'
        + '</div>'
        + '<div class="envoi-carte-details">'
        + '<span><i class="fa-solid fa-ticket"></i> ' + nbBillets + ' billet(s) : ' + escapeHtml(nomsBillets) + '</span>'
        + '<span><i class="fa-solid fa-truck"></i> ' + modeLabel + '</span>';

    if (env.numero_suivi) {
        html += '<span><i class="fa-solid fa-barcode"></i> N° suivi : ' + escapeHtml(env.numero_suivi) + '</span>';
    }

    if (env.statut === 'distribuee') {
        var dateDist = env.date_distribution ? new Date(env.date_distribution).toLocaleDateString('fr-FR') : '';
        html += '<span class="badge-distribuee"><i class="fa-solid fa-truck-ramp-box"></i> Distribuée' + (dateDist ? ' le ' + dateDist : '') + '</span>';
    }

    html += '</div>';

    if (estRecue) {
        var dateRec = env.date_reception ? new Date(env.date_reception).toLocaleDateString('fr-FR') : '';
        html += '<span class="envoi-recu"><i class="fa-solid fa-circle-check"></i> Reçu le ' + dateRec + '</span>';
    } else {
        html += '<button onclick="confirmerReception(' + env.id + ')" class="btn-confirmer-reception">'
            + '<i class="fa-solid fa-box-open"></i> J\'ai bien reçu cette enveloppe'
            + '</button>';
    }

    html += '</div>';
    return html;
}

function afficherFormDemandeEnvoi(enveloppeId) {
    var container = document.getElementById('demande-envoi-' + enveloppeId);
    if (!container) return;

    container.innerHTML = '<div class="demande-envoi-form">'
        + '<label class="expedition-form-label">Mode d\'envoi souhaité</label>'
        + '<select id="mode-envoi-demande-' + enveloppeId + '" class="expedition-form-select">'
        + '<option value="normal">Normal</option>'
        + '<option value="suivi">Suivi</option>'
        + '<option value="recommande_r1">Recommandé R1</option>'
        + '<option value="recommande_r2">Recommandé R2</option>'
        + '<option value="recommande_r3">Recommandé R3</option>'
        + '</select>'
        + '<div class="demande-envoi-actions">'
        + '<button onclick="confirmerDemandeEnvoi(' + enveloppeId + ')" class="btn-confirmer-expedition">'
        + '<i class="fa-solid fa-paper-plane"></i> Confirmer la demande'
        + '</button>'
        + '<button onclick="loadMesEnvois()" class="btn-annuler-expedition">'
        + '<i class="fa-solid fa-xmark"></i> Annuler'
        + '</button>'
        + '</div>'
        + '</div>';
}

function confirmerDemandeEnvoi(enveloppeId) {
    var select = document.getElementById('mode-envoi-demande-' + enveloppeId);
    var modeEnvoi = select ? select.value : 'normal';

    supabaseFetch('/rest/v1/enveloppes?id=eq.' + enveloppeId, {
        method: 'PATCH',
        body: JSON.stringify({
            demande_envoi: true,
            date_demande_envoi: new Date().toISOString(),
            mode_envoi: modeEnvoi
        })
    })
    .then(function() {
        showToast('Votre demande a été transmise au collecteur');
        loadMesEnvois();
    })
    .catch(function(error) {
        console.error('Erreur demande envoi:', error);
        showToast('Erreur lors de la demande', 'error');
    });
}

function confirmerReception(enveloppeId) {
    supabaseFetch('/rest/v1/enveloppes?id=eq.' + enveloppeId, {
        method: 'PATCH',
        body: JSON.stringify({
            statut: 'recue',
            date_reception: new Date().toISOString()
        })
    })
    .then(function() {
        showToast('Réception confirmée — merci !');
        loadMesEnvois();
    })
    .catch(function(error) {
        console.error('Erreur confirmation réception:', error);
        showToast('Erreur lors de la confirmation', 'error');
    });
}

// ============================================================
// 5. INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            loadMesInscriptions();
        }
    });
});
