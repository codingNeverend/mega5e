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

export class Pouvoir_Sheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mega", "sheet", "item"],
      template: "systems/mega/templates/pouvoir-sheet.html",
      width: 700,
      height: 893,
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
    context.pouv1 =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.pouvoir1.description,
        { async: true },
      );
    context.pouv2 =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.pouvoir2.description,
        { async: true },
      );
    context.pouv3 =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.pouvoir3.description,
        { async: true },
      );
    context.pouv4 =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.pouvoir4.description,
        { async: true },
      );
    context.aide =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.aide.description,
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

    html.find(".item-view").contextmenu((ev) => {
      let img = ev.currentTarget.getAttribute("value");
      new ImagePopout(img, {
        title: "Image",
        shareable: true,
      }).render(true);
    });

    // Fenêtre d'Informations sur les effets de combat

    html.find(".masquer").click((ev) => {
      let table_name = ev.currentTarget.getAttribute("value");
      console.log(table_name);
      var div = document.getElementById(table_name);
      if (table_name == "entete") {
        if (this.object.system.masquer_entete == false) {
          this.object.update({ "system.masquer_entete": true });
        } else {
          this.object.update({ "system.masquer_entete": false });
        }
      }
      if (table_name == "description") {
        if (this.object.system.masquer_description == false) {
          this.object.update({ "system.masquer_description": true });
        } else {
          this.object.update({ "system.masquer_description": false });
        }
      }
      if (table_name == "grades") {
        if (this.object.system.masquer_grades == false) {
          this.object.update({ "system.masquer_grades": true });
        } else {
          this.object.update({ "system.masquer_grades": false });
        }
      }
    });

    html.find(".aide").click((ev) => {
      let table_name = ev.currentTarget.getAttribute("value");

      if (this.object.system.aide_active == false) {
        this.object.update({ "system.aide_active": true });
      } else {
        this.object.update({ "system.aide_active ": false });
      }

      if (table_name == "description") {
        if (this.object.system.masquer_description == false) {
          this.object.update({ "system.masquer_description": true });
        } else {
          this.object.update({ "system.masquer_description": false });
        }
      }
      if (table_name == "grades") {
        if (this.object.system.masquer_grades == false) {
          this.object.update({ "system.masquer_grades": true });
        } else {
          this.object.update({ "system.masquer_grades": false });
        }
      }
    });

    html.find(".comb").mouseover((ev) => {
      ev.currentTarget.focus();
      ev.currentTarget.setSelectionRange(0, ev.currentTarget.value.length);
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
