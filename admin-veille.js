// ============================================================
// admin-veille.js — Demande #72
// Comptes inactifs : qui va être mis en veille, qui est retenu par un garde-fou,
// qui l'est déjà. Les rappels partent du logiciel de mail de l'admin (le site
// n'envoie pas de mail) et sont notés en base ; « Passer en revue » met en veille
// ceux dont le rappel a eu son délai. Tant que l'interrupteur est éteint, l'écran
// ne fait que montrer.
// Toute la logique vit en base (comptes_veille, noter_rappels_veille,
// reporter_veille, passer_en_revue_veille, modifier_reglages_veille) : l'écran
// n'en recalcule rien.
// ============================================================

var veilleOnglet = 'bientot';
var veilleReglages = null;   // { delai, rappel, active, modif }
var veilleComptes = [];      // rpc comptes_veille
var veilleEnVeille = [];     // membres en veille
var veilleJournal = null;    // chargé à la demande

var VEILLE_GARDES = {
    vacances: 'en mode vacances',
    inscription: 'inscription non réglée ou billets pas encore envoyés',
    enveloppe: 'enveloppe en cours ou port non réglé',
    dette: 'complément de paiement non réglé',
    collecte: 'collecteur, avec une collecte en cours',
    dernier_admin: 'dernier admin actif'
};
var VEILLE_ACTIONS = {
    rappel: 'Rappel envoyé',
    veille: 'Mis en veille',
    reintegration: 'Réintégré',
    report: 'Mise en veille reportée'
};

document.addEventListener('DOMContentLoaded', function() {
    var waitAuth = setInterval(function() {
        if (window.userRole) {
            clearInterval(waitAuth);
            veilleCharger();
        }
    }, 100);
});

function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type === 'error') {
        toast.onclick = function() { toast.remove(); };
    } else {
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 4000);
    }
}

function veilleEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Une date « AAAA-MM-JJ » se lit en heure locale ; un horodatage, tel quel.
function veilleDate(v, long) {
    if (!v) return '';
    var d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) : new Date(v);
    return d.toLocaleDateString('fr-FR', long ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined);
}

function veilleNom(c) {
    return ((c.nom || '') + ' ' + (c.prenom || '')).trim() || c.email || ('membre n° ' + (c.membre_id || c.id));
}

function veilleRpc(nom, params) {
    return supabaseFetch('/rest/v1/rpc/' + nom, { method: 'POST', body: JSON.stringify(params || {}) });
}

// ------------------------------------------------------------
// Chargement
// ------------------------------------------------------------
function veilleCharger() {
    veilleJournal = null;
    Promise.all([
        supabaseFetch('/rest/v1/reglages?select=cle,valeur,modifie_at,membres(nom,prenom)'),
        veilleRpc('comptes_veille'),
        supabaseFetch('/rest/v1/membres?statut=eq.en_veille&select=id,nom,prenom,email,role,veille_at,veille_motif,last_active_at&order=veille_at.desc')
    ])
        .then(function(res) {
            var r = {};
            (res[0] || []).forEach(function(l) { r[l.cle] = l; });
            var derniere = (res[0] || []).slice().sort(function(a, b) { return a.modifie_at < b.modifie_at ? 1 : -1; })[0];
            veilleReglages = {
                delai: r.veille_delai_mois ? Number(r.veille_delai_mois.valeur) : 12,
                rappel: r.veille_rappel_jours ? Number(r.veille_rappel_jours.valeur) : 30,
                active: !!(r.veille_active && r.veille_active.valeur === true),
                modif: derniere
            };
            veilleComptes = res[1] || [];
            veilleEnVeille = res[2] || [];
            veilleAfficherReglages();
            veilleAfficher();
        })
        .catch(function(err) {
            var msg = /reglages|comptes_veille|veille_at/.test(err.message || '')
                ? 'La base n\'est pas encore prête pour cet écran : la migration de la demande #72 reste à jouer.'
                : 'Erreur : ' + (err.message || 'réseau');
            document.getElementById('veille-contenu').innerHTML = '<p class="veille-vide veille-erreur">' + veilleEsc(msg) + '</p>';
        });
}

