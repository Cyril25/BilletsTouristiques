// ============================================================
// Partager — génère un joli QR code à partager pour amener
// les visiteurs sur le site. Rendu sur Canvas (téléchargeable).
// ============================================================

(function() {
    'use strict';

    var SITE_URL = 'https://cyril25.github.io/BilletsTouristiques';
    var SHARE_URL = SITE_URL + '/';

    // Couleurs de la charte (cf. style.css)
    var COLOR_PRIMARY = '#5D3A7E';
    var COLOR_SECONDARY = '#7F58A0';
    var COLOR_ACCENT = '#B19CD9';
    var COLOR_SURFACE = '#EFE9F7';

    // Canvas haute résolution — rendu logique 600x800, dessin x2
    var LOGICAL_W = 600;
    var LOGICAL_H = 800;
    var SCALE = 2;

    function getQrUrl() {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=0&data=' + encodeURIComponent(SHARE_URL);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawShareQr(canvas, qrImg) {
        canvas.width = LOGICAL_W * SCALE;
        canvas.height = LOGICAL_H * SCALE;
        canvas.style.width = LOGICAL_W + 'px';
        canvas.style.height = LOGICAL_H + 'px';

        var ctx = canvas.getContext('2d');
        ctx.scale(SCALE, SCALE);

        // Fond dégradé mauve très clair → blanc
        var grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
        grad.addColorStop(0, COLOR_SURFACE);
        grad.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

        // Cadre violet arrondi
        ctx.strokeStyle = COLOR_ACCENT;
        ctx.lineWidth = 4;
        roundRect(ctx, 16, 16, LOGICAL_W - 32, LOGICAL_H - 32, 20);
        ctx.stroke();

        // Titre "Association"
        ctx.fillStyle = COLOR_SECONDARY;
        ctx.font = '300 26px Roboto, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Association', LOGICAL_W / 2, 74);

        // Titre "Billets Touristiques"
        ctx.fillStyle = COLOR_PRIMARY;
        ctx.font = 'bold 44px Roboto, Arial, sans-serif';
        ctx.fillText('Billets Touristiques', LOGICAL_W / 2, 122);

        // Sous-titre
        ctx.fillStyle = COLOR_SECONDARY;
        ctx.font = 'italic 18px Roboto, Arial, sans-serif';
        ctx.fillText('en toute Amitié et Confiance', LOGICAL_W / 2, 152);

        // QR : cadre blanc + ombre
        var qrSize = 380;
        var qrX = (LOGICAL_W - qrSize) / 2;
        var qrY = 200;
        var framePad = 18;

        ctx.save();
        ctx.shadowColor = 'rgba(93, 58, 126, 0.25)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, qrX - framePad, qrY - framePad, qrSize + framePad * 2, qrSize + framePad * 2, 14);
        ctx.fill();
        ctx.restore();

        // Dessiner le QR
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // "Flashez-moi !" sous le QR
        ctx.fillStyle = COLOR_PRIMARY;
        ctx.font = 'bold 32px Roboto, Arial, sans-serif';
        ctx.fillText('Flashez-moi !', LOGICAL_W / 2, qrY + qrSize + framePad + 48);

        // URL lisible
        ctx.fillStyle = COLOR_SECONDARY;
        ctx.font = '500 18px "Courier New", monospace';
        ctx.fillText('cyril25.github.io/BilletsTouristiques', LOGICAL_W / 2, qrY + qrSize + framePad + 82);

        // Pied — rejoignez la communauté
        ctx.fillStyle = COLOR_SECONDARY;
        ctx.font = '300 16px Roboto, Arial, sans-serif';
        ctx.fillText('Rejoignez notre communauté de collectionneurs', LOGICAL_W / 2, LOGICAL_H - 42);
    }

    function canvasToBlob(canvas) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob a échoué'));
            }, 'image/png');
        });
    }

    function downloadCanvas(canvas) {
        canvasToBlob(canvas).then(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'billets-touristiques-qr.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }).catch(function() {
            alert('Impossible de télécharger l\'image. Vous pouvez faire un clic droit > Enregistrer l\'image.');
        });
    }

    function shareCanvas(canvas) {
        canvasToBlob(canvas).then(function(blob) {
            var file = new File([blob], 'billets-touristiques-qr.png', { type: 'image/png' });
            var shareData = {
                title: 'Billets Touristiques',
                text: 'Rejoignez notre communauté de collectionneurs de billets touristiques !',
                files: [file]
            };
            if (navigator.canShare && navigator.canShare(shareData)) {
                navigator.share(shareData).catch(function() {});
            } else {
                downloadCanvas(canvas);
            }
        });
    }

    function generate() {
        var canvas = document.getElementById('partager-canvas');
        var loading = document.getElementById('partager-loading');
        var actions = document.getElementById('partager-actions');

        var qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.onload = function() {
            drawShareQr(canvas, qrImg);
            loading.classList.add('hidden');
            canvas.classList.remove('hidden');
            actions.classList.remove('hidden');

            // Bouton partager natif si dispo (mobile principalement)
            var btnShare = document.getElementById('btn-partager-share');
            if (navigator.share && navigator.canShare) {
                // Test dry-run avec un faux fichier pour savoir si files sont supportés
                try {
                    var testBlob = new Blob([''], { type: 'image/png' });
                    var testFile = new File([testBlob], 'test.png', { type: 'image/png' });
                    if (navigator.canShare({ files: [testFile] })) {
                        btnShare.style.display = '';
                    }
                } catch (e) { /* File() non supporté — on laisse caché */ }
            }
        };
        qrImg.onerror = function() {
            loading.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:#CC4444;"></i> Impossible de générer le QR code. Vérifiez votre connexion.';
        };
        qrImg.src = getQrUrl();

        document.getElementById('btn-partager-download').addEventListener('click', function() {
            downloadCanvas(canvas);
        });
        document.getElementById('btn-partager-share').addEventListener('click', function() {
            shareCanvas(canvas);
        });
    }

    function init() {
        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) return;
            generate();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
