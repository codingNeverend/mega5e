/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ActorSheet}
 */

import {
  safeDocumentUpdate,
  getMegaAPI,
  requireFXMaster,
  checkEffectsState,
  flashMagicHalo,
  startButtonParticles,
} from "./mega-utils.js";

class TabbedDialog extends Dialog {
  constructor(data, options = {}) {
    // Configuration des onglets
    options.tabs = [
      {
        navSelector: ".tabs",
        contentSelector: ".tab-content",
        initial: options.initial_tab || "tab1",
      },
    ];
    super(data, options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/mega/templates/macro_data/tabbedDialogTemplate.html",
      width: 710,
      height: 600,
    });
  }

  getData(options) {
    const context = super.getData(options);

    context.tabs = this.data.tabs.map((t, idx) => ({
      id: t.id || `tab${idx + 1}`,
      title: t.title || `Tab ${idx + 1}`,
      icon: t.icon || "fas fa-dice-d20",
      content: t.content || "",
    }));

    context.header = this.data.header;
    context.footer = this.data.footer;

    return context;
  }
}

// import { PlayerDialog }  from "./dialog.js";
export class MegaActorSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    const courtMetrage = game.settings.get("mega", "courtMetrage");
    return foundry.utils.mergeObject(options, {
      classes: ["mega", "sheet", "actor"],
      template: "systems/mega/templates/actor-sheet.html",
      width: courtMetrage ? 928 : 940,
      height: courtMetrage ? 517 : 700,
      tabs: [
        {
          navSelector: ".side-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /* -------------------------------------------- */

  /** @override */

  async getData() {
    const context = await super.getData();
    const actorData = context.data;
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Résolution des images d'items pour les badges combat (img absent du schéma template.json)
    for (const [slotKey, itemType, idx] of [
      ["mainsnues1", "Attaque sp\u00e9ciale", 0],
      ["mainsnues2", "Attaque sp\u00e9ciale", 1],
      ["mainsnues3", "Attaque sp\u00e9ciale", 2],
      ["armescourtes_1", "Arme courte", 0],
      ["armescourtes_2", "Arme courte", 1],
      ["armeslongues_1", "Arme longue", 0],
      ["armeslongues_2", "Arme longue", 1],
      ["lancer_1", "Arme de lancer", 0],
      ["lancer_2", "Arme de lancer", 1],
      ["tir_1", "Arme de tir", 0],
      ["tir_2", "Arme de tir", 1],
    ]) {
      const slot = context.system.talents_combat?.[slotKey];
      if (!slot) continue;
      const equipped = this.actor.items.filter(
        (i) => i.type === itemType && i.system.equipe === true,
      );
      const item = equipped[idx];
      const rawImg = item && slot.label === item.name ? item.img || "" : "";
      slot.img =
        rawImg && !rawImg.startsWith("/") && !rawImg.startsWith("http")
          ? "/" + rawImg
          : rawImg;
    }
    // Résolution des images pour les protections
    const equippedProt = this.actor.items.filter(
      (i) => i.type === "Protection" && i.system.equipe === true,
    );
    ["p1", "p2", "p3"].forEach((k, idx) => {
      const slot = context.system.protections?.[k];
      if (!slot) return;
      const item = equippedProt[idx];
      const rawImg = item && slot.label === item.name ? item.img || "" : "";
      slot.img =
        rawImg && !rawImg.startsWith("/") && !rawImg.startsWith("http")
          ? "/" + rawImg
          : rawImg;
    });
    context.GM = game.user.isGM;
    // Prepare items.
    this._prepareItems(context);
    context.rollData = context.actor.getRollData();
    context.enrichedBiography =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.biography,
        { async: true },
      );

    // Calcul du tableau de défense par localisation
    context.defenseParLocalisation = this._computeDefenseByLocalisation();

    // Somme des DEF de base des protections équipées
    context.def_prot_total = this.actor.items
      .filter((i) => i.type === "Protection" && i.system.equipe === true)
      .reduce((sum, i) => sum + (Number(i.system.def) || 0), 0);

    // Badges DEF réelle (même style que la fenêtre de localisation)
    {
      const _tc = {
        choc: "#e67e22",
        lame: "#b0bec5",
        balle: "#2980b9",
        feu: "#e74c3c",
        froid: "#5dade2",
        acide: "#2ecc71",
        rayon: "#9b59b6",
      };
      const _bd =
        (Number(context.system.def?.value) || 0) +
        (Number(context.system.def_modif?.value) || 0) +
        (Number(context.system.bonus_armes_def) || 0);
      for (const [key, color] of Object.entries(_tc)) {
        const val = Number(context.system[`protect_${key}`]?.value) || 0;
        const bonus = val - _bd;
        context[`protect_${key}_badge`] =
          bonus > 0
            ? `<span style="display:inline-block;background:linear-gradient(135deg,${color}dd,${color}88);color:#fff;border-radius:5px;padding:2px 8px;font-weight:bold;font-size:0.92em;box-shadow:0 1px 4px rgba(0,0,0,0.45);min-width:28px;text-align:center;">${val}<sup style="font-size:0.65em;margin-left:1px;opacity:0.85;">+${bonus}</sup></span>`
            : `<span style="display:inline-block;background:linear-gradient(135deg,${color}dd,${color}88);color:#fff;border-radius:5px;padding:2px 8px;font-weight:bold;font-size:0.92em;box-shadow:0 1px 4px rgba(0,0,0,0.45);min-width:28px;text-align:center;">${val}<sup style="font-size:0.65em;margin-left:1px;opacity:0.5;">0</sup></span>`;
      }
    }

    // Ajustement largeur si badge Bonus Armes visible
    {
      const courtMetrage = game.settings.get("mega", "courtMetrage");
      const bonusArmes = Number(context.system.bonus_armes_def) || 0;
      const baseWidth = courtMetrage ? 928 : 940;
      this.position.width = bonusArmes > 0 ? baseWidth + 120 : baseWidth;
    }

    return context;
  }

  /**
   * Calcule la somme des bonus de défense par localisation et par type d'attaque,
   * en tenant compte uniquement des protections équipées qui couvrent la zone.
   */
  _computeDefenseByLocalisation() {
    const zones = [
      { key: "tete", label: "Tête" },
      { key: "poitrine", label: "Poitrine" },
      { key: "ventre", label: "Ventre" },
      { key: "bras_g", label: "Bras gauche" },
      { key: "bras_d", label: "Bras droit" },
      { key: "main_g", label: "Main gauche" },
      { key: "main_d", label: "Main droite" },
      { key: "jambe_g", label: "Jambe gauche" },
      { key: "jambe_d", label: "Jambe droite" },
      { key: "pied_g", label: "Pied gauche" },
      { key: "pied_d", label: "Pied droit" },
    ];
    const types = ["choc", "lame", "balle", "feu", "froid", "acide", "rayon"];

    const equippedProtections = this.actor.items.filter(
      (i) => i.type === "Protection" && i.system.equipe === true,
    );

    // DEF de base = DEF calculée + modificateur manuel + bonus armes actives
    const sys = this.actor.system;
    const baseDef =
      (Number(sys.def?.value) || 0) +
      (Number(sys.def_modif?.value) || 0) +
      (Number(sys.bonus_armes_def) || 0);

    return zones.map((zone) => {
      const row = { label: zone.label };
      for (const type of types) {
        // On part de la DEF de base pour chaque cellule
        let total = baseDef;
        for (const prot of equippedProtections) {
          const c = prot.system.caracs;
          // La zone est-elle couverte par cette protection ? (1 = oui, coercition pour str/number)
          if (Number(c[`def_${zone.key}`]) === 1) {
            total += Number(c[`def_${type}`]) || 0;
          }
        }
        row[type] = total;
      }
      return row;
    });
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".melee-impair-indicator").on("click", (ev) => {
      if (this.actor.system.verouille) return;
      this.actor.update({ "system.melee_impair": 0 });
    });

    // Navigation entre onglets à la molette de la souris
    html[0].addEventListener(
      "wheel",
      (event) => {
        const tabItems = html.find(".side-tabs .side-tab-item");
        if (!tabItems.length) return;
        const tabs = tabItems.map((_, el) => el.dataset.tab).get();
        const activeTab = this._tabs[0].active;
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex === -1) return;
        // Molette vers le haut (deltaY < 0) → onglet précédent, vers le bas → onglet suivant
        const direction = event.deltaY < 0 ? -1 : 1;
        const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
        const newTab = tabs[newIndex];
        // Mettre à jour la classe active sur les boutons
        tabItems.removeClass("active");
        tabItems.filter(`[data-tab="${newTab}"]`).addClass("active");
        this._tabs[0].activate(newTab);
        // Déclencher l'ajustement de hauteur pour le nouvel onglet
        this._handleCombatTabResize(newTab);
      },
      { passive: true },
    );

    // Forcer la couleur blanche sur les valeurs de domaines
    html.find("input.tnt-di").each(function () {
      this.style.setProperty("color", "#ffffff", "important");
      this.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
      this.style.setProperty("opacity", "1", "important");
    });

    // Gestion des blocs collapsibles avec persistence localStorage
    const _collapseKey = `mega-collapse-${this.actor.id}`;
    const _collapseStates = JSON.parse(
      localStorage.getItem(_collapseKey) || "{}",
    );
    html.find(".weapon-feature-card").each(function (index) {
      const key = `card-${index}`;
      const $card = $(this);
      const $content = $card.find(".card-content");
      $content.css("transition", "none");
      if (key in _collapseStates) {
        if (_collapseStates[key]) {
          $card.addClass("collapsed");
        } else {
          $card.removeClass("collapsed");
        }
      }
      requestAnimationFrame(() =>
        requestAnimationFrame(() => $content.css("transition", "")),
      );
    });
    html.find(".collapsible-header").on("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      const card = $(this).closest(".weapon-feature-card");
      card.toggleClass("collapsed");
      const states = {};
      html.find(".weapon-feature-card").each(function (idx) {
        states[`card-${idx}`] = $(this).hasClass("collapsed");
      });
      localStorage.setItem(_collapseKey, JSON.stringify(states));
    });

    // Gestionnaire pour les boutons latéraux
    html.find(".side-tab-item").click(this._onSideTabClick.bind(this));

    // Initialiser l'onglet actif au chargement
    this._initializeActiveSideTab(html);

    // Mise à jour visuelle de l'étoile de résonance
    this._updateSphereStarClasses(html);

    // === SPÉ : affichage progressif ===
    const $speOuter = html.find(".spe-outer");
    if ($speOuter.length) {
      const $rows = $speOuter.find(".spe-row");
      const isEditable = this.options.editable && !this.actor.system.verouille;
      let lastFilledIdx = -1;
      $rows.each(function (i) {
        const val = ($(this).attr("data-spe-val") || "").trim();
        if (val !== "") lastFilledIdx = i;
      });
      const firstEmptyVisible = isEditable
        ? Math.min(lastFilledIdx + 1, $rows.length - 1)
        : lastFilledIdx;
      $rows.each(function (i) {
        $(this).find(".spe-add-btn").hide();
        if (i <= firstEmptyVisible) {
          $(this).show();
        } else {
          $(this).hide();
        }
      });
      if (isEditable && firstEmptyVisible < $rows.length - 1) {
        $rows.eq(firstEmptyVisible).find(".spe-add-btn").show();
      }
      $speOuter.on("click", ".spe-add-btn", function () {
        const $row = $(this).closest(".spe-row");
        const $allRows = $speOuter.find(".spe-row");
        const idx = $allRows.index($row);
        const $nextRow = $allRows.eq(idx + 1);
        if ($nextRow.length) {
          $row.find(".spe-add-btn").hide();
          $nextRow.show();
          if ($allRows.eq(idx + 2).length) {
            $nextRow.find(".spe-add-btn").show();
          }
        }
      });
    }

    //active ou désactive les effets spéciaux
    const effets_speciaux = game.settings.get("mega", "effets_speciaux");
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    // Toggle panneau Cumul & Défis - popover droite (persisté par acteur)
    const _cumulKey = `mega-cumul-${this.actor.id}`;
    const $cumulBody = html.find(".cumul-body");
    const $cumulArrow = html.find(".cumul-arrow");
    if (localStorage.getItem(_cumulKey) === "open") {
      $cumulBody.show();
      $cumulArrow.addClass("rotated");
    }
    html.find(".cumul-toggle").on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if ($cumulBody.is(":visible")) {
        $cumulBody.hide();
        $cumulArrow.removeClass("rotated");
        localStorage.setItem(_cumulKey, "closed");
      } else {
        $cumulBody.show();
        $cumulArrow.addClass("rotated");
        localStorage.setItem(_cumulKey, "open");
      }
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Boutons +/- pour ajuster le max d'ardence et résonnance
    html.find(".pts-adj-btn").on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const field = ev.currentTarget.dataset.field;
      const isInc = ev.currentTarget.classList.contains("pts-adj-inc");
      const current = foundry.utils.getProperty(this.actor, field) ?? 0;
      if (!isInc) {
        // Le − ne supprime que les cercles vides : le dernier cercle doit être vide
        const valueField = field.replace(/\.max$/, ".value");
        const value = foundry.utils.getProperty(this.actor, valueField) ?? 0;
        if (value >= current) return; // tous les cercles sont pleins, on bloque
      }
      const newVal = Math.max(0, current + (isInc ? 1 : -1));
      this.actor.update({ [field]: newVal });
    });

    // Clic sur un cercle (dot) d'ardence ou de résonnance
    html.find(".tpc-dots").on("click", ".tpc-dot", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const $dot = $(ev.currentTarget);
      const $dots = $dot.closest(".tpc-dots");
      const field = $dots.data("field");
      const idx = parseInt($dot.data("dot-index"), 10);
      const current = foundry.utils.getProperty(this.actor, field) ?? 0;
      let newVal;
      if (idx <= current && idx === current) {
        // Dernier plein → vider
        newVal = current - 1;
      } else if (idx === current + 1) {
        // Premier vide → remplir
        newVal = current + 1;
      } else {
        return; // clic sur un cercle non actionnable
      }
      this.actor.update({ [field]: Math.max(0, newVal) });
    });

    // Clic sur l'étoile de résonance sphérique
    html.find(".sphere-pt").on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (this.actor.system.verouille) return;
      const sphereName = ev.currentTarget.dataset.sphere;
      const s1 = this.actor.system.sphere?.value || "";
      const s2 = this.actor.system.sphere2?.value || "";
      if (sphereName === s1) {
        // Désélectionner sphère 1 : remonter s2 en s1
        this.actor.update({
          "system.sphere.value": s2,
          "system.sphere2.value": "",
          "system.sphere2.present": false,
        });
      } else if (sphereName === s2) {
        // Désélectionner sphère 2
        this.actor.update({
          "system.sphere2.value": "",
          "system.sphere2.present": false,
        });
      } else if (!s1) {
        this.actor.update({ "system.sphere.value": sphereName });
      } else {
        // Sphère 1 déjà prise → assigner ou remplacer sphère 2
        this.actor.update({
          "system.sphere2.value": sphereName,
          "system.sphere2.present": true,
        });
      }
    });

    // Edition de l'inventaire
    html.find(".item-edit").on("contextmenu", (ev) => {
      const itemId = ev.currentTarget.getAttribute("id");
      const item = this.actor.items.get(itemId);
      if (item) {
        if (item.type === "Pouvoir" && !game.user.isGM) {
          ui.notifications.warn(
            "Vous ne pouvez pas ouvrir cet item. Pour obtenir de l'information, cliquez droit sur le pouvoir dans l'onglet ATTRIBUTS",
          );
          return;
        }
        item.sheet.render(true);
      }
    });

    // Clic droit sur une protection dans l'onglet combat → ouvre la fiche
    html.find(".protection-combat-row").on("contextmenu", (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget.getAttribute("data-item-id");
      const item = this.actor.items.get(itemId);
      if (item) item.sheet.render(true);
    });

    // Supression de l'inventaire
    html.find(".item-delete").click((ev) => {
      const card = $(ev.currentTarget).closest(".inventory-item-card");
      let supItem = 0;
      let dialog_item_delete = new Dialog({
        title: "Suppression d'un item",
        content:
          "<div class='card-header'><span><i class='fas fa-trash'></i> SUPPRESSION</span></div>" +
          "<div style='padding:12px 8px;text-align:center'><i class='fas fa-trash' style='font-size:2em;color:#e74c3c;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Êtes-vous sûr ?</span></div>",
        buttons: {
          non: {
            label: "<i class='fas fa-times'></i> NON",
            callback: () => (supItem = 0),
          },
          oui: {
            label: "<i class='fas fa-check'></i> OUI",
            callback: () => {
              const itemId = card.find("img.item-edit").attr("id");
              const item = this.actor.items.get(itemId);
              if (!item) {
                ui.notifications.error("Item introuvable");
                return;
              }
              item.delete();
              card.slideUp(200, () => this.render(false));
              // eslint-disable-next-line no-undef
              ui.notifications.warn("L'item a été supprimé");
            },
          },
        },
        default: "non",
        close: function () {},
      });
      dialog_item_delete.render(true);
    });

    // Toggle équipement d'une arme dans l'onglet combat
    html.find(".item-equipe-toggle").click(async (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const itemId = ev.currentTarget.getAttribute("data-item-id");
      const item = this.actor.items.get(itemId);
      if (!item) return;

      const currentEquipe = item.system.equipe || false;
      const itemType = item.type;
      // Limite : 3 armes max pour "Attaque spéciale" (mêlée), 2 pour tous les autres types
      const maxEquipe =
        itemType === "Attaque spéciale" || itemType === "Protection" ? 3 : 2;

      if (currentEquipe) {
        // Désactiver : retirer de l'onglet combat
        await item.update({ "system.equipe": false });
      } else {
        // Activer : vérifier la limite
        const currentCount = this.actor.items.filter(
          (i) => i.type === itemType && i.system.equipe === true,
        ).length;

        if (currentCount >= maxEquipe) {
          const msg =
            itemType === "Attaque spéciale"
              ? `Vous ne pouvez activer que ${maxEquipe} attaques spéciales simultanément dans l'onglet combat. Désactivez-en une d'abord.`
              : `Vous ne pouvez activer que ${maxEquipe} armes de ce type simultanément dans l'onglet combat. Désactivez-en une d'abord.`;
          ui.notifications.warn(msg);
          return;
        }
        await item.update({ "system.equipe": true });
      }
    });

    // Visualisation d'un item
    html.find(".item-view").click((ev) => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      new ImagePopout(item.img, {
        title: item.name,
        shareable: true,
        uuid: item.uuid,
      }).render(true);
    });

    // Visualisation d'un acteur
    html.find(".actor-view").contextmenu((ev) => {
      let img = ev.currentTarget.getAttribute("value");
      new ImagePopout(img, {
        title: "Image",
        shareable: true,
      }).render(true);
    });

    // Menu d'autocomplétion des SPES

    html.find(".spes_edit").mouseenter((ev) => {
      // const voieInput = document.getElementById("voie-input");
      const spesDatalist = document.getElementById("spes");
      const typePJ = this.actor.system.type_acteur;
      let name = ev.currentTarget.getAttribute("name");
      if (name === "") {
        return;
      }
      let categories = {};
      let spes = [];
      if (typePJ === "MEGA") {
        spes = [
          "Infiltration",
          "Fouille en règle",
          "Mobiliser des indignés",
          "Intrusion",
          "Faussaire",
          "Chiqué",
          "Créer, utiliser et détecter Point de Transit",
          "Infiltrer les circuits du pouvoir",
          "Apaiser une assistance",
          "Repérer les connivences",
          "Négocier",
          "Agréable compagnie",
          "Soins précis et Premiers soins",
          "Poisons, drogues (nature et effets) et suggestion",
          "Thérapie verbale",
          "Abri de fortune",
          "Biotech",
          "Pièce-énergie de remplacement",
          "Mode d’emploi",
          "Grandes machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
          "Marché des pièces de récup",
          "Concepteur",
          "Pistage-orientation",
          "1er Contact (Ethnoranger)",
          "Chercher nourriture",
          "Combat primitif",
          "Œil de singe",
          "Architectures, ruines, labyrinthes et souterrains",
          "1er Contact (Patrouilleur)",
          "Créer, utiliser et détecter Point de Transit",
          "Combat en bâtiment",
          "Tailleur de pierre",
          "Stop combat : Assommer, Immobiliser ou Tenir à distance",
          "Tactiques d'urgence",
          "Voies dangereuses",
          "Bandes, pègre et fanatiques",
          "Extraire-exfiltrer",
          "Mondanités et activités ludiques",
          "Vraie nature",
          "Storytelling des populations",
          "Influence",
          "Chef-d'oeuvre",
          "Réseau",
          "Débattre",
          "Confident",
        ];

        categories = {
          Fouineur: [0, 1, 2, 3, 4, 5, 6],
          Médian: [7, 8, 9, 10, 11, 6],
          Biocyb: [12, 13, 14, 15, 16, 6],
          Conceptech: [17, 18, 19, 20, 21, 6],
          Ethnoranger: [22, 23, 24, 25, 26, 6],
          Patrouilleur: [27, 28, 29, 30, 31, 6],
          Escorteur: [32, 33, 34, 35, 36, 37, 6],
          Sensit: [38, 39, 40, 41, 42, 43, 44, 6],
        };
      } else {
        spes = [
          "Premiers soins",
          "Soins avancés",
          "Instruments médicaux",
          "Préparations médicales et poisons",
          "Ca va bien se passer",
          "Médecin : Milieux médicaux",
          "Chaman, rebouteux : Secrets familiaux ou historiques locaux",
          "Chaman, rebouteux : Effrayer",
          "Négocier",
          "Gérer équipe, recruter",
          "Réseau d'info et d'aide",
          "Secret des affaires",
          "Conduite/pilotage risqués (2 types de véhicules ou montures)",
          "Mécanique basique (2 types de véhicules)",
          "Négocier pièces et réparations",
          "Orientation et itinéraires",
          "Influencer",
          "Secrets familiaux ou historiques locaux",
          "État civil et administration locale",
          "Négocier",
          "État civil et État civil et administration locale",
          "Gérer équipe, recruter",
          "Intendance : gestion des denrées et des bâtiments",
          "Fabriquer et réparer, préciser 1 ou 2 types d'objets",
          "Point de transit    ",
          "Architectures, ruines, labyrinthes et souterrains",
          "1er Contact",
          "Combat en bâtiment",
          "Tailleur de pierre",
          "Point de transit     ",
          "Stop combat : Assommer, Immobiliser ou Tenir à distance",
          "Tactiques d'urgence",
          "Voies dangereuses",
          "Bandes, pègre et fanatiques",
          "Extraire-exfiltrer",
          "Mondanités et activités ludiques",
          "Point de transit      ",
          "Vraie nature",
          "Storytelling des populations",
          "Influence",
          "Chef-d'oeuvre",
          "Réseau",
          "Débattre",
          "Confident",
          "Point de transit       ",
        ];

        categories = {
          Soignant: [0, 1, 2, 3, 4, 5, 6, 7],
          "Homme d'affaire": [8, 9, 10, 11],
          "Chauffeur, pilote": [12, 13, 14, 15],
          Ecclésiastique: [18, 19, 20, 21, 22, 30],
          "Clerc, notaire": [23, 24, 25, 26, 27, 28, 31],
          "Intendant, connétable": [32, 33, 34, 35, 36],
          "Moine guerrier": [37, 38, 39, 40, 41, 42, 43],
          Chevalier: [44, 45, 46, 47, 48, 49, 50, 51],
          Artiste: [44, 45, 46, 47, 48, 49, 50, 51],
          "Militaire, milicien, policier": [44, 45, 46, 47, 48, 49, 50, 51],
          "Agent de sécurité, garde du corps": [44, 45, 46, 47, 48, 49, 50, 51],
          Infiltrateur: [44, 45, 46, 47, 48, 49, 50, 51],
        };
      }
      const myMap = new Map();
      for (const [category, indices] of Object.entries(categories)) {
        indices.forEach((index) => myMap.set(spes[index], category));
      }

      const voie = this.actor.system.voie.value;
      spesDatalist.innerHTML = ""; // Clear existing options

      if (categories[voie]) {
        categories[voie].forEach((index) => {
          const option = document.createElement("option");
          option.value = spes[index];
          spesDatalist.appendChild(option);
        });
      }
    });

    // Ajout d'attributs manuellement (déprécié)
    html
      .find(".attributes")
      .on(
        "click",
        ".attribute-control",
        this._onClickAttributeControl.bind(this),
      );

    html.find(".masquer_combat").click((ev) => {
      if (this.actor.system.combat_large == false) {
        this.actor.update({ "system.combat_large": true });
      } else this.actor.update({ "system.combat_large": false });
    });

    html.find(".toggle_prot_rows").click((ev) => {
      this.actor.update({
        "system.prot_def_masquee": !this.actor.system.prot_def_masquee,
      });
    });

    // Tableau de défense par localisation
    html.find(".btn-defense-localisation").click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._onShowDefenseLocalisation();
    });

    //Masque ou développe les cartouches dans l'onglet MJ
    html.find(".masquer").click((ev) => {
      let table_name = ev.currentTarget.getAttribute("value");
      switch (table_name) {
        case "vie":
          if (this.actor.system.masquer_pv == false) {
            this.actor.update({ "system.masquer_pv": true });
          } else this.actor.update({ "system.masquer_pv": false });
          break;

        case "ardence":
          if (this.actor.system.masquer_ardence == false) {
            this.actor.update({ "system.masquer_ardence": true });
          } else this.actor.update({ "system.masquer_ardence": false });
          break;

        case "resonnance":
          if (this.actor.system.masquer_resonnance == false) {
            this.actor.update({ "system.masquer_resonnance": true });
          } else this.actor.update({ "system.masquer_resonnance": false });
          break;

        case "melee":
          if (this.actor.system.masquer_melee == false) {
            this.actor.update({ "system.masquer_melee": true });
          } else this.actor.update({ "system.masquer_melee": false });
          break;

        case "charge":
          if (this.actor.system.masquer_avantage_charge == false) {
            this.actor.update({ "system.masquer_avantage_charge": true });
          } else this.actor.update({ "system.masquer_avantage_charge": false });
          break;

        case "effet_charge":
          if (this.actor.system.masquer_avantage_effet_charge == false) {
            this.actor.update({ "system.masquer_avantage_effet_charge": true });
          } else
            this.actor.update({
              "system.masquer_avantage_effet_charge": false,
            });
          break;

        case "bagarre":
          if (this.actor.system.masquer_avantage_bagarre == false) {
            this.actor.update({ "system.masquer_avantage_bagarre": true });
          } else
            this.actor.update({ "system.masquer_avantage_bagarre": false });
          break;

        case "effet_bagarre":
          if (this.actor.system.masquer_avantage_effet_bagarre == false) {
            this.actor.update({
              "system.masquer_avantage_effet_bagarre": true,
            });
          } else
            this.actor.update({
              "system.masquer_avantage_effet_bagarre": false,
            });
          break;

        case "mainsnues1":
          if (this.actor.system.masquer_avantage_mainsnues1 == false) {
            this.actor.update({ "system.masquer_avantage_mainsnues1": true });
          } else
            this.actor.update({ "system.masquer_avantage_mainsnues1": false });
          break;

        case "effet_mainsnues1":
          if (this.actor.system.masquer_effet_mainsnues1 == false) {
            this.actor.update({ "system.masquer_effet_mainsnues1": true });
          } else
            this.actor.update({ "system.masquer_effet_mainsnues1": false });
          break;
      }
    });

    //Focus et sélection au survol des champs Comb
    html.find(".comb").mouseover((ev) => {
      ev.currentTarget.focus();
      ev.currentTarget.setSelectionRange(0, ev.currentTarget.value.length);
    });

    html.find(".autoselect").select((ev) => {
      ev.currentTarget.focus();
      ev.currentTarget.setSelectionRange(0, ev.currentTarget.value.length);
    });

    //Clic direct sur l'intitulé du pouvoir
    html.find(".pouvoir_psi").click((ev) => {
      let table_name = ev.currentTarget.getAttribute("value");
      ui.notifications.warn(
        "Pour utiliser un POUVOIR, sélectionnez d'abord un TALENT.",
      );
    });

    html.find(".svg").click((ev) => {
      const img = this.querySelector(".svg");
      if (img) {
        img.classList.add("active");
        console.log("Active class added to image:", img);
      } else {
        console.log("No image found in link:", this);
      }
    });

    // Fenêtre d'Informations sur les effets de combat
    html.find(".info_effets_speciaux").click((ev) => {
      const myDialogOptions = {
        resizable: true,
        initial_tab: "tab1",
        width: 640,
        height: 831,
        top: 10,
        left: 10,
        classes: ["window-dialog"],
      };
      let description = "";
      let icon1 = "systems/mega/images/polar-star.svg";
      let pouvoir = ev.currentTarget.getAttribute("value");
      const _row = (bg, letter, title, subtitle, desc) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.12);">` +
        `<span style="background:${bg};color:#fff;font-weight:bold;font-size:13px;min-width:26px;height:26px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-family:monospace;">${letter}</span>` +
        `<div style="flex:1;"><strong>${title}</strong>` +
        (subtitle
          ? `<span style="opacity:0.55;font-size:11px;margin-left:6px;">${subtitle}</span>`
          : "") +
        (desc
          ? `<div style="opacity:0.75;font-size:12px;margin-top:2px;">${desc}</div>`
          : "") +
        `</div></div>`;
      const _section = (bg, icon, label, rows) =>
        `<div style="margin-bottom:12px;">` +
        `<div style="background:${bg};color:#fff;padding:5px 10px;border-radius:4px;font-weight:bold;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">` +
        `<i class="fas fa-${icon}" style="margin-right:5px;"></i>${label}</div>` +
        rows +
        `</div>`;
      description =
        `<div style="padding:12px 14px;font-size:13px;line-height:1.45;">` +
        _section(
          "rgba(200,55,40,0.82)",
          "bolt",
          "Imm&eacute;diat",
          _row(
            "rgba(200,55,40,0.85)",
            "H",
            "Handicaper",
            "",
            "La douleur emp&ecirc;che la cible d'utiliser normalement un membre.",
          ) +
            _row(
              "rgba(200,55,40,0.85)",
              "A",
              "Assommer",
              "",
              "La cible est inconsciente pendant <em>(Av)d4</em> Round(s).",
            ) +
            _row(
              "rgba(200,55,40,0.85)",
              "S",
              "Sonner",
              "",
              "Malus de <strong>-4Rg</strong> aux ATT et <strong>-2</strong> &agrave; la DEF pendant <em>(Av)d4</em> Round(s).",
            ) +
            _row(
              "rgba(200,55,40,0.85)",
              "R",
              "Renverser",
              "",
              "La cible chute et doit consommer une action pour se relever.",
            ) +
            _row(
              "rgba(200,55,40,0.85)",
              "I",
              "Immobiliser",
              "",
              "La cible ne peut plus combattre tant qu'elle ne s'est pas lib&eacute;r&eacute;e. Elle et l'Attaquant ne peuvent que : D&eacute;fenses avec Malus, maintenir/rompre l'immobilisation ou n&eacute;gocier.",
            ) +
            _row("rgba(200,55,40,0.85)", "V", "Vitesse", "", ""),
        ) +
        _section(
          "rgba(41,128,185,0.82)",
          "clock",
          "Prochaine Action",
          _row(
            "rgba(41,128,185,0.85)",
            "P",
            "Positionnement",
            "Roleplay, ou DEF +1 Niv et ATT Adv -2Rg",
            "Position favorable : DEF +1 et, au choix, +4Rg en ATT (lui) ou -4Rg en ATT (adversaire) au prochain Round.",
          ),
        ) +
        _section(
          "rgba(39,174,96,0.82)",
          "shield-alt",
          "Prochaine DEF",
          _row(
            "rgba(39,174,96,0.85)",
            "T",
            "Tenir &agrave; distance",
            "Imm&eacute;diat : D&eacute;g&acirc;t 0, Prochaine DEF +1 Niv, Adv : ATT -2Rg",
            "Grands moulinets avec une arme d'allonge &eacute;gale ou sup&eacute;rieure. Pas de d&eacute;g&acirc;ts : pour chaque Av → DEF +1 et ATT adv -2Rg. Permet de dialoguer sans blesser.",
          ),
        ) +
        _section(
          "rgba(130,60,170,0.82)",
          "crosshairs",
          "Prochaine ATT",
          _row(
            "rgba(130,60,170,0.85)",
            "D",
            "D&eacute;faut de la cuirasse",
            "+2Av &agrave; la prochaine ATT qui touche",
            "Faille rep&eacute;r&eacute;e dans la protection adverse : +2Av &agrave; la prochaine attaque qui touche cet adversaire.",
          ),
        ) +
        `</div>`;
      let d = new TabbedDialog(
        {
          title: "Informations Effets Spéciaux",
          header:
            `<div style="background:linear-gradient(135deg,rgba(40,40,60,0.92) 0%,rgba(70,30,30,0.88) 100%);border-radius:6px;padding:14px 18px 12px;margin-bottom:6px;display:flex;align-items:center;gap:14px;border-left:4px solid rgba(200,55,40,0.90);">` +
            `<div style="flex-shrink:0;width:42px;height:42px;background:rgba(200,55,40,0.20);border-radius:50%;border:2px solid rgba(200,55,40,0.60);display:flex;align-items:center;justify-content:center;">` +
            `<i class="fas fa-khanda" style="font-size:20px;color:rgba(220,100,80,1);"></i></div>` +
            `<div>` +
            `<div style="font-size:15px;font-weight:bold;letter-spacing:0.5px;color:#f0ede8;margin-bottom:3px;">Effets Sp&eacute;ciaux de Combat</div>` +
            `<div style="display:flex;gap:6px;flex-wrap:wrap;">` +
            `<span style="background:rgba(200,55,40,0.70);color:#fff;font-size:10px;padding:1px 7px;border-radius:10px;font-weight:bold;"><i class="fas fa-bolt" style="margin-right:3px;"></i>Imm&eacute;diat</span>` +
            `<span style="background:rgba(41,128,185,0.70);color:#fff;font-size:10px;padding:1px 7px;border-radius:10px;font-weight:bold;"><i class="fas fa-clock" style="margin-right:3px;"></i>Prochaine Action</span>` +
            `<span style="background:rgba(39,174,96,0.70);color:#fff;font-size:10px;padding:1px 7px;border-radius:10px;font-weight:bold;"><i class="fas fa-shield-alt" style="margin-right:3px;"></i>Prochaine DEF</span>` +
            `<span style="background:rgba(130,60,170,0.70);color:#fff;font-size:10px;padding:1px 7px;border-radius:10px;font-weight:bold;"><i class="fas fa-crosshairs" style="margin-right:3px;"></i>Prochaine ATT</span>` +
            `</div></div></div>`,
          footer: "",
          tabs: [
            { title: "Effets de combat", content: description, icon: icon1 },
          ],
          buttons: {},
          default: "two",
          render: (html) => {
            html.closest(".app").find(".modern-tabs-container").hide();
          },
          close: (html) =>
            console.log(
              "This always is logged no matter which option is chosen",
            ),
        },
        myDialogOptions,
      );
      d.render(true);
    });

    html.find(".info_talents").click((ev) => {
      const myDialogOptions = {
        resizable: true,
        initial_tab: "tab1",
        width: 580,
        height: 620,
        top: 10,
        left: 10,
        classes: ["window-dialog"],
      };
      let icon1 = "systems/mega/images/histogram.svg";
      const _trow = (badge, badgeBg, desc) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.12);">` +
        `<span style="background:${badgeBg};color:#fff;font-weight:bold;font-size:12px;min-width:36px;height:26px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-family:monospace;letter-spacing:-0.5px;">${badge}</span>` +
        `<div style="flex:1;font-size:12.5px;line-height:1.4;">${desc}</div>` +
        `</div>`;
      const description =
        `<div style="padding:12px 14px;font-size:13px;line-height:1.45;">` +
        _trow(
          "✕",
          "rgba(160,30,30,0.85)",
          "<strong>Talent d&eacute;test&eacute;</strong> <span style='opacity:0.6;font-size:11px;'>(saisir 99 dans la fiche)</span><br><span style='opacity:0.75;'>Pratique &eacute;vit&eacute;e, quasi phobique.</span>",
        ) +
        _trow(
          "-2Rg",
          "rgba(200,80,20,0.85)",
          "<strong>Talent maudit</strong><br><span style='opacity:0.75;'>Pratique maudite, mauvais feeling, toujours un probl&egrave;me.</span>",
        ) +
        _trow(
          "d0",
          "rgba(100,100,110,0.80)",
          "Pratique rare, au minimum &mdash; pas d&rsquo;entra&icirc;nement particulier.",
        ) +
        _trow(
          "d2",
          "rgba(110,100,80,0.82)",
          "Pratique vaguement exerc&eacute;e.",
        ) +
        _trow(
          "d4",
          "rgba(160,130,20,0.85)",
          "Pratique correcte, apprise ou travaill&eacute;e.",
        ) +
        _trow(
          "d6",
          "rgba(60,150,80,0.85)",
          "Pratique fr&eacute;quente, travaill&eacute;e et r&eacute;guli&egrave;rement exerc&eacute;e.",
        ) +
        _trow(
          "d8",
          "rgba(30,140,100,0.85)",
          "Pratique tr&egrave;s exerc&eacute;e &mdash; bonne intuition et anticipation des probl&egrave;mes.",
        ) +
        _trow(
          "d10",
          "rgba(30,100,180,0.85)",
          "Pratique essentielle du personnage, r&eacute;fl&eacute;chie, travaill&eacute;e et exerc&eacute;e quotidiennement, m&ecirc;me virtuellement.",
        ) +
        _trow(
          "d12",
          "rgba(80,50,170,0.85)",
          "Pratique essentielle travaill&eacute;e quotidiennement, intensivement, au d&eacute;triment d&rsquo;autres activit&eacute;s.",
        ) +
        _trow("d14", "rgba(130,30,140,0.90)", "<strong>Hors-norme.</strong>") +
        `</div>`;
      let d = new TabbedDialog(
        {
          title: "Informations Domaines et Talents",
          header:
            `<div style="background:linear-gradient(135deg,rgba(30,40,60,0.92) 0%,rgba(30,60,40,0.88) 100%);border-radius:6px;padding:14px 18px 12px;margin-bottom:6px;display:flex;align-items:center;gap:14px;border-left:4px solid rgba(60,150,80,0.90);">` +
            `<div style="flex-shrink:0;width:42px;height:42px;background:rgba(60,150,80,0.20);border-radius:50%;border:2px solid rgba(60,150,80,0.60);display:flex;align-items:center;justify-content:center;">` +
            `<i class="fas fa-chart-bar" style="font-size:20px;color:rgba(100,200,130,1);"></i></div>` +
            `<div>` +
            `<div style="font-size:15px;font-weight:bold;letter-spacing:0.5px;color:#f0ede8;margin-bottom:3px;">&Eacute;chelle des Domaines &amp; Talents</div>` +
            `<div style="opacity:0.65;font-size:11.5px;">Du talent d&eacute;test&eacute; au hors-norme &mdash; 10 niveaux de ma&icirc;trise</div>` +
            `</div></div>`,
          footer: "",
          tabs: [
            { title: "Échelle des Talents", content: description, icon: icon1 },
          ],
          buttons: {},
          render: (html) => {
            html.closest(".app").find(".modern-tabs-container").hide();
          },
        },
        myDialogOptions,
      );
      d.render(true);
    });

    // Infos sur les points d'XP
    html.find(".infoXP").click((ev) => {
      const myDialogOptions = {
        resizable: true,
        initial_tab: "tab1",
        width: 600,
        height: 450,
        top: 10,
        left: 10,
      };
      let tab1 = "Généralités";
      let tab2 = "Talents, Spés";
      let tab3 = "Traits, Domaines, Pouvoirs";
      let icon1 = "triangle-target.svg";
      let icon2 = "uncertainty.svg";
      let icon3 = "uncertainty.svg";
      let titre = "Points d'expérience";
      let description1 =
        "<p class='MsoNormal'>Les actions en cours de jeu, le succès global de la mission, mais aussi les succès intermédiaires (avoir évité des dégâts collatéraux, avoir protégés des PNJ, ...) ou personnels (avoir surmonté ses hantises, ...), les meilleurs moments de roleplay, vont rapporter aux joueurs des points d'Expérience qu'ils pourront utiliser en fin d'aventure pour améliorer les caractéritiques de leur personnage.</p><p></p><p></p>";
      let description2 =
        "<p><strong>Tarif en PeX = Rang visé (par ex : Rang 8 = 8 PeX).</strong></p><p>C'est le talent générique qu'il faut d'abord modifié. Ensuite, les 3 talents associés sont modifiés suivant les bonus/malus déjà en place (+2,-2 et 0).</p><p>Par ex :</p><p>Le personnage a 4 en Interpréter (6 en Langage Corporel, 4 en Codes et 2 en Expression artistique).</p><p>Il souhaite passer Interpréter à 8.</p><p>Il lui faut \"débourser\" 8 PeX.</p><p>Langage corporel passe alors à 10, Codes à 8 et 6 en Expression artistiques.</p><p><strong><br>Exceptions</strong> :</p><p>· Talent -99 et -2Rg : impossible d’améliorer par l’expérience</p>";
      let description3 =
        "<p><strong>Tarif en PeX = 2 fois le Rang visé (par ex. : Rang 8 = 16PeX).</strong></p><p>Le maximum des Domaines est 12.<br><br>A la fin de chaque scénario, en cohérence avec les actions réalisées par le personnage et en accord avec le MJ, il est possible de prendre :</p><p>· 2Rg dans un Trait pour les mettre dans un autre.</p><p>· 2Rg dans un Domaine pour les mettre dans un autre.</p>";
      let tab_1 = new TabbedDialog(
        {
          title: titre,
          header: "",
          footer: "",
          tabs: [
            { title: tab1, content: description1, icon: icon1 },
            { title: tab2, icon: icon2, content: description2 },
            { title: tab3, icon: icon3, content: description3 },
          ],
          buttons: {},
          default: "two",
          render: (html) =>
            console.log("Register interactivity in the rendered dialog"),
          close: (html) =>
            console.log(
              "This always is logged no matter which option is chosen",
            ),
        },
        myDialogOptions,
      );

      tab_1.render(true);
    });

    // Clic droit sur une SPÉ : afficher la description dans une boîte de dialogue
    html.find(".tooltip_spe").on("contextmenu", (ev) => {
      ev.preventDefault();
      let spe = ev.currentTarget.getAttribute("value");
      const spes = spe.split("|");
      const speLabel = spes[1] || "";
      if (!speLabel) return;
      let description = "";
      switch (spes[1]) {
        case "Débattre":
          description =
            "Le Sensit adore discuter, négocier, marchander, faire semblant d'être \"d'accord, quoique...\" pour mieux faire changer d'avis un interlocuteur obtus ou être d'avis opposé pour en indigner un autre, qu'il veut remotiver. Ou simplement pour semer le doute.";
          break;
        case "Storytelling des populations":
          description =
            "Contes et légendes, personnages et évènements de l'Histoire officielle ou officieuse, croyances, le Sensit se nourrit, à condition d'en avoir le temps et de multiplier les sources (rencontres, voyages, bibliothèques), des symboles qui lient les grands groupes et la société dans lesquels il est immergé, et il sait les utiliser à son idée.";
          break;
        case "Soins précis et Premiers soins":
          description =
            "Le Biocyb sait identifier les maux et blessures des patients qu'il examine, éviter les erreurs de diagnostic et agir au mieux, en fonction des moyens dont il dispose, pour les soigner. ";
          break;
        case "Poisons, drogues (nature et effets) et suggestion":
          description =
            "Le Biocyb est incollable sur les moyens connus de modifier le métabolisme des êtres vivants, humains en particulier, y compris les conséquences somatiques des suggestions psychologiques. Il sait les identifier, les recueillir ou les fabriquer, les mettre en oeuvre, et dans une moindre mesure, contrer ceux qui peuvent l'être. Pour la partie fabrication, le bonus peut être utilisé avec le Talent Manips.";
          break;
        case "Abri de fortune":
          description =
            "Entraîné à tenter de garder en vie des cas graves et intransportables dans des conditions difficiles, le Biocyb sait utiliser au mieux les moindres ressources disponibles (anfractuosité rocheuse, structures de constructions, objets et matériaux disponibles) pour isoler et éventuellement camoufler un blessé, soit pour le soigner sans être remarqué, soit pour le mettre à l'abri le temps de revenir avec des secours. Il peut utiliser ce Talent pour lui, s'il doit se fabriquer un abri. ";
          break;
        case "Biotech":
          description =
            "Le Biocyb sait où chercher, utiliser, adapter (voire pirater) les appareillages médicaux accessibles dans sa zone d'action. Il connaît également les us et coutumes de ceux qui les utilisent, les fabriquent ou en font le trafic. ";
          break;
        case "Infiltration":
          description =
            "Le Fouineur est particulièrement doué pour infiltrer et influencer les groupes visant à déstabiliser ou abattre un pouvoir en place. Un Test réussi avec cette Spé en repérage lui permet d'utiliser ses éventuels Avantages comme bonus (max 2Niv) pour ses futures actions au contact des membres dudit groupe.";
          break;
        case "Fouille en règle":
          description =
            "Avec cette Spé, même avec un succès modeste à son Test, le Fouineur trouve rapidement tout ce qui est mal caché et peut en déduire où mieux chercher ce qui est très bien caché ou subodorer un piège, une surveillance (+1Niv à son prochain Test sur la même fouille, max +2Niv).";
          break;
        case "Intrusion":
          description =
            "Avec les Traits d'Esprit, cette Spé sert à optimiser la recherche d'infos sur les lieux où le Fouineur veut s'introduire, à mieux estimer les dangers possibles des divers accès. Avec les Traits d'Éveil et de Corps, elle permet de se faire le plus discret et efficace possible une fois sur place. ";
          break;
        case "Chiqué":
          description =
            "Sur un Test réussi indépendamment du combat en cours, le Fouineur fait semblant d'être plus gravement touché que réellement (ou de l'avoir été si cela n'a pas été le cas), soit pour indigner les spectateurs, ou pour paraître sans intérêt, ou pour se relever encore et encore et déstabiliser des adversaires. ";
          break;
        case "Pièce-énergie de remplacement":
          description =
            "Le Conceptech sait remplacer une pièce, un élément (ou le type d’énergie normalement nécessaire) par un bricolage vraisemblable. A moins de créer la pièce, s’il a un minimum de matériel sous la main ou en détournant des pièces similaires.";
          break;
        case "Mode d’emploi":
          description =
            "Cette Spé permet de deviner, parfois en testant un tout petit peu, le mode d’emploi de base d’une machine inconnue. Un Test bien réussi permet d’aller plus loin ou de trouver le vrai mode d’emploi. Un Test raté peut ouvrir une digression imprévue dans la mission.";
          break;
        case "Mobiliser des indignés":
          description =
            "Le Fouineur est capable de pousser à l'action un assez grand groupe de personnes déjà motivées par une injustice (réelle ou ressentie), soit en parlant ou agissant lui-même, soit en soutenant plus discrètement le discours et les actes d'un meneur.";
          break;
        case "Faussaire":
          description =
            "Le Fouineur sait où chercher les réseaux de faussaires (faux papiers, faux documents, fausse monnaie). Et en cas de besoin, il connaît quelques techniques pour en réaliser lui-même de facture passable.";
          break;
        case "Infiltrer les circuits de pouvoir":
          description =
            "Le Médian est spécialement doué pour infiltrer les personnes gravitant dans les sphères du pouvoir. Un Test réussi avec cette Spé lors d'un repérage (approcher des gens et s'informer sur eux) lui vaut des bonus pour ses futures actions au contact des cibles « repérées » : négocier, se faire passer pour quelqu'un d'autre, etc…).";
          break;
        case "Apaiser une assistance":
          description =
            "Sur un Test réussi, le Médian pacificateur peut repérer ou deviner les arguments ou actions susceptibles de calmer le jeu dans une assemblée tendue ou en colère. Ses éventuels Avantages peuvent servir comme bonus à ses prochains Tests de Talents de Communication dans cette même assemblée.";
          break;
        case "Repérer les connivences":
          description =
            "Le Médian sait faire le lien entre les échanges de regards ou l'attitude des personnes qu'il observe et les informations qu'il peut avoir sur les évènements et tractations en cours dans un groupe où il évolue, puis en déduire les relations entre les parties impliquées.";
          break;
        case "Négocier":
          description =
            "Le Médian ne négocie pas, il « émet de bonnes pistes de réflexion ». Ce sont ses interlocuteurs qui prennent, en toute liberté, des décisions qu'il ne peut qu'approuver... Cette Spé couvre aussi bien les tractations politiques, stratégiques que commerciales, voire sentimentales... Un bon Test de Négocier peut non seulement faire avancer les choses dans son sens, mais aussi lui fournir des informations liées au sujet de la négociation.";
          break;
        case "Agréable compagnie":
          description =
            "Le Médian sait se montrer un hôte agréable et spirituel (s'il a eu l'occasion d'apprendre les usages locaux). Il est facilement invité à des dîners, des évènements, dans des clubs ou à faire du shopping. ";
          break;
          break;
        case "Thérapie verbale":
          description =
            "Le Biocyb capte l'attention et encourage son patient par ses paroles, ce qui améliore les soins effectifs en fonction de la qualité de son bagout. Cet effet s'ajoute à toutes ses formes de soins, ou à celle d'un autre soignant qu'il ne ferait qu'assister.";
          break;
        case "Grandes machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)":
          description =
            "Motivé, voire addict à la visite et si possible au test de tous les vaisseaux, véhicules et tenues assistées qu’il rencontre, le Conceptech en connaît les aménagements et les recoins, les astuces de fonctionnement, les points faibles et comment les rafistoler, les ressources insoupçonnées. Et le pilotage, plus ou moins…";
          break;
        case "Marché des pièces de récup":
          description =
            "Il existe des Conceptechs amoureux des belles machines neuves au design épuré, mais même eux savent aussi où se procurer et négocier les pièces nécessaires au rafistolage des engins invraisemblables dont leur groupe a absolument besoin.";
          break;
        case "Pistage-orientation":
          description =
            "Dans les régions sans asphalte ni chaussées pavées, le Ranger sait reconnaître et suivre une trace, même brouillée par celles d'autres créatures... Et il peut assez bien estimer où se diriger pour la retrouver si elle est interrompue dans une zone qui marque mal les empreintes. Cette Spé permet aussi de se faire progressivement une bonne idée de la topographie de la région et de s'orienter.";
          break;
        case "1er Contact (Ethnoranger)":
          description =
            "Lorsqu'il rencontre un groupe d'humains inconnus, le Ranger sait remarquer les petits détails d'attitude, d'expressions, de tenues vestimentaires qui trahissent leurs us et coutumes ou leur état d'esprit vis-à-vis de lui et de ceux qui l'accompagnent. S'il préfère observer avant de prendre contact, sa Spé lui permet d'improviser une conduite en cas de rencontre fortuite (y compris parfois se laisser capturer sans ménagement).";
          break;
        case "Premiers soins":
          description =
            "Le Ranger est capable de stabiliser ou d'atténuer les maux et blessures simples des humanoïdes et des animaux qui lui sont familiers, soit avec une trousse de secours, soit en utilisant les ressources de l'environnement s'il en trouve d'appropriées.";
          break;
        case "Chercher nourriture":
          description =
            "Le Ranger sait où aller, en milieux sauvages, pour trouver de la nourriture et de l'eau potable, et s'il a eu l'occasion de se documenter sur la région traversée, ce qui est comestible ou ne l'est pas. Ce qui inclut en général des nourritures pas forcément agréables à ingérer.";
          break;
        case "Œil de singe":
          description =
            "Le Ranger peut être surpris par une attaque, mais il sait comment réagir. En dehors du bonus au Test, lorsque le Ranger possède cette Spé en Combat Mains nues ou Armes courtes, le joueur peut utiliser sa Vivacité ou sa Force à la place de son Adresse dans son pool de dés de Combat. Il peut aussi utiliser son Sens plutôt que sa Vivacité pour Esquiver.";
          break;
        case "Combat primitif":
          description =
            "Le Ranger est un champion pour bien voir sans être vu, pour trouver et atteindre discrètement les postes d'observation les plus inaccessibles : faîtes d'arbres, anfractuosités de parois rocheuses, rochers glissants.";
          break;
        case "Créer, utiliser et détecter Point de Transit":
          description =
            "Le Mega peut en sentir la présence d'un point de Transit dix fois plus loin qu'un autre Mega. Il est plus rapide pour en activer un nouveau et en collaboration avec d'autres Megas, il peut en créer un encore plus vite. Il est également capable, après avoir réparé un Tétraèdre endommagé, de le réactiver en conservant son empreinte psychique d'origine, ce qui le rend accessible à ceux qui le connaissent ou ont accès aux Témoins créés pour le retrouver. Cette Spé s'additionne au Test requis pour créer un Point de Transit. Enfin il est capable, sans consommer de points de Résonance supplémentaires, de faire transiter deux nonMegas en même temps que lui.";
          break;
        case "Concepteur":
          description =
            "Tous les Conceptechs savent concevoir des appareillages simples en fonction des pièces disponibles. Les vrais « Concepteurs » peuvent mettre au point des machines et systèmes complexes ou ayant à supporter des contraintes sévères. Avec toutefois le matériel de base et le temps nécessaire. Ce Talent permet aussi de comprendre en partie l'usage d'un système complexe dont on découvre les plans ou les infos techniques.";
          break;
        case "Architectures, ruines, labyrinthes et souterrains":
          description =
            "Obligé de progresser dans une architecture inconnue, le Ruinier fait bien plus que ne pas s'y perdre. Avec un peu d'observation, il peut en deviner les usages d'origine, la direction d'une zone particulière, la solidité, les dangers naturels (torrent spontané, gaz pouvant causer une asphyxie ou une explosion), ou encore les animaux qui s'y abritent.";
          break;
        case "1er Contact (Patrouilleur)":
          description =
            "Lors d'une rencontre avec un groupe qui contrôle une zone urbaine ou un bâtiment oublié, le Patrouilleur sait composer une attitude et un début d'échanges verbaux qui vont lui permettre de sentir sur quels leviers et comportements il va pouvoir jouer pour trouver, au pire, un sujet de négociation pour se replier sans affrontement, au mieux un terrain d'entente voire de coopération. Par contre, seule sa Culture du milieu concerné peut, s'il a u l'occasion de la découvrir, lui suggérer d'anticiper en évitant tout contact avec des groupes irrémédiablement hostiles.";
          break;
        case "Combat en bâtiment":
          description =
            "Cette Spé sert aussi bien pendant le combat, quelle que soit la technique de combat utilisée, que pour concevoir des stratégies et tactiques d'approche, d'embuscade ou d'évitement de groupes hostiles, et imaginer les leurs.";
          break;
        case "Tailleur de pierre":
          description =
            "Le Ruiner sait exploiter au mieux les ressources locales pour tailler des éléments d'architecture (ou bétonner) et réparer un bâtiment ou un tunnel. Certains y ajoutent un goût pour la sculpture décorative.";
          break;
        case "Influence":
          description =
            "À condition d'avoir accès aux bonnes personnes, le Sensit essaime des idées à l'oreille de dizaines d'individus, puis attend que ceux-ci agissent et que leurs actions combinées donnent le résultat souhaité. Il peut en tirer de la notoriété, être oublié de tous les protagonistes ou donner corps à des personnages ou des évènements fictifs.";
          break;
        case "Chef-d'oeuvre":
          description =
            "Dans un domaine particulier (à préciser), et à condition d'avoir eu le temps de bien connaître la culture locale, le Sensit est capable de créations remarquées (originales ou académiques) et d'être introduit dans les milieux des artistes ou des grands artisans, et de leurs amis, clients ou mécènes.";
          break;
        case "Réseau":
          description =
            "Le Sensit tisse naturellement des liens avec les gens qu'il rencontre, et se constitue rapidement un réseau de personnes sur qui il peut compter, ou qui penseront spontanément à lui donner des informations ou s'inquiéter de son sort.";
          break;
        case "Confident":
          description =
            "Le Sensit sait aussi ne rien dire, ou très peu, et devenir le confident d'une personne. D'autant plus facilement que celle-ci a besoin de se confier, et que le Sensit a réussi à cerner sa « vraie nature ». Le but, rasséréner cette personne ou l'espionner, est à la discrétion du Sensit.";
          break;
        case "Stop combat : Assommer, Immobiliser ou Tenir à distance":
          description =
            "Cette Spé cumule trois effets de combat ayant pour but de limiter les dégâts : A Assommer : si l'Escorteur réussit son Attaque, même au minimum, en utilisant cette Spé avec une Attaque à Mains nues ou une matraque (Armes courtes), l'adversaire est assommé (selon vraisemblance de la scène, soit directement soit en chutant ou se cognant). A Immobiliser si l'Escorteur réussit son Attaque en utilisant cette Spé avec Mains nues, l'adversaire est immobilisé. A Tenir à distance : si l'Escorteur réussit son Attaque, il peut ne pas faire de dégâts, mais juste tenir un adversaire à distance. Cet adversaire ne pourra pas l'Attaquer lors de sa prochaine action.";
          break;
        case "Tactiques d'urgence":
          description =
            "Permet de repérer, si elle existe, la meilleure voie de fuite et d'y guider un groupe sans autre Test La réussite donne un bonus ou un Avantage au groupe contre d'éventuels poursuivants.";
          break;
        case "Voies dangereuses":
          description =
            "Permet de détecter avant de (trop) s'y engager les lieux mal famés ou sous contrôle, propices aux embuscades, d'éviter les impasses.";
          break;
        case "Bandes, pègre et fanatiques":
          description =
            "Permet autant de se renseigner et d'éviter (avec Milieux) que d'infiltrer (avec Interpréter ou Paraître) les groupes cités.";
          break;
        case "Extraire-exfiltrer":
          description =
            "En utilisant cette Spé dans une Attaque contre un adversaire qui a déjà engagé un allié, et sur un Test réussi, l'Escorteur peut à la fois appliquer les effets de son attaque ET éloigner l'allié hors de portée, comme si celui-ci avait réussi un jet d'Esquive. L'Escorteur peut bénéficier de cette Spé en l'ajoutant à son Test s'il veut Esquiver.";
          break;
        case "Mondanités et activités ludiques":
          description =
            "L'Escorteur ne trouve pas ses informations dans un catalogue des lieux malfamés. Il profite de toutes les occasions pour lier conversation et connaissance dans les milieux qu'il doit observer. Il est donc entraîné à jouer de son charme, sa classe, son mystère (réels ou joués) ou au contraire de son manque pathétique des qualités précitées (réel ou joué). Cette Spé inclut un bon entraînement à l'ingestion (réelle ou jouée) de substances fortes et hallucinogènes, à la danse, au golf, aux jeux de cartes ou de casino (ou équivalents locaux de ces disciplines si l'Escorteur a eu l'occasion de les apprendre au moins un peu).";
          break;
        default:
          description = "Pas de description";
          break;
      }
      switch (spes[0]) {
        case "spe1":
          this.actor.update({ "system.spe1.description": description });
          break;
        case "spe2":
          this.actor.update({ "system.spe2.description": description });
          break;
        case "spe3":
          this.actor.update({ "system.spe3.description": description });
          break;
        case "spe4":
          this.actor.update({ "system.spe4.description": description });
          break;
        case "spe5":
          this.actor.update({ "system.spe5.description": description });
          break;
        case "spe6":
          this.actor.update({ "system.spe6.description": description });
          break;
      }

      // Afficher la description dans une boîte de dialogue
      new Dialog(
        {
          title: speLabel,
          content: `<div class="defn-popup"><div class="defn-vert-label">Définition</div><div class="defn-body"><p>${description}</p></div></div>`,
          buttons: {},
        },
        {
          width: 440,
          classes: ["dialog", "talent-info-dialog"],
        },
      ).render(true);
    });

    // Clic droit sur le libellé d'un trait : afficher la description dans une boîte de dialogue
    html.find(".tpc-name.traits_rollable").on("contextmenu", (ev) => {
      ev.preventDefault();
      const span = ev.currentTarget;
      const comp = span.getAttribute("value");
      const label =
        this.actor.system.caracs[comp]?.label || $(span).text().trim();
      const description = this.actor.system.caracs[comp]?.description || "";
      if (!description) return;

      new Dialog(
        {
          title: label,
          content: `<div class="defn-popup"><div class="defn-vert-label">Définition</div><div class="defn-body"><p>${description}</p></div></div>`,
          buttons: {},
        },
        {
          width: 440,
          classes: ["dialog", "talent-info-dialog"],
        },
      ).render(true);
    });

    // Clic droit sur un talent : afficher la description dans une boîte de dialogue
    html.find(".talents_rollable").on("contextmenu", (ev) => {
      ev.preventDefault();
      const span = ev.currentTarget;
      const label = $(span).text().trim();
      const description = $(span).siblings(".tooltiptext").text().trim();
      if (!description) return;

      new Dialog(
        {
          title: label,
          content: `<div class="defn-popup"><div class="defn-vert-label">Définition</div><div class="defn-body"><p>${description}</p></div></div>`,
          buttons: {},
        },
        {
          width: 440,
          classes: ["dialog", "talent-info-dialog"],
        },
      ).render(true);
    });

    // Clic sur une arme (hors bagarre et charge)
    html.find(".clic_technique_combat").click((ev) => {
      if (!this.token) {
        // eslint-disable-next-line no-undef
        ui.notifications.error(
          "Veuillez utiliser la fiche de personnage du token !",
        );
        return;
      }
      // Vérification que les domaines sont renseignés (valeur minimale de 4)
      const _domaines_tc = this.actor.system.domaines;
      const _domainesNonRenseignesTc = Object.values(_domaines_tc).filter(
        (d) => (d.value ?? 0) < 4,
      );
      if (_domainesNonRenseignesTc.length > 0) {
        const _nomsTc = _domainesNonRenseignesTc.map((d) => d.label).join(", ");
        ui.notifications.warn(
          `Veuillez renseigner les talents avant de lancer un jet. Domaine(s) insuffisant(s) : ${_nomsTc}`,
        );
        return;
      }
      if (Array.from(game.user.targets).length === 0) {
        ui.notifications.warn("Vous vous apprêtez à attaquer sans cible");
      }
      let bonus = "";
      var btns = {};
      let comp = ev.currentTarget.getAttribute("value");
      let label = ev.currentTarget.getAttribute("label");
      let mod = this.actor.system.talents_combat[comp].score;
      let objet = this.actor.system.talents_combat[comp].label;
      let arme = this.actor.items.filter((i) => i.name === objet);

      if (!arme || arme.length === 0) {
        ui.notifications.error(`Arme '${objet}' non trouvée sur le personnage`);
        return;
      }

      let effet_arme = arme[0].system.effet_arme?.value?.split("|")[0] || "";
      let letale = arme[0].system.letale?.value || false;
      let noLetaleMsg = arme[0].system.letale?.label || "";
      let type_objet = arme[0].type;
      let ardence = "";
      let btns_ar = {};
      let ardence_combat = 0;
      let ptardence = "";
      let effet_coup1 = "";
      let effet_coup2 = "";
      let effet_coup3 = "";
      let diff = "";
      let diff2 = 0;
      let Nom_acteur = this.token?.name || this.actor.name;
      let ptArdence = this.actor.system.pts_ardence.value;
      let def_temp = 0;
      let currentTarget = null;

      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 450,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 960,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1060,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 700,
        classes: ["dialog", "talent-info-dialog"],
      };
      var el = document.querySelector(".letters-left2");
      if (
        arme[0] &&
        (arme[0].img || arme[0].system?.img || arme[0].system?.image)
      ) {
        const imgSrc =
          arme[0].img || arme[0].system.img || arme[0].system.image;
        el.innerHTML = `<img src="${imgSrc}" style="border:0;max-width:220px;max-height:220px;vertical-align:middle;">`;
      } else {
        el.textContent = label;
      }

      const spesAssociees = speAssocie(comp);
      let link = 0;
      let speCombat = 0;
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      if (this.actor.system.spe1.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe1.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
          };
        }
      }
      if (this.actor.system.spe2.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe2.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe2.value);
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
          };
        }
      }
      if (this.actor.system.spe3.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe3.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe3.value);
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
          };
        }
      }
      if (this.actor.system.spe4.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe4.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe4.value);
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
          };
        }
      }
      if (this.actor.system.spe5.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe5.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe5.value);
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
          };
        }
      }
      if (this.actor.system.spe6.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe6.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe6.value);
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
          };
        }
      }

      let _skipSpe = Object.keys(btns).length <= 1;
      if (type_objet === "Arme de tir" && arme[0].system.charge === 0) {
        ui.notifications.error("L'arme n'a pas de charge");
      } else if (
        type_objet === "Arme de lancer" &&
        arme[0].system.quantity === 0
      ) {
        ui.notifications.error("L'arme est épuisée");
      }
      // if (Array.from(game.user.targets).length !== 0)
      else {
        //Vérification qu'une cible est bien sélectionnée
        animationJetCombat();
        if (Array.from(game.user.targets).length !== 0) {
          currentTarget = Array.from(game.user.targets)[0].actor;
        }

        /******************************* Dialogue Nombre de points d'Ardence *********************/

        for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
          btns_ar[i] = { label: i, callback: () => (ptardence = i) };
        }

        if (this.actor.system.talents_combat[comp].bonus !== "adr") {
          /******************************* Combat Armes de tir ou lancer *********************/
          /******************************* Construction de la fenêtre de dialogue Ardence pour un combat de tir ou lancer ************************************/
          let dialog_ardence_choix = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#e76f51;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des <b>points d'ardence</b> ?</span></div>",
              buttons: {
                oui: {
                  label: `<i class="fas fa-times"></i> NON`,
                  callback: () => (ardence = 0),
                },
                non: {
                  label: `<i class="fas fa-fire" style="color:#e76f51"></i> OUI`,
                  callback: () => (ardence = 1),
                },
              },
              default: "oui",
              close: function () {
                if (ardence !== "") {
                  if (ardence === 1) {
                    let dialog_ardence = new Dialog(
                      {
                        title: label.toUpperCase(),
                        content:
                          "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
                          "<div style='padding:12px 8px;text-align:center'><span style='font-size:1.8em;font-weight:bold;color:#e76f51'>" +
                          ptArdence +
                          "</span> <span style='opacity:0.7'>pts disponibles</span><br><br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
                        buttons: btns_ar,
                        //close: () => d.render(true)
                        close: function () {
                          if (ptardence !== "") {
                            ardence_combat = ptardence * 2;
                            if (_skipSpe) {
                              bonus = 0;
                              dialog_BONUS.render(true);
                            } else {
                              d2.render(true);
                            }
                          }
                        },
                      },
                      myDialogOptions,
                    );
                    dialog_ardence.render(true);
                  } else {
                    if (_skipSpe) {
                      bonus = 0;
                      dialog_BONUS.render(true);
                    } else {
                      d2.render(true);
                    }
                  }
                }
              },
            },
            myDialogOptions_ardence,
          );

          /******************************* Construction de la fenêtre de dialogue DIFF pour un combat de tir ou lancer ************************************/

          function generateDiffButtons(min, max) {
            let buttons = {};
            for (let i = min; i <= max; i++) {
              buttons[`b${i}`] = {
                label: i.toString(),
                callback: () => (diff = i),
              };
            }
            return buttons;
          }
          let buttons = generateDiffButtons(4, 27);

          // Initialiser le Dialog avec les boutons générés
          let dialog_DIFF = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la <b>DIFF</b>.</span></div>",
              buttons: buttons,
              default: "10",
              close: () => {
                if (diff !== "") {
                  this.testTir(
                    Nom_acteur,
                    comp,
                    diff,
                    ptardence,
                    bonuspool,
                    bonus,
                  );
                }
              },
            },
            myDialogOptions_diff,
          );

          let d2 = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-link'></i> SPÉ ASSOCIÉE</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>",
              buttons: btns,
              default: "non",
              // close: () => d3.render(true)
              close: function () {
                if (bonus !== "") {
                  dialog_BONUS.render(true);
                }
                if (bonus === "") {
                }
              },
            },
            myDialogOptions_spes,
          );

          /******************************* Construction de la fenêtre de dialogue BONUS pour un combat de tir ou lancer ************************************/
          let bonuspool = "";

          // Fonction pour générer les boutons dynamiquement
          function generateBonusButtons(min, max) {
            let buttons = {};
            let label = "";
            for (let i = min; i <= max; i++) {
              if (i > 0) {
                label = `<span style="color:#4caf50;font-weight:bold">+${i}</span>`;
              } else if (i < 0) {
                label = `<span style="color:#f44336;font-weight:bold">${i}</span>`;
              } else {
                label = `<b>0</b>`;
              }
              buttons[`b${i}`] = {
                label: label,
                callback: () => (bonuspool = i),
              };
            }
            return buttons;
          }

          let bonusButtons = generateBonusButtons(-6, 6);

          // Initialiser le Dialog avec les boutons générés
          let dialog_BONUS = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-plus-minus'></i> BONUS / MALUS</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Sélectionnez le <b>Bonus/Malus</b> à ajouter au pool</span></div>",
              buttons: bonusButtons,
              default: "b0",
              close: () => {
                if (bonuspool !== "") {
                  dialog_DIFF.render(true);
                }
              },
            },
            myDialogOptions_bonus,
          );

          if (this.actor.system.pts_ardence.value > 0) {
            setTimeout(function () {
              dialog_ardence_choix.render(true);
            }, 2000);
          } // Si le joeur a des points d'ardence, on lance la fenêtre ardence sinon on envoie direct la DIFF
          else {
            setTimeout(function () {
              if (_skipSpe) {
                bonus = 0;
                dialog_BONUS.render(true);
              } else {
                d2.render(true);
              }
            }, 2000);
          }
        } else {
          /******************************* Combat armes courtes, armes longues *********************/

          /******************************* Construction de la fenêtre de dialogue Ardence pour un combat de tir ou lancer ************************************/
          let dialog_ardence_choix = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#e76f51;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des <b>points d'ardence</b> ?</span></div>",
              buttons: {
                oui: {
                  label: `<i class="fas fa-times"></i> NON`,

                  callback: () => (ardence = 0),
                },
                non: {
                  label: `<i class="fas fa-fire" style="color:#e76f51"></i> OUI`,
                  callback: () => (ardence = 1),
                },
              },
              default: "oui",
              close: function () {
                if (ardence !== "") {
                  if (ardence === 1) {
                    let dialog_ardence = new Dialog(
                      {
                        title: label.toUpperCase(),
                        content:
                          "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
                          "<div style='padding:12px 8px;text-align:center'><span style='font-size:1.8em;font-weight:bold;color:#e76f51'>" +
                          ptArdence +
                          "</span> <span style='opacity:0.7'>pts disponibles</span><br><br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
                        buttons: btns_ar,
                        //close: () => d.render(true)
                        close: function () {
                          if (ptardence !== "") {
                            ardence_combat = ptardence * 2;
                            if (_skipSpe) {
                              bonus = 0;
                              dialog_BONUS.render(true);
                            } else {
                              d2.render(true);
                            }
                          }
                        },
                      },
                      myDialogOptions,
                    );
                    dialog_ardence.render(true);
                  } else {
                    if (_skipSpe) {
                      bonus = 0;
                      dialog_BONUS.render(true);
                    } else {
                      d2.render(true);
                    }
                  }
                }
              },
            },
            myDialogOptions_ardence,
          );

          /******************************* Dialogue DIFF *********************/
          function generateDiffButtons(min, max) {
            let buttons = {};
            if (Array.from(game.user.targets).length !== 0) {
              buttons = {
                auto: {
                  label: "DEF",
                  callback: () => (diff = diff2),
                },
              };
            }

            for (let i = min; i <= max; i++) {
              buttons[`b${i}`] = {
                label: `${i}`,
                callback: () => (diff = i),
              };
            }

            return buttons;
          }
          let dialog_DIFF = "";
          let msg = "";
          if (Array.from(game.user.targets).length !== 0) {
            msg =
              'Sélectionnez la DIFF ou "DEF" pour que la DIFF soit égale à la DEF de la cible.';
          } else {
            msg = "Sélectionnez la DIFF.";
          }

          dialog_DIFF = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULT\u00c9</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>" +
                msg +
                "</span></div>",
              buttons: generateDiffButtons(4, 27),
              close: () => {
                if (diff !== "") {
                  //Test pour savoir si on a fermé avec la croix ou non (bonuspool=="" => on a fermé la fenêtre => on ne fait rien)
                  if (ardence_combat !== 0 && retraitAuto) {
                    this.actor
                      .update({
                        "system.combat_modif.value":
                          ardence_combat + this.actor.system.combat_modif.value,
                      })
                      .then(() => {
                        this.actor
                          .update({
                            "system.def_modif.value":
                              ardence_combat / 2 +
                              this.actor.system.def_modif.value,
                          })
                          .then(() => {
                            this.actor.update({
                              "system.pts_ardence.value":
                                this.actor.system.pts_ardence.value - ptardence,
                            });
                          });
                      });
                  }

                  let combat =
                    this.actor.system.combat_modif.value +
                    this.actor.system.domaines.combat.value;
                  if (ardence_combat !== "") {
                    combat += ardence_combat;
                  }

                  function createRollFormula(
                    mod,
                    combat,
                    caracValue,
                    bonuspool,
                  ) {
                    let formula = `1d${combat} + 1d${caracValue}`;
                    if (mod !== 0) {
                      formula = `1d${mod} + ` + formula;
                    }
                    if (bonuspool !== 0) {
                      formula += ` + ${bonuspool}`;
                    }
                    return formula;
                  }

                  const caracValue =
                    this.actor.system.talents_combat[comp].bonus === "adr"
                      ? this.actor.system.caracs.adresse.value
                      : this.actor.system.caracs.sens.value;

                  mod = mod + bonus;
                  const rollFormula = createRollFormula(
                    mod,
                    combat,
                    caracValue,
                    bonuspool,
                  )
                    .replace(/1d0\s*\+\s*/g, "")
                    .replace(/\s*\+\s*1d0\b/g, "")
                    .trim();
                  const r = new Roll(rollFormula);

                  let type_jet = this.actor.system.talents_combat[comp].label;
                  r.evaluate().then(() => {
                    let resultat = r.total;
                    let result_final = 0;
                    let result_diff = "";
                    let marge;
                    let melee_perdue = 0;
                    let vie_perdue = 0;
                    let mention = "";
                    let assomme = "";
                    let son_arme = "";
                    if (diff !== 0) {
                      def_temp = diff;
                    } else {
                      def_temp =
                        currentTarget.system.def.value +
                        currentTarget.system.def_modif.value;
                    }

                    /****************************** Effets spéciaux Armes courtes, longues************************************/

                    const effectsState = checkEffectsState();
                    if (!effectsState.shouldContinue) return;

                    const wait = (delay) =>
                      new Promise((resolve) => setTimeout(resolve, delay));

                    let selectedToken = canvas.tokens.controlled[0];
                    let targets = Array.from(game.user.targets);
                    const effets_speciaux = effectsState.shouldPlayEffects;
                    let offX = Number(arme[0].system.effet_offX.value);
                    let offY = Number(arme[0].system.effet_offY.value);
                    /**********  Animation avec Sequence  ****************************/
                    if (Array.from(game.user.targets).length !== 0) {
                      let target = Array.from(game.user.targets)[0];
                      if (
                        game.modules.get("sequencer")?.active &&
                        effets_speciaux
                      ) {
                        const tokenCenter = canvas.tokens.controlled[0].center;
                        new Sequence()
                          .effect()
                          .file(effet_arme)
                          .atLocation({
                            x: tokenCenter.x + offX,
                            y: tokenCenter.y + offY,
                          })
                          .stretchTo(target)
                          .repeats(2, 200, 300)
                          .play();
                        if (
                          arme[0].system.sound.value &&
                          arme[0].system.sound.value.trim() !== ""
                        ) {
                          new Sequence()
                            .sound()
                            .file(arme[0].system.sound.value)
                            .fadeInAudio(500)
                            .fadeOutAudio(500)
                            .play();
                        }
                      }
                    }

                    /**********************************************************************************************************/
                    function getResultMessage(result_final, def_temp, marge) {
                      const success = result_final >= 0;
                      const marginValue = success
                        ? Math.floor(result_final / 3)
                        : Math.ceil(result_final / 3);
                      return (
                        `<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ${def_temp}</div>` +
                        (success
                          ? `<div class="mega-roll-success"><i class="fas fa-check-circle"></i> R\u00e9ussite <span class="mega-roll-margin">Marge : ${marginValue}</span></div>`
                          : `<div class="mega-roll-failure"><i class="fas fa-times-circle"></i> \u00c9chec <span class="mega-roll-margin">Marge : ${marginValue}</span></div>`)
                      );
                    }

                    function getCombatValues(actor, comp, marge) {
                      const talents = actor.system.talents_combat[comp];
                      const values = {
                        melee_perdue: talents[`av${Math.min(marge, 4)}`],
                        effet_coup1:
                          talents[`effet_ac_${Math.min(marge, 4)}_1`],
                        effet_coup2:
                          talents[`effet_ac_${Math.min(marge, 4)}_2`],
                        effet_coup3:
                          talents[`effet_ac_${Math.min(marge, 4)}_3`],
                      };
                      return values;
                    }

                    result_final = resultat - def_temp;
                    marge =
                      result_final >= 0
                        ? Math.floor(result_final / 3)
                        : Math.ceil(result_final / 3);
                    result_diff = getResultMessage(
                      result_final,
                      def_temp,
                      marge,
                    );

                    if (marge >= 0 && result_final >= 0) {
                      const {
                        melee_perdue,
                        effet_coup1,
                        effet_coup2,
                        effet_coup3,
                      } = getCombatValues(this.actor, comp, marge);
                    }

                    function getEffetCoupHtml(effet) {
                      const effets = {
                        H: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>',
                        A: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>',
                        S: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>',
                        R: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>',
                        I: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>',
                        P: '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>',
                        T: '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>',
                        D: '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>',
                      };
                      return effets[effet] || "";
                    }

                    effet_coup1 = getEffetCoupHtml(effet_coup1);
                    effet_coup2 = getEffetCoupHtml(effet_coup2);
                    effet_coup3 = getEffetCoupHtml(effet_coup3);

                    if (letale) {
                      melee_perdue = calcMeleePerdue(marge, comp, this.actor);
                      if (
                        marge == 0 &&
                        result_final >= 0 &&
                        Array.from(game.user.targets).length !== 0
                      ) {
                        const _dmc1 = calcViePerdue(
                          melee_perdue,
                          comp,
                          this.actor,
                        );
                        vie_perdue = _dmc1.vie_perdue;
                        result_diff +=
                          '<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ' +
                          game.user.targets.values().next().value.name +
                          " perd <strong>" +
                          melee_perdue +
                          "</strong>pt de Mêlée</div>";
                        result_diff +=
                          '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
                          game.user.targets.values().next().value.name +
                          " perd <strong>" +
                          vie_perdue +
                          "</strong>pt de Vie</div>";
                        if (retraitAuto) {
                          const updatePromise = safeDocumentUpdate(
                            currentTarget,
                            {
                              "system.health.value":
                                currentTarget.system.health.value - vie_perdue,
                              "system.melee_impair": _dmc1.new_melee_impair,
                            },
                          );
                          if (updatePromise) {
                            updatePromise.then(() => {
                              safeDocumentUpdate(currentTarget, {
                                "system.power.value":
                                  currentTarget.system.power.value -
                                  melee_perdue,
                              });
                            });
                          }
                        }
                      }

                      /*************Boutons de consommation des Avantages **********************/
                      if (Array.from(game.user.targets).length !== 0) {
                        let melee_perdue_1av = 0;
                        let melee_perdue_2av = 0;
                        let melee_perdue_3av = 0;
                        let effet_0av_1,
                          effet_0av_2,
                          effet_0av_3,
                          effet_1av_1,
                          effet_1av_2,
                          effet_1av_3,
                          effet_2av_1,
                          effet_2av_2,
                          effet_2av_3,
                          effet_3av_1,
                          effet_3av_2,
                          effet_3av_3 = "";
                        if (marge == 1) {
                          melee_perdue_1av = calcMeleePerdue(
                            marge - 1,
                            comp,
                            this.actor,
                          );
                          effet_0av_1 = calc_coup1(marge, comp, this.actor);
                          effet_0av_2 = calc_coup2(marge, comp, this.actor);
                          effet_0av_3 = calc_coup3(marge, comp, this.actor);
                          effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
                          effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
                          effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
                          result_diff =
                            result_diff +
                            "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_0av_1 +
                            "' data-effet_0av_2='" +
                            effet_0av_2 +
                            "' data-effet_0av_3='" +
                            effet_0av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue +
                            "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
                            melee_perdue +
                            " pt Mêlée " +
                            effet_0av_1 +
                            " " +
                            effet_0av_2 +
                            " " +
                            effet_0av_3 +
                            "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_1av_1 +
                            "' data-effet_0av_2='" +
                            effet_1av_2 +
                            "' data-effet_0av_3='" +
                            effet_1av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue_1av +
                            "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
                            melee_perdue_1av +
                            " pt Mêlée " +
                            effet_1av_1 +
                            " " +
                            effet_1av_2 +
                            " " +
                            effet_1av_3 +
                            "</button>";
                        }
                        if (marge == 2) {
                          melee_perdue_1av = calcMeleePerdue(
                            marge - 1,
                            comp,
                            this.actor,
                          );
                          melee_perdue_2av = calcMeleePerdue(
                            marge - 2,
                            comp,
                            this.actor,
                          );
                          effet_0av_1 = calc_coup1(marge, comp, this.actor);
                          effet_0av_2 = calc_coup2(marge, comp, this.actor);
                          effet_0av_3 = calc_coup3(marge, comp, this.actor);
                          effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
                          effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
                          effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
                          effet_2av_1 = calc_coup1(marge - 2, comp, this.actor);
                          effet_2av_2 = calc_coup2(marge - 2, comp, this.actor);
                          effet_2av_3 = calc_coup3(marge - 2, comp, this.actor);
                          result_diff =
                            result_diff +
                            "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_0av_1 +
                            "' data-effet_0av_2='" +
                            effet_0av_2 +
                            "' data-effet_0av_3='" +
                            effet_0av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue +
                            "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
                            melee_perdue +
                            " pt Mêlée " +
                            effet_0av_1 +
                            " " +
                            effet_0av_2 +
                            " " +
                            effet_0av_3 +
                            "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_1av_1 +
                            "' data-effet_0av_2='" +
                            effet_1av_2 +
                            "' data-effet_0av_3='" +
                            effet_1av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue_1av +
                            "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
                            melee_perdue_1av +
                            " pt Mêlée " +
                            effet_1av_1 +
                            " " +
                            effet_1av_2 +
                            " " +
                            effet_1av_3 +
                            "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_2av_1 +
                            "' data-effet_0av_2='" +
                            effet_2av_2 +
                            "' data-effet_0av_3='" +
                            effet_2av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue_2av +
                            "><i class='fas fa-coins'></i> <b>2Av</b><br>-" +
                            melee_perdue_2av +
                            " pt Mêlée " +
                            effet_2av_1 +
                            " " +
                            effet_2av_2 +
                            " " +
                            effet_2av_3 +
                            "</button>";
                        }
                        if (marge >= 3) {
                          melee_perdue_1av = calcMeleePerdue(
                            marge - 1,
                            comp,
                            this.actor,
                          );
                          melee_perdue_2av = calcMeleePerdue(
                            marge - 2,
                            comp,
                            this.actor,
                          );
                          melee_perdue_3av = calcMeleePerdue(
                            marge - 3,
                            comp,
                            this.actor,
                          );
                          effet_0av_1 = calc_coup1(marge, comp, this.actor);
                          effet_0av_2 = calc_coup2(marge, comp, this.actor);
                          effet_0av_3 = calc_coup3(marge, comp, this.actor);
                          effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
                          effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
                          effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
                          effet_2av_1 = calc_coup1(marge - 2, comp, this.actor);
                          effet_2av_2 = calc_coup2(marge - 2, comp, this.actor);
                          effet_2av_3 = calc_coup3(marge - 2, comp, this.actor);
                          effet_3av_1 = calc_coup1(marge - 3, comp, this.actor);
                          effet_3av_2 = calc_coup2(marge - 3, comp, this.actor);
                          effet_3av_3 = calc_coup3(marge - 3, comp, this.actor);
                          result_diff =
                            result_diff +
                            "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_0av_1 +
                            "' data-effet_0av_2='" +
                            effet_0av_2 +
                            "' data-effet_0av_1='" +
                            effet_0av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue +
                            "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
                            melee_perdue +
                            " pt Mêlée " +
                            effet_0av_1 +
                            " " +
                            effet_0av_2 +
                            " " +
                            effet_0av_3 +
                            "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_1av_1 +
                            "' data-effet_0av_2='" +
                            effet_1av_2 +
                            "' data-effet_0av_3='" +
                            effet_1av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue_1av +
                            "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
                            melee_perdue_1av +
                            " pt Mêlée " +
                            effet_1av_1 +
                            " " +
                            effet_1av_2 +
                            " " +
                            effet_1av_3 +
                            "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_2av_1 +
                            "' data-effet_0av_2='" +
                            effet_2av_2 +
                            "' data-effet_0av_3='" +
                            effet_2av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue_2av +
                            "><i class='fas fa-coins'></i> <b>2Av</b><br>-" +
                            melee_perdue_2av +
                            " pt Mêlée " +
                            effet_2av_1 +
                            " " +
                            effet_2av_2 +
                            " " +
                            effet_2av_3 +
                            "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                            type_jet +
                            "' data-effet_0av_1='" +
                            effet_3av_1 +
                            "' data-effet_0av_2='" +
                            effet_3av_2 +
                            "' data-effet_0av_3='" +
                            effet_3av_3 +
                            "' data-marge=" +
                            marge +
                            " data-comp=" +
                            comp +
                            " data-melee=" +
                            melee_perdue_3av +
                            "><i class='fas fa-coins'></i> <b>3Av</b><br>-" +
                            melee_perdue_3av +
                            " pt Mêlée " +
                            effet_3av_1 +
                            " " +
                            effet_3av_2 +
                            " " +
                            effet_3av_3 +
                            "</button>";
                        }
                      }

                      /*************Affichage du chat ************************/
                      let nomCible = "";
                      let affichage = result_diff;
                      if (Array.from(game.user.targets).length !== 0) {
                        nomCible = game.user.targets.values().next().value.name;
                        affichage = result_diff + mention + assomme;
                      }
                      r.toMessage({
                        flavor:
                          "<div class='card-header'><span>" +
                          type_jet +
                          "</span></div><br>" +
                          '<div class="mega-roll-attacker"><i class="fas fa-crosshairs"></i> ' +
                          Nom_acteur +
                          " attaque " +
                          nomCible +
                          "</div>" +
                          affichage,
                        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                      });
                      /****************************************************/
                    } else {
                      if (result_final >= 0) {
                        r.toMessage({
                          flavor:
                            "<div class='card-header'><span>" +
                            type_jet +
                            "</span></div><br>" +
                            '<div class="mega-roll-attacker"><i class="fas fa-crosshairs"></i> ' +
                            Nom_acteur +
                            " attaque " +
                            game.user.targets.values().next().value.name +
                            "</div>" +
                            result_diff +
                            '<div class="result_diff">' +
                            noLetaleMsg +
                            "</div>",
                          speaker: ChatMessage.getSpeaker({
                            actor: this.actor,
                          }),
                        });
                      } else {
                        r.toMessage({
                          flavor:
                            "<div class='card-header'><span>" +
                            type_jet +
                            "</span></div>" +
                            result_diff,
                          speaker: ChatMessage.getSpeaker({
                            actor: this.actor,
                          }),
                        });
                      }
                    }
                  });
                }
              },
            },
            myDialogOptions_diff,
          );

          let d2 = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-link'></i> SPÉ ASSOCIÉE</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>",
              buttons: btns,
              default: "non",
              // close: () => d3.render(true)
              close: function () {
                if (bonus !== "") {
                  dialog_BONUS.render(true);
                }
                if (bonus === "") {
                }
              },
            },
            myDialogOptions_spes,
          );

          /******************************* Dialogue Bonus *********************/
          let bonuspool = "";

          // Fonction pour générer les boutons dynamiquement
          function generateBonusButtons(start, end) {
            let buttons = {};
            let label = "";
            for (let i = start; i <= end; i++) {
              if (i > 0) {
                label = `<span style="color:#4caf50;font-weight:bold">+${i}</span>`;
              } else if (i < 0) {
                label = `<span style="color:#f44336;font-weight:bold">${i}</span>`;
              } else {
                label = `<b>0</b>`;
              }
              buttons[`b${i}`] = {
                label: label,
                callback: () => (bonuspool = i),
              };
            }
            return buttons;
          }

          let bonusButtons = generateBonusButtons(-6, 6);

          let dialog_BONUS = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><i class='fas fa-plus-minus'></i> BONUS / MALUS</span></div>" +
                "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Sélectionnez le <b>Bonus/Malus</b> à ajouter au pool</span></div>",
              buttons: bonusButtons,
              default: "b0",
              close: () => {
                if (bonuspool !== "") dialog_DIFF.render(true);
              },
            },
            myDialogOptions_bonus,
          );
          if (this.actor.system.pts_ardence.value > 0) {
            setTimeout(function () {
              dialog_ardence_choix.render(true);
            }, 2000);
          } //Si le joueur a de l'ardence
          else {
            setTimeout(function () {
              if (_skipSpe) {
                bonus = 0;
                dialog_BONUS.render(true);
              } else {
                d2.render(true);
              }
            }, 2000);
          } //Sinon on lance la fenêtre de DIFF directement
        }
      }
    });

    /******************************* Combats sans arme (mains nues, charge, attaques spéciales) *********************/
    html.find(".clic_mainsnues").click((ev) => {
      if (!this.token) {
        ui.notifications.error(
          "Veuillez utiliser la fiche de personnage du token !",
        );
        return;
      }
      let diff = null;
      let comp = ev.currentTarget.getAttribute("value");
      let ardence = "";
      let bonus = "";
      let ardence_combat = "";
      var btns = {};
      let btns_ar = {};
      let ptardence = "";
      let bonuspool = "";
      let diff2 = "";
      let ptArdence = this.actor.system.pts_ardence.value;
      let objet = this.actor.system.talents_combat[comp].label;
      let arme = this.actor.items.filter((i) => i.name === objet);
      let currentTarget = null;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 450,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 980,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 960,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1060,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 700,
        classes: ["dialog", "talent-info-dialog"],
      };

      // Sélectionne l'élément HTML où afficher l'image ou le label de l'arme
      var el = document.querySelector(".letters-left2");
      // Récupère le label de l'arme ou de la technique cliquée
      let label = ev.currentTarget.getAttribute("label");
      // Initialise la variable qui contiendra le chemin de l'image à afficher
      let imgSrc = "";
      // Vérifie si une arme existe et possède une image (directement ou dans son système)
      if (
        arme[0] &&
        (arme[0].img || arme[0].system?.img || arme[0].system?.image)
      ) {
        // Si oui, récupère le chemin de l'image de l'arme
        imgSrc = arme[0].img || arme[0].system.img || arme[0].system.image;
      } else if (label == "Bagarre") {
        // Si c'est une attaque "Bagarre", utilise une image par défaut (poings)
        imgSrc = "systems/mega/images/poings.png";
      } else if (label == "Charge") {
        // Si c'est une attaque "Charge", utilise une image par défaut (charge)
        imgSrc = "systems/mega/images/charge.png";
      }
      // Affiche l'image dans l'élément HTML ciblé, avec une taille maximale de 220x220px
      el.innerHTML = `<img src="${imgSrc}" style="border:0;max-width:220px;max-height:220px;vertical-align:middle;">`;

      const _fireIconMN = `<i class="fas fa-fire" style="color:#e76f51"></i>`;
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: `${_fireIconMN.repeat(i)} ${i}`,
          callback: () => (ptardence = i),
        };
      }

      const spesAssociees = speAssocie(comp);
      let link = 0;
      let speCombat = 0;
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      if (this.actor.system.spe1.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe1.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe1.value);
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
          };
        }
      }
      if (this.actor.system.spe2.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe2.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe2.value);
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
          };
        }
      }
      if (this.actor.system.spe3.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe3.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe3.value);
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
          };
        }
      }
      if (this.actor.system.spe4.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe4.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe4.value);
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
          };
        }
      }
      if (this.actor.system.spe5.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe5.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe5.value);
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
          };
        }
      }
      if (this.actor.system.spe6.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe6.value) {
            link = 1;
            speCombat++;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe6.value);
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
          };
        }
      }

      let _skipSpe = Object.keys(btns).length <= 1;

      if (Array.from(game.user.targets).length != 0) {
        currentTarget = Array.from(game.user.targets)[0].actor;
        diff2 = 0;
      }
      if (game.user.targets.size == 0) {
        ui.notifications.error("Vous devez selectionner au moins une cible");
        return;
      }

      let d2 = new Dialog(
        {
          title: label.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-link'></i> SP\u00c9 ASSOCI\u00c9E</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SP\u00c9</b> ?</span></div>",
          buttons: btns,
          default: "non",
          // close: () => d3.render(true)
          close: function () {
            if (bonus !== "") {
              dialog_BONUS.render(true);
            }
            if (bonus === "") {
            }
          },
        },
        myDialogOptions_spes,
      );

      let dialog_ardence_choix = new Dialog(
        {
          title: label.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#e76f51;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des <b>points d'ardence</b> ?</span></div>",
          buttons: {
            oui: {
              label: `<i class="fas fa-times"></i> NON`,
              callback: () => (ardence = 0),
            },
            non: {
              label: `<i class="fas fa-fire" style="color:#e76f51"></i> OUI`,
              callback: () => (ardence = 1),
            },
          },
          default: "oui",
          close: function () {
            if (ardence !== "") {
              if (ardence === 1) {
                let dialog_ardence = new Dialog(
                  {
                    title: label.toUpperCase(),
                    content:
                      "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
                      "<div style='padding:12px 8px;text-align:center'><span style='font-size:1.8em;font-weight:bold;color:#e76f51'>" +
                      ptArdence +
                      "</span> <span style='opacity:0.7'>pts disponibles</span><br><br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
                    buttons: btns_ar,
                    close: function () {
                      if (ptardence !== "") {
                        ardence_combat = ptardence * 2;
                        if (_skipSpe) {
                          bonus = 0;
                          dialog_BONUS.render(true);
                        } else {
                          d2.render(true);
                        }
                      }
                    },
                  },
                  myDialogOptions,
                );
                dialog_ardence.render(true);
              } else {
                if (_skipSpe) {
                  bonus = 0;
                  dialog_BONUS.render(true);
                } else {
                  d2.render(true);
                }
              }
            }
          },
        },
        myDialogOptions_ardence,
      );

      function generateDiffButtons(min, max) {
        const buttons = {
          auto: {
            label: "DEF",
            callback: () => (diff = diff2),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[`b${i}`] = {
            label: `${i}`,
            callback: () => (diff = i),
          };
        }

        return buttons;
      }

      let dialog_DIFF = new Dialog(
        {
          title: label.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la DIFF ou \"DEF\" pour que la DIFF soit égale à la DEF de la cible.</span></div>",
          buttons: generateDiffButtons(4, 27),
          default: "DEF",
          close: () => {
            if (diff !== null) {
              this.testmainsnues(comp, diff, ptardence, bonuspool, bonus);
            }
          },
        },
        myDialogOptions_diff,
      );

      // Fonction pour générer les boutons dynamiquement
      function generateBonusButtons(start, end) {
        let buttons = {};
        let label = "";
        for (let i = start; i <= end; i++) {
          if (i > 0) {
            label = `<span style="color:#4caf50;font-weight:bold">+${i}</span>`;
          } else if (i < 0) {
            label = `<span style="color:#f44336;font-weight:bold">${i}</span>`;
          } else {
            label = `<b>0</b>`;
          }
          buttons[`b${i}`] = {
            label: label,
            callback: () => (bonuspool = i),
          };
        }
        return buttons;
      }

      let bonusButtons = generateBonusButtons(-6, 6);

      let dialog_BONUS = new Dialog(
        {
          title: label.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-plus-minus'></i> BONUS / MALUS</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Sélectionnez le <b>Bonus/Malus</b> à ajouter au pool</span></div>",
          buttons: bonusButtons,
          default: "b0",
          close: () => {
            if (bonuspool !== "") {
              dialog_DIFF.render(true);
            }
          } /** On lance la fonctione testsmains nues */,
        },
        myDialogOptions_bonus,
      );
      animationJetCombat();
      if (this.actor.system.pts_ardence.value > 0) {
        setTimeout(function () {
          dialog_ardence_choix.render(true);
        }, 2000);
      } else {
        setTimeout(function () {
          if (_skipSpe) {
            bonus = 0;
            dialog_BONUS.render(true);
          } else {
            d2.render(true);
          }
        }, 2000);
      }
    });

    // Clic droit sur une arme de technique de combat pour ouvrir sa fiche
    html.find(".clic_technique_combat").on("contextmenu", (ev) => {
      ev.preventDefault();
      let comp = ev.currentTarget.getAttribute("value");
      let objet = this.actor.system.talents_combat[comp].label;
      let arme = this.actor.items.filter((i) => i.name === objet);

      if (arme && arme.length > 0) {
        arme[0].sheet.render(true);
      } else {
        ui.notifications.error(`Arme '${objet}' non trouvée dans l'inventaire`);
      }
    });

    // Clic droit sur une attaque spéciale (mains nues) pour ouvrir sa fiche
    html.find(".clic_mainsnues").on("contextmenu", (ev) => {
      ev.preventDefault();
      let comp = ev.currentTarget.getAttribute("value");
      let objet = this.actor.system.talents_combat[comp].label;
      let arme = this.actor.items.filter((i) => i.name === objet);

      if (arme && arme.length > 0) {
        arme[0].sheet.render(true);
      } else if (objet && objet.trim() !== "") {
        ui.notifications.error(`Arme '${objet}' non trouvée dans l'inventaire`);
      }
    });

    // Clic droit sur un pouvoir psi pour afficher les détails
    html.find(".pouvoir_psi").on("contextmenu", (ev) => {
      ev.preventDefault();
      let pouvoirType = ev.currentTarget.getAttribute("value");
      this._showPouvoirDetails(pouvoirType);
    });

    // Clic droit sur un pouvoir rollable (transit/transfert) pour afficher les détails
    html.find(".pouvoir_rollable").on("contextmenu", (ev) => {
      ev.preventDefault();
      let dataType = ev.currentTarget.getAttribute("data-type");
      let pouvoirType =
        dataType === "Transit" ? "pouvoir_transit" : "pouvoir_transfert";
      this._showPouvoirDetails(pouvoirType);
    });

    /************************************** Tests Initiatives ou Esquive ******************************/
    html.find(".combat_rollable").click((ev) => {
      // Vérification que les domaines sont renseignés (valeur minimale de 4)
      const _domaines_cr = this.actor.system.domaines;
      const _domainesNonRenseignesCr = Object.values(_domaines_cr).filter(
        (d) => (d.value ?? 0) < 4,
      );
      if (_domainesNonRenseignesCr.length > 0) {
        const _nomsCr = _domainesNonRenseignesCr.map((d) => d.label).join(", ");
        ui.notifications.warn(
          `Veuillez renseigner les talents avant de lancer un jet. Domaine(s) insuffisant(s) : ${_nomsCr}`,
        );
        return;
      }
      let comp = ev.currentTarget.getAttribute("value");
      // Supprimer les termes 1d0 de la formule (valeur à 0)
      comp = comp
        .replace(/1d0\s*\+\s*/g, "")
        .replace(/\s*\+\s*1d0\b/g, "")
        .trim();
      let nom = ev.currentTarget.getAttribute("label");
      let dataType = ev.currentTarget.getAttribute("data-type");
      let b = this.actor.system.bonus_initiative;
      let diff = 0;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 450,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "talent-info-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 980,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 960,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1060,
        classes: ["dialog", "talent-info-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 700,
        classes: ["dialog", "talent-info-dialog"],
      };

      function generateDiffButtons(min, max) {
        const buttons = {
          NC: {
            label: "NC",
            callback: () => (diff = 0),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[`b${i}`] = {
            label: `${i}`,
            callback: () => (diff = i),
          };
        }

        return buttons;
      }

      let d = new Dialog(
        {
          title: "DIFF",
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la <b>DIFF</b></span></div>",
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          close: function () {
            let r = new Roll(comp);
            r.evaluate().then(() => {
              let resultat = r.total;
              let final = resultat - diff;
              let result_diff = "";
              if (diff !== 0) {
                if (final > 0) {
                  final = Math.floor(final / 3);
                  result_diff = `<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ${diff}</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ${final}</span></div>`;
                } else {
                  final = Math.ceil(final / 3);
                  result_diff = `<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ${diff}</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ${final}</span></div>`;
                }
              } else {
                result_diff = `<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>`;
              }
              r.toMessage({
                flavor: `<div class='card-header'><span>${dataType}</span></div>${result_diff}`,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              });
            });
          },
        },
        myDialogOptions_diff,
      );

      if (dataType === "Esquive") {
        d.render(true);
      } else {
        let r = new Roll(comp);
        r.evaluate().then(() => {
          r.toMessage({
            flavor:
              "<div class='card-header'><span>" + dataType + "</span></div>",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
        });
      }
    });

    /******************************* Verrouillage de la feuille de personnage *********************/
    html.find(".verouille").click((ev) => {
      let etat = ev.currentTarget.getAttribute("value");
      if (etat == 1) {
        this.actor.update({ "system.verouille": 0 });
        ui.notifications.info("La fiche est dévérouillée !");
      } else {
        this.actor.update({ "system.verouille": 1 });
        ui.notifications.info("La fiche est vérouillée !");
      }
    });

    html.find(".clic_def").click((ev) => {
      let comp = ev.currentTarget.getAttribute("value");
      let talentsCombat = this.actor.system.talents_combat;

      function toggleDefActif(talent) {
        if (talentsCombat[talent].label !== "") {
          this.actor.update({
            [`system.talents_combat.${talent}.def_actif`]:
              !talentsCombat[talent].def_actif,
          });
          // this.actor.system.def_modif.value=this.actor.system.def_modif.value+this.actor.system.talents_combat[talent].def_actif;
        }
      }

      switch (comp) {
        case "mainsnues":
          toggleDefActif.call(this, "mainsnues");
          break;
        case "mainsnues1":
          toggleDefActif.call(this, "mainsnues1");
          break;
        case "mainsnues2":
          toggleDefActif.call(this, "mainsnues2");
          break;
        case "mainsnues3":
          toggleDefActif.call(this, "mainsnues3");
          break;
        case "armescourtes_1":
          toggleDefActif.call(this, "armescourtes_1");
          break;
        case "armescourtes_2":
          toggleDefActif.call(this, "armescourtes_2");
          break;
        case "armeslongues_1":
          toggleDefActif.call(this, "armeslongues_1");
          break;
        case "armeslongues_2":
          toggleDefActif.call(this, "armeslongues_2");
          break;
        case "lancer_1":
          toggleDefActif.call(this, "lancer_1");
          break;
        case "lancer_2":
          toggleDefActif.call(this, "lancer_2");
          break;
        case "tir_1":
          toggleDefActif.call(this, "tir_1");
          break;
        case "tir_2":
          toggleDefActif.call(this, "tir_2");
          break;
      }
    });

    html.find(".pouvoir_rollable").click((ev) => {
      flashMagicHalo(html);
      let dataType = ev.currentTarget.getAttribute("data-type");
      var el = document.querySelector(".letters-left");
      el.textContent = dataType;
      let rgtotal = 0;
      let btns_ar = {};
      let btns_1 = {};
      let btns_2 = {};
      let btns_3 = {};
      let btns = {};
      let bonus = "";
      let NoSpe = "";
      let ardence_pouvoir = "";
      let ardence_resonnance = "";
      let ardence_trait = "";
      let contenu = "";
      let contenu2 = "";
      let ardence = "";
      let ptardence = "";
      let rgardencetotal = 0;
      let ptardencetotal = 0;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_relance = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ajoutArdence = {
        top: 100,
        left: 100,
        width: 650,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 980,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 960,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1060,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 700,
        classes: ["dialog", "window-dialog"],
      };
      let nb_ardence = this.actor.system.pts_ardence.value;
      const _fireIcon = `<i class="fas fa-fire" style="color:#e76f51"></i>`;
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: `${_fireIcon.repeat(i)} ${i}`,
          callback: () => (ptardence = i),
        };
      }
      btns[NoSpe] = { label: "Aucune SPÉ", callback: () => (bonus = 0) };
      let comp = ev.currentTarget.getAttribute("value");
      console.log("dataType : " + dataType);
      const spesAssociees = speAssocie(dataType);
      let link = 0;
      if (this.actor.system.spe1.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe1.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe1.value);
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
          };
        }
      }
      if (this.actor.system.spe2.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe2.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe2.value);
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
          };
        }
      }
      if (this.actor.system.spe3.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe3.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe3.value);
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
          };
        }
      }
      if (this.actor.system.spe4.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe4.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe4.value);
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
          };
        }
      }
      if (this.actor.system.spe5.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe5.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe5.value);
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
          };
        }
      }
      if (this.actor.system.spe6.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe6.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe6.value);
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
          };
        }
      }

      let _skipSpe =
        this.actor.system.spe1.value === "" &&
        this.actor.system.spe2.value === "" &&
        this.actor.system.spe3.value === "" &&
        this.actor.system.spe4.value === "" &&
        this.actor.system.spe5.value === "" &&
        this.actor.system.spe6.value === "";

      let resonnance = this.actor.system.caracs.resonnance.value;
      let sens = this.actor.system.caracs.sens.value;
      let caractere = this.actor.system.caracs.caractere.value;
      let spe_transit = this.actor.system.pouvoirs.pouvoir_transit.grade;
      let score_transit = this.actor.system.pouvoirs.pouvoir_transit.rg;
      let spe_transfert = this.actor.system.pouvoirs.pouvoir_transfert.grade;
      let score_transfert = this.actor.system.pouvoirs.pouvoir_transfert.rg;
      let arda = this.actor.system.pts_ardence.value;
      let reso = this.actor.system.pts_resonnance.value;
      let diff = "";
      let bonuspool = "";
      let result_diff = "";
      let act = this.actor;
      let d_ard = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#e76f51;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des <b>points d'ardence</b> ?</span></div>",
          buttons: {
            oui: {
              label: `<i class="fas fa-times"></i> NON`,
              callback: () => (ardence = 0),
            },
            non: {
              label: `<i class="fas fa-fire" style="color:#e76f51"></i> OUI`,
              callback: () => (ardence = 1),
            },
          },
          default: "oui",
          close: function () {
            if (ardence !== "") {
              // d2.render(true);
              if (ardence === 1 && arda > 0) {
                d_ard2.render(true);
              }
              if (ardence === 0 || arda <= 0) {
                if (_skipSpe) {
                  bonus = 0;
                  dialogBonus.render(true);
                } else {
                  d2.render(true);
                }
              }
            }
          },
        },
        myDialogOptions_ardence,
      );

      let d2 = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-link'></i> SPÉCIALISATION</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>",
          buttons: btns,
          default: "non",
          // close: () => d3.render(true)
          close: function () {
            if (bonus !== "") {
              dialogBonus.render(true);
            }
            if (bonus === "") {
            }
          },
        },
        myDialogOptions_spes,
      );

      function generateBonusButtons(start, end) {
        let buttons = {};
        let label = "";
        for (let i = start; i <= end; i++) {
          if (i > 0) {
            label = `<span style="color:#4caf50;font-weight:bold">+${i}</span>`;
          } else if (i < 0) {
            label = `<span style="color:#f44336;font-weight:bold">${i}</span>`;
          } else {
            label = `<b>0</b>`;
          }
          buttons[`b${i}`] = {
            label: label,
            callback: () => (bonuspool = i),
          };
        }
        return buttons;
      }

      let bonusButtons = generateBonusButtons(-6, 6);

      let dialogBonus = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-plus-minus'></i> BONUS / MALUS</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Sélectionnez le <b>Bonus/Malus</b> à ajouter au pool</span></div>",
          buttons: bonusButtons,
          default: "b0",
          close: function () {
            if (bonuspool !== "") {
              dial.render(true);
            }
          },
        },
        myDialogOptions_bonus,
      );

      function generateDiffButtons(min, max) {
        const buttons = {
          NC: {
            label: "NC",
            callback: () => (diff = 0),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[`b${i}`] = {
            label: `${i}`,
            callback: () => (diff = i),
          };
        }

        return buttons;
      }

      let dial = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            `<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la <b>DIFF</b> ou <b>NC</b> si elle n'est pas communiquée</span></div>`,
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          // close: () => this.testComp(ev, carac, bonus, bonuspool, pouvoir,diff,ptardence)
          close: function () {
            if (diff !== "") {
              if (ardence === 1 && arda > 0) {
                diag1.render(true);
              }
              if (ardence === 0 || arda <= 0) {
                let result2 = parseFloat(reso) - 1;
                if (reso > 0 && retraitAuto) {
                  act.update({ "system.pts_resonnance.value": result2 });
                }
                let r = new Roll("1d10");
                //effets transit & transfert
                if (dataType == "Transit") {
                  const tokens = canvas.tokens.controlled;

                  /***** JOUE LES EFFETS SPECIAUX TRANSIT */
                  if (tokens.length != 0 && effets_speciaux) {
                    animPouvoir();
                  }

                  rgtotal = Number(score_transit) + Number(bonus);
                  console.log("score_transit : " + score_transit);
                  console.log("bonus : " + bonus);
                  let pool = "1d" + rgtotal + "+1d" + resonnance + "+1d" + sens;
                  if (bonuspool !== 0) {
                    pool += "+" + bonuspool;
                  }
                  r = new Roll(pool);
                  r.evaluate().then(() => {
                    let resultat = r.total;
                    let final = resultat - diff;
                    if (diff !== 0) {
                      if (final >= 0) {
                        final = Math.floor(final / 3);
                        result_diff =
                          '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                          diff +
                          '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                          final +
                          "</span></div>";
                      } else {
                        final = Math.ceil(final / 3);
                        result_diff =
                          '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                          diff +
                          '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                          final +
                          "</span></div>";
                      }
                    } else {
                      result_diff =
                        '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
                    }
                    r.toMessage({
                      flavor:
                        "<div class='card-header'><span>" +
                        dataType +
                        "</span></div>" +
                        "<div><span>" +
                        result_diff +
                        "</span></div>",
                      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    });
                  });
                } else if (dataType == "Transfert") {
                  const tokens = canvas.tokens.controlled;
                  if (tokens.length != 0 && effets_speciaux) {
                    animPouvoir();
                  }
                  rgtotal = Number(score_transfert) + Number(bonus);
                  let pool =
                    "1d" + rgtotal + "+1d" + resonnance + "+1d" + caractere;
                  if (bonuspool !== 0) {
                    pool += "+" + bonuspool;
                  }
                  r = new Roll(pool);

                  r.evaluate().then(() => {
                    let resultat = r.total;
                    let final = resultat - diff;
                    if (diff !== 0) {
                      if (final >= 0) {
                        final = Math.floor(final / 3);
                        result_diff =
                          '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                          diff +
                          '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                          final +
                          "</span></div>";
                      } else {
                        final = Math.ceil(final / 3);
                        result_diff =
                          '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                          diff +
                          '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                          final +
                          "</span></div>";
                      }
                    } else {
                      result_diff =
                        '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
                    }
                    r.toMessage({
                      flavor:
                        "<div class='card-header'><span>" +
                        dataType +
                        "</span></div>" +
                        "<div><span>" +
                        result_diff +
                        "</span></div>",
                      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    });
                  });
                }
              }
            }
          },
        },
        myDialogOptions_diff,
      );
      let ardenceBet = 0;
      let d_ard2 = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span style='font-size:1.8em;font-weight:bold;color:#e76f51'>" +
            this.actor.system.pts_ardence.value +
            "</span> <span style='opacity:0.7'>pts disponibles</span><br><br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
          buttons: btns_ar,
          //close: () => d.render(true)
          close: function () {
            if (ptardence !== "") {
              if (ptardence >= 1) {
                btns_1[0] = {
                  label: "Passer",
                  callback: () => (ardence_pouvoir = 0),
                };
                btns_1[1] = {
                  label: "2 Rg",
                  callback: () => (ardence_pouvoir = 2),
                };
              }
              if (ptardence >= 2) {
                btns_1[0] = {
                  label: "Passer",
                  callback: () => (ardence_pouvoir = 0),
                };
                btns_1[1] = {
                  label: "2 Rg",
                  callback: () => (ardence_pouvoir = 2),
                };
                btns_1[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_pouvoir = 4),
                };
              }
              if (ptardence >= 3) {
                btns_1[0] = {
                  label: "Passer",
                  callback: () => (ardence_pouvoir = 0),
                };
                btns_1[1] = {
                  label: "2 Rg",
                  callback: () => (ardence_pouvoir = 2),
                };
                btns_1[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_pouvoir = 4),
                };
                btns_1[3] = {
                  label: "6 Rg",
                  callback: () => (ardence_pouvoir = 6),
                };
              }
              if (ptardence >= 4) {
                btns_1[0] = {
                  label: "Passer",
                  callback: () => (ardence_pouvoir = 0),
                };
                btns_1[1] = {
                  label: "2 Rg",
                  callback: () => (ardence_pouvoir = 2),
                };
                btns_1[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_pouvoir = 4),
                };
                btns_1[3] = {
                  label: "6 Rg",
                  callback: () => (ardence_pouvoir = 6),
                };
                btns_1[4] = {
                  label: "8 Rg",
                  callback: () => (ardence_pouvoir = 8),
                };
              }
              rgardencetotal = ptardence * 2;
              ptardencetotal = ptardence;
              // diag1.render(true);
              if (_skipSpe) {
                bonus = 0;
                dialogBonus.render(true);
              } else {
                d2.render(true);
              }
            }
          },
        },
        myDialogOptions,
      );
      if (arda > 0 && reso > 0) {
        animationJet();
        setTimeout(function () {
          d_ard.render(true);
        }, 2000);
      }
      if (arda <= 0 && reso > 0) {
        animationJet();
        setTimeout(function () {
          if (_skipSpe) {
            bonus = 0;
            dialogBonus.render(true);
          } else {
            d2.render(true);
          }
        }, 2000);
      }
      if (reso < 1) {
        ui.notifications.error(
          "Vous n'avez plus de points de r&eacute;sonnance",
        );
      }

      if (dataType == "Transit") {
        contenu = "TRANSIT";
        contenu2 = "SENS";
      }
      if (dataType == "Transfert") {
        contenu = "TRANSFERT";
        contenu2 = "CARACTERE";
      }

      let diag1 = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE <i class='fas fa-angle-double-right'></i> " +
            contenu +
            "</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-podcast' style='font-size:2em;color:#9b59b6;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au pouvoir <b>" +
            contenu.toUpperCase() +
            "</b> ?</span></div>",
          buttons: btns_1,
          close: function () {
            if (ardence_pouvoir !== "") {
              rgardencetotal = rgardencetotal - ardence_pouvoir;
              ptardence = rgardencetotal / 2;
              if (ptardence === 0) {
                btns_2[0] = {
                  label: "Passer",
                  callback: () => (ardence_resonnance = 0),
                };
              }
              if (ptardence >= 1) {
                btns_2[0] = {
                  label: "Passer",
                  callback: () => (ardence_resonnance = 0),
                };
                btns_2[1] = {
                  label: "2Rg",
                  callback: () => (ardence_resonnance = 2),
                };
              }
              if (ptardence >= 2) {
                btns_2[0] = {
                  label: "Passer",
                  callback: () => (ardence_resonnance = 0),
                };
                btns_2[1] = {
                  label: "2Rg",
                  callback: () => (ardence_resonnance = 2),
                };
                btns_2[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_resonnance = 4),
                };
              }
              if (ptardence >= 3) {
                btns_2[0] = {
                  label: "Passer",
                  callback: () => (ardence_resonnance = 0),
                };
                btns_2[1] = {
                  label: "2Rg",
                  callback: () => (ardence_resonnance = 2),
                };
                btns_2[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_resonnance = 4),
                };
                btns_2[3] = {
                  label: "6 Rg",
                  callback: () => (ardence_resonnance = 6),
                };
              }
              if (ptardence >= 4) {
                btns_2[0] = {
                  label: "Passer",
                  callback: () => (ardence_resonnance = 0),
                };
                btns_2[1] = {
                  label: "2Rg",
                  callback: () => (ardence_resonnance = 2),
                };
                btns_2[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_resonnance = 4),
                };
                btns_2[3] = {
                  label: "6 Rg",
                  callback: () => (ardence_resonnance = 6),
                };
                btns_2[4] = {
                  label: "8 Rg",
                  callback: () => (ardence_resonnance = 8),
                };
              }
              diag2.render(true);
            }
          },
        },
        myDialogOptions_ajoutArdence,
      );

      let diag2 = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE <i class='fas fa-angle-double-right'></i> RÉSONNANCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-podcast' style='font-size:2em;color:#9b59b6;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au Trait <b>RÉSONNANCE</b> ?</span></div>",
          buttons: btns_2,
          close: function () {
            if (ardence_resonnance !== "") {
              rgardencetotal = rgardencetotal - ardence_resonnance;
              ptardence = rgardencetotal / 2;
              if (ptardence === 0) {
                btns_3[0] = {
                  label: "Passer",
                  callback: () => (ardence_trait = 0),
                };
              }
              if (ptardence >= 1) {
                btns_3[0] = {
                  label: "Passer",
                  callback: () => (ardence_trait = 0),
                };
                btns_3[1] = {
                  label: "2Rg",
                  callback: () => (ardence_trait = 2),
                };
              }
              if (ptardence >= 2) {
                btns_3[0] = {
                  label: "Passer",
                  callback: () => (ardence_trait = 0),
                };
                btns_3[1] = {
                  label: "2Rg",
                  callback: () => (ardence_trait = 2),
                };
                btns_3[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_trait = 4),
                };
              }
              if (ptardence >= 3) {
                btns_3[0] = {
                  label: "Passer",
                  callback: () => (ardence_trait = 0),
                };
                btns_3[1] = {
                  label: "2Rg",
                  callback: () => (ardence_trait = 2),
                };
                btns_3[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_trait = 4),
                };
                btns_3[3] = {
                  label: "6 Rg",
                  callback: () => (ardence_trait = 6),
                };
              }
              if (ptardence >= 4) {
                btns_3[0] = {
                  label: "Passer",
                  callback: () => (ardence_trait = 0),
                };
                btns_3[1] = {
                  label: "2Rg",
                  callback: () => (ardence_trait = 2),
                };
                btns_3[2] = {
                  label: "4 Rg",
                  callback: () => (ardence_trait = 4),
                };
                btns_3[3] = {
                  label: "6 Rg",
                  callback: () => (ardence_trait = 6),
                };
                btns_3[4] = {
                  label: "8 Rg",
                  callback: () => (ardence_trait = 8),
                };
              }
              diag3.render(true);
            }
          },
        },
        myDialogOptions_ajoutArdence,
      );

      let diag3 = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE <i class='fas fa-angle-double-right'></i> " +
            contenu2 +
            "</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-star' style='font-size:2em;color:#f39c12;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au Trait <b>" +
            contenu2.toUpperCase() +
            "</b> ?</span></div>",
          buttons: btns_3,
          close: function () {
            if (ardence_trait !== "") {
              if (ardence === 0) {
                diag4.render(true);
              } else {
                let result_diff = 0;
                if (ardence === 1) {
                  rgardencetotal = rgardencetotal - ardence_trait;
                  ptardence = rgardencetotal / 2;
                  ardenceBet = ardence_pouvoir;
                  let r = new Roll("1d10");
                  if (dataType == "Transit") {
                    const tokens = canvas.tokens.controlled;
                    // if (tokens.length !=0 && !game.user.isGM) {
                    if (tokens.length != 0 && effets_speciaux) {
                      animPouvoir();
                    }
                    rgtotal =
                      Number(score_transit) +
                      Number(bonus) +
                      Number(ardence_pouvoir);
                    resonnance += Number(ardence_resonnance);
                    caractere += Number(ardence_trait);
                    //relancer les dés ici (david)
                    r = new Roll(
                      "1d" +
                        rgtotal +
                        "+1d" +
                        resonnance +
                        "+1d" +
                        sens +
                        "+" +
                        bonuspool,
                    );
                    let rollFormula =
                      "1d" +
                      rgtotal +
                      "+1d" +
                      resonnance +
                      "+1d" +
                      sens +
                      "+" +
                      bonuspool;

                    let des = rollFormula.match(/\d+d\d+/g);

                    async function rollDice(diceArray, n, bonuspool) {
                      let results = await Promise.all(
                        diceArray.map((die) => rollAndShowDice(die)),
                      );
                      let entete =
                        "<div class='card-header-pouvoir'><span><i class=\"fas fa-podcast\"></i><span>Transit</span></div>";

                      if (n !== 0) {
                        await postToChat(
                          diceArray,
                          results,
                          bonuspool,
                          `${entete}<div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> JET INITIAL — DIFF ${diff}</div>`,
                        );
                      }

                      for (let i = 0; i < n; i++) {
                        let rerollIndex = await chooseDieToReroll(
                          diceArray,
                          results.map((r) => r.total),
                        );
                        if (rerollIndex === null) break; // Si le joueur choisit de ne pas relancer
                        let rerolledDie = diceArray[rerollIndex];
                        results[rerollIndex] =
                          await rollAndShowDice(rerolledDie);
                        if (i !== n - 1) {
                          await postToChat(
                            diceArray,
                            results,
                            bonuspool,
                            `${entete}<div class="mega-roll-reroll"><i class="fas fa-sync-alt"></i> RELANCE — DIFF ${diff}</div><div class="mega-roll-reroll-info"><i class="fas fa-redo"></i> Dé relancé : ${rerolledDie}</div>`,
                          );
                        }
                      }

                      let resultat =
                        results.reduce((sum, roll) => sum + roll.total, 0) +
                        bonuspool;
                      let formule = 0;
                      let detail_result = 0;
                      if (bonuspool !== 0) {
                        formule = r.formula + " + " + bonuspool;
                        detail_result = r.result + " + " + bonuspool;
                      } else {
                        formule = r.formula;
                        detail_result = r.result;
                      }
                      let final = resultat - diff;
                      if (diff !== 0) {
                        if (final >= 0) {
                          final = Math.floor(final / 3);
                          result_diff =
                            entete +
                            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                            diff +
                            '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                            final +
                            "</span></div>";
                        } else {
                          final = Math.ceil(final / 3);
                          result_diff =
                            entete +
                            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                            diff +
                            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                            final +
                            "</span></div>";
                        }
                      } else {
                        result_diff =
                          entete +
                          '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
                      }

                      await postToChat(
                        diceArray,
                        results,
                        bonuspool,
                        `${result_diff}`,
                      );
                      return results.map((r) => r.total);
                    }

                    async function rollAndShowDice(die) {
                      let roll = new Roll(die);
                      await roll.evaluate({ async: true });
                      if (game.dice3d) {
                        await game.dice3d.showForRoll(roll, game.user, true);
                      }
                      return roll;
                    }

                    async function chooseDieToReroll(diceArray, results) {
                      return new Promise((resolve) => {
                        let buttons = {
                          validate: {
                            label: `<i class="fas fa-check"></i><br><span style="font-size:0.8em">Valider le jet</span>`,
                            callback: () => resolve(null),
                          },
                        };
                        results.forEach((result, index) => {
                          buttons[`die_${index}`] = {
                            label: `<span style="display:flex;flex-direction:column;align-items:center;gap:2px"><i class="fas fa-dice"></i><span style="font-size:0.85em;opacity:0.85">${diceArray[index]}</span><span style="font-size:1.3em;font-weight:bold">${result}</span></span>`,
                            callback: () => resolve(index),
                          };
                        });
                        new Dialog(
                          {
                            title: "Relance d'un dé",
                            content:
                              "<div class='card-header'><span>Relancer un dé</span></div>" +
                              `<br><center><span class="bouton_texte">Cliquez sur un dé pour le relancer, ou validez ce jet</span></center><br>`,
                            buttons: buttons,
                            close: () => resolve(null),
                          },
                          myDialogOptions_relance,
                        ).render(true);
                      });
                    }

                    async function postToChat(
                      diceArray,
                      rolls,
                      bonuspool,
                      message,
                    ) {
                      let total = rolls.reduce(
                        (sum, roll) => sum + roll.total,
                        0,
                      );
                      let formattedResults = rolls
                        .map(
                          (r, index) =>
                            `<div class="dice-result">${diceArray[index]} : ${r.total}</div>`,
                        )
                        .join("");

                      // Construire la formule des dés
                      let diceFormula =
                        diceArray.join(" + ") +
                        (bonuspool !== 0 ? ` + ${bonuspool}` : "");

                      // Construire les détails des résultats des dés
                      let diceDetails = rolls
                        .map(
                          (r, index) => `
										<section class="tooltip-part">
											<div class="dice">
												<header class="part-header flexrow">
													<span class="part-formula">${diceArray[index]}</span>
													<span class="part-total">${r.total}</span>
												</header>
												<ol class="dice-rolls">
													<li class="roll die d${r.dice[0].faces}">${r.total}</li>
												</ol>
											</div>
										</section>
									`,
                        )
                        .join("");

                      let chatData = {
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker(),
                        content: `${message}
										<div class="dice-roll" data-action="expandRoll">
											<div class="dice-result">
												<div class="dice-formula">${diceFormula}</div>
												<div class="dice-tooltip">
                          <div class="wrapper">
													  ${diceDetails}
                          </div>
												</div>
												<h4 class="dice-total">${total + bonuspool}</h4>
											</div>
										</div>`,
                      };
                      await ChatMessage.create(chatData, {});
                    }

                    function formatResults(diceArray, rolls) {
                      return rolls
                        .map((r, index) => `${diceArray[index]} : ${r.total}`)
                        .join(", ");
                    }

                    rollDice(des, ardenceBet, bonuspool);
                  } else if (dataType == "Transfert") {
                    const tokens = canvas.tokens.controlled;
                    if (tokens.length != 0 && effets_speciaux) {
                      animPouvoir();
                    }
                    rgtotal =
                      Number(score_transfert) +
                      Number(bonus) +
                      Number(ardence_pouvoir);
                    resonnance += Number(ardence_resonnance);
                    caractere += Number(ardence_trait);
                    //TODO : relancer les dés ici
                    // r=new Roll("1d"+rgtotal+"+1d"+resonnance+"+1d"+caractere+"+"+bonuspool);
                    let rollFormula =
                      "1d" +
                      rgtotal +
                      "+1d" +
                      resonnance +
                      "+1d" +
                      caractere +
                      "+" +
                      bonuspool;

                    let des = rollFormula.match(/\d+d\d+/g);

                    async function rollDice(diceArray, n, bonuspool) {
                      let results = await Promise.all(
                        diceArray.map((die) => rollAndShowDice(die)),
                      );
                      let entete =
                        "<div class='card-header-pouvoir'><span><i class=\"fas fa-podcast\"></i><span>Transfert</span></div>";

                      if (n !== 0) {
                        await postToChat(
                          diceArray,
                          results,
                          bonuspool,
                          `${entete}<div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> JET INITIAL — DIFF ${diff}</div>`,
                        );
                      }

                      for (let i = 0; i < n; i++) {
                        let rerollIndex = await chooseDieToReroll(
                          diceArray,
                          results.map((r) => r.total),
                        );
                        if (rerollIndex === null) break; // Si le joueur choisit de ne pas relancer
                        let rerolledDie = diceArray[rerollIndex];
                        results[rerollIndex] =
                          await rollAndShowDice(rerolledDie);
                        if (i !== n - 1) {
                          await postToChat(
                            diceArray,
                            results,
                            bonuspool,
                            `${entete}<div class="mega-roll-reroll"><i class="fas fa-sync-alt"></i> RELANCE — DIFF ${diff}</div><div class="mega-roll-reroll-info"><i class="fas fa-redo"></i> Dé relancé : ${rerolledDie}</div>`,
                          );
                        }
                      }

                      let resultat =
                        results.reduce((sum, roll) => sum + roll.total, 0) +
                        bonuspool;
                      let formule = 0;
                      let detail_result = 0;
                      if (bonuspool !== 0) {
                        formule = r.formula + " + " + bonuspool;
                        detail_result = r.result + " + " + bonuspool;
                      } else {
                        formule = r.formula;
                        detail_result = r.result;
                      }
                      let final = resultat - diff;
                      if (diff !== 0) {
                        if (final >= 0) {
                          final = Math.floor(final / 3);
                          result_diff =
                            entete +
                            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                            diff +
                            '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                            final +
                            "</span></div>";
                        } else {
                          final = Math.ceil(final / 3);
                          result_diff =
                            entete +
                            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                            diff +
                            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                            final +
                            "</span></div>";
                        }
                      } else {
                        result_diff =
                          entete +
                          '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
                      }

                      await postToChat(
                        diceArray,
                        results,
                        bonuspool,
                        `${result_diff}`,
                      );
                      return results.map((r) => r.total);
                    }

                    async function rollAndShowDice(die) {
                      let roll = new Roll(die);
                      await roll.evaluate({ async: true });
                      if (game.dice3d) {
                        await game.dice3d.showForRoll(roll, game.user, true);
                      }
                      return roll;
                    }

                    async function chooseDieToReroll(diceArray, results) {
                      return new Promise((resolve) => {
                        let buttons = {
                          validate: {
                            label: `<i class="fas fa-check"></i><br><span style="font-size:0.8em">Valider le jet</span>`,
                            callback: () => resolve(null),
                          },
                        };
                        results.forEach((result, index) => {
                          buttons[`die_${index}`] = {
                            label: `<span style="display:flex;flex-direction:column;align-items:center;gap:2px"><i class="fas fa-dice"></i><span style="font-size:0.85em;opacity:0.85">${diceArray[index]}</span><span style="font-size:1.3em;font-weight:bold">${result}</span></span>`,
                            callback: () => resolve(index),
                          };
                        });
                        new Dialog(
                          {
                            title: "Relance d'un dé",
                            content:
                              "<div class='card-header'><span>Relancer un dé</span></div>" +
                              `<br><center><span class="bouton_texte">Cliquez sur un dé pour le relancer, ou validez ce jet</span></center><br>`,
                            buttons: buttons,
                            close: () => resolve(null),
                          },
                          myDialogOptions_relance,
                        ).render(true);
                      });
                    }

                    async function postToChat(
                      diceArray,
                      rolls,
                      bonuspool,
                      message,
                    ) {
                      let total = rolls.reduce(
                        (sum, roll) => sum + roll.total,
                        0,
                      );
                      let formattedResults = rolls
                        .map(
                          (r, index) =>
                            `<div class="dice-result">${diceArray[index]} : ${r.total}</div>`,
                        )
                        .join("");

                      // Construire la formule des dés
                      let diceFormula =
                        diceArray.join(" + ") +
                        (bonuspool !== 0 ? ` + ${bonuspool}` : "");

                      // Construire les détails des résultats des dés
                      let diceDetails = rolls
                        .map(
                          (r, index) => `
										<section class="tooltip-part">
											<div class="dice">
												<header class="part-header flexrow">
													<span class="part-formula">${diceArray[index]}</span>
													<span class="part-total">${r.total}</span>
												</header>
												<ol class="dice-rolls">
													<li class="roll die d${r.dice[0].faces}">${r.total}</li>
												</ol>
											</div>
										</section>
									`,
                        )
                        .join("");

                      let chatData = {
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker(),
                        content: `${message}
										<div class="dice-roll" data-action="expandRoll">
											<div class="dice-result">
												<div class="dice-formula">${diceFormula}</div>
												<div class="dice-tooltip">
                        <div class="wrapper">
													${diceDetails}
                          </div>
												</div>
												<h4 class="dice-total">${total + bonuspool}</h4>
											</div>
										</div>`,
                      };
                      await ChatMessage.create(chatData, {});
                    }

                    function formatResults(diceArray, rolls) {
                      return rolls
                        .map((r, index) => `${diceArray[index]} : ${r.total}`)
                        .join(", ");
                    }

                    rollDice(des, ardenceBet, bonuspool);
                  }
                  let result1 =
                    parseFloat(nb_ardence) - parseFloat(ptardencetotal);
                  if (nb_ardence > 0 && retraitAuto) {
                    act.update({ "system.pts_ardence.value": result1 });
                  }
                }
                let result2 = parseFloat(act.system.pts_resonnance.value) - 1;
                if (act.system.pts_resonnance.value > 0 && retraitAuto) {
                  act.update({ "system.pts_resonnance.value": result2 });
                }
              }
            }
          },
        },
        myDialogOptions_ajoutArdence,
      );

      function generateDiffButtons(min, max) {
        const buttons = {
          NC: {
            label: "NC",
            callback: () => (diff = 0),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[`b${i}`] = {
            label: `${i}`,
            callback: () => (diff = i),
          };
        }

        return buttons;
      }

      let diag4 = new Dialog(
        {
          title: dataType,
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            `<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la <b>DIFF</b> ou <b>NC</b> si elle n'est pas communiquée</span></div>`,
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          close: () =>
            this.pouvoir2(
              diff,
              rgtotal,
              ptardencetotal,
              ardence,
              rgardencetotal,
              ardence_trait,
              ardence_pouvoir,
              ardence_resonnance,
              sens,
              caractere,
              resonnance,
              ptardence,
              dataType,
              score_transfert,
              score_transit,
              spe_transfert,
              spe_transit,
            ),
        },
        myDialogOptions_diff,
      );
    });

    /******************************* Test Talents *********************/
    // Clic sur la valeur du talent (dice-badge ou input) → déclenche le même jet que l'intitulé
    html.find(".tnt-vc .dice-badge, .tnt-vc input.tnt-vi").on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      $(ev.currentTarget)
        .closest("td.tnt-vc")
        .prev("td.tnt-nc")
        .find(".talents_rollable")
        .trigger("click");
    });

    html.find(".talents_rollable").click((ev) => {
      // Vérification que les domaines sont renseignés (valeur minimale de 4)
      const _domaines_t = this.actor.system.domaines;
      const _domainesNonRenseignesT = Object.values(_domaines_t).filter(
        (d) => (d.value ?? 0) < 4,
      );
      if (_domainesNonRenseignesT.length > 0) {
        const _nomsT = _domainesNonRenseignesT.map((d) => d.label).join(", ");
        ui.notifications.warn(
          `Veuillez renseigner les talents avant de lancer un jet. Domaine(s) insuffisant(s) : ${_nomsT}`,
        );
        return;
      }
      let pouvoir;
      let pouvoirPresent = this.actor.system.pouvoirs.pouvoir_psi_2.label;
      let numPouv = 1;
      let carac = "";
      let bonus = "";
      let bonuspool = "";
      var btns = {};
      var btns_ar = {};
      let NoSpe = "";
      let diff = 22;
      let ardence = "";
      let ptardence = 0;
      let typeActor = this.actor.system.type_acteur;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_numPouv = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 980,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 960,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1060,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 700,
        classes: ["dialog", "window-dialog"],
      };
      let comp = ev.currentTarget.getAttribute("value");
      var el = document.querySelector(".letters-left");
      el.textContent = "Action";
      animationJet();
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      let talentName = this.actor.system.talents[comp].label;
      let speOK = true;
      let pouvoirOK = true;
      if (
        this.actor.system.pouvoirs.pouvoir_psi_1.label === "" &&
        this.actor.system.pouvoirs.pouvoir_psi_2.label === ""
      ) {
        pouvoirOK = false;
      }
      const spesAssociees = speAssocie(talentName);
      if (
        !this.actor.system.spe1.value &&
        !this.actor.system.spe2.value &&
        !this.actor.system.spe3.value &&
        !this.actor.system.spe4.value &&
        !this.actor.system.spe5.value &&
        !this.actor.system.spe6.value
      ) {
        speOK = false;
      }
      let link = 0;
      if (this.actor.system.spe1.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe1.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          btns["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
          };
        }
      }
      if (this.actor.system.spe2.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe2.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe2.value);
          btns["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
          };
        }
      }
      if (this.actor.system.spe3.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe3.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe3.value);
          btns["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
          };
        }
      }
      if (this.actor.system.spe4.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe4.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe4.value);
          btns["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
          };
        }
      }
      if (this.actor.system.spe5.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe5.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe5.value);
          btns["btn_spes5"] = {
            label: this.actor.system.spe5.value,
            callback: () => (bonus = this.actor.system.rg_spe_5.value),
          };
        }
      }
      if (this.actor.system.spe6.value !== "") {
        link = 0;
        for (let i = 0; i < spesAssociees.length; i++) {
          if (spesAssociees[i] === this.actor.system.spe6.value) {
            link = 1;
            break;
          }
        }
        if (link === 1) {
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
            icon: `<i class="fas fa-link"></i>`,
          };
        } else {
          console.log(this.actor.system.spe6.value);
          btns["btn_spes6"] = {
            label: this.actor.system.spe6.value,
            callback: () => (bonus = this.actor.system.rg_spe_6.value),
          };
        }
      }

      const _fireIcon = `<i class="fas fa-fire" style="color:#e76f51"></i>`;
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: `${_fireIcon.repeat(i)} ${i}`,
          callback: () => (ptardence = i),
        };
      }
      let pts_reso = this.actor.system.pts_resonnance.value;
      let d_ard = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#e76f51;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des <b>points d'ardence</b> ?</span></div>",
          buttons: {
            btn_oui: {
              label: `<i class="fas fa-times"></i> NON`,
              callback: () => (ardence = 0),
            },
            btn_non: {
              label: `<i class="fas fa-fire" style="color:#e76f51"></i> OUI`,
              callback: () => (ardence = 1),
            },
          },
          default: "oui",
          //close: () => d.render(true)
          close: function () {
            if (ardence === 1) {
              d_ard2.render(true);
            }
            if (ardence === 0) {
              if (typeActor === "MEGA" && pouvoirOK) {
                d0.render(true);
              } else {
                pouvoir = 0;
                d.render(true);
              }
            }
          },
        },
        myDialogOptions_ardence,
      );

      let d_ard2 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span style='font-size:1.8em;font-weight:bold;color:#e76f51'>" +
            this.actor.system.pts_ardence.value +
            "</span> <span style='opacity:0.7'>pts disponibles</span><br><br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
          buttons: btns_ar,
          //close: () => d.render(true)
          close: function () {
            if (pouvoirOK) {
              d0.render(true);
            } else {
              pouvoir = 0;
              d.render(true);
            }
          },
        },
        myDialogOptions,
      );

      let numPouvoir = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-podcast'></i> POUVOIR PSI</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-podcast' style='font-size:2em;color:#9b59b6;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Quel <b>Pouvoir PSI</b> souhaitez-vous utiliser ?</span></div>",
          buttons: {
            pouvoir1: {
              label:
                `<i class="fas fa-podcast" style="color:#9b59b6"></i> ` +
                this.actor.system.pouvoirs.pouvoir_psi_1.label,
              callback: () => (numPouv = 1),
            },

            pouvoir2: {
              label:
                `<i class="fas fa-podcast" style="color:#9b59b6"></i> ` +
                this.actor.system.pouvoirs.pouvoir_psi_2.label,
              callback: () => (numPouv = 2),
            },
          },
          //close: () => d.render(true)
          close: function () {
            if (speOK) {
              d2.render(true);
            } else {
              d3.render(true);
            }
          },
        },
        myDialogOptions_numPouv,
      );

      const _psiDisabled = pts_reso <= 0;
      let _stopBtnParticles = null;

      let d0 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-dice-d20'></i> TYPE DE TEST</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-dice-d20' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Quel <b>type de test</b> souhaitez-vous réaliser ?</span></div>",
          buttons: {
            talent: {
              label:
                '<span class="bouton_talent"><i class="fas fa-sign-language"></i> Talent</span>',
              callback: () => (pouvoir = 0),
            },
            pouvoir: {
              label: _psiDisabled
                ? '<span class="bouton_pouvoir mega-psi-disabled"><i class="fas fa-ban"></i> Plus de Résonance</span>'
                : '<span class="bouton_pouvoir"><i class="fas fa-podcast" style="color:#9b59b6"></i> Pouvoir PSI</span>',
              callback: () => {
                if (_psiDisabled) return; // bloque l'action si plus de résonance
                pouvoir = 1;
                flashMagicHalo(html);
              },
            },
          },
          default: "talent",
          render: (dlgHtml) => {
            if (_psiDisabled) {
              const btn = dlgHtml.find('[data-button="pouvoir"]');
              btn.prop("disabled", true).addClass("mega-psi-btn-disabled");
            } else {
              const btn = dlgHtml.find('[data-button="pouvoir"]')[0];
              if (btn) {
                btn.classList.add("mega-psi-active");
                _stopBtnParticles = startButtonParticles(btn);
              }
            }
          },
          close: function () {
            if (_stopBtnParticles) {
              _stopBtnParticles();
              _stopBtnParticles = null;
            }
            if (pouvoir === 1) {
              if (pouvoirPresent) numPouvoir.render(true);
              else if (speOK) {
                d2.render(true);
              } else {
                d3.render(true);
              }
            }
            if (pouvoir === 0) {
              d.render(true);
            }
          },
        },
        myDialogOptions_test,
      );

      if (this.actor.system.pts_ardence.value !== 0) {
        setTimeout(function () {
          d_ard.render(true);
        }, 2000);
      } else {
        setTimeout(function () {
          d0.render(true);
        }, 2000);
      }

      let d = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-user'></i> TRAIT</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Quel <b>Trait</b> voulez-vous utiliser ?</span></div>",
          buttons: {
            vivacite: {
              label: `<i class="fas fa-bolt"></i> VIVACITE`,
              callback: () => (carac = "vivacite"),
            },
            sens: {
              label: `<i class="fas fa-eye"></i> SENS`,
              callback: () => (carac = "sens"),
            },
            adresse: {
              label: `<i class="fas fa-hand-paper"></i> ADRESSE`,
              callback: () => (carac = "adresse"),
            },
            reflexion: {
              label: `<i class="fas fa-brain"></i> REFLEXION`,
              callback: () => (carac = "reflexion"),
            },
            ardence: {
              label: `<i class="fas fa-fire" style="color:#e76f51"></i> ARDENCE`,
              callback: () => (carac = "ardence"),
            },
            force: {
              label: `<i class="fas fa-fist-raised"></i> FORCE`,
              callback: () => (carac = "force"),
            },
            caractere: {
              label: `<i class="fas fa-star"></i> CARACTERE`,
              callback: () => (carac = "caractere"),
            },
            resonnance: {
              label: `<i class="fas fa-podcast" style="color:#9b59b6"></i> RESONNANCE`,
              callback: () => (carac = "resonnance"),
            },
            endurance: {
              label: `<i class="fas fa-heart" style="color:#e74c3c"></i> ENDURANCE`,
              callback: () => (carac = "endurance"),
            },
          },
          default: "VIVACITÉ",
          // close: () => d2.render(true)
          close: function () {
            if (carac !== "") {
              if (speOK) {
                d2.render(true);
              } else {
                d3.render(true);
              }
            }
          },
        },
        myDialogOptions_traits,
      );

      let d2 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-link'></i> SPÉ</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>",
          buttons: btns,
          default: "non",
          // close: () => d3.render(true)
          close: function () {
            if (bonus !== "") {
              d3.render(true);
            }
            if (bonus === "") {
            }
          },
        },
        myDialogOptions_spes,
      );

      function generateBonusButtons(start, end) {
        let label = "";
        let buttons = {};
        for (let i = start; i <= end; i++) {
          if (i > 0) {
            label = `<span style="color:#4caf50;font-weight:bold">+${i}</span>`;
          } else if (i < 0) {
            label = `<span style="color:#f44336;font-weight:bold">${i}</span>`;
          } else {
            label = `<b>0</b>`;
          }
          buttons[`b${i}`] = {
            label: label,
            callback: () => (bonuspool = i),
          };
        }
        return buttons;
      }
      let bonusButtons = generateBonusButtons(-6, 6);

      let d3 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-plus-minus'></i> BONUS / MALUS</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Sélectionnez le <b>Bonus/Malus</b> à ajouter au pool</span></div>",
          buttons: bonusButtons,
          default: "b0",
          close: function () {
            if (bonuspool !== "") {
              d4.render(true);
            }
          },
        },
        myDialogOptions_bonus,
      );

      function generateDiffButtons(min, max) {
        const buttons = {
          NC: {
            label: "NC",
            callback: () => (diff = 0),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[`b${i}`] = {
            label: `${i}`,
            callback: () => (diff = i),
          };
        }

        return buttons;
      }

      let d4 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            `<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la <b>DIFF</b> ou <b>NC</b> si elle n'est pas communiquée</span></div>`,

          buttons: generateDiffButtons(4, 27),
          default: "NC",
          // close: () => this.testComp(ev, carac, bonus, bonuspool, pouvoir,diff,ptardence)
          close: () => {
            if (diff !== 22) {
              this.testComp(
                ev,
                carac,
                bonus,
                bonuspool,
                pouvoir,
                diff,
                ptardence,
                numPouv,
              );
            }
          },
        },
        myDialogOptions_diff,
      );
    });

    html.find(".traits_rollable").click((ev) => {
      // Vérification que les domaines sont renseignés (valeur minimale de 4)
      const _domaines_tr = this.actor.system.domaines;
      const _domainesNonRenseignesTr = Object.values(_domaines_tr).filter(
        (d) => (d.value ?? 0) < 4,
      );
      if (_domainesNonRenseignesTr.length > 0) {
        const _nomsTr = _domainesNonRenseignesTr.map((d) => d.label).join(", ");
        ui.notifications.warn(
          `Veuillez renseigner les talents avant de lancer un jet. Domaine(s) insuffisant(s) : ${_nomsTr}`,
        );
        return;
      }
      let premier_trait = ev.currentTarget.getAttribute("value");
      let comp = ev.currentTarget.getAttribute("value");
      let traitName = this.actor.system.caracs[comp].label;
      let ardenceStock = this.actor.system.pts_ardence.value;
      let carac = "";
      let carac2 = "";
      let diff = 22;
      let ardence = -1;
      let ptardence = 0;
      let bonuspool = "";
      let type_test = "";
      var btns_ar = {};

      var el = document.querySelector(".letters-left");
      el.textContent = "Traits";
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 420,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 450,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 980,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 960,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1060,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 700,
        classes: ["dialog", "window-dialog"],
      };
      const _fireIcon = `<i class="fas fa-fire" style="color:#e76f51"></i>`;
      animationJet();
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: `${_fireIcon.repeat(i)} ${i}`,
          callback: () => (ptardence = i),
        };
      }
      let d_ard2 = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span style='font-size:1.8em;font-weight:bold;color:#e76f51'>" +
            this.actor.system.pts_ardence.value +
            "</span> <span style='opacity:0.7'>pts disponibles</span><br><br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
          buttons: btns_ar,
          //close: () => d.render(true)
          close: function () {
            d.render(true);
          },
        },
        myDialogOptions,
      );

      let d_ard = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#e76f51'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#e76f51;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des <b>points d'ardence</b> ?</span></div>",
          buttons: {
            oui: {
              label: `<i class="fas fa-times"></i> NON`,
              callback: () => (ardence = 0),
            },
            non: {
              label: `<i class="fas fa-fire" style="color:#e76f51"></i> OUI`,
              callback: () => (ardence = 1),
            },
          },
          default: "oui",
          //close: () => d.render(true)
          close: function () {
            if (ardence === 1) {
              d_ard2.render(true);
            }
            if (ardence === 0) {
              d.render(true);
            }
          },
        },
        myDialogOptions_ardence,
      );

      let choix = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-dice-d20'></i> TYPE DE TEST</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-dice-d20' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Quel <b>type de test</b> souhaitez-vous r\u00e9aliser ?</span></div>",
          buttons: {
            duel: {
              label: `<i class="fas fa-exchange-alt"></i> DUEL`,
              callback: () => (type_test = "duel"),
            },
            trois: {
              label: `<i class="fas fa-layer-group"></i> TRAITS + DOMAINE`,
              callback: () => (type_test = "trois"),
            },
          },
          default: "duel",
          // close: () => d2.render(true)
          close: function () {
            if (type_test !== "") {
              if (type_test == "duel") {
                d.render(true);
              } else if (type_test == "trois") {
                if (ardenceStock >= 1) {
                  d_ard.render(true);
                } else {
                  d.render(true);
                }
              }
            }
          },
        },
        myDialogOptions_test,
      );

      let d = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-user'></i> TRAIT N\u00b02</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Choisissez le second <b>Trait</b></span></div>",
          buttons: {
            vivacite: {
              label: `<i class="fas fa-bolt"></i> VIVACITE`,
              callback: () => (carac = "vivacite"),
            },
            sens: {
              label: `<i class="fas fa-eye"></i> SENS`,
              callback: () => (carac = "sens"),
            },
            adresse: {
              label: `<i class="fas fa-hand-paper"></i> ADRESSE`,
              callback: () => (carac = "adresse"),
            },
            reflexion: {
              label: `<i class="fas fa-brain"></i> REFLEXION`,
              callback: () => (carac = "reflexion"),
            },
            ardence: {
              label: `<i class="fas fa-fire" style="color:#e76f51"></i> ARDENCE`,
              callback: () => (carac = "ardence"),
            },
            force: {
              label: `<i class="fas fa-fist-raised"></i> FORCE`,
              callback: () => (carac = "force"),
            },
            caractere: {
              label: `<i class="fas fa-star"></i> CARACTERE`,
              callback: () => (carac = "caractere"),
            },
            resonnance: {
              label: `<i class="fas fa-podcast" style="color:#9b59b6"></i> RESONNANCE`,
              callback: () => (carac = "resonnance"),
            },
            endurance: {
              label: `<i class="fas fa-heart" style="color:#e74c3c"></i> ENDURANCE`,
              callback: () => (carac = "endurance"),
            },
          },
          default: "VIVACITÉ",
          // close: () => d2.render(true)
          close: () => {
            if (carac !== "") {
              if (type_test == "duel") {
                this.testTrait(
                  type_test,
                  ev,
                  carac,
                  premier_trait,
                  0,
                  0,
                  ptardence,
                );
              } else {
                d2.render(true);
              }
            }
          },
        },
        myDialogOptions_traits,
      );
      setTimeout(function () {
        choix.render(true);
      }, 2000);

      let d2 = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-layer-group'></i> DOMAINE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-layer-group' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Quel <b>Domaine</b> voulez-vous utiliser ?</span></div>",
          buttons: {
            COMMUNICATION: {
              label: `<i class="fas fa-comments"></i> COMMUNICATION`,
              callback: () => (carac2 = "communication"),
            },
            PRATIQUE: {
              label: `<i class="fas fa-tools"></i> PRATIQUE`,
              callback: () => (carac2 = "pratique"),
            },
            CULTUREMILIEU: {
              label: `<i class="fas fa-book"></i> CULTURE MILIEUX...`,
              callback: () => (carac2 = "culture_milieux"),
            },
            COMBAT: {
              label: `<i class="fas fa-fist-raised"></i> COMBAT`,
              callback: () => (carac2 = "combat"),
            },
          },
          default: "COMMUNICATION",
          close: function () {
            if (carac2 !== "") {
              d3.render(true);
            }
          },
        },
        myDialogOptions_traits,
      );

      function generateBonusButtons(min, max) {
        let buttons = {};
        let label = "";
        for (let i = min; i <= max; i++) {
          if (i > 0) {
            label = `<span style="color:#4caf50;font-weight:bold">+${i}</span>`;
          } else if (i < 0) {
            label = `<span style="color:#f44336;font-weight:bold">${i}</span>`;
          } else {
            label = `<b>0</b>`;
          }
          buttons[`b${i}`] = {
            label: label,
            callback: () => (bonuspool = i),
          };
        }
        return buttons;
      }

      let bonusButtons = generateBonusButtons(-6, 6);

      let d3 = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-plus-minus'></i> BONUS / MALUS</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>S\u00e9lectionnez le <b>Bonus/Malus</b> \u00e0 ajouter au pool</span></div>",
          buttons: bonusButtons,
          default: "b0",
          close: function () {
            if (bonuspool !== "") {
              d4.render(true);
            }
          },
        },
        myDialogOptions_bonus,
      );

      function generateDiffButtons(min, max) {
        const buttons = {
          NC: {
            label: "NC",
            callback: () => (diff = 0),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[`b${i}`] = {
            label: `${i}`,
            callback: () => (diff = i),
          };
        }

        return buttons;
      }

      let d4 = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULT\u00c9</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>S\u00e9lectionnez la <b>DIFF</b> ou \"NC\" si elle n'est pas communiqu\u00e9e</span></div>",
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          close: () => {
            if (diff !== 22) {
              this.testTrait(
                type_test,
                ev,
                carac,
                carac2,
                bonuspool,
                diff,
                ptardence,
              );
            }
          },
        },
        myDialogOptions_diff,
      );
    });
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 172;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  //Inventaire par type

  /**
   * Affiche un dialogue popup avec le tableau des défenses par localisation et par type d'attaque.
   */
  _onShowDefenseLocalisation() {
    const data = this._computeDefenseByLocalisation();
    const typeKeys = [
      "choc",
      "lame",
      "balle",
      "feu",
      "froid",
      "acide",
      "rayon",
    ];
    const typeConfig = {
      choc: {
        label: "Choc",
        icon: "systems/mega/images/flint-spark.svg",
        color: "#e67e22",
        bg: "rgba(230,126,34,0.18)",
      },
      lame: {
        label: "Lame",
        icon: "systems/mega/images/blade-fall.svg",
        color: "#b0bec5",
        bg: "rgba(176,190,197,0.15)",
      },
      balle: {
        label: "Balle",
        icon: "systems/mega/images/silver-bullet.svg",
        color: "#2980b9",
        bg: "rgba(41,128,185,0.18)",
      },
      feu: {
        label: "Feu",
        icon: "systems/mega/images/fire.svg",
        color: "#e74c3c",
        bg: "rgba(231,76,60,0.18)",
      },
      froid: {
        label: "Froid",
        icon: "systems/mega/images/frozen-orb.svg",
        color: "#5dade2",
        bg: "rgba(93,173,226,0.18)",
      },
      acide: {
        label: "Acide",
        icon: "systems/mega/images/chemical-drop.svg",
        color: "#2ecc71",
        bg: "rgba(46,204,113,0.18)",
      },
      rayon: {
        label: "Rayon",
        icon: "systems/mega/images/ringed-beam.svg",
        color: "#9b59b6",
        bg: "rgba(155,89,182,0.18)",
      },
    };

    const sys = this.actor.system;
    const baseDef =
      (Number(sys.def?.value) || 0) +
      (Number(sys.def_modif?.value) || 0) +
      (Number(sys.bonus_armes_def) || 0);
    const nbProtections = this.actor.items.filter(
      (i) => i.type === "Protection" && i.system.equipe,
    ).length;

    let headerCells = `<th style="text-align:left; padding:6px 10px; background:rgba(0,0,0,0.35); color:#ccc; font-size:0.75em; letter-spacing:0.08em; white-space:nowrap;">ZONE</th>`;
    for (const key of typeKeys) {
      const t = typeConfig[key];
      headerCells += `<th style="text-align:center; padding:6px 4px; background:${t.bg}; border-bottom:3px solid ${t.color}; min-width:54px;">
        <img src="${t.icon}" style="width:22px;height:22px;display:block;margin:0 auto 3px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));" title="${t.label}" />
        <span style="font-size:0.7em; color:${t.color}; font-weight:bold; letter-spacing:0.04em;">${t.label.toUpperCase()}</span>
      </th>`;
    }

    let bodyRows = "";
    data.forEach((row, idx) => {
      const rowBg =
        idx % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.1)";
      let cells = `<td class="loc-zone-cell" data-rowidx="${idx}" style="padding:5px 10px; font-weight:600; font-size:0.85em; background:rgba(0,0,0,0.18); border-right:1px solid rgba(255,255,255,0.07); white-space:nowrap; color:#ddd; transition:background 0.3s,box-shadow 0.3s;">
        <i class="fas fa-chevron-right" style="font-size:0.55em; margin-right:5px; opacity:0.4; vertical-align:middle;"></i>${row.label}
      </td>`;
      for (const key of typeKeys) {
        const val = row[key];
        const t = typeConfig[key];
        const bonus = val - baseDef;
        let badge;
        if (bonus > 0) {
          badge = `<span style="display:inline-block; background:linear-gradient(135deg,${t.color}dd,${t.color}88); color:#fff; border-radius:5px; padding:2px 8px; font-weight:bold; font-size:0.92em; box-shadow:0 1px 4px rgba(0,0,0,0.45); min-width:28px; text-align:center;">${val}<sup style="font-size:0.65em; margin-left:1px; opacity:0.85;">+${bonus}</sup></span>`;
        } else {
          badge = `<span style="display:inline-block; background:linear-gradient(135deg,${t.color}dd,${t.color}88); color:#fff; border-radius:5px; padding:2px 8px; font-weight:bold; font-size:0.92em; box-shadow:0 1px 4px rgba(0,0,0,0.45); min-width:28px; text-align:center;">${val}<sup style="font-size:0.65em; margin-left:1px; opacity:0.5;">0</sup></span>`;
        }
        cells += `<td class="loc-val-cell" data-rowidx="${idx}" style="text-align:center; padding:4px 3px; background:${rowBg}; transition:background 0.3s,box-shadow 0.3s;">${badge}</td>`;
      }
      bodyRows += `<tr data-zone-idx="${idx}">${cells}</tr>`;
    });

    const content = `
      <style>
        @keyframes loc-pulse {
          0%,100% { box-shadow: inset 0 0 0 2px rgba(255,215,0,0.9); background: rgba(255,215,0,0.18) !important; }
          50%      { box-shadow: inset 0 0 0 2px #ffd700;             background: rgba(255,215,0,0.32) !important; }
        }
        .loc-highlighted { animation: loc-pulse 1.1s ease-in-out infinite !important; }
        #btn-random-loc { display:inline-flex !important; align-items:center; gap:6px; padding:6px 12px !important;
          background:linear-gradient(135deg,#c0392b,#8e2417) !important; border:none !important; border-radius:6px !important;
          color:#fff !important; font-weight:bold; font-size:0.82em !important; cursor:pointer;
          box-shadow:0 2px 6px rgba(0,0,0,0.5) !important; transition:transform 0.1s,box-shadow 0.1s !important;
          min-width:unset !important; width:auto !important; }
        #btn-random-loc:hover { transform:scale(1.06); box-shadow:0 3px 10px rgba(192,57,43,0.7) !important; }
        #btn-random-loc:active { transform:scale(0.95); }
        #btn-random-loc .fa-dice-d6 { font-size:1.2em; }
        @keyframes dice-spin { 0%{transform:rotate(0deg) scale(1.3)} 100%{transform:rotate(360deg) scale(1.3)} }
        .dice-rolling { animation: dice-spin 0.4s linear; }
      </style>
      <div style="font-family:inherit; margin:-4px; padding-bottom:50px;">
        <div style="background:linear-gradient(135deg,rgba(14,68,114,0.75),rgba(26,111,168,0.5)); padding:12px 16px; margin-bottom:12px; border-radius:4px; display:flex; align-items:center; gap:12px;">
          <i class="fas fa-person" style="font-size:2em; color:#7ec8f0; text-shadow:0 0 10px rgba(126,200,240,0.6);"></i>
          <div style="flex:1;">
            <div style="font-weight:bold; font-size:1.05em; color:#e8f4ff; text-shadow:0 1px 3px rgba(0,0,0,0.5);">${this.actor.name}</div>
            <div style="font-size:0.78em; color:#acd4ee; margin-top:3px;">
              <i class="fas fa-shield-halved" style="margin-right:4px;"></i>DEF de base : <strong style="color:#fff; font-size:1.1em;">${baseDef}</strong>
              &nbsp;&nbsp;<i class="fas fa-vest" style="margin-right:4px;"></i>Protections : <strong style="color:#fff;">${nbProtections}</strong>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
            <button id="btn-random-loc"><i class="fas fa-dice-d6"></i> Zone al&eacute;atoire</button>
            <span id="random-loc-result" style="font-size:0.75em; color:#fde68a; font-weight:bold; min-height:1.2em; text-align:center; text-shadow:0 0 8px rgba(253,230,138,0.7); letter-spacing:0.04em;"></span>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.87em;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody id="loc-table-body">${bodyRows}</tbody>
          </table>
        </div>
        <div style="margin-top:10px; font-size:0.7em; color:#666; text-align:right; padding-right:2px;">
          <i class="fas fa-circle-info" style="margin-right:3px;"></i>Les badges colorés indiquent un bonus de protection actif. Le bouton dé tire une zone au hasard.
        </div>
      </div>
    `;

    new Dialog(
      {
        title: `Défense par localisation — ${this.actor.name}`,
        content,
        buttons: { close: { label: "<i class='fas fa-times'></i> Fermer" } },
        default: "close",
        render: (html) => {
          html.find("#btn-random-loc").on("click", function () {
            const idx = Math.floor(Math.random() * data.length);
            // Surbrillance
            html.find("td.loc-highlighted").removeClass("loc-highlighted");
            html.find(`td[data-rowidx="${idx}"]`).addClass("loc-highlighted");
            // Nom de la zone
            html.find("#random-loc-result").text(`\u27a4 ${data[idx].label}`);
            // Animation du dé
            const $icon = $(this).find(".fa-dice-d6");
            $icon.addClass("dice-rolling");
            setTimeout(() => $icon.removeClass("dice-rolling"), 420);
            // Scroll vers la ligne
            const $row = html.find(`tr[data-zone-idx="${idx}"]`);
            if ($row.length)
              $row[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        },
      },
      { width: 640, height: "auto", classes: ["window-dialog"] },
    ).render(true);
  }

  _prepareItems(context) {
    const gear = [];
    const objet = [];
    const tirs = [];
    const courtes = [];
    const longues = [];
    const lancer = [];
    const melee = [];
    const protections = [];
    const pouvoir = [];

    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;

      if (i.type === "item") {
        gear.push(i);
      }
      if (i.type === "Objet") {
        objet.push(i);
      } else if (i.type === "Arme de tir") {
        tirs.push(i);
      } else if (i.type === "Arme courte") {
        courtes.push(i);
      } else if (i.type === "Arme longue") {
        longues.push(i);
      } else if (i.type === "Arme de lancer") {
        lancer.push(i);
      } else if (i.type === "Protection") {
        protections.push(i);
      } else if (i.type === "Attaque spéciale") {
        melee.push(i);
      } else if (i.type === "Pouvoir") {
        pouvoir.push(i);
      }
    }

    context.actor.gear = gear;
    context.actor.objet = objet;
    context.actor.tirs = tirs;
    context.actor.courtes = courtes;
    context.actor.longues = longues;
    context.actor.lancer = lancer;
    context.actor.melee = melee;
    context.actor.protections = protections;
    context.actor.pouvoir = pouvoir;
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const data = duplicate(header.dataset);
    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    delete itemData.system["type"];
    return await Item.create(itemData, { parent: this.actor });
  }

  testComp(ev, carac, bonus, bonuspool, pouvoir, diff, ptardence, numPouv) {
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let comp = ev.currentTarget.getAttribute("value");
    let nomComp = this.actor.system.talents[comp].label;
    let mod = this.actor.system.talents[comp].value + bonus;
    let nomDomaine =
      this.actor.system.talents[comp].domaine !== "culture_milieux"
        ? this.actor.system.talents[comp].domaine
        : "CULTURE MILIEUX";
    // let rollFormula = "";
    // let result_diff="";
    let r = new Roll("1d10");
    // let talent_maudit=0;
    // let final=0;
    let btns_1 = {};
    let btns_2 = {};
    let btns_3 = {};
    let ardence_talent = 0;
    let ardence_domaine = 0;
    let ardence_trait = 0;
    let rgardencetotal = ptardence * 2;
    let ardenceBet = ptardence;
    const myDialogOptions = {
      top: 100,
      left: 100,
      classes: ["dialog", "talent-info-dialog"],
    };
    const myDialogOptions_ardence = {
      top: 100,
      left: 100,
      width: 600,
      height: 200,
      classes: ["dialog", "talent-info-dialog"],
    };
    if (ptardence >= 1) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
    }
    if (ptardence >= 2) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
    }
    if (ptardence >= 3) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
    }
    if (ptardence >= 4) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
      btns_1[4] = { label: "8 Rg", callback: () => (ardence_talent = 8) };
    }
    if (retraitAuto) {
      this.actor.update({
        "system.pts_ardence.value":
          this.actor.system.pts_ardence.value - ptardence,
      });
    }
    let diag1 = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          comp +
          " ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Talent " +
          nomComp.toUpperCase() +
          "</b> ?</span><br><br>",
        buttons: btns_1,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_talent;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_domaine = 0),
            };
          }
          if (ptardence >= 1) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_domaine = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          }
          if (ptardence >= 2) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_domaine = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
            btns_2[2] = {
              label: "4 Rg",
              callback: () => (ardence_domaine = 4),
            };
          }
          if (ptardence >= 3) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_domaine = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
            btns_2[2] = {
              label: "4 Rg",
              callback: () => (ardence_domaine = 4),
            };
            btns_2[3] = {
              label: "6 Rg",
              callback: () => (ardence_domaine = 6),
            };
          }
          if (ptardence >= 4) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_domaine = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
            btns_2[2] = {
              label: "4 Rg",
              callback: () => (ardence_domaine = 4),
            };
            btns_2[3] = {
              label: "6 Rg",
              callback: () => (ardence_domaine = 6),
            };
            btns_2[4] = {
              label: "8 Rg",
              callback: () => (ardence_domaine = 8),
            };
          }
          if (pouvoir === 0) {
            diag2.render(true);
          }
          if (pouvoir === 1) {
            diag_pouv.render(true);
          }
        },
      },
      myDialogOptions_ardence,
    );

    let diag2 = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          this.actor.system.talents[comp].domaine +
          " ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Domaine " +
          nomDomaine.toUpperCase() +
          "</b> ?</span><br><br>",
        buttons: btns_2,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_domaine;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
          }
          if (ptardence >= 1) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          }
          if (ptardence >= 2) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          }
          if (ptardence >= 3) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          }
          if (ptardence >= 4) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
            btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait = 8) };
          }
          diag3.render(true);
        },
      },
      myDialogOptions_ardence,
    );

    let diagpouv3 = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> Pouvoir PSI ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Pouvoir PSI</b> ?</span><br><br>",
        buttons: btns_3,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_trait;
          ptardence = rgardencetotal / 2;
        },
        close: () =>
          this.testComp2(
            ev,
            carac,
            bonus,
            bonuspool,
            pouvoir,
            diff,
            ptardence,
            ardence_trait,
            ardence_domaine,
            ardence_talent,
            ardenceBet,
            numPouv,
          ),
      },
      myDialogOptions_ardence,
    );

    let diag_pouv = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> RÉSONNANCE ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Trait Résonnance</b> ?</span><br><br>",
        buttons: btns_2,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_domaine;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
          }
          if (ptardence >= 1) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          }
          if (ptardence >= 2) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          }
          if (ptardence >= 3) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          }
          if (ptardence >= 4) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
            btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait = 8) };
          }
          diagpouv3.render(true);
        },
      },
      myDialogOptions_ardence,
    );
    let trait = "";
    if (pouvoir == 0) {
      trait = this.actor.system.caracs[carac].label;
    } else {
      trait = "";
    } //TODO: retirer cela
    let diag3 = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          trait +
          " ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Trait " +
          trait.toUpperCase() +
          " ?</span><br><br>",
        buttons: btns_3,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_trait;
          ptardence = rgardencetotal / 2;
        },
        close: () =>
          this.testComp2(
            ev,
            carac,
            bonus,
            bonuspool,
            pouvoir,
            diff,
            ptardence,
            ardence_trait,
            ardence_domaine,
            ardence_talent,
            ardenceBet,
          ),
      },
      myDialogOptions_ardence,
    );

    if (ptardence !== 0) {
      if (mod > 0 && mod < 99) {
        diag1.render(true);
      }
      if (mod > 98) {
        rgardencetotal = rgardencetotal - ardence_domaine;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_3[0] = { label: "Passer", callback: () => (ardence_trait = 0) };
        }
        if (ptardence >= 1) {
          btns_3[0] = { label: "Passer", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
        }
        if (ptardence >= 2) {
          btns_3[0] = { label: "Passer", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
        }
        if (ptardence >= 3) {
          btns_3[0] = { label: "Passer", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
        }
        if (ptardence >= 4) {
          btns_3[0] = { label: "Passer", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait = 8) };
        }
        if (pouvoir === 1) {
          diagpouv3.render(true);
        }
        if (pouvoir === 0) {
          diag3.render(true);
        }
      }
      if (mod === 0 || this.actor.system.talents[comp].value === -2) {
        rgardencetotal = rgardencetotal - ardence_talent;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_2[0] = {
            label: "Passer",
            callback: () => (ardence_domaine = 0),
          };
        }
        if (ptardence >= 1) {
          btns_2[0] = {
            label: "Passer",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
        }
        if (ptardence >= 2) {
          btns_2[0] = {
            label: "Passer",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
        }
        if (ptardence >= 3) {
          btns_2[0] = {
            label: "Passer",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
        }
        if (ptardence >= 4) {
          btns_2[0] = {
            label: "Passer",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
          btns_2[4] = { label: "8 Rg", callback: () => (ardence_domaine = 8) };
        }
        if (pouvoir === 1) {
          diag_pouv.render(true);
        }
        if (pouvoir === 0) {
          diag2.render(true);
        }
      }
    } else {
      this.testComp2(
        ev,
        carac,
        bonus,
        bonuspool,
        pouvoir,
        diff,
        ptardence,
        ardence_trait,
        ardence_domaine,
        ardence_talent,
        ardenceBet,
        numPouv,
      );
    }
  }

  testComp2(
    ev,
    carac,
    bonus,
    bonuspool,
    pouvoir,
    diff,
    ptardence,
    ardence_trait,
    ardence_domaine,
    ardence_talent,
    ardenceBet,
    numPouv,
  ) {
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let comp = ev.currentTarget.getAttribute("value");
    let mod = Number(this.actor.system.talents[comp].value) + Number(bonus);
    let rollFormula = "";
    let result_diff = "";
    let r = new Roll("1d10");
    let talent_maudit = 0;
    let de_trait = 0;
    let de_domaine = 0;
    let de_talent = mod + Number(ardence_talent);
    // if (bonuspool>0) {bonuspool = "+ "+bonuspool;}
    const myDialogOptions_relance = {
      top: 100,
      left: 100,
      width: 400,
      height: 240,
    };
    if (pouvoir === 0) {
      de_trait = this.actor.system.caracs[carac].value + Number(ardence_trait);
      if (this.actor.system.talents[comp].value === -2) {
        talent_maudit = -2;
      }
      if (this.actor.system.talents[comp].domaine === "communication") {
        de_domaine =
          this.actor.system.domaines.communication.value +
          talent_maudit +
          ardence_domaine;
      }
      if (this.actor.system.talents[comp].domaine === "pratique") {
        de_domaine =
          this.actor.system.domaines.pratique.value +
          talent_maudit +
          ardence_domaine;
      }
      if (this.actor.system.talents[comp].domaine === "culture_milieux") {
        de_domaine =
          this.actor.system.domaines.culture_milieux.value +
          talent_maudit +
          ardence_domaine;
      }
      if (mod > 0 && mod < 99) {
        if (bonuspool !== 0) {
          rollFormula =
            "1d" +
            de_talent +
            "+ 1d" +
            de_domaine +
            "+ 1d" +
            de_trait +
            " + " +
            bonuspool;
        }
        if (bonuspool === 0) {
          rollFormula =
            "1d" + de_talent + "+ 1d" + de_domaine + "+ 1d" + de_trait;
        }
      }
      if (mod === 0 || this.actor.system.talents[comp].value === -2) {
        if (bonuspool !== 0) {
          rollFormula =
            "1d" + de_domaine + "+ 1d" + de_trait + " + " + bonuspool;
        }
        if (bonuspool === 0) {
          rollFormula = "1d" + de_domaine + "+ 1d" + de_trait;
        }
      }
      if (mod > 98) {
        if (bonuspool !== 0) {
          rollFormula = "1d" + de_trait + " + " + bonuspool;
        }
        if (bonuspool === 0) {
          rollFormula = "1d" + de_trait;
        }
      }
    }
    if (pouvoir === 1) {
      if (this.actor.system.talents[comp].value === -2) {
        talent_maudit = -2;
      }
      const effets_speciaux = game.settings.get("mega", "effets_speciaux");
      if (effets_speciaux) {
        animPouvoir();
      }

      de_trait =
        this.actor.system.caracs.resonnance.value +
        ardence_domaine +
        talent_maudit;
      if (numPouv === 1) {
        de_domaine = parseFloat(this.actor.system.pouvoirs.pouvoir_psi_1.rg);
      }
      if (numPouv === 2) {
        de_domaine = parseFloat(this.actor.system.pouvoirs.pouvoir_psi_2.rg);
      }
      de_domaine += ardence_trait;
      // faire test si de_talent ===0!
      if (mod > 0 && mod < 99) {
        if (bonuspool !== 0) {
          rollFormula =
            "1d" +
            de_talent +
            "+1d" +
            de_trait +
            "+1d" +
            de_domaine +
            "+" +
            bonuspool;
        }
        if (bonuspool === 0) {
          rollFormula =
            "1d" + de_talent + "+1d" + de_trait + "+1d" + de_domaine;
        }
      }
      if (mod === 0 || this.actor.system.talents[comp].value === -2) {
        if (bonuspool !== 0) {
          rollFormula =
            "1d" + de_trait + "+ 1d" + de_domaine + " + " + bonuspool;
        }
        if (bonuspool === 0) {
          rollFormula = "1d" + de_trait + "+ 1d" + de_domaine;
        }
      }
      if (mod > 98) {
        if (bonuspool !== 0) {
          rollFormula = "1d" + de_trait + " + " + bonuspool;
        }
        if (bonuspool === 0) {
          rollFormula = "1d" + de_domaine;
        }
      }
    }

    // Supprimer les termes 1d0 de la formule (valeur à 0)
    rollFormula = rollFormula
      .replace(/1d0\s*\+\s*/g, "")
      .replace(/\s*\+\s*1d0\b/g, "")
      .trim();

    let des = rollFormula.match(/\d+d\d+/g);
    let type_jet = this.actor.system.talents[comp].label;
    if (pouvoir === 1) {
      if (retraitAuto) {
        this.actor.update({
          "system.pts_resonnance.value":
            this.actor.system.pts_resonnance.value - 1,
        });
      }
    }
    async function rollDice(diceArray, n, bonuspool, type_jet) {
      let results = await Promise.all(
        diceArray.map((die) => rollAndShowDice(die)),
      );
      let entete = "";
      if (pouvoir === 1) {
        entete =
          "<div class='card-header-pouvoir'><span><i class=\"fas fa-podcast\"></i> " +
          type_jet +
          "</span></div>" +
          "<div><span>" +
          result_diff +
          "</span></div>";
      } else {
        entete =
          "<div class='card-header'><span>" +
          type_jet +
          "</span></div>" +
          "<div><span>" +
          result_diff +
          "</span></div>";
      }

      if (n !== 0) {
        await postToChat(
          diceArray,
          results,
          bonuspool,
          `${entete}<div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> JET INITIAL — DIFF ${diff}</div>`,
        );
      }

      for (let i = 0; i < n; i++) {
        let rerollIndex = await chooseDieToReroll(
          diceArray,
          results.map((r) => r.total),
        );
        if (rerollIndex === null) break; // Si le joueur choisit de ne pas relancer
        let rerolledDie = diceArray[rerollIndex];
        results[rerollIndex] = await rollAndShowDice(rerolledDie);
        if (i !== n - 1) {
          await postToChat(
            diceArray,
            results,
            bonuspool,
            `${entete}<div class="mega-roll-reroll"><i class="fas fa-sync-alt"></i> RELANCE — DIFF ${diff}</div><div class="mega-roll-reroll-info"><i class="fas fa-redo"></i> Dé relancé : ${rerolledDie}</div>`,
          );
        }
      }

      let resultat =
        results.reduce((sum, roll) => sum + roll.total, 0) + bonuspool;
      let formule = 0;
      let detail_result = 0;
      if (bonuspool !== 0) {
        formule = r.formula + bonuspool;
        detail_result = r.result + bonuspool;
      } else {
        formule = r.formula;
        detail_result = r.result;
      }
      let final = resultat - diff;
      if (diff !== 0) {
        if (final >= 0) {
          final = Math.floor(final / 3);
          result_diff =
            entete +
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
            final +
            "</span></div>";
        } else {
          final = Math.ceil(final / 3);
          result_diff =
            entete +
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
            final +
            "</span></div>";
        }
      } else {
        result_diff =
          entete +
          '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
      }

      await postToChat(diceArray, results, bonuspool, `${result_diff}`);
      return results.map((r) => r.total);
    }

    async function rollAndShowDice(die) {
      let roll = new Roll(die);
      await roll.evaluate({ async: true });
      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }
      return roll;
    }

    async function chooseDieToReroll(diceArray, results) {
      return new Promise((resolve) => {
        let buttons = {
          validate: {
            label: `<i class="fas fa-check"></i><br><span style="font-size:0.8em">Valider le jet</span>`,
            callback: () => resolve(null),
          },
        };
        results.forEach((result, index) => {
          buttons[`die_${index}`] = {
            label: `<span style="display:flex;flex-direction:column;align-items:center;gap:2px"><i class="fas fa-dice"></i><span style="font-size:0.85em;opacity:0.85">${diceArray[index]}</span><span style="font-size:1.3em;font-weight:bold">${result}</span></span>`,
            callback: () => resolve(index),
          };
        });
        new Dialog(
          {
            title: "RELANCE",
            content:
              "<div class='card-header'><span>Relancer un dé</span></div>" +
              `<br><center><span class="bouton_texte">Cliquez sur un dé pour le relancer, ou validez ce jet</span></center><br>`,
            buttons: buttons,
            close: () => resolve(null),
          },
          myDialogOptions_relance,
        ).render(true);
      });
    }

    async function postToChat(diceArray, rolls, bonuspool, message) {
      let total = rolls.reduce((sum, roll) => sum + roll.total, 0);
      let formattedResults = rolls
        .map(
          (r, index) =>
            `<div class="dice-result">${diceArray[index]} : ${r.total}</div>`,
        )
        .join("");

      // Construire la formule des dés
      let diceFormula = "";
      // diceFormula =diceArray.join(" + ") + (bonuspool !== 0 ? ` ${bonuspool}` : "");
      diceFormula = diceArray.join(" + ");
      if (bonuspool > 0) {
        diceFormula = diceFormula + " + " + bonuspool;
      }
      if (bonuspool < 0) {
        diceFormula = diceFormula + " - " + Math.abs(bonuspool);
      }
      // Construire les détails des résultats des dés
      let diceDetails = rolls
        .map(
          (r, index) => `
				<section class="tooltip-part">
					<div class="dice">
						<header class="part-header flexrow">
							<span class="part-formula">${diceArray[index]}</span>
							<span class="part-total">${r.total}</span>
						</header>
						<ol class="dice-rolls">
							<li class="roll die d${r.dice[0].faces}">${r.total}</li>
						</ol>
					</div>
				</section>
			`,
        )
        .join("");
      let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: `${message}
				<div class="dice-roll" data-action="expandRoll">
					<div class="dice-result">
						<div class="dice-formula">${diceFormula}</div>
						<div class="dice-tooltip">
            <div class="wrapper">
							${diceDetails}
            </div>
						</div>
						<h4 class="dice-total">${total + bonuspool}</h4>
					</div>
				</div>`,
      };
      await ChatMessage.create(chatData, {});
    }

    function formatResults(diceArray, rolls) {
      return rolls
        .map((r, index) => `${diceArray[index]} : ${r.total}`)
        .join(", ");
    }

    rollDice(des, ardenceBet, bonuspool, type_jet);
  }

  testmainsnues(comp, diff, ptardence, bonuspool, bonus) {
    let nomComp = this.actor.system.talents_combat[comp].label;
    let mod = this.actor.system.talents_combat[comp].score;
    let objet = this.actor.system.talents_combat[comp].label;
    let currentTarget = null;
    let r = "";
    let son_arme = "";
    let assomme = "";
    let ardence_combat = ptardence * 2;
    const retraitAuto = game.settings.get("mega", "retraitAuto");

    // Vérifications de sécurité pour éviter les valeurs undefined
    mod = mod || 0;
    bonuspool = bonuspool || 0;
    bonus = bonus || 0;

    // S'assurer que les caractéristiques existent et ont des valeurs valides
    const force = this.actor.system.caracs?.force?.value || 1;
    const adresse = this.actor.system.caracs?.adresse?.value || 1;
    const sens = this.actor.system.caracs?.sens?.value || 1;
    if (ardence_combat !== 0 && retraitAuto) {
      this.actor
        .update({
          "system.combat_modif.value":
            ardence_combat + this.actor.system.combat_modif.value,
        })
        .then(() => {
          this.actor
            .update({
              "system.def_modif.value":
                ardence_combat / 2 + this.actor.system.def_modif.value,
            })
            .then(() => {
              this.actor.update({
                "system.pts_ardence.value":
                  this.actor.system.pts_ardence.value - ptardence,
              });
            });
        });
    }
    let arme = this.actor.items.filter((i) => i.name === objet);
    if (Array.from(game.user.targets).length != 0) {
      currentTarget = Array.from(game.user.targets)[0].actor;
    }
    let combat = 0;
    if (ardence_combat !== 0) {
      combat =
        (this.actor.system.combat_modif?.value || 0) +
        ardence_combat +
        (this.actor.system.domaines?.combat?.value || 0);
    } else {
      combat =
        (this.actor.system.combat_modif?.value || 0) +
        (this.actor.system.domaines?.combat?.value || 0);
    }

    // S'assurer que combat a une valeur minimale
    combat = Math.max(combat, 1);

    mod = parseInt(mod) + parseInt(bonus);
    if (comp == "charge") {
      if (mod !== 0) {
        if (bonuspool !== 0) {
          r = new Roll(
            "1d" + mod + "+ 1d" + combat + "+ 1d" + force + "+" + bonuspool,
          );
        } else {
          r = new Roll("1d" + mod + "+ 1d" + combat + "+ 1d" + force);
        }
      } else {
        if (bonuspool !== 0) {
          r = new Roll("1d" + combat + "+ 1d" + force + "+" + bonuspool);
        } else {
          r = new Roll("1d" + combat + "+ 1d" + force);
        }
      }
    } else if (mod !== 0) {
      if (this.actor.system.talents_combat[comp].bonus === "adr") {
        if (bonuspool !== 0) {
          r = new Roll(
            "1d" + mod + "+ 1d" + combat + "+ 1d" + adresse + "+" + bonuspool,
          );
        } else {
          r = new Roll("1d" + mod + "+ 1d" + combat + "+ 1d" + adresse);
        }
      } else {
        if (bonuspool !== 0) {
          r = new Roll(
            "1d" + mod + "+ 1d" + combat + "+ 1d" + sens + "+" + bonuspool,
          );
        } else {
          r = new Roll("1d" + mod + "+ 1d" + combat + "+ 1d" + sens);
        }
      }
    } else if (mod === 0) {
      if (this.actor.system.talents_combat[comp].bonus === "adr") {
        if (bonuspool !== 0) {
          r = new Roll("1d" + combat + "+ 1d" + adresse + "+" + bonuspool);
        } else {
          r = new Roll("1d" + combat + "+ 1d" + adresse);
        }
      } else {
        if (bonuspool !== 0) {
          r = new Roll("1d" + combat + "+ 1d" + sens + "+" + bonuspool);
        } else {
          r = new Roll("1d" + combat + "+ 1d" + sens);
        }
      }
    }

    let type_jet = this.actor.system.talents_combat[comp].label;
    r.evaluate().then(() => {
      let resultat = r.total;
      let result_final = 0;
      let result_diff = "";
      let marge;
      let def_temp = 0;
      //   let temp_vie_perdue;
      let melee_perdue = 0;
      let vie_perdue = 0;
      let mention = "";
      let effet_coup1 = "";
      let effet_coup2 = "";
      let effet_coup3 = "";

      if (Array.from(game.user.targets).length != 0) {
        /******************************** Effets spéciaux sans arme mains nues et charge ****************************/
        if (game.user.targets.size == 0)
          ui.notifications.error("Vous devez selectionner au moins une cible");

        if (!requireFXMaster()) return;
        const wait = (delay) =>
          new Promise((resolve) => setTimeout(resolve, delay));
        let target = Array.from(game.user.targets)[0];
        let selectedToken = canvas.tokens.controlled[0];
        let targets = Array.from(game.user.targets);
        let son_arme = "";
        let effet_arme = "";
        let offX = 0;
        let offY = 0;
        switch (objet) {
          case "Bagarre":
            effet_arme = game.settings.get("mega", "bagarre_video_path");
            son_arme = game.settings.get("mega", "bagarre_son_path");
            break;
          case "Charge":
            effet_arme = game.settings.get("mega", "charge_video_path");
            son_arme = game.settings.get("mega", "charge_son_path");
            break;
          default:
            offX = Number(arme[0].system.effet_offX.value);
            offY = Number(arme[0].system.effet_offY.value);
            effet_arme = arme[0].system.effet_arme.value;
            son_arme = game.settings.get("mega", "bagarre_son_path");
            break;
        }
        const effets_speciaux = true; // Déjà vérifié dans requireFXMasterForEffects()
        if (game.modules.get("sequencer")?.active && effets_speciaux) {
          new Sequence()
            .effect()
            .file(effet_arme)
            .atLocation(canvas.tokens.controlled[0], {
              offset: { x: offX, y: offY },
              gridUnits: false,
            })
            .stretchTo(target)
            .repeats(3, 200, 300)
            .play();
          if (son_arme && son_arme.trim() !== "") {
            new Sequence()
              .sound()
              .file(son_arme)
              .fadeInAudio(500)
              .fadeOutAudio(500)
              .play();
          }
        }

        result_diff =
          result_diff + effet_coup1 + effet_coup2 + effet_coup3 + assomme;

        if (diff !== 0) {
          def_temp = diff;
        } else {
          def_temp =
            currentTarget.system.def.value +
            currentTarget.system.def_modif.value;
        }

        result_final = resultat - def_temp;
        if (result_final >= 0) {
          marge = Math.floor(result_final / 3);
          result_diff =
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            def_temp +
            '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> R\u00e9ussite <span class="mega-roll-margin">Marge : ' +
            marge +
            "</span></div>";
        } else {
          marge = Math.ceil(result_final / 3);
          result_diff =
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            def_temp +
            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> \u00c9chec <span class="mega-roll-margin">Marge : ' +
            marge +
            "</span></div>";
        }
        if (marge === 0 && result_final >= 0) {
          melee_perdue = this.actor.system.talents_combat[comp].av0;
          effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_0_1;
          effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_0_2;
          effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_0_3;
        }
        if (marge === 1) {
          melee_perdue = this.actor.system.talents_combat[comp].av1;
          effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_1_1;
          effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_1_2;
          effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_1_3;
        }
        if (marge === 2) {
          melee_perdue = this.actor.system.talents_combat[comp].av2;
          effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_2_1;
          effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_2_2;
          effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_2_3;
        }
        if (marge === 3) {
          melee_perdue = this.actor.system.talents_combat[comp].av3;
          effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_3_1;
          effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_3_2;
          effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_3_3;
        }
        if (marge >= 4) {
          melee_perdue = this.actor.system.talents_combat[comp].av4;
          effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_4_1;
          effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_4_2;
          effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_4_3;
        }

        function getEffetCoupHtml(effet) {
          const effets = {
            H: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>',
            A: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>',
            S: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>',
            R: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>',
            I: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>',
            P: '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>',
            T: '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>',
            D: '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>',
          };
          return effets[effet] || "";
        }

        effet_coup1 = getEffetCoupHtml(effet_coup1);
        effet_coup2 = getEffetCoupHtml(effet_coup2);
        effet_coup3 = getEffetCoupHtml(effet_coup3);

        melee_perdue = calcMeleePerdue(marge, comp, this.actor);

        if (marge == 0 && result_final >= 0) {
          if (marge >= 0 && result_final >= 0 && marge == 0) {
            result_diff =
              result_diff +
              '<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ' +
              game.user.targets.values().next().value.name +
              " perd <strong>" +
              melee_perdue +
              "</strong>pt de Mêlée</div>";
          }
          const _dmc2 = calcViePerdue(melee_perdue, comp, this.actor);
          vie_perdue = _dmc2.vie_perdue;
          result_diff =
            result_diff +
            '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
            game.user.targets.values().next().value.name +
            " perd <strong>" +
            vie_perdue +
            "</strong>pt de Vie</div>";
          // TODO : enelever l'automatisme pour charge + bagarre
          if (retraitAuto) {
            const updatePromise = safeDocumentUpdate(currentTarget, {
              "system.health.value":
                currentTarget.system.health.value - vie_perdue,
              "system.melee_impair": _dmc2.new_melee_impair,
            });
            if (updatePromise) {
              updatePromise.then(() => {
                safeDocumentUpdate(currentTarget, {
                  "system.power.value":
                    currentTarget.system.power.value - melee_perdue,
                });
              });
            }
          }
        }

        /*************Boutons conso AV **********************/
        let melee_perdue_1av = 0;
        let melee_perdue_2av = 0;
        let melee_perdue_3av = 0;
        let effet_0av_1 = "";
        let effet_0av_2 = "";
        let effet_0av_3 = "";
        let effet_1av_1 = "";
        let effet_1av_2 = "";
        let effet_1av_3 = "";
        let effet_2av_1 = "";
        let effet_2av_2 = "";
        let effet_2av_3 = "";
        let effet_3av_1 = "";
        let effet_3av_2 = "";
        let effet_3av_3 = "";

        if (marge == 1) {
          melee_perdue_1av = calcMeleePerdue(marge - 1, comp, this.actor);
          effet_0av_1 = calc_coup1(marge, comp, this.actor);
          effet_0av_2 = calc_coup2(marge, comp, this.actor);
          effet_0av_3 = calc_coup3(marge, comp, this.actor);
          effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
          effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
          effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
          result_diff +=
            "<button class='conso_marge gradient-button' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_0av_1 +
            "' data-effet_0av_2='" +
            effet_0av_2 +
            "' data-effet_0av_3='" +
            effet_0av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue +
            "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
            melee_perdue +
            " pt Mêlée " +
            effet_0av_1 +
            " " +
            effet_0av_2 +
            " " +
            effet_0av_3 +
            "</button><br><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_1av_1 +
            "' data-effet_0av_2='" +
            effet_1av_2 +
            "' data-effet_0av_3='" +
            effet_1av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue_1av +
            "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
            melee_perdue_1av +
            " pt Mêlée " +
            effet_1av_1 +
            " " +
            effet_1av_2 +
            " " +
            effet_1av_3 +
            "</button>";
        }
        if (marge == 2) {
          melee_perdue_1av = calcMeleePerdue(marge - 1, comp, this.actor);
          melee_perdue_2av = calcMeleePerdue(marge - 2, comp, this.actor);
          effet_0av_1 = calc_coup1(marge, comp, this.actor);
          effet_0av_2 = calc_coup2(marge, comp, this.actor);
          effet_0av_3 = calc_coup3(marge, comp, this.actor);
          effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
          effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
          effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
          effet_2av_1 = calc_coup1(marge - 2, comp, this.actor);
          effet_2av_2 = calc_coup2(marge - 2, comp, this.actor);
          effet_2av_3 = calc_coup3(marge - 2, comp, this.actor);
          result_diff +=
            "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_0av_1 +
            "' data-effet_0av_2='" +
            effet_0av_2 +
            "' data-effet_0av_3='" +
            effet_0av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue +
            "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
            melee_perdue +
            " pt Mêlée " +
            effet_0av_1 +
            " " +
            effet_0av_2 +
            " " +
            effet_0av_3 +
            "</button><br><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_1av_1 +
            "' data-effet_0av_2='" +
            effet_1av_2 +
            "' data-effet_0av_3='" +
            effet_1av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue_1av +
            "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
            melee_perdue_1av +
            " pt Mêlée " +
            effet_1av_1 +
            " " +
            effet_1av_2 +
            " " +
            effet_1av_3 +
            "</button><br><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_2av_1 +
            "' data-effet_0av_2='" +
            effet_2av_2 +
            "' data-effet_0av_3='" +
            effet_2av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue_2av +
            "><i class='fas fa-coins'></i> <b>2Av</b><br>-" +
            melee_perdue_2av +
            " pt Mêlée " +
            effet_2av_1 +
            " " +
            effet_2av_2 +
            " " +
            effet_2av_3 +
            "</button>";
        }
        if (marge >= 3) {
          melee_perdue_1av = calcMeleePerdue(marge - 1, comp, this.actor);
          melee_perdue_2av = calcMeleePerdue(marge - 2, comp, this.actor);
          melee_perdue_3av = calcMeleePerdue(marge - 3, comp, this.actor);
          effet_0av_1 = calc_coup1(marge, comp, this.actor);
          effet_0av_2 = calc_coup2(marge, comp, this.actor);
          effet_0av_3 = calc_coup3(marge, comp, this.actor);
          effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
          effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
          effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
          effet_2av_1 = calc_coup1(marge - 2, comp, this.actor);
          effet_2av_2 = calc_coup2(marge - 2, comp, this.actor);
          effet_2av_3 = calc_coup3(marge - 2, comp, this.actor);
          effet_3av_1 = calc_coup1(marge - 3, comp, this.actor);
          effet_3av_2 = calc_coup2(marge - 3, comp, this.actor);
          effet_3av_3 = calc_coup3(marge - 3, comp, this.actor);
          result_diff +=
            "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_0av_1 +
            "' data-effet_0av_2='" +
            effet_0av_2 +
            "' data-effet_0av_1='" +
            effet_0av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue +
            "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
            melee_perdue +
            " pt Mêlée " +
            effet_0av_1 +
            " " +
            effet_0av_2 +
            " " +
            effet_0av_3 +
            "</button><br><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_1av_1 +
            "' data-effet_0av_2='" +
            effet_1av_2 +
            "' data-effet_0av_3='" +
            effet_1av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue_1av +
            "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
            melee_perdue_1av +
            " pt Mêlée " +
            effet_1av_1 +
            " " +
            effet_1av_2 +
            " " +
            effet_1av_3 +
            "</button><br><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_2av_1 +
            "' data-effet_0av_2='" +
            effet_2av_2 +
            "' data-effet_0av_3='" +
            effet_2av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue_2av +
            "><i class='fas fa-coins'></i> <b>2Av</b><br>-" +
            melee_perdue_2av +
            " pt Mêlée " +
            effet_2av_1 +
            " " +
            effet_2av_2 +
            " " +
            effet_2av_3 +
            "</button><br><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
            type_jet +
            "' data-effet_0av_1='" +
            effet_3av_1 +
            "' data-effet_0av_2='" +
            effet_3av_2 +
            "' data-effet_0av_3='" +
            effet_3av_3 +
            "' data-marge=" +
            marge +
            " data-comp=" +
            comp +
            " data-melee=" +
            melee_perdue_3av +
            "><i class='fas fa-coins'></i> <b>3Av</b><br>-" +
            melee_perdue_3av +
            " pt Mêlée " +
            effet_3av_1 +
            " " +
            effet_3av_2 +
            " " +
            effet_3av_3 +
            "</button>";
        }
        /****************************************************/

        /*************Affichage du chat ************************/

        r.toMessage({
          flavor:
            "<div class='card-header'><span> " +
            type_jet +
            "</span></div>" +
            '<div class="mega-roll-attacker"><i class="fas fa-crosshairs"></i> ' +
            canvas.tokens.controlled[0].name +
            " attaque " +
            game.user.targets.values().next().value.name +
            "</div>" +
            result_diff +
            mention +
            assomme,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
        /****************************************************/
      }
    });
  }

  testTir(Nom_acteur, comp, diff, ptardence, bonuspool, bonus) {
    let mod = this.actor.system.talents_combat[comp].score;
    let objet = this.actor.system.talents_combat[comp].label;
    let arme = this.actor.items.filter((i) => i.name === objet);
    let effet_arme = arme[0].system.effet_arme.value;
    let letale = arme[0].system.letale.value;
    let noLetaleMsg = arme[0].system.letale.label;
    effet_arme = effet_arme.split("|")[0];
    let son_arme = "";
    let effet_coup1 = "";
    let effet_coup2 = "";
    let effet_coup3 = "";
    let type_objet = arme[0].type;
    let def_temp = 0;
    let marge;
    let mention = "";
    let melee_perdue = 0;
    let vie_perdue = 0;
    let assomme = "";
    let combat = 0;
    let currentTarget = null;
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    if (ptardence !== "" && retraitAuto) {
      this.actor.update({
        "system.pts_ardence.value":
          this.actor.system.pts_ardence.value - ptardence,
      });
      this.actor.update({
        "system.def_modif.value": ptardence + this.actor.system.def_modif.value,
      });
      this.actor.update({
        "system.combat_modif.value":
          ptardence * 2 + this.actor.system.combat_modif.value,
      });
    }

    let r = new Roll("1d10");
    if (Array.from(game.user.targets).length != 0) {
      currentTarget = Array.from(game.user.targets)[0].actor;
      0;
    }

    if (ptardence !== "") {
      combat =
        this.actor.system.combat_modif.value +
        ptardence * 2 +
        this.actor.system.domaines.combat.value;
    } else {
      combat =
        this.actor.system.combat_modif.value +
        this.actor.system.domaines.combat.value;
    }

    function createRoll(mod, combat, caracValue, bonuspool) {
      // let rollFormula="";
      // if (combat !== 0) {rollFormula = `1d${combat} + 1d${caracValue}`;} else {rollFormula = `1d${caracValue}`;}
      let rollFormula = `1d${combat} + 1d${caracValue}`;

      if (mod !== "0") {
        console.log("mod !  : " + mod);
        rollFormula = `1d${mod} + ` + rollFormula;
      }
      if (bonuspool !== 0) {
        rollFormula += ` + ${bonuspool}`;
      }
      // Supprimer les termes 1d0 de la formule (valeur à 0)
      rollFormula = rollFormula
        .replace(/1d0\s*\+\s*/g, "")
        .replace(/\s*\+\s*1d0\b/g, "")
        .trim();
      return new Roll(rollFormula);
    }

    const caracValue =
      this.actor.system.talents_combat[comp].bonus === "adr"
        ? this.actor.system.caracs.adresse.value
        : this.actor.system.caracs.sens.value;
    mod = mod + bonus;
    r = createRoll(mod, combat, caracValue, bonuspool);
    let type_jet = this.actor.system.talents_combat[comp].label;
    r.evaluate().then(() => {
      let resultat = r.total;
      let result_final = 0;
      let result_diff = "";

      if (
        type_objet == "Arme de lancer" ||
        (type_objet === "Arme de tir" && arme[0].system.charge !== 0)
      ) {
        if (type_objet == "Arme de tir") {
          arme[0].update({ "system.charge": arme[0].system.charge - 1 });
        }
        if (type_objet == "Arme de lancer") {
          arme[0].update({ "system.quantity": arme[0].system.quantity - 1 });
        }
        son_arme = arme[0].system.son;
        if (Array.from(game.user.targets).length != 0) {
          const effectsState = checkEffectsState();
          if (!effectsState.shouldContinue) return;

          const wait = (delay) =>
            new Promise((resolve) => setTimeout(resolve, delay));

          let selectedToken = canvas.tokens.controlled[0];
          let targets = Array.from(game.user.targets);
          const effets_speciaux = effectsState.shouldPlayEffects;
          let offX = Number(arme[0].system.effet_offX?.value ?? 0);
          let offY = Number(arme[0].system.effet_offY?.value ?? 0);
          for (let target of targets) {
            const distance = canvas.grid
              .measureDistance(selectedToken, target)
              .toFixed(1);
            if (game.modules.get("sequencer")?.active && effets_speciaux) {
              new Sequence()
                .effect()
                .file(effet_arme)
                .atLocation({
                  x: canvas.tokens.controlled[0].x + offX,
                  y: canvas.tokens.controlled[0].y + offY,
                })
                .stretchTo(target)
                .repeats(3, 200, 300)
                .play();
              if (
                arme[0].system.sound.value &&
                arme[0].system.sound.value.trim() !== ""
              ) {
                new Sequence()
                  .sound()
                  .file(arme[0].system.sound.value)
                  .fadeInAudio(500)
                  .fadeOutAudio(500)
                  .play();
              }
            }
          }
        }
        // else {
        //   const effets_speciaux = game.settings.get("mega", "effets_speciaux");
        //   if (game.modules.get("sequencer")?.active && effets_speciaux) {
        //     new Sequence()
        //       .sound()
        //       .file(arme[0].system.sound.value)
        //       .fadeInAudio(500)
        //       .fadeOutAudio(500)
        //       .play();
        //   }
        //   const imgSrc =
        //     arme[0].img || arme[0].system.img || arme[0].system.image;
        //   const imgDiv = document.createElement("div");
        //   imgDiv.style.position = "fixed";
        //   imgDiv.style.top = "30px"; // Décalage depuis le haut
        //   imgDiv.style.left = "30px"; // Décalage depuis la gauche
        //   imgDiv.style.transform = "none"; // Pas de centrage
        //   imgDiv.style.zIndex = 9999;
        //   imgDiv.style.pointerEvents = "none";
        //   imgDiv.style.transition = "opacity 0.7s";
        //   imgDiv.style.opacity = "0";
        //   imgDiv.style.borderRadius = "50%";
        //   imgDiv.style.background = "rgba(0,0,0,0.7)";
        //   imgDiv.style.boxShadow = "0 0 40px #000";
        //   imgDiv.style.padding = "20px";
        //   imgDiv.innerHTML = `<img src="${imgSrc}" style="display:block;max-width: 220px; max-height: 220px; border-radius: 50%; border: 4px solid #fff; box-shadow: 0 0 20px #000;">`;
        //   document.body.appendChild(imgDiv);

        //   // Fade in
        //   setTimeout(() => {
        //     imgDiv.style.opacity = "1";
        //   }, 10);

        //   // Reste 3 secondes, puis fade out
        //   setTimeout(() => {
        //     imgDiv.style.opacity = "0";
        //     setTimeout(() => imgDiv.remove(), 700);
        //   }, 3010);
        // }
        /**********Animation du tir ************/
        // }

        if (diff !== 0) {
          def_temp = diff;
        } else {
          def_temp =
            currentTarget.system.def.value +
            currentTarget.system.def_modif.value;
        }
        result_final = resultat - def_temp;
        if (result_final >= 0) {
          marge = Math.floor(result_final / 3);
          result_diff =
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> R\u00e9ussite <span class="mega-roll-margin">Marge : ' +
            marge +
            "</span></div>";
        } else {
          marge = Math.ceil(result_final / 3);
          result_diff =
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> \u00c9chec <span class="mega-roll-margin">Marge : ' +
            marge +
            "</span></div>";
        }

        /**********Points de mêlées perdus + effets ************/
        if (Array.from(game.user.targets).length != 0) {
          function getCombatValues(actor, comp, marge) {
            const talents = actor.system.talents_combat[comp];
            const values = {
              melee_perdue: talents[`av${Math.min(marge, 4)}`],
              effet_coup1: talents[`effet_ac_${Math.min(marge, 4)}_1`],
              effet_coup2: talents[`effet_ac_${Math.min(marge, 4)}_2`],
              effet_coup3: talents[`effet_ac_${Math.min(marge, 4)}_3`],
            };
            return values;
          }

          if (marge >= 0 && result_final >= 0) {
            const { melee_perdue, effet_coup1, effet_coup2, effet_coup3 } =
              getCombatValues(this.actor, comp, marge);

            if (melee_perdue < 0) {
              melee_perdue = 0;
            }

            if (marge === 0 || marge > 3) {
              if (letale) {
                result_diff += `<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ${
                  game.user.targets.values().next().value.name
                } perd <strong>${melee_perdue}</strong>pt de Mêlée</div>`;
              }
            }
          }

          /**********Effets optionnels ************/

          function getEffetCoupHtml(effet) {
            const effets = {
              H: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>',
              A: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>',
              S: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>',
              R: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>',
              I: '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>',
              P: '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>',
              T: '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>',
              D: '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>',
            };
            return effets[effet] || "";
          }

          effet_coup1 = getEffetCoupHtml(effet_coup1);
          effet_coup2 = getEffetCoupHtml(effet_coup2);
          effet_coup3 = getEffetCoupHtml(effet_coup3);
        }
        /********** Calcul de la vie perdue ************/
        if (letale) {
          if (Array.from(game.user.targets).length != 0) {
            melee_perdue = calcMeleePerdue(marge, comp, this.actor);
            melee_perdue = melee_perdue;
            if (melee_perdue < 0) {
              melee_perdue = 0;
            }
            if ((marge == 0 || marge > 3) && result_final >= 0) {
              const _dmc3 = calcViePerdue(melee_perdue, comp, this.actor);
              vie_perdue = _dmc3.vie_perdue;
              result_diff =
                result_diff +
                '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
                game.user.targets.values().next().value.name +
                " perd <strong>" +
                vie_perdue +
                "</strong> pt de Vie</div>";
              if (retraitAuto) {
                const updatePromise = safeDocumentUpdate(currentTarget, {
                  "system.health.value":
                    currentTarget.system.health.value - vie_perdue,
                  "system.melee_impair": _dmc3.new_melee_impair,
                });
                if (updatePromise) {
                  updatePromise.then(() => {
                    safeDocumentUpdate(currentTarget, {
                      "system.power.value":
                        currentTarget.system.power.value - melee_perdue,
                    });
                  });
                }
              }
            }

            /*************Boutons conso AV **********************/

            let melee_perdue_1av = 0;
            let melee_perdue_2av = 0;
            let melee_perdue_3av = 0;
            let vie_perdue_1av = 0;
            let vie_perdue_2av = 0;
            let vie_perdue_3av = 0;
            let effet_0av_1 = "";
            let effet_0av_2 = "";
            let effet_0av_3 = "";
            let effet_1av_1 = "";
            let effet_1av_2 = "";
            let effet_1av_3 = "";
            let effet_2av_1 = "";
            let effet_2av_2 = "";
            let effet_2av_3 = "";
            let effet_3av_1 = "";
            let effet_3av_2 = "";
            let effet_3av_3 = "";
            if (marge == 1) {
              melee_perdue_1av = calcMeleePerdue(marge - 1, comp, this.actor);
              if (melee_perdue_1av < 0) {
                melee_perdue_1av = 0;
              }
              effet_0av_1 = calc_coup1(marge, comp, this.actor);
              effet_0av_2 = calc_coup2(marge, comp, this.actor);
              effet_0av_3 = calc_coup3(marge, comp, this.actor);
              effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
              effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
              effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
              result_diff +=
                "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_0av_1 +
                "' data-effet_0av_2='" +
                effet_0av_2 +
                "' data-effet_0av_3='" +
                effet_0av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue +
                "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
                melee_perdue +
                " pt Mêlée " +
                effet_0av_1 +
                " " +
                effet_0av_2 +
                " " +
                effet_0av_3 +
                "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_1av_1 +
                "' data-effet_0av_2='" +
                effet_1av_2 +
                "' data-effet_0av_3='" +
                effet_1av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue_1av +
                "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
                melee_perdue_1av +
                " pt Mêlée " +
                effet_1av_1 +
                " " +
                effet_1av_2 +
                " " +
                effet_1av_3 +
                "</button>";
            }
            if (marge == 2) {
              melee_perdue_1av = calcMeleePerdue(marge - 1, comp, this.actor);
              melee_perdue_2av = calcMeleePerdue(marge - 2, comp, this.actor);
              if (melee_perdue_1av < 0) {
                melee_perdue_1av = 0;
              }
              if (melee_perdue_2av < 0) {
                melee_perdue_2av = 0;
              }
              effet_0av_1 = calc_coup1(marge, comp, this.actor);
              effet_0av_2 = calc_coup2(marge, comp, this.actor);
              effet_0av_3 = calc_coup3(marge, comp, this.actor);
              effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
              effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
              effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
              effet_2av_1 = calc_coup1(marge - 2, comp, this.actor);
              effet_2av_2 = calc_coup2(marge - 2, comp, this.actor);
              effet_2av_3 = calc_coup3(marge - 2, comp, this.actor);
              result_diff +=
                "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_0av_1 +
                "' data-effet_0av_2='" +
                effet_0av_2 +
                "' data-effet_0av_3='" +
                effet_0av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue +
                "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
                melee_perdue +
                " pt Mêlée " +
                effet_0av_1 +
                " " +
                effet_0av_2 +
                " " +
                effet_0av_3 +
                "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_1av_1 +
                "' data-effet_0av_2='" +
                effet_1av_2 +
                "' data-effet_0av_3='" +
                effet_1av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue_1av +
                "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
                melee_perdue_1av +
                " pt Mêlée " +
                effet_1av_1 +
                " " +
                effet_1av_2 +
                " " +
                effet_1av_3 +
                "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_2av_1 +
                "' data-effet_0av_2='" +
                effet_2av_2 +
                "' data-effet_0av_3='" +
                effet_2av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue_2av +
                "><i class='fas fa-coins'></i> <b>2Av</b><br>-" +
                melee_perdue_2av +
                " pt Mêlée " +
                effet_2av_1 +
                " " +
                effet_2av_2 +
                " " +
                effet_2av_3 +
                "</button>";
            }
            if (marge == 3) {
              melee_perdue_1av = calcMeleePerdue(marge - 1, comp, this.actor);
              melee_perdue_2av = calcMeleePerdue(marge - 2, comp, this.actor);
              melee_perdue_3av = calcMeleePerdue(marge - 3, comp, this.actor);
              if (melee_perdue_1av < 0) {
                melee_perdue_1av = 0;
              }
              if (melee_perdue_2av < 0) {
                melee_perdue_2av = 0;
              }
              if (melee_perdue_3av < 0) {
                melee_perdue_3av = 0;
              }
              effet_0av_1 = calc_coup1(marge, comp, this.actor);
              effet_0av_2 = calc_coup2(marge, comp, this.actor);
              effet_0av_3 = calc_coup3(marge, comp, this.actor);
              effet_1av_1 = calc_coup1(marge - 1, comp, this.actor);
              effet_1av_2 = calc_coup2(marge - 1, comp, this.actor);
              effet_1av_3 = calc_coup3(marge - 1, comp, this.actor);
              effet_2av_1 = calc_coup1(marge - 2, comp, this.actor);
              effet_2av_2 = calc_coup2(marge - 2, comp, this.actor);
              effet_2av_3 = calc_coup3(marge - 2, comp, this.actor);
              effet_3av_1 = calc_coup1(marge - 3, comp, this.actor);
              effet_3av_2 = calc_coup2(marge - 3, comp, this.actor);
              effet_3av_3 = calc_coup3(marge - 3, comp, this.actor);
              result_diff +=
                "<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_0av_1 +
                "' data-effet_0av_2='" +
                effet_0av_2 +
                "' data-effet_0av_1='" +
                effet_0av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue +
                "><i class='fas fa-coins'></i> <b>0Av</b><br>-" +
                melee_perdue +
                " pt Mêlée " +
                effet_0av_1 +
                " " +
                effet_0av_2 +
                " " +
                effet_0av_3 +
                "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_1av_1 +
                "' data-effet_0av_2='" +
                effet_1av_2 +
                "' data-effet_0av_3='" +
                effet_1av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue_1av +
                "><i class='fas fa-coins'></i> <b>1Av</b><br>-" +
                melee_perdue_1av +
                " pt Mêlée " +
                effet_1av_1 +
                " " +
                effet_1av_2 +
                " " +
                effet_1av_3 +
                "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_2av_1 +
                "' data-effet_0av_2='" +
                effet_2av_2 +
                "' data-effet_0av_3='" +
                effet_2av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue_2av +
                "><i class='fas fa-coins'></i> <b>2Av</b><br>-" +
                melee_perdue_2av +
                " pt Mêlée " +
                effet_2av_1 +
                " " +
                effet_2av_2 +
                " " +
                effet_2av_3 +
                "</button><button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
                type_jet +
                "' data-effet_0av_1='" +
                effet_3av_1 +
                "' data-effet_0av_2='" +
                effet_3av_2 +
                "' data-effet_0av_3='" +
                effet_3av_3 +
                "' data-marge=" +
                marge +
                " data-comp=" +
                comp +
                " data-melee=" +
                melee_perdue_3av +
                "><i class='fas fa-coins'></i> <b>3Av</b><br>-" +
                melee_perdue_3av +
                " pt Mêlée " +
                effet_3av_1 +
                " " +
                effet_3av_2 +
                " " +
                effet_3av_3 +
                "</button>";
            }
          }
          /****************************************************/

          /*************Affichage du chat ************************/
          let nomCible = "";
          if (Array.from(game.user.targets).length != 0) {
            nomCible = game.user.targets.values().next().value.name;
          }
          r.toMessage({
            flavor:
              "<div class='card-header'><span> " +
              type_jet +
              "</span></div>" +
              '<div class="mega-roll-attacker"><i class="fas fa-crosshairs"></i> ' +
              Nom_acteur +
              " attaque " +
              nomCible +
              "</div>" +
              result_diff +
              mention +
              assomme,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
          /****************************************************/
        } else {
          if (result_final >= 0) {
            let nomCible = "";
            if (Array.from(game.user.targets).length != 0) {
              nomCible = game.user.targets.values().next().value.name;
            }
            r.toMessage({
              flavor:
                "<div class='card-header'><span>" +
                type_jet +
                "</span></div><br>" +
                '<div class="mega-roll-attacker"><i class="fas fa-crosshairs"></i> ' +
                Nom_acteur +
                " attaque " +
                nomCible +
                "</div>" +
                result_diff +
                '<div class="result_diff">' +
                noLetaleMsg +
                "</div>",
              speaker: ChatMessage.getSpeaker({
                actor: this.actor,
              }),
            });
          } else {
            r.toMessage({
              flavor:
                "<div class='card-header'><span>" +
                type_jet +
                "</span></div>" +
                result_diff,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            });
          }
        }
        // }
        // else {
        //   r.toMessage({
        //     flavor:
        //       "<div class='card-header'><span>" + type_jet + "</span></div>",
        //     speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        //   });
        // }
      } else if (type_objet === "Arme de tir" && arme[0].system.charge === 0) {
        ui.notifications.error("L'arme n'a pas de charge");
      }
    });
  }

  testTrait(type_test_1, ev, carac, carac2, bonuspool, diff, ptardence) {
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let comp = ev.currentTarget.getAttribute("value");
    let traitName = this.actor.system.caracs[comp].label;
    let ardenceBet = ptardence;
    let act = this.actor;
    let btns_1 = {};
    let btns_2 = {};
    let btns_3 = {};
    let type_test = "";
    let rgardencetotal = ptardence * 2;
    let ardence_domaine = 0;
    let ardence_trait1 = 0;
    let ardence_trait2 = 0;
    const myDialogOptions = {
      top: 100,
      left: 100,
      classes: ["dialog", "window-dialog"],
    };
    const myDialogOptions_ardence = {
      top: 100,
      left: 100,
      width: 600,
      height: 200,
      classes: ["dialog", "window-dialog"],
    };
    if (retraitAuto) {
      this.actor.update({
        "system.pts_ardence.value":
          this.actor.system.pts_ardence.value - ptardence,
      });
    }
    if (ptardence >= 1) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
    }
    if (ptardence >= 2) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
    }
    if (ptardence >= 3) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
    }
    if (ptardence >= 4) {
      btns_1[0] = { label: "Passer", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
      btns_1[4] = { label: "8 Rg", callback: () => (ardence_domaine = 8) };
    }
    let diag1 = new Dialog(
      {
        title: traitName.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          comp +
          " ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Trait " +
          comp.toUpperCase() +
          "</b> ?</span><br><br>",
        buttons: btns_1,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_domaine;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_2[0] = {
              label: "Aucun",
              callback: () => (ardence_trait1 = 0),
            };
          }
          if (ptardence >= 1) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
          }
          if (ptardence >= 2) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
            btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
          }
          if (ptardence >= 3) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
            btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
            btns_2[3] = { label: "6 Rg", callback: () => (ardence_trait1 = 6) };
          }
          if (ptardence >= 4) {
            btns_2[0] = {
              label: "Passer",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
            btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
            btns_2[3] = { label: "6 Rg", callback: () => (ardence_trait1 = 6) };
            btns_2[4] = { label: "8 Rg", callback: () => (ardence_trait1 = 8) };
          }
          diag2.render(true);
        },
      },
      myDialogOptions_ardence,
    );

    let diag2 = new Dialog(
      {
        title: traitName.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          this.actor.system.caracs[carac].label +
          "</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Trait " +
          this.actor.system.caracs[carac].label.toUpperCase() +
          "</b> ?</span><br><br>",
        buttons: btns_2,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_trait1;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait2 = 0),
            };
          }
          if (ptardence >= 1) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
          }
          if (ptardence >= 2) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
          }
          if (ptardence >= 3) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait2 = 6) };
          }
          if (ptardence >= 4) {
            btns_3[0] = {
              label: "Passer",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait2 = 6) };
            btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait2 = 8) };
          }
          if (type_test_1 === "trois") {
            diag3.render(true);
          } else {
            let comp = ev.currentTarget.getAttribute("value");
            let marge = "";
            let de_domaine = "";
            let de_trait1 =
              parseFloat(act.system.caracs[carac].value) +
              parseFloat(ardence_trait1);
            let de_trait2 =
              parseFloat(act.system.domaines[carac2].value) +
              parseFloat(ardence_trait2);
            let mod =
              "1d" + de_domaine + " + 1d" + de_trait1 + " + 1d" + de_trait2;
            if (bonuspool !== 0) {
              mod = mod + " + " + bonuspool;
            }
            let mod2 = "";
            let mod1 = "";
            let rollFormula1 = "";
            let rollFormula2 = "";
            let result_final = "";
            let r1 = "";
            let r2 = "";
            let result_diff = "";
            let rollFormula = "";
            let r = new Roll("1d10");
            if (type_test_1 !== "duel") {
              let des = mod.match(/\d+d\d+/g);
              let type_jet = this.actor.system.talents[comp].label;
              async function rollDice(diceArray, n, bonuspool, type_jet) {
                let results = await Promise.all(
                  diceArray.map((die) => rollAndShowDice(die)),
                );
                let entete =
                  "<div class='card-header'><span>" +
                  type_jet +
                  "</span></div>" +
                  "<div><span>" +
                  result_diff +
                  "</span></div>";

                if (n !== 0) {
                  await postToChat(
                    diceArray,
                    results,
                    bonuspool,
                    `${entete}<div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> JET INITIAL</div>`,
                  );
                }

                for (let i = 0; i < n; i++) {
                  let rerollIndex = await chooseDieToReroll(
                    diceArray,
                    results.map((r) => r.total),
                  );
                  if (rerollIndex === null) break; // Si le joueur choisit de ne pas relancer
                  let rerolledDie = diceArray[rerollIndex];
                  results[rerollIndex] = await rollAndShowDice(rerolledDie);
                  if (i !== n - 1) {
                    await postToChat(
                      diceArray,
                      results,
                      bonuspool,
                      `${entete}<div class="mega-roll-reroll"><i class="fas fa-sync-alt"></i> RELANCE</div><div class="mega-roll-reroll-info"><i class="fas fa-redo"></i> Dé relancé : ${rerolledDie}</div>`,
                    );
                  }
                }

                let resultat =
                  results.reduce((sum, roll) => sum + roll.total, 0) +
                  bonuspool;
                let formule = 0;
                let detail_result = 0;
                if (bonuspool !== 0) {
                  formule = r.formula + " + " + bonuspool;
                  detail_result = r.result + " + " + bonuspool;
                } else {
                  formule = r.formula;
                  detail_result = r.result;
                }
                let final = resultat - diff;
                if (diff !== 0) {
                  if (final >= 0) {
                    final = Math.floor(final / 3);
                    result_diff =
                      entete +
                      '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                      diff +
                      '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                      final +
                      "</span></div>";
                  } else {
                    final = Math.ceil(final / 3);
                    result_diff =
                      entete +
                      '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                      diff +
                      '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                      final +
                      "</span></div>";
                  }
                } else {
                  result_diff =
                    entete +
                    '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
                }

                await postToChat(
                  diceArray,
                  results,
                  bonuspool,
                  `${result_diff}`,
                );
                return results.map((r) => r.total);
              }

              async function rollAndShowDice(die) {
                let roll = new Roll(die);
                await roll.evaluate({ async: true });
                if (game.dice3d) {
                  await game.dice3d.showForRoll(roll, game.user, true);
                }
                return roll;
              }

              async function chooseDieToReroll(diceArray, results) {
                return new Promise((resolve) => {
                  let buttons = {
                    validate: {
                      label: `<i class="fas fa-check"></i><br><span style="font-size:0.8em">Ne pas relancer</span>`,
                      callback: () => resolve(null),
                    },
                  };
                  results.forEach((result, index) => {
                    buttons[`die_${index}`] = {
                      label: `<span style="display:flex;flex-direction:column;align-items:center;gap:2px"><i class="fas fa-dice"></i><span style="font-size:0.85em;opacity:0.85">${diceArray[index]}</span><span style="font-size:1.3em;font-weight:bold">${result}</span></span>`,
                      callback: () => resolve(index),
                    };
                  });
                  new Dialog(
                    {
                      title: "RELANCE D'UN DÉ",
                      content:
                        "<div class='card-header'><span>Relancer un dé</span></div>" +
                        `<br><center><span class="bouton_texte">Cliquez sur un dé pour le relancer, ou ne pas relancer</span></center><br>`,
                      buttons: buttons,
                      close: () => resolve(null),
                    },
                    myDialogOptions,
                  ).render(true);
                });
              }

              async function postToChat(diceArray, rolls, bonuspool, message) {
                let total = rolls.reduce((sum, roll) => sum + roll.total, 0);
                let diceFormula = diceArray.join(" + ");
                if (bonuspool > 0) diceFormula += " + " + bonuspool;
                if (bonuspool < 0) diceFormula += " - " + Math.abs(bonuspool);
                let diceDetails = rolls
                  .map(
                    (r, index) => `
                <section class="tooltip-part">
                  <div class="dice">
                    <header class="part-header flexrow">
                      <span class="part-formula">${diceArray[index]}</span>
                      <span class="part-total">${r.total}</span>
                    </header>
                    <ol class="dice-rolls">
                      <li class="roll die d${r.dice[0].faces}">${r.total}</li>
                    </ol>
                  </div>
                </section>`,
                  )
                  .join("");
                let chatData = {
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker(),
                  content: `${message}
                <div class="dice-roll" data-action="expandRoll">
                  <div class="dice-result">
                    <div class="dice-formula">${diceFormula}</div>
                    <div class="dice-tooltip"><div class="wrapper">${diceDetails}</div></div>
                    <h4 class="dice-total">${total + bonuspool}</h4>
                  </div>
                </div>`,
                };
                await ChatMessage.create(chatData, {});
              }

              function formatResults(diceArray, rolls) {
                return rolls
                  .map((r, index) => `${diceArray[index]} : ${r.total}`)
                  .join(", ");
              }

              rollDice(des, ardenceBet, bonuspool, type_jet);
            } else {
              r1 = new Roll("1d" + de_domaine);
              r1.evaluate().then(() => {
                game.dice3d?.showForRoll(r1, game.user, true);
                let resultat1 = r1.total;
                r2 = new Roll("1d" + de_trait1);
                r2.evaluate().then(() => {
                  game.dice3d?.showForRoll(r2, game.user, true);
                  let resultat2 = r2.total;
                  let result_diff = "";
                  carac =
                    carac.charAt(0).toUpperCase() +
                    carac.substring(1).toLowerCase();
                  carac2 =
                    carac2.charAt(0).toUpperCase() +
                    carac2.substring(1).toLowerCase();
                  comp =
                    comp.charAt(0).toUpperCase() +
                    comp.substring(1).toLowerCase();
                  let final = resultat1 - resultat2;

                  if (final > 0) {
                    marge = Math.floor(final / 3);
                    result_diff =
                      "<div class='card-header'><span>" +
                      comp +
                      " vs " +
                      carac +
                      '</span></div><div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> ' +
                      comp +
                      " : " +
                      resultat1 +
                      " &nbsp;|&nbsp; " +
                      carac +
                      " : " +
                      resultat2 +
                      '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> ' +
                      comp +
                      " l'emporte <span class='mega-roll-margin'>Marge : " +
                      marge +
                      "</span></div>";
                  } else {
                    marge = Math.floor((resultat2 - resultat1) / 3);
                    result_diff =
                      "<div class='card-header'><span>" +
                      comp +
                      " vs " +
                      carac +
                      '</span></div><div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> ' +
                      comp +
                      " : " +
                      resultat1 +
                      " &nbsp;|&nbsp; " +
                      carac +
                      " : " +
                      resultat2 +
                      '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> ' +
                      carac +
                      " l'emporte <span class='mega-roll-margin'>Marge : " +
                      marge +
                      "</span></div>";
                  }

                  var chatData = {
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker(),
                    content: result_diff,
                  };
                  ChatMessage.create(chatData, {});
                });
              });
            }
          }
        },
      },
      myDialogOptions_ardence,
    );
    let label_carac2 = "";
    if (type_test_1 === "trois") {
      label_carac2 = this.actor.system.domaines[carac2].label;
    } else {
      label_carac2 = this.actor.system.caracs[carac2].label;
    }
    let diag3 = new Dialog(
      {
        title: traitName.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          label_carac2 +
          "</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au <b>Domaine " +
          label_carac2.toUpperCase() +
          "</b> ?</span><br><br>",
        buttons: btns_3,
        close: () => {
          rgardencetotal = rgardencetotal - ardence_trait2;
          ptardence = rgardencetotal / 2;
          this.testTrait2(
            type_test_1,
            ev,
            carac,
            carac2,
            diff,
            ptardence,
            bonuspool,
            ardence_domaine,
            ardence_trait1,
            ardence_trait2,
            ardenceBet,
          );
        },
      },
      myDialogOptions_ardence,
    );

    if (ptardence > 0) {
      console.log("ceci est un duel");
      diag1.render(true);
    } else {
      console.log("ceci est un duel2");
      let comp = ev.currentTarget.getAttribute("value");
      let marge = "";
      let de_domaine = "";
      if (
        comp !== "communication" &&
        comp !== "pratique" &&
        comp !== "culture_milieux"
      ) {
        type_test = "traits";
      } else {
        type_test = "domaines";
      }
      if (type_test === "traits") {
        de_domaine =
          parseFloat(this.actor.system.caracs[comp].value) +
          parseFloat(ardence_domaine);
      } else {
        de_domaine =
          parseFloat(this.actor.system.domaines[comp].value) +
          parseFloat(ardence_domaine);
      }
      let de_trait1 =
        parseFloat(this.actor.system.caracs[carac].value) +
        parseFloat(ardence_trait1);
      let value_carac2 = "";
      if (type_test_1 === "trois") {
        value_carac2 = this.actor.system.domaines[carac2].value;
      } else {
        value_carac2 = this.actor.system.caracs[carac2].value;
      }
      let de_trait2 = parseFloat(value_carac2) + parseFloat(ardence_trait2);
      let mod = "1d" + de_domaine + " + 1d" + de_trait1 + " + 1d" + de_trait2;
      if (bonuspool !== 0) {
        mod = mod + " + " + bonuspool;
      }
      let mod2 = "";
      let mod1 = "";
      let result_final = "";
      let r1 = "";
      let r2 = "";
      let result_diff = "";
      if (type_test_1 === "duel") {
        mod1 = "1d" + de_domaine;
        mod2 = "1d" + de_trait1;
      }
      let rollFormula = "";
      let r = new Roll("1d10");
      if (type_test_1 !== "duel") {
        rollFormula = mod;
        r = new Roll(rollFormula);
        r.evaluate().then(() => {
          let formule = r.formula;
          let resultat = r.total;
          let result_diff = "";
          let final = resultat - diff;
          if (diff !== 0) {
            if (final >= 0) {
              final = Math.floor(final / 3);
              result_diff =
                '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                diff +
                '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                final +
                "</span></div>";
            } else {
              final = Math.ceil(final / 3);
              result_diff =
                '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                diff +
                '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                final +
                "</span></div>";
            }
          } else {
            result_diff =
              '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
          }
          comp = comp.charAt(0).toUpperCase() + comp.substring(1).toLowerCase();
          r.toMessage({
            flavor:
              "<div class='card-header'><span>" +
              comp +
              "</span></div>" +
              result_diff,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
        });
      } else {
        r1 = new Roll("1d" + de_domaine);
        r1.evaluate().then(() => {
          game.dice3d?.showForRoll(r1, game.user, true);
          let resultat1 = r1.total;
          r2 = new Roll("1d" + de_trait1);
          r2.evaluate().then(() => {
            game.dice3d?.showForRoll(r2, game.user, true);
            let resultat2 = r2.total;
            let result_diff = "";

            carac =
              carac.charAt(0).toUpperCase() + carac.substring(1).toLowerCase();
            carac2 =
              carac2.charAt(0).toUpperCase() +
              carac2.substring(1).toLowerCase();
            comp =
              comp.charAt(0).toUpperCase() + comp.substring(1).toLowerCase();
            let final = resultat1 - resultat2;

            if (final > 0) {
              marge = Math.floor(final / 3);
              result_diff =
                "<div class='card-header'><span>" +
                comp +
                " vs " +
                carac +
                '</span></div><div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> ' +
                comp +
                " : " +
                resultat1 +
                " &nbsp;|&nbsp; " +
                carac +
                " : " +
                resultat2 +
                '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> ' +
                comp +
                " l'emporte <span class='mega-roll-margin'>Marge : " +
                marge +
                "</span></div>";
            } else {
              marge = Math.floor((resultat2 - resultat1) / 3);
              result_diff =
                "<div class='card-header'><span>" +
                comp +
                " vs " +
                carac +
                '</span></div><div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> ' +
                comp +
                " : " +
                resultat1 +
                " &nbsp;|&nbsp; " +
                carac +
                " : " +
                resultat2 +
                '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> ' +
                carac +
                " l'emporte <span class='mega-roll-margin'>Marge : " +
                marge +
                "</span></div>";
            }

            var chatData = {
              user: game.user._id,
              speaker: ChatMessage.getSpeaker(),
              content: result_diff,
            };
            ChatMessage.create(chatData, {});
          });
        });
      }
    }
  }

  testTrait2(
    type_test,
    ev,
    carac,
    carac2,
    diff,
    ptardence,
    bonuspool,
    ardence_domaine,
    ardence_trait1,
    ardence_trait2,
    ardenceBet,
  ) {
    let comp = ev.currentTarget.getAttribute("value");
    let marge = "";
    let de_domaine = "";
    const myDialogOptions = {
      top: 100,
      left: 100,
    };
    if (
      comp !== "communication" &&
      comp !== "pratique" &&
      comp !== "culture_milieux"
    ) {
      type_test = "traits";
    } else {
      type_test = "domaines";
    }
    if (type_test === "traits") {
      de_domaine =
        parseFloat(this.actor.system.caracs[comp].value) +
        parseFloat(ardence_domaine);
    } else {
      de_domaine =
        parseFloat(this.actor.system.domaines[comp].value) +
        parseFloat(ardence_domaine);
    }
    let de_trait1 =
      parseFloat(this.actor.system.caracs[carac].value) +
      parseFloat(ardence_trait1);
    let de_trait2 =
      parseFloat(this.actor.system.domaines[carac2].value) +
      parseFloat(ardence_trait2);
    let mod = "1d" + de_domaine + " + 1d" + de_trait1 + " + 1d" + de_trait2;
    if (bonuspool !== 0) {
      mod = mod + " + " + bonuspool;
    }
    let result_diff = "";
    let des = mod.match(/\d+d\d+/g);
    async function rollDice(diceArray, n, bonuspool) {
      let results = await Promise.all(
        diceArray.map((die) => rollAndShowDice(die)),
      );
      let entete = "<div class='card-header'><span>" + comp + "</span></div>";

      if (n !== 0) {
        await postToChat(
          diceArray,
          results,
          bonuspool,
          `${entete}<div class="mega-roll-diff"><i class="fas fa-dice-d6"></i> JET INITIAL — DIFF ${diff}</div>`,
        );
      }

      for (let i = 0; i < n; i++) {
        let rerollIndex = await chooseDieToReroll(
          diceArray,
          results.map((r) => r.total),
        );
        if (rerollIndex === null) break; // Si le joueur choisit de ne pas relancer
        let rerolledDie = diceArray[rerollIndex];
        results[rerollIndex] = await rollAndShowDice(rerolledDie);
        if (i !== n - 1) {
          await postToChat(
            diceArray,
            results,
            bonuspool,
            `${entete}<div class="mega-roll-reroll"><i class="fas fa-sync-alt"></i> RELANCE — DIFF ${diff}</div><div class="mega-roll-reroll-info"><i class="fas fa-redo"></i> Dé relancé : ${rerolledDie}</div>`,
          );
        }
      }

      let resultat =
        results.reduce((sum, roll) => sum + roll.total, 0) + bonuspool;
      let formule = 0;
      let detail_result = 0;
      let final = resultat - diff;
      if (diff !== 0) {
        if (final >= 0) {
          final = Math.floor(final / 3);
          result_diff =
            entete +
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
            final +
            "</span></div>";
        } else {
          final = Math.ceil(final / 3);
          result_diff =
            entete +
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
            final +
            "</span></div>";
        }
      } else {
        result_diff =
          entete +
          '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
      }

      await postToChat(diceArray, results, bonuspool, `${result_diff}`);
      return results.map((r) => r.total);
    }

    async function rollAndShowDice(die) {
      let roll = new Roll(die);
      await roll.evaluate({ async: true });
      if (game.dice3d) {
        await game.dice3d.showForRoll(roll, game.user, true);
      }
      return roll;
    }

    async function chooseDieToReroll(diceArray, results) {
      return new Promise((resolve) => {
        let buttons = {
          validate: {
            label: `<i class="fas fa-check"></i><br><span style="font-size:0.8em">Ne pas relancer</span>`,
            callback: () => resolve(null),
          },
        };
        results.forEach((result, index) => {
          buttons[`die_${index}`] = {
            label: `<span style="display:flex;flex-direction:column;align-items:center;gap:2px"><i class="fas fa-dice"></i><span style="font-size:0.85em;opacity:0.85">${diceArray[index]}</span><span style="font-size:1.3em;font-weight:bold">${result}</span></span>`,
            callback: () => resolve(index),
          };
        });
        new Dialog(
          {
            title: "RELANCE D'UN DÉ",
            content:
              "<div class='card-header'><span>Relancer un dé</span></div>" +
              `<br><center><span class="bouton_texte">Cliquez sur un dé pour le relancer, ou ne pas relancer</span></center><br>`,
            buttons: buttons,
            close: () => resolve(null),
          },
          myDialogOptions,
        ).render(true);
      });
    }

    async function postToChat(diceArray, rolls, bonuspool, message) {
      let total = rolls.reduce((sum, roll) => sum + roll.total, 0);
      let formattedResults = rolls
        .map(
          (r, index) =>
            `<div class="dice-result">${diceArray[index]} : ${r.total}</div>`,
        )
        .join("");

      // Construire la formule des dés
      let diceFormula =
        diceArray.join(" + ") + (bonuspool !== 0 ? ` + ${bonuspool}` : "");

      // Construire les détails des résultats des dés
      let diceDetails = rolls
        .map(
          (r, index) => `
			<section class="tooltip-part">
				<div class="dice">
					<header class="part-header flexrow">
						<span class="part-formula">${diceArray[index]}</span>
						<span class="part-total">${r.total}</span>
					</header>
					<ol class="dice-rolls">
						<li class="roll die d${r.dice[0].faces}">${r.total}</li>
					</ol>
				</div>
			</section>
		`,
        )
        .join("");

      let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: `${message}
			<div class="dice-roll" data-action="expandRoll">
				<div class="dice-result">
					<div class="dice-formula">${diceFormula}</div>
					<div class="dice-tooltip">
          <div class="wrapper">
						${diceDetails}
            </div>
					</div>
					<h4 class="dice-total">${total + bonuspool}</h4>
				</div>
			</div>`,
      };
      await ChatMessage.create(chatData, {});
    }

    function formatResults(diceArray, rolls) {
      return rolls
        .map((r, index) => `${diceArray[index]} : ${r.total}`)
        .join(", ");
    }

    rollDice(des, ardenceBet, bonuspool);
  }

  pouvoir2(
    diff,
    rgtotal,
    ptardencetotal,
    ardence,
    rgardencetotal,
    ardence_trait,
    ardence_pouvoir,
    ardence_resonnance,
    sens,
    caractere,
    resonnance,
    ptardence,
    dataType,
    score_transfert,
    score_transit,
    spe_transfert,
    spe_transit,
  ) {
    let result_diff = 0;
    if (ardence === 1) {
      rgardencetotal = rgardencetotal - ardence_trait;
      ptardence = rgardencetotal / 2;
      let r = new Roll("1d10");
      if (dataType == "Transit") {
        const tokens = canvas.tokens.controlled;
        if (tokens.length != 0 && effets_speciaux) {
          animPouvoir();
        }
        rgtotal = score_transit + spe_transit + ardence_pouvoir;
        resonnance += ardence_resonnance;
        sens += ardence_trait;
        r = new Roll("1d" + rgtotal + "+1d" + resonnance + "+1d" + sens);
      } else if (dataType == "Transfert") {
        const tokens = canvas.tokens.controlled;
        if (tokens.length != 0 && effets_speciaux) {
          animPouvoir();
        }
        rgtotal = score_transfert + spe_transfert + ardence_pouvoir;
        resonnance += ardence_resonnance;
        sens += ardence_trait;
        //relancer les dés ici (david)
        r = new Roll("1d" + rgtotal + "+1d" + resonnance + "+1d" + caractere);
        r.roll(1);
        let resultat = r.total;
        let final = resultat - diff;
        if (diff !== 0) {
          if (final >= 0) {
            final = Math.floor(final / 3);
            result_diff =
              '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
              diff +
              '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
              final +
              "</span></div>";
          } else {
            final = Math.ceil(final / 3);
            result_diff =
              '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
              diff +
              '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
              final +
              "</span></div>";
          }
        } else {
          result_diff =
            '<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>';
        }

        r.toMessage({
          flavor:
            "<div class='card-header'><span>" +
            dataType +
            "</span></div>" +
            "<div><span>" +
            result_diff +
            "</span></div>",
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
      }
      let result1 =
        parseFloat(this.actor.system.pts_ardence.value) -
        parseFloat(ptardencetotal);
      if (this.actor.system.pts_ardence.value > 0 && retraitAuto) {
        this.actor.update({ "system.pts_ardence.value": result1 });
      }
    }
    let result2 = parseFloat(this.actor.system.pts_resonnance.value) - 1;
    if (this.actor.system.pts_resonnance.value > 0 && retraitAuto) {
      this.actor.update({ "system.pts_resonnance.value": result2 });
    }
  }

  createMessage(rollFormula, rollResult, rollType) {
    var templateData = {
      data: {
        rollType: { value: rollType },
        rollFormula: { value: rollFormula },
        rollResult: { value: rollResult },
      },
    };

    let template = "systems/mega/templates/cards/roll-card.html";
    renderTemplate(template, templateData).then((content) => {
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: content,
      });
    });
  }

  /**
   * Met à jour les classes CSS de l'étoile de resonance selon les valeurs actuelles
   * @param {jQuery} html
   */
  _updateSphereStarClasses(html) {
    const s1 = this.actor.system.sphere?.value || "";
    const s2 = this.actor.system.sphere2?.value || "";
    html.find(".sphere-pt").removeClass("sphere-s1 sphere-s2");
    if (s1) html.find(`.sphere-pt[data-sphere="${s1}"]`).addClass("sphere-s1");
    if (s2) html.find(`.sphere-pt[data-sphere="${s2}"]`).addClass("sphere-s2");
  }

  /**
   * Handle clicking on side tab buttons
   * @param {Event} event
   * @private
   */
  _onSideTabClick(event) {
    event.preventDefault();
    const tab = event.currentTarget.dataset.tab;

    // Remove active class from all side tabs
    this.element.find(".side-tab-item").removeClass("active");

    // Add active class to clicked tab
    event.currentTarget.classList.add("active");

    // Use the parent class tab switching functionality
    this._tabs[0].activate(tab);

    // Auto-resize when entering/leaving combat tab
    this._handleCombatTabResize(tab);
  }

  /**
   * Initialize the active side tab on sheet load
   * @param {jQuery} html
   * @private
   */
  _initializeActiveSideTab(html) {
    // Stoppe toute animation et tout observateur en cours
    if (this._heightAnimFrame) {
      cancelAnimationFrame(this._heightAnimFrame);
      this._heightAnimFrame = null;
    }
    this._stopTabResizeObserver();

    const activeTab = this._tabs[0].active;
    const activeButton = html.find(`[data-tab="${activeTab}"]`);
    if (activeButton.length) {
      activeButton.addClass("active");
    }

    // Si la fiche s'ouvre directement sur un onglet à ajustement auto
    if (
      activeTab === "combat" ||
      activeTab === "items" ||
      activeTab === "description" ||
      activeTab === "attributes"
    ) {
      // Conserver la hauteur de référence à travers les re-renders successifs
      if (!this._preExpansionHeight) {
        this._preExpansionHeight = this.position.height;
      }
      const startObserving = () => {
        const scrollEl = this._getTabScrollContainer();
        if (!scrollEl) return;
        this._startTabResizeObserver(scrollEl);
      };
      if (activeTab === "items") {
        setTimeout(startObserving, 200);
      } else {
        requestAnimationFrame(startObserving);
      }
    } else {
      // Sur un onglet non-auto, réinitialiser la référence
      this._preExpansionHeight = null;
    }
  }

  /**
   * Gère l'expansion automatique de la fiche sur l'onglet combat.
   * @param {string} tab  - identifiant de l'onglet activé
   * @private
   */
  _handleCombatTabResize(tab) {
    if (
      tab === "combat" ||
      tab === "items" ||
      tab === "description" ||
      tab === "attributes"
    ) {
      if (!this._preExpansionHeight) {
        this._preExpansionHeight = this.position.height;
      }
      this._stopTabResizeObserver();
      const startObserving = () => {
        const scrollEl = this._getTabScrollContainer();
        if (!scrollEl) return;
        this._startTabResizeObserver(scrollEl);
      };
      if (tab === "items") {
        setTimeout(startObserving, 200);
      } else {
        requestAnimationFrame(startObserving);
      }
    } else {
      this._stopTabResizeObserver();
      if (
        this._preExpansionHeight &&
        this._preExpansionHeight !== this.position.height
      ) {
        const targetH = this._preExpansionHeight;
        this._preExpansionHeight = null;
        this._animateSheetHeight(this.position.height, targetH);
      } else {
        this._preExpansionHeight = null;
      }
    }
  }

  /**
   * Démarre un ResizeObserver sur `scrollEl` qui ajuste la hauteur de fenêtre
   * en temps réel dès que le contenu change de taille.
   * @param {HTMLElement} scrollEl
   * @private
   */
  _startTabResizeObserver(scrollEl) {
    this._stopTabResizeObserver();
    // Ajustement immédiat dès le démarrage
    const adjust = () => {
      const targetH = this._getContentTargetHeight();
      if (targetH === null || Math.abs(targetH - this.position.height) <= 4)
        return;
      this._animateSheetHeight(this.position.height, targetH);
    };
    adjust();
    this._tabResizeObserver = new ResizeObserver(() => {
      // Débouncer : on attend la fin du redimensionnement pour ne pas
      // animer à chaque pixel de changement
      if (this._tabResizeDebounce) clearTimeout(this._tabResizeDebounce);
      this._tabResizeDebounce = setTimeout(() => {
        this._tabResizeDebounce = null;
        const targetH = this._getContentTargetHeight();
        if (targetH === null || Math.abs(targetH - this.position.height) <= 4)
          return;
        // _animateSheetHeight annule toujours l'animation en cours avant d'en démarrer une nouvelle
        this._animateSheetHeight(this.position.height, targetH);
      }, 80);
    });
    // Observer l'élément scrollable lui-même
    this._tabResizeObserver.observe(scrollEl);
    // Observer aussi les enfants directs pour capturer ajouts/suppressions
    for (const child of scrollEl.children) {
      this._tabResizeObserver.observe(child);
    }
  }

  /**
   * Calcule la hauteur de fenêtre exacte pour afficher tout le contenu
   * de l'onglet actif sans ascenseur, quelle que soit la contrainte CSS.
   * - Pour .inv-bandeau (height:100%) : libère temporairement la contrainte
   *   pour mesurer la hauteur naturelle du contenu.
   * - Pour les autres onglets (.tab.active sans height fixe) : scrollHeight direct.
   * @returns {number|null}
   * @private
   */
  _getContentTargetHeight() {
    const tabEl = this.element.find(".tab.active")[0];
    if (!tabEl) return null;
    const invEl = tabEl.querySelector(".inv-bandeau, .item-bandeau");
    if (invEl) {
      // .inv-bandeau a height:100% → son scrollHeight égale toujours clientHeight
      // quand le contenu est plus petit. On libère une frame pour obtenir
      // la vraie hauteur du contenu.
      const prev = invEl.style.height;
      invEl.style.height = "auto";
      const h = invEl.scrollHeight + 172;
      invEl.style.height = prev;
      return h;
    }
    // Pour les autres onglets (combat) : .tab.active n'a pas de height CSS,
    // son scrollHeight reflète exactement la hauteur naturelle du contenu.
    return tabEl.scrollHeight + 172;
  }

  /**
   * Arrête et nettoie le ResizeObserver d'ajustement d'onglet.
   * @private
   */
  _stopTabResizeObserver() {
    if (this._tabResizeDebounce) {
      clearTimeout(this._tabResizeDebounce);
      this._tabResizeDebounce = null;
    }
    if (this._tabResizeObserver) {
      this._tabResizeObserver.disconnect();
      this._tabResizeObserver = null;
    }
  }

  /**
   * Retourne l'élément scrollable de l'onglet actif :
   * - .inv-bandeau / .item-bandeau si l'onglet gère son propre scroll (ex: items)
   * - sinon .sheet-body
   * @returns {HTMLElement|null}
   * @private
   */
  _getTabScrollContainer() {
    const descInner = this.element.find(
      ".tab.active .desc-bandeau, .tab.active .biography-tab-frame",
    )[0];
    if (descInner) return descInner;
    const attrInner = this.element.find(".tab.active .bandeau_attributs")[0];
    if (attrInner) return attrInner;
    const inner = this.element.find(
      ".tab.active .inv-bandeau, .tab.active .item-bandeau",
    )[0];
    if (inner) return inner;
    return this.element.find(".sheet-body")[0] || null;
  }

  /**
   * Anime la hauteur de la fenêtre de `fromH` à `toH` pixels (ease-in-out, 300 ms).
   * @param {number} fromH
   * @param {number} toH
   * @private
   */
  _animateSheetHeight(fromH, toH) {
    if (this._heightAnimFrame) {
      cancelAnimationFrame(this._heightAnimFrame);
      this._heightAnimFrame = null;
    }
    const DURATION = 300;
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      this.setPosition({ height: Math.round(fromH + (toH - fromH) * ease) });
      if (t < 1) {
        this._heightAnimFrame = requestAnimationFrame(animate);
      } else {
        this._heightAnimFrame = null;
      }
    };
    this._heightAnimFrame = requestAnimationFrame(animate);
  }

  // Méthode pour afficher les détails d'un pouvoir avec TabbedDialog
  _showPouvoirDetails(pouvoirType) {
    const myDialogOptions = {
      resizable: true,
      initial_tab: "tab1",
      width: 690,
      height: 910,
      top: 10,
      left: 10,
      classes: ["window-dialog"],
    };

    let numItem = 0;
    let titre;
    let grade = 0;
    let itemsPouvoir = this.actor.items.filter((i) => i.type === "Pouvoir");

    const getPouvoirData = (pouvoir) => {
      return {
        numItem: this.actor.system.pouvoirs[pouvoir].num_item,
        grade: this.actor.system.pouvoirs[pouvoir].grade,
        titre: this.actor.system.pouvoirs[pouvoir].label,
      };
    };

    // Mapper les types de pouvoir
    let mappedPouvoirType = pouvoirType;
    if (pouvoirType === "pouvoir_psi") {
      mappedPouvoirType = "pouvoir_psi_1";
    } else if (pouvoirType === "pouvoir_psi2") {
      mappedPouvoirType = "pouvoir_psi_2";
    }

    ({ numItem, grade, titre } = getPouvoirData(mappedPouvoirType));

    if (!itemsPouvoir[numItem]) {
      ui.notifications.error(`Pouvoir non trouvé dans l'inventaire`);
      return;
    }

    // Classes CSS pour les cartes de grade (actif / inactif / grade actuel)
    let grade_classes = Array(12).fill("spd-grade-card inactive");
    for (let i = 0; i < grade; i++) {
      grade_classes[i] = "spd-grade-card active";
    }
    if (grade > 0 && grade <= 12) {
      grade_classes[grade - 1] = "spd-grade-card active current";
    }

    const getDescription = (pouvoir) => {
      const sys = itemsPouvoir[numItem].system[pouvoir];
      const gradeKeys = [
        "grade1",
        "grade2",
        "grade3",
        "grade4",
        "grade5",
        "grade6",
        "grade7",
        "grade8",
        "grade9",
        "grade10",
        "grade11",
        "grade12",
      ];
      const cardsHtml = gradeKeys
        .map(
          (key, i) =>
            `<div class="${grade_classes[i]}">` +
            `<span class="spd-grade-badge">Grade ${i + 1}</span>` +
            `<div class="spd-grade-text">${sys[key]}</div>` +
            `</div>`,
        )
        .join("");
      return (
        `<div class="spd-description">${sys.description}</div>` +
        `<div class="spd-grades-grid">${cardsHtml}</div>`
      );
    };

    let description = `<div class="spd-general-content">${itemsPouvoir[numItem].system.description}</div>`;
    let description1 = getDescription("pouvoir1");
    let description2 = getDescription("pouvoir2");
    let description3 = getDescription("pouvoir3");
    let description4 = getDescription("pouvoir4");
    let description_aide = `<div class="spd-aide-content">${itemsPouvoir[numItem].system.aide.description}</div>`;
    let numTab = itemsPouvoir[numItem].system.nb_onglets;
    let icon = itemsPouvoir[numItem].system.icon;
    let itemImg = itemsPouvoir[numItem].img;
    let icon1 = itemsPouvoir[numItem].system.pouvoir1.icon;
    let icon2 = itemsPouvoir[numItem].system.pouvoir2.icon;
    let icon3 = itemsPouvoir[numItem].system.pouvoir3.icon;
    let icon4 = itemsPouvoir[numItem].system.pouvoir4.icon;
    let icon_aide = itemsPouvoir[numItem].system.aide.icon;
    let tab_gen = itemsPouvoir[numItem].system.label;
    let tab1 = itemsPouvoir[numItem].system.pouvoir1.label;
    let tab2 = itemsPouvoir[numItem].system.pouvoir2.label;
    let tab3 = itemsPouvoir[numItem].system.pouvoir3.label;
    let tab4 = itemsPouvoir[numItem].system.pouvoir4.label;
    let tab_aide = itemsPouvoir[numItem].system.aide.label;
    let aide = itemsPouvoir[numItem].system.aide_active;

    let tabs = [];
    tabs.push({ title: tab_gen, content: description, icon: icon });
    if (numTab >= 1) {
      tabs.push({ title: tab1, content: description1, icon: icon1 });
    }
    if (numTab >= 2) {
      tabs.push({ title: tab2, content: description2, icon: icon2 });
    }
    if (numTab >= 3) {
      tabs.push({ title: tab3, content: description3, icon: icon3 });
    }
    if (numTab >= 4) {
      tabs.push({ title: tab4, content: description4, icon: icon4 });
    }
    if (aide)
      tabs.push({
        title: tab_aide,
        content: description_aide,
        icon: icon_aide,
      });

    // Construction de l'en-tête selon le type de pouvoir
    const _gradeStars = (g) =>
      `<span style="color:inherit;font-size:13px;letter-spacing:2px;">${"★".repeat(Math.min(g, 12))}${"☆".repeat(Math.max(0, 12 - g))}</span>`;

    let headerHtml = "";
    // Icône et libellé spécifiques au type de pouvoir
    let pouvoirIcon, pouvoirIconClass, pouvoirTypeLabel;
    if (pouvoirType === "pouvoir_transit") {
      pouvoirIconClass = "fas fa-door-open";
      pouvoirTypeLabel = "Pouvoir de Transit";
    } else if (pouvoirType === "pouvoir_transfert") {
      pouvoirIconClass = "fas fa-exchange-alt";
      pouvoirTypeLabel = "Pouvoir de Transfert";
    } else {
      pouvoirIconClass = "fas fa-brain";
      pouvoirTypeLabel =
        pouvoirType === "pouvoir_psi2" ? "Pouvoir Psi 2" : "Pouvoir Psi 1";
    }

    // Entête plate verte harmonisée avec la pouvoir-sheet, sans border-radius, qui touche la barre d'onglets
    headerHtml =
      `<div style="background:linear-gradient(135deg,rgba(6,28,14,0.98) 0%,rgba(16,58,30,0.95) 100%);border-radius:0;padding:14px 18px 12px;margin-bottom:0;display:flex;align-items:center;gap:16px;border-left:4px solid rgba(130,224,170,0.85);border-bottom:1px solid rgba(130,224,170,0.25);">` +
      `<div class="spd-orb-wrap">` +
      `<span class="spd-orb">` +
      `<img class="spd-portrait" src="${itemImg}" alt="${titre}" />` +
      `<div class="spd-orb-ring"></div>` +
      `<div class="spd-orb-glow"></div>` +
      `</span>` +
      `</div>` +
      `<div style="flex:1;">` +
      `<div style="font-size:15px;font-weight:bold;letter-spacing:0.5px;color:#e0ffe8;margin-bottom:5px;">${titre}</div>` +
      `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">` +
      `<span style="background:rgba(130,224,170,0.20);color:rgba(150,230,185,1);font-size:10.5px;padding:2px 10px;border-radius:10px;border:1px solid rgba(130,224,170,0.38);font-weight:bold;">` +
      `<i class="fas fa-layer-group" style="margin-right:4px;font-size:9px;"></i>Grade&nbsp;<strong>${grade}</strong></span>` +
      `<span style="color:rgba(130,224,170,0.85);">${_gradeStars(grade)}</span>` +
      `<span style="background:rgba(14,55,28,0.65);color:rgba(150,230,185,0.90);font-size:10px;padding:2px 9px;border-radius:10px;border:1px solid rgba(82,180,120,0.35);">` +
      `<i class="${pouvoirIconClass}" style="margin-right:3px;font-size:9px;"></i>${pouvoirTypeLabel}</span>` +
      `</div></div></div>`;

    // Utilisation de tabs dans la création de la boîte de dialogue
    let tab = new TabbedDialog(
      {
        title: titre,
        header: headerHtml,
        footer: "",
        tabs: tabs,
        buttons: {},
        default: "two",
        render: (html) =>
          console.log("Register interactivity in the rendered dialog"),
        close: (html) =>
          console.log("This always is logged no matter which option is chosen"),
      },
      myDialogOptions,
    );

    tab.render(true);
  }
}

