/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ActorSheet}
 */

import {
  safeDocumentUpdate,
  getMegaAPI,
  requireFXMaster,
  checkEffectsState,
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
      height: courtMetrage ? 517 : 711,
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
    context.GM = game.user.isGM;
    // Prepare items.
    this._prepareItems(context);
    context.rollData = context.actor.getRollData();
    context.enrichedBiography =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.biography,
        { async: true },
      );
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Gestionnaire pour les boutons latéraux
    html.find(".side-tab-item").click(this._onSideTabClick.bind(this));

    // Initialiser l'onglet actif au chargement
    this._initializeActiveSideTab(html);

    //active ou désactive les effets spéciaux
    const effets_speciaux = game.settings.get("mega", "effets_speciaux");
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Edition de l'inventaire
    html.find(".item-edit").click((ev) => {
      const itemId = ev.currentTarget.getAttribute("id");
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet.render(true);
      }
    });

    html.find(".item-edit").on("contextmenu", (ev) => {
      const itemId = ev.currentTarget.getAttribute("id");
      const item = this.actor.items.get(itemId);
      let supItem = 0;
      let dialog_item_delete = new Dialog({
        title: "SUPPRESSION",
        content:
          "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SUPPRESSION D'UN ITEM</span></div>&nbsp",
        buttons: {
          non: {
            label: "NON",
            callback: () => (supItem = 0),
          },
          oui: {
            label: "OUI",
            callback: () => {
              item.delete();
              ui.notifications.info("L'item a été supprimé");
            },
          },
        },
        default: "non",
        close: function () {},
      });
      dialog_item_delete.render(true);
    });

    // Supression de l'inventaire
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      let supItem = 0;
      let dialog_item_delete = new Dialog({
        title: "SUPPRESSION",
        content:
          "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SUPPRESSION D'UN ITEM</span></div>&nbsp",
        buttons: {
          non: {
            label: "NON",
            callback: () => (supItem = 0),
          },
          oui: {
            label: "OUI",
            callback: () => {
              const item = this.actor.items.get(li.data("itemId"));
              item.delete();
              li.slideUp(200, () => this.render(false));
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

    html.find(".info_pouvoir").click((ev) => {
      const myDialogOptions = {
        resizable: true,
        initial_tab: "tab1",
        width: 690,
        height: 910,
        top: 10,
        left: 10,
      };

      let type_pouvoir = ev.currentTarget.getAttribute("value");

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

      switch (type_pouvoir) {
        case "info_pouvoir_psi_1":
          ({ numItem, grade, titre } = getPouvoirData("pouvoir_psi_1"));
          break;
        case "info_pouvoir_psi_2":
          ({ numItem, grade, titre } = getPouvoirData("pouvoir_psi_2"));
          break;
        case "info_pouvoir_transit":
          ({ numItem, grade, titre } = getPouvoirData("pouvoir_transit"));
          break;
        case "info_pouvoir_transfert":
          ({ numItem, grade, titre } = getPouvoirData("pouvoir_transfert"));
          break;
      }

      let bkground_style =
        'style="background-color:rgba(12, 166, 71, 0.6); border:solid 1px; vertical-align: top;padding: 5px;border-radius: 5px;box-shadow: -1px 2px 5px 1px rgba(0, 0, 0, 0.7);"';
      let backgrounds = Array(12).fill(
        'style="color:grey;border:solid 1px; padding: 5px;vertical-align: top;border-radius: 5px;box-shadow: -1px 2px 5px 1px rgba(0, 0, 0, 0.7);"',
      );

      for (let i = 0; i < grade; i++) {
        backgrounds[i] = bkground_style;
      }

      const getDescription = (pouvoir, index) => {
        return (
          "<h4>" +
          itemsPouvoir[numItem].system[pouvoir].description +
          '<table style="background: transparent;border:none; border-collapse: separate;border-spacing: 15px; "><tr><td ' +
          backgrounds[0] +
          'width="50%"><b>Grade 1.</b>&nbsp;</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade1 +
          "</td><td " +
          backgrounds[1] +
          'width="50%"><h4><strong>Grade 2.</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade2 +
          "</h4></tr><tr><td " +
          backgrounds[2] +
          'width="50%">' +
          "<h4><strong>Grade 3.</strong></h4><h4>" +
          itemsPouvoir[numItem].system[pouvoir].grade3 +
          "</h4>" +
          "</td><td " +
          backgrounds[3] +
          'width="50%"><h4><strong>Grade 4.</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade4 +
          "</h4></tr><tr><td " +
          backgrounds[4] +
          'width="50%">' +
          "<h4><strong>Grade 5.</strong></h4><h4>" +
          itemsPouvoir[numItem].system[pouvoir].grade5 +
          "</h4>" +
          "</td><td " +
          backgrounds[5] +
          'width="50%"><h4><strong>Grade 6.</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade6 +
          "</h4></tr><tr><td " +
          backgrounds[6] +
          'width="50%">' +
          "<h4><strong>Grade 7.</strong></h4><h4>" +
          itemsPouvoir[numItem].system[pouvoir].grade7 +
          "</h4>" +
          "</td><td " +
          backgrounds[7] +
          'width="50%"><h4><strong>Grade 8.</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade8 +
          "</h4></tr><tr><td " +
          backgrounds[8] +
          'width="50%">' +
          "<h4><strong>Grade 9.</strong></h4><h4>" +
          itemsPouvoir[numItem].system[pouvoir].grade9 +
          "</h4>" +
          "</td><td " +
          backgrounds[9] +
          'width="50%"><h4><strong>Grade 10.</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade10 +
          "</h4></tr><tr><td " +
          backgrounds[10] +
          'width="50%">' +
          "<h4><strong>Grade 11.</strong></h4><h4>" +
          itemsPouvoir[numItem].system[pouvoir].grade11 +
          "</h4>" +
          "</td><td " +
          backgrounds[11] +
          'width="50%"><h4><strong>Grade 12.</strong></h4><h4>' +
          itemsPouvoir[numItem].system[pouvoir].grade12 +
          "</h4></td></tr></table>"
        );
      };

      let description = itemsPouvoir[numItem].system.description;
      let description1 = getDescription("pouvoir1");
      let description2 = getDescription("pouvoir2");
      let description3 = getDescription("pouvoir3");
      let description4 = getDescription("pouvoir4");
      let description_aide = itemsPouvoir[numItem].system.aide.description;
      let numTab = itemsPouvoir[numItem].system.nb_onglets;
      let icon = itemsPouvoir[numItem].system.icon;
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

      // Utilisation de tabs dans la création de la boîte de dialogue
      let tab = new TabbedDialog(
        {
          title: titre,
          header: "",
          footer: "",
          tabs: tabs,
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

      tab.render(true);
    });

    // Fenêtre d'Informations sur les effets de combat
    html.find(".info_effets_speciaux").click((ev) => {
      const myDialogOptions = {
        resizable: true,
        initial_tab: "tab1",
        width: 690,
        height: 900,
        top: 10,
        left: 10,
      };
      let description = "";
      let icon1 = "systems/mega/images/polar-star.svg";
      let pouvoir = ev.currentTarget.getAttribute("value");
      description =
        '<table><tbody><tr><td style="background-color:var(--accent-color);"><strong>Imm&eacute;diat</strong>:</td></tr><tr><td><ul><li><strong>H</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Handicaper</strong></li></ul><p>     La douleur emp&ecirc;che la cible d\'utiliser normalement un membre.</p><ul><li><strong>A</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Assommer</strong></li></ul><p>     La cible est inconsciente pendant (Av)d4 Round(s)</p><ul><li><strong>S</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Sonner</strong></li></ul><p>     La cible subit un malus de -4Rg &agrave; ses ATT et -2 &agrave; sa DEF pendant (Av)d4 Round(s)</p><ul><li><strong>R</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Renverser</strong></li></ul><p>     La cible chute et doit consommer une action pour se relever</p><ul><li><strong>I</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Immobiliser</strong></li></ul><p>     La cible est immobilis&eacute;e et ne peut plus combattre tant qu\'elle ne s\'est pas lib&eacute;r&eacute;e.<br/>     Tant que la cible est mmobilis&eacute;e, elle et l\'Attaquant ne peuvent pas faire d\'actions autres que : D&eacute;fenses avec Malus, maintenir ou rompre l\'immobilisation ou &eacute;gocier.</p><ul><li><strong>V</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Vitesse</strong></li></ul></td></tr><tr><td style="background-color:var(--accent-color);"><strong>Prochaine Action</strong>:</td></tr><tr><td><p><strong>P</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Positionnement </strong>(Roleplay, ou DEF +1 Niv et ATT Adv -2Rg)</p><p>     Le personnage prend une position favorable par rapport &agrave; l\'adversaire et profitera de bonus au prochain Round.</p><p>     DEF +1 et, au choix, +4Rg au choix en ATT pour lui ou -4Rg en ATT pour son adversaire</p></td></tr><tr><td style="background-color:var(--accent-color);"><strong>Prochaine DEF</strong>:</td></tr><tr><td><p><strong>T</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> Tenir &agrave; distance </strong>(Imm&eacute;diat : D&eacute;g&acirc;t 0, Prochaine DEF +1 Niv, Adv : ATT -2Rg)</p><p>     Le personnage fait de grans moulinets avec une arme d\'allonge &eacute;gale ou sup&eacute;rieure &agrave; celle de son adversaire.</p><p>     Il ne fait pas de d&eacute;g&acirc;ts mais ses Av sont convertis ainsi :<br/>     Pour chaque AV : prochaine DEF+1 et -2Rg &agrave; la prochaine ATT pour l\'adversaire.</p><p>     Cet effet permet de dialoguer avec des adversaires sans les blesser et en prenant moins de risques qu\'avec l\'Esquive mais est clairement agressif.</p></td></tr><tr><td style="background-color:var(--accent-color);"><strong>Prochaine ATT</strong>:</td></tr><tr><td><p><strong>D</strong> <img style="vertical-align:middle;border:none;width:18px;height:18px" src="systems/mega/images/fleche_droite.png"><strong> D&eacute;faut de la cuirasse</strong> (+2Av &agrave; la prochaine ATT qui touche sur cet Adv)</p><p>     Le personnage a rep&eacute;r&eacute; une faille dans la protection de l\'adversaire :<br/>     Il a +2Av &agrave; la prochaine attaque qui touche cet adversaire.</p></td></tr></tbody></table>';
      let d = new TabbedDialog(
        {
          title: "Informations Effets Spéciaux",
          header: "",
          footer: "",
          tabs: [
            { title: "Effets de combat", content: description, icon: icon1 },
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
      d.render(true);
    });

    html.find(".info_talents").click((ev) => {
      const myDialogOptions = {
        resizable: true,
        initial_tab: "tab1",
        width: 600,
        height: 560,
        top: 10,
        left: 10,
      };
      let description = "";
      let icon1 = "systems/mega/images/histogram.svg";
      let pouvoir = ev.currentTarget.getAttribute("value");
      description =
        "<table style='background-color:var(--opacity-color);'><tr><thead ></thead></tr><tr><td><ul><li ><strong>X </strong>(renseigner <strong>99 </strong>dans la fiche)&nbsp;= <strong>Talent d&eacute;test&eacute;&nbsp;</strong>: pratique &eacute;vit&eacute;e, quasi phobique.</li><br><li ><strong>-2Rg</strong>&nbsp;= <strong>Talent maudit&nbsp;</strong>: pratique maudite, mauvais feeling, toujours un probl&egrave;me.</li><br><li><strong>d0</strong>&nbsp;= Pratique rare, au minimum, pas d&rsquo;entra&icirc;nement particulier.</li><br><li ><strong>d2</strong>&nbsp;= Pratique vaguement exerc&eacute;e.</li><br><li ><strong>d4</strong> = Pratique correcte, apprise ou travaill&eacute;e.</li><br><li ><strong>d6</strong> = Pratique fr&eacute;quente, travaill&eacute;e et r&eacute;guli&egrave;rement exerc&eacute;e.</li><br><li ><strong>d8 </strong>= Pratique tr&egrave;s exerc&eacute;e, bonne intuition et anticipation des probl&egrave;mes.</li><br><li ><strong>d10</strong> = Pratique essentielle du personnage, r&eacute;fl&eacute;chie, travaill&eacute;e et exerc&eacute;e quotidiennement, m&ecirc;me virtuellement.</li><br><li ><strong>d12 </strong>= Pratique essentielle travaill&eacute;e quotidiennement, intensivement, au d&eacute;triment d&rsquo;autres activit&eacute;s.</li><br><li ><strong>d14 </strong>= Hors-norme.</li><br></ul></td></tr></table>";

      let d = new TabbedDialog(
        {
          title: "Informations Domaines et Talents",
          header: "",
          footer: "",
          tabs: [
            { title: "Échelle des Talents", content: description, icon: icon1 },
          ],
          buttons: {},
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

    // Fenêtre Popup au survol des Spes
    html.find(".tooltip_spe").mouseover((ev) => {
      let spe = ev.currentTarget.getAttribute("value");
      const spes = spe.split("|");
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
    });

    // Gestion du repositionnement automatique des tooltips des talents
    html.find(".tooltip .tooltiptext").each(function () {
      const tooltip = $(this);
      const parent = tooltip.parent();

      parent.hover(
        function () {
          // Lors du survol, vérifier si le tooltip dépasse en bas
          setTimeout(() => {
            const tooltipRect = tooltip[0].getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Si le tooltip dépasse en bas de la fenêtre
            if (tooltipRect.bottom > viewportHeight - 10) {
              tooltip.addClass("tooltip-bottom-overflow");
              tooltip.css({
                top: "auto",
                bottom: "100%",
                transform: "translateY(-8px)",
              });
            }
          }, 10);
        },
        function () {
          // Quand on sort du survol, réinitialiser le style
          tooltip.removeClass("tooltip-bottom-overflow");
          tooltip.css({
            top: "",
            bottom: "",
            transform: "",
          });
        },
      );
    });

    // Gestion des protections
    function toggleProtection(protection) {
      const selection = this.actor.system.protections[protection].selection;
      this.actor.system.protections[protection].selection = !selection;
      this.actor.update({
        [`system.protections.${protection}.selection`]: !selection,
      });
    }

    // eslint-disable-next-line no-unused-vars
    html
      .find(".active_protection_p1")
      .click((ev) => toggleProtection.call(this, "p1"));
    // eslint-disable-next-line no-unused-vars
    html
      .find(".active_protection_p2")
      .click((ev) => toggleProtection.call(this, "p2"));
    // eslint-disable-next-line no-unused-vars
    html
      .find(".active_protection_p3")
      .click((ev) => toggleProtection.call(this, "p3"));

    // Clic sur une arme (hors bagarre et charge)
    html.find(".clic_technique_combat").click((ev) => {
      if (!this.token) {
        // eslint-disable-next-line no-undef
        ui.notifications.error(
          "Veuillez utiliser la fiche de personnage du token !",
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
        width: 400,
        height: 200,
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        height: 200,
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        height: 200,
      };

      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        height: 200,
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
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

        if (this.actor.system.pts_ardence.value >= 1) {
          btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        }
        if (this.actor.system.pts_ardence.value >= 2) {
          btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
          btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        }
        if (this.actor.system.pts_ardence.value >= 3) {
          btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
          btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
          btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
        }
        if (this.actor.system.pts_ardence.value >= 4) {
          btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
          btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
          btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
          btns_ar[4] = { label: 4, callback: () => (ptardence = 4) };
        }

        if (this.actor.system.talents_combat[comp].bonus !== "adr") {
          /******************************* Combat Armes de tir ou lancer *********************/
          /******************************* Construction de la fenêtre de dialogue Ardence pour un combat de tir ou lancer ************************************/
          let dialog_ardence_choix = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
                "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
              buttons: {
                oui: {
                  label: "NON",
                  callback: () => (ardence = 0),
                },
                non: {
                  label: "OUI",
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
                          "<div class='card-header'><span>Vous avez " +
                          ptArdence +
                          " pts d'ardence</span></div>" +
                          "<br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span><br><br>",
                        buttons: btns_ar,
                        //close: () => d.render(true)
                        close: function () {
                          if (ptardence !== "") {
                            if (ptardence === 1) {
                              ardence_combat = 2;
                            }
                            if (ptardence === 2) {
                              ardence_combat = 4;
                            }
                            if (ptardence === 3) {
                              ardence_combat = 6;
                            }
                            if (ptardence === 4) {
                              ardence_combat = 8;
                            }
                            dialog_BONUS.render(true);
                          }
                        },
                      },
                      myDialogOptions,
                    );
                    dialog_ardence.render(true);
                  } else {
                    // dialog_DIFF.render(true);
                    if (speCombat > 0) {
                      d2.render(true);
                    } else {
                      //dialog_DIFF.render(true);
                      dialog_BONUS.render(true);
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
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
                '<br><span class="bouton_texte">Sélectionnez la DIFF.</span><br><br>',
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
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SPE associee</span></div>&nbsp" +
                "<br><span class='bouton_texte'>Voulez-vous utiliser une SPE ?</span><br><br>",
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
                label = "+" + i.toString();
              } else {
                label = i.toString();
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
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>BONUS/MALUS</span></div>&nbsp" +
                "<br><span class='bouton_texte'>Sélectionnez le BONUS/MALUS à ajouter au pool</span><br><br>",
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
            if (speCombat > 0) {
              setTimeout(function () {
                d2.render(true);
              }, 2000);
            } else {
              setTimeout(function () {
                dialog_BONUS.render(true);
              }, 2000);
            }
          }
        } else {
          /******************************* Combat armes courtes, armes longues *********************/
          /******************************* Construction de la fenêtre de dialogue Ardence pour un combat de tir ou lancer ************************************/
          let dialog_ardence_choix = new Dialog(
            {
              title: label.toUpperCase(),
              content:
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
                "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
              buttons: {
                oui: {
                  label: "NON",

                  callback: () => (ardence = 0),
                },
                non: {
                  label: "OUI",
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
                          "<div class='card-header'><span>Vous avez " +
                          ptArdence +
                          " pts d'ardence</span></div>" +
                          "<br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span><br><br>",
                        buttons: btns_ar,
                        //close: () => d.render(true)
                        close: function () {
                          if (ptardence !== "") {
                            if (ptardence === 1) {
                              ardence_combat = 2;
                            }
                            if (ptardence === 2) {
                              ardence_combat = 4;
                            }
                            if (ptardence === 3) {
                              ardence_combat = 6;
                            }
                            if (ptardence === 4) {
                              ardence_combat = 8;
                            }
                            dialog_BONUS.render(true);
                          }
                        },
                      },
                      myDialogOptions,
                    );
                    dialog_ardence.render(true);
                  } else {
                    if (speCombat > 0) {
                      d2.render(true);
                    } else {
                      dialog_BONUS.render(true);
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
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
                '<br><span class="bouton_texte">' +
                msg +
                "</span><br><br>",
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
                  );
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
                      const resultType = success ? "Reussite" : "Echec";
                      const marginType = success
                        ? "Marge de reussite"
                        : "Marge d'echec";
                      const marginValue = success
                        ? Math.floor(result_final / 3)
                        : Math.ceil(result_final / 3);
                      const backgroundColor = success ? "green" : "red";

                      return `
                  <p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">
                    DIFF ${def_temp}
                  </p>
                  <div>
                    <span>
                      <b>
                        <p style="background-color:${backgroundColor}; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;">
                          ${resultType} - ${marginType} : ${marginValue}
                        </p>
                      </b>
                    </span>
                  </div>
                `;
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
                        H: '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER></div></Span>',
                        A: '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>',
                        S: '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>',
                        R: '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>',
                        I: '<span><div class="chat_effet_immediat">Immédiat : IMMOBILISER</div></Span>',
                        P: '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>',
                        T: '<span><divclass="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>',
                        D: '<span><div class="chat_effet_def">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>',
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
                        vie_perdue = calcViePerdue(marge, comp, this.actor);
                        result_diff +=
                          '<p class="result_diff"> ' +
                          game.user.targets.values().next().value.name +
                          " perd " +
                          melee_perdue +
                          " points de melee</p>";
                        result_diff +=
                          '<p class="result_diff"> ' +
                          game.user.targets.values().next().value.name +
                          " perd " +
                          vie_perdue +
                          " points de vie</p>";
                        if (retraitAuto) {
                          const updatePromise = safeDocumentUpdate(
                            currentTarget,
                            {
                              "system.health.value":
                                currentTarget.system.health.value - vie_perdue,
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
                            "> Conso 0Av <br> -" +
                            melee_perdue +
                            "pt de Mêlée " +
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
                            "> Conso 1Av <br> -" +
                            melee_perdue_1av +
                            "pt de Mêlée " +
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
                            "> Conso 0Av <br> -" +
                            melee_perdue +
                            "pt de Mêlée " +
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
                            "> Conso 1Av <br> -" +
                            melee_perdue_1av +
                            "pt de Mêlée " +
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
                            "> Conso 2Av <br> -" +
                            melee_perdue_2av +
                            "pt de Mêlée " +
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
                            "> Conso 0Av <br> -" +
                            melee_perdue +
                            "pt de Mêlée " +
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
                            "> Conso 1Av <br> -" +
                            melee_perdue_1av +
                            "pt de Mêlée " +
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
                            "> Conso 2Av <br> -" +
                            melee_perdue_2av +
                            "pt de Mêlée " +
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
                            "> Conso 3Av <br> -" +
                            melee_perdue_3av +
                            "pt de Mêlée " +
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
                          '<div><span><b><p style="font-size: 18px; text-align:center;";>' +
                          Nom_acteur +
                          " attaque " +
                          nomCible +
                          "</b></p></span></div>" +
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
                            '<div><span><b><p style="font-size: 18px; text-align:center;";>' +
                            Nom_acteur +
                            " attaque " +
                            game.user.targets.values().next().value.name +
                            "</b></p></span></div>" +
                            result_diff +
                            '<table border="1"><colgroup><col></colgroup><tbody><tr><td style="text-align: center;"><strong>' +
                            noLetaleMsg +
                            "</strong></td></tr></tbody></table>",
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
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SPE associee</span></div>&nbsp" +
                "<br><span class='bouton_texte'>Voulez-vous utiliser une SPE ?</span><br><br>",
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
                label = "+" + i.toString();
              } else {
                label = i.toString();
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
                "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>BONUS/MALUS</span></div>&nbsp" +
                "<br><span class='bouton_texte'>Sélectionnez le BONUS/MALUS à ajouter au pool</span><br><br>",
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
            if (speCombat > 0) {
              setTimeout(function () {
                d2.render(true);
              }, 2000);
            } else {
              setTimeout(function () {
                dialog_BONUS.render(true);
              }, 2000);
            }
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
      let diff = 0;
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
        width: 400,
        height: 200,
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        height: 200,
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        height: 200,
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        height: 200,
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        height: 200,
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        // height: 200
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        // height: 200
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

      if (this.actor.system.pts_ardence.value >= 1) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
      }
      if (this.actor.system.pts_ardence.value >= 2) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
      }
      if (this.actor.system.pts_ardence.value >= 3) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
      }
      if (this.actor.system.pts_ardence.value >= 4) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
        btns_ar[4] = { label: 4, callback: () => (ptardence = 4) };
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SPE associee</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous utiliser une SPE ?</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
          buttons: {
            oui: {
              label: "NON",
              callback: () => (ardence = 0),
            },
            non: {
              label: "OUI",
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
                      "<div class='card-header'><span>Vous avez " +
                      ptArdence +
                      " pts d'ardence</span></div>" +
                      "<br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span><br><br>",
                    buttons: btns_ar,
                    close: function () {
                      if (ptardence !== "") {
                        if (ptardence === 1) {
                          ardence_combat = 2;
                        }
                        if (ptardence === 2) {
                          ardence_combat = 4;
                        }
                        if (ptardence === 3) {
                          ardence_combat = 6;
                        }
                        if (ptardence === 4) {
                          ardence_combat = 8;
                        }
                        dialog_DIFF.render(true);
                      }
                    },
                  },
                  myDialogOptions,
                );
                dialog_ardence.render(true);
              } else {
                //dialog_DIFF.render(true);
                if (speCombat > 0) {
                  d2.render(true);
                } else {
                  dialog_BONUS.render(true);
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
            '<br><span class="bouton_texte">Sélectionnez la DIFF ou "DEF" pour que la DIFF soit égale à la DEF de la cible.</span><br><br>',
          buttons: generateDiffButtons(4, 27),
          default: "DEF",
          close: () => {
            if (diff2 !== "") {
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
            label = "+" + i.toString();
          } else {
            label = i.toString();
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>BONUS/MALUS</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Sélectionnez le BONUS/MALUS à ajouter au pool</span><br><br>",
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
        if (speCombat > 0) {
          setTimeout(function () {
            d2.render(true);
          }, 2000);
        } else {
          setTimeout(function () {
            dialog_BONUS.render(true);
          }, 2000);
        }

        // setTimeout(function () {
        //d
        //d2.render(true);
        // }, 2000);
      }
    });

    /************************************** Tests Initiatives ou Esquive ******************************/
    html.find(".combat_rollable").click((ev) => {
      let comp = ev.currentTarget.getAttribute("value");
      let nom = ev.currentTarget.getAttribute("label");
      let dataType = ev.currentTarget.getAttribute("data-type");
      let b = this.actor.system.bonus_initiative;
      let diff = 0;
      const myDialogOptions = {
        top: 100,
        left: 100,
        width: 400,
        height: 160,
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        height: 160,
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        height: 160,
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        height: 160,
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        height: 160,
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        // height: 200
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        // height: 200
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
          content: "<div class='card-header'><span>DIFF</span></div>",
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
                  result_diff = `<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;"> DIFF ${diff}</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;">Reussite - Marge de reussite : ${final}</p></b></div></span>`;
                } else {
                  final = Math.ceil(final / 3);
                  result_diff = `<div><span><b><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ${diff}</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;">Echec - Marge d'echec : ${final}</p></b></div></span>`;
                }
              } else {
                result_diff = `<div><span><b><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span><div>`;
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
        width: 400,
        height: 210,
      };

      const myDialogOptions_relance = {
        top: 100,
        left: 100,
        width: 400,
        height: 240,
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        height: 200,
      };

      const myDialogOptions_ajoutArdence = {
        top: 100,
        left: 100,
        width: 600,
        height: 200,
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        height: 200,
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        height: 200,
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        // height: 200
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        // height: 200
      };
      let nb_ardence = this.actor.system.pts_ardence.value;
      if (this.actor.system.pts_ardence.value >= 1) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
      }
      if (this.actor.system.pts_ardence.value >= 2) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
      }
      if (this.actor.system.pts_ardence.value >= 3) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
      }
      if (this.actor.system.pts_ardence.value >= 4) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
        btns_ar[4] = { label: 4, callback: () => (ptardence = 4) };
      }
      btns[NoSpe] = { label: "Aucune SPE", callback: () => (bonus = 0) };
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
          buttons: {
            oui: {
              label: "NON",
              callback: () => (ardence = 0),
            },
            non: {
              label: "OUI",
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
                d2.render(true);
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SPE associee</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous utiliser une SPE ?</span><br><br>",
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
            label = "+" + i.toString();
          } else {
            label = i.toString();
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>BONUS/MALUS</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Sélectionnez le BONUS/MALUS à ajouter au pool</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
            '<br><span class="bouton_texte">Sélectionnez la DIFF ou "NC" si elle n\'est pas communiquée</span><br><br>',
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
                          '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                          diff +
                          '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                          final +
                          "</p></b></div></span>";
                      } else {
                        final = Math.ceil(final / 3);
                        result_diff =
                          '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                          diff +
                          '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                          final +
                          "</p></b></div></span>";
                      }
                    } else {
                      result_diff =
                        '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
                          '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                          diff +
                          '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                          final +
                          "</p></b></div></span>";
                      } else {
                        final = Math.ceil(final / 3);
                        result_diff =
                          '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                          diff +
                          '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                          final +
                          "</p></b></div></span>";
                      }
                    } else {
                      result_diff =
                        '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
            "<div class='card-header'><span>Vous avez " +
            this.actor.system.pts_ardence.value +
            " pts d'ardence</span></div>" +
            "<br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span><br><br>",
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
              d2.render(true);
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
          d2.render(true);
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
            "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
            contenu +
            " ?</span></div>" +
            "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au pouvoir " +
            contenu.toUpperCase() +
            " ?</span><br><br>",
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
            "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> RÉSONNANCE ?</span></div>" +
            "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT RÉSONNANCE ?</span><br><br>",
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
            "<div class='card-header'><span>Ardence <i class='fas fa-angle-double-right'></i> " +
            contenu2 +
            "?</span></div>" +
            "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT " +
            contenu2.toUpperCase() +
            " ?</span><br><br>",
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
                          `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">JET INITIAL (DIFF ${diff})</p></div></span>`,
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
                            `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">RELANCE (DIFF ${diff})</p></div></span><br>Vous avez relancé : ${rerolledDie}`,
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
                            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                            diff +
                            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                            final +
                            "</p></b></div></span>";
                        } else {
                          final = Math.ceil(final / 3);
                          result_diff =
                            entete +
                            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                            diff +
                            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                            final +
                            "</p></b></div></span>";
                        }
                      } else {
                        result_diff =
                          entete +
                          '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
                        let content = `<br><span class="bouton_texte">Choisissez le dé à relancer ou validez ce jet :</span><br><br>
							   <center><select id="reroll-select">
								 <option value="null">Valider le jet</option>`;
                        results.forEach((result, index) => {
                          content += `<option value="${index}">Relancer ${diceArray[index]} (${result})</option>`;
                        });
                        content += `</select></center><br>`;

                        new Dialog(
                          {
                            title: "Relance d'un dés",
                            content:
                              "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>Relancer un dé</span></div>" +
                              content,
                            buttons: {
                              ok: {
                                label: "OK",
                                callback: (html) => {
                                  let index = html.find("#reroll-select").val();
                                  resolve(
                                    index === "null" ? null : parseInt(index),
                                  );
                                },
                              },
                            },
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
                          `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">JET INITIAL (DIFF ${diff})</p></div></span>`,
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
                            `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">RELANCE (DIFF ${diff})</p></div></span><br>Vous avez relancé : ${rerolledDie}`,
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
                            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                            diff +
                            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                            final +
                            "</p></b></div></span>";
                        } else {
                          final = Math.ceil(final / 3);
                          result_diff =
                            entete +
                            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                            diff +
                            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                            final +
                            "</p></b></div></span>";
                        }
                      } else {
                        result_diff =
                          entete +
                          '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
                        let content = `<br><span class="bouton_texte">Choisissez le dé à relancer ou validez ce jet :</span><br><br>
                        <center><select id="reroll-select">
                        <option value="null">Valider le jet</option>`;
                        results.forEach((result, index) => {
                          content += `<option value="${index}">Relancer ${diceArray[index]} (${result})</option>`;
                        });
                        content += `</select></center><br>`;

                        new Dialog(
                          {
                            title: "Relance",
                            content:
                              "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>Relancer un dé</span></div>" +
                              content,
                            buttons: {
                              ok: {
                                label: "OK",
                                callback: (html) => {
                                  let index = html.find("#reroll-select").val();
                                  resolve(
                                    index === "null" ? null : parseInt(index),
                                  );
                                },
                              },
                            },
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
          content: "<div class='card-header'><span>DIFF</span></div>",
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
    html.find(".talents_rollable").click((ev) => {
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
        width: 400,
        height: 200,
      };

      const myDialogOptions_numPouv = {
        top: 100,
        left: 100,
        width: 400,
        height: 200,
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        height: 200,
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        height: 200,
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        height: 200,
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        height: 200,
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        // height: 200
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        // height: 200
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

      if (this.actor.system.pts_ardence.value >= 1) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
      }
      if (this.actor.system.pts_ardence.value >= 2) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
      }
      if (this.actor.system.pts_ardence.value >= 3) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
      }
      if (this.actor.system.pts_ardence.value >= 4) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
        btns_ar[4] = { label: 4, callback: () => (ptardence = 4) };
      }
      let pts_reso = this.actor.system.pts_resonnance.value;
      let d_ard = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
          buttons: {
            btn_oui: {
              label: "NON",
              callback: () => (ardence = 0),
            },
            btn_non: {
              label: "OUI",
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
              if (pts_reso !== 0 && typeActor === "MEGA" && pouvoirOK) {
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
            "<div class='card-header'><span>Vous avez " +
            this.actor.system.pts_ardence.value +
            " pts d'ardence</span></div>" +
            "<br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span><br><br>",
          buttons: btns_ar,
          //close: () => d.render(true)
          close: function () {
            if (pts_reso !== 0 && pouvoirOK) {
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>POUVOIR PSI</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel POUVOIR souhaitez-vous utiliser ?</span><br><br>",
          buttons: {
            pouvoir1: {
              label: this.actor.system.pouvoirs.pouvoir_psi_1.label,
              callback: () => (numPouv = 1),
              // icon: `<i class="fas fa-link"></i>`,
            },

            pouvoir2: {
              label: this.actor.system.pouvoirs.pouvoir_psi_2.label,
              callback: () => (numPouv = 2),
              // icon: `<i class="fas fa-link"></i>`,
            },
          },
          //close: () => d.render(true)
          close: function () {
            d2.render(true);
          },
        },
        myDialogOptions_numPouv,
      );

      let d0 = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>TEST</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel type de TEST souhaitez-vous réaliser ?</span><br><br>",
          buttons: {
            talent: {
              label:
                '<span class="bouton_talent"><i class="fas fa-sign-language"></i> Talent</span>',
              // open: function() { $(this).addClass('yescls') },
              // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
              callback: () => (pouvoir = 0),
            },
            pouvoir: {
              label:
                '<span class="bouton_pouvoir"><i class="fas fa-podcast"></i> Pouvoir PSI</span>',
              callback: () => (pouvoir = 1),
            },
          },
          default: "talent",
          //close: () => d.render(true)
          close: function () {
            if (pouvoir === 1) {
              if (pouvoirPresent) numPouvoir.render(true);
              else d2.render(true);
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>TRAIT</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel TRAIT voulez-vous utiliser ?</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SPE associee</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous utiliser une SPE ?</span><br><br>",
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
            label = i.toString();
          } else {
            label = i.toString();
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>BONUS/MALUS</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Sélectionnez le BONUS/MALUS à ajouter au pool</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
            '<br><span class="bouton_texte">Sélectionnez la DIFF ou "NC" si elle n\'est pas communiquée</span><br><br>',
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
        width: 400,
        height: 200,
      };

      const myDialogOptions_test = {
        top: 100,
        left: 100,
        width: 400,
        height: 200,
      };

      const myDialogOptions_ardence = {
        top: 100,
        left: 100,
        width: 380,
        height: 200,
      };

      const myDialogOptions_traits = {
        top: 100,
        left: 100,
        width: 920,
        height: 200,
      };
      const myDialogOptions_spes = {
        top: 100,
        left: 100,
        width: 900,
        height: 200,
      };
      const myDialogOptions_diff = {
        top: 100,
        left: 100,
        width: 1000,
        // height: 200
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
        // height: 200
      };
      animationJet();
      if (this.actor.system.pts_ardence.value >= 1) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
      }
      if (this.actor.system.pts_ardence.value >= 2) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
      }
      if (this.actor.system.pts_ardence.value >= 3) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
      }
      if (this.actor.system.pts_ardence.value >= 4) {
        btns_ar[1] = { label: 1, callback: () => (ptardence = 1) };
        btns_ar[2] = { label: 2, callback: () => (ptardence = 2) };
        btns_ar[3] = { label: 3, callback: () => (ptardence = 3) };
        btns_ar[4] = { label: 4, callback: () => (ptardence = 4) };
      }
      let d_ard2 = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span>Vous avez " +
            this.actor.system.pts_ardence.value +
            " pts d'ardence</span></div>" +
            "<br><span class='bouton_texte'>Combien souhaitez-vous en placer ?</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
          buttons: {
            oui: {
              label: "NON",
              callback: () => (ardence = 0),
            },
            non: {
              label: "OUI",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>TYPE DE TEST<span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel type de TEST souhaitez-vous réaliser ?</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>TRAIT N°2<span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel TRAIT voulez-vous utiliser ?</span><br><br>",
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
      setTimeout(function () {
        choix.render(true);
      }, 2000);

      let d2 = new Dialog(
        {
          title: traitName.toUpperCase(),
          content:
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DOMAINE</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel DOMAINE voulez-vous utiliser ?</span><br><br>",
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
            label = "+" + i.toString();
          } else {
            label = i.toString();
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>BONUS/MALUS</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Sélectionnez le BONUS/MALUS à ajouter au pool</span><br><br>",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
            '<br><span class="bouton_texte">Sélectionnez la DIFF ou "NC" si elle n\'est pas communiquée</span><br><br>',
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
    };
    const myDialogOptions_ardence = {
      top: 100,
      left: 100,
      width: 600,
      height: 200,
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
          "<br><span class='bouton_texte'>Combien de rangs voulez-vous ajouter au TALENT " +
          nomComp.toUpperCase() +
          " ?</span><br><br>",
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au DOMAINE " +
          nomDomaine.toUpperCase() +
          " ?</span><br><br>",
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au Pouvoir PSI ?</span><br><br>",
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT RÉSONNANCE ?</span><br><br>",
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT " +
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

    let des = rollFormula.match(/\d+d\d+/g);
    let type_jet = this.actor.system.talents[comp].label;
    if (pouvoir === 1) {
      this.actor.update({
        "system.pts_resonnance.value":
          this.actor.system.pts_resonnance.value - 1,
      });
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
          `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">JET INITIAL (DIFF ${diff})</p></div></span>`,
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
            `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">RELANCE (DIFF ${diff})</p></div></span><br>Vous avez relancé : ${rerolledDie}`,
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
            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
            final +
            "</p></b></div></span>";
        } else {
          final = Math.ceil(final / 3);
          result_diff =
            entete +
            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
            final +
            "</p></b></div></span>";
        }
      } else {
        result_diff =
          entete +
          '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
        let content = `<br><span class="bouton_texte">Choisissez le dé à relancer ou validez ce jet :</span><br><br>
							   <center><select id="reroll-select">
								 <option value="null">Valider le jet</option>`;
        results.forEach((result, index) => {
          content += `<option value="${index}">Relancer ${diceArray[index]} (${result})</option>`;
        });
        content += `</select></center><br>`;

        new Dialog(
          {
            title: "RELANCE",
            content:
              "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>Relancer un dé</span></div>" +
              content,
            buttons: {
              ok: {
                label: "OK",
                callback: (html) => {
                  let index = html.find("#reroll-select").val();
                  resolve(index === "null" ? null : parseInt(index));
                },
              },
            },
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
    console.log("comp : " + comp);
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
            .atLocation({
              x: canvas.tokens.controlled[0].x + offX,
              y: canvas.tokens.controlled[0].y + offY,
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
            '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            def_temp +
            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
            marge +
            "</p></b></div></span>";
        } else {
          marge = Math.ceil(result_final / 3);
          result_diff =
            '<div><span><b><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            def_temp +
            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
            marge +
            "</p></b></div></span>";
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
            H: '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER></div></Span>',
            A: '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>',
            S: '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>',
            R: '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>',
            I: '<span><div class="chat_effet_immediat">Immédiat : IMMOBILISER</div></Span>',
            P: '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>',
            T: '<span><divclass="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>',
            D: '<span><div class="chat_effet_def">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>',
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
              '<p class="result_diff"> ' +
              game.user.targets.values().next().value.name +
              " perd " +
              melee_perdue +
              " points de melee</p>";
          }
          vie_perdue = calcViePerdue(marge, comp, this.actor);
          result_diff =
            result_diff +
            '<p class="result_diff"> ' +
            game.user.targets.values().next().value.name +
            " perd " +
            vie_perdue +
            " points de vie</p>";
          // TODO : enelever l'automatisme pour charge + bagarre
          if (retraitAuto) {
            const updatePromise = safeDocumentUpdate(currentTarget, {
              "system.health.value":
                currentTarget.system.health.value - vie_perdue,
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
            "> Conso 0Av <br> -" +
            melee_perdue +
            "pt de Mêlée " +
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
            "> Conso 1Av <br> -" +
            melee_perdue_1av +
            "pt de Mêlée " +
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
            "> Conso 0Av <br> -" +
            melee_perdue +
            "pt de Mêlée " +
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
            "> Conso 1Av <br> -" +
            melee_perdue_1av +
            "pt de Mêlée " +
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
            "> Conso 2Av <br> -" +
            melee_perdue_2av +
            "pt de Mêlée " +
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
            "> Conso 0Av <br> -" +
            melee_perdue +
            "pt de Mêlée " +
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
            "> Conso 1Av <br> -" +
            melee_perdue_1av +
            "pt de Mêlée " +
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
            "> Conso 2Av <br> -" +
            melee_perdue_2av +
            "pt de Mêlée " +
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
            "> Conso 3Av <br> -" +
            melee_perdue_3av +
            "pt de Mêlée " +
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
            '<div><span><b><p style="font-size: 18px; text-align:center;";>' +
            canvas.tokens.controlled[0].name +
            " attaque " +
            game.user.targets.values().next().value.name +
            "</b></p></span></div>" +
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
          let offX = Number(arme[0].system.effet_offX.value);
          let offY = Number(arme[0].system.effet_offY.value);
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
            '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
            marge +
            "</p></b></div></span>";
        } else {
          marge = Math.ceil(result_final / 3);
          result_diff =
            '<div><span><b><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
            marge +
            "</p></b></div></span>";
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
                result_diff += `<p class="result_diff"> ${
                  game.user.targets.values().next().value.name
                } perd ${melee_perdue} points de melee</p>`;
              }
            }
          }

          /**********Effets optionnels ************/

          function getEffetCoupHtml(effet) {
            const effets = {
              H: '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER></div></Span>',
              A: '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>',
              S: '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>',
              R: '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>',
              I: '<span><div class="chat_effet_immediat">Immédiat : IMMOBILISER</div></Span>',
              P: '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>',
              T: '<span><divclass="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>',
              D: '<span><div class="chat_effet_def">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>',
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
              if (melee_perdue !== 0) {
                vie_perdue = calcViePerdue(melee_perdue, comp, this.actor);
              } else {
                vie_perdue = 0;
              }
              result_diff =
                result_diff +
                '<p class="result_diff"> ' +
                game.user.targets.values().next().value.name +
                " perd " +
                vie_perdue +
                " points de vie</p>";
              if (retraitAuto) {
                const updatePromise = safeDocumentUpdate(currentTarget, {
                  "system.health.value":
                    currentTarget.system.health.value - vie_perdue,
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
                "> Conso 0Av <br> -" +
                melee_perdue +
                "pt de Mêlée " +
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
                "> Conso 1Av <br> -" +
                melee_perdue_1av +
                "pt de Mêlée " +
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
                "> Conso 0Av <br> -" +
                melee_perdue +
                "pt de Mêlée " +
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
                "> Conso 1Av <br> -" +
                melee_perdue_1av +
                "pt de Mêlée " +
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
                "> Conso 2Av <br> -" +
                melee_perdue_2av +
                "pt de Mêlée " +
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
                "> Conso 0Av <br> -" +
                melee_perdue +
                "pt de Mêlée " +
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
                "> Conso 1Av <br> -" +
                melee_perdue_1av +
                "pt de Mêlée " +
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
                "> Conso 2Av <br> -" +
                melee_perdue_2av +
                "pt de Mêlée " +
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
                "> Conso 3Av <br> -" +
                melee_perdue_3av +
                "pt de Mêlée " +
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
              '<div><span><b><p style="font-size: 18px; text-align:center;;";>' +
              Nom_acteur +
              " attaque " +
              nomCible +
              "</b></p></span></div>" +
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
                '<div><span><b><p style="font-size: 18px; text-align:center;">' +
                Nom_acteur +
                " attaque " +
                nomCible +
                "</b></p></span></div>" +
                result_diff +
                '<p class="result_diff">' +
                noLetaleMsg +
                "</p>",
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT " +
          comp.toUpperCase() +
          " ?</span><br><br>",
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT " +
          this.actor.system.caracs[carac].label.toUpperCase() +
          " ?</span><br><br>",
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
                    `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">JET INITIAL</p></div></span>`,
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
                      `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">RELANCE</p></div></span><br>Vous avez relancé : ${rerolledDie}`,
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
                      '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                      diff +
                      '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                      final +
                      "</p></b></div></span>";
                  } else {
                    final = Math.ceil(final / 3);
                    result_diff =
                      entete +
                      '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                      diff +
                      '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                      final +
                      "</p></b></div></span>";
                  }
                } else {
                  result_diff =
                    entete +
                    '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
                  let content = `<p>Choisissez le dé à relancer :</p>
						   <center><select id="reroll-select">
							 <option value="null">Ne pas relancer</option>`;
                  results.forEach((result, index) => {
                    content += `<option value="${index}">${diceArray[index]}: ${result}</option>`;
                  });
                  content += `</select></center><br>`;

                  new Dialog(
                    {
                      title: "RELANCE D'UN DÉ",
                      content:
                        "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>Relancer un dé</span></div>" +
                        content,
                      buttons: {
                        ok: {
                          label: "OK",
                          callback: (html) => {
                            let index = html.find("#reroll-select").val();
                            resolve(index === "null" ? null : parseInt(index));
                          },
                        },
                      },
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
                let chatData = {
                  user: game.user.id,
                  speaker: ChatMessage.getSpeaker(),
                  content: `${message}<br>Résultats des dés:<br>${formattedResults}Bonus : ${bonuspool}<br>Total: <b>${
                    total + bonuspool
                  }</b>`,
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
                game.dice3d?.showForRoll(r1);
                let resultat1 = r1.total;
                r2 = new Roll("1d" + de_trait1);
                r2.evaluate().then(() => {
                  game.dice3d?.showForRoll(r2);
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
                      '</span></div><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                      comp +
                      " : " +
                      resultat1 +
                      '</p><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                      carac +
                      " : " +
                      resultat2 +
                      '</p></div></span></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 22px;";>' +
                      comp +
                      '</p></b></div></span><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Marge : ' +
                      marge +
                      "</p></b></div></span>";
                  } else {
                    marge = Math.floor((resultat2 - resultat1) / 3);
                    result_diff =
                      "<div class='card-header'><span>" +
                      comp +
                      " vs " +
                      carac +
                      '</span></div><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                      comp +
                      " : " +
                      resultat1 +
                      '</p><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                      carac +
                      " : " +
                      resultat2 +
                      '</p></div></span></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 22px;";>' +
                      carac +
                      '</p></b></div></span><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Marge : ' +
                      marge +
                      "</p></b></div></span>";
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au DOMAINE " +
          label_carac2.toUpperCase() +
          " ?</span><br><br>",
        buttons: btns_3,
        close: function () {
          rgardencetotal = rgardencetotal - ardence_trait2;
          ptardence = rgardencetotal / 2;
        },
        close: () =>
          this.testTrait2(
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
          ),
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
                '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                diff +
                '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                final +
                "</p></b></div></span>";
            } else {
              marge = Math.ceil(result_final / 3);
              result_diff =
                '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                diff +
                '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                final +
                "</p></b></div></span>";
            }
          } else {
            result_diff =
              '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
        r1 = new Roll("1d" + de_domaine);
        r1.evaluate().then(() => {
          game.dice3d?.showForRoll(r1);
          let resultat1 = r1.total;
          r2 = new Roll("1d" + de_trait1);
          r2.evaluate().then(() => {
            game.dice3d?.showForRoll(r2);
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
                '</span></div><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                comp +
                " : " +
                resultat1 +
                '</p><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                carac +
                " : " +
                resultat2 +
                '</p></div></span></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 22px;";>' +
                comp +
                '</p></b></div></span><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Marge : ' +
                marge +
                "</p></b></div></span>";
            } else {
              marge = Math.floor((resultat2 - resultat1) / 3);
              result_diff =
                "<div class='card-header'><span>" +
                comp +
                " vs " +
                carac +
                '</span></div><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                comp +
                " : " +
                resultat1 +
                '</p><p style="background-color:#A3B6BB; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
                carac +
                " : " +
                resultat2 +
                '</p></div></span></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 22px;";>' +
                carac +
                '</p></b></div></span><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Marge : ' +
                marge +
                "</p></b></div></span>";
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
          `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">JET INITIAL (DIFF ${diff})</p></div></span>`,
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
            `${entete}<div><span><p style=\"background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;\">RELANCE (DIFF ${diff})</p></div></span><br>Vous avez relancé : ${rerolledDie}`,
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
            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
            final +
            "</p></b></div></span>";
        } else {
          final = Math.ceil(final / 3);
          result_diff =
            entete +
            '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
            final +
            "</p></b></div></span>";
        }
      } else {
        result_diff =
          entete +
          '<div><span><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
        let content = `<p>Choisissez le dé à relancer :</p>
						   <center><select id="reroll-select">
							 <option value="null">Ne pas relancer</option>`;
        results.forEach((result, index) => {
          content += `<option value="${index}">${diceArray[index]}: ${result}</option>`;
        });
        content += `</select></center><br>`;

        new Dialog(
          {
            title: "RELANCE D'UN DÉ",
            content:
              "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>Relancer un dé</span></div>" +
              content,
            buttons: {
              ok: {
                label: "OK",
                callback: (html) => {
                  let index = html.find("#reroll-select").val();
                  resolve(index === "null" ? null : parseInt(index));
                },
              },
            },
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
              '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
              diff +
              '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
              final +
              "</p></b></div></span>";
          } else {
            final = Math.ceil(final / 3);
            result_diff =
              '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
              diff +
              '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
              final +
              "</p></b></div></span>";
          }
        } else {
          result_diff =
            '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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
  }

  /**
   * Initialize the active side tab on sheet load
   * @param {jQuery} html
   * @private
   */
  _initializeActiveSideTab(html) {
    const activeTab = this._tabs[0].active;
    const activeButton = html.find(`[data-tab="${activeTab}"]`);
    if (activeButton.length) {
      activeButton.addClass("active");
    }
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
  const retraitAuto = game.settings.get("mega", "retraitAuto");
  let currentTarget = Array.from(game.user.targets)[0].actor;
  let vie_perdue = Math.floor(melee_perdue / 2); //si melee est impaire, vie_perdue est la partie entière de la division par 2
  if (retraitAuto) {
    safeDocumentUpdate(currentTarget, {
      "system.health.value": currentTarget.system.health.value - vie_perdue,
    })?.then(() => {
      safeDocumentUpdate(currentTarget, {
        "system.power.value": currentTarget.system.power.value - melee_perdue,
      });
    });
  }
  return vie_perdue;
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