function veilleAfficherReglages() {
    var g = veilleReglages;
    document.getElementById('veille-delai').value = String(g.delai);
    document.getElementById('veille-rappel').value = String(g.rappel);
    document.getElementById('veille-active').checked = g.active;
    document.getElementById('veille-etat').innerHTML = g.active
        ? '<span class="veille-pastille veille-pastille-on"><i class="fa-solid fa-power-off"></i> Allumée</span>'
          + ' Les rappels peuvent être notés, et « Passer en revue » met en veille ceux dont le rappel a eu son délai.'
        : '<span class="veille-pastille"><i class="fa-solid fa-power-off"></i> Éteinte</span>'
          + ' Les listes montrent qui serait concerné. Aucun rappel, aucune mise en veille.';
    var m = g.modif;
    document.getElementById('veille-reglages-modif').textContent = (m && m.membres)
        ? 'Dernière modification le ' + veilleDate(m.modifie_at) + ' par ' + veilleNom(m.membres) + '.'
        : '';
}

function veilleEnregistrerReglages() {
    var delai = parseInt(document.getElementById('veille-delai').value, 10);
    var rappel = parseInt(document.getElementById('veille-rappel').value, 10);
    var active = document.getElementById('veille-active').checked;
    var btn = document.getElementById('veille-reglages-btn');
    btn.disabled = true;
    veilleRpc('modifier_reglages_veille', { p_delai_mois: delai, p_rappel_jours: rappel, p_active: active })
        .then(function() {
            showToast('Réglages enregistrés', 'success');
            veilleCharger();
        })
        .catch(function(err) { showToast('Erreur : ' + err.message, 'error'); })
        .then(function() { btn.disabled = false; });
}

// ------------------------------------------------------------
// Onglets et listes
// ------------------------------------------------------------
function veilleBientot() { return veilleComptes.filter(function(c) { return !c.gardes.length; }); }
function veilleRetenus() { return veilleComptes.filter(function(c) { return c.gardes.length > 0; }); }
function veilleARappeler() { return veilleComptes.filter(function(c) { return c.etape === 'rappel_a_envoyer'; }); }
function veilleMures() { return veilleBientot().filter(function(c) { return c.etape === 'a_mettre_en_veille'; }); }

function veilleChangerOnglet(o) {
    veilleOnglet = o;
    ['bientot', 'retenus', 'en_veille', 'journal'].forEach(function(t) {
        document.getElementById('veille-tab-' + t).classList.toggle('active', t === o);
    });
    veilleAfficher();
}

function veilleAfficher() {
    document.getElementById('veille-count-bientot').textContent = veilleBientot().length;
    document.getElementById('veille-count-retenus').textContent = veilleRetenus().length;
    document.getElementById('veille-count-en_veille').textContent = veilleEnVeille.length;
    veilleAfficherActions();

    var zone = document.getElementById('veille-contenu');
    if (veilleOnglet === 'journal') { veilleAfficherJournal(zone); return; }
    if (veilleOnglet === 'en_veille') {
        zone.innerHTML = veilleEnVeille.length
            ? '<div class="veille-liste">' + veilleEnVeille.map(veilleCarteEnVeille).join('') + '</div>'
            : '<p class="veille-vide">Aucun compte en veille.</p>';
        return;
    }
    var liste = veilleOnglet === 'retenus' ? veilleRetenus() : veilleBientot();
    var vide = veilleOnglet === 'retenus'
        ? 'Aucun compte retenu par un garde-fou.'
        : 'Personne n\'approche de la mise en veille (sans visite depuis plus de '
          + (veilleReglages.delai) + ' mois, moins ' + veilleReglages.rappel + ' jours).';
    zone.innerHTML = liste.length
        ? (veilleOnglet === 'retenus'
            ? '<p class="veille-note">Ces comptes ne seront pas mis en veille tant que ce qui les retient n\'est pas réglé. Pour un collecteur, pensez à qui reprendra ses collectes.</p>' : '')
          + '<div class="veille-liste">' + liste.map(veilleCarte).join('') + '</div>'
        : '<p class="veille-vide">' + veilleEsc(vide) + '</p>';
}