function animationJet() {
  var basicTimeline = anime.timeline({
    loop: false,
    targets: ".ml8 .circle-dark-dashed",
    rotateZ: 360,
    duration: 8000,
    easing: "linear",
    begin: function (anime) {
      document.querySelector(".ml8").style.display = "block";
    },
    complete: function (anime) {
      // Re-triggers animation by callback.
      document.querySelector(".ml8").style.display = "none";
      basicTimeline.reset();
    },
  });
  basicTimeline
    .add({
      targets: ".ml8",
      opacity: 1,
      duration: 1,
    })
    .add({
      targets: ".ml8 .circle-white",
      scale: [0, 3],
      opacity: [1, 0],
      easing: "easeInOutExpo",
      rotateZ: 360,
      duration: 800,
    })
    .add({
      targets: ".ml8 .circle-container",
      scale: [0, 1],
      duration: 1100,
      easing: "easeInOutExpo",
      offset: "-=1000",
    })
    .add({
      targets: ".ml8 .circle-dark",
      scale: [0, 1],
      duration: 1100,
      easing: "easeOutExpo",
      offset: "-=600",
    })
    .add({
      targets: ".ml8 .letters-left",
      scale: [0, 1],
      duration: 1200,
      offset: "-=550",
    })
    .add({
      targets: ".ml8 .bang",
      scale: [0, 1],
      rotateZ: [45, 15],
      duration: 1200,
      offset: "-=1000",
    })
    .add({
      targets: ".ml8",
      opacity: 0,
      duration: 100,
      easing: "easeOutExpo",
      delay: 100,
    });
}

