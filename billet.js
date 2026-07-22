// ============================================================
// Fiche Billet — charge un billet par référence (?ref=XX-XXXX)
// et affiche son image avec un QR code GRAVÉ via Canvas.
// Le clic-droit "Enregistrer sous" sauvegarde l'image avec le QR.
// ============================================================

(function() {
    'use strict';

    var SITE_BASE = 'https://cyril25.github.io/BilletsTouristiques';
    // Référence : sur billets.html, Cloudinary renvoie des images de 800px
    // avec QR de 80px et marge gauche de 70px. On garde les mêmes proportions.
    var QR_REF_WIDTH = 800;
    var QR_REF_SIZE = 80;
    var QR_REF_MARGIN = 70;

    // --- Helpers ---
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function resolveImageUrl(item, size) {
        if (item.ImageUrl) {
            return item.ImageUrl.replace('/upload/', '/upload/f_auto,q_auto,w_' + (size || 1000) + '/');
        }
        if (item.ImageId) {
            // Cloudinary fetch : récupère l'image Drive et applique f_auto/q_auto
            // (le QR sera ensuite gravé via Canvas comme pour Cloudinary natif)
            var driveUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(item.ImageId) + '&sz=w' + (size || 1000);
            return 'https://res.cloudinary.com/dxoyqxben/image/fetch/f_auto,q_auto,w_' + (size || 1000) + '/' + encodeURIComponent(driveUrl);
        }
        return '';
    }

    function getQrUrl(id) {
        var pageUrl = SITE_BASE + '/billet.html?id=' + encodeURIComponent(id);
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(pageUrl);
    }

    // --- Grave le QR dans l'image via Canvas ---
    function burnQrIntoImage(imgEl, imgUrl, qrUrl) {
        var billetImg = new Image();
        billetImg.crossOrigin = 'anonymous';

        var qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';

        var loaded = 0;
        function onBothLoaded() {
            loaded++;
            if (loaded < 2) return;

            var canvas = document.createElement('canvas');
            canvas.width = billetImg.naturalWidth;
            canvas.height = billetImg.naturalHeight;
            var ctx = canvas.getContext('2d');

            // Dessiner l'image du billet
            ctx.drawImage(billetImg, 0, 0);

            // Tailles proportionnelles à la référence billets.html (800px)
            var ratio = canvas.width / QR_REF_WIDTH;
            var qrSize = Math.round(QR_REF_SIZE * ratio);
            var margin = Math.round(QR_REF_MARGIN * ratio);
            var padding = 6;
            var x = margin;
            var y = Math.round((canvas.height - qrSize) / 2);

            // Fond blanc avec arrondi derrière le QR
            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.beginPath();
            ctx.roundRect(x - padding, y - padding, qrSize + padding * 2, qrSize + padding * 2, 6);
            ctx.fill();

            // Dessiner le QR code
            ctx.drawImage(qrImg, x, y, qrSize, qrSize);

            // 4 textes autour du QR
            var fontSize = Math.round(qrSize * 0.13);
            ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
            ctx.fillStyle = '#5D3A7E';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            var cx = x + qrSize / 2;
            var cy = y + qrSize / 2;
            var gap = Math.round(fontSize * 0.9);

            function drawLabel(text, centerX, centerY, angleRad) {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angleRad);
                ctx.fillText(text, 0, 0);
                ctx.restore();
            }

            // Haut (lecture normale)
            drawLabel('Groupe', cx, y - gap, 0);
            // Bas (lecture normale)
            drawLabel('Billets Touristiques', cx, y + qrSize + gap, 0);
            // Gauche (rotation -90°, suit le QR)
            drawLabel('Flashez-moi', x - gap, cy, -Math.PI / 2);
            // Droite (rotation +90°, suit le QR)
            drawLabel('bit.ly/4mcbIWW', x + qrSize + gap, cy, Math.PI / 2);

            // Remplacer l'image par le résultat du canvas
            imgEl.src = canvas.toDataURL('image/png');
        }

        billetImg.onload = onBothLoaded;
        qrImg.onload = onBothLoaded;

        billetImg.onerror = function() {
            // Fallback : afficher l'image sans QR gravé
            imgEl.src = imgUrl;
        };
        qrImg.onerror = function() {
            imgEl.src = imgUrl;
        };

        billetImg.src = imgUrl;
        qrImg.src = qrUrl;
    }

    // --- Init ---
    function init() {
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');

        if (!id) {
            showError();
            return;
        }

        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) return;
            loadBillet(id);
        });
    }

    function loadBillet(id) {
        supabaseFetch('/rest/v1/billets?id=eq.' + encodeURIComponent(id) + '&select=*')
            .then(function(rows) {
                if (!rows || rows.length === 0) {
                    showError();
                    return;
                }
                renderBillet(rows[0]);
            })
            .catch(function() {
                showError();
            });
    }

    function renderBillet(b) {
        document.getElementById('billet-loading').classList.add('hidden');
        document.getElementById('billet-content').classList.remove('hidden');

        // Image avec QR gravé via Canvas
        var imgUrl = resolveImageUrl(b, 1000);
        var imgEl = document.getElementById('billet-image');
        if (imgUrl) {
            var qrUrl = getQrUrl(b.id);
            burnQrIntoImage(imgEl, imgUrl, qrUrl);
            imgEl.alt = b.NomBillet || 'Billet';
        } else {
            imgEl.style.display = 'none';
        }

        // Infos
        document.getElementById('billet-nom').textContent = b.NomBillet || '';
        document.getElementById('billet-ref').textContent = b.Reference || '';

        var lieu = [b.Cp, b.Ville, b.Dep, b.Pays].filter(Boolean).join(' — ');
        document.getElementById('billet-lieu').textContent = lieu;

        document.getElementById('billet-millesime').textContent = b.Millesime || '—';
        document.getElementById('billet-version').textContent = b.Version || '—';

        var catEl = document.getElementById('billet-categorie');
        catEl.textContent = b.Categorie || '—';

        if (b.Theme) {
            document.getElementById('billet-theme').textContent = b.Theme;
        } else {
            document.getElementById('billet-theme-row').style.display = 'none';
        }

        if (b.Commentaire) {
            document.getElementById('billet-commentaire').textContent = b.Commentaire;
        } else {
            document.getElementById('billet-commentaire-row').style.display = 'none';
        }

        document.title = (b.Reference || 'Billet') + ' — ' + (b.NomBillet || 'Fiche Billet');

        // Demande #5 — bouton « Signaler une erreur »
        currentBillet = b;
        refreshSignalementUi();
    }

    // ============================================================
    // Demande #5 — Signalement d'erreur sur le billet
    // ============================================================
    var currentBillet = null;

    // Email RÉEL (jamais l'identité impersonnée) : la RLS de `signalements` compare
    // auteur_email au vrai JWT — un signalement créé en impersonation appartient donc
    // au superadmin, c'est le comportement retenu (spec #5, point (b)).
    function realEmail() {
        return (firebase.auth().currentUser && firebase.auth().currentUser.email) || '';
    }

    // Cherche un signalement OUVERT de ce membre sur ce billet, et affiche
    // soit le bouton, soit l'état « signalement en cours ».
    function refreshSignalementUi() {
        var btn = document.getElementById('btn-signaler');
        var etat = document.getElementById('signalement-etat');
        if (!btn || !etat || !currentBillet) return;

        var email = realEmail();
        if (!email) return;

        supabaseFetch('/rest/v1/signalements?billet_id=eq.' + encodeURIComponent(currentBillet.id) +
                      '&auteur_email=eq.' + encodeURIComponent(email) +
                      '&etat=in.(nouveau,en_cours)&select=id,created_at&limit=1')
            .then(function(rows) {
                if (rows && rows.length) {
                    var d = rows[0].created_at ? new Date(rows[0].created_at).toLocaleDateString('fr-FR') : '';
                    etat.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Signalement en cours' +
                                     (d ? ' (envoyé le ' + d + ')' : '');
                    etat.classList.remove('hidden');
                    btn.classList.add('hidden');
                } else {
                    btn.classList.remove('hidden');
                    etat.classList.add('hidden');
                }
            })
            .catch(function() {
                // En cas d'échec de lecture, on laisse le bouton disponible :
                // la contrainte SQL empêchera de toute façon le doublon.
                btn.classList.remove('hidden');
            });
    }

    window.ouvrirModaleSignalement = function() {
        if (!currentBillet) return;
        fermerModaleSignalement();

        var options = '';
        window.SIGNALEMENT_MOTIFS.forEach(function(m) {
            options += '<option value="' + m.code + '">' + escapeHtml(m.label) + '</option>';
        });

        var overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.id = 'signalement-modal-overlay';
        overlay.innerHTML =
            '<div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="signalement-modal-title">' +
                '<h2 class="admin-modal-title" id="signalement-modal-title"><i class="fa-solid fa-flag"></i> Signaler une erreur</h2>' +
                '<p class="admin-modal-desc">Merci de décrire ce qui ne va pas : un administrateur vérifiera et corrigera la fiche.</p>' +
                '<p class="admin-modal-billet-name">' + escapeHtml(currentBillet.Reference || '') + ' — ' + escapeHtml(currentBillet.NomBillet || '') + '</p>' +
                '<div class="admin-modal-input-group">' +
                    '<label class="admin-modal-label" for="signalement-motif">Type d\'erreur</label>' +
                    '<select class="admin-modal-input" id="signalement-motif">' + options + '</select>' +
                '</div>' +
                '<div class="admin-modal-input-group">' +
                    '<label class="admin-modal-label" for="signalement-commentaire">Description <span style="color:var(--color-danger)">*</span></label>' +
                    '<textarea class="admin-modal-input" id="signalement-commentaire" rows="4" maxlength="1000" placeholder="Ex. : le millésime affiché est 2022, alors que le billet indique 2023."></textarea>' +
                '</div>' +
                '<p id="signalement-erreur" class="signalement-erreur hidden"></p>' +
                '<div class="admin-modal-actions">' +
                    '<button type="button" class="admin-modal-btn admin-modal-btn-secondary" onclick="fermerModaleSignalement()">Annuler</button>' +
                    '<button type="button" class="admin-modal-btn admin-modal-btn-danger" id="signalement-envoyer" onclick="envoyerSignalement()"><i class="fa-solid fa-paper-plane"></i> Envoyer</button>' +
                '</div>' +
            '</div>';

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) fermerModaleSignalement();
        });
        document.body.appendChild(overlay);
        var ta = document.getElementById('signalement-commentaire');
        if (ta) ta.focus();
    };

    window.fermerModaleSignalement = function() {
        var el = document.getElementById('signalement-modal-overlay');
        if (el) el.remove();
    };

    window.envoyerSignalement = function() {
        if (!currentBillet) return;
        var motif = document.getElementById('signalement-motif').value;
        var commentaire = (document.getElementById('signalement-commentaire').value || '').trim();
        var erreurEl = document.getElementById('signalement-erreur');
        var btnEnvoyer = document.getElementById('signalement-envoyer');

        if (!commentaire) {
            erreurEl.textContent = 'Merci de décrire l\'erreur constatée.';
            erreurEl.classList.remove('hidden');
            return;
        }
        erreurEl.classList.add('hidden');
        btnEnvoyer.disabled = true;

        supabaseFetch('/rest/v1/signalements', {
            method: 'POST',
            headers: { 'Prefer': 'return=minimal' },
            body: JSON.stringify({
                billet_id: currentBillet.id,
                billet_ref: currentBillet.Reference || null,
                auteur_email: realEmail(),
                motif: motif,
                commentaire: commentaire
            })
        })
        .then(function() {
            fermerModaleSignalement();
            refreshSignalementUi();
        })
        .catch(function(err) {
            btnEnvoyer.disabled = false;
            // 23505 = violation de l'index unique (un signalement déjà ouvert sur ce billet)
            var msg = (err && err.message) || '';
            erreurEl.textContent = /23505|duplicate/i.test(msg)
                ? 'Vous avez déjà un signalement en cours sur ce billet.'
                : 'Envoi impossible : ' + (msg || 'erreur réseau') + '.';
            erreurEl.classList.remove('hidden');
        });
    };

    function showError() {
        document.getElementById('billet-loading').classList.add('hidden');
        document.getElementById('billet-error').classList.remove('hidden');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
