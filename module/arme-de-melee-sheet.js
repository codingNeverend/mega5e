/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ItemSheet}
 */

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

export class Arme_de_melee_Sheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mega", "sheet", "item"],
      template: "systems/mega/templates/arme-de-melee-sheet.html",
      width: 549,
      height: 709,
      tabs: [
        {
          navSelector: ".side-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = await super.getData();
    const itemData = this.document.toObject(false);
    context.system = itemData.system;
    context.flags = itemData.flags;
    // Adding a pointer to CONFIG.MEGA
    context.config = CONFIG.MEGA;
    context.GM = game.user.isGM;
    context.enrichedBiography =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.description,
        { async: true },
      );
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html
      .find(".attributes")
      .on(
        "click",
        ".attribute-control",
        this._onClickAttributeControl.bind(this),
      );

    html.find(".play-sound-btn").click(async (ev) => {
      let chemin_son = this.object.system.sound.value;
      if (chemin_son && chemin_son.trim() !== "") {
        try {
          // Vérifier si le fichier existe
          const response = await fetch(chemin_son, { method: "HEAD" });
          if (response.ok) {
            foundry.audio.AudioHelper.play(
              { src: chemin_son, volume: 1, autoplay: true, loop: false },
              true,
            );
          } else {
            ui.notifications.warn(
              "Le fichier audio spécifié n'est pas valide ou n'existe pas.",
            );
          }
        } catch (error) {
          ui.notifications.warn(
            "Le fichier audio spécifié n'est pas valide ou n'existe pas.",
          );
        }
      } else {
        ui.notifications.warn("Aucun fichier audio configuré pour cette arme.");
      }
    });

    html.find(".preview-video-btn").click(async (ev) => {
      let chemin_video = this.object.system.effet_arme.value;
      if (chemin_video && chemin_video.trim() !== "") {
        try {
          // Vérifier si le fichier existe
          const response = await fetch(chemin_video, { method: "HEAD" });
          if (response.ok) {
            // Créer une fenêtre pour afficher la vidéo
            new Dialog(
              {
                title: "Aperçu de l'effet vidéo",
                content: `<div style="text-align: center;">
                        <video width="400" controls autoplay>
                          <source src="${chemin_video}" type="video/webm">
                          <source src="${chemin_video}" type="video/mp4">
                          Votre navigateur ne supporte pas la lecture vidéo.
                        </video>
                      </div>`,
                buttons: {
                  close: {
                    label: "Fermer",
                    callback: () => {},
                  },
                },
                default: "close",
                render: (html) => {
                  // Gestion des erreurs de chargement vidéo
                  const video = html.find("video")[0];
                  if (video) {
                    video.addEventListener("error", () => {
                      ui.notifications.error(
                        "Impossible de charger la vidéo. Vérifiez le chemin d'accès.",
                      );
                    });
                  }
                },
              },
              {
                width: 460,
                height: 320,
                resizable: true,
              },
            ).render(true);
          } else {
            ui.notifications.warn(
              "Le fichier vidéo spécifié n'est pas valide ou n'existe pas.",
            );
          }
        } catch (error) {
          ui.notifications.warn(
            "Le fichier vidéo spécifié n'est pas valide ou n'existe pas.",
          );
        }
      } else {
        ui.notifications.warn("Aucun fichier vidéo configuré pour cette arme.");
      }
    });

    html.find(".item-view").contextmenu((ev) => {
      let img = ev.currentTarget.getAttribute("value");
      new ImagePopout(img, {
        title: "Image",
        shareable: true,
      }).render(true);
    });

    html.find(".masquer").click((ev) => {
      let table_name = ev.currentTarget.getAttribute("value");
      var div = document.getElementById(table_name);
      if (table_name == "avantage") {
        if (this.object.system.masquer_avantage == false) {
          this.object.update({ "system.masquer_avantage": true });
        } else {
          this.object.update({ "system.masquer_avantage": false });
        }
      }
      if (table_name == "letale") {
        if (this.object.system.masquer_letale == false) {
          this.object.update({ "system.masquer_letale": true });
        } else {
          this.object.update({ "system.masquer_letale": false });
        }
      }
      if (table_name == "famille") {
        if (this.object.system.masquer_famille == false) {
          this.object.update({ "system.masquer_famille": true });
        } else {
          this.object.update({ "system.masquer_famille": false });
        }
      }
      if (table_name == "degats") {
        if (this.object.system.masquer_degats == false) {
          this.object.update({ "system.masquer_degats": true });
        } else {
          this.object.update({ "system.masquer_degats": false });
        }
      }
      if (table_name == "effets_optionnels") {
        if (this.object.system.masquer_effets_optionnels == false) {
          this.object.update({ "system.masquer_effets_optionnels": true });
        } else {
          this.object.update({ "system.masquer_effets_optionnels": false });
        }
      }
      if (table_name == "effets_armes") {
        if (this.object.system.masquer_effets_armes == false) {
          this.object.update({ "system.masquer_effets_armes": true });
        } else {
          this.object.update({ "system.masquer_effets_armes": false });
        }
      }
    });

    html.find(".comb").mouseover((ev) => {
      ev.currentTarget.focus();
      ev.currentTarget.setSelectionRange(0, ev.currentTarget.value.length);
    });

    html.find(".letale").click((ev) => {
      if (this.object.system.letale.value) {
        this.object.update({ "system.letale.value": false });
      } else {
        this.object.update({ "system.letale.value": true });
      }
    });

    html.find(".type_degat").click((ev) => {
      let type_degat = ev.currentTarget.getAttribute("value");
      if (this.object.system.type_degats.balles.etat) {
        this.object.update({ "system.type_degats.balles.etat": false });
      } else if (this.object.system.type_degats.lame.etat) {
        this.object.update({ "system.type_degats.lame.etat": false });
      } else if (this.object.system.type_degats.choc.etat) {
        this.object.update({ "system.type_degats.choc.etat": false });
      } else if (this.object.system.type_degats.rayon.etat) {
        this.object.update({ "system.type_degats.rayon.etat": false });
      } else if (this.object.system.type_degats.feu.etat) {
        this.object.update({ "system.type_degats.feu.etat": false });
      } else if (this.object.system.type_degats.froid.etat) {
        this.object.update({ "system.type_degats.froid.etat": false });
      } else if (this.object.system.type_degats.acide.etat) {
        this.object.update({ "system.type_degats.acide.etat": false });
      }

      if (type_degat == "balles") {
        if (this.object.system.type_degats.balles.etat) {
          this.object.update({ "system.type_degats.balles.etat": false });
        } else {
          this.object.update({ "system.type_degats.balles.etat": true });
        }
      } else if (type_degat == "choc") {
        if (this.object.system.type_degats.choc.etat) {
          this.object.update({ "system.type_degats.choc.etat": false });
        } else {
          this.object.update({ "system.type_degats.choc.etat": true });
        }
      } else if (type_degat == "lame") {
        if (this.object.system.type_degats.lame.etat) {
          this.object.update({ "system.type_degats.lame.etat": false });
        } else {
          this.object.update({ "system.type_degats.lame.etat": true });
        }
      } else if (type_degat == "rayon") {
        if (this.object.system.type_degats.rayon.etat) {
          this.object.update({ "system.type_degats.rayon.etat": false });
        } else {
          this.object.update({ "system.type_degats.rayon.etat": true });
        }
      } else if (type_degat == "feu") {
        if (this.object.system.type_degats.feu.etat) {
          this.object.update({ "system.type_degats.feu.etat": false });
        } else {
          this.object.update({ "system.type_degats.feu.etat": true });
        }
      } else if (type_degat == "froid") {
        if (this.object.system.type_degats.froid.etat) {
          this.object.update({ "system.type_degats.froid.etat": false });
        } else {
          this.object.update({ "system.type_degats.froid.etat": true });
        }
      } else if (type_degat == "acide") {
        if (this.object.system.type_degats.acide.etat) {
          this.object.update({ "system.type_degats.acide.etat": false });
        } else {
          this.object.update({ "system.type_degats.acide.etat": true });
        }
      }
    });
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
}
