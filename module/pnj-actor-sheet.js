/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ActorSheet}
 */

import {
  safeDocumentUpdate,
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

import { PlayerDialog } from "./dialog.js";
export class MegaPNJActorSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mega", "sheet", "actor", "pnj-sheet"],
      template: "systems/mega/templates/pnj-actor-sheet.html",
      width: 860,
      height: 568,
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
    context.GM = game.user.isGM;

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

    // Prepare character data and items.
    this._prepareItems(context);

    context.rollData = context.actor.getRollData();

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

    context.enrichedBiography_actor =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.biography,
        { async: true },
      );
    context.enrichedBiography =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.pnj_infos_mj,
        { async: true },
      );
    let pnj_width = "";
    let pnj_height = "";

    if (this.actor.system.reduit === 1) {
      const bonusArmes = Number(context.system.bonus_armes_def) || 0;
      this.position.width = 917 + (bonusArmes > 0 ? 120 : 0);
      this.position.height = 568;
    } else {
      const bonusArmes = Number(context.system.bonus_armes_def) || 0;
      this.position.width = 921 + (bonusArmes > 0 ? 120 : 0);
      this.position.height = 715;
    }
    return context;
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
    html.find("input.tnt-di").css("color", "#ffffff");

    // Mode comparse (reduit=2) : masquer les valeurs de domaines, afficher D majuscule sur les dés de talents
    if (this.actor.system.reduit === 2) {
      html.find(".tnt-dh .tnt-dd").hide();
      // En mode comparse, tous les en-têtes de domaine sont gris (verrouillé ou non)
      html
        .find(".tnt-dh")
        .removeAttr("data-val")
        .css("background", "linear-gradient(135deg, #6e6e6e 0%, #9e9e9e 100%)");
      html.find(".tnt-vc").each(function () {
        // Mode verrouillé : dice-badge span
        $(this)
          .find(".dice-badge")
          .each(function () {
            const txt = $(this).text();
            if (txt.charAt(0) === "d") $(this).text("D" + txt.slice(1));
          });
        // Mode déverrouillé : nœud texte "d " avant l'input
        $(this)
          .contents()
          .filter(function () {
            return this.nodeType === 3;
          })
          .each(function () {
            this.textContent = this.textContent.replace(/\bd\b/g, "D");
          });
      });
    }

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

    // Toggle Cumul & Défis
    html.find(".cumul-toggle").on("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      const $panel = $(this).closest(".cumul-panel");
      const $body = $panel.find(".cumul-body");
      const $arrow = $panel.find(".cumul-arrow");
      const isOpen = $body.is(":visible");
      $body.slideToggle(180);
      $arrow.toggleClass("rotated", !isOpen);
    });

    // Initialiser l'onglet actif au chargement
    this._initializeActiveSideTab(html);

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

    // === TALENTS ANNEXES : affichage progressif ===
    const $tanOuter = html.find(".tan-outer");
    if ($tanOuter.length) {
      const $rows = $tanOuter.find(".tan-row");
      const isEditable = this.options.editable && !this.actor.system.verouille;
      let lastFilledIdx = -1;
      $rows.each(function (i) {
        const val = ($(this).attr("data-tan-val") || "").trim();
        if (val !== "") lastFilledIdx = i;
      });
      const firstEmptyVisible = isEditable
        ? Math.min(lastFilledIdx + 1, $rows.length - 1)
        : lastFilledIdx;
      $rows.each(function (i) {
        $(this).find(".tan-add-btn").hide();
        if (i <= firstEmptyVisible) {
          $(this).show();
        } else {
          $(this).hide();
        }
      });
      if (isEditable && firstEmptyVisible < $rows.length - 1) {
        $rows.eq(firstEmptyVisible).find(".tan-add-btn").show();
      }
      $tanOuter.on("click", ".tan-add-btn", function () {
        const $row = $(this).closest(".tan-row");
        const $allRows = $tanOuter.find(".tan-row");
        const idx = $allRows.index($row);
        const $nextRow = $allRows.eq(idx + 1);
        if ($nextRow.length) {
          $row.find(".tan-add-btn").hide();
          $nextRow.show();
          if ($allRows.eq(idx + 2).length) {
            $nextRow.find(".tan-add-btn").show();
          }
        }
      });
    }

    //active ou désactive les effets spéciaux
    const effets_speciaux = game.settings.get("mega", "effets_speciaux");
    const retraitAuto = game.settings.get("mega", "retraitAuto");

    // Clic sur un cercle (dot) d'ardence ou de résonnance (fonctionne en mode verrouillé aussi)
    html.find(".tpc-dots").on("click", ".tpc-dot", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const $dot = $(ev.currentTarget);
      const $dots = $dot.closest(".tpc-dots");
      const field = $dots.data("field");
      if (!field) return;
      const idx = parseInt($dot.data("dot-index"), 10);
      const current = foundry.utils.getProperty(this.actor, field) ?? 0;
      let newVal;
      if (idx === current) {
        newVal = current - 1;
      } else if (idx === current + 1) {
        newVal = current + 1;
      } else return;
      this.actor.update({ [field]: Math.max(0, newVal) });
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
        const valueField = field.replace(/\.max$/, ".value");
        const value = foundry.utils.getProperty(this.actor, valueField) ?? 0;
        if (value >= current) return;
      }
      const newVal = Math.max(0, current + (isInc ? 1 : -1));
      this.actor.update({ [field]: newVal });
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

    // Toggle équipement d'une arme dans l'onglet combat (PNJ)
    html.find(".item-equipe-toggle").click(async (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const itemId = ev.currentTarget.getAttribute("data-item-id");
      const item = this.actor.items.get(itemId);
      if (!item) return;

      const currentEquipe = item.system.equipe || false;
      const itemType = item.type;
      const maxEquipe =
        itemType === "Attaque spéciale" || itemType === "Protection" ? 3 : 2;

      if (currentEquipe) {
        await item.update({ "system.equipe": false });
      } else {
        const currentCount = this.actor.items.filter(
          (i) => i.type === itemType && i.system.equipe === true,
        ).length;

        if (currentCount >= maxEquipe) {
          const msg =
            itemType === "Attaque spéciale"
              ? `Vous ne pouvez activer que ${maxEquipe} attaques spéciales simultanément dans l'onglet combat. Désactivez-en une d'abord.`
              : itemType === "Pouvoir"
                ? `Vous ne pouvez activer que ${maxEquipe} pouvoirs résonants simultanément. Désactivez-en un d'abord.`
                : `Vous ne pouvez activer que ${maxEquipe} armes de ce type simultanément dans l'onglet combat. Désactivez-en une d'abord.`;
          ui.notifications.warn(msg);
          return;
        }
        await item.update({ "system.equipe": true });
      }
    });

    html.find(".item-view").click((ev) => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      new ImagePopout(item.img, {
        title: item.name,
        shareable: true,
        uuid: item.uuid,
      }).render(true);
    });

    html.find(".actor-view").contextmenu((ev) => {
      let img = ev.currentTarget.getAttribute("value");
      console.log(img);
      new ImagePopout(img, {
        title: "Image",
        shareable: true,
      }).render(true);
    });

    // Add or Remove Attribute
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
      console.log("combat_large : " + this.actor.system.combat_large);
    });

    html.find(".toggle_prot_rows").click((ev) => {
      this.actor.update({
        "system.prot_def_masquee": !this.actor.system.prot_def_masquee,
      });
    });

    html.find(".toggle_def_manuel").click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const goingManual = !this.actor.system.def_manuel;
      if (!goingManual) {
        // Retour en auto : effacer la valeur manuelle pour que prepareDerivedData recalcule
        await this.actor.update({
          "system.def_manuel": false,
          "system.def.value": 0,
        });
      } else {
        await this.actor.update({ "system.def_manuel": true });
      }
    });

    html.find(".toggle_initiative_manuel").click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const goingManual = !this.actor.system.initiative_manuel;
      if (!goingManual) {
        await this.actor.update({
          "system.initiative_manuel": false,
          "system.derives.initiative.d1": 0,
          "system.derives.initiative.d2": 0,
        });
      } else {
        await this.actor.update({ "system.initiative_manuel": true });
      }
    });

    html.find(".toggle_esquive_manuel").click(async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const goingManual = !this.actor.system.esquive_manuel;
      if (!goingManual) {
        await this.actor.update({
          "system.esquive_manuel": false,
          "system.derives.esquive.d1.value": 0,
          "system.derives.esquive.d2.value": 0,
          "system.derives.esquive.d3.value": 0,
        });
      } else {
        await this.actor.update({ "system.esquive_manuel": true });
      }
    });

    // Tableau de défense par localisation
    html.find(".btn-defense-localisation").click((ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._onShowDefenseLocalisation();
    });

    //Masque ou développe les encarts dans l'onglet MJ
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

    html.find(".comb").mouseover((ev) => {
      ev.currentTarget.focus();
      ev.currentTarget.setSelectionRange(0, ev.currentTarget.value.length);
    });

    html.find(".comb").mouseout((ev) => {
      ev.currentTarget.blur();
    });

    /****************************************************** Activation d'une arme  ****************************************/
    html.find(".active_arme").click((ev) => {
      let talentc = ev.currentTarget.getAttribute("value");
    });

    /****************************************************** Clique sur un talent de combat ****************************************/
    html.find(".clic_technique_combat").click((ev) => {
      if (!this.token) {
        ui.notifications.error(
          "Veuillez utiliser la fiche de personnage du token !",
        );
        return;
      }
      if (Array.from(game.user.targets).length === 0) {
        ui.notifications.warn("Vous vous apprêtez à attaquer sans cible");
      }
      let comp = ev.currentTarget.getAttribute("value");
      let label = ev.currentTarget.getAttribute("label");
      let mod = this.actor.system.talents_combat[comp].score;
      let objet = this.actor.system.talents_combat[comp].label;
      let arme = this.actor.items.filter((i) => i.name === objet);

      if (!arme || arme.length === 0) {
        ui.notifications.error(`Arme '${objet}' non trouvée sur le personnage`);
        return;
      }

      let effet_arme = arme[0].system.effet_arme?.value || "";
      let letale = arme[0].system.letale?.value || false;
      let noLetaleMsg = arme[0].system.letale?.label || "";
      effet_arme = effet_arme.split("|")[0];
      let type_objet = arme[0].type;
      let ardence = "";
      let btns_ar = {};
      let ardence_combat = 0;
      let ptardence = "";
      let effet_coup1 = "";
      let effet_coup2 = "";
      let effet_coup3 = "";
      let diff = "";
      let diff2 = "";
      let Nom_acteur = this.token.name;
      let toto = this.actor.system.pts_ardence.value;
      let def_temp = 0;
      let currentTarget = null;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };
      let r = new Roll("1d10");

      //Si on clic sur une arme de tir et que la charge est égale à 0, on ne fait rien.
      if (type_objet === "Arme de tir" && arme[0].system.charge === 0) {
        ui.notifications.error("L'arme n'a pas de charge");
        return;
      } else if (
        type_objet === "Arme de lancer" &&
        arme[0].system.quantity === 0
      ) {
        ui.notifications.error("L'arme est épuisée");
      }
      // if (Array.from(game.user.targets).length !== 0) {
      else if (Array.from(game.user.targets).length !== 0) {
        currentTarget = Array.from(game.user.targets)[0].actor;
      }
      diff2 = 0;

      /******************************* Dialogue Nombre de points d'Ardence *********************/

      const _fireIconCombat =
        "<i class='fas fa-fire' style='color:#ff7900'></i>";
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: _fireIconCombat.repeat(i) + " " + i,
          callback: () => (ptardence = i),
        };
      }
      let bonus = "";
      var btns = {};
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      if (this.actor.system.spe1.value !== "") {
        btns["btn_spes1"] = {
          label: this.actor.system.spe1.value,
          callback: () => (bonus = this.actor.system.rg_spe_1.value),
        };
      }
      if (this.actor.system.spe2.value !== "") {
        btns["btn_spes2"] = {
          label: this.actor.system.spe2.value,
          callback: () => (bonus = this.actor.system.rg_spe_2.value),
        };
      }
      if (this.actor.system.spe3.value !== "") {
        btns["btn_spes3"] = {
          label: this.actor.system.spe3.value,
          callback: () => (bonus = this.actor.system.rg_spe_3.value),
        };
      }
      if (this.actor.system.spe4.value !== "") {
        btns["btn_spes4"] = {
          label: this.actor.system.spe4.value,
          callback: () => (bonus = this.actor.system.rg_spe_4.value),
        };
      }
      if (this.actor.system.spe5.value !== "") {
        btns["btn_spes5"] = {
          label: this.actor.system.spe5.value,
          callback: () => (bonus = this.actor.system.rg_spe_5.value),
        };
      }
      if (this.actor.system.spe6.value !== "") {
        btns["btn_spes6"] = {
          label: this.actor.system.spe6.value,
          callback: () => (bonus = this.actor.system.rg_spe_6.value),
        };
      }
      let _skipSpe = Object.keys(btns).length <= 1;
      console.log(this.actor.system.talents_combat[comp].bonus); //TODO : à supprimer
      if (this.actor.system.talents_combat[comp].bonus !== "adr") {
        /******************************* Combat Armes de tir ou lancer *********************/
        /******************************* Construction de la fenêtre de dialogue Ardence pour un combat de tir ou lancer ************************************/
        let dialog_ardence_choix = new Dialog(
          {
            title: label.toUpperCase(),
            content:
              "<div class='card-header'><span><i class='fas fa-fire'></i> ARDENCE</span></div>" +
              "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Voulez-vous placer des points d'<b>ardence</b> ?</span></div>",
            buttons: {
              oui: {
                label: "<i class='fas fa-times'></i> NON",
                callback: () => (ardence = 0),
              },
              non: {
                label: "<i class='fas fa-fire'></i> OUI",
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
                        "<div class='card-header'><span><i class='fas fa-fire'></i> Vous avez " +
                        toto +
                        " pts d'ardence</span></div>" +
                        "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span></div>",
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
        let buttons = generateDiffButtons(4, 30);

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
            default: "NoSpe",
            close: function () {
              if (bonus !== "") {
                dialog_BONUS.render(true);
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
        if (
          this.actor.system.reduit >= 1 &&
          this.actor.system.talents_combat[comp].score === 0
        ) {
          ui.notifications.error(
            `La fiche est mode comparse. Vous devez affecter un Rang au talent pour pouvoir lancer un jet.`,
          );
        } else {
          if (
            this.actor.system.reduit == 1 ||
            this.actor.system.pts_ardence.value === 0
          ) {
            if (_skipSpe) {
              bonus = 0;
              dialog_BONUS.render(true);
            } else {
              d2.render(true);
            }
          } // En mode figurant ou sans ardence, on va direct à la DIFF
          else {
            dialog_ardence_choix.render(true);
          }
        }
      } else {
        /******************************* Combat armes courtes, armes longues *********************/
        /******************************* Construction de la fenêtre de dialogue Ardence pour un combat de tir ou lancer ************************************/
        let dialog_ardence_choix = new Dialog(
          {
            title: label.toUpperCase(),
            content:
              "<div class='card-header'><span><i class='fas fa-fire'></i> ARDENCE</span></div>" +
              "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#ff7900;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des points d'<b>ardence</b> ?</span></div>",
            buttons: {
              oui: {
                label: "<i class='fas fa-times'></i> NON",
                // open: function() { $(this).addClass('yescls') },
                // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
                callback: () => (ardence = 0),
              },
              non: {
                label: "<i class='fas fa-fire'></i> OUI",
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
                        "<div class='card-header'><span><i class='fas fa-fire' style='color:#ff7900'></i> Vous avez <b style='color:#ff7900'>" +
                        toto +
                        "</b> pts d'ardence</span></div>" +
                        "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Combien souhaitez-vous <b>en placer</b> ?</span></div>",
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

        /******************************* Dialogue DIFF **********************/
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
              "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
              "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>" +
              msg +
              "</span></div>",
            buttons: generateDiffButtons(4, 30),
            default: "DEF",
            close: () => {
              if (diff !== "") {
                //Test pour savoir si on a fermé avec la croix ou non (si bonuspool=="", c'est qu'on a fermé la fenêtre => on ne fait rien)
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

                let combat = 0;
                if (ardence_combat !== "") {
                  combat =
                    this.actor.system.combat_modif.value +
                    ardence_combat +
                    this.actor.system.domaines.combat.value;
                } else {
                  combat =
                    this.actor.system.combat_modif.value +
                    this.actor.system.domaines.combat.value;
                }
                mod = mod + bonus;
                //dododada
                if (mod !== 0) {
                  if (this.actor.system.talents_combat[comp].bonus === "adr") {
                    if (bonuspool !== 0) {
                      if (
                        this.actor.system.reduit == 1 ||
                        this.actor.system.reduit == 2
                      ) {
                        r = new Roll("1d" + mod + "+" + bonuspool);
                      } else {
                        r = new Roll(
                          "1d" +
                            mod +
                            "+ 1d" +
                            combat +
                            "+ 1d" +
                            this.actor.system.caracs.adresse.value +
                            "+" +
                            bonuspool,
                        );
                      }
                    } else {
                      if (
                        this.actor.system.reduit == 1 ||
                        this.actor.system.reduit == 2
                      ) {
                        r = new Roll("1d" + mod);
                      } else {
                        r = new Roll(
                          "1d" +
                            mod +
                            "+ 1d" +
                            combat +
                            "+ 1d" +
                            this.actor.system.caracs.adresse.value,
                        );
                      }
                    }
                  } else {
                    //Normalement, on ne passe jamais ici !!!
                    if (bonuspool !== 0) {
                      if (
                        this.actor.system.reduit == 1 ||
                        this.actor.system.reduit == 2
                      ) {
                        r = new Roll("1d" + mod + "+" + bonuspool);
                      } else {
                        r = new Roll(
                          "1d" +
                            mod +
                            "+ 1d" +
                            combat +
                            "+ 1d" +
                            this.actor.system.caracs.sens.value +
                            "+" +
                            bonuspool,
                        );
                      }
                    } else {
                      if (
                        this.actor.system.reduit == 1 ||
                        this.actor.system.reduit == 2
                      ) {
                        r = new Roll("1d" + mod);
                      } else {
                        r = new Roll(
                          "1d" +
                            mod +
                            "+ 1d" +
                            combat +
                            "+ 1d" +
                            this.actor.system.caracs.sens.value,
                        );
                      }
                    }
                  }
                } else if (mod === 0) {
                  if (this.actor.system.talents_combat[comp].bonus === "adr") {
                    if (bonuspool !== 0) {
                      r = new Roll(
                        "1d" +
                          combat +
                          "+ 1d" +
                          this.actor.system.caracs.adresse.value +
                          "+" +
                          bonuspool,
                      );
                    } else {
                      r = new Roll(
                        "1d" +
                          combat +
                          "+ 1d" +
                          this.actor.system.caracs.adresse.value,
                      );
                    }
                  } else {
                    //Normalement, on ne passe jamais ici !!!
                    if (bonuspool !== 0) {
                      r = new Roll(
                        "1d" +
                          combat +
                          "+ 1d" +
                          this.actor.system.caracs.sens.value +
                          "+" +
                          bonuspool,
                      );
                    } else {
                      r = new Roll(
                        "1d" +
                          combat +
                          "+ 1d" +
                          this.actor.system.caracs.sens.value,
                      );
                    }
                  }
                }

                // Supprimer les termes 1d0 de la formule (valeur à 0)
                const _cleanedCombatFormula = r.formula
                  .replace(/1d0\s*\+\s*/g, "")
                  .replace(/\s*\+\s*1d0\b/g, "")
                  .trim();
                if (_cleanedCombatFormula !== r.formula)
                  r = new Roll(_cleanedCombatFormula);
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
                  // let effet_arme=arme[0].system.effet;
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
                  let offX = Number(arme[0].system.effet_offX?.value || 0);
                  let offY = Number(arme[0].system.effet_offY?.value || 0);
                  const effets_speciaux = effectsState.shouldPlayEffects;
                  /**********  Animation avec Sequence  ****************************/
                  if (Array.from(game.user.targets).length !== 0) {
                    let target = Array.from(game.user.targets)[0];
                    if (
                      game.modules.get("sequencer")?.active &&
                      effets_speciaux
                    ) {
                      new Sequence()
                        .effect()
                        .file(effet_arme)
                        .atLocation({
                          x: canvas.tokens.controlled[0].x + offX,
                          y: canvas.tokens.controlled[0].y + offY,
                        })
                        .stretchTo(target)
                        .repeats(2, 200, 300)
                        .play();
                      if (
                        arme[0].system.sound?.value &&
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

                  result_final = resultat - def_temp;
                  if (result_final >= 0) {
                    marge = Math.floor(result_final / 3);
                    result_diff =
                      '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                      def_temp +
                      '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
                      marge +
                      "</span></div>";
                  } else {
                    marge = Math.ceil(result_final / 3);
                    result_diff =
                      '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                      def_temp +
                      '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                      marge +
                      "</span></div>";
                  }
                  if (marge === 0 && result_final >= 0) {
                    melee_perdue = this.actor.system.talents_combat[comp].av0;
                    effet_coup1 =
                      this.actor.system.talents_combat[comp].effet_ac_0_1;
                    effet_coup2 =
                      this.actor.system.talents_combat[comp].effet_ac_0_2;
                    effet_coup3 =
                      this.actor.system.talents_combat[comp].effet_ac_0_3;
                  }
                  if (marge === 1) {
                    melee_perdue = this.actor.system.talents_combat[comp].av1;
                    effet_coup1 =
                      this.actor.system.talents_combat[comp].effet_ac_1_1;
                    effet_coup2 =
                      this.actor.system.talents_combat[comp].effet_ac_1_2;
                    effet_coup3 =
                      this.actor.system.talents_combat[comp].effet_ac_1_3;
                  }
                  if (marge === 2) {
                    melee_perdue = this.actor.system.talents_combat[comp].av2;
                    effet_coup1 =
                      this.actor.system.talents_combat[comp].effet_ac_2_1;
                    effet_coup2 =
                      this.actor.system.talents_combat[comp].effet_ac_2_2;
                    effet_coup3 =
                      this.actor.system.talents_combat[comp].effet_ac_2_3;
                  }
                  if (marge === 3) {
                    melee_perdue = this.actor.system.talents_combat[comp].av3;
                    effet_coup1 =
                      this.actor.system.talents_combat[comp].effet_ac_3_1;
                    effet_coup2 =
                      this.actor.system.talents_combat[comp].effet_ac_3_2;
                    effet_coup3 =
                      this.actor.system.talents_combat[comp].effet_ac_3_3;
                  }
                  if (marge >= 4) {
                    melee_perdue = this.actor.system.talents_combat[comp].av4;
                    effet_coup1 =
                      this.actor.system.talents_combat[comp].effet_ac_4_1;
                    effet_coup2 =
                      this.actor.system.talents_combat[comp].effet_ac_4_2;
                    effet_coup3 =
                      this.actor.system.talents_combat[comp].effet_ac_4_3;
                  }
                  switch (effet_coup1) {
                    case "H":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
                      break;
                    case "A":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
                      break;
                    case "S":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
                      break;
                    case "R":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
                      break;
                    case "I":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
                      break;
                    case "P":
                      effet_coup1 =
                        '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
                      break;
                    case "T":
                      effet_coup1 =
                        '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
                      break;
                    case "D":
                      effet_coup1 =
                        '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
                      break;
                  }
                  switch (effet_coup2) {
                    case "H":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
                      break;
                    case "A":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
                      break;
                    case "S":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
                      break;
                    case "R":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
                      break;
                    case "I":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
                      break;
                    case "P":
                      effet_coup1 =
                        '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
                      break;
                    case "T":
                      effet_coup1 =
                        '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
                      break;
                    case "D":
                      effet_coup1 =
                        '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
                      break;
                  }
                  switch (effet_coup3) {
                    case "H":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
                      break;
                    case "A":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
                      break;
                    case "S":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
                      break;
                    case "R":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
                      break;
                    case "I":
                      effet_coup1 =
                        '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
                      break;
                    case "P":
                      effet_coup1 =
                        '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
                      break;
                    case "T":
                      effet_coup1 =
                        '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
                      break;
                    case "D":
                      effet_coup1 =
                        '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
                      break;
                  }

                  if (letale) {
                    melee_perdue = calcMeleePerdue(marge, comp, this.actor);
                    if (marge == 0 && result_final >= 0) {
                      const _dmc1p = calcViePerdue(
                        melee_perdue,
                        comp,
                        this.actor,
                      );
                      vie_perdue = _dmc1p.vie_perdue;
                      result_diff +=
                        '<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ' +
                        currentTarget.name +
                        " perd <strong>" +
                        melee_perdue +
                        "</strong>pt de Mêlée</div>";
                      result_diff +=
                        '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
                        currentTarget.name +
                        " perd <strong>" +
                        vie_perdue +
                        "</strong>pt de Vie</div>";
                      if (retraitAuto) {
                        game.modules
                          .get("megasocket")
                          ?.api?.documentUpdate(currentTarget, {
                            "system.health.value":
                              currentTarget.system.health.value - vie_perdue,
                            "system.melee_impair": _dmc1p.new_melee_impair,
                          })
                          ?.then(() => {
                            game.modules
                              .get("megasocket")
                              ?.api?.documentUpdate(currentTarget, {
                                "system.power.value":
                                  currentTarget.system.power.value -
                                  melee_perdue,
                              });
                          });
                      }
                    }
                    // game.modules.get("bad-ideas-toolkit").api.documentUpdate(currentTarget,{"system.spes.rg_spe6.value": 4})

                    /*************Boutons de consommation des Avantages **********************/
                    if (Array.from(game.user.targets).length !== 0) {
                      let melee_perdue_1av = 0;
                      let melee_perdue_2av = 0;
                      let melee_perdue_3av = 0;
                      let vie_perdue_1av = 0;
                      let vie_perdue_2av = 0;
                      let vie_perdue_3av = 0;
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
                      speaker: ChatMessage.getSpeaker({ actor: this.token }),
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
            default: "NoSpe",
            close: function () {
              if (bonus !== "") {
                dialog_BONUS.render(true);
              }
            },
          },
          myDialogOptions_spes,
        );

        /******************************* Dialogue Bonus *********************/
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
        if (
          this.actor.system.reduit >= 1 &&
          this.actor.system.talents_combat[comp].score === 0
        ) {
          ui.notifications.error(
            `La fiche est mode comparse. Vous devez affecter un Rang au talent pour pouvoir lancer un jet.`,
          );
        } else {
          if (
            this.actor.system.reduit == 1 ||
            this.actor.system.pts_ardence.value === 0
          ) {
            if (_skipSpe) {
              bonus = 0;
              dialog_BONUS.render(true);
            } else {
              d2.render(true);
            }
          } //En mode figurant ou sans ardence, on va direct au BONUS
          else {
            dialog_ardence_choix.render(true);
          } //Si le joueur a de l'ardence
        }
      }
    });

    /******************************* Combats sans arme (mains nues, techniques, charge) **********************/
    html.find(".clic_mainsnues").click((ev) => {
      if (!this.token) {
        ui.notifications.error(
          "Veuillez utiliser la fiche de personnage du token !",
        );
        return;
      }
      let diff = null;
      let comp = ev.currentTarget.getAttribute("value");
      let effet_arme = "";
      let ardence = "";
      let ardence_combat = "";
      let btns_ar = {};
      let ptardence = "";
      let bonuspool = "";
      let diff2 = "";
      let label = ev.currentTarget.getAttribute("label");
      let toto = this.actor.system.pts_ardence.value;
      let currentTarget = null;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };
      let r = new Roll("1d10");
      const _fireIconMN = "<i class='fas fa-fire' style='color:#ff7900'></i>";
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: _fireIconMN.repeat(i) + " " + i,
          callback: () => (ptardence = i),
        };
      }
      let bonus = "";
      var btns = {};
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      if (this.actor.system.spe1.value !== "") {
        btns["btn_spes1"] = {
          label: this.actor.system.spe1.value,
          callback: () => (bonus = this.actor.system.rg_spe_1.value),
        };
      }
      if (this.actor.system.spe2.value !== "") {
        btns["btn_spes2"] = {
          label: this.actor.system.spe2.value,
          callback: () => (bonus = this.actor.system.rg_spe_2.value),
        };
      }
      if (this.actor.system.spe3.value !== "") {
        btns["btn_spes3"] = {
          label: this.actor.system.spe3.value,
          callback: () => (bonus = this.actor.system.rg_spe_3.value),
        };
      }
      if (this.actor.system.spe4.value !== "") {
        btns["btn_spes4"] = {
          label: this.actor.system.spe4.value,
          callback: () => (bonus = this.actor.system.rg_spe_4.value),
        };
      }
      if (this.actor.system.spe5.value !== "") {
        btns["btn_spes5"] = {
          label: this.actor.system.spe5.value,
          callback: () => (bonus = this.actor.system.rg_spe_5.value),
        };
      }
      if (this.actor.system.spe6.value !== "") {
        btns["btn_spes6"] = {
          label: this.actor.system.spe6.value,
          callback: () => (bonus = this.actor.system.rg_spe_6.value),
        };
      }
      let _skipSpe = Object.keys(btns).length <= 1;
      let type_poings = Math.floor(Math.random() * 3);
      switch (type_poings) {
        case 0:
          effet_arme = "poing01";
          break;
        case 1:
          effet_arme = "poing02";
          break;
        case 2:
          effet_arme = "poing03";
          break;
      }
      if (Array.from(game.user.targets).length != 0) {
        currentTarget = Array.from(game.user.targets)[0].actor;
        //diff2=currentTarget.system.protect_choc.value;
        diff2 = 0;
      }

      if (game.user.targets.size == 0) {
        ui.notifications.error("Vous devez selectionner au moins une cible");
        return;
      }

      let dialog_ardence_choix = new Dialog(
        {
          title: label.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#ff7900;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des points d'<b>ardence</b> ?</span></div>",
          buttons: {
            oui: {
              label: "<i class='fas fa-times'></i> NON",
              callback: () => (ardence = 0),
            },
            non: {
              label: "<i class='fas fa-fire'></i> OUI",
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
                      "<div class='card-header'><span><i class='fas fa-fire' style='color:#ff7900'></i> Vous avez <b style='color:#ff7900'>" +
                      toto +
                      "</b> pts d'ardence</span></div>" +
                      "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Combien souhaitez-vous <b>en placer</b> ?</span></div>",
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

      let d2 = new Dialog(
        {
          title: label.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-link'></i> SPÉ ASSOCIÉE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>",
          buttons: btns,
          default: "NoSpe",
          close: function () {
            if (bonus !== "") {
              dialog_BONUS.render(true);
            }
          },
        },
        myDialogOptions_spes,
      );

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
      if (
        this.actor.system.reduit >= 1 &&
        this.actor.system.talents_combat[comp].score === 0
      ) {
        ui.notifications.error(
          `La fiche est mode comparse. Vous devez affecter un Rang au talent pour pouvoir lancer un jet.`,
        );
      } else {
        if (
          this.actor.system.reduit == 1 ||
          this.actor.system.pts_ardence.value === 0
        ) {
          if (_skipSpe) {
            bonus = 0;
            dialog_BONUS.render(true);
          } else {
            d2.render(true);
          }
        } else {
          dialog_ardence_choix.render(true);
        }
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

    /************************************** Tests Initiatives ou Esquive ******************************/
    html.find(".combat_rollable").click((ev) => {
      let comp = ev.currentTarget.getAttribute("value");
      // Supprimer les termes 1d0 de la formule (valeur à 0)
      comp = comp
        .replace(/1d0\s*\+\s*/g, "")
        .replace(/\s*\+\s*1d0\b/g, "")
        .trim();
      let act = this.actor;
      let nom = ev.currentTarget.getAttribute("label");
      let dataType = ev.currentTarget.getAttribute("data-type");
      let diff = 0;
      const myDialogOptions = {
        top: 100,
        left: 100,
        classes: ["dialog", "window-dialog"],
      };

      function generateDiffButtons(min, max) {
        const buttons = {
          NC: {
            label: "NC",
            callback: () => (diff = 0),
          },
        };

        for (let i = min; i <= max; i++) {
          buttons[i] = {
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
                  result_diff,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              });
            });
          },
        },
        myDialogOptions,
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

    html.find(".reduit").click((ev) => {
      let etat = parseInt(ev.currentTarget.getAttribute("value"));
      if (etat === 1) {
        // figurant → comparse
        this.actor.update({ "system.reduit": 2 });
        this.position.width = 921;
        this.position.height = 715;
        ui.notifications.info("Le PNJ devient comparse !");
      } else if (etat === 2) {
        // comparse → acteur
        this.actor.update({ "system.reduit": 0 });
        this.position.width = 921;
        this.position.height = 715;
        ui.notifications.info("Le PNJ devient acteur !");
      } else {
        // acteur → figurant
        this.actor.update({ "system.reduit": 1 });
        this.position.width = 917;
        this.position.height = 568;
        ui.notifications.info("Le PNJ devient figurant !");
      }
    });

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

    // Clic sur un pouvoir résonant dans la table PNJ → test de pouvoir direct
    // Clic droit sur un pouvoir résonant PNJ pour afficher les détails
    // Bouton toggle activation des pouvoirs PSI du PNJ
    html.find(".toggle-pouvoirs-pnj").click((ev) => {
      const currentlyActive = this.actor.system.pouvoirs.pouvoirs_actifs;
      const updates = { "system.pouvoirs.pouvoirs_actifs": !currentlyActive };
      if (currentlyActive) {
        updates["system.pts_resonnance.value"] = 0;
      }
      this.actor.update(updates);
    });

    html.find(".pouvoir_psi_pnj").on("contextmenu", (ev) => {
      ev.preventDefault();
      const slotKey = ev.currentTarget.getAttribute("value"); // "pouvoir_psi_1" ou "pouvoir_psi_2"
      this._showPouvoirDetails(slotKey);
    });

    html.find(".pouvoir_psi_pnj").click((ev) => {
      if (!this.actor.system.pouvoirs.pouvoirs_actifs) return;
      ui.notifications.warn(
        "Pour utiliser un POUVOIR, sélectionnez d'abord un TALENT.",
      );
    });

    html.find(".pouvoir_rollable").click((ev) => {
      flashMagicHalo(html);
      let dataType = ev.currentTarget.getAttribute("data-type");
      let rgtotal = 0;
      let r = new Roll("1d10");
      if (dataType == "Transit") {
        let spe_transit = this.actor.system.pouvoirs.spe_transit?.value || 0;
        let score_transit = this.actor.system.pouvoirs.transit?.value || 0;
        rgtotal = Math.max(1, score_transit + spe_transit);
        r = new Roll(
          "1d" +
            rgtotal +
            "+1d" +
            Math.max(1, this.actor.system.caracs.resonnance?.value || 1) +
            "+1d" +
            Math.max(1, this.actor.system.caracs.sens?.value || 1),
        );
      } else if (dataType == "Transfert") {
        let spe_transfert =
          this.actor.system.pouvoirs.spe_transfert?.value || 0;
        let score_transfert = this.actor.system.pouvoirs.transfert?.value || 0;
        rgtotal = Math.max(1, score_transfert + spe_transfert);
        r = new Roll(
          "1d" +
            rgtotal +
            "+1d" +
            Math.max(1, this.actor.system.caracs.resonnance?.value || 1) +
            "+1d" +
            Math.max(1, this.actor.system.caracs.caractere?.value || 1),
        );
      }
      r.evaluate().then(() =>
        r.toMessage({
          flavor:
            "<div class='card-header'><span>" + dataType + "</span></div>",
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        }),
      );
    });

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

    // Clic droit sur un talent : afficher la description
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

    html.find(".talents_rollable").click((ev) => {
      // ── Mode comparse (reduit=2) : jet simplifié 1d talent + spé ──
      if (this.actor.system.reduit === 2) {
        const comp = ev.currentTarget.getAttribute("value");
        const talentName = this.actor.system.talents[comp].label;
        const talentVal = this.actor.system.talents[comp].value;
        if (!talentVal || talentVal <= 0) {
          ui.notifications.error(
            "Ce talent n'a pas de valeur. Impossible de lancer un jet.",
          );
          return;
        }
        let bonus = "";
        let diff = 22;

        // Construction des boutons de spé
        const btns_spe = {};
        btns_spe["NoSpe"] = {
          label: "Aucune SPE",
          callback: () => (bonus = 0),
        };
        if (this.actor.system.spe1.value !== "") {
          btns_spe["btn_spes1"] = {
            label: this.actor.system.spe1.value,
            callback: () => (bonus = this.actor.system.rg_spe_1.value),
          };
        }
        if (this.actor.system.spe2.value !== "") {
          btns_spe["btn_spes2"] = {
            label: this.actor.system.spe2.value,
            callback: () => (bonus = this.actor.system.rg_spe_2.value),
          };
        }
        if (this.actor.system.spe3.value !== "") {
          btns_spe["btn_spes3"] = {
            label: this.actor.system.spe3.value,
            callback: () => (bonus = this.actor.system.rg_spe_3.value),
          };
        }
        if (this.actor.system.spe4.value !== "") {
          btns_spe["btn_spes4"] = {
            label: this.actor.system.spe4.value,
            callback: () => (bonus = this.actor.system.rg_spe_4.value),
          };
        }

        const myDialogOptions_spes = {
          top: 100,
          left: 100,
          width: 900,
          classes: ["dialog", "window-dialog"],
        };
        const myDialogOptions_diff = {
          top: 100,
          left: 100,
          width: 1000,
          classes: ["dialog", "window-dialog"],
        };

        const buttonsNC_diff = {
          NC: {
            label: "NC",
            callback: () => {
              diff = 0;
            },
          },
        };
        for (let i = 4; i <= 27; i++) {
          buttonsNC_diff[`b${i}`] = {
            label: `${i}`,
            callback: ((val) => () => {
              diff = val;
            })(i),
          };
        }

        const d_diff = new Dialog(
          {
            title: talentName.toUpperCase(),
            content:
              `<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>` +
              `<div style='padding:12px 8px;text-align:center'>` +
              `<i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i>` +
              `<span class='bouton_texte'>Sélectionnez la DIFF ou "NC" si elle n'est pas communiquée</span></div>`,
            buttons: buttonsNC_diff,
            default: "NC",
            close: () => {
              if (diff === 22) return; // fermé sans sélection
              const de = bonus > 0 ? talentVal + bonus : talentVal;
              const r = new Roll(`1d${de}`);
              r.evaluate().then(() => {
                let result_diff = "";
                if (diff !== 0) {
                  let final = r.total - diff;
                  if (final >= 0) {
                    final = Math.floor(final / 3);
                    result_diff =
                      `<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ${diff}</div>` +
                      `<div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite ` +
                      `<span class="mega-roll-margin">Marge : ${final}</span></div>`;
                  } else {
                    final = Math.ceil(final / 3);
                    result_diff =
                      `<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ${diff}</div>` +
                      `<div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec ` +
                      `<span class="mega-roll-margin">Marge : ${final}</span></div>`;
                  }
                } else {
                  result_diff = `<div class="mega-roll-diff mega-roll-diff-nc"><i class="fas fa-question-circle"></i> DIFF NC</div>`;
                }
                r.toMessage({
                  flavor: `<div class='card-header'><span>${talentName}</span></div><div><span>${result_diff}</span></div>`,
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                });
              });
            },
          },
          myDialogOptions_diff,
        );

        const d_spe = new Dialog(
          {
            title: "SPE",
            content:
              `<div class='card-header'><span><i class='fas fa-link'></i> SPÉ ASSOCIÉE</span></div>` +
              `<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i>` +
              `<span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>`,
            buttons: btns_spe,
            default: "NoSpe",
            close: function () {
              if (bonus !== "") {
                d_diff.render(true);
              }
            },
          },
          myDialogOptions_spes,
        );

        d_spe.render(true);
        return;
      }
      // ── Fin mode comparse ──

      let pouvoir;
      let carac = "";
      let bonus = "";
      let bonuspool = "";
      var btns = {};
      var btns_ar = {};
      let NoSpe = "";
      let diff = 22;
      let ardence = "";
      let ptardence = 0;
      let comp = ev.currentTarget.getAttribute("value");
      let talentName = this.actor.system.talents[comp].label;
      let numPouv = 1;
      let pouvoirPresent = this.actor.system.pouvoirs.pouvoir_psi_2.label;
      let pouvoirOK = this.actor.system.pouvoirs.pouvoirs_actifs === true;
      if (
        pouvoirOK &&
        this.actor.system.pouvoirs.pouvoir_psi_1.label === "" &&
        this.actor.system.pouvoirs.pouvoir_psi_2.label === ""
      ) {
        pouvoirOK = false;
      }
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_numPouv = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      if (this.actor.system.spe1.value !== "") {
        btns["btn_spes1"] = {
          label: this.actor.system.spe1.value,
          callback: () => (bonus = this.actor.system.rg_spe_1.value),
        };
      }
      if (this.actor.system.spe2.value !== "") {
        btns["btn_spes2"] = {
          label: this.actor.system.spe2.value,
          callback: () => (bonus = this.actor.system.rg_spe_2.value),
        };
      }
      if (this.actor.system.spe3.value !== "") {
        btns["btn_spes3"] = {
          label: this.actor.system.spe3.value,
          callback: () => (bonus = this.actor.system.rg_spe_3.value),
        };
      }
      if (this.actor.system.spe4.value !== "") {
        btns["btn_spes4"] = {
          label: this.actor.system.spe4.value,
          callback: () => (bonus = this.actor.system.rg_spe_4.value),
        };
      }
      // if (this.actor.system.spe5.value!=="") {
      // 	btns[this.actor.system.spe5.value] = { label: this.actor.system.spe5.value, callback: () => bonus = this.actor.system.rg_spe_5.value};
      // }
      // if (this.actor.system.spe6.value!=="") {
      // 	btns[this.actor.system.spe6.value] = { label: this.actor.system.spe6.value, callback: () => bonus = this.actor.system.rg_spe_6.value};
      // }
      let _skipSpe = Object.keys(btns).length <= 1;

      const _fireIconTal = "<i class='fas fa-fire' style='color:#ff7900'></i>";
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: _fireIconTal.repeat(i) + " " + i,
          callback: () => (ptardence = i),
        };
      }
      let pts_reso = this.actor.system.pts_resonnance.value;
      let d_ard = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-fire'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#ff7900;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des points d'<b>ardence</b> ?</span></div>",
          buttons: {
            oui: {
              label: "<i class='fas fa-times'></i> NON",
              // open: function() { $(this).addClass('yescls') },
              // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
              callback: () => (ardence = 0),
            },
            non: {
              label: "<i class='fas fa-fire'></i> OUI",
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
              if (pouvoirOK) {
                d0.render(true);
              } else {
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
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#ff7900'></i> Vous avez <b style='color:#ff7900'>" +
            this.actor.system.pts_ardence.value +
            "</b> pts d'ardence</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Combien souhaitez-vous <b>en placer</b> ?</span></div>",
          buttons: btns_ar,
          //close: () => d.render(true)
          close: function () {
            if (pouvoirOK) {
              d0.render(true);
            } else {
              d.render(true);
            }
          },
        },
        myDialogOptions,
      );

      const _psiDisabled = pts_reso <= 0;
      let _stopBtnParticles = null;

      let d0 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-dice-d20'></i> TYPE DE TEST</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Quel type de <b>TEST</b> souhaitez-vous réaliser ?</span></div>",
          buttons: {
            talent: {
              label:
                '<span class="bouton_talent"><i class="fas fa-sign-language"></i> Trait</span>',
              callback: () => (pouvoir = 0),
            },
            pouvoir: {
              label: _psiDisabled
                ? '<span class="bouton_pouvoir mega-psi-disabled"><i class="fas fa-ban"></i> Plus de Résonance</span>'
                : '<span class="bouton_pouvoir"><i class="fas fa-podcast"></i> Pouvoir PSI</span>',
              callback: () => {
                if (_psiDisabled) return;
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
              else {
                if (_skipSpe) {
                  bonus = 0;
                  d3.render(true);
                } else {
                  d2.render(true);
                }
              }
            }
            if (pouvoir === 0) {
              d.render(true);
            }
          },
        },
        myDialogOptions_test,
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
          close: function () {
            if (_skipSpe) {
              bonus = 0;
              d3.render(true);
            } else {
              d2.render(true);
            }
          },
        },
        myDialogOptions_numPouv,
      );

      let d = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><i class='fas fa-sign-language'></i> TRAIT</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Quel <b>TRAIT</b> voulez-vous utiliser ?</span></div>",
          buttons: {
            aucun: {
              label: '<p style="background-color:tomato;">AUCUN</p>',
              callback: () => (carac = "PASSER"),
            },
            vivacite: {
              label: "VIVACITE",
              callback: () => (carac = "vivacite"),
            },
            sens: {
              label: "SENS",
              callback: () => (carac = "sens"),
            },
            adresse: {
              label: "ADRESSE",
              callback: () => (carac = "adresse"),
            },
            reflexion: {
              label: "REFLEXION",
              callback: () => (carac = "reflexion"),
            },
            ardence: {
              label: "ARDENCE",
              callback: () => (carac = "ardence"),
            },
            force: {
              label: "FORCE",
              callback: () => (carac = "force"),
            },
            caractere: {
              label: "CARACTERE",
              callback: () => (carac = "caractere"),
            },
            resonnance: {
              label: "RESONNANCE",
              callback: () => (carac = "resonnance"),
            },
            endurance: {
              label: "ENDURANCE",
              callback: () => (carac = "endurance"),
            },
          },
          default: "VIVACITÉ",
          // close: () => d2.render(true)
          close: function () {
            pouvoir = 0;
            if (carac !== "") {
              if (_skipSpe) {
                bonus = 0;
                d3.render(true);
              } else {
                d2.render(true);
              }
            }
          },
        },
        myDialogOptions_traits,
      );

      if (this.actor.system.pts_ardence.value !== 0) {
        d_ard.render(true);
      } else {
        if (pouvoirOK) {
          d0.render(true);
        } else {
          d.render(true);
        }
      }
      let d2 = new Dialog(
        {
          title: "SPE",
          content:
            "<div class='card-header'><span><i class='fas fa-link'></i> SPÉ ASSOCIÉE</span></div>" +
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
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la DIFF ou \"NC\" si elle n'est pas communiquée</span></div>",
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          // close: () => this.testComp(ev, carac, bonus, bonuspool, pouvoir,diff,ptardence)
          close: () => {
            if (diff !== 22) {
              this._numPouv = numPouv;
              this.testComp(
                ev,
                carac,
                bonus,
                bonuspool,
                pouvoir,
                diff,
                ptardence,
              );
            }
          },
        },
        myDialogOptions_diff,
      );
    });

    html.find(".competences_rollable").click((ev) => {
      let dataType = ev.currentTarget.getAttribute("data-type");
      // let comp = ev.currentTarget.getAttribute("value");
      let Spe = "";
      let Rang = 0;
      let diff = "";
      let bonus = "";
      let NoSpe = "";
      let btns = {};
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };
      btns["NoSpe"] = { label: "Aucune SPE", callback: () => (bonus = 0) };
      if (this.actor.system.spe1.value !== "") {
        btns["btn_spes1"] = {
          label: this.actor.system.spe1.value,
          callback: () => (bonus = this.actor.system.rg_spe_1.value),
        };
      }
      if (this.actor.system.spe2.value !== "") {
        btns["btn_spes2"] = {
          label: this.actor.system.spe2.value,
          callback: () => (bonus = this.actor.system.rg_spe_2.value),
        };
      }
      if (this.actor.system.spe3.value !== "") {
        btns["btn_spes3"] = {
          label: this.actor.system.spe3.value,
          callback: () => (bonus = this.actor.system.rg_spe_3.value),
        };
      }
      if (this.actor.system.spe4.value !== "") {
        btns["btn_spes4"] = {
          label: this.actor.system.spe4.value,
          callback: () => (bonus = this.actor.system.rg_spe_4.value),
        };
      }

      if (dataType === "talent_simp1") {
        Rang = this.actor.system.rg_talent_simp1.value;
        Spe = this.actor.system.talent_simp1.value;
      }
      if (dataType === "talent_simp2") {
        Rang = this.actor.system.rg_talent_simp2.value;
        Spe = this.actor.system.talent_simp2.value;
      }
      if (dataType === "talent_simp3") {
        Rang = this.actor.system.rg_talent_simp3.value;
        Spe = this.actor.system.talent_simp3.value;
      }
      if (dataType === "talent_simp4") {
        Rang = this.actor.system.rg_talent_simp4.value;
        Spe = this.actor.system.talent_simp4.value;
      }
      if (dataType === "talent_simp5") {
        Rang = this.actor.system.rg_talent_simp5.value;
        Spe = this.actor.system.talent_simp5.value;
      }
      if (dataType === "talent_simp6") {
        Rang = this.actor.system.rg_talent_simp6.value;
        Spe = this.actor.system.talent_simp5.value;
      }
      if (dataType === "talent_simp7") {
        Rang = this.actor.system.rg_talent_simp7.value;
        Spe = this.actor.system.talent_simp5.value;
      }

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

      let d_diff = new Dialog(
        {
          title: "DIFF",
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la DIFF ou \"NC\" si elle n'est pas communiquée</span></div>",
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          close: () => {
            if (diff !== "") {
              let rollFormula = "";
              {
                let remaining = Number(Rang);
                const dice = [];
                while (remaining > 12) {
                  dice.push("1d10");
                  remaining -= 10;
                }
                if (remaining > 0) dice.push(`1d${remaining}`);
                rollFormula = dice.length > 0 ? dice.join("+") : "1d10";
              }
              let r = new Roll(rollFormula);
              r.evaluate().then(() => {
                let resultat = r.total;
                let final = resultat - diff;
                let result_diff = "";
                console.log("resultat : " + resultat);
                if (diff !== 0) {
                  if (final > 0) {
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
                    Spe +
                    "</span></div>" +
                    "<div><span>" +
                    result_diff +
                    "</span></div>",
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                });
              }, myDialogOptions);
            }
          },
        },
        myDialogOptions_diff,
      );

      let d2 = new Dialog(
        {
          title: "SPE",
          content:
            "<div class='card-header'><span><i class='fas fa-link'></i> SPÉ ASSOCIÉE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-link' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous utiliser une <b>SPÉ</b> ?</span></div>",
          buttons: btns,
          default: "non",
          // close: () => d3.render(true)
          close: function () {
            Rang = Number(Rang) + Number(bonus);
            d_diff.render(true);
          },
        },
        myDialogOptions_spes,
      );

      // console.log("Rang : " + Rang);
      if (Rang !== 0) {
        if (
          this.actor.system.spe1.value !== "" ||
          this.actor.system.spe2.value !== "" ||
          this.actor.system.spe3.value !== "" ||
          this.actor.system.spe4.value !== ""
        ) {
          d2.render(true);
        } else {
          d_diff.render(true);
        }
      } else {
        ui.notifications.error("Il n'y a pas de Rang associé à ce talent !");
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
      };
      let icon1 = "systems/mega/images/histogram.svg";
      const _trow = (badge, badgeBg, label, desc) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 4px;border-bottom:1px solid rgba(128,128,128,0.12);">` +
        `<span style="background:${badgeBg};color:#fff;font-weight:bold;font-size:12px;min-width:36px;height:26px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-family:monospace;letter-spacing:-0.5px;">${badge}</span>` +
        `<div style="flex:1;font-size:12.5px;line-height:1.4;">${desc}</div>` +
        `</div>`;
      const description =
        `<div style="padding:12px 14px;font-size:13px;line-height:1.45;">` +
        _trow(
          "\u2715",
          "rgba(160,30,30,0.85)",
          "Talent d\u00e9test\u00e9",
          "<strong>Talent d\u00e9test\u00e9</strong> <span style='opacity:0.6;font-size:11px;'>(saisir 99 dans la fiche)</span><br><span style='opacity:0.75;'>Pratique &eacute;vit&eacute;e, quasi phobique.</span>",
        ) +
        _trow(
          "-2Rg",
          "rgba(200,80,20,0.85)",
          "Talent maudit",
          "<strong>Talent maudit</strong><br><span style='opacity:0.75;'>Pratique maudite, mauvais feeling, toujours un probl\u00e8me.</span>",
        ) +
        _trow(
          "d0",
          "rgba(100,100,110,0.80)",
          "",
          "Pratique rare, au minimum &mdash; pas d&rsquo;entra\u00eenement particulier.",
        ) +
        _trow(
          "d2",
          "rgba(110,100,80,0.82)",
          "",
          "Pratique vaguement exerc\u00e9e.",
        ) +
        _trow(
          "d4",
          "rgba(160,130,20,0.85)",
          "",
          "Pratique correcte, apprise ou travaill\u00e9e.",
        ) +
        _trow(
          "d6",
          "rgba(60,150,80,0.85)",
          "",
          "Pratique fr\u00e9quente, travaill\u00e9e et r\u00e9guli\u00e8rement exerc\u00e9e.",
        ) +
        _trow(
          "d8",
          "rgba(30,140,100,0.85)",
          "",
          "Pratique tr\u00e8s exerc\u00e9e &mdash; bonne intuition et anticipation des probl\u00e8mes.",
        ) +
        _trow(
          "d10",
          "rgba(30,100,180,0.85)",
          "",
          "Pratique essentielle du personnage, r\u00e9fl\u00e9chie, travaill\u00e9e et exerc\u00e9e quotidiennement, m\u00eame virtuellement.",
        ) +
        _trow(
          "d12",
          "rgba(80,50,170,0.85)",
          "",
          "Pratique essentielle travaill\u00e9e quotidiennement, intensivement, au d\u00e9triment d&rsquo;autres activit\u00e9s.",
        ) +
        _trow(
          "d14",
          "rgba(130,30,140,0.90)",
          "",
          "<strong>Hors-norme.</strong>",
        ) +
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
            `<div style="opacity:0.65;font-size:11.5px;">Du talent d\u00e9test\u00e9 au hors-norme &mdash; 10 niveaux de ma\u00eetrise</div>` +
            `</div></div>`,
          footer: "",
          tabs: [
            { title: "Domaines et Talents", content: description, icon: icon1 },
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

    // Clic droit sur le libellé d'un trait : afficher la description
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

    html.find(".traits_rollable").click((ev) => {
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
      // el.textContent = "Traits";
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        classes: ["dialog", "window-dialog"],
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        classes: ["dialog", "window-dialog"],
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        classes: ["dialog", "window-dialog"],
      };
      // animationJet();
      const _fireIconTrait =
        "<i class='fas fa-fire' style='color:#ff7900'></i>";
      for (let i = 1; i <= this.actor.system.pts_ardence.value; i++) {
        btns_ar[i] = {
          label: _fireIconTrait.repeat(i) + " " + i,
          callback: () => (ptardence = i),
        };
      }
      let d_ard2 = new Dialog(
        {
          title: traitName,
          content:
            "<div class='card-header'><span><i class='fas fa-fire' style='color:#ff7900'></i> Vous avez <b style='color:#ff7900'>" +
            this.actor.system.pts_ardence.value +
            "</b> pts d'ardence</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Combien souhaitez-vous <b>en placer</b> ?</span></div>",
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
          title: traitName,
          content:
            "<div class='card-header'><span><i class='fas fa-fire'></i> ARDENCE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-fire' style='font-size:2em;color:#ff7900;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Voulez-vous placer des points d'<b>ardence</b> ?</span></div>",
          buttons: {
            oui: {
              label: "<i class='fas fa-times'></i> NON",
              // open: function() { $(this).addClass('yescls') },
              // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
              callback: () => (ardence = 0),
            },
            non: {
              label: "<i class='fas fa-fire'></i> OUI",
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
          title: traitName,
          content:
            "<div class='card-header'><span><i class='fas fa-dice-d20'></i> TYPE DE TEST</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Quel type de <b>TEST</b> souhaitez-vous réaliser ?</span></div>",
          buttons: {
            duel: {
              label: "DUEL",
              callback: () => (type_test = "duel"),
            },
            trois: {
              label: "TRAITS + DOMAINE",
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
                // else {setTimeout(function(){choix.render(true);},2000);
              }
            }
          },
        },
        myDialogOptions_test,
      );

      let d = new Dialog(
        {
          title: traitName,
          content:
            "<div class='card-header'><span><i class='fas fa-sign-language'></i> TRAIT N°2</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Quel <b>TRAIT</b> voulez-vous utiliser ?</span></div>",
          buttons: {
            vivacite: {
              label: "VIVACITE",
              callback: () => (carac = "vivacite"),
            },
            sens: {
              label: "SENS",
              callback: () => (carac = "sens"),
            },
            adresse: {
              label: "ADRESSE",
              callback: () => (carac = "adresse"),
            },
            reflexion: {
              label: "REFLEXION",
              callback: () => (carac = "reflexion"),
            },
            ardence: {
              label: "ARDENCE",
              callback: () => (carac = "ardence"),
            },
            force: {
              label: "FORCE",
              callback: () => (carac = "force"),
            },
            caractere: {
              label: "CARACTERE",
              callback: () => (carac = "caractere"),
            },
            resonnance: {
              label: "RESONNANCE",
              callback: () => (carac = "resonnance"),
            },
            endurance: {
              label: "ENDURANCE",
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
      // if (this.actor.system.pts_ardence.value!==0) {setTimeout(function(){d_ard.render(true);},2000);}
      // else {setTimeout(function(){choix.render(true);},2000);}
      choix.render(true);

      let d2 = new Dialog(
        {
          title: traitName,
          content:
            "<div class='card-header'><span><i class='fas fa-globe'></i> DOMAINE</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><span class='bouton_texte'>Quel <b>DOMAINE</b> voulez-vous utiliser ?</span></div>",
          buttons: {
            COMMUNICATION: {
              label: "COMMUNICATION",
              callback: () => (carac2 = "communication"),
            },
            PRATIQUE: {
              label: "PRATIQUE",
              callback: () => (carac2 = "pratique"),
            },
            CULTUREMILIEU: {
              label: "CULTURE MILIEUX...",
              callback: () => (carac2 = "culture_milieux"),
            },
            COMBAT: {
              label: "COMBAT",
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
          title: traitName,
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
          title: traitName,
          content:
            "<div class='card-header'><span><i class='fas fa-bullseye'></i> DIFFICULTÉ</span></div>" +
            "<div style='padding:12px 8px;text-align:center'><i class='fas fa-bullseye' style='font-size:2em;color:#aaa;display:block;margin-bottom:8px'></i><span class='bouton_texte'>Sélectionnez la DIFF ou \"NC\" si elle n'est pas communiquée</span></div>",
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
   * Calcule la somme des bonus de défense par localisation et par type d'attaque.
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

    const sys = this.actor.system;
    const baseDef =
      (Number(sys.def?.value) || 0) +
      (Number(sys.def_modif?.value) || 0) +
      (Number(sys.bonus_armes_def) || 0);

    return zones.map((zone) => {
      const row = { label: zone.label };
      for (const type of types) {
        let total = baseDef;
        for (const prot of equippedProtections) {
          const c = prot.system.caracs;
          if (Number(c[`def_${zone.key}`]) === 1) {
            total += Number(c[`def_${type}`]) || 0;
          }
        }
        row[type] = total;
      }
      return row;
    });
  }

  /**
   * Affiche un dialogue popup avec le tableau des défenses par localisation.
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
            html.find("td.loc-highlighted").removeClass("loc-highlighted");
            html.find(`td[data-rowidx="${idx}"]`).addClass("loc-highlighted");
            html.find("#random-loc-result").text(`➤ ${data[idx].label}`);
            const $icon = $(this).find(".fa-dice-d6");
            $icon.addClass("dice-rolling");
            setTimeout(() => $icon.removeClass("dice-rolling"), 420);
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
      let item = i.data;
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

    // Pour PNJ, les valeurs sont directement "pouvoir_psi_1" ou "pouvoir_psi_2"
    const mappedPouvoirType =
      pouvoirType === "pouvoir_psi"
        ? "pouvoir_psi_1"
        : pouvoirType === "pouvoir_psi2"
          ? "pouvoir_psi_2"
          : pouvoirType;

    ({ numItem, grade, titre } = getPouvoirData(mappedPouvoirType));

    if (!itemsPouvoir[numItem]) {
      ui.notifications.error(`Pouvoir non trouvé dans l'inventaire`);
      return;
    }

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
    if (numTab >= 1)
      tabs.push({ title: tab1, content: description1, icon: icon1 });
    if (numTab >= 2)
      tabs.push({ title: tab2, content: description2, icon: icon2 });
    if (numTab >= 3)
      tabs.push({ title: tab3, content: description3, icon: icon3 });
    if (numTab >= 4)
      tabs.push({ title: tab4, content: description4, icon: icon4 });
    if (aide)
      tabs.push({
        title: tab_aide,
        content: description_aide,
        icon: icon_aide,
      });

    const _gradeStars = (g) =>
      `<span style="color:inherit;font-size:13px;letter-spacing:2px;">${"★".repeat(Math.min(g, 12))}${"\u2606".repeat(Math.max(0, 12 - g))}</span>`;

    const pouvoirIconClass = "fas fa-brain";
    const pouvoirTypeLabel =
      mappedPouvoirType === "pouvoir_psi_2" ? "Pouvoir Psi 2" : "Pouvoir Psi 1";

    const headerHtml =
      `<div style="background:linear-gradient(135deg,rgba(6,28,14,0.98) 0%,rgba(16,58,30,0.95) 100%);border-radius:0;padding:14px 18px 12px;margin-bottom:0;display:flex;align-items:center;gap:16px;border-left:4px solid rgba(130,224,170,0.85);border-bottom:1px solid rgba(130,224,170,0.25);">` +
      `<div class="spd-orb-wrap"><span class="spd-orb"><img class="spd-portrait" src="${itemImg}" alt="${titre}" /><div class="spd-orb-ring"></div><div class="spd-orb-glow"></div></span></div>` +
      `<div style="flex:1;">` +
      `<div style="font-size:15px;font-weight:bold;letter-spacing:0.5px;color:#e0ffe8;margin-bottom:5px;">${titre}</div>` +
      `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">` +
      `<span style="background:rgba(130,224,170,0.20);color:rgba(150,230,185,1);font-size:10.5px;padding:2px 10px;border-radius:10px;border:1px solid rgba(130,224,170,0.38);font-weight:bold;"><i class="fas fa-layer-group" style="margin-right:4px;font-size:9px;"></i>Grade&nbsp;<strong>${grade}</strong></span>` +
      `<span style="color:rgba(130,224,170,0.85);">${_gradeStars(grade)}</span>` +
      `<span style="background:rgba(14,55,28,0.65);color:rgba(150,230,185,0.90);font-size:10px;padding:2px 9px;border-radius:10px;border:1px solid rgba(82,180,120,0.35);"><i class="${pouvoirIconClass}" style="margin-right:3px;font-size:9px;"></i>${pouvoirTypeLabel}</span>` +
      `</div></div></div>`;

    const tab = new TabbedDialog(
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

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.system.attributes;
    const form = this.form;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItemCreate(itemData) {
    // Foundry v12 peut passer un tableau ou un objet unique
    const items = Array.isArray(itemData) ? itemData : [itemData];
    const pouvoirItems = items.filter((i) => i.type === "Pouvoir");
    if (pouvoirItems.length > 0) {
      const currentCount = this.actor.items.filter(
        (i) => i.type === "Pouvoir",
      ).length;
      if (currentCount + pouvoirItems.length > 2) {
        ui.notifications.warn(
          "Vous ne pouvez avoir que 2 pouvoirs résonants. Supprimez-en un d'abord.",
        );
        return false;
      }
      pouvoirItems.forEach((item) => {
        item.system = item.system || {};
        item.system.equipe = true;
      });
    }
    return super._onDropItemCreate(itemData);
  }

  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  testComp(ev, carac, bonus, bonuspool, pouvoir, diff, ptardence) {
    let comp = ev.currentTarget.getAttribute("value");
    let nomComp = this.actor.system.talents[comp].label;
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let mod = this.actor.system.talents[comp].value + bonus;
    let nomDomaine =
      this.actor.system.talents[comp].domaine !== "culture_milieux"
        ? this.actor.system.talents[comp].domaine
        : "CULTURE MILIEUX";
    let r = new Roll("1d10");
    let btns_1 = {};
    let btns_2 = {};
    let btns_3 = {};
    let ardence_talent = 0;
    let ardence_domaine = 0;
    let ardence_trait = 0;
    let rgardencetotal = ptardence * 2;
    const myDialogOptions = {
      top: 100,
      left: 100,
    };
    const myDialogOptions_ardence = {
      top: 100,
      left: 100,
      width: 600,
      height: 200,
    };
    if (ptardence >= 1) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
    }
    if (ptardence >= 2) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
    }
    if (ptardence >= 3) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
    }
    if (ptardence >= 4) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
      btns_1[4] = { label: "8 Rg", callback: () => (ardence_talent = 8) };
    }
    //currentTarget.update({"system.power.value": currentTarget.system.power.value - melee_perdue});
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
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au TALENT " +
          nomComp.toUpperCase() +
          " ?</span><br><br>",
        buttons: btns_1,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_talent;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_2[0] = {
              label: "PASSER",
              callback: () => (ardence_domaine = 0),
            };
          }
          if (ptardence >= 1) {
            btns_2[0] = {
              label: "PASSER",
              callback: () => (ardence_domaine = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          }
          if (ptardence >= 2) {
            btns_2[0] = {
              label: "PASSER",
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
              label: "PASSER",
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
              label: "PASSER",
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
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au DOMAINE " +
          nomDomaine.toUpperCase() +
          " ?</span><br><br>",
        buttons: btns_2,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_domaine;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
          }
          if (ptardence >= 1) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          }
          if (ptardence >= 2) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          }
          if (ptardence >= 3) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          }
          if (ptardence >= 4) {
            btns_3[0] = {
              label: "PASSER",
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
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au Pouvoir PSI ?</span><br><br>",
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
          ),
      },
      myDialogOptions_ardence,
    );

    let diag_pouv = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> RÉSONNANCE ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au TRAIT RÉSONNANCE ?</span><br><br>",
        buttons: btns_2,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_domaine;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
          }
          if (ptardence >= 1) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          }
          if (ptardence >= 2) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          }
          if (ptardence >= 3) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          }
          if (ptardence >= 4) {
            btns_3[0] = {
              label: "PASSER",
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
    if (pouvoir == 0 && carac != "PASSER") {
      trait = this.actor.system.caracs[carac].label;
    } else {
      trait = "yo";
    }
    let diag3 = new Dialog(
      {
        title: nomComp.toUpperCase(),
        content:
          "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
          trait +
          " ?</span></div>" +
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au TRAIT " +
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
          btns_3[0] = { label: "PASSER", callback: () => (ardence_trait = 0) };
        }
        if (ptardence >= 1) {
          btns_3[0] = { label: "PASSER", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
        }
        if (ptardence >= 2) {
          btns_3[0] = { label: "PASSER", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
        }
        if (ptardence >= 3) {
          btns_3[0] = { label: "PASSER", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
        }
        if (ptardence >= 4) {
          btns_3[0] = { label: "PASSER", callback: () => (ardence_trait = 0) };
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
            label: "PASSER",
            callback: () => (ardence_domaine = 0),
          };
        }
        if (ptardence >= 1) {
          btns_2[0] = {
            label: "PASSER",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
        }
        if (ptardence >= 2) {
          btns_2[0] = {
            label: "PASSER",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
        }
        if (ptardence >= 3) {
          btns_2[0] = {
            label: "PASSER",
            callback: () => (ardence_domaine = 0),
          };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
        }
        if (ptardence >= 4) {
          btns_2[0] = {
            label: "PASSER",
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
  ) {
    let comp = ev.currentTarget.getAttribute("value");
    let nomComp = this.actor.system.talents[comp].label;
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let mod = this.actor.system.talents[comp].value + bonus;
    let rollFormula = "";
    let result_diff = "";
    let r = new Roll("1d10");
    let talent_maudit = 0;
    let final = 0;
    let de_trait = "";
    let de_domaine = 0;
    let rgardencetotal = ptardence * 2;
    let de_talent = mod + ardence_talent;
    if (pouvoir === 0) {
      //animations
      const tokens = canvas.tokens.controlled;
      if (tokens.length != 0 && !game.user.isGM) {
        const data = {
          file: "modules/JB2A_DnD5e/Library/TMFX/Border/Circle/BorderSimple_04_Circle_Normal_500.webm",
          anchor: {
            x: 0.6,
            y: 0.35,
          },
          position: {
            x: tokens[0].x,
            y: tokens[0].y,
          },

          angle: 90,
          speed: 0,
          scale: {
            x: 0.3,
            y: 0.3,
          },
        };
        canvas.specials.playVideo(data);
        game.socket.emit("module.fxmaster", data);
      }
      if (carac != "PASSER") {
        de_trait = this.actor.system.caracs[carac].value + ardence_trait;
      } else {
        de_trait = 0;
      }
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
          if (carac != "PASSER") {
            rollFormula =
              "1d" +
              de_talent +
              "+ 1d" +
              de_domaine +
              "+ 1d" +
              de_trait +
              "+ " +
              bonuspool;
          } else {
            rollFormula = "1d" + de_talent + "+ " + bonuspool;
          }
        }
        if (bonuspool === 0) {
          if (carac != "PASSER") {
            rollFormula =
              "1d" + de_talent + "+ 1d" + de_domaine + "+ 1d" + de_trait;
          } else {
            rollFormula = "1d" + de_talent;
          }
        }
      }
      if (mod === 0 || this.actor.system.talents[comp].value === -2) {
        if (bonuspool !== 0) {
          if (carac != "PASSER") {
            rollFormula =
              "1d" + de_domaine + "+ 1d" + de_trait + "+ " + bonuspool;
          } else {
            rollFormula = bonuspool;
          }
        }
        if (bonuspool === 0) {
          if (carac != "PASSER") {
            rollFormula = "1d" + de_domaine + "+ 1d" + de_trait;
          } else {
            rollFormula = "1d0";
          }
        }
      }
      if (mod > 98) {
        if (bonuspool !== 0) {
          if (carac != "PASSER") {
            rollFormula = "1d" + de_trait + "+ " + bonuspool;
          } else {
            rollFormula = bonuspool;
          }
        }
        if (bonuspool === 0) {
          if (carac != "PASSER") {
            rollFormula = "1d" + de_trait;
          } else {
            rollFormula = "1d0";
          }
        }
      }
    }
    if (pouvoir === 1) {
      if (this.actor.system.talents[comp].value === -2) {
        talent_maudit = -2;
      }

      //animation du pouvoir
      const tokens = canvas.tokens.controlled;
      if (tokens.length != 0 && !game.user.isGM) {
        const data = {
          file: "modules/animated-spell-effects/spell-effects/magic/magic_ball_CIRCLE_02.webm",
          anchor: {
            x: 0.6,
            y: 0.35,
          },
          position: {
            x: tokens[0].x,
            y: tokens[0].y,
          },

          angle: 90,
          speed: 0,
          scale: {
            x: 0.7,
            y: 0.7,
          },
        };
        canvas.specials.playVideo(data);
        game.socket.emit("module.fxmaster", data);
      }

      de_trait =
        this.actor.system.caracs.resonnance.value +
        ardence_domaine +
        talent_maudit;
      const _numPouv = this._numPouv || 1;
      de_domaine = parseFloat(
        this.actor.system.pouvoirs["pouvoir_psi_" + _numPouv].rg,
      );
      de_domaine += ardence_trait;
      // faire test si de_talent ===0!
      if (mod > 0 && mod < 99) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + mod  +"+1d"+this.actor.system.caracs.resonnance.value + "+1d"+ this.actor.system.pouvoirs.rg_pouvoir_psi_1.value + "+ "+bonuspool;
          rollFormula =
            "1d" +
            de_talent +
            "+1d" +
            de_trait +
            "+1d" +
            de_domaine +
            "+ " +
            bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + mod  +"+1d"+this.actor.system.caracs.resonnance.value + "+1d"+ this.actor.system.pouvoirs.rg_pouvoir_psi_1.value;
          rollFormula =
            "1d" + de_talent + "+1d" + de_trait + "+1d" + de_domaine;
        }
      }
      if (mod === 0 || this.actor.system.talents[comp].value === -2) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + this.actor.system.caracs[carac].value+ "+ 1d" + de_domaine + "+ "+bonuspool;
          rollFormula =
            "1d" + de_trait + "+ 1d" + de_domaine + "+ " + bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + this.actor.system.caracs[carac].value+ "+ 1d" + de_domaine;
          rollFormula = "1d" + de_trait + "+ 1d" + de_domaine;
        }
      }
      if (mod > 98) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + this.actor.system.caracs[carac].value + "+ "+bonuspool;
          rollFormula = "1d" + de_trait + "+ " + bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + this.actor.system.caracs[carac].value;
          rollFormula = "1d" + de_domaine;
        }
      }
    }
    if (rollFormula !== "") {
      // Supprimer les termes 1d0 de la formule (valeur à 0)
      rollFormula = rollFormula
        .replace(/1d0\s*\+\s*/g, "")
        .replace(/\s*\+\s*1d0\b/g, "")
        .trim();
      r = new Roll(rollFormula);
      r.evaluate().then(() => {
        let type_jet = this.actor.system.talents[comp].label;
        let resultat = r.total + bonuspool;
        // alert (r.result);
        let formule = 0;

        // let pool = DicePool.fromFormula("4d6,3d8,2d10");
        // pool.roll(1);
        // alert (r.result);
        if (bonuspool !== 0) {
          formule = r.formula + " + " + bonuspool;
        }
        if (bonuspool === 0) {
          formule = r.formula;
        }
        let detail_result = 0;
        if (bonuspool !== 0) {
          detail_result = r.result + " + " + bonuspool;
        }
        if (bonuspool === 0) {
          detail_result = r.result;
        }
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
        // let formule=r.formula + " + " + bonuspool;
        // game.dice3d.showForRoll(r, game.user, true, '' ).then(displayed => {
        if (pouvoir === 1) {
          if (retraitAuto) {
            this.actor.update({
              "system.pts_resonnance.value":
                this.actor.system.pts_resonnance.value - 1,
            });
          }
          r.toMessage({
            flavor:
              "<div class='card-header-pouvoir'><span><i class=\"fas fa-podcast\"></i> " +
              type_jet +
              "</span></div>" +
              "<div><span>" +
              result_diff +
              "</span></div>",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
        } else {
          r.toMessage({
            flavor:
              "<div class='card-header'><span>" +
              type_jet +
              "</span></div>" +
              "<div><span>" +
              result_diff +
              "</span></div>",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
        }
      });
    }
  }

  testmainsnues(comp, diff, ptardence, bonuspool, bonus = 0) {
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let nomComp = this.actor.system.talents_combat[comp].label;
    let mod = this.actor.system.talents_combat[comp].score + bonus;
    let objet = this.actor.system.talents_combat[comp].label;
    let currentTarget = null;
    let r = "";
    let son_arme = "";
    let assomme = "";
    let ardence_combat = ptardence * 2;
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
      currentTarget = Array.from(game.user.targets)[0].actor ?? null;
    }

    let combat = 0;
    if (ardence_combat !== "") {
      combat =
        this.actor.system.combat_modif.value +
        ardence_combat +
        this.actor.system.domaines.combat.value;
    } else {
      combat =
        this.actor.system.combat_modif.value +
        this.actor.system.domaines.combat.value;
    }

    let formule = "";
    if (comp == "charge") {
      if (mod !== 0) {
        if (this.actor.system.reduit == 1 || this.actor.system.reduit == 2) {
          formule = bonuspool !== 0 ? "1d" + mod + "+" + bonuspool : "1d" + mod;
        } else if (bonuspool !== 0) {
          formule =
            "1d" +
            mod +
            "+ 1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.force.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" +
            mod +
            "+ 1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.force.value;
        }
      } else {
        if (bonuspool !== 0) {
          formule =
            "1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.force.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" + combat + "+ 1d" + this.actor.system.caracs.force.value;
        }
      }
    } else if (mod !== 0) {
      if (this.actor.system.reduit == 1 || this.actor.system.reduit == 2) {
        formule = bonuspool !== 0 ? "1d" + mod + "+" + bonuspool : "1d" + mod;
      } else if (this.actor.system.talents_combat[comp].bonus === "adr") {
        if (bonuspool !== 0) {
          formule =
            "1d" +
            mod +
            "+ 1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.adresse.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" +
            mod +
            "+ 1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.adresse.value;
        }
      } else {
        if (bonuspool !== 0) {
          formule =
            "1d" +
            mod +
            "+ 1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.sens.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" +
            mod +
            "+ 1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.sens.value;
        }
      }
    } else if (mod === 0 || mod === "0") {
      if (this.actor.system.talents_combat[comp].bonus === "adr") {
        if (bonuspool !== 0) {
          formule =
            "1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.adresse.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" + combat + "+ 1d" + this.actor.system.caracs.adresse.value;
        }
      } else {
        if (bonuspool !== 0) {
          formule =
            "1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.sens.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" + combat + "+ 1d" + this.actor.system.caracs.sens.value;
        }
      }
    }
    formule = formule
      .replace(/1d0\s*\+\s*/g, "")
      .replace(/\s*\+\s*1d0\b/g, "")
      .trim();
    if (!formule || formule.trim() === "") {
      ui.notifications.error(
        "Formule de jet invalide (valeur manquante sur le talent ou le domaine Combat).",
      );
      return;
    }
    r = new Roll(formule);
    let type_jet = this.actor.system.talents_combat[comp].label;
    console.log(r.formula);
    r.evaluate().then(() => {
      let resultat = r.total;
      let result_final = 0;
      let result_diff = "";
      let marge;
      let def_temp = 0;
      let temp_vie_perdue;
      let melee_perdue = 0;
      let vie_perdue = 0;
      let mention = "";
      let effet_coup1 = "";
      let effet_coup2 = "";
      let effet_coup3 = "";
      let pt_de_vie = 0;
      let params = [
        {
          filterType: "splash",
          filterId: "mySplash",
          rank: 5,
          color: 0x990505,
          padding: 80,
          time: Math.random() * 1000,
          seed: Math.random(),
          splashFactor: 1,
          spread: 0.4,
          blend: 1,
          dimX: 1,
          dimY: 1,
          cut: false,
          textureAlphaBlend: true,
          anchorX: 0.32 + Math.random() * 0.36,
          anchorY: 0.32 + Math.random() * 0.36,
        },
      ];

      if (Array.from(game.user.targets).length != 0) {
        /******************************** Effets spéciaux sans arme mains nues et charge ****************************/
        if (game.user.targets.size == 0)
          ui.notifications.error("Vous devez selectionner au moins une cible");

        const effectsState = checkEffectsState();
        if (!effectsState.shouldContinue) return;

        const wait = (delay) =>
          new Promise((resolve) => setTimeout(resolve, delay));

        let target = Array.from(game.user.targets)[0];
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
            if (arme && arme.length > 0) {
              offX = Number(arme[0].system.effet_offX?.value || 0);
              offY = Number(arme[0].system.effet_offY?.value || 0);
              effet_arme = arme[0].system.effet_arme?.value || "";
              son_arme = arme[0].system.sound?.value || "";
            }
            break;
        }
        const effets_speciaux = effectsState.shouldPlayEffects;

        if (game.modules.get("sequencer")?.active && effets_speciaux) {
          let sequence = new Sequence()
            .effect()
            //Choose your melee attack animation and replace "jb2a.maul.melee.white" by a file path or a database name from the Sequencer DataBase Macro.
            .file(effet_arme)
            //     .atLocation({
            //       x: canvas.tokens.controlled[0].x + canvas.grid.size / 2 + offX, //235
            //       y: canvas.tokens.controlled[0].y + canvas.grid.size / 2 + offY// 100
            // })
            .atLocation({
              x: canvas.tokens.controlled[0].x + offX,
              y: canvas.tokens.controlled[0].y + offY,
            })
            .stretchTo(target)
            .waitUntilFinished(-1100)
            //This is a delay before the VFX added to the melee attack begins. The value is in milliseconds, modify it as you wish. This delay is specifically with this melee attack.
            .play();
        }
        if (son_arme !== "") {
          setTimeout(() => {
            foundry.audio.AudioHelper.play(
              { src: son_arme, volume: 1, autoplay: true, loop: false },
              true,
            );
          }, 600);
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

        if (objet !== "Paralysant") {
          /*TODO : A virer ce test */
          //result_final=resultat-currentTarget.system.def.value;
          result_final = resultat - def_temp;
          if (result_final >= 0) {
            marge = Math.floor(result_final / 3);
            result_diff =
              '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
              def_temp +
              '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
              marge +
              "</span></div>";
          } else {
            marge = Math.ceil(result_final / 3);
            result_diff =
              '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
              def_temp +
              '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
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

          switch (effet_coup1) {
            case "H":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
              break;
            case "A":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
              break;
            case "S":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
              break;
            case "R":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
              break;
            case "T":
              effet_coup1 =
                '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
              break;
            case "D":
              effet_coup1 =
                '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
              break;
          }
          switch (effet_coup2) {
            case "H":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
              break;
            case "A":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
              break;
            case "S":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
              break;
            case "R":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
              break;
            case "T":
              effet_coup1 =
                '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
              break;
            case "D":
              effet_coup1 =
                '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
              break;
          }
          switch (effet_coup3) {
            case "H":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
              break;
            case "A":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
              break;
            case "S":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
              break;
            case "R":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
              break;
            case "T":
              effet_coup1 =
                '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
              break;
            case "D":
              effet_coup1 =
                '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
              break;
          }

          melee_perdue = calcMeleePerdue(marge, comp, this.actor);
          if (marge == 0 && result_final >= 0) {
            if (marge >= 0 && result_final >= 0 && marge == 0) {
              result_diff =
                result_diff +
                '<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ' +
                currentTarget.name +
                " perd <strong>" +
                melee_perdue +
                "</strong>pt de Mêlée</div>";
            }
            const _dmc2p = calcViePerdue(melee_perdue, comp, this.actor);
            vie_perdue = _dmc2p.vie_perdue;
            result_diff =
              result_diff +
              '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
              currentTarget.name +
              " perd <strong>" +
              vie_perdue +
              "</strong>pt de Vie</div>";
            if (retraitAuto) {
              game.modules
                .get("megasocket")
                ?.api?.documentUpdate(currentTarget, {
                  "system.health.value":
                    currentTarget.system.health.value - vie_perdue,
                  "system.melee_impair": _dmc2p.new_melee_impair,
                })
                ?.then(() => {
                  game.modules
                    .get("megasocket")
                    ?.api?.documentUpdate(currentTarget, {
                      "system.power.value":
                        currentTarget.system.power.value - melee_perdue,
                    });
                });
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
              currentTarget.name +
              "</div>" +
              result_diff +
              mention +
              assomme,
            speaker: ChatMessage.getSpeaker({ actor: this.token }),
          });
          /****************************************************/
        }
      }
    });
  }

  testTir(Nom_acteur, comp, diff, ptardence, bonuspool, bonus = 0) {
    let nomComp = this.actor.system.talents_combat[comp].label;
    let mod = this.actor.system.talents_combat[comp].score + bonus;
    let objet = this.actor.system.talents_combat[comp].label;
    let arme = this.actor.items.filter((i) => i.name === objet);

    if (!arme || arme.length === 0) {
      ui.notifications.error(`Arme '${objet}' non trouvée sur le personnage`);
      return;
    }

    let effet_arme = arme[0].system.effet_arme?.value || "";
    let letale = arme[0].system.letale?.value || false;
    let noLetaleMsg = arme[0].system.letale?.label || "";
    effet_arme = effet_arme.split("|")[0];
    let son_arme = "";
    let effet_coup1 = "";
    let effet_coup2 = "";
    let effet_coup3 = "";
    let type_objet = arme[0].type;
    let def_temp = 0;
    let marge;
    let mention = "";
    let temp_vie_perdue;
    let melee_perdue = 0;
    let vie_perdue = 0;
    let assomme = "";
    let combat = 0;
    let currentTarget = null;
    let rg_bonus_ATT = this.actor.system.combat_modif.value;
    let niv_bonus_DEF = this.actor.system.def_modif.value;
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

    let formule = "";
    let r = new Roll("1d10");
    if (Array.from(game.user.targets).length != 0) {
      currentTarget = Array.from(game.user.targets)[0].actor;
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

    console.log("bonuspool : " + bonuspool);

    if (mod !== 0) {
      if (this.actor.system.reduit == 1 || this.actor.system.reduit == 2) {
        formule = bonuspool !== "" ? "1d" + mod + " +" + bonuspool : "1d" + mod;
      } else if (this.actor.system.talents_combat[comp].bonus === "adr") {
        if (bonuspool !== "") {
          formule =
            "1d" +
            mod +
            " + 1d" +
            combat +
            "  1d" +
            this.actor.system.caracs.adresse.value +
            " +" +
            bonuspool;
        } else {
          formule =
            "1d" +
            mod +
            " + 1d" +
            combat +
            " + 1d" +
            this.actor.system.caracs.adresse.value;
        }
      } else {
        if (bonuspool !== "") {
          formule =
            "1d" +
            mod +
            " + 1d" +
            combat +
            " + 1d" +
            this.actor.system.caracs.sens.value +
            " +" +
            bonuspool;
        } else {
          formule =
            " 1d" +
            mod +
            " + 1d" +
            combat +
            " + 1d" +
            this.actor.system.caracs.sens.value;
        }
      }
    } else if (mod === 0) {
      if (this.actor.system.talents_combat[comp].bonus === "adr") {
        if (bonuspool !== "") {
          formule =
            "1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.adresse.value +
            "+" +
            bonuspool;
        } else {
          formule =
            "1d" + combat + "+ 1d" + this.actor.system.caracs.adresse.value;
        }
      } else {
        if (bonuspool !== "") {
          formule =
            "1d" +
            combat +
            "+ 1d" +
            this.actor.system.caracs.sens.value +
            "+" +
            bonuspool;
        } else {
          //formule = "1d" + combat + "+ 1d" + this.actor.system.caracs.sens.value);
          formule =
            "1d" + combat + "+ 1d" + this.actor.system.caracs.sens.value;
        }
      }
    }
    console.log("formule avant : " + formule);
    formule = formule
      .replace(/1d0\s*\+\s*/g, "")
      .replace(/\s*\+\s*1d0\b/g, "")
      .trim();
    console.log("formule après : " + formule);
    r = new Roll(formule);
    let type_jet = this.actor.system.talents_combat[comp].label;
    r.evaluate().then(() => {
      let resultat = r.total;
      let result_final = 0;
      let result_diff = "";
      let params = [
        {
          filterType: "splash",
          filterId: "mySplash",
          rank: 5,
          color: 0x990505,
          padding: 80,
          time: Math.random() * 1000,
          seed: Math.random(),
          splashFactor: 1,
          spread: 0.4,
          blend: 1,
          dimX: 1,
          dimY: 1,
          cut: false,
          textureAlphaBlend: true,
          anchorX: 0.32 + Math.random() * 0.36,
          anchorY: 0.32 + Math.random() * 0.36,
        },
      ];

      if (
        type_objet == "Arme de lancer" ||
        (type_objet === "Arme de tir" && (arme[0].system.charge || 0) !== 0)
      ) {
        if (type_objet == "Arme de tir") {
          arme[0].update({ "system.charge": (arme[0].system.charge || 0) - 1 });
        }
        if (type_objet == "Arme de lancer") {
          arme[0].update({
            "system.quantity": (arme[0].system.quantity || 0) - 1,
          });
        }
        son_arme = arme[0].system.son;
        if (Array.from(game.user.targets).length != 0) {
          /**********Animation du tir ************/
          if (game.user.targets.size == 0)
            ui.notifications.error("Veuillez sélectionner votre token");
          if (canvas.tokens.controlled.length == 0)
            ui.notifications.error("Veuillez sélectionner votre token");
          ///Check if Module dependencies are installed or returns an error to the user
          const effectsState = checkEffectsState();
          if (!effectsState.shouldContinue) return;

          const wait = (delay) =>
            new Promise((resolve) => setTimeout(resolve, delay));

          let selectedToken = canvas.tokens.controlled[0];
          let targets = Array.from(game.user.targets);
          const effets_speciaux = effectsState.shouldPlayEffects;
          let offX = Number(arme[0].system.effet_offX.value);
          let offY = Number(arme[0].system.effet_offY.value);
          for (let target of targets) {
            if (game.modules.get("sequencer")?.active && effets_speciaux) {
              new Sequence()
                .effect()
                .file(effet_arme)
                .atLocation({
                  x: canvas.tokens.controlled[0].x + offX,
                  y: canvas.tokens.controlled[0].y + offY,
                })
                .stretchTo(target)
                .play();
            }
            son_arme = arme[0].system.sound.value;
            if (son_arme !== "") {
              setTimeout(() => {
                foundry.audio.AudioHelper.play(
                  { src: son_arme, volume: 1, autoplay: true, loop: false },
                  true,
                );
              }, 1000);
            }
          }

          /**********Animation du tir ************/
          // }

          if (diff !== 0) {
            def_temp = diff;
          } else {
            def_temp =
              (currentTarget?.system?.def?.value ?? 0) +
              (currentTarget?.system?.def_modif?.value ?? 0);
          }
          result_final = resultat - def_temp;
          if (result_final >= 0) {
            marge = Math.floor(result_final / 3);
            result_diff =
              '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
              diff +
              '</div><div class="mega-roll-success"><i class="fas fa-check-circle"></i> Réussite <span class="mega-roll-margin">Marge : ' +
              marge +
              "</span></div>";
          } else {
            marge = Math.ceil(result_final / 3);
            result_diff =
              '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
              diff +
              '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
              marge +
              "</span></div>";
          }

          /**********Points de mêlées perdus + effets ************/
          if (marge === 0 && result_final >= 0) {
            melee_perdue = this.actor.system.talents_combat[comp].av0;
            melee_perdue = melee_perdue;
            effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_0_1;
            effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_0_2;
            effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_0_3;
          }
          if (marge === 1) {
            melee_perdue = this.actor.system.talents_combat[comp].av1;
            melee_perdue = melee_perdue;
            effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_1_1;
            effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_1_2;
            effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_1_3;
          }
          if (marge === 2) {
            melee_perdue = this.actor.system.talents_combat[comp].av2;
            melee_perdue = melee_perdue;
            effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_2_1;
            effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_2_2;
            effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_2_3;
          }
          if (marge === 3) {
            melee_perdue = this.actor.system.talents_combat[comp].av3;
            melee_perdue = melee_perdue;
            effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_3_1;
            effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_3_2;
            effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_3_3;
          }
          if (marge >= 4) {
            melee_perdue = this.actor.system.talents_combat[comp].av4;
            melee_perdue = melee_perdue;
            effet_coup1 = this.actor.system.talents_combat[comp].effet_ac_4_1;
            effet_coup2 = this.actor.system.talents_combat[comp].effet_ac_4_2;
            effet_coup3 = this.actor.system.talents_combat[comp].effet_ac_4_3;
          }
          if (melee_perdue < 0) {
            melee_perdue = 0;
          }
          if (
            letale &&
            marge >= 0 &&
            result_final >= 0 &&
            (marge == 0 || marge > 3)
          ) {
            result_diff =
              result_diff +
              '<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ' +
              (currentTarget?.name ?? "la cible") +
              " perd <strong>" +
              melee_perdue +
              "</strong>pt de Mêlée</div>";
          }

          /**********Effets optionnels ************/
          switch (effet_coup1) {
            case "H":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
              break;
            case "A":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
              break;
            case "S":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
              break;
            case "R":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
              break;
            case "T":
              effet_coup1 =
                '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
              break;
            case "D":
              effet_coup1 =
                '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
              break;
          }
          switch (effet_coup2) {
            case "H":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
              break;
            case "A":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
              break;
            case "S":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
              break;
            case "R":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
              break;
            case "T":
              effet_coup1 =
                '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
              break;
            case "D":
              effet_coup1 =
                '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
              break;
          }
          switch (effet_coup3) {
            case "H":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : HANDICAPER</div>';
              break;
            case "A":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : ASSOMMER</div>';
              break;
            case "S":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : SONNER</div>';
              break;
            case "R":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : RENVERSER</div>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat"><i class="fas fa-bolt"></i> Immédiat : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<div class="chat_effet_action"><i class="fas fa-running"></i> Prochaine action : POSITIONNEMENT</div>';
              break;
            case "T":
              effet_coup1 =
                '<div class="chat_effet_att"><i class="fas fa-bullseye"></i> Prochaine attaque : TENIR A DISTANCE</div>';
              break;
            case "D":
              effet_coup1 =
                '<div class="chat_effet_def"><i class="fas fa-shield-alt"></i> Prochaine défense : DÉFAUT DE LA CUIRASSE</div>';
              break;
          }

          /********** Calcul de la vie perdue ************/
          if (letale) {
            melee_perdue = calcMeleePerdue(marge, comp, this.actor);
            melee_perdue = melee_perdue;
            if (melee_perdue < 0) {
              melee_perdue = 0;
            }
            if ((marge == 0 || marge > 3) && result_final >= 0) {
              if (melee_perdue !== 0) {
                const _dmc3p = calcViePerdue(melee_perdue, comp, this.actor);
                vie_perdue = _dmc3p.vie_perdue;
              } else {
                vie_perdue = 0;
              }
              result_diff =
                result_diff +
                '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
                (currentTarget?.name ?? "la cible") +
                " perd <strong>" +
                vie_perdue +
                "</strong> pt de Vie</div>";
              if (retraitAuto && currentTarget) {
                const _dmc3pCalc = calcViePerdue(
                  melee_perdue,
                  comp,
                  this.actor,
                );
                game.modules
                  .get("megasocket")
                  ?.api?.documentUpdate(currentTarget, {
                    "system.health.value":
                      currentTarget.system.health.value - vie_perdue,
                    "system.melee_impair":
                      melee_perdue !== 0
                        ? _dmc3pCalc.new_melee_impair
                        : (currentTarget.system.melee_impair ?? 0),
                  })
                  ?.then(() => {
                    game.modules
                      .get("megasocket")
                      ?.api?.documentUpdate(currentTarget, {
                        "system.power.value":
                          currentTarget.system.power.value - melee_perdue,
                      });
                  });
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
                "1a<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
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
                "3c<button class='conso_marge gradient-button gradient-button-1' data-type-jet='" +
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
            /****************************************************/

            /*************Affichage du chat ************************/
            r.toMessage({
              flavor:
                "<div class='card-header'><span> " +
                type_jet +
                "</span></div>" +
                '<div class="mega-roll-attacker"><i class="fas fa-crosshairs"></i> ' +
                Nom_acteur +
                " attaque " +
                currentTarget.name +
                "</div>" +
                result_diff +
                mention +
                assomme,
              speaker: ChatMessage.getSpeaker({ actor: this.token }),
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
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              });
            }
          }
        } else {
          r.toMessage({
            flavor:
              "<div class='card-header'><span>" + type_jet + "</span></div>",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
        }
      } else if (type_objet === "Arme de tir" && arme[0].system.charge === 0) {
        ui.notifications.error("L'arme n'a pas de charge");
      }
    });
  }

  testTrait(type_test_1, ev, carac, carac2, bonuspool, diff, ptardence) {
    console.log("testTrait");
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let comp = ev.currentTarget.getAttribute("value");
    let traitName = this.actor.system.caracs[comp].label;
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
    };
    const myDialogOptions_ardence = {
      top: 100,
      left: 100,
      width: 600,
      height: 200,
    };
    if (retraitAuto) {
      this.actor.update({
        "system.pts_ardence.value":
          this.actor.system.pts_ardence.value - ptardence,
      });
    }
    if (ptardence >= 1) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
    }
    if (ptardence >= 2) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
    }
    if (ptardence >= 3) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
    }
    if (ptardence >= 4) {
      btns_1[0] = { label: "PASSER", callback: () => (ardence_domaine = 0) };
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
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au TRAIT " +
          comp.toUpperCase() +
          " ?</span><br><br>",
        buttons: btns_1,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_domaine;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_2[0] = {
              label: "PASSER",
              callback: () => (ardence_trait1 = 0),
            };
          }
          if (ptardence >= 1) {
            btns_2[0] = {
              label: "PASSER",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
          }
          if (ptardence >= 2) {
            btns_2[0] = {
              label: "PASSER",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
            btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
          }
          if (ptardence >= 3) {
            btns_2[0] = {
              label: "PASSER",
              callback: () => (ardence_trait1 = 0),
            };
            btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
            btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
            btns_2[3] = { label: "6 Rg", callback: () => (ardence_trait1 = 6) };
          }
          if (ptardence >= 4) {
            btns_2[0] = {
              label: "PASSER",
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
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au TRAIT " +
          this.actor.system.caracs[carac].label.toUpperCase() +
          " ?</span><br><br>",
        buttons: btns_2,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_trait1;
          ptardence = rgardencetotal / 2;
          if (ptardence === 0) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait2 = 0),
            };
          }
          if (ptardence >= 1) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
          }
          if (ptardence >= 2) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
          }
          if (ptardence >= 3) {
            btns_3[0] = {
              label: "PASSER",
              callback: () => (ardence_trait2 = 0),
            };
            btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
            btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
            btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait2 = 6) };
          }
          if (ptardence >= 4) {
            btns_3[0] = {
              label: "PASSER",
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
              de_domaine = Math.max(
                1,
                (parseFloat(act.system.caracs[comp]?.value) || 0) +
                  (parseFloat(ardence_domaine) || 0),
              );
            } else {
              de_domaine = Math.max(
                1,
                (parseFloat(act.system.domaines[comp]?.value) || 0) +
                  (parseFloat(ardence_domaine) || 0),
              );
            }
            let de_trait1 = Math.max(
              1,
              (parseFloat(act.system.caracs[carac]?.value) || 0) +
                (parseFloat(ardence_trait1) || 0),
            );
            let de_trait2 = Math.max(
              1,
              (parseFloat(act.system.domaines[carac2]?.value) || 0) +
                (parseFloat(ardence_trait2) || 0),
            );
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
                    marge = Math.ceil(final / 3);
                    result_diff =
                      '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
                      diff +
                      '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
                      marge +
                      "</span></div>";
                  }
                }
                r.toMessage({
                  flavor:
                    "<div class='card-header'><span>" +
                    comp +
                    "</span></div>" +
                    "<div><span>" +
                    result_diff +
                    "</span></div>",
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                });
              });
            } else {
              r1 = new Roll("1d" + Math.max(1, de_domaine || 1));
              r1.evaluate().then(() => {
                game.dice3d?.showForRoll(r1);
                let resultat1 = r1.total;
                r2 = new Roll("1d" + Math.max(1, de_trait1 || 1));
                r2.evaluate().then(() => {
                  game.dice3d?.showForRoll(r2);
                  let resultat2 = r2.total;
                  console.log("resultat 2 : " + resultat2);
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
          "<br><center><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au DOMAINE " +
          label_carac2.toUpperCase() +
          " ?</span><br><br>",
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
          );
        },
      },
      myDialogOptions_ardence,
    );

    if (ptardence > 0) {
      diag1.render(true);
    } else {
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
      let de_trait2 =
        parseFloat(
          type_test_1 === "trois"
            ? this.actor.system.domaines[carac2].value
            : this.actor.system.caracs[carac2].value,
        ) + parseFloat(ardence_trait2);
      let mod =
        "1d" +
        de_domaine +
        " + 1d" +
        de_trait1 +
        " + 1d" +
        de_trait2 +
        " + " +
        bonuspool;
      let mod2 = "";
      let mod1 = "";
      let rollFormula1 = "";
      let rollFormula2 = "";
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
          }
          comp = comp.charAt(0).toUpperCase() + comp.substring(1).toLowerCase();
          console.log("comp : " + comp);
          r.toMessage({
            flavor:
              "<div class='card-header'><span>" +
              comp +
              "</span></div>" +
              "<div><span>" +
              result_diff +
              "</span></div>",
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          });
        });
      } else {
        r1 = new Roll("1d" + de_domaine);
        r1.evaluate().then(() => {
          game.dice3d?.showForRoll(r1);
          let resultat1 = r1.total;
          r2 = new Roll("1d" + de_trait1);
          r2.evaluate().then(() => {
            game.dice3d?.showForRoll(r2);
            let resultat2 = r2.total;
            console.log("resultat 2 : " + resultat2);
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
  ) {
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
    let de_trait2 =
      parseFloat(this.actor.system.domaines[carac2].value) +
      parseFloat(ardence_trait2);
    let mod =
      "1d" +
      de_domaine +
      " + 1d" +
      de_trait1 +
      " + 1d" +
      de_trait2 +
      " + " +
      bonuspool;
    let rollFormula = "";
    let r = new Roll("1d10");
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
          marge = Math.ceil(final / 3);
          result_diff =
            '<div class="mega-roll-diff"><i class="fas fa-bullseye"></i> DIFF ' +
            diff +
            '</div><div class="mega-roll-failure"><i class="fas fa-times-circle"></i> Échec <span class="mega-roll-margin">Marge : ' +
            marge +
            "</span></div>";
        }
      }
      r.toMessage({
        flavor:
          "<div class='card-header'><span>" +
          comp +
          "</span></div>" +
          "<div><span>" +
          result_diff +
          "</span></div>",
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      });
    });
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

function localisation(alea) {
  let localisation = "";
  switch (alea) {
    case 1:
      localisation = "Pleine tête";
      break;
    case 2:
      localisation = "Oreille droite";
      break;
    case 3:
      localisation = "Oreille gauche";
      break;
    case 4:
      localisation = "Oeil droit";
      break;
    case 5:
      localisation = "Oeil gauche";
      break;
    case 6:
      localisation = "Joue droite";
      break;
    case 7:
      localisation = "Joue gauche";
      break;
    case 8:
      localisation = "Sommet du crâne";
      break;
    case 9:
      localisation = "Sommet du crâne";
      break;
    case 10:
    case 20:
      localisation = "Haut de la poitrine";
      break;
    case 11:
    case 21:
      localisation = "Epaule gauche";
      break;
    case 12:
    case 22:
      localisation = "Epaule droite";
      break;
    case 13:
    case 23:
      localisation = "Aisselle gauche";
      break;
    case 14:
    case 24:
      localisation = "Aisselle droite";
      break;
    case 15:
    case 16:
    case 25:
    case 26:
      localisation = "Poitrine";
      break;
    case 18:
    case 28:
      localisation = "Flanc droit";
      break;
    case 17:
    case 27:
      localisation = "Flanc gauche";
      break;
    case 19:
    case 29:
      localisation = "Coeur";
      break;
    case 30:
    case 40:
      localisation = "Parties";
      break;
    case 31:
    case 32:
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
    case 41:
    case 42:
    case 43:
    case 44:
    case 45:
    case 46:
    case 47:
    case 48:
    case 49:
      localisation = "Ventre";
      break;
    case 50:
    case 52:
    case 54:
    case 56:
    case 58:
    case 60:
    case 62:
    case 64:
    case 66:
    case 68:
      localisation = "Bras droit";
      break;
    case 51:
    case 53:
    case 55:
    case 57:
    case 59:
    case 61:
    case 63:
    case 65:
    case 67:
    case 69:
      localisation = "Bras gauche";
      break;
    case 70:
    case 72:
    case 74:
    case 76:
    case 78:
      localisation = "Main droite";
      break;
    case 71:
    case 73:
    case 75:
    case 77:
    case 79:
      localisation = "Main gauche";
      break;
    case 80:
    case 82:
    case 84:
    case 86:
    case 88:
      localisation = "Jambe droite";
      break;
    case 81:
    case 83:
    case 85:
    case 87:
    case 89:
      localisation = "Jambe gauche";
    case 90:
    case 92:
    case 94:
    case 96:
    case 98:
      localisation = "Pied droit";
      break;
    case 91:
    case 93:
    case 95:
    case 97:
    case 99:
      localisation = "Pied gauche";
      break;
    case 100:
      localisation = "Joue Bouche";
      break;
  }
  return localisation;
}
