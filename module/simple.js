/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { SimpleActor } from "./actor.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleActorSheet } from "./actor-sheet.js";
import { SimplePNJActorSheet } from "./pnj-actor-sheet.js";
import { SimpleContenantSheet } from "./contenant-sheet.js";
import { Arme_de_Tir_Sheet } from "./arme-de-tir-sheet.js";
import { Arme_courte_Sheet } from "./arme-courte-sheet.js";
import { Arme_de_melee_Sheet } from "./arme-de-melee-sheet.js";
import { Arme_lancer_Sheet } from "./arme-lancer-sheet.js";
import { Arme_longue_Sheet } from "./arme-longue-sheet.js";
import { Protection_Sheet } from "./protection-sheet.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  console.log(`Initializing MEGA System`);

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    // formula: "1d@domaines.combat.value+1d@caracs.vivacite.value+@bonus_initiative.value",
    formula:
      "1d@derives.initiative.d1+1d@derives.initiative.d2+1d@bonus_initiative.value",
    decimals: 0,
  };

  game.mega = {
    SimpleActor,
    SimpleItemSheet,
    SimpleActorSheet,
    SimplePNJActorSheet,
    SimpleContenantSheet,
    Arme_lancer_Sheet,
    Arme_de_melee_Sheet,
    Arme_longue_Sheet,
    Arme_de_Tir_Sheet,
    Arme_courte_Sheet,
    Protection_Sheet,
  };

  // Define custom Entity classes
  CONFIG.Actor.documentClass = SimpleActor;

  // Register sheet application classes
  Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  Actors.registerSheet("mega", SimpleActorSheet, {
    types: ["PJ"],
    makeDefault: true,
  });
  Actors.registerSheet("mega", SimplePNJActorSheet, {
    types: ["PNJ"],
    makeDefault: true,
  });
  Actors.registerSheet("mega", SimpleContenantSheet, {
    types: ["contenant"],
    makeDefault: true,
  });
  Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  Items.registerSheet("mega", SimpleItemSheet, {
    types: ["item"],
    makeDefault: true,
  });
  Items.registerSheet("mega", Arme_de_Tir_Sheet, {
    types: ["Arme de tir"],
    makeDefault: true,
  });
  Items.registerSheet("mega", Arme_lancer_Sheet, {
    types: ["Arme de lancer"],
    makeDefault: true,
  });
  Items.registerSheet("mega", Arme_longue_Sheet, {
    types: ["Arme longue"],
    makeDefault: true,
  });
  Items.registerSheet("mega", Arme_courte_Sheet, {
    types: ["Arme courte"],
    makeDefault: true,
  });
  Items.registerSheet("mega", Arme_de_melee_Sheet, {
    types: ["Mêlée"],
    makeDefault: true,
  });
  Items.registerSheet("mega", Protection_Sheet, {
    types: ["Protection"],
    makeDefault: true,
  });

  Handlebars.registerHelper("ifequal", function (v1, v2, options) {
    if (v1 == v2) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("ispair", function (v1, options) {
    if (v1 % 2 == 0) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("isimpair", function (v1, options) {
    if (v1 % 2 != 0) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("cleanHTML", function (str) {
    if (str === null || str === "") {
      return false;
    } else {
      str = str.toString();
      return str.replace(/<[^>]*>/g, "");
    }
  });

  // Register system settings
  game.settings.register("worldbuilding", "macroShorthand", {
    name: "Shortened Macro Syntax",
    hint: "Enable a shortened macro syntax which allows referencing attributes directly, for example @str instead of @attributes.str.value. Disable this setting if you need the ability to reference the full attribute model, for example @attributes.str.label.",
    scope: "world",
    type: Boolean,
    default: true,
    config: true,
  });

  game.settings.register("mega", "effets_optionnels", {
    name: "Jouer les effets optionnels",
    hint: "Si coché, les effets optionnels de combat seront appliqués",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("mega", "bagarre_av0", {
    name: "Bagarre - Avantage 0",
    hint: "Points de mmêlée perdus pour 0Av",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register("mega", "bagarre_av1", {
    name: "Bagarre - Avantage 1",
    hint: "Points de mmêlée perdus pour 1Av",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register("mega", "bagarre_av2", {
    name: "Bagarre - Avantage 2",
    hint: "Points de mmêlée perdus pour 2Av",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register("mega", "bagarre_av3", {
    name: "Bagarre - Avantage 3",
    hint: "Points de mmêlée perdus pour 3Av",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register("mega", "bagarre_av4", {
    name: "Bagarre - Avantage 4",
    hint: "Points de mmêlée perdus pour 4Av et +",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  $(document).on("click", ".conso_marge", function () {
    let effet_0av_1 = $(this).data("effet_0av_1");
    let effet_0av_2 = $(this).data("effet_0av_2");
    let effet_0av_3 = $(this).data("effet_0av_3");
    let type_jet = $(this).data("type-jet");
    let assomme = "";
    let effet_coup1 = "";
    let effet_coup2 = "";
    let effet_coup3 = "";

    //let Nom_acteur=this.actor.data.data.name;
    let melee_perdue = $(this).data("melee");
    let comp = $(this).data("comp");
    let marge = $(this).data("marge");
    let temp_vie_perdue = melee_perdue % 2;
    let vie_perdue = Math.floor(melee_perdue / 2);
    let currentTarget = Array.from(game.user.targets)[0].actor;
    let spe6 = currentTarget.data.data.spes.rg_spe6.value;
    let result_diff =
      "<div class='card-header'><span> " + type_jet + "</span></div> ";
    if (temp_vie_perdue === 1 && vie_perdue !== 0) {
      // bouton mais melee>1
      if (spe6 == 0) {
        //game.modules.get("bad-ideas-toolkit").api.documentUpdate(currentTarget, {"data.spes.rg_spe6.value": 1});
        spe6 = 1;
      } else {
        spe6 = 0;
        //game.modules.get("bad-ideas-toolkit").api.documentUpdate(currentTarget, {"data.spes.rg_spe6.value": 0});
        vie_perdue = vie_perdue + 1;
      }
    }
    if (temp_vie_perdue === 1 && vie_perdue === 0) {
      // bouton mais melee=1
      if (spe6 == 0) {
        spe6 = 1;
        // game.modules.get("bad-ideas-toolkit").api.documentUpdate(currentTarget,{"data.spes.rg_spe6.value": 1});
      } else {
        spe6 = 0;
        //game.modules.get("bad-ideas-toolkit").api.documentUpdate(currentTarget,{"data.spes.rg_spe6.value": 0});
        vie_perdue = 1;
      }
    }

    game.modules
      .get("bad-ideas-toolkit")
      .api.documentUpdate(currentTarget, { "data.spes.rg_spe6.value": spe6 })
      .then(() => {
        game.modules
          .get("bad-ideas-toolkit")
          .api.documentUpdate(currentTarget, {
            "data.health.value":
              currentTarget.data.data.health.value - vie_perdue,
          });
      })
      .then(() => {
        game.modules
          .get("bad-ideas-toolkit")
          .api.documentUpdate(currentTarget, {
            "data.power.value":
              currentTarget.data.data.power.value - melee_perdue,
          });
      });

    result_diff =
      result_diff +
      '<p style="background-color:#A3B6BB; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 18px;";><i class="fab fa-battle-net"></i> ' +
      currentTarget.data.name +
      " perd " +
      melee_perdue +
      ' points de melee</p><p style="background-color:#A3B6BB; color:white; text-align:center; text-shadow: 1px 1px 2px black; font-size: 18px;";><i class="far fa-heart"></i> ' +
      currentTarget.data.name +
      " perd " +
      vie_perdue +
      " points de vie</p>";

    switch (effet_0av_1) {
      case "H":
        effet_coup1 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : HANDICAPER</H2></div></Span>';
        break;
      case "A":
        effet_coup1 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : ASSOMMER</H2></div></Span>';
        break;
      case "S":
        effet_coup1 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : SONNER</H2></div></Span>';
        break;
      case "R":
        effet_coup1 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : RENVERSER</H2></div></Span>';
        break;
      case "I":
        effet_coup1 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : IMMOBILISER</H2></div></Span>';
        break;
      case "P":
        effet_coup1 =
          '<span><div style="background-color:#33CEFF; text-align:center;"><h2>Prochaine action : POSITIONNEMENT</H2></div></Span>';
        break;
      case "T":
        effet_coup1 =
          '<span><div style="background-color:red; text-align:center;"><h2>Prochaine attaque : TENIR A DISTANCE</H2></div></Span>';
        break;
      case "D":
        effet_coup1 =
          '<span><div style="background-color:#18657D"><h2>Prochaine défense : DÉFAUT DE LA CUIRASSE</H2></div></Span>';
        break;
    }
    switch (effet_0av_2) {
      case "H":
        effet_coup2 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : HANDICAPER</H2></div></Span>';
        break;
      case "A":
        effet_coup2 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : ASSOMMER</H2></div></Span>';
        break;
      case "S":
        effet_coup2 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : SONNER</H2></div></Span>';
        break;
      case "R":
        effet_coup2 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : RENVERSER</H2></div></Span>';
        break;
      case "I":
        effet_coup2 =
          '<span><div style="background-color:green; text-align:center;"><h2>Immédiat : IMMOBILISER</H2></div></Span>';
        break;
      case "P":
        effet_coup2 =
          '<span><div style="background-color:#33CEFF; text-align:center;"><h2>Prochaine action : POSITIONNEMENT</H2></div></Span>';
        break;
      case "T":
        effet_coup2 =
          '<span><div style="background-color:red; text-align:center;"><h2>Prochaine attaque : TENIR A DISTANCE</H2></div></Span>';
        break;
      case "D":
        effet_coup2 =
          '<span><div style="background-color:#18657D; text-align:center;"><h2>Prochaine défense : DÉFAUT DE LA CUIRASSE</H2></div></Span>';
        break;
    }
    switch (effet_0av_3) {
      case "H":
        effet_coup3 =
          '<span><div style="background-color:green"><h2>Immédiat : HANDICAPER</H2></div></Span>';
        break;
      case "A":
        effet_coup3 =
          '<span><div style="background-color:green"><h2>Immédiat : ASSOMMER</H2></div></Span>';
        break;
      case "S":
        effet_coup3 =
          '<span><div style="background-color:green"><h2>Immédiat : SONNER</H2></div></Span>';
        break;
      case "R":
        effet_coup3 =
          '<span><div style="background-color:green"><h2>Immédiat : RENVERSER</H2></div></Span>';
        break;
      case "I":
        effet_coup3 =
          '<span><div style="background-color:green"><h2>Immédiat : IMMOBILISER</H2></div></Span>';
        break;
      case "P":
        effet_coup3 =
          '<span><div style="background-color:#33CEFF"><h2>Prochaine action : POSITIONNEMENT</H2></div></Span>';
        break;
      case "T":
        effet_coup3 =
          '<span><div style="background-color:red"><h2>Prochaine attaque : TENIR A DISTANCE</H2></div></Span>';
        break;
      case "D":
        effet_coup3 =
          '<span><div style="background-color:#18657D"><h2>Prochaine défense : DÉFAUT DE LA CUIRASSE</H2></div></Span>';
        break;
    }
    game.modules
      .get("bad-ideas-toolkit")
      .api.documentUpdate(currentTarget, { "data.spes.rg_spe6.value": spe6 });
    if (currentTarget.data.data.power.value - melee_perdue <= 0) {
      assomme =
        '<span><p style="background-color:red; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
        currentTarget.data.name +
        " est assommé !</p></span>";
    }
    result_diff =
      result_diff + effet_coup1 + effet_coup2 + effet_coup3 + assomme;
    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: result_diff,
    };
    ChatMessage.create(chatData, {});
  });
});
