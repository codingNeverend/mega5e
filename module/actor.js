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
    let itemType = "Attaque spéciale";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.mainsnues1.label = "";
      systemData.talents_combat.mainsnues1.def = 0;
      systemData.talents_combat.mainsnues1.av0 = 0;
      systemData.talents_combat.mainsnues1.av1 = 0;
      systemData.talents_combat.mainsnues1.av2 = 0;
      systemData.talents_combat.mainsnues1.av3 = 0;
      systemData.talents_combat.mainsnues1.av4 = 0;
      systemData.talents_combat.mainsnues1.effet_ac_0_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_0_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_0_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_1_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_1_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_1_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_2_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_2_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_2_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_3_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_3_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_3_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_4_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_4_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.mainsnues2.label = "";
      systemData.talents_combat.mainsnues2.def = 0;
      systemData.talents_combat.mainsnues2.av0 = 0;
      systemData.talents_combat.mainsnues2.av1 = 0;
      systemData.talents_combat.mainsnues2.av2 = 0;
      systemData.talents_combat.mainsnues2.av3 = 0;
      systemData.talents_combat.mainsnues2.av4 = 0;
      systemData.talents_combat.mainsnues2.effet_ac_0_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_0_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_0_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_1_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_1_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_1_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_2_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_2_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_2_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_3_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_3_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_3_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_4_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_4_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_4_3 = "";
    }
    if (!item[2]) {
      systemData.talents_combat.mainsnues3.label = "";
      systemData.talents_combat.mainsnues3.def = 0;
      systemData.talents_combat.mainsnues3.av0 = 0;
      systemData.talents_combat.mainsnues3.av1 = 0;
      systemData.talents_combat.mainsnues3.av2 = 0;
      systemData.talents_combat.mainsnues3.av3 = 0;
      systemData.talents_combat.mainsnues3.av4 = 0;
      systemData.talents_combat.mainsnues3.effet_ac_0_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_0_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_0_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_1_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_1_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_1_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_2_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_2_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_2_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_3_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_3_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_3_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_4_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_4_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.mainsnues1.label === "" ||
        systemData.talents_combat.mainsnues1.label === item[0].name
      ) {
        systemData.talents_combat.mainsnues1.label = item[0].name;
        systemData.talents_combat.mainsnues1.def = item[0].system.def;
        systemData.talents_combat.mainsnues1.av0 = item[0].system.av0;
        systemData.talents_combat.mainsnues1.av1 = item[0].system.av1;
        systemData.talents_combat.mainsnues1.av2 = item[0].system.av2;
        systemData.talents_combat.mainsnues1.av3 = item[0].system.av3;
        systemData.talents_combat.mainsnues1.av4 = item[0].system.av4;
        systemData.talents_combat.mainsnues1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.mainsnues1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.mainsnues1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.mainsnues1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.mainsnues1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.mainsnues1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.mainsnues1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.mainsnues1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.mainsnues1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.mainsnues1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.mainsnues1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.mainsnues1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.mainsnues1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.mainsnues1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.mainsnues1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.mainsnues2.label === "" ||
        systemData.talents_combat.mainsnues2.label === item[1].name
      ) {
        systemData.talents_combat.mainsnues2.label = item[1].name;
        systemData.talents_combat.mainsnues2.def = item[1].system.def;
        systemData.talents_combat.mainsnues2.av0 = item[1].system.av0;
        systemData.talents_combat.mainsnues2.av1 = item[1].system.av1;
        systemData.talents_combat.mainsnues2.av2 = item[1].system.av2;
        systemData.talents_combat.mainsnues2.av3 = item[1].system.av3;
        systemData.talents_combat.mainsnues2.av4 = item[1].system.av4;
        systemData.talents_combat.mainsnues2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.mainsnues2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.mainsnues2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.mainsnues2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.mainsnues2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.mainsnues2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.mainsnues2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.mainsnues2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.mainsnues2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.mainsnues2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.mainsnues2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.mainsnues2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.mainsnues2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.mainsnues2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.mainsnues2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }
    if (item[2]) {
      if (
        systemData.talents_combat.mainsnues3.label === "" ||
        systemData.talents_combat.mainsnues3.label === item[2].name
      ) {
        systemData.talents_combat.mainsnues3.label = item[2].name;
        systemData.talents_combat.mainsnues3.def = item[2].system.def;
        systemData.talents_combat.mainsnues3.av0 = item[2].system.av0;
        systemData.talents_combat.mainsnues3.av1 = item[2].system.av1;
        systemData.talents_combat.mainsnues3.av2 = item[2].system.av2;
        systemData.talents_combat.mainsnues3.av3 = item[2].system.av3;
        systemData.talents_combat.mainsnues3.av4 = item[2].system.av4;
        systemData.talents_combat.mainsnues3.effet_ac_0_1 =
          item[2].system.effet_ac_0_1;
        systemData.talents_combat.mainsnues3.effet_ac_0_2 =
          item[2].system.effet_ac_0_2;
        systemData.talents_combat.mainsnues3.effet_ac_0_3 =
          item[2].system.effet_ac_0_3;
        systemData.talents_combat.mainsnues3.effet_ac_1_1 =
          item[2].system.effet_ac_1_1;
        systemData.talents_combat.mainsnues3.effet_ac_1_2 =
          item[2].system.effet_ac_1_2;
        systemData.talents_combat.mainsnues3.effet_ac_1_3 =
          item[2].system.effet_ac_1_3;
        systemData.talents_combat.mainsnues3.effet_ac_2_1 =
          item[2].system.effet_ac_2_1;
        systemData.talents_combat.mainsnues3.effet_ac_2_2 =
          item[2].system.effet_ac_2_2;
        systemData.talents_combat.mainsnues3.effet_ac_2_3 =
          item[2].system.effet_ac_2_3;
        systemData.talents_combat.mainsnues3.effet_ac_3_1 =
          item[2].system.effet_ac_3_1;
        systemData.talents_combat.mainsnues3.effet_ac_3_2 =
          item[2].system.effet_ac_3_2;
        systemData.talents_combat.mainsnues3.effet_ac_3_3 =
          item[2].system.effet_ac_3_3;
        systemData.talents_combat.mainsnues3.effet_ac_4_1 =
          item[2].system.effet_ac_4_1;
        systemData.talents_combat.mainsnues3.effet_ac_4_2 =
          item[2].system.effet_ac_4_2;
        systemData.talents_combat.mainsnues3.effet_ac_4_3 =
          item[2].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes courtes
    itemType = "Arme courte";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.armescourtes_1.label = "";
      systemData.talents_combat.armescourtes_1.def = 0;
      systemData.talents_combat.armescourtes_1.av0 = 0;
      systemData.talents_combat.armescourtes_1.av1 = 0;
      systemData.talents_combat.armescourtes_1.av2 = 0;
      systemData.talents_combat.armescourtes_1.av3 = 0;
      systemData.talents_combat.armescourtes_1.av4 = 0;
      systemData.talents_combat.armescourtes_1.effet_ac_0_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_0_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_0_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_1_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_1_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_1_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_2_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_2_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_2_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_3_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_3_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_3_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_4_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_4_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.armescourtes_2.label = "";
      systemData.talents_combat.armescourtes_2.def = 0;
      systemData.talents_combat.armescourtes_2.av0 = 0;
      systemData.talents_combat.armescourtes_2.av1 = 0;
      systemData.talents_combat.armescourtes_2.av2 = 0;
      systemData.talents_combat.armescourtes_2.av3 = 0;
      systemData.talents_combat.armescourtes_2.av4 = 0;
      systemData.talents_combat.armescourtes_2.effet_ac_0_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_0_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_0_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_1_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_1_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_1_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_2_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_2_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_2_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_3_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_3_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_3_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_4_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_4_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.armescourtes_1.label === "" ||
        systemData.talents_combat.armescourtes_1.label === item[0].name
      ) {
        systemData.talents_combat.armescourtes_1.label = item[0].name;
        systemData.talents_combat.armescourtes_1.def = item[0].system.def;
        systemData.talents_combat.armescourtes_1.av0 = item[0].system.av0;
        systemData.talents_combat.armescourtes_1.av1 = item[0].system.av1;
        systemData.talents_combat.armescourtes_1.av2 = item[0].system.av2;
        systemData.talents_combat.armescourtes_1.av3 = item[0].system.av3;
        systemData.talents_combat.armescourtes_1.av4 = item[0].system.av4;
        systemData.talents_combat.armescourtes_1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.armescourtes_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.armescourtes_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.armescourtes_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.armescourtes_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.armescourtes_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.armescourtes_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.armescourtes_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.armescourtes_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.armescourtes_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.armescourtes_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.armescourtes_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.armescourtes_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.armescourtes_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.armescourtes_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.armescourtes_2.label === "" ||
        systemData.talents_combat.armescourtes_2.label === item[1].name
      ) {
        systemData.talents_combat.armescourtes_2.label = item[1].name;
        systemData.talents_combat.armescourtes_2.def = item[1].system.def;
        systemData.talents_combat.armescourtes_2.av0 = item[1].system.av0;
        systemData.talents_combat.armescourtes_2.av1 = item[1].system.av1;
        systemData.talents_combat.armescourtes_2.av2 = item[1].system.av2;
        systemData.talents_combat.armescourtes_2.av3 = item[1].system.av3;
        systemData.talents_combat.armescourtes_2.av4 = item[1].system.av4;
        systemData.talents_combat.armescourtes_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.armescourtes_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.armescourtes_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.armescourtes_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.armescourtes_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.armescourtes_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.armescourtes_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.armescourtes_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.armescourtes_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.armescourtes_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.armescourtes_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.armescourtes_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.armescourtes_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.armescourtes_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.armescourtes_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes longues
    itemType = "Arme longue";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.armeslongues_1.label = "";
      systemData.talents_combat.armeslongues_1.def = 0;
      systemData.talents_combat.armeslongues_1.av0 = 0;
      systemData.talents_combat.armeslongues_1.av1 = 0;
      systemData.talents_combat.armeslongues_1.av2 = 0;
      systemData.talents_combat.armeslongues_1.av3 = 0;
      systemData.talents_combat.armeslongues_1.av4 = 0;
      systemData.talents_combat.armeslongues_1.effet_ac_0_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_0_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_0_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_1_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_1_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_1_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_2_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_2_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_2_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_3_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_3_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_3_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_4_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_4_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.armeslongues_2.label = "";
      systemData.talents_combat.armeslongues_2.def = 0;
      systemData.talents_combat.armeslongues_2.av0 = 0;
      systemData.talents_combat.armeslongues_2.av1 = 0;
      systemData.talents_combat.armeslongues_2.av2 = 0;
      systemData.talents_combat.armeslongues_2.av3 = 0;
      systemData.talents_combat.armeslongues_2.av4 = 0;
      systemData.talents_combat.armeslongues_2.effet_ac_0_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_0_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_0_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_1_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_1_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_1_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_2_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_2_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_2_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_3_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_3_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_3_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_4_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_4_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.armeslongues_1.label === "" ||
        systemData.talents_combat.armeslongues_1.label === item[0].name
      ) {
        systemData.talents_combat.armeslongues_1.label = item[0].name;
        systemData.talents_combat.armeslongues_1.def = item[0].system.def;
        systemData.talents_combat.armeslongues_1.av0 = item[0].system.av0;
        systemData.talents_combat.armeslongues_1.av1 = item[0].system.av1;
        systemData.talents_combat.armeslongues_1.av2 = item[0].system.av2;
        systemData.talents_combat.armeslongues_1.av3 = item[0].system.av3;
        systemData.talents_combat.armeslongues_1.av4 = item[0].system.av4;
        systemData.talents_combat.armeslongues_1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.armeslongues_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.armeslongues_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.armeslongues_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.armeslongues_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.armeslongues_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.armeslongues_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.armeslongues_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.armeslongues_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.armeslongues_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.armeslongues_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.armeslongues_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.armeslongues_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.armeslongues_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.armeslongues_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.armeslongues_2.label === "" ||
        systemData.talents_combat.armeslongues_2.label === item[1].name
      ) {
        systemData.talents_combat.armeslongues_2.label = item[1].name;
        systemData.talents_combat.armeslongues_2.def = item[1].system.def;
        systemData.talents_combat.armeslongues_2.av0 = item[1].system.av0;
        systemData.talents_combat.armeslongues_2.av1 = item[1].system.av1;
        systemData.talents_combat.armeslongues_2.av2 = item[1].system.av2;
        systemData.talents_combat.armeslongues_2.av3 = item[1].system.av3;
        systemData.talents_combat.armeslongues_2.av4 = item[1].system.av4;
        systemData.talents_combat.armeslongues_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.armeslongues_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.armeslongues_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.armeslongues_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.armeslongues_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.armeslongues_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.armeslongues_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.armeslongues_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.armeslongues_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.armeslongues_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.armeslongues_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.armeslongues_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.armeslongues_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.armeslongues_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.armeslongues_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes de lancer
    itemType = "Arme de lancer";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.lancer_1.label = "";
      systemData.talents_combat.lancer_1.def = 0;
      systemData.talents_combat.lancer_1.av0 = 0;
      systemData.talents_combat.lancer_1.av1 = 0;
      systemData.talents_combat.lancer_1.av2 = 0;
      systemData.talents_combat.lancer_1.av3 = 0;
      systemData.talents_combat.lancer_1.av4 = 0;
      systemData.talents_combat.lancer_1.effet_ac_0_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_0_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_0_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_1_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_1_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_1_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_2_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_2_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_2_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_3_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_3_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_3_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_4_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_4_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.lancer_2.label = "";
      systemData.talents_combat.lancer_2.def = 0;
      systemData.talents_combat.lancer_2.av0 = 0;
      systemData.talents_combat.lancer_2.av1 = 0;
      systemData.talents_combat.lancer_2.av2 = 0;
      systemData.talents_combat.lancer_2.av3 = 0;
      systemData.talents_combat.lancer_2.av4 = 0;
      systemData.talents_combat.lancer_2.effet_ac_0_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_0_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_0_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_1_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_1_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_1_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_2_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_2_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_2_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_3_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_3_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_3_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_4_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_4_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.lancer_1.label === "" ||
        systemData.talents_combat.lancer_1.label === item[0].name
      ) {
        systemData.talents_combat.lancer_1.label = item[0].name;
        systemData.talents_combat.lancer_1.def = item[0].system.def;
        systemData.talents_combat.lancer_1.av0 = item[0].system.av0;
        systemData.talents_combat.lancer_1.av1 = item[0].system.av1;
        systemData.talents_combat.lancer_1.av2 = item[0].system.av2;
        systemData.talents_combat.lancer_1.av3 = item[0].system.av3;
        systemData.talents_combat.lancer_1.av4 = item[0].system.av4;
        // if (item[0].system.effet_ac_0_1) {systemData.talents_combat.lancer_1.effet_ac_0_1=item[0].system.effet_ac_0_1;}
        // else {systemData.talents_combat.lancer_1.effet_ac_0_1="d"}
        systemData.talents_combat.lancer_1.quantity = item[0].system.quantity;
        systemData.talents_combat.lancer_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.lancer_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.lancer_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.lancer_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.lancer_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.lancer_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.lancer_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.lancer_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.lancer_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.lancer_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.lancer_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.lancer_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.lancer_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.lancer_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.lancer_2.label === "" ||
        systemData.talents_combat.lancer_2.label === item[1].name
      ) {
        systemData.talents_combat.lancer_2.label = item[1].name;
        systemData.talents_combat.lancer_2.def = item[1].system.def;
        systemData.talents_combat.lancer_2.av0 = item[1].system.av0;
        systemData.talents_combat.lancer_2.av1 = item[1].system.av1;
        systemData.talents_combat.lancer_2.av2 = item[1].system.av2;
        systemData.talents_combat.lancer_2.av3 = item[1].system.av3;
        systemData.talents_combat.lancer_2.av4 = item[1].system.av4;
        systemData.talents_combat.lancer_2.quantity = item[1].system.quantity;
        systemData.talents_combat.lancer_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.lancer_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.lancer_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.lancer_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.lancer_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.lancer_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.lancer_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.lancer_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.lancer_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.lancer_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.lancer_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.lancer_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.lancer_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.lancer_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.lancer_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes de tir
    itemType = "Arme de tir";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[0]) {
      systemData.talents_combat.tir_1.label = "";
      systemData.talents_combat.tir_1.def = 0;
      systemData.talents_combat.tir_1.av0 = 0;
      systemData.talents_combat.tir_1.av1 = 0;
      systemData.talents_combat.tir_1.av2 = 0;
      systemData.talents_combat.tir_1.av3 = 0;
      systemData.talents_combat.tir_1.av4 = 0;
      systemData.talents_combat.tir_1.effet_ac_0_1 = "";
      systemData.talents_combat.tir_1.effet_ac_0_2 = "";
      systemData.talents_combat.tir_1.effet_ac_0_3 = "";
      systemData.talents_combat.tir_1.effet_ac_1_1 = "";
      systemData.talents_combat.tir_1.effet_ac_1_2 = "";
      systemData.talents_combat.tir_1.effet_ac_1_3 = "";
      systemData.talents_combat.tir_1.effet_ac_2_1 = "";
      systemData.talents_combat.tir_1.effet_ac_2_2 = "";
      systemData.talents_combat.tir_1.effet_ac_2_3 = "";
      systemData.talents_combat.tir_1.effet_ac_3_1 = "";
      systemData.talents_combat.tir_1.effet_ac_3_2 = "";
      systemData.talents_combat.tir_1.effet_ac_3_3 = "";
      systemData.talents_combat.tir_1.effet_ac_4_1 = "";
      systemData.talents_combat.tir_1.effet_ac_4_2 = "";
      systemData.talents_combat.tir_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.tir_2.label = "";
      systemData.talents_combat.tir_2.def = 0;
      systemData.talents_combat.tir_2.av0 = 0;
      systemData.talents_combat.tir_2.av1 = 0;
      systemData.talents_combat.tir_2.av2 = 0;
      systemData.talents_combat.tir_2.av3 = 0;
      systemData.talents_combat.tir_2.av4 = 0;
      systemData.talents_combat.tir_2.effet_ac_0_1 = "";
      systemData.talents_combat.tir_2.effet_ac_0_2 = "";
      systemData.talents_combat.tir_2.effet_ac_0_3 = "";
      systemData.talents_combat.tir_2.effet_ac_1_1 = "";
      systemData.talents_combat.tir_2.effet_ac_1_2 = "";
      systemData.talents_combat.tir_2.effet_ac_1_3 = "";
      systemData.talents_combat.tir_2.effet_ac_2_1 = "";
      systemData.talents_combat.tir_2.effet_ac_2_2 = "";
      systemData.talents_combat.tir_2.effet_ac_2_3 = "";
      systemData.talents_combat.tir_2.effet_ac_3_1 = "";
      systemData.talents_combat.tir_2.effet_ac_3_2 = "";
      systemData.talents_combat.tir_2.effet_ac_3_3 = "";
      systemData.talents_combat.tir_2.effet_ac_4_1 = "";
      systemData.talents_combat.tir_2.effet_ac_4_2 = "";
      systemData.talents_combat.tir_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.tir_1.label === "" ||
        systemData.talents_combat.tir_1.label === item[0].name
      ) {
        systemData.talents_combat.tir_1.label = item[0].name;
        systemData.talents_combat.tir_1.def = item[0].system.def;
        systemData.talents_combat.tir_1.av0 = item[0].system.av0;
        systemData.talents_combat.tir_1.av1 = item[0].system.av1;
        systemData.talents_combat.tir_1.av2 = item[0].system.av2;
        systemData.talents_combat.tir_1.av3 = item[0].system.av3;
        systemData.talents_combat.tir_1.av4 = item[0].system.av4;
        systemData.talents_combat.tir_1.charge = item[0].system.charge;
        systemData.talents_combat.tir_1.portee = item[0].system.portee;
        systemData.talents_combat.tir_1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.tir_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.tir_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.tir_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.tir_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.tir_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.tir_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.tir_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.tir_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.tir_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.tir_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.tir_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.tir_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.tir_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.tir_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.tir_2.label === "" ||
        systemData.talents_combat.tir_2.label === item[1].name
      ) {
        systemData.talents_combat.tir_2.label = item[1].name;
        systemData.talents_combat.tir_2.def = item[1].system.def;
        systemData.talents_combat.tir_2.av0 = item[1].system.av0;
        systemData.talents_combat.tir_2.av1 = item[1].system.av1;
        systemData.talents_combat.tir_2.av2 = item[1].system.av2;
        systemData.talents_combat.tir_2.av3 = item[1].system.av3;
        systemData.talents_combat.tir_2.av4 = item[1].system.av4;
        systemData.talents_combat.tir_2.charge = item[1].system.charge;
        systemData.talents_combat.tir_2.portee = item[1].system.portee;
        systemData.talents_combat.tir_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.tir_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.tir_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.tir_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.tir_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.tir_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.tir_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.tir_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.tir_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.tir_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.tir_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.tir_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.tir_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.tir_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.tir_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place des pouvoirs
    itemType = "Pouvoir";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.pouvoirs.pouvoir_psi_1.label = "";
    }
    if (!item[1]) {
      systemData.pouvoirs.pouvoir_psi_2.label = "";
    }
    systemData.pouvoirs.pouvoir_transit.label = "";
    if (item[0]) {
      if (item[0].name !== "TRANSIT" && item[0].name !== "TRANSFERT") {
        if (
          systemData.pouvoirs.pouvoir_psi_1.label === "" ||
          systemData.pouvoirs.pouvoir_psi_1.label == item[0].name
        ) {
          systemData.pouvoirs.pouvoir_psi_1.label = item[0].name;
          systemData.pouvoirs.pouvoir_psi_1.num_item = 0;
        } else {
          if (
            systemData.pouvoirs.pouvoir_psi_2.label === "" ||
            systemData.pouvoirs.pouvoir_psi_2.label == item[0].name
          ) {
            systemData.pouvoirs.pouvoir_psi_2.label = item[0].name;
            systemData.pouvoirs.pouvoir_psi_2.num_item = 0;
          }
        }
      } else {
        if (item[0].name == "TRANSIT") {
          systemData.pouvoirs.pouvoir_transit.label = item[0].name;
          systemData.pouvoirs.pouvoir_transit.num_item = 0;
        }
        if (item[0].name == "TRANSFERT") {
          systemData.pouvoirs.pouvoir_transfert.label = item[0].name;
          systemData.pouvoirs.pouvoir_transfert.num_item = 0;
        }
      }
      if (item[1]) {
        if (item[1].name !== "TRANSIT" && item[1].name !== "TRANSFERT") {
          if (
            systemData.pouvoirs.pouvoir_psi_1.label === "" ||
            systemData.pouvoirs.pouvoir_psi_1.label == item[1].name
          ) {
            systemData.pouvoirs.pouvoir_psi_1.label = item[1].name;
            systemData.pouvoirs.pouvoir_psi_1.num_item = 1;
          } else {
            if (
              systemData.pouvoirs.pouvoir_psi_2.label === "" ||
              systemData.pouvoirs.pouvoir_psi_2.label == item[1].name
            ) {
              systemData.pouvoirs.pouvoir_psi_2.label = item[1].name;
              systemData.pouvoirs.pouvoir_psi_2.num_item = 1;
            }
          }
        } else {
          if (item[1].name == "TRANSIT") {
            systemData.pouvoirs.pouvoir_transit.label = item[1].name;
            systemData.pouvoirs.pouvoir_transit.num_item = 1;
          }
          if (item[1].name == "TRANSFERT") {
            systemData.pouvoirs.pouvoir_transfert.label = item[1].name;
            systemData.pouvoirs.pouvoir_transfert.num_item = 1;
          }
        }
      }
      if (item[2]) {
        if (item[2].name !== "TRANSIT" && item[2].name !== "TRANSFERT") {
          if (
            systemData.pouvoirs.pouvoir_psi_1.label === "" ||
            systemData.pouvoirs.pouvoir_psi_1.label == item[2].name
          ) {
            systemData.pouvoirs.pouvoir_psi_1.label = item[2].name;
            systemData.pouvoirs.pouvoir_psi_1.num_item = 2;
          } else {
            if (
              systemData.pouvoirs.pouvoir_psi_2.label === "" ||
              systemData.pouvoirs.pouvoir_psi_2.label == item[2].name
            ) {
              systemData.pouvoirs.pouvoir_psi_2.label = item[2].name;
              systemData.pouvoirs.pouvoir_psi_2.num_item = 2;
            }
          }
        } else {
          if (item[2].name == "TRANSIT") {
            systemData.pouvoirs.pouvoir_transit.label = item[2].name;
            systemData.pouvoirs.pouvoir_transit.num_item = 2;
          }
          if (item[2].name == "TRANSFERT") {
            systemData.pouvoirs.pouvoir_transfert.label = item[2].name;
            systemData.pouvoirs.pouvoir_transfert.num_item = 2;
          }
        }
      }

      if (item[3]) {
        if (item[3].name !== "TRANSIT" && item[3].name !== "TRANSFERT") {
          if (
            systemData.pouvoirs.pouvoir_psi_1.label === "" ||
            systemData.pouvoirs.pouvoir_psi_1.label == item[3].name
          ) {
            systemData.pouvoirs.pouvoir_psi_1.label = item[3].name;
            systemData.pouvoirs.pouvoir_psi_1.num_item = 3;
          } else {
            if (
              systemData.pouvoirs.pouvoir_psi_2.label === "" ||
              systemData.pouvoirs.pouvoir_psi_2.label == item[3].name
            ) {
              systemData.pouvoirs.pouvoir_psi_2.label = item[3].name;
              systemData.pouvoirs.pouvoir_psi_2.num_item = 3;
            }
          }
        } else {
          if (item[3].name == "TRANSIT") {
            systemData.pouvoirs.pouvoir_transit.label = item[3].name;
            systemData.pouvoirs.pouvoir_transit.num_item = 3;
          }
          if (item[3].name == "TRANSFERT") {
            systemData.pouvoirs.pouvoir_transfert.label = item[3].name;
            systemData.pouvoirs.pouvoir_transfert.num_item = 3;
          }
        }
      }
    }

    //Calcul de la DEF
    if (systemData.talents_combat.mainsnues.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues.def;
    }
    if (systemData.talents_combat.mainsnues1.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues1.def;
    }
    if (systemData.talents_combat.mainsnues2.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues2.def;
    }
    if (systemData.talents_combat.mainsnues3.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues3.def;
    }
    if (systemData.talents_combat.armescourtes_1.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armescourtes_1.def;
    }
    if (systemData.talents_combat.armescourtes_2.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armescourtes_2.def;
    }
    if (systemData.talents_combat.armeslongues_1.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armeslongues_1.def;
    }
    if (systemData.talents_combat.armeslongues_2.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armeslongues_2.def;
    }
    if (systemData.talents_combat.lancer_1.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.lancer_1.def;
    }
    if (systemData.talents_combat.lancer_2.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.lancer_2.def;
    }
    if (systemData.talents_combat.tir_1.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.tir_1.def;
    }
    if (systemData.talents_combat.tir_2.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.tir_2.def;
    }
    let def_totale = systemData.def_modif.value;
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

    if (systemData.talents_combat.mainsnues1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.mainsnues1.def;
    }
    if (systemData.talents_combat.mainsnues3.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.mainsnues3.def;
    }
    if (systemData.talents_combat.armescourtes_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armescourtes_1.def;
    }
    if (systemData.talents_combat.armescourtes_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armescourtes_2.def;
    }
    if (systemData.talents_combat.armeslongues_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armeslongues_1.def;
    }
    if (systemData.talents_combat.armeslongues_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armeslongues_2.def;
    }
    if (systemData.talents_combat.lancer_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.lancer_1.def;
    }
    if (systemData.talents_combat.lancer_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.lancer_2.def;
    }
    if (systemData.talents_combat.tir_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.tir_1.def;
    }
    if (systemData.talents_combat.tir_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.tir_2.def;
    }

    systemData.protect_choc.value = systemData.def.value + def_totale;
    systemData.protect_lame.value = systemData.def.value + def_totale;
    systemData.protect_balle.value = systemData.def.value + def_totale;
    systemData.protect_feu.value = systemData.def.value + def_totale;
    systemData.protect_froid.value = systemData.def.value + def_totale;
    systemData.protect_acide.value = systemData.def.value + def_totale;
    systemData.protect_rayon.value = systemData.def.value + def_totale;

    /*************Protection 1 *****************/

    itemType = "Protection";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[0]) {
      systemData.protections.p1.label = "";
      systemData.protections.p1.def_chocs = 0;
      systemData.protections.p1.def_froid = 0;
      systemData.protections.p1.def_balle = 0;
      systemData.protections.p1.def_feu = 0;
      systemData.protections.p1.def_acide = 0;
      systemData.protections.p1.def_rayon = 0;
      systemData.protections.p1.def_lame = 0;
    }

    if (item[0]) {
      systemData.protections.p1.label = item[0].name;
      systemData.protections.p1.def_chocs = item[0].system.caracs.def_choc;
      systemData.protections.p1.def_lame = item[0].system.caracs.def_lame;
      systemData.protections.p1.def_balle = item[0].system.caracs.def_balle;
      systemData.protections.p1.def_feu = item[0].system.caracs.def_feu;
      systemData.protections.p1.def_froid = item[0].system.caracs.def_froid;
      systemData.protections.p1.def_acide = item[0].system.caracs.def_acide;
      systemData.protections.p1.def_rayon = item[0].system.caracs.def_rayon;

      if (
        !systemData.protections.p1.label &&
        systemData.protections.p1.label !== item[0].name
      ) {
        systemData.protections.p1.label = item[0].name;
        systemData.protections.p1.def_chocs = item[0].system.caracs.def_choc;
        systemData.protections.p1.def_lame = item[0].system.caracs.def_lame;
        systemData.protections.p1.def_balle = item[0].system.caracs.def_balle;
        systemData.protections.p1.def_feu = item[0].system.caracs.def_feu;
        systemData.protections.p1.def_froid = item[0].system.caracs.def_froid;
        systemData.protections.p1.def_acide = item[0].system.caracs.def_acide;
        systemData.protections.p1.def_rayon = item[0].system.caracs.def_rayon;
      }
    }

    if (systemData.protections.p1.selection === true) {
      systemData.protect_choc.value =
        systemData.protect_choc.value + systemData.protections.p1.def_chocs;
      systemData.protect_lame.value =
        systemData.protect_lame.value + systemData.protections.p1.def_lame;
      systemData.protect_balle.value =
        systemData.protect_balle.value + systemData.protections.p1.def_balle;
      systemData.protect_feu.value =
        systemData.protect_feu.value + systemData.protections.p1.def_feu;
      systemData.protect_froid.value =
        systemData.protect_froid.value + systemData.protections.p1.def_froid;
      systemData.protect_acide.value =
        systemData.protect_acide.value + systemData.protections.p1.def_acide;
      systemData.protect_rayon.value =
        systemData.protect_rayon.value + systemData.protections.p1.def_rayon;
    }

    /*************Protection 2 *****************/

    itemType = "Protection";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[1]) {
      systemData.protections.p2.label = "";
      systemData.protections.p2.def_chocs = 0;
      systemData.protections.p2.def_froid = 0;
      systemData.protections.p2.def_balle = 0;
      systemData.protections.p2.def_feu = 0;
      systemData.protections.p2.def_acide = 0;
      systemData.protections.p2.def_rayon = 0;
      systemData.protections.p2.def_lame = 0;
    }

    if (item[1]) {
      systemData.protections.p2.label = item[1].name;
      systemData.protections.p2.def_chocs = item[1].system.caracs.def_choc;
      systemData.protections.p2.def_lame = item[1].system.caracs.def_lame;
      systemData.protections.p2.def_balle = item[1].system.caracs.def_balle;
      systemData.protections.p2.def_feu = item[1].system.caracs.def_feu;
      systemData.protections.p2.def_froid = item[1].system.caracs.def_froid;
      systemData.protections.p2.def_acide = item[1].system.caracs.def_acide;
      systemData.protections.p2.def_rayon = item[1].system.caracs.def_rayon;

      if (
        !systemData.protections.p2.label &&
        systemData.protections.p2.label !== item[0].name
      ) {
        systemData.protections.p2.label = item[1].name;
        systemData.protections.p2.def_chocs = item[1].system.caracs.def_choc;
        systemData.protections.p2.def_lame = item[1].system.caracs.def_lame;
        systemData.protections.p2.def_balle = item[1].system.caracs.def_balle;
        systemData.protections.p2.def_feu = item[1].system.caracs.def_feu;
        systemData.protections.p2.def_froid = item[1].system.caracs.def_froid;
        systemData.protections.p2.def_acide = item[1].system.caracs.def_acide;
        systemData.protections.p2.def_rayon = item[1].system.caracs.def_rayon;
      }
    }

    if (systemData.protections.p2.selection === true) {
      systemData.protect_choc.value =
        systemData.protect_choc.value + systemData.protections.p2.def_chocs;
      systemData.protect_lame.value =
        systemData.protect_lame.value + systemData.protections.p2.def_lame;
      systemData.protect_balle.value =
        systemData.protect_balle.value + systemData.protections.p2.def_balle;
      systemData.protect_feu.value =
        systemData.protect_feu.value + systemData.protections.p2.def_feu;
      systemData.protect_froid.value =
        systemData.protect_froid.value + systemData.protections.p2.def_froid;
      systemData.protect_acide.value =
        systemData.protect_acide.value + systemData.protections.p2.def_acide;
      systemData.protect_rayon.value =
        systemData.protect_rayon.value + systemData.protections.p2.def_rayon;
    }

    /*************Protection 3 *****************/

    itemType = "Protection";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[2]) {
      systemData.protections.p3.label = "";
      systemData.protections.p3.def_chocs = 0;
      systemData.protections.p3.def_froid = 0;
      systemData.protections.p3.def_balle = 0;
      systemData.protections.p3.def_feu = 0;
      systemData.protections.p3.def_acide = 0;
      systemData.protections.p3.def_rayon = 0;
      systemData.protections.p3.def_lame = 0;
    }

    if (item[2]) {
      systemData.protections.p3.label = item[2].name;
      systemData.protections.p3.def_chocs = item[2].system.caracs.def_choc;
      systemData.protections.p3.def_lame = item[2].system.caracs.def_lame;
      systemData.protections.p3.def_balle = item[2].system.caracs.def_balle;
      systemData.protections.p3.def_feu = item[2].system.caracs.def_feu;
      systemData.protections.p3.def_froid = item[2].system.caracs.def_froid;
      systemData.protections.p3.def_acide = item[2].system.caracs.def_acide;
      systemData.protections.p3.def_rayon = item[2].system.caracs.def_rayon;

      if (
        !systemData.protections.p3.label &&
        systemData.protections.p3.label !== item[0].name
      ) {
        systemData.protections.p3.label = item[2].name;
        systemData.protections.p3.def_chocs = item[2].system.caracs.def_choc;
        systemData.protections.p3.def_lame = item[2].system.caracs.def_lame;
        systemData.protections.p3.def_balle = item[2].system.caracs.def_balle;
        systemData.protections.p3.def_feu = item[2].system.caracs.def_feu;
        systemData.protections.p3.def_froid = item[2].system.caracs.def_froid;
        systemData.protections.p3.def_acide = item[2].system.caracs.def_acide;
        systemData.protections.p3.def_rayon = item[2].system.caracs.def_rayon;
      }
    }

    if (systemData.protections.p3.selection === true) {
      systemData.protect_choc.value =
        systemData.protect_choc.value + systemData.protections.p3.def_chocs;
      systemData.protect_lame.value =
        systemData.protect_lame.value + systemData.protections.p3.def_lame;
      systemData.protect_balle.value =
        systemData.protect_balle.value + systemData.protections.p3.def_balle;
      systemData.protect_feu.value =
        systemData.protect_feu.value + systemData.protections.p3.def_feu;
      systemData.protect_froid.value =
        systemData.protect_froid.value + systemData.protections.p3.def_froid;
      systemData.protect_acide.value =
        systemData.protect_acide.value + systemData.protections.p3.def_acide;
      systemData.protect_rayon.value =
        systemData.protect_rayon.value + systemData.protections.p3.def_rayon;
    }

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
    let MN2 = systemData.talents_combat.mainsnues2.label;
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

    let itemType = "Attaque spéciale";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.mainsnues1.label = "";
      systemData.talents_combat.mainsnues1.def = 0;
      systemData.talents_combat.mainsnues1.av0 = 0;
      systemData.talents_combat.mainsnues1.av1 = 0;
      systemData.talents_combat.mainsnues1.av2 = 0;
      systemData.talents_combat.mainsnues1.av3 = 0;
      systemData.talents_combat.mainsnues1.av4 = 0;
      systemData.talents_combat.mainsnues1.effet_ac_0_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_0_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_0_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_1_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_1_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_1_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_2_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_2_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_2_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_3_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_3_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_3_3 = "";
      systemData.talents_combat.mainsnues1.effet_ac_4_1 = "";
      systemData.talents_combat.mainsnues1.effet_ac_4_2 = "";
      systemData.talents_combat.mainsnues1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.mainsnues2.label = "";
      systemData.talents_combat.mainsnues2.def = 0;
      systemData.talents_combat.mainsnues2.av0 = 0;
      systemData.talents_combat.mainsnues2.av1 = 0;
      systemData.talents_combat.mainsnues2.av2 = 0;
      systemData.talents_combat.mainsnues2.av3 = 0;
      systemData.talents_combat.mainsnues2.av4 = 0;
      systemData.talents_combat.mainsnues2.effet_ac_0_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_0_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_0_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_1_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_1_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_1_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_2_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_2_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_2_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_3_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_3_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_3_3 = "";
      systemData.talents_combat.mainsnues2.effet_ac_4_1 = "";
      systemData.talents_combat.mainsnues2.effet_ac_4_2 = "";
      systemData.talents_combat.mainsnues2.effet_ac_4_3 = "";
    }
    if (!item[2]) {
      systemData.talents_combat.mainsnues3.label = "";
      systemData.talents_combat.mainsnues3.def = 0;
      systemData.talents_combat.mainsnues3.av0 = 0;
      systemData.talents_combat.mainsnues3.av1 = 0;
      systemData.talents_combat.mainsnues3.av2 = 0;
      systemData.talents_combat.mainsnues3.av3 = 0;
      systemData.talents_combat.mainsnues3.av4 = 0;
      systemData.talents_combat.mainsnues3.effet_ac_0_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_0_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_0_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_1_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_1_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_1_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_2_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_2_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_2_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_3_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_3_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_3_3 = "";
      systemData.talents_combat.mainsnues3.effet_ac_4_1 = "";
      systemData.talents_combat.mainsnues3.effet_ac_4_2 = "";
      systemData.talents_combat.mainsnues3.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.mainsnues1.label === "" ||
        systemData.talents_combat.mainsnues1.label === item[0].name
      ) {
        systemData.talents_combat.mainsnues1.label = item[0].name;
        systemData.talents_combat.mainsnues1.def = item[0].system.def;
        systemData.talents_combat.mainsnues1.av0 = item[0].system.av0;
        systemData.talents_combat.mainsnues1.av1 = item[0].system.av1;
        systemData.talents_combat.mainsnues1.av2 = item[0].system.av2;
        systemData.talents_combat.mainsnues1.av3 = item[0].system.av3;
        systemData.talents_combat.mainsnues1.av4 = item[0].system.av4;
        systemData.talents_combat.mainsnues1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.mainsnues1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.mainsnues1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.mainsnues1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.mainsnues1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.mainsnues1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.mainsnues1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.mainsnues1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.mainsnues1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.mainsnues1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.mainsnues1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.mainsnues1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.mainsnues1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.mainsnues1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.mainsnues1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.mainsnues2.label === "" ||
        systemData.talents_combat.mainsnues2.label === item[1].name
      ) {
        systemData.talents_combat.mainsnues2.label = item[1].name;
        systemData.talents_combat.mainsnues2.def = item[1].system.def;
        systemData.talents_combat.mainsnues2.av0 = item[1].system.av0;
        systemData.talents_combat.mainsnues2.av1 = item[1].system.av1;
        systemData.talents_combat.mainsnues2.av2 = item[1].system.av2;
        systemData.talents_combat.mainsnues2.av3 = item[1].system.av3;
        systemData.talents_combat.mainsnues2.av4 = item[1].system.av4;
        systemData.talents_combat.mainsnues2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.mainsnues2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.mainsnues2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.mainsnues2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.mainsnues2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.mainsnues2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.mainsnues2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.mainsnues2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.mainsnues2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.mainsnues2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.mainsnues2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.mainsnues2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.mainsnues2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.mainsnues2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.mainsnues2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }
    if (item[2]) {
      if (
        systemData.talents_combat.mainsnues3.label === "" ||
        systemData.talents_combat.mainsnues3.label === item[2].name
      ) {
        systemData.talents_combat.mainsnues3.label = item[2].name;
        systemData.talents_combat.mainsnues3.def = item[2].system.def;
        systemData.talents_combat.mainsnues3.av0 = item[2].system.av0;
        systemData.talents_combat.mainsnues3.av1 = item[2].system.av1;
        systemData.talents_combat.mainsnues3.av2 = item[2].system.av2;
        systemData.talents_combat.mainsnues3.av3 = item[2].system.av3;
        systemData.talents_combat.mainsnues3.av4 = item[2].system.av4;
        systemData.talents_combat.mainsnues3.effet_ac_0_1 =
          item[2].system.effet_ac_0_1;
        systemData.talents_combat.mainsnues3.effet_ac_0_2 =
          item[2].system.effet_ac_0_2;
        systemData.talents_combat.mainsnues3.effet_ac_0_3 =
          item[2].system.effet_ac_0_3;
        systemData.talents_combat.mainsnues3.effet_ac_1_1 =
          item[2].system.effet_ac_1_1;
        systemData.talents_combat.mainsnues3.effet_ac_1_2 =
          item[2].system.effet_ac_1_2;
        systemData.talents_combat.mainsnues3.effet_ac_1_3 =
          item[2].system.effet_ac_1_3;
        systemData.talents_combat.mainsnues3.effet_ac_2_1 =
          item[2].system.effet_ac_2_1;
        systemData.talents_combat.mainsnues3.effet_ac_2_2 =
          item[2].system.effet_ac_2_2;
        systemData.talents_combat.mainsnues3.effet_ac_2_3 =
          item[2].system.effet_ac_2_3;
        systemData.talents_combat.mainsnues3.effet_ac_3_1 =
          item[2].system.effet_ac_3_1;
        systemData.talents_combat.mainsnues3.effet_ac_3_2 =
          item[2].system.effet_ac_3_2;
        systemData.talents_combat.mainsnues3.effet_ac_3_3 =
          item[2].system.effet_ac_3_3;
        systemData.talents_combat.mainsnues3.effet_ac_4_1 =
          item[2].system.effet_ac_4_1;
        systemData.talents_combat.mainsnues3.effet_ac_4_2 =
          item[2].system.effet_ac_4_2;
        systemData.talents_combat.mainsnues3.effet_ac_4_3 =
          item[2].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes courtes
    itemType = "Arme courte";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.armescourtes_1.label = "";
      systemData.talents_combat.armescourtes_1.def = 0;
      systemData.talents_combat.armescourtes_1.av0 = 0;
      systemData.talents_combat.armescourtes_1.av1 = 0;
      systemData.talents_combat.armescourtes_1.av2 = 0;
      systemData.talents_combat.armescourtes_1.av3 = 0;
      systemData.talents_combat.armescourtes_1.av4 = 0;
      systemData.talents_combat.armescourtes_1.effet_ac_0_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_0_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_0_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_1_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_1_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_1_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_2_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_2_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_2_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_3_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_3_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_3_3 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_4_1 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_4_2 = "";
      systemData.talents_combat.armescourtes_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.armescourtes_2.label = "";
      systemData.talents_combat.armescourtes_2.def = 0;
      systemData.talents_combat.armescourtes_2.av0 = 0;
      systemData.talents_combat.armescourtes_2.av1 = 0;
      systemData.talents_combat.armescourtes_2.av2 = 0;
      systemData.talents_combat.armescourtes_2.av3 = 0;
      systemData.talents_combat.armescourtes_2.av4 = 0;
      systemData.talents_combat.armescourtes_2.effet_ac_0_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_0_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_0_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_1_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_1_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_1_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_2_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_2_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_2_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_3_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_3_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_3_3 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_4_1 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_4_2 = "";
      systemData.talents_combat.armescourtes_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.armescourtes_1.label === "" ||
        systemData.talents_combat.armescourtes_1.label === item[0].name
      ) {
        systemData.talents_combat.armescourtes_1.label = item[0].name;
        systemData.talents_combat.armescourtes_1.def = item[0].system.def;
        systemData.talents_combat.armescourtes_1.av0 = item[0].system.av0;
        systemData.talents_combat.armescourtes_1.av1 = item[0].system.av1;
        systemData.talents_combat.armescourtes_1.av2 = item[0].system.av2;
        systemData.talents_combat.armescourtes_1.av3 = item[0].system.av3;
        systemData.talents_combat.armescourtes_1.av4 = item[0].system.av4;
        systemData.talents_combat.armescourtes_1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.armescourtes_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.armescourtes_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.armescourtes_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.armescourtes_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.armescourtes_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.armescourtes_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.armescourtes_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.armescourtes_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.armescourtes_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.armescourtes_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.armescourtes_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.armescourtes_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.armescourtes_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.armescourtes_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.armescourtes_2.label === "" ||
        systemData.talents_combat.armescourtes_2.label === item[1].name
      ) {
        systemData.talents_combat.armescourtes_2.label = item[1].name;
        systemData.talents_combat.armescourtes_2.def = item[1].system.def;
        systemData.talents_combat.armescourtes_2.av0 = item[1].system.av0;
        systemData.talents_combat.armescourtes_2.av1 = item[1].system.av1;
        systemData.talents_combat.armescourtes_2.av2 = item[1].system.av2;
        systemData.talents_combat.armescourtes_2.av3 = item[1].system.av3;
        systemData.talents_combat.armescourtes_2.av4 = item[1].system.av4;
        systemData.talents_combat.armescourtes_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.armescourtes_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.armescourtes_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.armescourtes_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.armescourtes_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.armescourtes_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.armescourtes_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.armescourtes_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.armescourtes_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.armescourtes_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.armescourtes_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.armescourtes_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.armescourtes_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.armescourtes_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.armescourtes_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes longues
    itemType = "Arme longue";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.armeslongues_1.label = "";
      systemData.talents_combat.armeslongues_1.def = 0;
      systemData.talents_combat.armeslongues_1.av0 = 0;
      systemData.talents_combat.armeslongues_1.av1 = 0;
      systemData.talents_combat.armeslongues_1.av2 = 0;
      systemData.talents_combat.armeslongues_1.av3 = 0;
      systemData.talents_combat.armeslongues_1.av4 = 0;
      systemData.talents_combat.armeslongues_1.effet_ac_0_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_0_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_0_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_1_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_1_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_1_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_2_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_2_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_2_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_3_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_3_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_3_3 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_4_1 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_4_2 = "";
      systemData.talents_combat.armeslongues_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.armeslongues_2.label = "";
      systemData.talents_combat.armeslongues_2.def = 0;
      systemData.talents_combat.armeslongues_2.av0 = 0;
      systemData.talents_combat.armeslongues_2.av1 = 0;
      systemData.talents_combat.armeslongues_2.av2 = 0;
      systemData.talents_combat.armeslongues_2.av3 = 0;
      systemData.talents_combat.armeslongues_2.av4 = 0;
      systemData.talents_combat.armeslongues_2.effet_ac_0_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_0_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_0_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_1_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_1_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_1_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_2_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_2_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_2_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_3_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_3_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_3_3 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_4_1 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_4_2 = "";
      systemData.talents_combat.armeslongues_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.armeslongues_1.label === "" ||
        systemData.talents_combat.armeslongues_1.label === item[0].name
      ) {
        systemData.talents_combat.armeslongues_1.label = item[0].name;
        systemData.talents_combat.armeslongues_1.def = item[0].system.def;
        systemData.talents_combat.armeslongues_1.av0 = item[0].system.av0;
        systemData.talents_combat.armeslongues_1.av1 = item[0].system.av1;
        systemData.talents_combat.armeslongues_1.av2 = item[0].system.av2;
        systemData.talents_combat.armeslongues_1.av3 = item[0].system.av3;
        systemData.talents_combat.armeslongues_1.av4 = item[0].system.av4;
        systemData.talents_combat.armeslongues_1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.armeslongues_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.armeslongues_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.armeslongues_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.armeslongues_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.armeslongues_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.armeslongues_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.armeslongues_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.armeslongues_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.armeslongues_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.armeslongues_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.armeslongues_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.armeslongues_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.armeslongues_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.armeslongues_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.armeslongues_2.label === "" ||
        systemData.talents_combat.armeslongues_2.label === item[1].name
      ) {
        systemData.talents_combat.armeslongues_2.label = item[1].name;
        systemData.talents_combat.armeslongues_2.def = item[1].system.def;
        systemData.talents_combat.armeslongues_2.av0 = item[1].system.av0;
        systemData.talents_combat.armeslongues_2.av1 = item[1].system.av1;
        systemData.talents_combat.armeslongues_2.av2 = item[1].system.av2;
        systemData.talents_combat.armeslongues_2.av3 = item[1].system.av3;
        systemData.talents_combat.armeslongues_2.av4 = item[1].system.av4;
        systemData.talents_combat.armeslongues_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.armeslongues_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.armeslongues_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.armeslongues_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.armeslongues_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.armeslongues_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.armeslongues_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.armeslongues_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.armeslongues_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.armeslongues_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.armeslongues_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.armeslongues_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.armeslongues_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.armeslongues_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.armeslongues_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes de lancer
    itemType = "Arme de lancer";
    item = this.items.filter((i) => i.type == itemType);

    if (!item[0]) {
      systemData.talents_combat.lancer_1.label = "";
      systemData.talents_combat.lancer_1.def = 0;
      systemData.talents_combat.lancer_1.av0 = 0;
      systemData.talents_combat.lancer_1.av1 = 0;
      systemData.talents_combat.lancer_1.av2 = 0;
      systemData.talents_combat.lancer_1.av3 = 0;
      systemData.talents_combat.lancer_1.av4 = 0;
      systemData.talents_combat.lancer_1.effet_ac_0_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_0_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_0_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_1_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_1_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_1_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_2_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_2_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_2_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_3_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_3_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_3_3 = "";
      systemData.talents_combat.lancer_1.effet_ac_4_1 = "";
      systemData.talents_combat.lancer_1.effet_ac_4_2 = "";
      systemData.talents_combat.lancer_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.lancer_2.label = "";
      systemData.talents_combat.lancer_2.def = 0;
      systemData.talents_combat.lancer_2.av0 = 0;
      systemData.talents_combat.lancer_2.av1 = 0;
      systemData.talents_combat.lancer_2.av2 = 0;
      systemData.talents_combat.lancer_2.av3 = 0;
      systemData.talents_combat.lancer_2.av4 = 0;
      systemData.talents_combat.lancer_2.effet_ac_0_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_0_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_0_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_1_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_1_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_1_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_2_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_2_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_2_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_3_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_3_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_3_3 = "";
      systemData.talents_combat.lancer_2.effet_ac_4_1 = "";
      systemData.talents_combat.lancer_2.effet_ac_4_2 = "";
      systemData.talents_combat.lancer_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.lancer_1.label === "" ||
        systemData.talents_combat.lancer_1.label === item[0].name
      ) {
        systemData.talents_combat.lancer_1.label = item[0].name;
        systemData.talents_combat.lancer_1.def = item[0].system.def;
        systemData.talents_combat.lancer_1.av0 = item[0].system.av0;
        systemData.talents_combat.lancer_1.av1 = item[0].system.av1;
        systemData.talents_combat.lancer_1.av2 = item[0].system.av2;
        systemData.talents_combat.lancer_1.av3 = item[0].system.av3;
        systemData.talents_combat.lancer_1.av4 = item[0].system.av4;
        systemData.talents_combat.lancer_1.quantity = item[0].system.quantity;
        systemData.talents_combat.lancer_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.lancer_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.lancer_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.lancer_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.lancer_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.lancer_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.lancer_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.lancer_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.lancer_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.lancer_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.lancer_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.lancer_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.lancer_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.lancer_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.lancer_2.label === "" ||
        systemData.talents_combat.lancer_2.label === item[1].name
      ) {
        systemData.talents_combat.lancer_2.label = item[1].name;
        systemData.talents_combat.lancer_2.def = item[1].system.def;
        systemData.talents_combat.lancer_2.av0 = item[1].system.av0;
        systemData.talents_combat.lancer_2.av1 = item[1].system.av1;
        systemData.talents_combat.lancer_2.av2 = item[1].system.av2;
        systemData.talents_combat.lancer_2.av3 = item[1].system.av3;
        systemData.talents_combat.lancer_2.av4 = item[1].system.av4;
        systemData.talents_combat.lancer_2.quantity = item[1].system.quantity;
        systemData.talents_combat.lancer_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.lancer_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.lancer_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.lancer_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.lancer_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.lancer_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.lancer_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.lancer_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.lancer_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.lancer_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.lancer_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.lancer_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.lancer_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.lancer_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.lancer_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }

    //Mise en place dans l'onglet combat des armes de tir
    itemType = "Arme de tir";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[0]) {
      systemData.talents_combat.tir_1.label = "";
      systemData.talents_combat.tir_1.def = 0;
      systemData.talents_combat.tir_1.av0 = 0;
      systemData.talents_combat.tir_1.av1 = 0;
      systemData.talents_combat.tir_1.av2 = 0;
      systemData.talents_combat.tir_1.av3 = 0;
      systemData.talents_combat.tir_1.av4 = 0;
      systemData.talents_combat.tir_1.effet_ac_0_1 = "";
      systemData.talents_combat.tir_1.effet_ac_0_2 = "";
      systemData.talents_combat.tir_1.effet_ac_0_3 = "";
      systemData.talents_combat.tir_1.effet_ac_1_1 = "";
      systemData.talents_combat.tir_1.effet_ac_1_2 = "";
      systemData.talents_combat.tir_1.effet_ac_1_3 = "";
      systemData.talents_combat.tir_1.effet_ac_2_1 = "";
      systemData.talents_combat.tir_1.effet_ac_2_2 = "";
      systemData.talents_combat.tir_1.effet_ac_2_3 = "";
      systemData.talents_combat.tir_1.effet_ac_3_1 = "";
      systemData.talents_combat.tir_1.effet_ac_3_2 = "";
      systemData.talents_combat.tir_1.effet_ac_3_3 = "";
      systemData.talents_combat.tir_1.effet_ac_4_1 = "";
      systemData.talents_combat.tir_1.effet_ac_4_2 = "";
      systemData.talents_combat.tir_1.effet_ac_4_3 = "";
    }
    if (!item[1]) {
      systemData.talents_combat.tir_2.label = "";
      systemData.talents_combat.tir_2.def = 0;
      systemData.talents_combat.tir_2.av0 = 0;
      systemData.talents_combat.tir_2.av1 = 0;
      systemData.talents_combat.tir_2.av2 = 0;
      systemData.talents_combat.tir_2.av3 = 0;
      systemData.talents_combat.tir_2.av4 = 0;
      systemData.talents_combat.tir_2.effet_ac_0_1 = "";
      systemData.talents_combat.tir_2.effet_ac_0_2 = "";
      systemData.talents_combat.tir_2.effet_ac_0_3 = "";
      systemData.talents_combat.tir_2.effet_ac_1_1 = "";
      systemData.talents_combat.tir_2.effet_ac_1_2 = "";
      systemData.talents_combat.tir_2.effet_ac_1_3 = "";
      systemData.talents_combat.tir_2.effet_ac_2_1 = "";
      systemData.talents_combat.tir_2.effet_ac_2_2 = "";
      systemData.talents_combat.tir_2.effet_ac_2_3 = "";
      systemData.talents_combat.tir_2.effet_ac_3_1 = "";
      systemData.talents_combat.tir_2.effet_ac_3_2 = "";
      systemData.talents_combat.tir_2.effet_ac_3_3 = "";
      systemData.talents_combat.tir_2.effet_ac_4_1 = "";
      systemData.talents_combat.tir_2.effet_ac_4_2 = "";
      systemData.talents_combat.tir_2.effet_ac_4_3 = "";
    }
    if (item[0]) {
      if (
        systemData.talents_combat.tir_1.label === "" ||
        systemData.talents_combat.tir_1.label === item[0].name
      ) {
        systemData.talents_combat.tir_1.label = item[0].name;
        systemData.talents_combat.tir_1.def = item[0].system.def;
        systemData.talents_combat.tir_1.av0 = item[0].system.av0;
        systemData.talents_combat.tir_1.av1 = item[0].system.av1;
        systemData.talents_combat.tir_1.av2 = item[0].system.av2;
        systemData.talents_combat.tir_1.av3 = item[0].system.av3;
        systemData.talents_combat.tir_1.av4 = item[0].system.av4;
        systemData.talents_combat.tir_1.charge = item[0].system.charge;
        systemData.talents_combat.tir_1.portee = item[0].system.portee;
        systemData.talents_combat.tir_1.effet_ac_0_1 =
          item[0].system.effet_ac_0_1;
        systemData.talents_combat.tir_1.effet_ac_0_2 =
          item[0].system.effet_ac_0_2;
        systemData.talents_combat.tir_1.effet_ac_0_3 =
          item[0].system.effet_ac_0_3;
        systemData.talents_combat.tir_1.effet_ac_1_1 =
          item[0].system.effet_ac_1_1;
        systemData.talents_combat.tir_1.effet_ac_1_2 =
          item[0].system.effet_ac_1_2;
        systemData.talents_combat.tir_1.effet_ac_1_3 =
          item[0].system.effet_ac_1_3;
        systemData.talents_combat.tir_1.effet_ac_2_1 =
          item[0].system.effet_ac_2_1;
        systemData.talents_combat.tir_1.effet_ac_2_2 =
          item[0].system.effet_ac_2_2;
        systemData.talents_combat.tir_1.effet_ac_2_3 =
          item[0].system.effet_ac_2_3;
        systemData.talents_combat.tir_1.effet_ac_3_1 =
          item[0].system.effet_ac_3_1;
        systemData.talents_combat.tir_1.effet_ac_3_2 =
          item[0].system.effet_ac_3_2;
        systemData.talents_combat.tir_1.effet_ac_3_3 =
          item[0].system.effet_ac_3_3;
        systemData.talents_combat.tir_1.effet_ac_4_1 =
          item[0].system.effet_ac_4_1;
        systemData.talents_combat.tir_1.effet_ac_4_2 =
          item[0].system.effet_ac_4_2;
        systemData.talents_combat.tir_1.effet_ac_4_3 =
          item[0].system.effet_ac_4_3;
      }
    }
    if (item[1]) {
      if (
        systemData.talents_combat.tir_2.label === "" ||
        systemData.talents_combat.tir_2.label === item[1].name
      ) {
        systemData.talents_combat.tir_2.label = item[1].name;
        systemData.talents_combat.tir_2.def = item[1].system.def;
        systemData.talents_combat.tir_2.av0 = item[1].system.av0;
        systemData.talents_combat.tir_2.av1 = item[1].system.av1;
        systemData.talents_combat.tir_2.av2 = item[1].system.av2;
        systemData.talents_combat.tir_2.av3 = item[1].system.av3;
        systemData.talents_combat.tir_2.av4 = item[1].system.av4;
        systemData.talents_combat.tir_2.charge = item[1].system.charge;
        systemData.talents_combat.tir_2.portee = item[1].system.portee;
        systemData.talents_combat.tir_2.effet_ac_0_1 =
          item[1].system.effet_ac_0_1;
        systemData.talents_combat.tir_2.effet_ac_0_2 =
          item[1].system.effet_ac_0_2;
        systemData.talents_combat.tir_2.effet_ac_0_3 =
          item[1].system.effet_ac_0_3;
        systemData.talents_combat.tir_2.effet_ac_1_1 =
          item[1].system.effet_ac_1_1;
        systemData.talents_combat.tir_2.effet_ac_1_2 =
          item[1].system.effet_ac_1_2;
        systemData.talents_combat.tir_2.effet_ac_1_3 =
          item[1].system.effet_ac_1_3;
        systemData.talents_combat.tir_2.effet_ac_2_1 =
          item[1].system.effet_ac_2_1;
        systemData.talents_combat.tir_2.effet_ac_2_2 =
          item[1].system.effet_ac_2_2;
        systemData.talents_combat.tir_2.effet_ac_2_3 =
          item[1].system.effet_ac_2_3;
        systemData.talents_combat.tir_2.effet_ac_3_1 =
          item[1].system.effet_ac_3_1;
        systemData.talents_combat.tir_2.effet_ac_3_2 =
          item[1].system.effet_ac_3_2;
        systemData.talents_combat.tir_2.effet_ac_3_3 =
          item[1].system.effet_ac_3_3;
        systemData.talents_combat.tir_2.effet_ac_4_1 =
          item[1].system.effet_ac_4_1;
        systemData.talents_combat.tir_2.effet_ac_4_2 =
          item[1].system.effet_ac_4_2;
        systemData.talents_combat.tir_2.effet_ac_4_3 =
          item[1].system.effet_ac_4_3;
      }
    }
    //Mise en place des Pouvoirs
    // itemType = "Pouvoir";
    // items = this.items.filter(i => i.type == itemType);
    // pouvoirs = [
    // 	systemData.pouvoirs.pouvoir_psi_1,
    // 	systemData.pouvoirs.pouvoir_psi_2
    // ];

    // pouvoirs.forEach((pouvoir, index) => {
    // 	if (!items[index]) {
    // 		reinitialiserPouvoir(pouvoir);
    // 	} else if (pouvoir.label === "" || pouvoir.label === items[index].name) {
    // 		mettreAJourPouvoir(pouvoir, items[index]);
    // 	}
    // });

    //Calcul de la DEF
    if (systemData.talents_combat.mainsnues.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues.def;
    }
    if (systemData.talents_combat.mainsnues1.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues1.def;
    }
    if (systemData.talents_combat.mainsnues2.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues2.def;
    }
    if (systemData.talents_combat.mainsnues3.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.mainsnues3.def;
    }
    if (systemData.talents_combat.armescourtes_1.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armescourtes_1.def;
    }
    if (systemData.talents_combat.armescourtes_2.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armescourtes_2.def;
    }
    if (systemData.talents_combat.armeslongues_1.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armeslongues_1.def;
    }
    if (systemData.talents_combat.armeslongues_2.def_actif) {
      systemData.def_modif.value +=
        systemData.talents_combat.armeslongues_2.def;
    }
    if (systemData.talents_combat.lancer_1.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.lancer_1.def;
    }
    if (systemData.talents_combat.lancer_2.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.lancer_2.def;
    }
    if (systemData.talents_combat.tir_1.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.tir_1.def;
    }
    if (systemData.talents_combat.tir_2.def_actif) {
      systemData.def_modif.value += systemData.talents_combat.tir_2.def;
    }
    let def_totale = systemData.def_modif.value;

    if (systemData.reduit === 0) {
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

    /*************Protection 1 *****************/

    itemType = "Protection";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[0]) {
      systemData.protections.p1.label = "";
      systemData.protections.p1.def_chocs = 0;
      systemData.protections.p1.def_froid = 0;
      systemData.protections.p1.def_balle = 0;
      systemData.protections.p1.def_feu = 0;
      systemData.protections.p1.def_acide = 0;
      systemData.protections.p1.def_rayon = 0;
      systemData.protections.p1.def_lame = 0;
    }

    if (item[0]) {
      systemData.protections.p1.label = item[0].name;
      systemData.protections.p1.def_chocs = item[0].system.caracs.def_choc;
      systemData.protections.p1.def_lame = item[0].system.caracs.def_lame;
      systemData.protections.p1.def_balle = item[0].system.caracs.def_balle;
      systemData.protections.p1.def_feu = item[0].system.caracs.def_feu;
      systemData.protections.p1.def_froid = item[0].system.caracs.def_froid;
      systemData.protections.p1.def_acide = item[0].system.caracs.def_acide;
      systemData.protections.p1.def_rayon = item[0].system.caracs.def_rayon;

      if (
        !systemData.protections.p1.label &&
        systemData.protections.p1.label !== item[0].name
      ) {
        systemData.protections.p1.label = item[0].name;
        systemData.protections.p1.def_chocs = item[0].system.caracs.def_choc;
        systemData.protections.p1.def_lame = item[0].system.caracs.def_lame;
        systemData.protections.p1.def_balle = item[0].system.caracs.def_balle;
        systemData.protections.p1.def_feu = item[0].system.caracs.def_feu;
        systemData.protections.p1.def_froid = item[0].system.caracs.def_froid;
        systemData.protections.p1.def_acide = item[0].system.caracs.def_acide;
        systemData.protections.p1.def_rayon = item[0].system.caracs.def_rayon;
      }
    }

    if (systemData.protections.p1.selection === true) {
      systemData.protect_choc.value =
        systemData.protect_choc.value + systemData.protections.p1.def_chocs;
      systemData.protect_lame.value =
        systemData.protect_lame.value + systemData.protections.p1.def_lame;
      systemData.protect_balle.value =
        systemData.protect_balle.value + systemData.protections.p1.def_balle;
      systemData.protect_feu.value =
        systemData.protect_feu.value + systemData.protections.p1.def_feu;
      systemData.protect_froid.value =
        systemData.protect_froid.value + systemData.protections.p1.def_froid;
      systemData.protect_acide.value =
        systemData.protect_acide.value + systemData.protections.p1.def_acide;
      systemData.protect_rayon.value =
        systemData.protect_rayon.value + systemData.protections.p1.def_rayon;
    }

    /**************************** */

    /*************Protection 2 *****************/

    itemType = "Protection";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[1]) {
      systemData.protections.p2.label = "";
      systemData.protections.p2.def_chocs = 0;
      systemData.protections.p2.def_froid = 0;
      systemData.protections.p2.def_balle = 0;
      systemData.protections.p2.def_feu = 0;
      systemData.protections.p2.def_acide = 0;
      systemData.protections.p2.def_rayon = 0;
      systemData.protections.p2.def_lame = 0;
    }

    if (item[1]) {
      systemData.protections.p2.label = item[1].name;
      systemData.protections.p2.def_chocs = item[1].system.caracs.def_choc;
      systemData.protections.p2.def_lame = item[1].system.caracs.def_lame;
      systemData.protections.p2.def_balle = item[1].system.caracs.def_balle;
      systemData.protections.p2.def_feu = item[1].system.caracs.def_feu;
      systemData.protections.p2.def_froid = item[1].system.caracs.def_froid;
      systemData.protections.p2.def_acide = item[1].system.caracs.def_acide;
      systemData.protections.p2.def_rayon = item[1].system.caracs.def_rayon;

      if (
        !systemData.protections.p2.label &&
        systemData.protections.p2.label !== item[0].name
      ) {
        systemData.protections.p2.label = item[1].name;
        systemData.protections.p2.def_chocs = item[1].system.caracs.def_choc;
        systemData.protections.p2.def_lame = item[1].system.caracs.def_lame;
        systemData.protections.p2.def_balle = item[1].system.caracs.def_balle;
        systemData.protections.p2.def_feu = item[1].system.caracs.def_feu;
        systemData.protections.p2.def_froid = item[1].system.caracs.def_froid;
        systemData.protections.p2.def_acide = item[1].system.caracs.def_acide;
        systemData.protections.p2.def_rayon = item[1].system.caracs.def_rayon;
      }
    }

    if (systemData.protections.p2.selection === true) {
      systemData.protect_choc.value =
        systemData.protect_choc.value + systemData.protections.p2.def_chocs;
      systemData.protect_lame.value =
        systemData.protect_lame.value + systemData.protections.p2.def_lame;
      systemData.protect_balle.value =
        systemData.protect_balle.value + systemData.protections.p2.def_balle;
      systemData.protect_feu.value =
        systemData.protect_feu.value + systemData.protections.p2.def_feu;
      systemData.protect_froid.value =
        systemData.protect_froid.value + systemData.protections.p2.def_froid;
      systemData.protect_acide.value =
        systemData.protect_acide.value + systemData.protections.p2.def_acide;
      systemData.protect_rayon.value =
        systemData.protect_rayon.value + systemData.protections.p2.def_rayon;
    }

    /**************************** */
    /*************Protection 3 *****************/

    itemType = "Protection";
    item = this.items.filter((i) => i.type == itemType);
    if (!item[2]) {
      systemData.protections.p3.label = "";
      systemData.protections.p3.def_chocs = 0;
      systemData.protections.p3.def_froid = 0;
      systemData.protections.p3.def_balle = 0;
      systemData.protections.p3.def_feu = 0;
      systemData.protections.p3.def_acide = 0;
      systemData.protections.p3.def_rayon = 0;
      systemData.protections.p3.def_lame = 0;
    }

    if (item[2]) {
      systemData.protections.p3.label = item[2].name;
      systemData.protections.p3.def_chocs = item[2].system.caracs.def_choc;
      systemData.protections.p3.def_lame = item[2].system.caracs.def_lame;
      systemData.protections.p3.def_balle = item[2].system.caracs.def_balle;
      systemData.protections.p3.def_feu = item[2].system.caracs.def_feu;
      systemData.protections.p3.def_froid = item[2].system.caracs.def_froid;
      systemData.protections.p3.def_acide = item[2].system.caracs.def_acide;
      systemData.protections.p3.def_rayon = item[2].system.caracs.def_rayon;

      if (
        !systemData.protections.p3.label &&
        systemData.protections.p3.label !== item[0].name
      ) {
        systemData.protections.p3.label = item[2].name;
        systemData.protections.p3.def_chocs = item[2].system.caracs.def_choc;
        systemData.protections.p3.def_lame = item[2].system.caracs.def_lame;
        systemData.protections.p3.def_balle = item[2].system.caracs.def_balle;
        systemData.protections.p3.def_feu = item[2].system.caracs.def_feu;
        systemData.protections.p3.def_froid = item[2].system.caracs.def_froid;
        systemData.protections.p3.def_acide = item[2].system.caracs.def_acide;
        systemData.protections.p3.def_rayon = item[2].system.caracs.def_rayon;
      }
    }

    if (systemData.protections.p3.selection === true) {
      systemData.protect_choc.value =
        systemData.protect_choc.value + systemData.protections.p3.def_chocs;
      systemData.protect_lame.value =
        systemData.protect_lame.value + systemData.protections.p3.def_lame;
      systemData.protect_balle.value =
        systemData.protect_balle.value + systemData.protections.p3.def_balle;
      systemData.protect_feu.value =
        systemData.protect_feu.value + systemData.protections.p3.def_feu;
      systemData.protect_froid.value =
        systemData.protect_froid.value + systemData.protections.p3.def_froid;
      systemData.protect_acide.value =
        systemData.protect_acide.value + systemData.protections.p3.def_acide;
      systemData.protect_rayon.value =
        systemData.protect_rayon.value + systemData.protections.p3.def_rayon;
    }

    /**************************** */

    if (systemData.talents_combat.armescourtes_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armescourtes_1.def;
    }
    if (systemData.talents_combat.armescourtes_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armescourtes_2.def;
    }
    if (systemData.talents_combat.armeslongues_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armeslongues_1.def;
    }
    if (systemData.talents_combat.armeslongues_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.armeslongues_2.def;
    }
    if (systemData.talents_combat.lancer_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.lancer_1.def;
    }
    if (systemData.talents_combat.lancer_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.lancer_2.def;
    }
    if (systemData.talents_combat.tir_1.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.tir_1.def;
    }
    if (systemData.talents_combat.tir_2.selection == true) {
      systemData.def.value =
        systemData.def.value + systemData.talents_combat.tir_2.def;
    }

    //Calcul de l'iniative
    if (!systemData.derives.initiative.d1) {
      systemData.derives.initiative.d1 = 0;
    }
    if (!systemData.derives.initiative.d2) {
      systemData.derives.initiative.d2 = 0;
    }
    if (!systemData.bonus_initiative.value) {
      systemData.bonus_initiative.value = 0;
    }
    if (systemData.reduit === 0) {
      systemData.derives.initiative.jet =
        systemData.domaines.combat.value +
        " . " +
        systemData.caracs.vivacite.value;
      systemData.derives.initiative.value =
        "1d" +
        systemData.domaines.combat.value +
        "+1d" +
        systemData.caracs.vivacite.value +
        "+" +
        systemData.bonus_initiative.value;
      systemData.derives.initiative.d1 = systemData.domaines.combat.value;
      systemData.derives.initiative.d2 = systemData.caracs.vivacite.value;
    } else {
      systemData.derives.initiative.jet =
        systemData.derives.initiative.d1 +
        " . " +
        systemData.derives.initiative.d2;
      systemData.derives.initiative.value =
        "1d" +
        systemData.derives.initiative.d1 +
        "+1d" +
        systemData.derives.initiative.d2 +
        "+" +
        systemData.bonus_initiative.value;
    }

    //Calcul de l'equive
    if (!systemData.bonus_esquive.value) {
      systemData.bonus_esquive.value = 0;
    }
    if (!systemData.derives.esquive.d1) {
      systemData.derives.esquive.d1 = 0;
    }
    if (!systemData.derives.esquive.d1.value) {
      systemData.derives.esquive.d1.value = 0;
    }
    if (!systemData.derives.esquive.d2) {
      systemData.derives.esquive.d2 = 0;
    }
    if (!systemData.derives.esquive.d2.value) {
      systemData.derives.esquive.d2.value = 0;
    }
    if (!systemData.derives.esquive.d3) {
      systemData.derives.esquive.d3 = 0;
    }
    if (!systemData.derives.esquive.d3.value) {
      systemData.derives.esquive.d3.value = 0;
    }
    if (systemData.reduit === 0) {
      if (
        systemData.talents.acrobaties.value >
          systemData.talents_combat.mainsnues.score &&
        systemData.talents.acrobaties.value !== 99 &&
        systemData.talents_combat.mainsnues.score !== -2
      ) {
        if (
          systemData.caracs.vivacite.value > systemData.caracs.adresse.value
        ) {
          systemData.derives.esquive.jet =
            systemData.talents.acrobaties.value +
            " . " +
            systemData.caracs.vivacite.value +
            " . " +
            systemData.domaines.combat.value;
          systemData.derives.esquive.value =
            "1d" +
            systemData.talents.acrobaties.value +
            "+1d" +
            systemData.caracs.vivacite.value +
            "+1d" +
            systemData.domaines.combat.value +
            "+" +
            systemData.bonus_esquive.value;
        } else {
          systemData.derives.esquive.jet =
            systemData.talents.acrobaties.value +
            " . " +
            systemData.caracs.adresse.value +
            " . " +
            systemData.domaines.combat.value;
          systemData.derives.esquive.value =
            "1d" +
            systemData.talents.acrobaties.value +
            "+1d" +
            systemData.caracs.adresse.value +
            "+1d" +
            systemData.domaines.combat.value +
            "+" +
            systemData.bonus_esquive.value;
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
            systemData.derives.esquive.value =
              "1d" +
              systemData.talents_combat.mainsnues.score +
              "+1d" +
              systemData.caracs.vivacite.value +
              "+1d" +
              systemData.domaines.combat.value +
              "+" +
              systemData.bonus_esquive.value;
          } else {
            systemData.derives.esquive.jet =
              systemData.talents_combat.mainsnues.score +
              " . " +
              systemData.caracs.adresse.value +
              " . " +
              systemData.domaines.combat.value;
            systemData.derives.esquive.value =
              "1d" +
              systemData.talents_combat.mainsnues.score +
              "+1d" +
              systemData.caracs.adresse.value +
              "+1d" +
              systemData.domaines.combat.value +
              "+" +
              systemData.bonus_esquive.value;
          }
        } else {
          if (
            systemData.caracs.vivacite.value > systemData.caracs.adresse.value
          ) {
            systemData.derives.esquive.jet =
              systemData.caracs.vivacite.value +
              " . " +
              systemData.domaines.combat.value;
            systemData.derives.esquive.value =
              "1d" +
              systemData.caracs.vivacite.value +
              "+1d" +
              systemData.domaines.combat.value +
              "+" +
              systemData.bonus_esquive.value;
          } else {
            systemData.derives.esquive.jet =
              systemData.caracs.adresse.value +
              " . " +
              systemData.domaines.combat.value;
            systemData.derives.esquive.value =
              "1d" +
              systemData.caracs.adresse.value +
              "+1d" +
              systemData.domaines.combat.value +
              "+" +
              systemData.bonus_esquive.value;
          }
        }
      }
    } else {
      systemData.derives.esquive.jet =
        systemData.derives.esquive.d1.value +
        " . " +
        systemData.derives.esquive.d2.value +
        " . " +
        systemData.derives.esquive.d3.value;
      systemData.derives.esquive.value =
        "1d" +
        systemData.derives.esquive.d1.value +
        "+1d" +
        systemData.derives.esquive.d2.value +
        "+1d" +
        systemData.derives.esquive.d3.value +
        "+" +
        systemData.bonus_esquive.value;
    }
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