function veilleAfficherActions() {
    var zone = document.getElementById('veille-actions');
    if (veilleOnglet === 'journal' || veilleOnglet === 'en_veille') { zone.innerHTML = ''; return; }
    var nRappel = veilleARappeler().length;
    var nMures = veilleMures().length;
    var inactif = !veilleReglages.active;
    var titre = inactif ? ' title="La mise en veille est éteinte dans les réglages"' : '';
    zone.innerHTML =
        '<button type="button" class="veille-btn" onclick="veilleOuvrirRappel()"' + (inactif || !nRappel ? ' disabled' : '') + titre + '>'
        + '<i class="fa-solid fa-envelope"></i> Préparer le rappel (' + nRappel + ')</button>'
        + '<button type="button" class="veille-btn veille-btn-danger" onclick="veilleOuvrirRevue()"' + (inactif || !nMures ? ' disabled' : '') + titre + '>'
        + '<i class="fa-solid fa-bed"></i> Passer en revue (' + nMures + ' à mettre en veille)</button>';
}

function veilleDerniereVisite(c) {
    return c.visite_connue
        ? 'Dernière visite le ' + veilleDate(c.derniere_visite)
        : 'Aucune visite notée (comptée au 20/03/2026, début des relevés)';
}

function veilleEtape(c) {
    if (c.etape === 'reporte') return '<span class="veille-etape">Reporté au ' + veilleDate(c.report_au) + '</span>';
    if (c.etape === 'rappel_a_envoyer') return '<span class="veille-etape veille-etape-a-faire">Rappel à envoyer</span>';
    if (c.etape === 'rappel_envoye') return '<span class="veille-etape">Prévenu le ' + veilleDate(c.rappel_at) + '</span>';
    return '<span class="veille-etape veille-etape-mur">À mettre en veille</span>';
}

function veilleCarte(c) {
    var admin = c.role === 'admin' || c.role === 'superadmin';
    return '<div class="veille-carte">'
        + '<div class="veille-carte-tete"><strong>' + veilleEsc(veilleNom(c)) + '</strong>'
        + (admin ? ' <span class="user-badge-role user-badge-admin">Admin</span>' : '')
        + veilleEtape(c) + '</div>'
        + '<div class="veille-carte-ligne"><i class="fa-solid fa-envelope"></i> ' + veilleEsc(c.email) + '</div>'
        + '<div class="veille-carte-ligne"><i class="fa-solid fa-clock"></i> ' + veilleEsc(veilleDerniereVisite(c)) + '</div>'
        + '<div class="veille-carte-ligne"><i class="fa-solid fa-calendar-day"></i> Mise en veille possible à partir du ' + veilleDate(c.date_veille) + '</div>'
        + (c.gardes.length
            ? '<div class="veille-carte-garde"><i class="fa-solid fa-shield-halved"></i> Retenu : '
              + c.gardes.map(function(g) { return veilleEsc(VEILLE_GARDES[g] || g); }).join(' ; ') + '</div>'
            : '')
        + '<div class="veille-carte-actions">'
        + '<button type="button" class="veille-btn veille-btn-petit" onclick="veilleOuvrirReport(' + Number(c.membre_id) + ')">'
        + '<i class="fa-solid fa-calendar-plus"></i> Repousser</button>'
        + '</div></div>';
}