function animationJetCombat() {
  var basicTimeline = anime.timeline({
    loop: false,
    targets: ".ml9 .circle-dark-dashed",
    rotateZ: 360,
    duration: 8000,
    easing: "linear",
    begin: function (anime) {
      document.querySelector(".ml9").style.display = "block";
    },
    complete: function (anime) {
      // Re-triggers animation by callback.
      document.querySelector(".ml9").style.display = "none";
      basicTimeline.reset();
    },
  });
  basicTimeline
    .add({
      targets: ".ml9",
      opacity: 1,
      duration: 1,
    })
    .add({
      targets: ".ml9 .circle-white",
      scale: [0, 3],
      opacity: [1, 0],
      easing: "easeInOutExpo",
      rotateZ: 360,
      duration: 800,
    })
    .add({
      targets: ".ml9 .circle-container",
      scale: [0, 1],
      duration: 1100,
      easing: "easeInOutExpo",
      offset: "-=1000",
    })
    .add({
      targets: ".ml9 .circle-dark",
      scale: [0, 1],
      duration: 1100,
      easing: "easeOutExpo",
      offset: "-=600",
    })
    .add({
      targets: ".ml9 .letters-left",
      scale: [0, 1],
      duration: 1200,
      offset: "-=550",
    })
    .add({
      targets: ".ml9 .bang",
      scale: [0, 1],
      rotateZ: [45, 15],
      duration: 1200,
      offset: "-=1000",
    })
    .add({
      targets: ".ml9",
      opacity: 0,
      duration: 50,
      easing: "easeOutExpo",
      delay: 50,
    });
}

