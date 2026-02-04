/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ItemSheet}
 */
export class Protection_Sheet extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["mega", "sheet", "item"],
      template: "systems/mega/templates/protection-sheet.html",
      width: 530,
      height: 674,
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
    const sheetBody = this.element.find(".itemsheet-body");
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

    html.find(".silouhette_body_div").click((ev) => {
      let part = ev.currentTarget.getAttribute("value");
      const input = document.querySelector(`.${part}`);
      const defPart = `def_${part}`;
      const currentValue = this.object.system.caracs[defPart];

      if (currentValue === 1) {
        console.log(`system.caracs.${defPart} passe à 0`);
        this.object.update({ [`system.caracs.${defPart}`]: 0 });
        input.classList.remove("green");
        input.classList.add("red");
      } else {
        console.log(`system.caracs.${defPart} passe à 1`);
        this.object.update({ [`system.caracs.${defPart}`]: 1 });
        input.classList.remove("red");
        input.classList.add("green");
      }
    });

    html.find(".masquer").click((ev) => {
      let table_name = ev.currentTarget.getAttribute("value");
      var div = document.getElementById(table_name);
      if (table_name == "effets") {
        if (this.object.system.masquer_effets == false) {
          this.object.update({ "system.masquer_effets": true });
        } else {
          this.object.update({ "system.masquer_effets": false });
        }
      }
      if (table_name == "bonusdef") {
        if (this.object.system.masquer_bonusdef == false) {
          this.object.update({ "system.masquer_bonusdef": true });
        } else {
          this.object.update({ "system.masquer_bonusdef": false });
        }
      }
      if (table_name == "localisation") {
        if (this.object.system.masquer_localisation == false) {
          this.object.update({ "system.masquer_localisation": true });
        } else {
          this.object.update({ "system.masquer_localisation": false });
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
