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
      width: 600,
      height: 765,
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
    // Nouveau header pouvoir-sheet-modern : environ 116px + barre titre FoundryVTT (~36px) + marges
    const bodyHeight = position.height - 160;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

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
      },
      { passive: true },
    );

    // Gestion des blocs collapsibles avec persistence localStorage
    const _collapseKey = `mega-collapse-${this.item.id}`;
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