function calcMeleePerdue(marge, comp, act) {
  let melee_perdue = 0;
  if (marge === 0) {
    melee_perdue = act.system.talents_combat[comp].av0;
  }
  if (marge === 1) {
    melee_perdue = act.system.talents_combat[comp].av1;
  }
  if (marge === 2) {
    melee_perdue = act.system.talents_combat[comp].av2;
  }
  if (marge === 3) {
    melee_perdue = act.system.talents_combat[comp].av3;
  }
  if (marge >= 4) {
    melee_perdue = act.system.talents_combat[comp].av4;
  }
  return melee_perdue;
}

function calcViePerdue(melee_perdue, comp, act) {
  // Calcul pur – la mise à jour est faite par le code appelant
  let currentTarget = Array.from(game.user.targets)[0]?.actor;
  if (!currentTarget) return { vie_perdue: 0, new_melee_impair: 0 };
  const melee_impair = Number(currentTarget.system.melee_impair ?? 0);
  if (melee_perdue === 0)
    return { vie_perdue: 0, new_melee_impair: melee_impair };
  const total = melee_perdue + melee_impair;
  const vie_perdue = Math.floor(total / 2); // 2 pts mêlée cumulés = 1 pt vie
  const new_melee_impair = total % 2; // reste 0 ou 1 pour le prochain coup
  return { vie_perdue, new_melee_impair };
}