function veilleCarteEnVeille(m) {
    return '<div class="veille-carte veille-carte-dort">'
        + '<div class="veille-carte-tete"><strong>' + veilleEsc(veilleNom(m)) + '</strong>'
        + '<span class="veille-etape">En veille depuis le ' + veilleDate(m.veille_at) + '</span></div>'
        + '<div class="veille-carte-ligne"><i class="fa-solid fa-envelope"></i> ' + veilleEsc(m.email) + '</div>'
        + '<div class="veille-carte-ligne"><i class="fa-solid fa-circle-info"></i> ' + veilleEsc(m.veille_motif || '') + '</div>'
        + '<div class="veille-carte-actions">'
        + '<button type="button" class="veille-btn veille-btn-petit veille-btn-ok" onclick="veilleReintegrer(' + Number(m.id) + ')">'
        + '<i class="fa-solid fa-user-check"></i> Réintégrer</button>'
        + '</div></div>';
}

function veilleAfficherJournal(zone) {
    if (veilleJournal === null) {
        zone.innerHTML = '<p class="veille-vide">Chargement...</p>';
        supabaseFetch('/rest/v1/veille_journal?select=action,motif,created_at,'
            + 'membre:membres!veille_journal_membre_id_fkey(nom,prenom,email),'
            + 'par:membres!veille_journal_par_id_fkey(nom,prenom)&order=created_at.desc&limit=200')
            .then(function(rows) { veilleJournal = rows || []; if (veilleOnglet === 'journal') veilleAfficherJournal(zone); })
            .catch(function(err) { zone.innerHTML = '<p class="veille-vide veille-erreur">Erreur : ' + veilleEsc(err.message) + '</p>'; });
        return;
    }
    if (!veilleJournal.length) { zone.innerHTML = '<p class="veille-vide">Rien pour l\'instant.</p>'; return; }
    zone.innerHTML = '<ul class="veille-journal">' + veilleJournal.map(function(j) {
        return '<li><span class="veille-journal-date">' + veilleEsc(new Date(j.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })) + '</span> '
            + '<strong>' + veilleEsc(VEILLE_ACTIONS[j.action] || j.action) + '</strong> — '
            + veilleEsc(j.membre ? veilleNom(j.membre) : '?')
            + (j.motif ? ' <span class="veille-journal-motif">(' + veilleEsc(j.motif) + ')</span>' : '')
            + (j.par ? ' <span class="veille-journal-par">par ' + veilleEsc(veilleNom(j.par)) + '</span>' : '')
            + '</li>';
    }).join('') + '</ul>';
}

// ------------------------------------------------------------
// Fenêtres
// ------------------------------------------------------------
function veilleOuvrirModale(html) {
    veilleFermerModale();
    document.body.insertAdjacentHTML('beforeend',
        '<div id="veille-modale" class="user-modal-overlay" onclick="if(event.target===this)veilleFermerModale()">'
        + '<div class="user-modal veille-modale" role="dialog" aria-modal="true">' + html + '</div></div>');
    document.addEventListener('keydown', veilleEchap);
}
function veilleFermerModale() {
    var m = document.getElementById('veille-modale');
    if (m) m.remove();
    document.removeEventListener('keydown', veilleEchap);
}
function veilleEchap(e) { if (e.key === 'Escape') veilleFermerModale(); }

// --- Le rappel ---
var veilleIdsRappel = [];

function veilleTexteRappel() {
    var d = new Date();
    d.setDate(d.getDate() + veilleReglages.rappel);
    var site = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    return 'Bonjour,\n\n'
        + 'On ne t\'a pas vu sur le site Billets et Jetons Touristiques depuis un moment.\n\n'
        + 'Sans visite de ta part d\'ici le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        + ', ton compte sera mis en veille : tes données (inscriptions, collection, historique) seront conservées, '
        + 'mais il faudra demander à un administrateur de te réintégrer.\n\n'
        + 'Pour l\'éviter, il suffit de te connecter une fois : ' + site + '\n\n'
        + 'À bientôt,\nLes administrateurs';
}

