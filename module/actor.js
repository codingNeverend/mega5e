/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class MegaActor extends Actor {
  /** @override */

  prepareData() {
    super.prepareData();
    // const actorData = this.data;
    const actorData = this;
    // const data = actorData.data;
    // const data = actorData.system;
  }

  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;

    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  _prepareCharacterData(actorData) {
    if (actorData.type !== "PJ") return;
    const systemData = actorData.system;

    /*********************************** Onglet MJ ******************************************************************************************** */

    //calcul de la récupération des Pv
    systemData.vie_hrecup_sans_activite.value =
      (systemData.health.max - systemData.health.value) * 12;
    systemData.vie_hrecup_repos_total.value =
      (systemData.health.max - systemData.health.value) * 6;
    systemData.vie_jrecup_sans_activite.value =
      systemData.vie_hrecup_sans_activite.value / 24;
    systemData.vie_jrecup_repos_total.value =
      systemData.vie_hrecup_repos_total.value / 24;

    //calcul de la récupération des points d'ardence
    let nb_pt_ardence_perdu =
      systemData.pts_ardence.max - systemData.pts_ardence.value;

    for (let i = 1; i <= 12; i++) {
      if (nb_pt_ardence_perdu >= i) {
        systemData[`recup_ardence_${i}`].value =
          nb_pt_ardence_perdu * 15 - 15 * (i - 1);
      } else {
        systemData[`recup_ardence_${i}`].value = 0;
      }
    }

    //calcul de la récupération des points de résonnances
    let nb_pt_resonnance_perdu =
      systemData.pts_resonnance.max - systemData.pts_resonnance.value;

    for (let i = 1; i <= 10; i++) {
      if (nb_pt_resonnance_perdu >= i) {
        systemData[`recup_resonnance_${i}`].value =
          nb_pt_resonnance_perdu * i - (i * (i - 1)) / 2;
      } else {
        systemData[`recup_resonnance_${i}`].value = 0;
      }
    }

    /*********************************** Onglet Combat ******************************************************************************************** */
    //Initialisation de l'ensemble des armes par type
    let AC1 = systemData.talents_combat.armescourtes_1.label;
    let AC2 = systemData.talents_combat.armescourtes_2.label;
    let item = this.items.find((i) => i.name == AC1);
    if (!item) {
      systemData.talents_combat.armescourtes_1.label = "";
      systemData.talents_combat.armescourtes_1.selection = false;
    }

    item = this.items.find((i) => i.name == AC2);
    if (!item) {
      systemData.talents_combat.armescourtes_2.label = "";
      systemData.talents_combat.armescourtes_2.selection = false;
    }

    let MN1 = systemData.talents_combat.mainsnues1.label;
    let MN2 = systemData.talents_combat.mainsnues3.label;
    let MN3 = systemData.talents_combat.mainsnues3.label;
    item = this.items.find((i) => i.name == MN1);
    if (!item) {
      systemData.talents_combat.mainsnues1.label = "";
      systemData.talents_combat.mainsnues1.selection = false;
    }

    item = this.items.find((i) => i.name == MN2);
    if (!item) {
      systemData.talents_combat.mainsnues2.label = "";
      systemData.talents_combat.mainsnues2.selection = false;
    }

    item = this.items.find((i) => i.name == MN3);
    if (!item) {
      systemData.talents_combat.mainsnues3.label = "";
      systemData.talents_combat.mainsnues3.selection = false;
    }

    let T1 = systemData.talents_combat.tir_1.label;
    let T2 = systemData.talents_combat.tir_2.label;
    item = this.items.find((i) => i.name == T1);
    if (!item) {
      systemData.talents_combat.tir_1.label = "";
      systemData.talents_combat.tir_1.selection = false;
    }

    item = this.items.find((i) => i.name == T2);
    if (!item) {
      systemData.talents_combat.tir_2.label = "";
      systemData.talents_combat.tir_2.selection = false;
    }

    let Lon1 = systemData.talents_combat.armeslongues_1.label;
    let Lon2 = systemData.talents_combat.armeslongues_2.label;
    item = this.items.find((i) => i.name == Lon1);
    if (!item) {
      systemData.talents_combat.armeslongues_1.label = "";
      systemData.talents_combat.armeslongues_1.selection = false;
    }

    item = this.items.find((i) => i.name == Lon2);
    if (!item) {
      systemData.talents_combat.armeslongues_2.label = "";
      systemData.talents_combat.armeslongues_2.selection = false;
    }

    let Lan1 = systemData.talents_combat.lancer_1.label;
    let Lan2 = systemData.talents_combat.lancer_2.label;
    item = this.items.find((i) => i.name == Lan1);
    if (!item) {
      systemData.talents_combat.lancer_1.label = "";
      systemData.talents_combat.lancer_1.selection = false;
    }

    item = this.items.find((i) => i.name == Lan2);
    if (!item) {
      systemData.talents_combat.lancer_2.label = "";
      systemData.talents_combat.lancer_2.selection = false;
    }

    //Mise en place dans l'onglet combat des attaques spéciales
    const _resetMainsnuesSlot = (slot) => {
      slot.label = "";
      slot.def = 0;
      ["av0", "av1", "av2", "av3", "av4"].forEach((av) => (slot[av] = 0));
      for (let i = 0; i <= 4; i++) {
        for (let j = 1; j <= 3; j++) {
          slot[`effet_ac_${i}_${j}`] = "";
        }
      }
    };

    const _assignItemToMainsnuesSlot = (slot, item) => {
      if (slot.label === "" || slot.label === item.name) {
        slot.label = item.name;
        slot.img = item.img || "";
        slot.def = item.system.def;
        ["av0", "av1", "av2", "av3", "av4"].forEach((av) => {
          slot[av] = item.system[av];
        });
        for (let i = 0; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            slot[`effet_ac_${i}_${j}`] = item.system[`effet_ac_${i}_${j}`];
          }
        }
      }
    };

    let itemType = "Attaque spéciale";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 3 slots mainsnues
    const mainsnuesSlots = ["mainsnues1", "mainsnues2", "mainsnues3"];
    mainsnuesSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetMainsnuesSlot(slot);
      } else {
        _assignItemToMainsnuesSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes courtes
    itemType = "Arme courte";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes courtes
    const armesCourtesSlots = ["armescourtes_1", "armescourtes_2"];
    armesCourtesSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetMainsnuesSlot(slot);
      } else {
        _assignItemToMainsnuesSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes longues
    itemType = "Arme longue";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes longues
    const armesLonguesSlots = ["armeslongues_1", "armeslongues_2"];
    armesLonguesSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetMainsnuesSlot(slot);
      } else {
        _assignItemToMainsnuesSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes de lancer
    const _resetLancerSlot = (slot) => {
      slot.label = "";
      slot.def = 0;
      slot.quantity = 0;
      ["av0", "av1", "av2", "av3", "av4"].forEach((av) => (slot[av] = 0));
      for (let i = 0; i <= 4; i++) {
        for (let j = 1; j <= 3; j++) {
          slot[`effet_ac_${i}_${j}`] = "";
        }
      }
    };

    const _assignItemToLancerSlot = (slot, item) => {
      if (slot.label === "" || slot.label === item.name) {
        slot.label = item.name;
        slot.img = item.img || "";
        slot.def = item.system.def;
        slot.quantity = item.system.quantity;
        ["av0", "av1", "av2", "av3", "av4"].forEach((av) => {
          slot[av] = item.system[av];
        });
        for (let i = 0; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            slot[`effet_ac_${i}_${j}`] = item.system[`effet_ac_${i}_${j}`];
          }
        }
      }
    };

    itemType = "Arme de lancer";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes de lancer
    const lancerSlots = ["lancer_1", "lancer_2"];
    lancerSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetLancerSlot(slot);
      } else {
        _assignItemToLancerSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes de tir
    const _resetTirSlot = (slot) => {
      slot.label = "";
      slot.def = 0;
      slot.charge = 0;
      slot.portee = "";
      ["av0", "av1", "av2", "av3", "av4"].forEach((av) => (slot[av] = 0));
      for (let i = 0; i <= 4; i++) {
        for (let j = 1; j <= 3; j++) {
          slot[`effet_ac_${i}_${j}`] = "";
        }
      }
    };

    const _assignItemToTirSlot = (slot, item) => {
      if (slot.label === "" || slot.label === item.name) {
        slot.label = item.name;
        slot.img = item.img || "";
        slot.def = item.system.def;
        slot.charge = item.system.charge;
        slot.portee = item.system.portee;
        ["av0", "av1", "av2", "av3", "av4"].forEach((av) => {
          slot[av] = item.system[av];
        });
        for (let i = 0; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            slot[`effet_ac_${i}_${j}`] = item.system[`effet_ac_${i}_${j}`];
          }
        }
      }
    };

    itemType = "Arme de tir";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes de tir
    const tirSlots = ["tir_1", "tir_2"];
    tirSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetTirSlot(slot);
      } else {
        _assignItemToTirSlot(slot, item[index]);
      }
    });

    //Mise en place des pouvoirs
    const _resetPouvoirSlots = () => {
      systemData.pouvoirs.pouvoir_psi_1.label = "";
      systemData.pouvoirs.pouvoir_psi_2.label = "";
      systemData.pouvoirs.pouvoir_transit.label = "";
    };

    const _assignPouvoir = (item, index) => {
      const isSpecialPower =
        item.name === "TRANSIT" || item.name === "TRANSFERT";

      if (isSpecialPower) {
        if (item.name === "TRANSIT") {
          systemData.pouvoirs.pouvoir_transit.label = item.name;
          systemData.pouvoirs.pouvoir_transit.num_item = index;
        } else if (item.name === "TRANSFERT") {
          systemData.pouvoirs.pouvoir_transfert.label = item.name;
          systemData.pouvoirs.pouvoir_transfert.num_item = index;
        }
      } else {
        // Pouvoirs PSI normaux
        if (
          systemData.pouvoirs.pouvoir_psi_1.label === "" ||
          systemData.pouvoirs.pouvoir_psi_1.label === item.name
        ) {
          systemData.pouvoirs.pouvoir_psi_1.label = item.name;
          systemData.pouvoirs.pouvoir_psi_1.num_item = index;
        } else if (
          systemData.pouvoirs.pouvoir_psi_2.label === "" ||
          systemData.pouvoirs.pouvoir_psi_2.label === item.name
        ) {
          systemData.pouvoirs.pouvoir_psi_2.label = item.name;
          systemData.pouvoirs.pouvoir_psi_2.num_item = index;
        }
      }
    };

    itemType = "Pouvoir";
    item = this.items.filter((i) => i.type == itemType);

    // Reset des slots de pouvoirs
    _resetPouvoirSlots();

    // Traitement de tous les pouvoirs
    item.forEach((pouvoir, index) => {
      if (pouvoir) {
        _assignPouvoir(pouvoir, index);
      }
    });

    //Calcul de la DEF
    const _calculateDefModifiers = () => {
      // Seul le slot mainsnues de base est inclus ici
      const slot = systemData.talents_combat["mainsnues"];
      return slot && slot.def_actif ? slot.def : 0;
    };

    // Bonus DEF des armes/techniques activées — affiché séparément, non ajouté aux DEF réelles
    const _calculateArmesDefBonus = () => {
      const armesSlots = [
        "mainsnues1",
        "mainsnues2",
        "mainsnues3",
        "armescourtes_1",
        "armescourtes_2",
        "armeslongues_1",
        "armeslongues_2",
        "lancer_1",
        "lancer_2",
        "tir_1",
        "tir_2",
      ];
      let bonus = 0;
      armesSlots.forEach((slotName) => {
        const slot = systemData.talents_combat[slotName];
        if (slot && slot.def_actif) bonus += slot.def;
      });
      return bonus;
    };

    systemData.bonus_armes_def = _calculateArmesDefBonus();
    let def_totale =
      systemData.def_modif.value +
      _calculateDefModifiers() +
      systemData.bonus_armes_def;
    if (systemData.caracs.vivacite.value > systemData.caracs.adresse.value) {
      if (systemData.talents.acrobaties.value !== 99) {
        systemData.def.value = Math.floor(
          (systemData.talents.acrobaties.value +
            systemData.domaines.combat.value +
            systemData.caracs.vivacite.value) /
            2,
        );
      } else {
        systemData.def.value = Math.floor(
          (systemData.domaines.combat.value +
            systemData.caracs.vivacite.value) /
            2,
        );
      }
    } else {
      if (systemData.talents.acrobaties.value !== 99) {
        systemData.def.value = Math.floor(
          (systemData.talents.acrobaties.value +
            systemData.domaines.combat.value +
            systemData.caracs.adresse.value) /
            2,
        );
      } else {
        systemData.def.value = Math.floor(
          (systemData.domaines.combat.value + systemData.caracs.adresse.value) /
            2,
        );
      }
    }

    const _applySelectedWeaponDefBonuses = () => {
      const selectionSlots = [
        "mainsnues1",
        "mainsnues3",
        "armescourtes_1",
        "armescourtes_2",
        "armeslongues_1",
        "armeslongues_2",
        "lancer_1",
        "lancer_2",
        "tir_1",
        "tir_2",
      ];

      selectionSlots.forEach((slotName) => {
        const slot = systemData.talents_combat[slotName];
        if (slot && slot.selection === true) {
          systemData.def.value += slot.def;
        }
      });
    };

    _applySelectedWeaponDefBonuses();

    systemData.protect_choc.value = systemData.def.value + def_totale;
    systemData.protect_lame.value = systemData.def.value + def_totale;
    systemData.protect_balle.value = systemData.def.value + def_totale;
    systemData.protect_feu.value = systemData.def.value + def_totale;
    systemData.protect_froid.value = systemData.def.value + def_totale;
    systemData.protect_acide.value = systemData.def.value + def_totale;
    systemData.protect_rayon.value = systemData.def.value + def_totale;

    //Mise en place des protections
    const _resetProtectionSlot = (slot) => {
      slot.label = "";
      const protectionTypes = [
        "chocs",
        "froid",
        "balle",
        "feu",
        "acide",
        "rayon",
        "lame",
      ];
      protectionTypes.forEach((type) => {
        slot[`def_${type}`] = 0;
      });
    };

    const _assignItemToProtectionSlot = (slot, item) => {
      slot.label = item.name;
      slot.itemId = item._id;
      slot.img = item.img || "";
      slot.def = item.system.def || 0;
      const protectionMapping = {
        def_chocs: "def_choc",
        def_lame: "def_lame",
        def_balle: "def_balle",
        def_feu: "def_feu",
        def_froid: "def_froid",
        def_acide: "def_acide",
        def_rayon: "def_rayon",
      };

      Object.entries(protectionMapping).forEach(([slotProp, itemProp]) => {
        slot[slotProp] = item.system.caracs[itemProp];
      });
    };

    const _applyProtectionBonus = (protectionSlot, slotName) => {
      if (!protectionSlot.label) return;
      const bonusMapping = {
        def_chocs: "protect_choc",
        def_lame: "protect_lame",
        def_balle: "protect_balle",
        def_feu: "protect_feu",
        def_froid: "protect_froid",
        def_acide: "protect_acide",
        def_rayon: "protect_rayon",
      };

      Object.entries(bonusMapping).forEach(([defProp, protectProp]) => {
        systemData[protectProp].value += protectionSlot[defProp];
      });
    };

    itemType = "Protection";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 3 slots de protection
    const protectionSlots = ["p1", "p2", "p3"];
    protectionSlots.forEach((slotName, index) => {
      const slot = systemData.protections[slotName];

      if (!item[index]) {
        _resetProtectionSlot(slot);
      } else {
        _assignItemToProtectionSlot(slot, item[index]);
      }

      _applyProtectionBonus(slot, slotName);
    });

    //Calcul de l'initiative
    if (!systemData.bonus_initiative.value) {
      systemData.bonus_initiative.value = 0;
    }
    systemData.derives.initiative.jet =
      systemData.domaines.combat.value +
      " . " +
      systemData.caracs.vivacite.value;
    let pool =
      "1d" +
      systemData.domaines.combat.value +
      "+1d" +
      systemData.caracs.vivacite.value;
    if (systemData.bonus_initiative.value !== 0) {
      pool += "+" + systemData.bonus_initiative.value;
    }
    systemData.derives.initiative.value = pool;
    systemData.derives.initiative.d1 = systemData.domaines.combat.value;
    systemData.derives.initiative.d2 = systemData.caracs.vivacite.value;

    //Calcul de l'esquive
    if (systemData.bonus_esquive.value === null) {
      systemData.bonus_esquive.value = 0;
    }
    if (
      systemData.talents.acrobaties.value >
        systemData.talents_combat.mainsnues.score &&
      systemData.talents.acrobaties.value !== 99 &&
      systemData.talents_combat.mainsnues.score !== -2
    ) {
      if (systemData.caracs.vivacite.value > systemData.caracs.adresse.value) {
        systemData.derives.esquive.jet =
          systemData.talents.acrobaties.value +
          " . " +
          systemData.caracs.vivacite.value +
          " . " +
          systemData.domaines.combat.value;
        let pool =
          "1d" +
          systemData.talents.acrobaties.value +
          "+1d" +
          systemData.caracs.vivacite.value +
          "+1d" +
          systemData.domaines.combat.value;
        if (systemData.bonus_esquive.value !== 0) {
          pool += "+" + systemData.bonus_esquive.value;
        }
        systemData.derives.esquive.value = pool;
        systemData.derives.esquive.d1 = systemData.talents.acrobaties.value;
        systemData.derives.esquive.d2 = systemData.caracs.vivacite.value;
        systemData.derives.esquive.d3 = systemData.domaines.combat.value;
      } else {
        systemData.derives.esquive.jet =
          systemData.talents.acrobaties.value +
          " . " +
          systemData.caracs.adresse.value +
          " . " +
          systemData.domaines.combat.value;
        let pool =
          "1d" +
          systemData.talents.acrobaties.value +
          "+1d" +
          systemData.caracs.adresse.value +
          "+1d" +
          systemData.domaines.combat.value;
        if (systemData.bonus_esquive.value !== 0) {
          pool += "+" + systemData.bonus_esquive.value;
        }
        systemData.derives.esquive.value = pool;
        systemData.derives.esquive.d1 = systemData.talents.acrobaties.value;
        systemData.derives.esquive.d2 = systemData.caracs.adresse.value;
        systemData.derives.esquive.d3 = systemData.domaines.combat.value;
      }
    } else {
      if (
        systemData.talents_combat.mainsnues.score !== -2 &&
        systemData.talents_combat.mainsnues.score !== 99 &&
        systemData.talents.acrobaties.value !== 99 &&
        systemData.talents_combat.mainsnues.score !== 0
      ) {
        if (
          systemData.caracs.vivacite.value > systemData.caracs.adresse.value
        ) {
          systemData.derives.esquive.jet =
            systemData.talents_combat.mainsnues.score +
            " . " +
            systemData.caracs.vivacite.value +
            " . " +
            systemData.domaines.combat.value;
          let pool =
            "1d" +
            systemData.talents_combat.mainsnues.score +
            "+1d" +
            systemData.caracs.vivacite.value +
            "+1d" +
            systemData.domaines.combat.value;
          if (systemData.bonus_esquive.value !== 0) {
            pool += "+" + systemData.bonus_esquive.value;
          }
          systemData.derives.esquive.value = pool;
          systemData.derives.esquive.d1 =
            systemData.talents_combat.mainsnues.score;
          systemData.derives.esquive.d2 = systemData.caracs.vivacite.value;
          systemData.derives.esquive.d3 = systemData.domaines.combat.value;
        } else {
          systemData.derives.esquive.jet =
            systemData.talents_combat.mainsnues.score +
            " . " +
            systemData.caracs.adresse.value +
            " . " +
            systemData.domaines.combat.value;
          let pool =
            "1d" +
            systemData.talents_combat.mainsnues.score +
            "+1d" +
            systemData.caracs.adresse.value +
            "+1d" +
            systemData.domaines.combat.value;
          if (systemData.bonus_esquive.value !== 0) {
            pool += "+" + systemData.bonus_esquive.value;
          }
          systemData.derives.esquive.value = pool;
          systemData.derives.esquive.d1 =
            systemData.talents_combat.mainsnues.score;
          systemData.derives.esquive.d2 = systemData.caracs.adresse.value;
          systemData.derives.esquive.d3 = systemData.domaines.combat.value;
        }
      } else {
        if (
          systemData.caracs.vivacite.value > systemData.caracs.adresse.value
        ) {
          systemData.derives.esquive.jet =
            systemData.caracs.vivacite.value +
            " . " +
            systemData.domaines.combat.value;
          let pool =
            "1d" +
            systemData.caracs.vivacite.value +
            "+1d" +
            systemData.domaines.combat.value;
          if (systemData.bonus_esquive.valuel !== 0) {
            pool += "+" + systemData.bonus_esquive.value;
          }
          systemData.derives.esquive.value = pool;
          systemData.derives.esquive.d1 = systemData.caracs.vivacite.value;
          systemData.derives.esquive.d2 = systemData.domaines.combat.value;
          systemData.derives.esquive.d3 = 0;
        } else {
          systemData.derives.esquive.jet =
            systemData.caracs.adresse.value +
            " . " +
            systemData.domaines.combat.value;
          let pool =
            "1d" +
            systemData.caracs.adresse.value +
            "+1d" +
            systemData.domaines.combat.value;
          if (systemData.bonus_esquive.value !== 0) {
            pool += "+" + systemData.bonus_esquive.value;
          }
          systemData.derives.esquive.value = pool;
          systemData.derives.esquive.d1 = systemData.caracs.adresse.value;
          systemData.derives.esquive.d2 = systemData.domaines.combat.value;
          systemData.derives.esquive.d3 = 0;
        }
      }
    }

    /*********************************** Onglet Attributs ******************************************************************************************** */

    if (systemData.sphere2.value !== "") {
      systemData.sphere2.present = true;
    } else {
      systemData.sphere2.present = false;
    }
  }

  _prepareNpcData(actorData) {
    if (actorData.type !== "PNJ") return;
    const systemData = actorData.system;

    /*********************************** Onglet Combat ******************************************************************************************** */
    //Initialisation de l'ensemble des armes par type
    const _validateWeaponSlots = () => {
      const weaponSlots = [
        "armescourtes_1",
        "armescourtes_2",
        "mainsnues1",
        "mainsnues2",
        "mainsnues3",
        "tir_1",
        "tir_2",
        "armeslongues_1",
        "armeslongues_2",
        "lancer_1",
        "lancer_2",
      ];

      weaponSlots.forEach((slotName) => {
        const slot = systemData.talents_combat[slotName];
        if (slot && slot.label) {
          const item = this.items.find((i) => i.name === slot.label);
          if (!item) {
            slot.label = "";
            slot.selection = false;
          }
        }
      });
    };

    _validateWeaponSlots();

    //Mise en place des pouvoirs résonants pour PNJ
    // Initialise toujours les slots en objets (compatibilité anciens acteurs qui ont encore des strings)
    if (
      typeof systemData.pouvoirs.pouvoir_psi_1 !== "object" ||
      systemData.pouvoirs.pouvoir_psi_1 === null
    ) {
      systemData.pouvoirs.pouvoir_psi_1 = {
        label: "",
        grade: 1,
        rg: 4,
        num_item: -1,
      };
    } else {
      systemData.pouvoirs.pouvoir_psi_1.label = "";
      systemData.pouvoirs.pouvoir_psi_1.num_item = -1;
    }
    if (
      typeof systemData.pouvoirs.pouvoir_psi_2 !== "object" ||
      systemData.pouvoirs.pouvoir_psi_2 === null
    ) {
      systemData.pouvoirs.pouvoir_psi_2 = {
        label: "",
        grade: 1,
        rg: 4,
        num_item: -1,
      };
    } else {
      systemData.pouvoirs.pouvoir_psi_2.label = "";
      systemData.pouvoirs.pouvoir_psi_2.num_item = -1;
    }

    const allPouvoirItems = this.items.filter((i) => i.type === "Pouvoir");
    const pouvoirItemsActifs = this.items.filter(
      (i) => i.type === "Pouvoir" && i.system.equipe === true,
    );
    let psiSlotsFilled = 0;
    pouvoirItemsActifs.forEach((pouvoir) => {
      const index = allPouvoirItems.indexOf(pouvoir);
      if (psiSlotsFilled === 0) {
        systemData.pouvoirs.pouvoir_psi_1.label = pouvoir.name;
        systemData.pouvoirs.pouvoir_psi_1.num_item = index;
        psiSlotsFilled++;
      } else if (psiSlotsFilled === 1) {
        systemData.pouvoirs.pouvoir_psi_2.label = pouvoir.name;
        systemData.pouvoirs.pouvoir_psi_2.num_item = index;
        psiSlotsFilled++;
      }
    });

    //Mise en place dans l'onglet combat des attaques spéciales
    const _resetMainsnuesSlot = (slot) => {
      slot.label = "";
      slot.def = 0;
      ["av0", "av1", "av2", "av3", "av4"].forEach((av) => (slot[av] = 0));
      for (let i = 0; i <= 4; i++) {
        for (let j = 1; j <= 3; j++) {
          slot[`effet_ac_${i}_${j}`] = "";
        }
      }
    };

    const _assignItemToMainsnuesSlot = (slot, item) => {
      if (slot.label === "" || slot.label === item.name) {
        slot.label = item.name;
        slot.img = item.img || "";
        slot.def = item.system.def;
        ["av0", "av1", "av2", "av3", "av4"].forEach((av) => {
          slot[av] = item.system[av];
        });
        for (let i = 0; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            slot[`effet_ac_${i}_${j}`] = item.system[`effet_ac_${i}_${j}`];
          }
        }
      }
    };

    let itemType = "Attaque spéciale";
    let item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 3 slots mainsnues
    const mainsnuesSlots = ["mainsnues1", "mainsnues2", "mainsnues3"];
    mainsnuesSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetMainsnuesSlot(slot);
      } else {
        _assignItemToMainsnuesSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes courtes
    itemType = "Arme courte";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes courtes
    const armesCourtesSlots = ["armescourtes_1", "armescourtes_2"];
    armesCourtesSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetMainsnuesSlot(slot);
      } else {
        _assignItemToMainsnuesSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes longues
    itemType = "Arme longue";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes longues
    const armesLonguesSlots = ["armeslongues_1", "armeslongues_2"];
    armesLonguesSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetMainsnuesSlot(slot);
      } else {
        _assignItemToMainsnuesSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes de lancer
    const _resetLancerSlot = (slot) => {
      slot.label = "";
      slot.def = 0;
      slot.quantity = 0;
      ["av0", "av1", "av2", "av3", "av4"].forEach((av) => (slot[av] = 0));
      for (let i = 0; i <= 4; i++) {
        for (let j = 1; j <= 3; j++) {
          slot[`effet_ac_${i}_${j}`] = "";
        }
      }
    };

    const _assignItemToLancerSlot = (slot, item) => {
      if (slot.label === "" || slot.label === item.name) {
        slot.label = item.name;
        slot.img = item.img || "";
        slot.def = item.system.def;
        slot.quantity = item.system.quantity;
        ["av0", "av1", "av2", "av3", "av4"].forEach((av) => {
          slot[av] = item.system[av];
        });
        for (let i = 0; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            slot[`effet_ac_${i}_${j}`] = item.system[`effet_ac_${i}_${j}`];
          }
        }
      }
    };

    itemType = "Arme de lancer";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes de lancer
    const lancerSlots = ["lancer_1", "lancer_2"];
    lancerSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetLancerSlot(slot);
      } else {
        _assignItemToLancerSlot(slot, item[index]);
      }
    });

    //Mise en place dans l'onglet combat des armes de tir
    const _resetTirSlot = (slot) => {
      slot.label = "";
      slot.def = 0;
      slot.charge = 0;
      slot.portee = "";
      ["av0", "av1", "av2", "av3", "av4"].forEach((av) => (slot[av] = 0));
      for (let i = 0; i <= 4; i++) {
        for (let j = 1; j <= 3; j++) {
          slot[`effet_ac_${i}_${j}`] = "";
        }
      }
    };

    const _assignItemToTirSlot = (slot, item) => {
      if (slot.label === "" || slot.label === item.name) {
        slot.label = item.name;
        slot.img = item.img || "";
        slot.def = item.system.def;
        slot.charge = item.system.charge;
        slot.portee = item.system.portee;
        ["av0", "av1", "av2", "av3", "av4"].forEach((av) => {
          slot[av] = item.system[av];
        });
        for (let i = 0; i <= 4; i++) {
          for (let j = 1; j <= 3; j++) {
            slot[`effet_ac_${i}_${j}`] = item.system[`effet_ac_${i}_${j}`];
          }
        }
      }
    };

    itemType = "Arme de tir";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 2 slots armes de tir
    const tirSlots = ["tir_1", "tir_2"];
    tirSlots.forEach((slotName, index) => {
      const slot = systemData.talents_combat[slotName];

      if (!item[index]) {
        _resetTirSlot(slot);
      } else {
        _assignItemToTirSlot(slot, item[index]);
      }
    });

    //Calcul de la DEF
    const _calculateDefModifiers = () => {
      // Seul le slot mainsnues de base est inclus ici
      const slot = systemData.talents_combat["mainsnues"];
      return slot && slot.def_actif ? slot.def : 0;
    };

    // Bonus DEF des armes/techniques activées — affiché séparément, non ajouté aux DEF réelles
    const _calculateArmesDefBonus = () => {
      const armesSlots = [
        "mainsnues1",
        "mainsnues2",
        "mainsnues3",
        "armescourtes_1",
        "armescourtes_2",
        "armeslongues_1",
        "armeslongues_2",
        "lancer_1",
        "lancer_2",
        "tir_1",
        "tir_2",
      ];
      let bonus = 0;
      armesSlots.forEach((slotName) => {
        const slot = systemData.talents_combat[slotName];
        if (slot && slot.def_actif) bonus += slot.def;
      });
      return bonus;
    };

    systemData.bonus_armes_def = _calculateArmesDefBonus();
    let def_totale =
      systemData.def_modif.value +
      _calculateDefModifiers() +
      systemData.bonus_armes_def;

    if (systemData.reduit === 0 && !systemData.def_manuel) {
      if (systemData.caracs.vivacite.value > systemData.caracs.adresse.value) {
        if (systemData.talents.acrobaties.value !== 99) {
          systemData.def.value = Math.floor(
            (systemData.talents.acrobaties.value +
              systemData.domaines.combat.value +
              systemData.caracs.vivacite.value) /
              2,
          );
        } else {
          systemData.def.value = Math.floor(
            (systemData.domaines.combat.value +
              systemData.caracs.vivacite.value) /
              2,
          );
        }
      } else {
        if (systemData.talents.acrobaties.value !== 99) {
          systemData.def.value = Math.floor(
            (systemData.talents.acrobaties.value +
              systemData.domaines.combat.value +
              systemData.caracs.adresse.value) /
              2,
          );
        } else {
          systemData.def.value = Math.floor(
            (systemData.domaines.combat.value +
              systemData.caracs.adresse.value) /
              2,
          );
        }
      }
    }

    const typesProtection = [
      "choc",
      "lame",
      "balle",
      "feu",
      "froid",
      "acide",
      "rayon",
    ];

    typesProtection.forEach((type) => {
      systemData[`protect_${type}`].value = systemData.def.value + def_totale;
    });

    //Mise en place des protections
    const _resetProtectionSlot = (slot) => {
      slot.label = "";
      const protectionTypes = [
        "chocs",
        "froid",
        "balle",
        "feu",
        "acide",
        "rayon",
        "lame",
      ];
      protectionTypes.forEach((type) => {
        slot[`def_${type}`] = 0;
      });
    };

    const _assignItemToProtectionSlot = (slot, item) => {
      slot.label = item.name;
      slot.itemId = item._id;
      slot.img = item.img || "";
      slot.def = item.system.def || 0;
      const protectionMapping = {
        def_chocs: "def_choc",
        def_lame: "def_lame",
        def_balle: "def_balle",
        def_feu: "def_feu",
        def_froid: "def_froid",
        def_acide: "def_acide",
        def_rayon: "def_rayon",
      };

      Object.entries(protectionMapping).forEach(([slotProp, itemProp]) => {
        slot[slotProp] = item.system.caracs[itemProp];
      });
    };

    const _applyProtectionBonus = (protectionSlot, slotName) => {
      if (!protectionSlot.label) return;
      const bonusMapping = {
        def_chocs: "protect_choc",
        def_lame: "protect_lame",
        def_balle: "protect_balle",
        def_feu: "protect_feu",
        def_froid: "protect_froid",
        def_acide: "protect_acide",
        def_rayon: "protect_rayon",
      };

      Object.entries(bonusMapping).forEach(([defProp, protectProp]) => {
        systemData[protectProp].value += protectionSlot[defProp];
      });
    };

    itemType = "Protection";
    item = this.items.filter(
      (i) => i.type == itemType && i.system.equipe === true,
    );

    // Traitement des 3 slots de protection
    const protectionSlots = ["p1", "p2", "p3"];
    protectionSlots.forEach((slotName, index) => {
      const slot = systemData.protections[slotName];

      if (!item[index]) {
        _resetProtectionSlot(slot);
      } else {
        _assignItemToProtectionSlot(slot, item[index]);
      }

      _applyProtectionBonus(slot, slotName);
    });

    const _applySelectedWeaponDefBonuses = () => {
      const selectionSlots = [
        "armescourtes_1",
        "armescourtes_2",
        "armeslongues_1",
        "armeslongues_2",
        "lancer_1",
        "lancer_2",
        "tir_1",
        "tir_2",
      ];

      selectionSlots.forEach((slotName) => {
        const slot = systemData.talents_combat[slotName];
        if (slot && slot.selection === true) {
          systemData.def.value += slot.def;
        }
      });
    };

    _applySelectedWeaponDefBonuses();

    //Calcul de l'initiative
    const _initializeInitiativeDefaults = () => {
      const defaults = {
        d1: 0,
        d2: 0,
        "bonus_initiative.value": 0,
      };

      Object.entries(defaults).forEach(([path, value]) => {
        const target = path.includes(".")
          ? systemData[path.split(".")[0]][path.split(".")[1]]
          : systemData.derives.initiative[path];
        if (!target) {
          if (path.includes(".")) {
            systemData[path.split(".")[0]][path.split(".")[1]] = value;
          } else {
            systemData.derives.initiative[path] = value;
          }
        }
      });
    };

    const _calculateInitiative = () => {
      if (systemData.reduit === 0 && !systemData.initiative_manuel) {
        const combat = systemData.domaines.combat.value;
        const vivacite = systemData.caracs.vivacite.value;

        systemData.derives.initiative.jet = `${combat} . ${vivacite}`;
        systemData.derives.initiative.value = `1d${combat}+1d${vivacite}+${systemData.bonus_initiative.value}`;
        systemData.derives.initiative.d1 = combat;
        systemData.derives.initiative.d2 = vivacite;
      } else {
        const d1 = systemData.derives.initiative.d1;
        const d2 = systemData.derives.initiative.d2;

        systemData.derives.initiative.jet = `${d1} . ${d2}`;
        systemData.derives.initiative.value = `1d${d1}+1d${d2}+${systemData.bonus_initiative.value}`;
      }
    };

    _initializeInitiativeDefaults();
    _calculateInitiative();

    //Calcul de l'esquive
    const _initializeEsquiveDefaults = () => {
      const esquiveFields = ["d1", "d2", "d3"];

      systemData.bonus_esquive.value = systemData.bonus_esquive.value || 0;

      esquiveFields.forEach((field) => {
        if (!systemData.derives.esquive[field]) {
          systemData.derives.esquive[field] = 0;
        }
        if (!systemData.derives.esquive[field].value) {
          systemData.derives.esquive[field].value = 0;
        }
      });
    };

    const _buildEsquiveFormula = (d1, d2, d3 = null) => {
      const jetValues = d3 !== null ? [d1, d2, d3] : [d1, d2];
      const bonus = systemData.bonus_esquive.value;

      return {
        jet: jetValues.join(" . "),
        value: jetValues.map((val) => `1d${val}`).join("+") + `+${bonus}`,
      };
    };

    const _calculateEsquive = () => {
      if (systemData.reduit === 0 && !systemData.esquive_manuel) {
        const acrobaties = systemData.talents.acrobaties.value;
        const mainsnues = systemData.talents_combat.mainsnues.score;
        const vivacite = systemData.caracs.vivacite.value;
        const adresse = systemData.caracs.adresse.value;
        const combat = systemData.domaines.combat.value;

        let formula;

        // Logique de priorité simplifiée
        if (acrobaties > mainsnues && acrobaties !== 99 && mainsnues !== -2) {
          // Utiliser acrobaties
          const stat = vivacite > adresse ? vivacite : adresse;
          formula = _buildEsquiveFormula(acrobaties, stat, combat);
        } else if (
          mainsnues !== -2 &&
          mainsnues !== 99 &&
          acrobaties !== 99 &&
          mainsnues !== 0
        ) {
          // Utiliser mainsnues
          const stat = vivacite > adresse ? vivacite : adresse;
          formula = _buildEsquiveFormula(mainsnues, stat, combat);
        } else {
          // Utiliser seulement les caractéristiques
          const stat = vivacite > adresse ? vivacite : adresse;
          formula = _buildEsquiveFormula(stat, combat);
        }

        systemData.derives.esquive.jet = formula.jet;
        systemData.derives.esquive.value = formula.value;
      } else {
        // Mode réduit - utiliser les valeurs d1, d2, d3 stockées
        const d1 = systemData.derives.esquive.d1.value;
        const d2 = systemData.derives.esquive.d2.value;
        const d3 = systemData.derives.esquive.d3.value;

        const formula = _buildEsquiveFormula(d1, d2, d3);
        systemData.derives.esquive.jet = formula.jet;
        systemData.derives.esquive.value = formula.value;
      }
    };

    _initializeEsquiveDefaults();
    _calculateEsquive();
  }

  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  _getCharacterRollData(data) {
    if (this.type !== "PJ") return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== "npc") return;

    // Process additional NPC data here.
  }
}