function calc_coup1(marge, comp, act) {
  let effet_coup1 = "";
  if (marge == 0) {
    effet_coup1 = act.system.talents_combat[comp].effet_ac_0_1;
  }
  if (marge == 1) {
    effet_coup1 = act.system.talents_combat[comp].effet_ac_1_1;
  }
  if (marge == 2) {
    effet_coup1 = act.system.talents_combat[comp].effet_ac_2_1;
  }
  if (marge == 3) {
    effet_coup1 = act.system.talents_combat[comp].effet_ac_3_1;
  }
  if (marge >= 4) {
    effet_coup1 = act.system.talents_combat[comp].effet_ac_4_1;
  }
  return effet_coup1;
}

function calc_coup2(marge, comp, act) {
  let effet_coup2 = "";
  if (marge == 0) {
    effet_coup2 = act.system.talents_combat[comp].effet_ac_0_2;
  }
  if (marge == 1) {
    effet_coup2 = act.system.talents_combat[comp].effet_ac_1_2;
  }
  if (marge == 2) {
    effet_coup2 = act.system.talents_combat[comp].effet_ac_2_2;
  }
  if (marge == 3) {
    effet_coup2 = act.system.talents_combat[comp].effet_ac_3_2;
  }
  if (marge >= 4) {
    effet_coup2 = act.system.talents_combat[comp].effet_ac_4_2;
  }
  return effet_coup2;
}

