/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {foundry.appv1.sheets.ActorSheet}
 */
import { PlayerDialog } from "./dialog.js";
export class SimpleContenantSheet extends foundry.appv1.sheets.ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["worldbuilding", "sheet", "actor"],
      template: "systems/mega/templates/contenant-sheet.html",
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    data.GM = game.user.isGM;
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    if (this.actor.data.type == "contenant") {
      this._prepareCharacterItems(data);
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find(".item-edit").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });
    //give item
    html.find(".item-control.item-give").on("click", (e) => {
      e.preventDefault();
      const currentItemId = e.currentTarget.closest(".item").dataset.itemId;
      giveItem.bind(this)(currentItemId);
    });

    function getItemFromInvoByName(actor, name) {
      return actor.items.find((t) => t.data.name === name);
    }
    function giveItem(currentItemId) {
      const currentActor = this.actor;
      const listPC = game.actors.entities.filter((a) => a.hasPlayerOwner);
      const filteredPCList = listPC.filter((a) => a.id !== this.actor.id);
      const d = new PlayerDialog(
        ({ playerId, quantity }) => {
          const actor = game.actors.get(playerId);
          const currentItem = currentActor.items.find(
            (item) => item.id === currentItemId
          );
          const currentItemQuantity = currentItem.data.data.quantity;
          if (quantity > currentItemQuantity) {
            return ui.notifications.error(
              `Vous ne pouvez pas offrir plus que vous n'avez`
            );
          } else {
            const updateItem = {
              "data.quantity": currentItem.data.data.quantity - quantity,
            };
            currentItem.update(updateItem).then((res) => {
              const duplicatedItem = duplicate(currentItem);
              duplicatedItem.data.quantity = quantity;
              const existingItem = getItemFromInvoByName(
                actor,
                duplicatedItem.name
              );
              if (existingItem) {
                const updateItem = {
                  "data.quantity": existingItem.data.data.quantity + quantity,
                };
                existingItem.update(updateItem);
              } else {
                actor.createEmbeddedEntity("OwnedItem", duplicatedItem);
              }
              console.log(
                `Giving item: ${currentItem.id} to actor ${actor.id}`
              );
              if (currentItem.data.data.quantity === 0) {
                currentItem.delete();
              }
            });
          }
        },
        { acceptLabel: "Donner objet", filteredPCList }
      );
      d.render(true);
    }

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    html.find(".item-view").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");

      const item = this.actor.getOwnedItem(li.data("itemId"));
      new ImagePopout(item.data.img, {
        title: item.name,
        shareable: true,
        uuid: item.uuid,
      }).render(true);
    });

    // Add or Remove Attribute
    html
      .find(".attributes")
      .on(
        "click",
        ".attribute-control",
        this._onClickAttributeControl.bind(this)
      );
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

  //Inventaire par type

  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    const gear = [];
    const tirs = [];
    const courtes = [];
    const longues = [];
    const lancer = [];
    const protections = [];

    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;

      if (i.type === "item") {
        gear.push(i);
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
      }
    }

    actorData.gear = gear;
    actorData.tirs = tirs;
    actorData.courtes = courtes;
    actorData.longues = longues;
    actorData.lancer = lancer;
    actorData.protections = protections;
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
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if (/[\s\.]/.test(k))
        return ui.notifications.error(
          "Attribute keys may not contain spaces or periods"
        );
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for (let k of Object.keys(this.object.data.data.attributes)) {
      if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData)
      .filter((e) => !e[0].startsWith("data.attributes"))
      .reduce(
        (obj, e) => {
          obj[e[0]] = e[1];
          return obj;
        },
        { _id: this.object._id, "data.attributes": attributes }
      );

    // Update the Actor
    return this.object.update(formData);
  }

  testComp(ev, carac, bonus, bonuspool, pouvoir, diff, ptardence) {
    let comp = ev.currentTarget.getAttribute("value");
    let nomComp = this.actor.data.data.talents[comp].label;
    let mod = this.actor.data.data.talents[comp].value + bonus;
    let rollFormula = "";
    let result_diff = "";
    let r = new Roll("1d10");
    let talent_maudit = 0;
    let final = 0;
    let btns_1 = {};
    let btns_2 = {};
    let btns_3 = {};
    let ardence_talent = 0;
    let ardence_domaine = 0;
    let ardence_trait = 0;
    let rgardencetotal = ptardence * 2;
    if (ptardence >= 1) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
    }
    if (ptardence >= 2) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
    }
    if (ptardence >= 3) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
    }
    if (ptardence >= 4) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_talent = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_talent = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_talent = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
      btns_1[4] = { label: "8 Rg", callback: () => (ardence_talent = 8) };
    }
    //david
    //currentTarget.update({"data.power.value": currentTarget.data.data.power.value - melee_perdue});
    this.actor.update({
      "data.pts_ardence.value":
        this.actor.data.data.pts_ardence.value - ptardence,
    });
    let diag1 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->" + comp + " ?</span></div>",
      buttons: btns_1,
      close: function () {
        rgardencetotal = rgardencetotal - ardence_talent;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
        }
        if (ptardence >= 1) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
        }
        if (ptardence >= 2) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
        }
        if (ptardence >= 3) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
        }
        if (ptardence >= 4) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
          btns_2[4] = { label: "8 Rg", callback: () => (ardence_domaine = 8) };
        }
        if (pouvoir === 0) {
          diag2.render(true);
        }
        if (pouvoir === 1) {
          diag_pouv.render(true);
        }
      },
    });

    let diag2 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->" +
        this.actor.data.data.talents[comp].domaine +
        " ?</span></div>",
      buttons: btns_2,
      close: function () {
        rgardencetotal = rgardencetotal - ardence_domaine;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
        }
        if (ptardence >= 1) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
        }
        if (ptardence >= 2) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
        }
        if (ptardence >= 3) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
        }
        if (ptardence >= 4) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait = 8) };
        }
        diag3.render(true);
      },
    });

    let diagpouv3 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->Pouvoir PSI ?</span></div>",
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
          ardence_talent
        ),
    });

    let diag_pouv = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->R�sonnance ?</span></div>",
      buttons: btns_2,
      close: function () {
        rgardencetotal = rgardencetotal - ardence_domaine;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
        }
        if (ptardence >= 1) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
        }
        if (ptardence >= 2) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
        }
        if (ptardence >= 3) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
        }
        if (ptardence >= 4) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
          btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait = 8) };
        }
        diagpouv3.render(true);
      },
    });

    let diag3 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->" +
        this.actor.data.data.caracs[carac].label +
        " ?</span></div>",
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
          ardence_talent
        ),
    });

    if (ptardence !== 0) {
      if (mod > 0 && mod < 99) {
        diag1.render(true);
      }
      if (mod > 98) {
        rgardencetotal = rgardencetotal - ardence_domaine;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
        }
        if (ptardence >= 1) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
        }
        if (ptardence >= 2) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
        }
        if (ptardence >= 3) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait = 6) };
        }
        if (ptardence >= 4) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait = 0) };
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
      if (mod === 0 || this.actor.data.data.talents[comp].value === -2) {
        rgardencetotal = rgardencetotal - ardence_talent;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
        }
        if (ptardence >= 1) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
        }
        if (ptardence >= 2) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
        }
        if (ptardence >= 3) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_domaine = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
        }
        if (ptardence >= 4) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
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
        ardence_talent
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
    ardence_talent
  ) {
    let comp = ev.currentTarget.getAttribute("value");
    let nomComp = this.actor.data.data.talents[comp].label;
    let mod = this.actor.data.data.talents[comp].value + bonus;
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
      de_trait = this.actor.data.data.caracs[carac].value + ardence_trait;
      if (this.actor.data.data.talents[comp].value === -2) {
        talent_maudit = -2;
      }
      if (this.actor.data.data.talents[comp].domaine === "communication") {
        de_domaine =
          this.actor.data.data.domaines.communication.value +
          talent_maudit +
          ardence_domaine;
      }
      if (this.actor.data.data.talents[comp].domaine === "pratique") {
        de_domaine =
          this.actor.data.data.domaines.pratique.value +
          talent_maudit +
          ardence_domaine;
      }
      if (this.actor.data.data.talents[comp].domaine === "culture_milieux") {
        de_domaine =
          this.actor.data.data.domaines.culture_milieux.value +
          talent_maudit +
          ardence_domaine;
      }
      // let r = new Roll("1d" + this.actor.data.data.caracs.vivacite.value);
      if (mod > 0 && mod < 99) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + mod + "+ 1d" + de_domaine + "+ 1d" + this.actor.data.data.caracs[carac].value + "+ "+bonuspool;
          rollFormula =
            "1d" +
            de_talent +
            "+ 1d" +
            de_domaine +
            "+ 1d" +
            de_trait +
            "+ " +
            bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + mod + "+ 1d" + de_domaine + "+ 1d" + this.actor.data.data.caracs[carac].value;
          rollFormula =
            "1d" + de_talent + "+ 1d" + de_domaine + "+ 1d" + de_trait;
        }
      }
      if (mod === 0 || this.actor.data.data.talents[comp].value === -2) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value+ "+ 1d" + de_domaine + "+ "+bonuspool;
          rollFormula =
            "1d" + de_domaine + "+ 1d" + de_trait + "+ " + bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value+ "+ 1d" + de_domaine;
          rollFormula = "1d" + de_domaine + "+ 1d" + de_trait;
        }
      }
      if (mod > 98) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value + "+ "+bonuspool;
          rollFormula = "1d" + de_trait + "+ " + bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value;
          rollFormula = "1d" + de_trait;
        }
      }
    }
    if (pouvoir === 1) {
      if (this.actor.data.data.talents[comp].value === -2) {
        talent_maudit = -2;
      }
      de_trait =
        this.actor.data.data.caracs.resonnance.value +
        ardence_domaine +
        talent_maudit;
      de_domaine = parseFloat(
        this.actor.data.data.pouvoirs.rg_pouvoir_psi_1.value
      );
      de_domaine += ardence_trait;
      // faire test si de_talent ===0!
      if (mod > 0 && mod < 99) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + mod  +"+1d"+this.actor.data.data.caracs.resonnance.value + "+1d"+ this.actor.data.data.pouvoirs.rg_pouvoir_psi_1.value + "+ "+bonuspool;
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
          // rollFormula = "1d" + mod  +"+1d"+this.actor.data.data.caracs.resonnance.value + "+1d"+ this.actor.data.data.pouvoirs.rg_pouvoir_psi_1.value;
          rollFormula =
            "1d" + de_talent + "+1d" + de_trait + "+1d" + de_domaine;
        }
      }
      if (mod === 0 || this.actor.data.data.talents[comp].value === -2) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value+ "+ 1d" + de_domaine + "+ "+bonuspool;
          rollFormula =
            "1d" + de_trait + "+ 1d" + de_domaine + "+ " + bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value+ "+ 1d" + de_domaine;
          rollFormula = "1d" + de_trait + "+ 1d" + de_domaine;
        }
      }
      if (mod > 98) {
        if (bonuspool !== 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value + "+ "+bonuspool;
          rollFormula = "1d" + de_trait + "+ " + bonuspool;
        }
        if (bonuspool === 0) {
          // rollFormula = "1d" + this.actor.data.data.caracs[carac].value;
          rollFormula = "1d" + de_domaine;
        }
      }
    }
    if (rollFormula !== "") {
      r = new Roll(rollFormula);
      r.roll(1);
      let type_jet = this.actor.data.data.talents[comp].label;
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
        if (final > 0) {
          final = Math.floor(final / 3);
          result_diff =
            '<b><p style="color:#54b332; font-size: 16px;";>Reussite - Marge de reussite : ' +
            final +
            "</p></b>";
        } else {
          final = Math.ceil(final / 3);
          result_diff =
            '<b><p style="color:#FF0000; font-size: 16px;";>Echec - Marge d\'echec : ' +
            final +
            "</p></b>";
        }
      }
      // let formule=r.formula + " + " + bonuspool;
      // game.dice3d.showForRoll(r, game.user, true, '' ).then(displayed => {
      if (pouvoir === 1) {
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
    }
  }

  testTrait(ev, carac, carac2, diff, ptardence) {
    let comp = ev.currentTarget.getAttribute("value");
    // let mod = "1d"+this.actor.data.data.caracs[comp].value+" + 1d"+this.actor.data.data.caracs[carac].value+" + 1d"+this.actor.data.data.caracs[carac2].value;
    let btns_1 = {};
    let btns_2 = {};
    let btns_3 = {};
    let rgardencetotal = ptardence * 2;
    let ardence_domaine = 0;
    let ardence_trait1 = 0;
    let ardence_trait2 = 0;
    if (ptardence >= 1) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
    }
    if (ptardence >= 2) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
    }
    if (ptardence >= 3) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_talent = 6) };
    }
    if (ptardence >= 4) {
      btns_1[0] = { label: "Rien", callback: () => (ardence_domaine = 0) };
      btns_1[1] = { label: "2 Rg", callback: () => (ardence_domaine = 2) };
      btns_1[2] = { label: "4 Rg", callback: () => (ardence_domaine = 4) };
      btns_1[3] = { label: "6 Rg", callback: () => (ardence_domaine = 6) };
      btns_1[4] = { label: "8 Rg", callback: () => (ardence_domaine = 8) };
    }
    let diag1 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->" + comp + " ?</span></div>",
      buttons: btns_1,
      close: function () {
        rgardencetotal = rgardencetotal - ardence_domaine;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_trait1 = 0) };
        }
        if (ptardence >= 1) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_trait1 = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
        }
        if (ptardence >= 2) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_trait1 = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
        }
        if (ptardence >= 3) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_trait1 = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_trait1 = 6) };
        }
        if (ptardence >= 4) {
          btns_2[0] = { label: "Rien", callback: () => (ardence_trait1 = 0) };
          btns_2[1] = { label: "2Rg", callback: () => (ardence_trait1 = 2) };
          btns_2[2] = { label: "4 Rg", callback: () => (ardence_trait1 = 4) };
          btns_2[3] = { label: "6 Rg", callback: () => (ardence_trait1 = 6) };
          btns_2[4] = { label: "8 Rg", callback: () => (ardence_trait1 = 8) };
        }
        diag2.render(true);
      },
    });

    let diag2 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->" +
        this.actor.data.data.caracs[carac].label +
        "</span></div>",
      buttons: btns_2,
      close: function () {
        rgardencetotal = rgardencetotal - ardence_trait1;
        ptardence = rgardencetotal / 2;
        if (ptardence === 0) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait2 = 0) };
        }
        if (ptardence >= 1) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait2 = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
        }
        if (ptardence >= 2) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait2 = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
        }
        if (ptardence >= 3) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait2 = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait2 = 6) };
        }
        if (ptardence >= 4) {
          btns_3[0] = { label: "Rien", callback: () => (ardence_trait2 = 0) };
          btns_3[1] = { label: "2Rg", callback: () => (ardence_trait2 = 2) };
          btns_3[2] = { label: "4 Rg", callback: () => (ardence_trait2 = 4) };
          btns_3[3] = { label: "6 Rg", callback: () => (ardence_trait2 = 6) };
          btns_3[4] = { label: "8 Rg", callback: () => (ardence_trait2 = 8) };
        }
        diag3.render(true);
      },
    });

    let diag3 = new Dialog({
      title: "ARDENCE",
      content:
        "<div class='card-header'><span>Ardence->" +
        this.actor.data.data.caracs[carac2].label +
        "</span></div>",
      buttons: btns_3,
      close: function () {
        rgardencetotal = rgardencetotal - ardence_trait2;
        ptardence = rgardencetotal / 2;
      },
      close: () =>
        this.testTrait2(
          ev,
          carac,
          carac2,
          diff,
          ptardence,
          ardence_domaine,
          ardence_trait1,
          ardence_trait2
        ),
    });

    diag1.render(true);
  }

  testTrait2(
    ev,
    carac,
    carac2,
    diff,
    ptardence,
    ardence_domaine,
    ardence_trait1,
    ardence_trait2
  ) {
    let comp = ev.currentTarget.getAttribute("value");
    let de_domaine =
      parseFloat(this.actor.data.data.domaines[comp].value) +
      parseFloat(ardence_domaine);
    let de_trait1 =
      parseFloat(this.actor.data.data.caracs[carac].value) +
      parseFloat(ardence_trait1);
    let de_trait2 =
      parseFloat(this.actor.data.data.caracs[carac2].value) +
      parseFloat(ardence_trait2);
    let mod = "1d" + de_domaine + " + 1d" + de_trait1 + " + 1d" + de_trait2;
    let rollFormula = "";
    let r = new Roll("1d10");
    rollFormula = mod;
    r = new Roll(rollFormula);
    r.roll(1);
    let formule = r.formula;
    let resultat = r.total;
    let result_diff = "";
    let final = resultat - diff;
    if (diff !== 0) {
      if (final > 0) {
        final = Math.floor(final / 3);
        result_diff =
          '<b><p style="color:#54b332; font-size: 16px;";>Reussite - Marge de reussite : ' +
          final +
          "</p></b>";
      } else {
        final = Math.ceil(final / 3);
        result_diff =
          '<b><p style="color:#FF0000; font-size: 16px;";>Echec - Marge d\'echec : ' +
          final +
          "</p></b>";
      }
    }
    r.toMessage({
      flavor:
        "<div class='card-header'><span>Jets de traits</span></div>" +
        "<div><span>" +
        result_diff +
        "</span></div>",
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
}
