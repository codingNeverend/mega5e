/* -------------------------------------------- */
/*  Module imports                              */
/* -------------------------------------------- */

import { MegaActor } from "./actor.js";
import { MegaItemSheet } from "./item-sheet.js";
import { MegaActorSheet } from "./actor-sheet.js";
import { MegaPNJActorSheet } from "./pnj-actor-sheet.js";
import { Arme_de_Tir_Sheet } from "./arme-de-tir-sheet.js";
import { Arme_courte_Sheet } from "./arme-courte-sheet.js";
import { Arme_de_melee_Sheet } from "./arme-de-melee-sheet.js";
import { Arme_lancer_Sheet } from "./arme-lancer-sheet.js";
import { Arme_longue_Sheet } from "./arme-longue-sheet.js";
import { Protection_Sheet } from "./protection-sheet.js";
import { Pouvoir_Sheet } from "./pouvoir-sheet.js";
import "./color-picker.js";
import { api } from "./socket.js";
import { getMegaAPI, safeDocumentUpdate } from "./mega-utils.js";

/* --------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* --------------------------------------------- */

const MODULE_ID = "ui-mega";
const FULL_BLUR = "saturate(50%) blur(10px)";

const DEFAULT_ACCENT_COLOR = "#5380d4";
const DEFAULT_BLUR_LEVEL = "Medium";
const DEFAULT_CORNER_RADIUS = "15";

const BLUR_BG_LIGHT_DEFAULT = "#ffffff66"; //windows background color
const BLUR_BG_THICK_LIGHT_DEFAULT = "#d2d2d2fa";
const BLUR_FG_LIGHT_DEFAULT = "#ffffff";
const BLUR_FG_BRIGHT_LIGHT_DEFAULT = "#ffffff";
const TEXT_COLOR_LIGHT_DEFAULT = "#1e1e1e"; // Force noir pour mode clair
const TEXT_HEADING_LIGHT_DEFAULT = "black";

const BLUR_BG_DARK_DEFAULT = "#262626db";
const BLUR_BG_THICK_DARK_DEFAULT = "#2d2d2dfc";
const BLUR_FG_DARK_DEFAULT = "#212121a3";
const BLUR_FG_BRIGHT_DARK_DEFAULT = "#171717fc";
const TEXT_COLOR_DARK_DEFAULT = "#1e1e1e"; // Force noir pour mode sombre aussi
const TEXT_HEADING_DARK_DEFAULT = "white";