function calc_coup3(marge, comp, act) {
  let effet_coup3 = "";
  if (marge == 0) {
    effet_coup3 = act.system.talents_combat[comp].effet_ac_0_3;
  }
  if (marge == 1) {
    effet_coup3 = act.system.talents_combat[comp].effet_ac_1_3;
  }
  if (marge == 2) {
    effet_coup3 = act.system.talents_combat[comp].effet_ac_2_3;
  }
  if (marge == 3) {
    effet_coup3 = act.system.talents_combat[comp].effet_ac_3_3;
  }
  if (marge >= 4) {
    effet_coup3 = act.system.talents_combat[comp].effet_ac_4_3;
  }
  return effet_coup3;
}

function calc_chiffre_localisation() {
  let alea = Math.floor(Math.random() * 100) + 1;
  return alea;
}

function animPouvoir() {
  const effets_speciaux = game.settings.get("mega", "effets_speciaux");
  if (!effets_speciaux) return;
  if (game.modules.get("sequencer")?.active) {
    const pouvoir_video_path = game.settings.get("mega", "pouvoir_video_path");
    const pouvoir_son_path = game.settings.get("mega", "pouvoir_son_path");

    let sequence = new Sequence()
      .effect()
      .file(pouvoir_video_path)
      .atLocation(canvas.tokens.controlled[0])
      // .stretchTo(target)
      .waitUntilFinished(-1100)
      .play();
    if (pouvoir_son_path && pouvoir_son_path.trim() !== "") {
      new Sequence()
        .sound()
        .file(pouvoir_son_path)
        // .fadeInAudio(500)
        // .fadeOutAudio(500)
        .volume(2)
        .play();
    }
  }
}

