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

export class Arme_courte_Sheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mega", "sheet", "item"],
      template: "systems/mega/templates/arme-courte-sheet.html",
      width: 549,
      height: 709,
      tabs: [
        {
          navSelector: ".sheet-tabs",
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

    html.find(".lire_son").click((ev) => {
      let chemin_son = this.object.system.sound.value;
      foundry.audio.AudioHelper.play(
        { src: chemin_son, volume: 1, autoplay: true, loop: false },
        true,
      );
    });

    html.find(".item-view").contextmenu((ev) => {
      let img = ev.currentTarget.getAttribute("value");
      new ImagePopout(img, {
        title: "Image",
        shareable: true,
      }).render(true);
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
      let icon1 = "polar-star.svg";
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

  /* -------------------------------------------- */

  /** @override */
}