Hooks.once("init", async function () {
  console.log(`Initializing MEGA System`);
  console.log(`Vie et Dignité MEGA !`);
  /**
   *
   * Initiative de base
   * @type {String}
   */

  CONFIG.Combat.initiative = {
    formula:
      "1d@derives.initiative.d1+1d@derives.initiative.d2+1d@bonus_initiative.value",
    decimals: 0,
  };

  game.mega = {
    MegaActor,
    MegaItemSheet,
    MegaActorSheet,
    MegaPNJActorSheet,
    Arme_lancer_Sheet,
    Arme_de_melee_Sheet,
    Arme_longue_Sheet,
    Arme_de_Tir_Sheet,
    Arme_courte_Sheet,
    Protection_Sheet,
    Pouvoir_Sheet,
    get api() {
      return globalThis.megaS || game.systems.get("mega")?.api || null;
    },
  };

  // Define custom Entity classes
  CONFIG.Actor.documentClass = MegaActor;

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet(
    "core",
    foundry.appv1.sheets.ActorSheet,
  );
  foundry.documents.collections.Items.unregisterSheet(
    "core",
    foundry.appv1.sheets.ItemSheet,
  );
  foundry.documents.collections.Actors.registerSheet("mega", MegaActorSheet, {
    types: ["PJ"],
    makeDefault: true,
  });
  foundry.documents.collections.Actors.registerSheet(
    "mega",
    MegaPNJActorSheet,
    {
      types: ["PNJ"],
      makeDefault: true,
    },
  );
  foundry.documents.collections.Items.registerSheet("mega", MegaItemSheet, {
    types: ["item"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("mega", MegaItemSheet, {
    types: ["Objet"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("mega", Arme_de_Tir_Sheet, {
    types: ["Arme de tir"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("mega", Arme_lancer_Sheet, {
    types: ["Arme de lancer"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("mega", Arme_longue_Sheet, {
    types: ["Arme longue"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("mega", Arme_courte_Sheet, {
    types: ["Arme courte"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet(
    "mega",
    Arme_de_melee_Sheet,
    {
      types: ["Attaque spéciale"],
      makeDefault: true,
    },
  );
  foundry.documents.collections.Items.registerSheet("mega", Protection_Sheet, {
    types: ["Protection"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("mega", Pouvoir_Sheet, {
    types: ["Pouvoir"],
    makeDefault: true,
  });

  // Creating new Handlebars for character sheet structuring
  Handlebars.registerHelper("ifequal", function (v1, v2, options) {
    if (v1 == v2) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("ifdifferent", function (v1, v2, options) {
    if (v1 != v2) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("ifinferior", function (v1, v2, options) {
    if (v1 <= v2) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("ifsuperior", function (v1, v2, options) {
    if (v1 > v2) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("ispair", function (v1, options) {
    if (v1 % 2 == 0) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("or", function (v1, v2, options) {
    // If used as simple helper (not as block), return boolean result
    if (typeof options === "undefined") {
      return v1 || v2;
    }
    // If used as block helper
    if (typeof options.fn === "function") {
      if (v1 || v2) {
        return options.fn(this);
      } else {
        return typeof options.inverse === "function"
          ? options.inverse(this)
          : "";
      }
    }
    // Fallback: return boolean result
    return v1 || v2;
  });

  Handlebars.registerHelper("split_second_term", function (text, separator) {
    return text.split(separator)[1];
  });

  Handlebars.registerHelper("isimpair", function (v1, options) {
    if (v1 % 2 != 0) return options.fn(this);
    else return options.inverse(this);
  });

  Handlebars.registerHelper("isactive", function (value) {
    if (value || value == null) return value;
  });

  Handlebars.registerHelper("cleanHTML", function (str) {
    if (str === null || str === "") {
      return false;
    } else {
      str = str.toString();
      return str.replace(/<[^>]*>/g, "");
    }
  });

  Handlebars.registerHelper("add", function (v1, v2) {
    return (parseInt(v1) || 0) + (parseInt(v2) || 0);
  });

  Handlebars.registerHelper("range", function (n) {
    return Array.from({ length: parseInt(n) || 0 }, (_, i) => i + 1);
  });

  game.settings.register("mega", "courtMetrage", {
    name: "Mode Court Métrage",
    hint: "Si coché, la liste des talents est simplifiée.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  // game.settings.register("mega", "effets_speciaux", {
  //   name: "Play special effects",
  //   hint: "If checked, optional combat effects will be applied",
  //   scope: "world",
  //   config: true,
  //   default: true,
  //   type: Boolean,
  // });

  const isSequencerLoaded = game.modules.get("sequencer")?.active ?? false;
  const isFXMasterLoaded = game.modules.get("fxmaster")?.active ?? false;

  game.settings.register("mega", "effets_speciaux", {
    name: "Jouer les effets spéciaux",
    hint: "Si coché, les effets optionnels de combat seront appliqués. Pour fonctionner, les modules Sequencer et Gambit's FX Master doivent être chargés et actifs.",
    scope: "world",
    config: true,
    default: isSequencerLoaded && isFXMasterLoaded,
    type: Boolean,
    onChange: (value) => {
      if (value) {
        checkSequencer();
      }
    },
  });

  game.settings.register("mega", "retraitAuto", {
    name: "Retrait des points automatique",
    hint: "Si coché, les dégâts, points de vie, d'ardence et résonnance seront retirés automatiquement",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("mega", "hideWindow", {
    name: "Hide Custom Window",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("mega", "sheetWheelTabs", {
    name: "Navigation des onglets à la molette",
    hint: "Si coché, la molette de la souris permet de changer d'onglet sur les fiches PJ et PNJ.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  // Paramètres pour les effets vidéo et sonores de bagarre
  game.settings.register("mega", "bagarre_video_path", {
    name: "Vidéo associée",
    hint: "Chemin vers la vidéo d'effet pour les attaques de bagarre",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("mega", "bagarre_son_path", {
    name: "Son associé",
    hint: "Chemin vers le fichier audio pour les attaques de bagarre",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Paramètres pour les effets vidéo et sonores de charge
  game.settings.register("mega", "charge_video_path", {
    name: "Vidéo associée",
    hint: "Chemin vers la vidéo d'effet pour les attaques de charge",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("mega", "charge_son_path", {
    name: "Son associé",
    hint: "Chemin vers le fichier audio pour les attaques de charge",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  // Paramètres pour les effets vidéo et sonores de pouvoir
  game.settings.register("mega", "pouvoir_video_path", {
    name: "Vidéo associée",
    hint: "Chemin vers la vidéo d'effet pour les pouvoirs psychiques",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register("mega", "pouvoir_son_path", {
    name: "Son associé",
    hint: "Chemin vers le fichier audio pour les pouvoirs psychiques",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  //   game.settings.register("mega", "AccentColor", {
  //     name: "Couleur d'accentuation",
  //     default: 2,
  //     type: Number,
  //     scope: "client",
  //     config: true,
  //     choices: ["Bleu", "Rouge", "Orange", "Menthe", "Jaune", "Violet", "Rose", "Turquoise", "Vert clair", "Marron", "Gris", "Noir", "Blanc", "Cyan", "Magenta", "Lime", "Olive", "Or", "Argent", "Bronze"],
  // });

  ColorPicker.register(
    "mega",
    "AccentColor",
    {
      name: "Couleur d'accentuation",
      scope: "client",
      config: true,
      default: "#FFA500FF",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  // ColorPicker.register(
  //   "mega",
  //   "TableTraitColor",
  //   {
  //     name: "Couleur de fond de la table de Traits",
  //     scope: "client",
  //     config: true,
  //     default: "#FFA02053",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  // ColorPicker.register(
  //   "mega",
  //   "TableTalentColor",
  //   {
  //     name: "Couleur de fond de la table de Talents",
  //     scope: "client",
  //     config: true,
  //     default: "#FFA02053",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  // ColorPicker.register(
  //   "mega",
  //   "TablePouvoirColor",
  //   {
  //     name: "Couleur de fond de la table de Pouvoirs",
  //     scope: "client",
  //     config: true,
  //     default: "#33FF3B44",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  // ColorPicker.register(
  //   "mega",
  //   "TableSpesColor",
  //   {
  //     name: "Couleur de fond de la table de Spes",
  //     scope: "client",
  //     config: true,
  //     default: "#FFE38544",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  // ColorPicker.register(
  //   "mega",
  //   "TableCombatColor",
  //   {
  //     name: "Couleur de fond de la table de Combat",
  //     scope: "client",
  //     config: true,
  //     default: "#FF641444",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  // ColorPicker.register(
  //   "mega",
  //   "TableProtectionColor",
  //   {
  //     name: "Couleur de fond de la table des Protections",
  //     scope: "client",
  //     config: true,
  //     default: "#FF552944",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  // ColorPicker.register(
  //   "mega",
  //   "InventoryColor",
  //   {
  //     name: "Couleur de fond de l'inventaire",
  //     scope: "client",
  //     config: true,
  //     default: "#63221040",
  //   },
  //   {
  //     format: "hexa",
  //     alphaChannel: true,
  //   },
  // );

  game.settings.register("mega", "Corners", {
    name: "Coins arrondis",
    hint: "Change comment les coins sont arrondis.",
    default: 1,
    type: Number,
    default: 15,
    scope: "client",
    config: true,
    range: { min: 5, max: 20, step: 1 },
  });

  ApplySettings();

  const courtMetrage = game.settings.get("mega", "courtMetrage");
  Handlebars.registerHelper("courtMetrage", () => courtMetrage);

  $(document).on("click", ".conso_marge", function () {
    let effet_0av_1 = $(this).data("effet_0av_1");
    let effet_0av_2 = $(this).data("effet_0av_2");
    let effet_0av_3 = $(this).data("effet_0av_3");
    let type_jet = $(this).data("type-jet");
    let assomme = "";
    let effet_coup1 = "";
    let effet_coup2 = "";
    let effet_coup3 = "";

    //let Nom_acteur=this.actor.system.name;
    let melee_perdue = $(this).data("melee");
    let comp = $(this).data("comp");
    let marge = $(this).data("marge");
    let currentTarget = Array.from(game.user.targets)[0].actor;
    // Calcul cumulatif : on accumule les pts de mêlée impairs entre les coups
    const melee_impair = Number(currentTarget.system.melee_impair ?? 0);
    const total_melee = melee_perdue + melee_impair;
    let vie_perdue = Math.floor(total_melee / 2);
    const new_melee_impair = total_melee % 2;
    let spe6 = currentTarget.system.spes.rg_spe6.value;
    let result_diff =
      "<div class='card-header'><span> " + type_jet + "</span></div> ";
    const retraitAuto = game.settings.get("mega", "retraitAuto");

    if (retraitAuto) {
      const megaAPI = getMegaAPI();
      if (megaAPI) {
        megaAPI
          .documentUpdate(currentTarget, {
            "system.health.value":
              currentTarget.system.health.value - vie_perdue,
            "system.melee_impair": new_melee_impair,
          })
          .then(() => {
            megaAPI.documentUpdate(currentTarget, {
              "system.power.value":
                currentTarget.system.power.value - melee_perdue,
            });
          });
      } else {
        console.error(
          "MEGA API non disponible pour la mise à jour automatique",
        );
      }
    }

    result_diff =
      result_diff +
      '<div class="mega-roll-damage-melee"><i class="fas fa-shield-alt"></i> ' +
      game.user.targets.values().next().value.name +
      " perd <strong>" +
      melee_perdue +
      "</strong>pt de Mêlée</div>" +
      '<div class="mega-roll-damage-vie"><i class="fas fa-heart"></i> ' +
      game.user.targets.values().next().value.name +
      " perd <strong>" +
      vie_perdue +
      "</strong>pt de Vie</div>";

    switch (effet_0av_1) {
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
    switch (effet_0av_2) {
      case "H":
        effet_coup2 =
          '<span><div class="chat_effet_immediat">Immédiat : HANDICAPER</div></Span>';
        break;
      case "A":
        effet_coup2 =
          '<span><div class="chat_effet_immediat">Immédiat : ASSOMMER</div></Span>';
        break;
      case "S":
        effet_coup2 =
          '<span><div class="chat_effet_immediat">Immédiat : SONNER</div></Span>';
        break;
      case "R":
        effet_coup2 =
          '<span><div class="chat_effet_immediat">Immédiat : RENVERSER</div></Span>';
        break;
      case "I":
        effet_coup2 =
          '<span><div class="chat_effet_immediat">Immédiat : IMMOBILISER</div></Span>';
        break;
      case "P":
        effet_coup2 =
          '<span><div class="chat_effet_action">Prochaine action : POSITIONNEMENT</div></Span>';
        break;
      case "T":
        effet_coup2 =
          '<span><div class="chat_effet_att">Prochaine attaque : TENIR A DISTANCE</div></Span>';
        break;
      case "D":
        effet_coup2 =
          '<span><div style="background-color:#18657D; text-align:center;">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
        break;
    }
    switch (effet_0av_3) {
      case "H":
        effet_coup3 =
          '<span><div style="background-color:green">Immédiat : HANDICAPER</div></Span>';
        break;
      case "A":
        effet_coup3 =
          '<span><div style="background-color:green">Immédiat : ASSOMMER</div></Span>';
        break;
      case "S":
        effet_coup3 =
          '<span><div style="background-color:green">Immédiat : SONNER</div></Span>';
        break;
      case "R":
        effet_coup3 =
          '<span><div style="background-color:green">Immédiat : RENVERSER</div></Span>';
        break;
      case "I":
        effet_coup3 =
          '<span><div style="background-color:green">Immédiat : IMMOBILISER</div></Span>';
        break;
      case "P":
        effet_coup3 =
          '<span><div style="background-color:#33CEFF">Prochaine action : POSITIONNEMENT</div></Span>';
        break;
      case "T":
        effet_coup3 =
          '<span><div style="background-color:red">Prochaine attaque : TENIR A DISTANCE</div></Span>';
        break;
      case "D":
        effet_coup3 =
          '<span><div class="chat_effet_def">Prochaine défense : DÉFAUT DE LA CUIRASSE</div></Span>';
        break;
    }

    if (currentTarget.system.power.value - melee_perdue <= 0) {
      assomme =
        '<span><p style="padding:5px; background-color:red; color:white; font-size: 18px; text-align:center; text-shadow: 1px 1px 2px black;">' +
        game.user.targets.values().next().value.name +
        " est assommé(e) !</p></span>";
    }
    result_diff =
      result_diff + effet_coup1 + effet_coup2 + effet_coup3 + assomme;
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker(),
      content: result_diff,
      author: game.user.id,
    };
    ChatMessage.create(chatData, {});
  });
});

// Fonction pour afficher le message de bienvenue dans le chat
async function showWelcomeScreen() {
  // Détection du thème FoundryVTT
  const isDarkTheme =
    document.body.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches ||
    !window.matchMedia("(prefers-color-scheme: light)").matches;

  // Styles pour thème sombre
  const darkStyles = {
    container:
      "border: 2px solid #ff6600; border-radius: 10px; padding: 15px; background: transparent; color: #000000; margin: 10px 0;",
    title: "color: #ff6600; text-align: center; margin: 0 0 15px 0;",
    text: "margin: 10px 0;",
    quote:
      "border-left: 3px solid #ff6600; padding-left: 15px; margin: 15px 0; font-style: italic; color: #3a3737;",
    quoteHighlight: "margin: 5px 0; color: #ff6600;",
    quoteLine: "margin: 5px 0;",
    hr: "border: 1px solid #ff6600; margin: 15px 0;",
    footer: "margin: 10px 0; font-size: 0.9em; color: #cccccc;",
  };

  // Styles pour thème clair
  const lightStyles = {
    container:
      "border: 2px solid #ff6600; border-radius: 10px; padding: 15px; background: transparent; color: #212529; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
    title: "color: #ff6600; text-align: center; margin: 0 0 15px 0;",
    text: "margin: 10px 0;",
    quote:
      "border-left: 3px solid #ff6600; padding-left: 15px; margin: 15px 0; font-style: italic; color: #6c757d; background-color: rgba(255, 102, 0, 0.05); border-radius: 5px; padding: 10px 15px;",
    quoteHighlight: "margin: 5px 0; color: #ff6600; font-weight: bold;",
    quoteLine: "margin: 5px 0;",
    hr: "border: 1px solid #ff6600; margin: 15px 0;",
    footer: "margin: 10px 0; font-size: 0.9em; color: #6c757d;",
  };

  const styles = isDarkTheme ? darkStyles : lightStyles;

  // Contenu du message de bienvenue adaptatif
  const welcomeMessage = `
    <div style="${styles.container}">
      <h3 style="${styles.title}">🌟 MEGA 5ème Paradigme 🌟</h3>
      <p style="${styles.text}"><strong>Bienvenue dans Mega 5ème paradigme !</strong></p>
      <p style="${styles.text}">Cher aventurier,</p>
      <p style="${styles.text}">Nous sommes ravis de vous accueillir dans l'univers captivant de <strong>Mega 5ème paradigme</strong>.</p>
      <p style="${styles.text}">Préparez-vous à explorer des mondes inconnus, à relever des défis épiques et à vivre des aventures inoubliables.</p>
      <p style="${styles.text}">Que vous soyez un vétéran de Mega ou un nouveau venu, ce système est conçu pour offrir une expérience immersive et dynamique. Plongez dans l'action, laissez libre cours à votre imagination et faites de chaque session un moment mémorable.</p>
      <p style="${styles.text}"><strong>Bon jeu et que l'aventure commence !</strong></p>
      <div style="${styles.quote}">
        <p style="${styles.quoteLine}">&laquo; Quand la puissance galactique est désarmée,</p>
        <p style="${styles.quoteLine}">Quand un grain de sable menace l'univers entier,</p>
        <p style="${styles.quoteLine}">Ou que le bout de l'univers est trop loin,</p>
        <p style="${styles.quoteLine}">Quand un génie distrait s'est perdu dans le cosmos,</p>
        <p style="${styles.quoteLine}">Quand un inconscient a pris la mauvaise porte,</p>
        <p style="${styles.quoteLine}">Quand un maître de l'univers en veut encore plus,</p>
        <p style="${styles.quoteLine}">Quand soudain les poules ont toujours eu des dents,</p>
        <p style="${styles.quoteLine}">Il serait peut-être temps d'appeler les</p>
        <p style="${styles.quoteHighlight}"><strong>Messagers galactiques</strong>... &raquo;</p>
      </div>
      <hr style="${styles.hr}">
      <p style="${styles.footer}">
        <i class="fas fa-info-circle"></i> Vous pouvez modifier l'apparence de votre interface ou activer les effets spéciaux dans les paramètres de Mega 5ème paradigme.
      </p>
      <p style="${styles.footer}">Pour les effets spéciaux, le module Sequencer est nécessaire.</p>
    </div>
  `;

  // Envoie le message de bienvenue dans le chat
  ChatMessage.create({
    content: welcomeMessage,
    whisper: [game.user.id], // Message privé pour l'utilisateur qui lance le monde
    speaker: {
      alias: "Système MEGA",
    },
  });
}

// Fonction pour créer une scène par défaut avec image de fond
async function createDefaultScene() {
  // Vérifie s'il n'y a pas déjà de scènes
  if (game.scenes.size === 0) {
    try {
      const sceneData = {
        name: "Bienvenue MEGA",
        background: {
          src: "systems/mega/images/Backgrounds/mega_V.png",
        },
        backgroundColor: "#000000",
        width: 1877,
        height: 1000,
        padding: 0.1,
        initial: true,
        navigation: true,
        navOrder: 0,
        grid: {
          type: 0, // Square grid
          size: 100,
          color: "#000000",
          alpha: 1.0,
        },
        tokenVision: true,
        fogExploration: false,
        globalLight: true,
        globalLightThreshold: null,
        darkness: 0,
        playlistSound: null,
      };

      const scene = await Scene.create(sceneData);
      if (scene) {
        // Active la scène par défaut
        await scene.activate();
        console.log("MEGA: Scène par défaut créée et activée");
      }
    } catch (error) {
      console.error(
        "MEGA: Erreur lors de la création de la scène par défaut",
        error,
      );
    }
  }
}

Hooks.once("ready", async () => {
  // const IMG_PATH = foundry.utils.getRoute("systems/mega/images/logo.png");
  // const LOGO_ID = "mega-logo";
  // const STYLE_ID = "mega-logo-style";
  // document.getElementById(LOGO_ID)?.remove();
  // document.getElementById(STYLE_ID)?.remove();
  // const a = document.createElement("a");
  // a.id = LOGO_ID;
  // a.href = "#";
  // a.ariaLabel = "Accueil";
  // const img = document.createElement("img");
  // img.src = IMG_PATH;
  // img.alt = "Mega";
  // a.appendChild(img);
  // document.body.appendChild(a);
  // const style = document.createElement("style");
  // style.id = STYLE_ID;
  // style.textContent = `
  //   #${LOGO_ID} {
  //     position: absolute;
  //     top: 40px;           /* hauteur par rapport au haut de l’écran */
  //     left: 50%;           /* centre horizontalement */
  //     transform: translateX(-50%); /* offset by half for true centering */
  //     z-index: 1000;
  //   }
  //   #${LOGO_ID} img {
  //     height: 60px;
  //     width: auto;
  //     display: block;
  //   }
  // `;
  // document.head.appendChild(style);
});

// Hook pour afficher le message de bienvenue après les messages de FoundryVTT
Hooks.once("ready", async () => {
  // Check if player or GM has already launched the world
  if (!game.user.getFlag("mega", "firstLaunch")) {
    console.log(
      "MEGA: Premier lancement détecté, affichage du message de bienvenue",
    );

    // Affiche le message de bienvenue avec un délai pour laisser FoundryVTT afficher ses messages
    setTimeout(() => {
      console.log("MEGA: Affichage du message de bienvenue");
      showWelcomeScreen();
    }, 5000); // Délai de 5 secondes pour s'assurer que les messages de FoundryVTT sont affichés

    // Mark world as launched for this player or GM
    await game.user.setFlag("mega", "firstLaunch", true);
  } else {
    console.log("MEGA: Message de bienvenue déjà affiché");
  }
});

Hooks.on("createItem", (item, options, userId) => {
  if (item.parent && item.parent.isOwner) {
    ui.notifications.info(
      `${item.parent.name} possède un nouvel item : ${item.name} de type ${item.type}`,
    );
  }
});

Hooks.on("createActor", (actor, options, userId) => {
  if (userId === game.user.id && actor.type === "PJ") {
    // On attend que la fiche se rende en premier, puis on affiche le dialog par-dessus
    setTimeout(() => {
      // Ferme la fiche si elle est déjà visible
      if (actor.sheet.rendered) actor.sheet.close({ force: true });

      let d = new Dialog(
        {
          title: "Nouveau Personnage",
          content: `
          <div class="mcpj-body">
            <div class="mcpj-banner">
              <span class="mcpj-banner-sub">Configuration du profil</span>
            </div>
            <div class="mcpj-content">
              <div class="mcpj-intro">
                <i class="fas fa-user-astronaut"></i>
                <span><strong>${actor.name}</strong> a été créé. Configurez son profil :</span>
              </div>
              <div class="mcpj-subtitle"><span>Profil</span></div>
              <div class="mcpj-field">
                <div class="mcpj-field-icon"><i class="fas fa-id-badge"></i></div>
                <div class="mcpj-field-label">Type</div>
                <div class="mcpj-radio-group">
                  <label class="mcpj-radio-btn"><input type="radio" name="typeActor" value="MEGA" checked><span>MEGA</span></label>
                  <label class="mcpj-radio-btn"><input type="radio" name="typeActor" value="Contact"><span>Contact</span></label>
                </div>
              </div>
              <div class="mcpj-field">
                <div class="mcpj-field-icon"><i class="fas fa-venus-mars"></i></div>
                <div class="mcpj-field-label">Sexe</div>
                <div class="mcpj-radio-group">
                  <label class="mcpj-radio-btn"><input type="radio" name="sexeActor" value=""><span>—</span></label>
                  <label class="mcpj-radio-btn"><input type="radio" name="sexeActor" value="Masculin" checked><span>Masculin</span></label>
                  <label class="mcpj-radio-btn"><input type="radio" name="sexeActor" value="Féminin"><span>Féminin</span></label>
                  <label class="mcpj-radio-btn"><input type="radio" name="sexeActor" value="Autre"><span>Autre</span></label>
                </div>
              </div>
            </div>
          </div>
          `,
          buttons: {
            ok: {
              icon: '<i class="fas fa-check-circle"></i>',
              label: "Confirmer",
              callback: (html) => {
                let typeActor = html
                  .find('input[name="typeActor"]:checked')
                  .val();
                let sexeActor =
                  html.find('input[name="sexeActor"]:checked').val() ?? "";
                const updateData = {
                  "system.type_acteur": typeActor,
                  "system.sexe": sexeActor,
                };
                if (sexeActor === "Féminin") {
                  updateData["system.biography"] =
                    actor.system.biography.replace(
                      "silouhettePJH.png",
                      "silouhettePJF.png",
                    );
                }
                actor.update(updateData).then(() => actor.sheet.render(true));
              },
            },
          },
          default: "ok",
        },
        {
          width: 380,
          classes: ["mega-create-pj-dialog", "window-dialog"],
        },
      );
      d.render(true);
    }, 200);
  }
});

Hooks.on("updateSetting", (setting) => {
  if (setting.key === "mega.courtMetrage") {
    const courtMetrage = setting.value;
    for (let app of Object.values(ui.windows)) {
      if (app instanceof MegaActorSheet) {
        app.setPosition({
          width: courtMetrage ? 824 : 873,
          height: courtMetrage ? 572 : 753,
        });
      }
    }
    location.reload();
  }
});

Hooks.on("closeSettingsConfig", function () {
  ApplySettings();
});

// Hook pour personnaliser la création d'acteur - Version améliorée
Hooks.once("ready", () => {
  // Sauvegarder la méthode originale
  const originalCreateDialog = Actor.createDialog;

  // Surcharger la méthode createDialog
  Actor.createDialog = function (data = {}, options = {}) {
    return new Promise((resolve, reject) => {
      const dialog = new Dialog(
        {
          title: "Création d'un personnage",
          content: `
          <div class="mcd-body">
            <div class="mcd-banner">
              <span class="mcd-banner-title">Nouveau Personnage</span>
            </div>

            <div class="mcd-content">
              <div class="mcd-name-wrap">
                <i class="fas fa-pen"></i>
                <input type="text" id="mcd-actor-name" placeholder="Nom du personnage…" autocomplete="off" />
              </div>

              <div class="mcd-type-label"><i class="fas fa-sitemap"></i>&nbsp; Type d'acteur</div>
              <div class="mcd-type-grid">
                <div class="mcd-type-card selected" data-type="PJ">
                  <input type="radio" name="mcd-actor-type" value="PJ" checked />
                  <div class="mcd-card-label">Personnage<br>Joueur</div>
                  <i class="fas fa-check mcd-card-check"></i>
                </div>
                <div class="mcd-type-card" data-type="PNJ">
                  <input type="radio" name="mcd-actor-type" value="PNJ" />
                  <div class="mcd-card-label">Personnage<br>Non-Joueur</div>
                  <i class="fas fa-check mcd-card-check"></i>
                </div>
              </div>
            </div>
          </div>
          `,
          buttons: {
            create: {
              icon: '<i class="fas fa-plus-circle"></i>',
              label: "Créer",
              callback: async (html) => {
                const name = html.find("#mcd-actor-name").val().trim();
                const type = html
                  .find('input[name="mcd-actor-type"]:checked')
                  .val();

                if (!name) {
                  ui.notifications.warn(
                    "Veuillez saisir un nom pour l'acteur.",
                  );
                  return;
                }

                const createData = foundry.utils.mergeObject(
                  { name, type, system: {} },
                  data,
                );

                try {
                  const actor = await Actor.create(createData, options);
                  resolve(actor);
                  if (actor) actor.sheet.render(true);
                } catch (error) {
                  reject(error);
                }
              },
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Annuler",
              callback: () => resolve(null),
            },
          },
          default: "create",
          render: (html) => {
            html.find(".mcd-type-card").on("click", function () {
              const $card = $(this);
              html.find(".mcd-type-card").removeClass("selected");
              html.find('input[name="mcd-actor-type"]').prop("checked", false);
              $card.addClass("selected");
              $card.find('input[type="radio"]').prop("checked", true);
            });

            html.find("#mcd-actor-name").on("keypress", function (e) {
              if (e.which === 13) {
                html.find('.dialog-button[data-button="create"]').click();
              }
            });

            setTimeout(() => html.find("#mcd-actor-name").focus(), 100);
          },
        },
        {
          width: 420,
          classes: ["mega-actor-dialog", "window-dialog"],
        },
      );

      dialog.render(true);
    });
  };

  // Surcharge pour la création d'objets/items
  const originalItemCreateDialog = Item.createDialog;

  Item.createDialog = function (data = {}, options = {}) {
    return new Promise((resolve, reject) => {
      const itemTypes = [
        {
          key: "Objet",
          label: "Objet",
          icon: "fas fa-cube",
          img: "mhc.png",
        },
        {
          key: "Arme de tir",
          label: "Arme de Tir",
          icon: "fas fa-crosshairs",
          img: "solaris.png",
        },
        {
          key: "Arme courte",
          label: "Arme Courte",
          icon: "fas fa-knife-kitchen",
          img: "stylet.png",
        },
        {
          key: "Arme de lancer",
          label: "Arme de Lancer",
          icon: "fas fa-bullseye",
          img: "shuriken.png",
        },
        {
          key: "Arme longue",
          label: "Arme Longue",
          icon: "fas fa-sword",
          img: "epee_longue.png",
        },
        {
          key: "Protection",
          label: "Protection",
          icon: "fas fa-shield-alt",
          img: "scaphandre H.png",
        },
        {
          key: "Attaque spéciale",
          label: "Attaque Spéciale",
          icon: "fas fa-fist-raised",
          img: "griffes.png",
        },
        {
          key: "Pouvoir",
          label: "Pouvoir",
          icon: "fas fa-magic",
          img: "medium.png",
        },
      ];

      const dialog = new Dialog(
        {
          title: "Création d'Objet",
          content: `
          <div class="micd-body">
            <div class="micd-banner"><span class="micd-banner-title">Nouvel Objet</span></div>
            <div class="micd-content">
              <div class="micd-name-wrap">
                <i class="fas fa-pen"></i>
                <input type="text" id="micd-item-name" placeholder="Nom de l'objet…" autocomplete="off" />
              </div>

              <div class="micd-type-label"><i class="fas fa-layer-group"></i>&nbsp; TYPE D'OBJET</div>
              <div class="micd-type-grid">
                ${itemTypes
                  .map(
                    (item, index) => `
                  <div class="micd-type-card ${index === 0 ? "selected" : ""}" data-type="${item.key}"
                       style="background-image: url('systems/mega/images/${item.img}')">
                    <input type="radio" name="micd-item-type" value="${item.key}" ${index === 0 ? "checked" : ""} />
                    <div class="micd-card-label">${item.label}</div>
                    <i class="fas fa-check micd-card-check"></i>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
          `,
          buttons: {
            create: {
              icon: '<i class="fas fa-plus-circle"></i>',
              label: "Créer",
              callback: async (html) => {
                const name = html.find("#micd-item-name").val().trim();
                const type = html
                  .find('input[name="micd-item-type"]:checked')
                  .val();

                if (!name) {
                  ui.notifications.warn("Veuillez saisir un nom pour l'objet.");
                  return;
                }

                const createData = foundry.utils.mergeObject(
                  { name, type, system: {} },
                  data,
                );

                try {
                  const item = await Item.create(createData, options);
                  resolve(item);
                  if (item) item.sheet.render(true);
                } catch (error) {
                  reject(error);
                }
              },
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Annuler",
              callback: () => resolve(null),
            },
          },
          default: "create",
          render: (html) => {
            html.find(".micd-type-card").on("click", function () {
              const $card = $(this);
              html.find(".micd-type-card").removeClass("selected");
              html.find('input[name="micd-item-type"]').prop("checked", false);
              $card.addClass("selected");
              $card.find('input[type="radio"]').prop("checked", true);
            });

            html.find("#micd-item-name").on("keypress", function (e) {
              if (e.which === 13) {
                html.find('.dialog-button[data-button="create"]').click();
              }
            });

            setTimeout(() => html.find("#micd-item-name").focus(), 100);
          },
        },
        {
          width: 490,
          classes: ["mega-item-dialog", "window-dialog"],
        },
      );

      dialog.render(true);
    });
  };
});

function adjustColor(color, percent, opacity) {
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  r = Math.min(255, Math.max(0, r + Math.round((r * percent) / 100)));
  g = Math.min(255, Math.max(0, g + Math.round((g * percent) / 100)));
  b = Math.min(255, Math.max(0, b + Math.round((b * percent) / 100)));

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function ApplySettings() {
  let root = document.documentElement;

  root.style.setProperty(
    "--accent-color",
    game.settings.get("mega", "AccentColor"),
  );

  let [harmonizedColor1, harmonizedColor2] = generateHarmonizedColors(
    game.settings.get("mega", "AccentColor"),
  );

  root.style.setProperty(
    "--opacity-color",
    adjustColor(game.settings.get("mega", "AccentColor"), 10, 0.4),
  );
  // root.style.setProperty(
  //   "--table-traits",
  //   game.settings.get("mega", "TableTraitColor"),
  // );
  // root.style.setProperty(
  //   "--table-talents",
  //   game.settings.get("mega", "TableTalentColor"),
  // );

  // root.style.setProperty(
  //   "--table-pouvoirs",
  //   game.settings.get("mega", "TablePouvoirColor"),
  // );
  // root.style.setProperty(
  //   "--table-spes",
  //   game.settings.get("mega", "TableSpesColor"),
  // );
  // root.style.setProperty(
  //   "--table-combat",
  //   game.settings.get("mega", "TableCombatColor"),
  // );
  // root.style.setProperty(
  //   "--table-protections",
  //   game.settings.get("mega", "TableProtectionColor"),
  // );
  // root.style.setProperty(
  //   "--table-inventaire",
  //   game.settings.get("mega", "InventoryColor"),
  // );
  root.style.setProperty(
    "--opacity-clear-color",
    adjustColor(game.settings.get("mega", "AccentColor"), 20, 0.2),
  );
  root.style.setProperty("--opacity2-clear-color", harmonizedColor1);
  root.style.setProperty("--opacity3-clear-color", harmonizedColor2);
  root.style.setProperty(
    "--bk-color",
    GetBackground(game.settings.get("mega", "AccentColor")),
  );
  root.style.setProperty(
    "--corner-radius",
    game.settings.get("mega", "Corners") + "px",
  );
  root.style.setProperty(
    "--cursor",
    setCursorBasedOnColor(game.settings.get("mega", "AccentColor")),
  );
  SetTheme();
  SetBlur();
}

function hexToHSL(hex) {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  // Find greatest and smallest channel values
  let cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

  // Calculate hue
  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  // Make negative hues positive behind 360°
  if (h < 0) h += 360;

  // Calculate lightness
  l = (cmax + cmin) / 2;

  // Calculate saturation
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

function HSLToHex(h, s, l, a = 1) {
  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2,
    r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255).toString(16);
  g = Math.round((g + m) * 255).toString(16);
  b = Math.round((b + m) * 255).toString(16);
  a = Math.round(a * 255).toString(16);

  if (r.length == 1) r = "0" + r;
  if (g.length == 1) g = "0" + g;
  if (b.length == 1) b = "0" + b;
  if (a.length == 1) a = "0" + a;

  return "#" + r + g + b + a;
}

function generateHarmonizedColors(hex) {
  // Convert hex to HSL
  let { h, s, l } = hexToHSL(hex);

  // Generate two harmonized colors with opacity 0.2
  let color1 = HSLToHex((h + 30) % 360, s, l, 0.2); // Analogous color
  let color2 = HSLToHex((h - 10) % 360, s, l, 0.1); // Complementary color

  return [color1, color2];
}

function getColorFamily(color) {
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  // Define thresholds for each shade
  const thresholds = {
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    orange: { r: 255, g: 165, b: 0 },
    yellow: { r: 255, g: 255, b: 0 },
    magenta: { r: 255, g: 0, b: 255 },
    cyan: { r: 0, g: 255, b: 255 },
    grey: { r: 128, g: 128, b: 128 },
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
  };

  // Fonction pour calculer la distance euclidienne entre deux couleurs
  function colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2),
    );
  }

  // Trouver la nuance la plus proche
  let closestColor = "grey";
  let minDistance = Infinity;

  for (let [key, value] of Object.entries(thresholds)) {
    let distance = colorDistance({ r, g, b }, value);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = key;
    }
  }

  return closestColor;
}
// Fonction pour changer le curseur
function setCursorBasedOnColor(color) {
  let colorFamily = getColorFamily(color);
  let cursorFile;
  console.log("Your main color, Mega : ", colorFamily);
  switch (colorFamily) {
    case "red":
      cursorFile = "url('../images/rouge.cur')";
      break;
    case "green":
      cursorFile = "url('../images/menthe.cur')";
      break;
    case "blue":
      cursorFile = "url('../images/bleu.cur')";
      break;
    case "orange":
      cursorFile = "url('../images/orange.cur')";
      break;
    case "yellow":
      cursorFile = "url('../images/jaune.cur')";
      break;
    case "magenta":
      cursorFile = "url('../images/violet.cur')";
      break;
    case "cyan":
      cursorFile = "url('../images/cyan.cur')";
      break;
    default:
      cursorFile = "url('../images/gris.cur')";
      break;
  }
  return cursorFile;
}

function GetBackground(color) {
  switch (color) {
    case 0:
      return "rgba(0, 0, 255,0.1)"; /* Default blue */
      break;
    case 1:
      return "rgba(255, 0, 0, 0.1)"; /* Red */
      break;
    case 2:
      return "rgba(255,191,0, 0.3)"; /* Orange */
      break;
    case 3:
      return "#5faa75"; /* Mint */
      break;
  }
}

function SetTheme() {
  let root = document.documentElement;

  // Detect if dark theme is active
  const isDarkTheme =
    document.body.classList.contains("theme-dark") ||
    document.documentElement.classList.contains("theme-dark") ||
    (document.body.hasAttribute("data-theme") &&
      document.body.getAttribute("data-theme") === "dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (isDarkTheme) {
    // Apply dark theme variables
    root.style.setProperty("--text-color", TEXT_COLOR_DARK_DEFAULT);
    root.style.setProperty("--text-heading", TEXT_HEADING_DARK_DEFAULT);
    root.style.setProperty("--blur-foreground", BLUR_FG_DARK_DEFAULT);
    root.style.setProperty(
      "--blur-foreground-bright",
      BLUR_FG_BRIGHT_DARK_DEFAULT,
    );
    root.style.setProperty("--icon-invert", "invert(0)");
    root.style.setProperty("--blur-background-high", BLUR_BG_DARK_DEFAULT);
    root.style.setProperty("--blur-background-med", BLUR_BG_DARK_DEFAULT);
    root.style.setProperty("--blur-background-low", BLUR_BG_DARK_DEFAULT);
    root.style.setProperty(
      "--blur-background-thick",
      BLUR_BG_THICK_DARK_DEFAULT,
    );
    root.style.setProperty("--drop-shadow", "0 0 9px #ffffff3e");
    root.style.setProperty("--barely-visible", "#ffffff4a");
    root.style.setProperty("--background-opposite", "#e8e8e8de");
  } else {
    // Apply light theme variables
    root.style.setProperty("--text-color", TEXT_COLOR_LIGHT_DEFAULT);
    root.style.setProperty("--text-heading", TEXT_HEADING_LIGHT_DEFAULT);
    root.style.setProperty("--blur-foreground", BLUR_FG_LIGHT_DEFAULT);
    root.style.setProperty(
      "--blur-foreground-bright",
      BLUR_FG_BRIGHT_LIGHT_DEFAULT,
    );
    root.style.setProperty("--icon-invert", "invert(1)");
    root.style.setProperty("--blur-background-high", BLUR_BG_LIGHT_DEFAULT);
    root.style.setProperty("--blur-background-med", BLUR_BG_LIGHT_DEFAULT);
    root.style.setProperty("--blur-background-low", BLUR_BG_LIGHT_DEFAULT);
    root.style.setProperty(
      "--blur-background-thick",
      BLUR_BG_THICK_LIGHT_DEFAULT,
    );
    root.style.setProperty("--drop-shadow", "0 0 9px #0000006e");
    root.style.setProperty("--barely-visible", "#0000004a");
    root.style.setProperty("--background-opposite", "#171717de");
  }
}

function SetBlur(blurLevel) {
  let root = document.documentElement;

  root.style.setProperty("--blur-filter-high", FULL_BLUR);
  root.style.setProperty("--blur-filter-med", FULL_BLUR);
  root.style.setProperty("--blur-filter-low", FULL_BLUR);

  root.style.setProperty("--blur-background-high", BLUR_BG_LIGHT_DEFAULT);
  root.style.setProperty("--blur-background-med", BLUR_BG_LIGHT_DEFAULT);
  root.style.setProperty("--blur-background-low", BLUR_BG_LIGHT_DEFAULT);

  //Fix for bug where control tools get misaligned with blur on
  root.style.setProperty("--control-tools-fix", "-5px");
}

async function checkSequencer() {
  const sequencerModule = game.modules.get("sequencer");
  const fxmasterModule = game.modules.get("fxmaster");

  // Construire la liste des problèmes détectés
  const missing = [];
  const inactive = [];

  if (!sequencerModule) {
    missing.push("Sequencer");
  } else if (!sequencerModule.active) {
    inactive.push("sequencer");
  }

  if (!fxmasterModule) {
    missing.push("Gambit's FX Master");
  } else if (!fxmasterModule.active) {
    inactive.push("fxmaster");
  }

  // Si des modules sont manquants, afficher une erreur et désactiver l'option
  if (missing.length > 0) {
    ui.notifications.error(
      `Pour que les effets spéciaux fonctionnent, il vous faut installer : ${missing.join(", ")}.`,
    );
    game.settings.set("mega", "effets_speciaux", false);
    return;
  }

  // Si des modules sont installés mais inactifs, proposer de les activer
  if (inactive.length > 0) {
    const names = inactive
      .map((id) => (id === "sequencer" ? "Sequencer" : "Gambit's FX Master"))
      .join(" et ");
    new Dialog({
      title: "Activer les modules requis",
      content: `<p>Pour que les effets spéciaux fonctionnent, il vous faut activer : <strong>${names}</strong>. Voulez-vous les activer ?</p>`,
      buttons: {
        yes: {
          label: "Oui",
          callback: async () => {
            const config = game.settings.get("core", "moduleConfiguration");
            for (const id of inactive) {
              config[id] = true;
            }
            await game.settings.set("core", "moduleConfiguration", config);
            ui.notifications.info(`${names} ont été activés.`);
            game.settings.set("mega", "effets_speciaux", true);
            location.reload();
          },
        },
        no: {
          label: "Non",
          callback: () => {
            game.settings.set("mega", "effets_speciaux", false);
          },
        },
      },
      default: "no",
    }).render(true);
  }
}

Hooks.on("renderGamePause", (app, html) => {
  // html is the <figure id="pause" ...> element
  const figure = html;

  if (figure && typeof figure.querySelector === "function") {
    const img = figure.querySelector("img");
    const caption = figure.querySelector("figcaption");

    if (img) {
      img.src = "systems/mega/images/logo_mega.png";
      // img.classList.remove("fa-spin");
    }
    if (caption) {
      caption.textContent = "Vie et Dignité MEGA !";
      // caption.style.textShadow = "0 0 6px #000";
    }
  }
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
  // Convert to jQuery object if needed for v13 compatibility
  const $html = html instanceof jQuery ? html : $(html);
  const hintElement = $html.find(
    'div[data-setting="mega.effets_speciaux"] .hint',
  );
  hintElement.html(
    "Si coché, les effets optionnels de combat seront appliqués. Pour fonctionner, les modules <b>Sequencer</b> et <b>Gambit's FX Master</b> doivent être chargés et actifs.",
  );

  // Trouver UNIQUEMENT les paramètres MEGA spécifiques
  let megaSettings = $();

  const megaSettingNames = [
    "mega.courtMetrage",
    "mega.effets_speciaux",
    "mega.retraitAuto",
    "mega.sheetWheelTabs",
    "mega.AccentColor",
    // "mega.TableTraitColor",
    // "mega.TableTalentColor",
    // "mega.TablePouvoirColor",
    // "mega.TableSpesColor",
    // "mega.TableCombatColor",
    // "mega.TableProtectionColor",
    // "mega.InventoryColor",
    "mega.Corners",
    "mega.bagarre_video_path",
    "mega.bagarre_son_path",
    "mega.charge_video_path",
    "mega.charge_son_path",
    "mega.pouvoir_video_path",
    "mega.pouvoir_son_path",
  ];

  megaSettingNames.forEach(function (settingName) {
    const $input = $html.find(
      `input[name="${settingName}"], range-picker[name="${settingName}"]`,
    );
    if ($input.length > 0) {
      const $container = $input.closest(".form-group");
      if ($container.length > 0) {
        megaSettings = megaSettings.add($container);
      }
    }
  });

  if (megaSettings.length > 0) {
    const $form = megaSettings.first().closest("form");

    // ── Helpers ──────────────────────────────────────────────────────────

    // Styler un form-group avec la couleur accentuée de la section
    function styleFormGroup($fg, accentColor) {
      $fg.css({
        padding: "5px 0",
        border: "none",
        background: "transparent",
        margin: "2px 0",
      });
      $fg.find("label").css({
        color: accentColor,
        "font-weight": "bold",
        "font-size": "11px",
        "text-transform": "uppercase",
        "letter-spacing": "0.6px",
        "padding-left": "6px",
        "border-left": `3px solid ${accentColor}`,
      });
      $fg.find(".hint, p.hint").css({
        "font-style": "italic",
        "font-size": "11px",
        color: "#888",
        "margin-top": "2px",
        "padding-left": "9px",
        background: "transparent",
        border: "none",
        "border-radius": "0",
      });
    }

    // Construire un bloc outer + side-label vertical coloré + body
    function buildSection(title, gradient, bodyBg, accentColor, items) {
      const r = "var(--corner-radius, 8px)";
      const $outer = $(
        `<div class="mega-settings-outer" style="display:flex; flex-direction:row; align-items:stretch; margin:8px 4px; box-shadow:rgba(0,0,0,0.12) 0px 1px 3px, rgba(0,0,0,0.24) 0px 1px 2px;"></div>`,
      );
      const $sideLabel = $(
        `<div class="mega-section-side-label" style="display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); background:${gradient}; color:#fff; font-weight:bold; font-size:9px; letter-spacing:3px; padding:10px 4px; min-width:20px; user-select:none; text-transform:uppercase; flex-shrink:0; border-radius:${r} 0 0 ${r};"></div>`,
      );
      $sideLabel.text(title);
      const $body = $(
        `<div class="mega-section-body" style="flex:1; background:${bodyBg}; padding:8px 12px 6px 10px; border-radius:0 ${r} ${r} 0;"></div>`,
      );
      items.forEach(function ($item) {
        styleFormGroup($item, accentColor);
        $body.append($item);
      });
      $outer.append($sideLabel).append($body);
      return $outer;
    }

    // Construire un sous-groupe dans la section Médias
    function buildSubGroup(
      title,
      gradient,
      bodyBg,
      accentColor,
      items,
      isLast,
    ) {
      const $sg = $(
        `<div class="mega-subgroup-outer" style="display:flex; flex-direction:row; align-items:stretch;${isLast ? "" : " border-bottom:1px solid rgba(0,0,0,0.07);"}"></div>`,
      );
      const $sgLabel = $(
        `<div class="mega-subgroup-label" style="display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); background:${gradient}; color:#fff; font-weight:bold; font-size:8px; letter-spacing:2px; padding:7px 3px; min-width:16px; user-select:none; text-transform:uppercase; flex-shrink:0;">${title}</div>`,
      );
      const $sgBody = $(
        `<div class="mega-subgroup-body" style="flex:1; background:${bodyBg}; padding:6px 10px;"></div>`,
      );
      items.forEach(function ($item) {
        styleFormGroup($item, accentColor);
        $sgBody.append($item);
      });
      $sg.append($sgLabel).append($sgBody);
      return $sg;
    }

    // ── Classer les settings par groupe ──────────────────────────────────
    const groups = {
      general: [],
      interface: [],
      bagarre: [],
      charge: [],
      pouvoir: [],
    };

    megaSettings.each(function () {
      const $s = $(this);
      const key = $s.find("input, range-picker").attr("name");
      if (!key || !key.startsWith("mega.")) return;
      if (
        [
          "mega.courtMetrage",
          "mega.effets_speciaux",
          "mega.retraitAuto",
          "mega.sheetWheelTabs",
        ].includes(key)
      ) {
        groups.general.push($s);
      } else if (key.includes("Color") || key === "mega.Corners") {
        groups.interface.push($s);
      } else if (key.includes("bagarre")) {
        groups.bagarre.push($s);
      } else if (key.includes("charge")) {
        groups.charge.push($s);
      } else if (key.includes("pouvoir")) {
        groups.pouvoir.push($s);
      }
    });

    // ── Ajouter boutons parcourir/aperçu aux champs media ────────────────
    const mediaGroups = [
      ...groups.bagarre,
      ...groups.charge,
      ...groups.pouvoir,
    ];
    const btnStyle =
      "display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border:1px solid rgba(0,0,0,0.25); border-radius:4px; background:rgba(255,255,255,0.1); cursor:pointer; color:inherit; padding:0; flex-shrink:0;";
    mediaGroups.forEach(function ($fg) {
      const $input = $fg.find("input[type='text']");
      if (!$input.length) return;
      const settingKey = $input.attr("name") || "";
      const isVideo = settingKey.includes("_video_path");
      const isAudio = settingKey.includes("_son_path");
      if (!isVideo && !isAudio) return;

      // Wrapper flex autour de l'input
      const $wrapper = $(
        '<div style="display:flex; gap:4px; align-items:center; flex:1;"></div>',
      );
      $input.css({ flex: "1", "min-width": "0" });
      $input.after($wrapper);
      $wrapper.append($input);

      if (isVideo) {
        const $browseBtn = $(
          `<button type="button" title="Parcourir les fichiers vidéo" style="${btnStyle}"><i class="fas fa-folder-open"></i></button>`,
        );
        const $previewBtn = $(
          `<button type="button" title="Aperçu de la vidéo" style="${btnStyle}"><i class="fas fa-eye"></i></button>`,
        );
        $wrapper.append($browseBtn).append($previewBtn);

        $browseBtn.on("click", function (ev) {
          ev.preventDefault();
          new FilePicker({
            type: "video",
            current: $input.val() || "",
            callback: (path) => {
              $input.val(path);
            },
          }).browse();
        });

        $previewBtn.on("click", async function (ev) {
          ev.preventDefault();
          const chemin = $input.val();
          if (!chemin || chemin.trim() === "") {
            ui.notifications.warn("Aucun fichier vidéo configuré.");
            return;
          }
          try {
            const response = await fetch(chemin, { method: "HEAD" });
            if (response.ok) {
              new Dialog(
                {
                  title: "Aperçu de l'effet vidéo",
                  content: `<div style="text-align:center;"><video width="400" controls autoplay><source src="${chemin}" type="video/webm"><source src="${chemin}" type="video/mp4">Votre navigateur ne supporte pas la lecture vidéo.</video></div>`,
                  buttons: { close: { label: "Fermer", callback: () => {} } },
                  default: "close",
                },
                { width: 460, height: 320, resizable: true },
              ).render(true);
            } else {
              ui.notifications.warn(
                "Le fichier vidéo spécifié n'est pas valide ou n'existe pas.",
              );
            }
          } catch (e) {
            ui.notifications.warn(
              "Le fichier vidéo spécifié n'est pas valide ou n'existe pas.",
            );
          }
        });
      } else {
        // Audio
        const $browseBtn = $(
          `<button type="button" title="Parcourir les fichiers audio" style="${btnStyle}"><i class="fas fa-folder-open"></i></button>`,
        );
        const $playBtn = $(
          `<button type="button" title="Écouter le son" style="${btnStyle}"><i class="fas fa-play"></i></button>`,
        );
        $wrapper.append($browseBtn).append($playBtn);

        $browseBtn.on("click", function (ev) {
          ev.preventDefault();
          new FilePicker({
            type: "audio",
            current: $input.val() || "",
            callback: (path) => {
              $input.val(path);
            },
          }).browse();
        });

        $playBtn.on("click", async function (ev) {
          ev.preventDefault();
          const chemin = $input.val();
          if (!chemin || chemin.trim() === "") {
            ui.notifications.warn("Aucun fichier audio configuré.");
            return;
          }
          try {
            const response = await fetch(chemin, { method: "HEAD" });
            if (response.ok) {
              foundry.audio.AudioHelper.play(
                { src: chemin, volume: 1, autoplay: true, loop: false },
                true,
              );
            } else {
              ui.notifications.warn(
                "Le fichier audio spécifié n'est pas valide ou n'existe pas.",
              );
            }
          } catch (e) {
            ui.notifications.warn(
              "Le fichier audio spécifié n'est pas valide ou n'existe pas.",
            );
          }
        });
      }
    });

    // ── Détacher tous les settings & nettoyer les anciens éléments ───────
    const $placeholder = $(
      '<div class="mega-settings-placeholder" style="display:none;"></div>',
    );
    megaSettings.first().before($placeholder);
    megaSettings.each(function () {
      $(this).detach();
    });
    $form
      .find(
        ".mega-settings-outer, .mega-logo-header, .mega-group-separator, .mega-group-container, .mega-medias-container, .mega-subgroup-outer",
      )
      .remove();

    // ── Logo ─────────────────────────────────────────────────────────────
    const $logoHeader = $(
      `<div class="mega-logo-header" style="text-align:center; margin:0 4px 10px 4px; padding:14px 20px 12px; background:linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(218,165,32,0.06) 100%); border:2px solid rgba(218,165,32,0.3); border-radius:var(--corner-radius,8px); box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <img src="systems/mega/images/logo.png" alt="MEGA" style="max-height:60px; max-width:260px; display:block; margin:0 auto 8px;">
        <div style="color:#c8891a; font-size:15px; font-weight:bold; letter-spacing:3px; text-transform:uppercase; font-family:'Mega',sans-serif; text-shadow:1px 1px 3px rgba(0,0,0,0.25);">Configuration du Système</div>
      </div>`,
    );

    // ── Construire les sections ───────────────────────────────────────────
    const $sectionGeneral = buildSection(
      "Paramètres Généraux",
      "linear-gradient(180deg, #1c58a1 0%, #1f78d8 100%)",
      "rgba(28,88,161,0.05)",
      "#1562b8",
      groups.general,
    );

    const $sectionInterface = buildSection(
      "Interface",
      "linear-gradient(180deg, #a06010 0%, #c8891a 100%)",
      "rgba(160,96,16,0.05)",
      "#a06010",
      groups.interface,
    );

    // Section Médias : side-label violet + 3 sous-groupes
    const $mediasOuter = $(
      `<div class="mega-settings-outer" style="display:flex; flex-direction:row; align-items:stretch; margin:8px 4px; box-shadow:rgba(0,0,0,0.12) 0px 1px 3px, rgba(0,0,0,0.24) 0px 1px 2px;"></div>`,
    );
    const $mediasLabel = $(
      `<div class="mega-section-side-label" style="display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); background:linear-gradient(180deg, #5b21b6 0%, #7c3aed 100%); color:#fff; font-weight:bold; font-size:9px; letter-spacing:3px; padding:10px 4px; min-width:20px; user-select:none; text-transform:uppercase; flex-shrink:0; border-radius:var(--corner-radius,8px) 0 0 var(--corner-radius,8px);">Médias</div>`,
    );
    const $mediasBody = $(
      `<div class="mega-section-body" style="flex:1; background:rgba(91,33,182,0.04); padding:0; border-radius:0 var(--corner-radius,8px) var(--corner-radius,8px) 0;"></div>`,
    );

    if (groups.bagarre.length > 0) {
      $mediasBody.append(
        buildSubGroup(
          "Bagarre",
          "linear-gradient(180deg, #a01e1e 0%, #5a0a0a 100%)",
          "rgba(160,30,30,0.04)",
          "#a01e1e",
          groups.bagarre,
          groups.charge.length === 0 && groups.pouvoir.length === 0,
        ),
      );
    }
    if (groups.charge.length > 0) {
      $mediasBody.append(
        buildSubGroup(
          "Charge",
          "linear-gradient(180deg, #c05010 0%, #8a3400 100%)",
          "rgba(192,80,16,0.04)",
          "#b04010",
          groups.charge,
          groups.pouvoir.length === 0,
        ),
      );
    }
    if (groups.pouvoir.length > 0) {
      $mediasBody.append(
        buildSubGroup(
          "Pouvoirs",
          "linear-gradient(180deg, #2e7d4f 0%, #1a4d30 100%)",
          "rgba(46,125,79,0.04)",
          "#2e7d4f",
          groups.pouvoir,
          true,
        ),
      );
    }
    $mediasOuter.append($mediasLabel).append($mediasBody);

    // ── Insérer dans le DOM (logo → général → interface → médias) ────────
    $placeholder.after($logoHeader);
    $logoHeader.after($sectionGeneral);
    $sectionGeneral.after($sectionInterface);
    $sectionInterface.after($mediasOuter);
    $placeholder.remove();
  }
});

// Hook pour modifier la barre latérale des paramètres
Hooks.on("renderSettings", (app, html, data) => {
  // Trouver l'élément de la barre latérale des paramètres
  const $html = html instanceof jQuery ? html : $(html);

  console.log("Hook renderSettings déclenché");
  console.log("Structure HTML:", $html[0]);

  // Diagnostic : voir tous les éléments h1, h2, h3, h4
  const $allHeadings = $html.find("h1, h2, h3, h4");
  console.log("Tous les titres trouvés:", $allHeadings.length);
  $allHeadings.each(function (index) {
    console.log(`Titre ${index}:`, $(this).text().trim());
  });

  // Diagnostic : voir tous les éléments avec class ou id contenant 'setting'
  const $settingElements = $html.find(
    '[class*="setting"], [id*="setting"], [class*="Setting"], [id*="Setting"]',
  );
  console.log("Éléments avec 'setting':", $settingElements.length);

  // Vérifier si notre logo n'est pas déjà ajouté
  const $existingMegaLogo = $html.find(".mega-sidebar-logo");

  if ($existingMegaLogo.length === 0) {
    console.log("Ajout du logo MEGA");

    const $megaSection = $(`
      <div class="mega-sidebar-logo" style="text-align: center; margin: 15px 5px; padding: 12px; background: linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(218,165,32,0.1) 100%); border: 2px solid rgba(218,165,32,0.4); border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
        <h4 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 14px; font-weight: bold; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">Système MEGA 5ème Paradigme</h4>
        <img src="systems/mega/images/logo.png" alt="MEGA Logo" style="max-height: 50px; max-width: 180px; opacity: 0.9;">
      </div>
    `);

    // Chercher la section "Paramètres de la partie"
    const $gameSettingsSection = $html.find("h4").filter(function () {
      return (
        $(this).text().includes("Paramètres de la partie") ||
        $(this).text().includes("Game Settings")
      );
    });

    console.log(
      "Section Paramètres de la partie trouvée:",
      $gameSettingsSection.length,
    );

    if ($gameSettingsSection.length > 0) {
      console.log("Insertion avant Paramètres de la partie");
      // Insérer le logo juste avant la section qui contient "Paramètres de la partie"
      $gameSettingsSection.closest("section").before($megaSection);
    } else {
      console.log("Section non trouvée, insertion en début");
      $html.find(".settings-sidebar").prepend($megaSection);
    }
  }
});
