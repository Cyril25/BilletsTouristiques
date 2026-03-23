// ============================================================
// Ma Collection — Script principal
// ============================================================
// Story 6-2 : Structure + accès restreint
// Story 6-3 : Paramétrage collection — frise temporelle
// ============================================================

(function() {
    'use strict';

    // --- État global ---
    var allBillets = [];
    var allPays = [];
    var memberRules = [];       // collection_rules du membre (sauvegardé)
    var editRules = [];         // copie de travail pendant l'édition
    var memberOverrides = [];   // collection_overrides du membre
    var collectionData = [];    // lignes table collection du membre
    var paramsOpen = false;
    var minYear = 2015;
    var maxYear = new Date().getFullYear();

    // --- Exposer les fonctions appelées depuis le HTML ---
    window.collToggleParams = collToggleParams;
    window.collAddBreakpoint = collAddBreakpoint;
    window.collCancelParams = collCancelParams;
    window.collSaveParams = collSaveParams;
    window.collRemoveBreakpoint = collRemoveBreakpoint;
    window.collTogglePaysGrid = collTogglePaysGrid;

    // ============================================================
    // 1. INITIALISATION
    // ============================================================

    // Attendre que global.js ait fini l'auth
    var checkAuthInterval = setInterval(function() {
        if (typeof window.userRole !== 'undefined' && firebase.auth().currentUser) {
            clearInterval(checkAuthInterval);
            init();
        }
    }, 100);

    function init() {
        var counter = document.getElementById('collection-counter');
        if (counter) counter.innerHTML = '<span class="collection-loading">Chargement...</span>';

        Promise.all([
            supabaseFetch('/rest/v1/billets?select=id,Millesime,Pays,HasVariante,NomBillet,Reference,Version&order=Millesime.asc.nullslast,Pays.asc'),
            supabaseFetch('/rest/v1/pays?select=nom&order=nom.asc'),
            supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(firebase.auth().currentUser.email) + '&select=collection_rules,collection_overrides,track_serial_numbers'),
            supabaseFetch('/rest/v1/collection?select=*')
        ])
        .then(function(results) {
            allBillets = results[0] || [];
            allPays = (results[1] || []).map(function(p) { return p.nom; });
            var membre = (results[2] || [])[0] || {};
            memberRules = membre.collection_rules || [];
            memberOverrides = membre.collection_overrides || [];
            collectionData = results[3] || [];

            // Déterminer la plage d'années depuis le catalogue
            var years = allBillets
                .map(function(b) { return parseInt(b.Millesime); })
                .filter(function(y) { return !isNaN(y) && y > 2000; });
            if (years.length > 0) {
                minYear = Math.min.apply(null, years);
                maxYear = Math.max.apply(null, years);
            }

            renderPerimetreSummary();
            renderCounter();
        })
        .catch(function(err) {
            console.error('Erreur chargement collection :', err);
            var counter = document.getElementById('collection-counter');
            if (counter) counter.innerHTML = '<span style="color:var(--color-danger);">Erreur de chargement</span>';
        });
    }

    // ============================================================
    // 2. CALCUL DU PÉRIMÈTRE (filtre vivant)
    // ============================================================

    function calculerPerimetre(billets, rules, overrides) {
        var inclus = {};  // billet_id -> true
        if (!rules || rules.length === 0) {
            // Pas de règles = tout le catalogue
            billets.forEach(function(b) { inclus[b.id] = true; });
        } else {
            // Trier les règles par année croissante
            var sorted = rules.slice().sort(function(a, b) { return a.annee - b.annee; });

            billets.forEach(function(b) {
                var annee = parseInt(b.Millesime);
                if (isNaN(annee)) return;

                // Trouver la règle applicable (dernière règle dont l'année <= année du billet)
                var regle = null;
                for (var i = sorted.length - 1; i >= 0; i--) {
                    if (sorted[i].annee <= annee) {
                        regle = sorted[i];
                        break;
                    }
                }

                if (!regle) return; // Billet avant la première règle → hors périmètre

                if (regle.type === 'arret') return; // Collecte arrêtée → hors périmètre

                // Vérifier le pays
                var pays = b.Pays || '';
                if (regle.pays_exclus && regle.pays_exclus.length > 0) {
                    if (regle.pays_exclus.indexOf(pays) !== -1) return; // Pays exclu
                }

                // Vérifier les variantes
                var estVariante = b.HasVariante && b.HasVariante !== 'N';
                if (estVariante && regle.variantes === false) return; // Variantes exclues

                inclus[b.id] = true;
            });
        }

        // Appliquer les overrides (priorité absolue)
        if (overrides && overrides.length > 0) {
            overrides.forEach(function(ov) {
                if (ov.action === 'include') {
                    inclus[ov.billet_id] = true;
                } else if (ov.action === 'exclude') {
                    delete inclus[ov.billet_id];
                }
            });
        }

        return inclus;
    }

    // ============================================================
    // 3. COMPTEUR HÉROS
    // ============================================================

    function renderCounter() {
        var counter = document.getElementById('collection-counter');
        if (!counter) return;

        var perimetre = calculerPerimetre(allBillets, memberRules, memberOverrides);
        var totalPerimetre = Object.keys(perimetre).length;

        // Compter les possédés
        var owned = 0;
        collectionData.forEach(function(c) {
            if (perimetre[c.billet_id] && (c.owned_normal || c.owned_variante)) {
                owned++;
            }
        });

        var pct = totalPerimetre > 0 ? Math.round((owned / totalPerimetre) * 100) : 0;

        counter.innerHTML =
            '<div class="collection-hero">' +
                '<div class="collection-hero-number">' + owned + ' <span class="collection-hero-sep">/</span> ' + totalPerimetre + '</div>' +
                '<div class="collection-hero-label">billets dans mon périmètre</div>' +
                '<div class="collection-hero-bar"><div class="collection-hero-fill" style="width:' + pct + '%"></div></div>' +
                '<div class="collection-hero-pct">' + pct + '%</div>' +
            '</div>';
    }

    // ============================================================
    // 4. RÉSUMÉ DU PÉRIMÈTRE
    // ============================================================

    function renderPerimetreSummary() {
        var el = document.getElementById('collection-perimetre-summary');
        if (!el) return;

        if (!memberRules || memberRules.length === 0) {
            el.innerHTML =
                '<div class="collection-no-rules">' +
                    '<i class="fa-solid fa-circle-info"></i> ' +
                    'Aucun périmètre configuré — tous les billets du catalogue sont inclus. ' +
                    '<button class="btn-link" onclick="collToggleParams()">Configurer mon périmètre</button>' +
                '</div>';
            return;
        }

        var sorted = memberRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var html = '<div class="collection-rules-summary">';

        sorted.forEach(function(r) {
            var icon, label, detail;
            if (r.type === 'debut') {
                icon = 'fa-play';
                label = 'Début';
            } else if (r.type === 'changement') {
                icon = 'fa-arrows-rotate';
                label = 'Changement';
            } else {
                icon = 'fa-stop';
                label = 'Arrêt';
            }

            detail = '';
            if (r.type !== 'arret') {
                var nbExclus = (r.pays_exclus || []).length;
                if (nbExclus === 0) {
                    detail += 'Tous les pays';
                } else {
                    detail += (allPays.length - nbExclus) + ' pays';
                }
                detail += r.variantes !== false ? ' · Variantes incluses' : ' · Sans variantes';
            }

            html +=
                '<div class="collection-rule-chip">' +
                    '<i class="fa-solid ' + icon + '"></i> ' +
                    '<strong>' + label + ' ' + r.annee + '</strong>' +
                    (detail ? ' — ' + detail : '') +
                '</div>';
        });

        html += '</div>';
        el.innerHTML = html;
    }

    // ============================================================
    // 5. PANEL DE PARAMÉTRAGE — TOGGLE / ANNULER / SAUVEGARDER
    // ============================================================

    function collToggleParams() {
        var panel = document.getElementById('collection-params-panel');
        var btn = document.getElementById('btn-toggle-params');
        if (!panel) return;

        paramsOpen = !paramsOpen;
        panel.style.display = paramsOpen ? '' : 'none';

        if (btn) {
            btn.innerHTML = paramsOpen
                ? '<i class="fa-solid fa-chevron-up"></i> Fermer'
                : '<i class="fa-solid fa-chevron-down"></i> Modifier';
        }

        if (paramsOpen) {
            // Copie de travail
            editRules = JSON.parse(JSON.stringify(memberRules));
            renderFrise();
            renderBreakpoints();
        }
    }

    function collCancelParams() {
        editRules = [];
        paramsOpen = false;
        var panel = document.getElementById('collection-params-panel');
        var btn = document.getElementById('btn-toggle-params');
        if (panel) panel.style.display = 'none';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Modifier';
    }

    function collSaveParams() {
        var user = firebase.auth().currentUser;
        if (!user) return;

        // Trier par année avant sauvegarde
        editRules.sort(function(a, b) { return a.annee - b.annee; });

        supabaseFetch('/rest/v1/membres?email=eq.' + encodeURIComponent(user.email), {
            method: 'PATCH',
            body: JSON.stringify({ collection_rules: editRules }),
            headers: { 'Prefer': 'return=minimal' }
        })
        .then(function() {
            memberRules = JSON.parse(JSON.stringify(editRules));
            collCancelParams();
            renderPerimetreSummary();
            renderCounter();
            showToast('Périmètre enregistré');
        })
        .catch(function(err) {
            console.error('Erreur sauvegarde rules :', err);
            showToast('Erreur lors de la sauvegarde', true);
        });
    }

    // ============================================================
    // 6. FRISE TEMPORELLE VISUELLE
    // ============================================================

    function renderFrise() {
        var el = document.getElementById('collection-frise');
        if (!el) return;

        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var range = maxYear - minYear;
        if (range <= 0) range = 1;

        var html = '<div class="frise-container">';

        // Barre de fond avec les années
        html += '<div class="frise-bar">';
        for (var y = minYear; y <= maxYear; y++) {
            var left = ((y - minYear) / range) * 100;
            html += '<span class="frise-year-tick" style="left:' + left + '%">' + y + '</span>';
        }

        // Segments colorés entre les breakpoints
        sorted.forEach(function(r, idx) {
            var startPct = ((r.annee - minYear) / range) * 100;
            var endPct = 100;
            if (idx < sorted.length - 1) {
                endPct = ((sorted[idx + 1].annee - minYear) / range) * 100;
            }

            var color;
            if (r.type === 'arret') {
                color = 'var(--color-danger-light, #f8d7da)';
            } else {
                var nbExclus = (r.pays_exclus || []).length;
                color = nbExclus === 0 ? 'var(--color-success-light, #d4edda)' : 'var(--color-warning-light, #fff3cd)';
            }

            html += '<div class="frise-segment" style="left:' + startPct + '%;width:' + (endPct - startPct) + '%;background:' + color + '"></div>';
        });

        // Points de rupture
        sorted.forEach(function(r, idx) {
            var left = ((r.annee - minYear) / range) * 100;
            var icon;
            if (r.type === 'debut') icon = 'fa-play';
            else if (r.type === 'changement') icon = 'fa-arrows-rotate';
            else icon = 'fa-stop';

            html += '<div class="frise-point" style="left:' + left + '%" title="' + r.type + ' ' + r.annee + '">' +
                        '<i class="fa-solid ' + icon + '"></i>' +
                    '</div>';
        });

        html += '</div>'; // .frise-bar
        html += '</div>'; // .frise-container

        el.innerHTML = html;
    }

    // ============================================================
    // 7. LISTE DES BREAKPOINTS (éditable)
    // ============================================================

    function renderBreakpoints() {
        var el = document.getElementById('collection-breakpoints');
        if (!el) return;

        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });

        if (sorted.length === 0) {
            el.innerHTML =
                '<div class="collection-no-rules">' +
                    '<i class="fa-solid fa-circle-info"></i> Aucun point de rupture. ' +
                    'Ajoutez-en un pour configurer votre périmètre.' +
                '</div>';
            return;
        }

        var html = '';
        sorted.forEach(function(r, idx) {
            html += renderBreakpointCard(r, idx);
        });

        el.innerHTML = html;
    }

    function renderBreakpointCard(rule, idx) {
        var typeOptions = [
            { value: 'debut', label: 'Début' },
            { value: 'changement', label: 'Changement' },
            { value: 'arret', label: 'Arrêt' }
        ];

        var yearOptions = '';
        for (var y = minYear; y <= maxYear; y++) {
            yearOptions += '<option value="' + y + '"' + (y === rule.annee ? ' selected' : '') + '>' + y + '</option>';
        }

        var typeSelect = '';
        typeOptions.forEach(function(t) {
            typeSelect += '<option value="' + t.value + '"' + (t.value === rule.type ? ' selected' : '') + '>' + t.label + '</option>';
        });

        var isArret = rule.type === 'arret';
        var nbExclus = (rule.pays_exclus || []).length;
        var paysLabel = nbExclus === 0 ? 'Tous les pays' : (allPays.length - nbExclus) + '/' + allPays.length + ' pays';

        var html =
            '<div class="breakpoint-card" data-idx="' + idx + '">' +
                '<div class="breakpoint-card-header">' +
                    '<select class="admin-form-input breakpoint-type" onchange="collUpdateBreakpoint(' + idx + ', \'type\', this.value)">' + typeSelect + '</select>' +
                    '<select class="admin-form-input breakpoint-year" onchange="collUpdateBreakpoint(' + idx + ', \'annee\', parseInt(this.value))">' + yearOptions + '</select>' +
                    '<button class="btn-icon btn-danger-icon" onclick="collRemoveBreakpoint(' + idx + ')" title="Supprimer">' +
                        '<i class="fa-solid fa-trash"></i>' +
                    '</button>' +
                '</div>';

        if (!isArret) {
            html +=
                '<div class="breakpoint-card-body">' +
                    '<div class="breakpoint-option">' +
                        '<label>' +
                            '<input type="checkbox"' + (rule.variantes !== false ? ' checked' : '') +
                            ' onchange="collUpdateBreakpoint(' + idx + ', \'variantes\', this.checked)">' +
                            ' Inclure les variantes' +
                        '</label>' +
                    '</div>' +
                    '<div class="breakpoint-option">' +
                        '<button class="btn-link" onclick="collTogglePaysGrid(' + idx + ')">' +
                            '<i class="fa-solid fa-earth-europe"></i> ' + paysLabel +
                        '</button>' +
                    '</div>' +
                    '<div id="pays-grid-' + idx + '" class="breakpoint-pays-grid" style="display:none">' +
                        renderPaysGrid(rule, idx) +
                    '</div>' +
                '</div>';
        }

        html += '</div>';
        return html;
    }

    function renderPaysGrid(rule, idx) {
        var exclus = rule.pays_exclus || [];
        var html =
            '<div class="breakpoint-pays-actions">' +
                '<button class="btn-link btn-sm" onclick="collPaysSelectAll(' + idx + ')">Tout cocher</button>' +
                '<button class="btn-link btn-sm" onclick="collPaysDeselectAll(' + idx + ')">Tout décocher</button>' +
            '</div>' +
            '<div class="preinsc-country-grid">';

        allPays.forEach(function(pays) {
            var checked = exclus.indexOf(pays) === -1;
            html +=
                '<div class="preinsc-country-item">' +
                    '<label>' +
                        '<input type="checkbox" class="pays-cb-' + idx + '" data-pays="' + pays + '"' +
                        (checked ? ' checked' : '') +
                        ' onchange="collUpdatePays(' + idx + ', \'' + pays.replace(/'/g, "\\'") + '\', this.checked)">' +
                        ' ' + pays +
                    '</label>' +
                '</div>';
        });

        html += '</div>';
        return html;
    }

    // ============================================================
    // 8. ACTIONS SUR LES BREAKPOINTS
    // ============================================================

    window.collUpdateBreakpoint = function(idx, field, value) {
        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var rule = sorted[idx];
        if (!rule) return;

        // Retrouver l'index réel dans editRules
        var realIdx = editRules.indexOf(rule);
        if (realIdx === -1) return;

        editRules[realIdx][field] = value;

        // Si on passe en "arret", nettoyer les champs inutiles
        if (field === 'type' && value === 'arret') {
            delete editRules[realIdx].pays_exclus;
            delete editRules[realIdx].variantes;
        } else if (field === 'type' && value !== 'arret') {
            if (editRules[realIdx].variantes === undefined) editRules[realIdx].variantes = true;
            if (!editRules[realIdx].pays_exclus) editRules[realIdx].pays_exclus = [];
        }

        renderFrise();
        renderBreakpoints();
    };

    window.collUpdatePays = function(idx, pays, checked) {
        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var rule = sorted[idx];
        if (!rule) return;

        var realIdx = editRules.indexOf(rule);
        if (realIdx === -1) return;

        if (!editRules[realIdx].pays_exclus) editRules[realIdx].pays_exclus = [];

        if (checked) {
            // Retirer de la liste des exclus
            editRules[realIdx].pays_exclus = editRules[realIdx].pays_exclus.filter(function(p) { return p !== pays; });
        } else {
            // Ajouter aux exclus
            if (editRules[realIdx].pays_exclus.indexOf(pays) === -1) {
                editRules[realIdx].pays_exclus.push(pays);
            }
        }

        // Mettre à jour le label du bouton pays sans tout re-rendre
        var btn = document.querySelector('.breakpoint-card[data-idx="' + idx + '"] .breakpoint-option .btn-link');
        if (btn) {
            var nbExclus = editRules[realIdx].pays_exclus.length;
            var paysLabel = nbExclus === 0 ? 'Tous les pays' : (allPays.length - nbExclus) + '/' + allPays.length + ' pays';
            btn.innerHTML = '<i class="fa-solid fa-earth-europe"></i> ' + paysLabel;
        }

        renderFrise();
    };

    window.collPaysSelectAll = function(idx) {
        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var rule = sorted[idx];
        if (!rule) return;
        var realIdx = editRules.indexOf(rule);
        if (realIdx === -1) return;

        editRules[realIdx].pays_exclus = [];
        renderFrise();
        renderBreakpoints();
    };

    window.collPaysDeselectAll = function(idx) {
        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var rule = sorted[idx];
        if (!rule) return;
        var realIdx = editRules.indexOf(rule);
        if (realIdx === -1) return;

        editRules[realIdx].pays_exclus = allPays.slice();
        renderFrise();
        renderBreakpoints();
    };

    function collAddBreakpoint() {
        // Année par défaut : année suivant le dernier breakpoint, ou minYear
        var defaultYear = minYear;
        if (editRules.length > 0) {
            var maxRuleYear = Math.max.apply(null, editRules.map(function(r) { return r.annee; }));
            defaultYear = Math.min(maxRuleYear + 1, maxYear);
        }

        var type = editRules.length === 0 ? 'debut' : 'changement';

        editRules.push({
            type: type,
            annee: defaultYear,
            pays_exclus: [],
            variantes: true
        });

        renderFrise();
        renderBreakpoints();
    }

    function collRemoveBreakpoint(idx) {
        var sorted = editRules.slice().sort(function(a, b) { return a.annee - b.annee; });
        var rule = sorted[idx];
        if (!rule) return;
        var realIdx = editRules.indexOf(rule);
        if (realIdx === -1) return;

        editRules.splice(realIdx, 1);
        renderFrise();
        renderBreakpoints();
    }

    function collTogglePaysGrid(idx) {
        var grid = document.getElementById('pays-grid-' + idx);
        if (!grid) return;
        grid.style.display = grid.style.display === 'none' ? '' : 'none';
    }

    // ============================================================
    // 9. TOAST
    // ============================================================

    function showToast(message, isError) {
        var existing = document.querySelector('.collection-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'collection-toast' + (isError ? ' collection-toast-error' : '');
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() { toast.classList.add('collection-toast-visible'); }, 10);
        setTimeout(function() {
            toast.classList.remove('collection-toast-visible');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

})();
