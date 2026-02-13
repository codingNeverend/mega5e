/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ActorSheet}
 */

import { safeDocumentUpdate, checkEffectsState } from "./mega-utils.js";

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
      classes: ["mega", "sheet", "actor"],
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

    // Prepare character data and items.
    this._prepareItems(context);

    context.rollData = context.actor.getRollData();
    context.enrichedBiography =
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
      this.position.width = 860; // Nouvelle largeur
      this.position.height = 568;
    } else {
      this.position.width = 898; // Nouvelle largeur
      this.position.height = 715;
    }
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
      // const li = $(ev.currentTarget).parents(".item");
      // const item = this.actor.items.get(li.data("itemId"));
      // const item2 = ev.currentTarget.getAttribute("id");
      // console.log("li : "+li);
      // item2.sheet.render(true);
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
              // li.slideUp(200, () => this.render(false));
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
              // this.actor.deleteEmbeddedDocuments('Item',[li.data("itemId")]); //Déprécié V12
              const item = this.actor.items.get(li.data("itemId"));
              item.delete();
              li.slideUp(200, () => this.render(false));
              ui.notifications.info("L'item a été supprimé");
            },
          },
        },
        default: "non",
        close: function () {},
      });
      dialog_item_delete.render(true);
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

    // Gestion des protections
    function toggleProtection(protection) {
      const selection = this.actor.system.protections[protection].selection;
      this.actor.system.protections[protection].selection = !selection;
      this.actor.update({
        [`system.protections.${protection}.selection`]: !selection,
      });
    }

    html
      .find(".active_protection_p1")
      .click((ev) => toggleProtection.call(this, "p1"));
    html
      .find(".active_protection_p2")
      .click((ev) => toggleProtection.call(this, "p2"));
    html
      .find(".active_protection_p3")
      .click((ev) => toggleProtection.call(this, "p3"));

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
      };
      const myDialogOptions_bonus = {
        top: 100,
        left: 100,
        width: 500,
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
      console.log(this.actor.system.talents_combat[comp].bonus); //TODO : à supprimer
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
                        toto +
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
                  dialog_BONUS.render(true);
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
              "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>&nbsp" +
              '<br><span class="bouton_texte">Sélectionnez la DIFF.</span><br><br>',
            buttons: buttons,
            default: "10",
            close: () => {
              if (diff !== "") {
                this.testTir(Nom_acteur, comp, diff, ptardence, bonuspool);
              }
            },
          },
          myDialogOptions_diff,
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
        if (
          this.actor.system.reduit === 1 &&
          this.actor.system.talents_combat[comp].score === 0
        ) {
          ui.notifications.error(
            `La fiche est mode comparse. Vous devez affecter un Rang au talent pour pouvoir lancer un jet.`,
          );
        } else {
          if (this.actor.system.pts_ardence.value > 0) {
            dialog_ardence_choix.render(true);
          } // Si le joeur a des points d'ardence, on lance la fenêtre ardence sinon on envoie direct la DIFF
          else {
            dialog_DIFF.render(true);
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
                // open: function() { $(this).addClass('yescls') },
                // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
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
                        toto +
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
                  dialog_BONUS.render(true);
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
                //dododada
                if (mod !== 0) {
                  if (this.actor.system.talents_combat[comp].bonus === "adr") {
                    if (bonuspool !== 0) {
                      if (this.actor.system.reduit == 1) {
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
                      if (this.actor.system.reduit == 1) {
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
                      if (this.actor.system.reduit == 1) {
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
                      if (this.actor.system.reduit == 1) {
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
                      '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;"> DIFF ' +
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
                        '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
                      break;
                    case "A":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
                      break;
                    case "S":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
                      break;
                    case "R":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
                      break;
                    case "I":
                      effet_coup1 =
                        '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
                      break;
                    case "P":
                      effet_coup1 =
                        '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
                      break;
                    case "T":
                      effet_coup1 =
                        '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
                      break;
                    case "D":
                      effet_coup1 =
                        '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
                      break;
                  }
                  switch (effet_coup2) {
                    case "H":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
                      break;
                    case "A":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
                      break;
                    case "S":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
                      break;
                    case "R":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
                      break;
                    case "I":
                      effet_coup1 =
                        '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
                      break;
                    case "P":
                      effet_coup1 =
                        '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
                      break;
                    case "T":
                      effet_coup1 =
                        '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
                      break;
                    case "D":
                      effet_coup1 =
                        '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
                      break;
                  }
                  switch (effet_coup3) {
                    case "H":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
                      break;
                    case "A":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
                      break;
                    case "S":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
                      break;
                    case "R":
                      effet_coup1 =
                        '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
                      break;
                    case "I":
                      effet_coup1 =
                        '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
                      break;
                    case "P":
                      effet_coup1 =
                        '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
                      break;
                    case "T":
                      effet_coup1 =
                        '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
                      break;
                    case "D":
                      effet_coup1 =
                        '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
                      break;
                  }

                  if (letale) {
                    melee_perdue = calcMeleePerdue(marge, comp, this.actor);
                    if (marge == 0 && result_final >= 0) {
                      vie_perdue = calcViePerdue(marge, comp, this.actor);
                      result_diff +=
                        '<p class="result_diff"> ' +
                        currentTarget.name +
                        " PERD " +
                        melee_perdue +
                        " points de melee</p>";
                      result_diff +=
                        '<p class="result_diff"> ' +
                        currentTarget.name +
                        " perd " +
                        vie_perdue +
                        " points de vie</p>";
                      if (retraitAuto) {
                        game.modules
                          .get("megasocket")
                          .api.documentUpdate(currentTarget, {
                            "system.health.value":
                              currentTarget.system.health.value - vie_perdue,
                          })
                          .then(() => {
                            game.modules
                              .get("megasocket")
                              .api.documentUpdate(currentTarget, {
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
                        '<div><span><b><p style="font-size: 18px; text-align:center;;";>' +
                        Nom_acteur +
                        " attaque " +
                        nomCible +
                        "</b></p></span></div>" +
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

        /******************************* Dialogue Bonus *********************/
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
        if (
          this.actor.system.reduit === 1 &&
          this.actor.system.talents_combat[comp].score === 0
        ) {
          ui.notifications.error(
            `La fiche est mode comparse. Vous devez affecter un Rang au talent pour pouvoir lancer un jet.`,
          );
        } else {
          if (this.actor.system.pts_ardence.value > 0) {
            dialog_ardence_choix.render(true);
          } //Si le joueur a de l'ardence
          else {
            dialog_BONUS.render(true);
          } //Sinon on lance la fenêtre de DIFF directement
        }
      }
    });

    /******************************* Combats sans arme (mains nues, techniques, charge) *********************/
    html.find(".clic_mainsnues").click((ev) => {
      if (!this.token) {
        ui.notifications.error(
          "Veuillez utiliser la fiche de personnage du token !",
        );
        return;
      }
      let diff = 0;
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
      let r = new Roll("1d10");
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
                      toto +
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
                dialog_BONUS.render(true);
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
              this.testmainsnues(comp, diff, ptardence, bonuspool);
            }
          },
        },
        myDialogOptions_diff,
      );

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
      if (
        this.actor.system.reduit === 1 &&
        this.actor.system.talents_combat[comp].score === 0
      ) {
        ui.notifications.error(
          `La fiche est mode comparse. Vous devez affecter un Rang au talent pour pouvoir lancer un jet.`,
        );
      } else {
        if (this.actor.system.pts_ardence.value > 0) {
          dialog_ardence_choix.render(true);
        } else {
          dialog_BONUS.render(true);
        }
      }
    });

    /************************************** Tests Initiatives ou Esquive ******************************/
    html.find(".combat_rollable").click((ev) => {
      let comp = ev.currentTarget.getAttribute("value");
      let act = this.actor;
      let nom = ev.currentTarget.getAttribute("label");
      let dataType = ev.currentTarget.getAttribute("data-type");
      let diff = 0;
      const myDialogOptions = {
        top: 100,
        left: 100,
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
                  result_diff =
                    '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;"> DIFF ' +
                    diff +
                    '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                    final +
                    "</p></b></div></span>";
                } else {
                  final = Math.ceil(final / 3);
                  result_diff =
                    '<div><span><b><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                    diff +
                    '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                    final +
                    "</p></b></div></span>";
                }
              } else {
                result_diff =
                  '<div><span><b><p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span><div>';
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
      let etat = ev.currentTarget.getAttribute("value");
      if (etat == 1) {
        this.actor.update({ "system.reduit": 0 });
        ui.notifications.info("Le PNJ devient acteur !");
        this.position.width = 898; // Nouvelle largeur
        this.position.height = 715;
      } else {
        this.actor.update({ "system.reduit": 1 });
        this.position.width = 851; // Nouvelle largeur
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

    html.find(".pouvoir_rollable").click((ev) => {
      let dataType = ev.currentTarget.getAttribute("data-type");
      let rgtotal = 0;
      let r = new Roll("1d10");
      if (dataType == "Transit") {
        let spe_transit = this.actor.system.pouvoirs.spe_transit.value;
        let score_transit = this.actor.system.pouvoirs.transit.value;
        rgtotal = score_transit + spe_transit;
        r = new Roll(
          "1d" +
            rgtotal +
            "+1d" +
            this.actor.system.caracs.resonnance.value +
            "+1d" +
            this.actor.system.caracs.sens.value,
        );
      } else if (dataType == "Transfert") {
        let spe_transfert = this.actor.system.pouvoirs.spe_transfert.value;
        let score_transfert = this.actor.system.pouvoirs.transfert.value;
        rgtotal = score_transfert + spe_transfert;
        r = new Roll(
          "1d" +
            rgtotal +
            "+1d" +
            this.actor.system.caracs.resonnance.value +
            "+1d" +
            this.actor.system.caracs.caractere.value,
        );
      }
      r.toMessage({
        flavor: "<div class='card-header'><span>" + dataType + "</span></div>",
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      });
    });

    html.find(".talents_rollable").click((ev) => {
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
            oui: {
              label: "NON",
              // open: function() { $(this).addClass('yescls') },
              // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
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
            d.render(true);
          },
        },
        myDialogOptions,
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
                '<span class="bouton_talent"><i class="fas fa-sign-language"></i> Trait</span>',
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
            //if (pouvoir===1) {d2.render(true);}
            if (pouvoir === 1) {
              d2.render(true);
            }
            if (pouvoir === 0) {
              d.render(true);
            }
          },
        },
        myDialogOptions_test,
      );

      let d = new Dialog(
        {
          title: talentName.toUpperCase(),
          content:
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>TRAIT</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Quel TRAIT voulez-vous utiliser ?</span><br><br>",
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
              d2.render(true);
            }
          },
        },
        myDialogOptions_traits,
      );

      if (this.actor.system.pts_ardence.value !== 0) {
        d_ard.render(true);
      } else {
        d.render(true);
      }
      let d2 = new Dialog(
        {
          title: "SPE",
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>DIFF</span></div>" +
            '<br><span class="bouton_texte">Sélectionnez la DIFF ou "NC" si elle n\'est pas communiquée</span><br><br>',
          buttons: generateDiffButtons(4, 27),
          default: "NC",
          close: () => {
            if (diff !== "") {
              let rollFormula = "";
              switch (Rang) {
                case 2:
                case "2":
                  rollFormula = "1d2";
                  break;
                case 4:
                case "4":
                  rollFormula = "1d4";
                  break;
                case 6:
                case "6":
                  rollFormula = "1d6";
                  break;
                case 8:
                case "8":
                  rollFormula = "1d8";
                  break;
                case 10:
                case "10":
                  rollFormula = "1d10";
                  break;
                case 12:
                case "12":
                  rollFormula = "1d12";
                  break;
                case 14:
                case "14":
                  rollFormula = "1d10+1d4";
                  break;
                case 16:
                case "16":
                  rollFormula = "1d10+1d6";
                  break;
                case 18:
                case "18":
                  rollFormula = "1d10+1d8";
                  break;
                case 20:
                case "20":
                  rollFormula = "1d10+1d10";
                  break;
                case 22:
                case "22":
                  rollFormula = "1d10+1d12";
                  break;
                case 24:
                case "24":
                  rollFormula = "1d10+1d10+1d4";
                  break;
                case 26:
                case "26":
                  rollFormula = "1d10+1d10+1d6";
                  break;
                case 28:
                case "28":
                  rollFormula = "1d10+1d10+1d8";
                  break;
                case 30:
                case "30":
                  rollFormula = "1d10+1d10+1d10";
                  break;
                case 32:
                case "32":
                  rollFormula = "1d10+1d10+1d12";
                  break;
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
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>SPE associee</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous utiliser une SPE ?</span><br><br>",
          buttons: btns,
          default: "non",
          // close: () => d3.render(true)
          close: function () {
            Rang = Rang + bonus;
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
        width: 690,
        height: 890,
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
        height: 450,
        top: 10,
        left: 10,
      };
      let description = "";
      let icon1 = "polar-star.png";
      let pouvoir = ev.currentTarget.getAttribute("value");
      description =
        "<p ><strong>Echelle des talents&nbsp;:</strong></p><ul><li ><strong>X </strong>(renseigner <strong>99 </strong>dans la fiche)&nbsp;= <strong>Talent d&eacute;test&eacute;&nbsp;</strong>: pratique &eacute;vit&eacute;, quasi phobique.</li><li ><strong>-2Rg</strong>&nbsp;= <strong>Talent maudit&nbsp;</strong>: pratique maudite, mauvais feeling, toujours un probl&egrave;me.</li><li><strong>d0</strong>&nbsp;= Pratique rare, au minimum, pas d&rsquo;entra&icirc;nement particulier.</li><li ><strong>d2</strong>&nbsp;= Pratique vaguement exerc&eacute;e.</li><li ><strong>d4</strong> = Pratique correcte, apprise ou travaill&eacute;e.</li><li ><strong>d6</strong> = Pratique fr&eacute;quente, travaill&eacute;e et r&eacute;guli&egrave;rement exerc&eacute;e.</li><li ><strong>d8 </strong>= Pratique tr&egrave;s exerc&eacute;e, bonne intuition et anticipation des probl&egrave;mes.</li><li ><strong>d10</strong> = Pratique essentielle du personnage, r&eacute;fl&eacute;chie, travaill&eacute;e et exerc&eacute;e quotidiennement, m&ecirc;me virtuellement.</li><li ><strong>d12 </strong>= Pratique essentielle travaill&eacute;e quotidiennement, intensivement, au d&eacute;triment d&rsquo;autres activit&eacute;s.</li><li ><strong>d14 </strong>= Hors-norme.</li></ul>";

      let d = new TabbedDialog(
        {
          title: "Informations Domaines et Talents",
          header: "",
          footer: "",
          tabs: [
            { title: "Domaines et Talents", content: description, icon: icon1 },
          ],
          buttons: {},
        },
        myDialogOptions,
      );
      d.render(true);
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
      // animationJet();
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
          title: traitName,
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
          title: traitName,
          content:
            "<div class='card-header'><span><img src='systems/mega/images/gears.gif' width=30px; height=30px; style='border:none'>ARDENCE</span></div>&nbsp" +
            "<br><span class='bouton_texte'>Voulez-vous placer des points d'ardence ?</span><br><br>",
          buttons: {
            oui: {
              label: "NON",
              // open: function() { $(this).addClass('yescls') },
              // icons: { primary: "ui-icon-check", secondary: "ui-icon-circle-check" },
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
          title: traitName,
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
      // if (this.actor.system.pts_ardence.value!==0) {setTimeout(function(){d_ard.render(true);},2000);}
      // else {setTimeout(function(){choix.render(true);},2000);}
      choix.render(true);

      let d2 = new Dialog(
        {
          title: traitName,
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
          title: traitName,
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
          title: traitName,
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
    const action = a.dataset.action;
    const attrs = this.object.system.attributes;
    const form = this.form;
  }

  /* -------------------------------------------- */

  /** @override */
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TALENT " +
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au DOMAINE " +
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
      de_domaine = parseFloat(
        this.actor.system.pouvoirs.rg_pouvoir_psi_1.value,
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
              '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec4 - Marge d\'echec : ' +
              final +
              "</p></b></div></span>";
          }
        } else {
          result_diff =
            '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF NC</p></div></span>';
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

  testmainsnues(comp, diff, ptardence, bonuspool) {
    const retraitAuto = game.settings.get("mega", "retraitAuto");
    let nomComp = this.actor.system.talents_combat[comp].label;
    let mod = this.actor.system.talents_combat[comp].score;
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
      currentTarget = Array.from(game.user.targets)[0].actor;
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
        if (bonuspool !== 0) {
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
      if (this.actor.system.talents_combat[comp].bonus === "adr") {
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
        }
      }
    } else if (mod === "0") {
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
    formule = formule.replace(/\s*\+\s*1d0/g, "");
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

          switch (effet_coup1) {
            case "H":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
              break;
            case "A":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
              break;
            case "S":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
              break;
            case "R":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
              break;
            case "T":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
              break;
            case "D":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
              break;
          }
          switch (effet_coup2) {
            case "H":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
              break;
            case "A":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
              break;
            case "S":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
              break;
            case "R":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
              break;
            case "T":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
              break;
            case "D":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
              break;
          }
          switch (effet_coup3) {
            case "H":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
              break;
            case "A":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
              break;
            case "S":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
              break;
            case "R":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
              break;
            case "T":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
              break;
            case "D":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
              break;
          }

          melee_perdue = calcMeleePerdue(marge, comp, this.actor);
          if (marge == 0 && result_final >= 0) {
            if (marge >= 0 && result_final >= 0 && marge == 0) {
              result_diff =
                result_diff +
                '<p class="result_diff"> ' +
                currentTarget.name +
                " perd " +
                melee_perdue +
                " points de melee</p>";
            }
            vie_perdue = calcViePerdue(marge, comp, this.actor);
            result_diff =
              result_diff +
              '<p class="result_diff"> ' +
              currentTarget.name +
              " perd " +
              vie_perdue +
              " points de vie</p>";
            if (retraitAuto) {
              game.modules
                .get("megasocket")
                .api.documentUpdate(currentTarget, {
                  "system.health.value":
                    currentTarget.system.health.value - vie_perdue,
                })
                .then(() => {
                  game.modules
                    .get("megasocket")
                    .api.documentUpdate(currentTarget, {
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
              currentTarget.name +
              "</b></p></span></div>" +
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

  testTir(Nom_acteur, comp, diff, ptardence, bonuspool) {
    let nomComp = this.actor.system.talents_combat[comp].label;
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
      if (this.actor.system.talents_combat[comp].bonus === "adr") {
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
    formule = formule.replace(/\s*\+\s*1d0/g, "");
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
          if (marge >= 0 && result_final >= 0 && (marge == 0 || marge > 3)) {
            result_diff =
              result_diff +
              '<p class="result_diff"> ' +
              currentTarget.name +
              " PERD " +
              melee_perdue +
              " points de melee</p>";
          }

          /**********Effets optionnels ************/
          switch (effet_coup1) {
            case "H":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
              break;
            case "A":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
              break;
            case "S":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
              break;
            case "R":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
              break;
            case "T":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
              break;
            case "D":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
              break;
          }
          switch (effet_coup2) {
            case "H":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
              break;
            case "A":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
              break;
            case "S":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
              break;
            case "R":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
              break;
            case "T":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
              break;
            case "D":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
              break;
          }
          switch (effet_coup3) {
            case "H":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
              break;
            case "A":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
              break;
            case "S":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
              break;
            case "R":
              effet_coup1 =
                '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
              break;
            case "I":
              effet_coup1 =
                '<div class="chat_effet_immediat">Immédiate : IMMOBILISER</div>';
              break;
            case "P":
              effet_coup1 =
                '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
              break;
            case "T":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
              break;
            case "D":
              effet_coup1 =
                '<span><div class="chat_effet_att">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
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
                vie_perdue = calcViePerdue(melee_perdue, comp, this.actor);
              } else {
                vie_perdue = 0;
              }
              result_diff =
                result_diff +
                '<p style="background-color:#A3B6BB; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";><i class="far fa-heart"></i> ' +
                currentTarget.name +
                " perd " +
                vie_perdue +
                " points de vie</p>";
              if (retraitAuto) {
                game.modules
                  .get("megasocket")
                  .api.documentUpdate(currentTarget, {
                    "system.health.value":
                      currentTarget.system.health.value - vie_perdue,
                  })
                  .then(() => {
                    game.modules
                      .get("megasocket")
                      .api.documentUpdate(currentTarget, {
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
            /****************************************************/

            /*************Affichage du chat ************************/
            r.toMessage({
              flavor:
                "<div class='card-header'><span> " +
                type_jet +
                "</span></div>" +
                '<div><span><b><p style="font-size: 18px; text-align:center;;";>' +
                Nom_acteur +
                " attaque " +
                currentTarget.name +
                "</b></p></span></div>" +
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT " +
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
          "<br><span class='bouton_texte'>combien de rangs voulez-vous ajouter au TRAIT " +
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
              de_domaine =
                parseFloat(act.system.caracs[comp].value) +
                parseFloat(ardence_domaine);
            } else {
              de_domaine =
                parseFloat(act.system.domaines[comp].value) +
                parseFloat(ardence_domaine);
            }
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
            if (type_test_1 === "duel") {
              mod1 = "1d" + de_domaine;
              mod2 = "1d" + de_trait1;
            }
            let rollFormula = "";
            let r = new Roll("1d10");

            if (type_test_1 !== "duel") {
              rollFormula = mod;
              r = new Roll(rollFormula);
              r.roll(1);
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
                    marge +
                    "</p></b></div></span>";
                } else {
                  marge = Math.ceil(result_final / 3);
                  result_diff =
                    '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                    diff +
                    '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                    marge +
                    "</p></b></div></span>";
                }
              }
              r.toMessage({
                flavor:
                  "<div class='card-header'><span>" +
                  comp +
                  "</span></div>" +
                  "<div><span>yoyo" +
                  result_diff +
                  "</span></div>",
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
          this.actor.system.domaines[carac2].label +
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
          ),
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
                '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                diff +
                '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
                marge +
                "</p></b></div></span>";
            } else {
              marge = Math.ceil(result_final / 3);
              result_diff =
                '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
                diff +
                '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
                marge +
                "</p></b></div></span>";
            }
          }
          r.toMessage({
            flavor:
              "<div class='card-header'><span>" +
              comp +
              "</span></div>" +
              "<div><span>yoyo" +
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
            '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:green; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Reussite - Marge de reussite : ' +
            marge +
            "</p></b></div></span>";
        } else {
          marge = Math.ceil(final / 3);
          result_diff =
            '<p style="background-color:#A3B6BB; color:white; font-size: 22px; text-align:center; text-shadow: 1px 1px 2px black;">DIFF ' +
            diff +
            '</p></div></span><div><span><b><p style="background-color:red; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 16px;";>Echec - Marge d\'echec : ' +
            marge +
            "</p></b></div></span>";
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