function veilleOuvrirRappel() {
    var cibles = veilleARappeler();
    veilleIdsRappel = cibles.map(function(c) { return Number(c.membre_id); });
    veilleOuvrirModale(
        '<h2 class="user-modal-title"><i class="fa-solid fa-envelope"></i> Prévenir ' + cibles.length + ' membre' + (cibles.length > 1 ? 's' : '') + '</h2>'
        + '<p class="user-modal-desc">Le site n\'envoie pas de mail : le message part de <strong>votre</strong> messagerie, en copie cachée. '
        + 'Une fois envoyé, cliquez « J\'ai envoyé le rappel » : la date est notée, et la mise en veille ne pourra pas avoir lieu avant '
        + veilleReglages.rappel + ' jours.</p>'
        + '<p class="veille-note"><strong>Destinataires :</strong> ' + cibles.map(function(c) { return veilleEsc(veilleNom(c)); }).join(', ') + '</p>'
        + '<label class="veille-champ-bloc">Message (modifiable)<textarea id="veille-rappel-texte" rows="11">' + veilleEsc(veilleTexteRappel()) + '</textarea></label>'
        + '<div class="user-modal-actions veille-modale-actions">'
        + '<button type="button" class="user-modal-btn" onclick="veilleCopierAdresses()"><i class="fa-solid fa-copy"></i> Copier les adresses</button>'
        + '<button type="button" class="user-modal-btn" onclick="veilleOuvrirMessagerie()"><i class="fa-solid fa-paper-plane"></i> Ouvrir ma messagerie</button>'
        + '<button type="button" class="user-modal-btn user-modal-btn-primary" onclick="veilleNoterRappel()"><i class="fa-solid fa-check"></i> J\'ai envoyé le rappel</button>'
        + '</div>');
}

function veilleAdressesRappel() {
    return veilleARappeler().filter(function(c) { return veilleIdsRappel.indexOf(Number(c.membre_id)) !== -1; })
        .map(function(c) { return c.email; });
}

function veilleCopierAdresses() {
    var texte = veilleAdressesRappel().join(', ');
    (navigator.clipboard ? navigator.clipboard.writeText(texte) : Promise.reject())
        .then(function() { showToast('Adresses copiées', 'success'); })
        .catch(function() { window.prompt('Adresses à copier :', texte); });
}

function veilleOuvrirMessagerie() {
    var corps = document.getElementById('veille-rappel-texte').value;
    window.location.href = 'mailto:?bcc=' + encodeURIComponent(veilleAdressesRappel().join(','))
        + '&subject=' + encodeURIComponent('Billets et Jetons Touristiques : ton compte va être mis en veille')
        + '&body=' + encodeURIComponent(corps);
}

function veilleNoterRappel() {
    veilleRpc('noter_rappels_veille', { p_ids: veilleIdsRappel })
        .then(function(n) {
            veilleFermerModale();
            showToast(n + ' rappel' + (n > 1 ? 's' : '') + ' noté' + (n > 1 ? 's' : ''), 'success');
            veilleCharger();
        })
        .catch(function(err) { showToast('Erreur : ' + err.message, 'error'); });
}

// --- La revue ---
function veilleOuvrirRevue() {
    var mures = veilleMures();
    veilleOuvrirModale(
        '<h2 class="user-modal-title"><i class="fa-solid fa-bed"></i> Mettre en veille ' + mures.length + ' compte' + (mures.length > 1 ? 's' : '') + '</h2>'
        + '<p class="user-modal-desc">Ils ont été prévenus il y a au moins ' + veilleReglages.rappel + ' jours et ne sont pas revenus. '
        + 'Ils ne pourront plus se connecter ; <strong>rien n\'est supprimé</strong>, et un admin peut les réintégrer à tout moment.</p>'
        + '<p class="veille-note">' + mures.map(function(c) { return veilleEsc(veilleNom(c)); }).join(', ') + '</p>'
        + '<div class="user-modal-actions">'
        + '<button type="button" class="user-modal-btn" onclick="veilleFermerModale()">Annuler</button>'
        + '<button type="button" class="user-modal-btn user-modal-btn-danger" onclick="veilleLancerRevue(this)"><i class="fa-solid fa-bed"></i> Mettre en veille</button>'
        + '</div>');
}