function speAssocie(talent) {
  let spes = {
    Transit: ["Créer, utiliser et détecter Point de Transit"],

    PARAITRE: [
      "Fouille en règle",
      "Infiltration",
      "Chiqué",
      "Infilrer les circuits du pouvoir",
      "Agréable compagnie",
      "Combat primitif",
      "Influence",
      "Débattre",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Bluffer Déguisement": [
      "Fouille en règle",
      "Infiltration",
      "Chiqué",
      "Infilrer les circuits du pouvoir",
      "Agréable compagnie",
      "Combat primitif",
      "Influence",
      "Débattre",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    Impressionner: [
      "Fouille en règle",
      "Infiltration",
      "Chiqué",
      "Infilrer les circuits du pouvoir",
      "Agréable compagnie",
      "Combat primitif",
      "Influence",
      "Débattre",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Paraître sans intérêt": [
      "Fouille en règle",
      "Infiltration",
      "Chiqué",
      "Infilrer les circuits du pouvoir",
      "Agréable compagnie",
      "Combat primitif",
      "Influence",
      "Débattre",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],

    INTERPRÉTER: [
      "Infiltration",
      "Fouille en règle",
      "Faussaire",
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Poisons, drogues (nature et effets) et suggestion",
      "Marché des pièces de récup",
      "Concepteur",
      "Pistage-orientation",
      "1er Contact (Ethnoranger)",
      "Combat primitif",
      "Architectures, ruines, labyrinthes et souterrains",
      "1er Contact (Ethnoranger)",
      "Combat en bâtiment",
      "Vraie nature",
      "Storytelling des populations",
      "Influence",
      "Chef-d'oeuvre",
      "Débattre",
      "Confident",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Langage corporel": [
      "Infiltration",
      "Fouille en règle",
      "Faussaire",
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Poisons, drogues (nature et effets) et suggestion",
      "Marché des pièces de récup",
      "Concepteur",
      "Pistage-orientation",
      "1er Contact (Ethnoranger)",
      "Combat primitif",
      "Architectures, ruines, labyrinthes et souterrains",
      "1er Contact (Ethnoranger)",
      "Combat en bâtiment",
      "Vraie nature",
      "Storytelling des populations",
      "Influence",
      "Chef-d'oeuvre",
      "Débattre",
      "Confident",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    Codes: [
      "Infiltration",
      "Fouille en règle",
      "Faussaire",
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Poisons, drogues (nature et effets) et suggestion",
      "Marché des pièces de récup",
      "Concepteur",
      "Pistage-orientation",
      "1er Contact (Ethnoranger)",
      "Combat primitif",
      "Architectures, ruines, labyrinthes et souterrains",
      "1er Contact (Ethnoranger)",
      "Combat en bâtiment",
      "Vraie nature",
      "Storytelling des populations",
      "Influence",
      "Chef-d'oeuvre",
      "Débattre",
      "Confident",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Expression artistique": [
      "Infiltration",
      "Fouille en règle",
      "Faussaire",
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Poisons, drogues (nature et effets) et suggestion",
      "Marché des pièces de récup",
      "Concepteur",
      "Pistage-orientation",
      "1er Contact (Ethnoranger)",
      "Combat primitif",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Vraie nature",
      "Storytelling des populations",
      "Influence",
      "Chef-d'oeuvre",
      "Débattre",
      "Confident",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],

    "...CLANDESTINS": [
      "Infiltration",
      "Faussaire",
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Bandes, pègre et fanatiques",
    ],
    Pègre: [
      "Infiltration",
      "Faussaire",
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Bandes, pègre et fanatiques",
    ],
    Contestation: [
      "Infiltration",
      "Faussaire",
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Bandes, pègre et fanatiques",
    ],
    Marge: [
      "Infiltration",
      "Faussaire",
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Bandes, pègre et fanatiques",
    ],

    OBSERVER: [
      "Fouille en règle",
      "Soins précis et Premiers soins",
      "Mode d’emploi",
      "Concepteur",
      "Pistage-orientation",
      "Premiers soins",
      "Chercher nourriture",
      "Œil de singe",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Chercher objet": [
      "Fouille en règle",
      "Soins précis et Premiers soins",
      "Mode d’emploi",
      "Concepteur",
      "Pistage-orientation",
      "Premiers soins",
      "Chercher nourriture",
      "Œil de singe",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Remarquer détail": [
      "Fouille en règle",
      "Soins précis et Premiers soins",
      "Mode d’emploi",
      "Concepteur",
      "Pistage-orientation",
      "Premiers soins",
      "Chercher nourriture",
      "Œil de singe",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    "Veille Vigilance": [
      "Fouille en règle",
      "Soins précis et Premiers soins",
      "Mode d’emploi",
      "Concepteur",
      "Pistage-orientation",
      "Premiers soins",
      "Chercher nourriture",
      "Œil de singe",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],

    MANIPS: [
      "Fouille en règle",
      "Faussaire",
      "Concepteur",
      "Premiers soins",
      "Abri de fortune",
      "Biotech",
      "Pièce-énergie de remplacement",
      "Grandes machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Tailleur de pierre",
      "Chef-d'oeuvre",
    ],
    Vivant: [
      "Fouille en règle",
      "Faussaire",
      "Concepteur",
      "Premiers soins",
      "Abri de fortune",
      "Biotech",
      "Pièce-énergie de remplacement",
      "Grandes machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Tailleur de pierre",
      "Chef-d'oeuvre",
    ],
    Mécanique: [
      "Fouille en règle",
      "Faussaire",
      "Concepteur",
      "Premiers soins",
      "Abri de fortune",
      "Biotech",
      "Pièce-énergie de remplacement",
      "Grandes machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Tailleur de pierre",
      "Chef-d'oeuvre",
    ],
    Électronique: [
      "Fouille en règle",
      "Faussaire",
      "Concepteur",
      "Premiers soins",
      "Abri de fortune",
      "Biotech",
      "Pièce-énergie de remplacement",
      "Grandes machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Tailleur de pierre",
      "Chef-d'oeuvre",
    ],

    DIRIGER: [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Tactiques d'urgence",
    ],
    Coordonner: [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Tactiques d'urgence",
    ],
    Commander: [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Tactiques d'urgence",
    ],
    Former: [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Tactiques d'urgence",
    ],

    PERSUADER: [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Négocier",
      "Thérapie verbale",
      "Marché des pièces de récup",
      "Influence",
      "Débattre",
    ],
    "Convaincre Expliquer": [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Négocier",
      "Thérapie verbale",
      "Marché des pièces de récup",
      "Influence",
      "Débattre",
    ],
    "Baratiner Tromper Culot": [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Négocier",
      "Thérapie verbale",
      "Marché des pièces de récup",
      "Influence",
      "Débattre",
    ],
    "Imposer ses vues": [
      "Mobiliser des indignés",
      "Apaiser une assistance",
      "Négocier",
      "Thérapie verbale",
      "Marché des pièces de récup",
      "Influence",
      "Débattre",
    ],

    FURTIVITÉ: ["Intrusion", "Combat en bâtiment", "Œil de singe"],
    "Agir sans bruit": ["Intrusion", "Combat en bâtiment", "Œil de singe"],
    "Se dissimuler Filer": ["Intrusion", "Combat en bâtiment", "Œil de singe"],
    Camouflage: ["Intrusion", "Combat en bâtiment", "Œil de singe"],

    mainsnues1: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    mainsnues2: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    mainsnues3: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],

    ARMESCOURTES: [
      "Combat primitif",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
    ],

    mainsnues: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    charge: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    tir_1: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    tir_2: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    armescourtes_1: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    armescourtes_2: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    armeslongues_1: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    armeslongues_2: [
      "Chiqué",
      "Stop combat : Assommer, Immobiliser ou Tenir à distance",
      "Extraire-exfiltrer",
    ],
    ESQUIVE: ["Extraire-exfiltrer"],

    "...POUVOIRS": [
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Combat en bâtiment",
      "Réseau",
      "Mondanités et activités ludiques",
    ],
    Business: [
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Combat en bâtiment",
      "Réseau",
      "Mondanités et activités ludiques",
    ],
    Autorité: [
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Combat en bâtiment",
      "Réseau",
      "Mondanités et activités ludiques",
    ],
    Spirituel: [
      "Infiltrer les circuits du pouvoir",
      "Repérer les connivences",
      "Agréable compagnie",
      "Combat en bâtiment",
      "Réseau",
      "Mondanités et activités ludiques",
    ],

    "...HABITÉS": [
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Chef-d'oeuvre",
      "Réseau",
      "Voies dangereuses",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    Mégalopoles: [
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Chef-d'oeuvre",
      "Réseau",
      "Voies dangereuses",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    Cités: [
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Chef-d'oeuvre",
      "Réseau",
      "Voies dangereuses",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],
    Rural: [
      "Repérer les connivences",
      "Marché des pièces de récup",
      "Architectures, ruines, labyrinthes et souterrains",
      "Combat en bâtiment",
      "Storytelling des populations",
      "Chef-d'oeuvre",
      "Réseau",
      "Voies dangereuses",
      "Bandes, pègre et fanatiques",
      "Mondanités et activités ludiques",
      "1er Contact (Patrouilleur)",
    ],

    "...SAUVAGES": [
      "Repérer les connivences",
      "Premiers soins",
      "Chercher nourriture",
      "Architectures, ruines, labyrinthes et souterrains",
      "Réseau",
    ],
    "Forêt Jungle": [
      "Repérer les connivences",
      "Premiers soins",
      "Chercher nourriture",
      "Architectures, ruines, labyrinthes et souterrains",
      "Réseau",
    ],
    "Savane Steppe Marécages": [
      "Repérer les connivences",
      "Premiers soins",
      "Chercher nourriture",
      "Architectures, ruines, labyrinthes et souterrains",
      "Réseau",
    ],
    Déserts: [
      "Repérer les connivences",
      "Premiers soins",
      "Chercher nourriture",
      "Architectures, ruines, labyrinthes et souterrains",
      "Réseau",
    ],

    "...SCIENTECHS": [
      "Repérer les connivences",
      "Biotech",
      "Grande machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Marché des pièces de récup",
      "Concepteur",
      "Combat en bâtiment",
      "Réseau",
    ],
    Indus: [
      "Repérer les connivences",
      "Biotech",
      "Grande machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Marché des pièces de récup",
      "Concepteur",
      "Combat en bâtiment",
      "Réseau",
    ],
    Militaire: [
      "Repérer les connivences",
      "Biotech",
      "Grande machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Marché des pièces de récup",
      "Concepteur",
      "Combat en bâtiment",
      "Réseau",
    ],
    Vaisseaux: [
      "Repérer les connivences",
      "Biotech",
      "Grande machines et carapaces (vaisseaux, tunneliers et scaphandres, exosquelettes…)",
      "Marché des pièces de récup",
      "Concepteur",
      "Combat en bâtiment",
      "Réseau",
    ],

    "TISSER DES LIENS": [
      "Agréable compagnie",
      "1er Contact (Ethnoranger)",
      "Réseau",
      "Confident",
      "1er Contact (Patrouilleur)",
    ],
    "Charmer Captiver Apprivoiser": [
      "Agréable compagnie",
      "1er Contact (Ethnoranger)",
      "Réseau",
      "Confident",
      "1er Contact (Patrouilleur)",
    ],
    "Inspirer fidélité": [
      "Agréable compagnie",
      "1er Contact (Ethnoranger)",
      "Réseau",
      "Confident",
      "1er Contact (Patrouilleur)",
    ],
    "Assujettir Dompter": [
      "Agréable compagnie",
      "1er Contact (Ethnoranger)",
      "Réseau",
      "Confident",
      "1er Contact (Patrouilleur)",
    ],

    ACROBATIES: ["Combat primitif", "Œil de singe"],
    Minutie: ["Combat primitif", "Œil de singe"],
    Acrobatie: ["Combat primitif", "Œil de singe"],
    "Efforts prolongés": ["Combat primitif", "Œil de singe"],
  };
  return spes[talent] || [];
}

export function whisperGM(message) {
  for (let i = 0; i < game.users.size; i++) {
    if (game.users.contents[i].role > 2)
      ChatMessage.create({
        content: message,
        whisper: [game.users.contents[i]._id],
      });
  }
}