function veilleLancerRevue(btn) {
    btn.disabled = true;
    veilleRpc('passer_en_revue_veille')
        .then(function(rows) {
            veilleFermerModale();
            rows = rows || [];
            var dorment = rows.filter(function(r) { return r.resultat === 'en_veille'; }).length;
            var retenus = rows.length - dorment;
            showToast(dorment + ' mis en veille' + (retenus ? ', ' + retenus + ' retenu' + (retenus > 1 ? 's' : '') : ''), 'success');
            veilleCharger();
        })
        .catch(function(err) { btn.disabled = false; showToast('Erreur : ' + err.message, 'error'); });
}

// --- Le report ---
function veilleOuvrirReport(id) {
    var c = veilleComptes.filter(function(x) { return Number(x.membre_id) === id; })[0];
    if (!c) return;
    var demain = new Date(); demain.setDate(demain.getDate() + 1);
    var max = new Date(); max.setDate(max.getDate() + 366);
    var iso = function(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    veilleOuvrirModale(
        '<h2 class="user-modal-title"><i class="fa-solid fa-calendar-plus"></i> Repousser la mise en veille</h2>'
        + '<p class="user-modal-desc"><strong>' + veilleEsc(veilleNom(c)) + '</strong> ne sera pas mis en veille avant la date choisie. La raison est gardée dans l\'historique.</p>'
        + '<label class="veille-champ-bloc">Pas avant le<input type="date" id="veille-report-date" min="' + iso(demain) + '" max="' + iso(max) + '"></label>'
        + '<label class="veille-champ-bloc">Raison<textarea id="veille-report-motif" rows="3" maxlength="300" placeholder="Ex. : hospitalisé, revient en novembre"></textarea></label>'
        + '<p id="veille-report-erreur" class="veille-erreur" style="display:none"></p>'
        + '<div class="user-modal-actions">'
        + '<button type="button" class="user-modal-btn" onclick="veilleFermerModale()">Annuler</button>'
        + '<button type="button" class="user-modal-btn user-modal-btn-primary" onclick="veilleReporter(' + id + ')"><i class="fa-solid fa-check"></i> Repousser</button>'
        + '</div>');
}

function veilleReporter(id) {
    var date = document.getElementById('veille-report-date').value;
    var motif = document.getElementById('veille-report-motif').value.trim();
    var err = document.getElementById('veille-report-erreur');
    if (!date || motif.length < 3) {
        err.textContent = 'Une date et une raison sont nécessaires.';
        err.style.display = 'block';
        return;
    }
    veilleRpc('reporter_veille', { p_membre_id: id, p_jusqu_au: date, p_motif: motif })
        .then(function() {
            veilleFermerModale();
            showToast('Mise en veille repoussée au ' + veilleDate(date), 'success');
            veilleCharger();
        })
        .catch(function(e) { err.textContent = e.message; err.style.display = 'block'; });
}

// --- Réintégrer ---
// Le PATCH de statut suffit : la base remet la date de visite à ce jour, efface le
// rappel et note qui a réintégré (trigger membres_veille_transitions).
function veilleReintegrer(id) {
    supabaseFetch('/rest/v1/membres?id=eq.' + id, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ statut: 'actif' })
    })
        .then(function() {
            showToast('Membre réintégré : il peut se reconnecter', 'success');
            veilleCharger();
        })
        .catch(function(err) { showToast('Erreur : ' + err.message, 'error'); });
}
