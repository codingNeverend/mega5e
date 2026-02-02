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

  game.settings.register("mega", "effets_speciaux", {
    name: "Jouer les effets spéciaux",
    hint: "Si coché, les effets optionnels de combat seront appliqués. Pour fonctionner, le module Sequencer doit être chargé et actif.",
    scope: "world",
    config: true,
    default: isSequencerLoaded,
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

  ColorPicker.register(
    "mega",
    "TableTraitColor",
    {
      name: "Couleur de fond de la table de Traits",
      scope: "client",
      config: true,
      default: "#FFA02053",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  ColorPicker.register(
    "mega",
    "TableTalentColor",
    {
      name: "Couleur de fond de la table de Talents",
      scope: "client",
      config: true,
      default: "#FFA02053",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  ColorPicker.register(
    "mega",
    "TablePouvoirColor",
    {
      name: "Couleur de fond de la table de Pouvoirs",
      scope: "client",
      config: true,
      default: "#33FF3B44",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  ColorPicker.register(
    "mega",
    "TableSpesColor",
    {
      name: "Couleur de fond de la table de Spes",
      scope: "client",
      config: true,
      default: "#FFE38544",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  ColorPicker.register(
    "mega",
    "TableCombatColor",
    {
      name: "Couleur de fond de la table de Combat",
      scope: "client",
      config: true,
      default: "#FF641444",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  ColorPicker.register(
    "mega",
    "TableProtectionColor",
    {
      name: "Couleur de fond de la table des Protections",
      scope: "client",
      config: true,
      default: "#FF552944",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

  ColorPicker.register(
    "mega",
    "InventoryColor",
    {
      name: "Couleur de fond de l'inventaire",
      scope: "client",
      config: true,
      default: "#63221040",
    },
    {
      format: "hexa",
      alphaChannel: true,
    },
  );

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
    let temp_vie_perdue = melee_perdue % 2;
    let vie_perdue = Math.floor(melee_perdue / 2);
    let currentTarget = Array.from(game.user.targets)[0].actor;
    let spe6 = currentTarget.system.spes.rg_spe6.value;
    let result_diff =
      "<div class='card-header'><span> " + type_jet + "</span></div> ";
    if (temp_vie_perdue === 1 && vie_perdue !== 0) {
      vie_perdue = vie_perdue;
    }
    if (temp_vie_perdue === 1 && vie_perdue === 0) {
      vie_perdue = 1;
    }
    const retraitAuto = game.settings.get("mega", "retraitAuto");

    if (retraitAuto) {
      const megaAPI = getMegaAPI();
      if (megaAPI) {
        megaAPI
          .documentUpdate(currentTarget, {
            "system.health.value":
              currentTarget.system.health.value - vie_perdue,
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
      '<p class="result_diff">' +
      // '<i class="fab fa-battle-net"></i> ' +
      game.user.targets.values().next().value.name +
      " perd " +
      melee_perdue +
      ' points de mêlée</p><p class="result_diff">' +
      // '<i class="far fa-heart"></i> ' +
      game.user.targets.values().next().value.name +
      " perd " +
      vie_perdue +
      " points de vie</p>";

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
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    };
    ChatMessage.create(chatData, {});
  });
});

// Fonction pour afficher la page d'accueil avec fond d'image
async function showWelcomeScreen() {
  // Charge le contenu du fichier HTML
  const response = await fetch("systems/mega/templates/welcome.html");
  const htmlContent = await response.text();

  // Crée une dialog avec le fond d'image
  new Dialog(
    {
      title: "Bienvenue dans MEGA 5ème Paradigme",
      content: `
      <div style="
        background-image: url('systems/mega/images/Backgrounds/table.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        min-height: 500px;
        padding: 20px;
        border-radius: 8px;
        color: white;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      ">
        <div style="
          background-color: rgba(0, 0, 0, 0.7);
          padding: 20px;
          border-radius: 8px;
          backdrop-filter: blur(2px);
        ">
          ${htmlContent}
        </div>
      </div>
    `,
      buttons: {
        ok: {
          label: "Commencer l'aventure !",
          callback: () => {},
        },
      },
      default: "ok",
      render: (html) => {
        // Gère le lien vers les paramètres si présent
        const settingsLink = html.find("#settings-link");
        if (settingsLink.length) {
          settingsLink.on("click", function (event) {
            event.preventDefault();
            if (typeof game !== "undefined" && game.settings) {
              game.settings.sheet.render(true);
            }
          });
        }
      },
    },
    {
      width: 800,
      height: 600,
      resizable: true,
    },
  ).render(true);
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
  // Check if player or GM has already launched the world
  if (!game.user.getFlag("mega", "firstLaunch")) {
    // Crée une scène par défaut avec image de fond si aucune scène n'existe
    await createDefaultScene();

    // Affiche la page d'accueil avec le fond d'image
    showWelcomeScreen();

    // Mark world as launched for this player or GM
    await game.user.setFlag("mega", "firstLaunch", true);
  }
  const IMG_PATH = foundry.utils.getRoute("systems/mega/images/logo.png");
  const LOGO_ID = "mega-logo";
  const STYLE_ID = "mega-logo-style";

  // Cleanup
  document.getElementById(LOGO_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  // Creation
  const a = document.createElement("a");
  a.id = LOGO_ID;
  a.href = "#";
  a.ariaLabel = "Accueil";

  const img = document.createElement("img");
  img.src = IMG_PATH;
  img.alt = "Mega";
  a.appendChild(img);

  document.body.appendChild(a);

  // Styles
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${LOGO_ID} {
      position: absolute;
      top: 40px;           /* hauteur par rapport au haut de l’écran */
      left: 50%;           /* centre horizontalement */
      transform: translateX(-50%); /* offset by half for true centering */
      z-index: 1000;
    }
    #${LOGO_ID} img {
      height: 60px;
      width: auto;
      display: block;
    }
  `;
  document.head.appendChild(style);
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
    // Create and display the dialog box
    options.renderSheet = false;
    let d = new Dialog({
      title: "Nouveau PJ créé",
      content: `
        <p><b>${actor.name}</b> a été créé. Sélectionnez son type :</p>
        <center><select id="typeActor">
          <option value="MEGA">MEGA</option>
          <option value="Contact">Contact</option>
        </select><br><br>
      `,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            let typeActor = html.find("#typeActor").val();
            actor.update({ "system.type_acteur": typeActor });
            // actor.sheet.render(true);
          },
        },
      },
      default: "ok",
      render: (html) => {
        // Apply high z-index to the dialog box
        html.closest(".dialog").css("z-index", 9999);
      },
    });
    d.render(true);
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
      // Notre dialog personnalisé
      const dialog = new Dialog(
        {
          title: "Créer un Acteur",
          content: `
          <style>
            .mega-actor-creation {
              padding: 25px;
              text-align: center;
              font-family: "Signika", sans-serif;
            }
            .mega-actor-creation input[type="text"] {
              width: 100%;
              margin-bottom: 25px;
              padding: 12px;
              border: 2px solid #ddd;
              border-radius: 8px;
              font-size: 16px;
              text-align: center;
              background: #f8f9fa;
              transition: all 0.3s ease;
            }
            .mega-actor-creation input[type="text"]:focus {
              outline: none;
              border-color: var(--accent-color);
              background: #fff;
              box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
            }
            .mega-radio-group {
              display: flex;
              justify-content: center;
              gap: 40px;
              margin: 30px 0;
            }
            .mega-radio-option {
              display: flex;
              flex-direction: column;
              align-items: center;
              cursor: pointer;
              padding: 20px;
              border: 3px solid #e9ecef;
              border-radius: 12px;
              background: #f8f9fa;
              transition: all 0.3s ease;
              min-width: 140px;
            }
            .mega-radio-option:hover {
              background: rgba(0, 123, 255, 0.1);
              border-color: var(--accent-color);
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,123,255,0.15);
            }
            .mega-radio-option.selected {
              background: rgba(0, 123, 255, 0.15);
              border-color: var(--accent-color);
              box-shadow: 0 4px 12px rgba(0,123,255,0.2);
            }
            .mega-radio-option input[type="radio"] {
              margin-bottom: 12px;
              width: 20px;
              height: 20px;
              appearance: none;
              -webkit-appearance: none;
              border: 2px solid #ddd;
              border-radius: 50%;
              background: #fff;
              transition: all 0.3s ease;
              cursor: pointer;
            }
            .mega-radio-option input[type="radio"]:checked {
              background: #000;
              border-color: #000;
              box-shadow: inset 0 0 0 3px #fff;
            }
            .mega-radio-option input[type="radio"]:hover {
              border-color: var(--accent-color);
            }
            .mega-radio-option label {
              font-weight: 600;
              color: #495057;
              cursor: pointer;
              font-size: 14px;
              text-align: center;
            }
            .mega-radio-option.selected label {
              color: #000;
            }
          </style>
          <div class="mega-actor-creation">
            <input type="text" id="mega-actor-name" placeholder="Nom du personnage" autofocus />
            
            <div class="mega-radio-group">
              <div class="mega-radio-option selected" data-type="PJ">
                <input type="radio" id="mega-type-pj" name="mega-actor-type" value="PJ" checked />
                <label for="mega-type-pj">Personnage<br>Joueur</label>
              </div>
              
              <div class="mega-radio-option" data-type="PNJ">
                <input type="radio" id="mega-type-pnj" name="mega-actor-type" value="PNJ" />
                <label for="mega-type-pnj">Personnage<br>Non-Joueur</label>
              </div>
            </div>
          </div>
        `,
          buttons: {
            create: {
              icon: '<i class="fas fa-check"></i>',
              label: "Créer",
              callback: async (html) => {
                const name = html.find("#mega-actor-name").val().trim();
                const type = html
                  .find('input[name="mega-actor-type"]:checked')
                  .val();

                if (!name) {
                  ui.notifications.warn(
                    "Veuillez saisir un nom pour l'acteur.",
                  );
                  return;
                }

                // Préparer les données pour la création
                const createData = foundry.utils.mergeObject(
                  {
                    name: name,
                    type: type,
                    system: {},
                  },
                  data,
                );

                try {
                  const actor = await Actor.create(createData, options);
                  resolve(actor);
                  if (actor) {
                    actor.sheet.render(true);
                  }
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
            // Gestion interactive des boutons radio
            html.find(".mega-radio-option").on("click", function () {
              const $this = $(this);
              const radioInput = $this.find('input[type="radio"]');

              // Décocher tous les autres
              html.find(".mega-radio-option").removeClass("selected");
              html.find('input[type="radio"]').prop("checked", false);

              // Cocher celui-ci
              $this.addClass("selected");
              radioInput.prop("checked", true);
            });

            // Création avec Entrée
            html.find("#mega-actor-name").on("keypress", function (e) {
              if (e.which === 13) {
                html.find('.dialog-button[data-button="create"]').click();
              }
            });

            // Auto-focus sur le champ nom
            setTimeout(() => {
              html.find("#mega-actor-name").focus();
            }, 100);
          },
        },
        {
          width: 450,
          height: 420,
          classes: ["mega-actor-dialog"],
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
  root.style.setProperty(
    "--table-traits",
    game.settings.get("mega", "TableTraitColor"),
  );
  root.style.setProperty(
    "--table-talents",
    game.settings.get("mega", "TableTalentColor"),
  );

  root.style.setProperty(
    "--table-pouvoirs",
    game.settings.get("mega", "TablePouvoirColor"),
  );
  root.style.setProperty(
    "--table-spes",
    game.settings.get("mega", "TableSpesColor"),
  );
  root.style.setProperty(
    "--table-combat",
    game.settings.get("mega", "TableCombatColor"),
  );
  root.style.setProperty(
    "--table-protections",
    game.settings.get("mega", "TableProtectionColor"),
  );
  root.style.setProperty(
    "--table-inventaire",
    game.settings.get("mega", "InventoryColor"),
  );
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
  if (!sequencerModule) {
    ui.notifications.error(
      "Pour que les effets spéciaux fonctionnent, il vous faut installer le module Sequencer",
    );
    game.settings.set("mega", "effets_speciaux", false);
  } else if (!sequencerModule.active) {
    new Dialog({
      title: "Activer Sequencer",
      content:
        "<p>Pour que les effets spéciaux fonctionnent, il vous faut activer le module Sequencer. Voulez-vous l'activer ?</p>",
      buttons: {
        yes: {
          label: "Oui",
          callback: async () => {
            await game.settings.set("core", "moduleConfiguration", {
              ...game.settings.get("core", "moduleConfiguration"),
              sequencer: true,
            });
            ui.notifications.info("Le module Sequencer a été activé.");
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

Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  // Bouton de verrouillage
  buttons.unshift({
    class: "my-button",
    icon:
      app.object.system.verouille === 1 ? "fas fa-lock" : "fas fa-lock-open",
    label: "Verrouillage",
    onclick: async () => {
      const actor = app.object;
      const currentValue = actor.system.verouille;
      const newValue = currentValue === 1 ? 0 : 1;
      await actor.update({ "system.verouille": newValue });
      ui.notifications.info(
        `La fiche est maintenant ${
          newValue === 1 ? "vérouillée" : "dévérouillée"
        } !`,
      );

      // Update button icon
      setTimeout(() => {
        const button = document.querySelector(".my-button i");
        if (button) {
          button.className =
            newValue === 1 ? "fas fa-lock" : "fas fa-lock-open";
        }
      }, 100);
    },
  });

  // Reduction button (only for "contact" type sheets)
  if (app.object.type === "PNJ") {
    buttons.unshift({
      class: "reduce-button",
      icon:
        app.object.system.reduit === 1 ? "fas fa-maximize" : "fas fa-minimize",
      label: "Type acteur",
      onclick: async () => {
        const actor = app.object;
        const currentValue = actor.system.reduit;
        const newValue = currentValue === 1 ? 0 : 1;
        await actor.update({ "system.reduit": newValue });
        ui.notifications.info(
          `La fiche est en mode ${
            newValue === 1 ? "comparse/figurant" : "acteur"
          } !`,
        );

        // Update button icon
        setTimeout(() => {
          const button = document.querySelector(".reduce-button i");
          if (button) {
            button.className =
              newValue === 1 ? "fas fa-maximize" : "fas fa-minimize";
          }
        }, 100);

        // Changer la taille de la fiche
        app.setPosition({
          width: newValue === 1 ? 860 : 898,
          height: newValue === 1 ? 568 : 745,
        });
      },
    });
  }
});

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
    "Si coché, les effets optionnels de combat seront appliqués. Pour fonctionner, le module <b>Sequencer</b> doit être chargé et actif.",
  );

  // Trouver UNIQUEMENT les paramètres MEGA spécifiques
  let megaSettings = $();

  // Chercher chaque paramètre MEGA individuellement pour éviter tout conflit
  const megaSettingNames = [
    // Paramètres généraux en premier
    "mega.courtMetrage",
    "mega.effets_speciaux",
    "mega.retraitAuto",
    // Interface en second
    "mega.AccentColor",
    "mega.TableTraitColor",
    "mega.TableTalentColor",
    "mega.TablePouvoirColor",
    "mega.TableSpesColor",
    "mega.TableCombatColor",
    "mega.TableProtectionColor",
    "mega.InventoryColor",
    "mega.Corners",
    // Combat en dernier
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
    // Ajouter le logo MEGA en haut de la page de configuration
    const $form = megaSettings.first().closest("form");
    const $existingLogo = $form.find(".mega-logo-header");

    if ($existingLogo.length === 0) {
      const $logoHeader = $(`
        <div class="mega-logo-header" style="text-align: center; margin: 20px 0 30px 0; padding: 20px; background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(218,165,32,0.05) 100%); border: 2px solid rgba(218,165,32,0.3); border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <img src="systems/mega/images/logo.png" alt="MEGA Logo" style="max-height: 80px; max-width: 300px; margin-bottom: 10px;">
          <h2 style="margin: 10px 0 0 0; color: #2c3e50; font-size: 24px; font-weight: bold; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);font-family: 'Mega', sans-serif;">Configuration du Système MEGA</h2>
        </div>
      `);

      // Insérer le logo avant le premier paramètre MEGA
      megaSettings.first().before($logoHeader);
    }

    // Traiter chaque paramètre MEGA individuellement
    megaSettings.each(function () {
      const $setting = $(this);
      const $input = $setting.find("input, range-picker");
      const settingKey = $input.attr("name");

      // Vérifier que c'est bien un paramètre MEGA
      if (settingKey && settingKey.startsWith("mega.")) {
        // Ajouter des classes spécifiques
        $setting.addClass("mega-setting-item");
        $setting.attr("data-setting-key", settingKey.replace("mega.", ""));

        // Déterminer le type de groupe pour ce paramètre
        const isGeneralGroup =
          settingKey === "mega.courtMetrage" ||
          settingKey === "mega.effets_speciaux" ||
          settingKey === "mega.retraitAuto";
        const isInterfaceGroup =
          settingKey.includes("Color") || settingKey === "mega.Corners";

        // Appliquer les styles individuels SEULEMENT pour les groupes combat (bagarre, charge, pouvoir)
        if (!isGeneralGroup && !isInterfaceGroup) {
          $setting.css({
            background:
              "linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(218,165,32,0.05) 100%)",
            border: "2px solid rgba(218,165,32,0.3)",
            "border-radius": "8px",
            padding: "15px",
            margin: "10px 0",
            "box-shadow": "0 2px 8px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease",
          });

          // Couleurs spécifiques selon le type de paramètre
          if (settingKey.includes("bagarre")) {
            $setting.addClass("mega-bagarre-setting");
            $setting.css("border-left", "5px solid #dc3545");
          } else if (settingKey.includes("charge")) {
            $setting.addClass("mega-charge-setting");
            $setting.css("border-left", "5px solid #fd7e14");
          } else if (settingKey.includes("pouvoir")) {
            $setting.addClass("mega-pouvoir-setting");
            $setting.css("border-left", "5px solid #6f42c1");
          }
        } else {
          // Pour les groupes general et interface, appliquer un style simple
          $setting.css({
            padding: "8px",
            margin: "5px 0",
            background: "transparent",
            border: "none",
          });
        }

        // Améliorer l'apparence des labels
        const $label = $setting.find("label");
        if ($label.length > 0) {
          $label.css({
            "font-weight": "bold",
            color: "#2c3e50",
            "text-shadow": "1px 1px 2px rgba(255,255,255,0.8)",
            "font-size": "14px",
          });
        }

        // Améliorer l'apparence des descriptions
        const $hint = $setting.find(".hint");
        if ($hint.length > 0) {
          $hint.css({
            "font-style": "italic",
            color: "#6c757d",
            "font-size": "12px",
            "margin-top": "5px",
            padding: "5px",
            background: "rgba(255,255,255,0.5)",
            "border-radius": "4px",
            "border-left": "3px solid #17a2b8",
          });
        }
      }
    });

    // Créer des séparateurs visuels entre les groupes de paramètres
    let currentGroup = "";
    let currentSubGroup = "";
    let mediaContainerCreated = false;

    megaSettings.each(function () {
      const $setting = $(this);
      const $input = $setting.find("input, range-picker");
      const settingKey = $input.attr("name");
      let newGroup = "";
      let newSubGroup = "";

      if (settingKey && settingKey.startsWith("mega.")) {
        // Groupes organisés par fonction
        if (
          settingKey === "mega.courtMetrage" ||
          settingKey === "mega.effets_speciaux" ||
          settingKey === "mega.retraitAuto"
        ) {
          newGroup = "general";
        } else if (
          settingKey.includes("Color") ||
          settingKey === "mega.Corners"
        ) {
          newGroup = "interface";
        } else if (
          settingKey.includes("bagarre") ||
          settingKey.includes("charge") ||
          settingKey.includes("pouvoir")
        ) {
          newGroup = "medias";
          if (settingKey.includes("bagarre")) {
            newSubGroup = "bagarre";
          } else if (settingKey.includes("charge")) {
            newSubGroup = "charge";
          } else if (settingKey.includes("pouvoir")) {
            newSubGroup = "pouvoir";
          }
        }

        // Créer le groupe principal Médias si on entre dans la section médias
        if (newGroup === "medias" && !mediaContainerCreated) {
          const mediaSeparator = $(`
            <div class="mega-group-separator" style="margin: 25px 0 15px 0; padding: 0; border: none;">
              <h3 class="mega-group-title" style="font-size: 18px; font-weight: bold; color: #2c3e50; text-align: center; margin: 0; padding: 12px 20px; background: linear-gradient(90deg, rgba(218,165,32,0.1) 0%, rgba(218,165,32,0.3) 50%, rgba(218,165,32,0.1) 100%); border: 2px solid rgba(218,165,32,0.4); border-radius: 25px; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">Médias</h3>
            </div>
          `);

          const mediaContainer = $(`
            <div class="mega-medias-container" style="background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(218,165,32,0.05) 100%); border: 2px solid rgba(218,165,32,0.3); border-radius: 12px; padding: 15px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            </div>
          `);

          $setting.before(mediaSeparator);
          $setting.before(mediaContainer);
          mediaContainerCreated = true;
        }

        if (newGroup && newGroup !== currentGroup) {
          let groupTitle = "";
          switch (newGroup) {
            case "general":
              groupTitle = "Paramètres Généraux";
              break;
            case "interface":
              groupTitle = "Interface";
              break;
          }

          // Créer le séparateur de titre seulement pour general et interface
          if (newGroup === "general" || newGroup === "interface") {
            const separator = $(`
              <div class="mega-group-separator" style="margin: 25px 0 15px 0; padding: 0; border: none;">
                <h3 class="mega-group-title" style="font-size: 18px; font-weight: bold; color: #2c3e50; text-align: center; margin: 0; padding: 12px 20px; background: linear-gradient(90deg, rgba(218,165,32,0.1) 0%, rgba(218,165,32,0.3) 50%, rgba(218,165,32,0.1) 100%); border: 2px solid rgba(218,165,32,0.4); border-radius: 25px; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">${groupTitle}</h3>
              </div>
            `);

            const groupContainer = $(
              `<div class="mega-group-container" style="background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(218,165,32,0.05) 100%); border: 2px solid rgba(218,165,32,0.3); border-radius: 12px; padding: 15px; margin: 10px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`,
            );
            $setting.before(separator);
            $setting.before(groupContainer);
            groupContainer.append($setting);
          }

          currentGroup = newGroup;
        }

        // Gérer les sous-groupes dans Médias
        if (
          newGroup === "medias" &&
          newSubGroup &&
          newSubGroup !== currentSubGroup
        ) {
          let subGroupTitle = "";
          switch (newSubGroup) {
            case "bagarre":
              subGroupTitle = "Bagarre";
              break;
            case "charge":
              subGroupTitle = "Charge";
              break;
            case "pouvoir":
              subGroupTitle = "Pouvoirs Psychiques";
              break;
          }

          // Créer le sous-séparateur
          const subSeparator = $(`
            <div class="mega-subgroup-separator" style="margin: 15px 0 10px 0; padding: 0; border: none;">
              <h4 class="mega-subgroup-title" style="font-size: 16px; font-weight: bold; color: #2c3e50; text-align: left; margin: 0; padding: 8px 15px; background: rgba(218,165,32,0.2); border-left: 4px solid rgba(218,165,32,0.6); border-radius: 8px; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">${subGroupTitle}</h4>
            </div>
          `);

          // Ajouter le sous-séparateur dans le conteneur médias
          const $mediaContainer = $setting
            .prevAll(".mega-medias-container")
            .first();
          if ($mediaContainer.length > 0) {
            $mediaContainer.append(subSeparator);
          }

          currentSubGroup = newSubGroup;
        }

        // Ajouter les paramètres aux bons conteneurs
        if (newGroup === "general" || newGroup === "interface") {
          const $container = $setting.prevAll(".mega-group-container").first();
          if ($container.length > 0) {
            $container.append($setting);
          }
        } else if (newGroup === "medias") {
          const $mediaContainer = $setting
            .prevAll(".mega-medias-container")
            .first();
          if ($mediaContainer.length > 0) {
            $mediaContainer.append($setting);
          }
        }
      }
    });

    // Réorganiser l'ordre : Interface après Paramètres Généraux, puis Médias
    if (megaSettings.length > 0) {
      const $form = megaSettings.first().closest("form");
      if ($form.length > 0) {
        const $generalSeparator = $form
          .find(".mega-group-separator")
          .filter(function () {
            return $(this).text().includes("Paramètres Généraux");
          });
        const $generalContainer = $generalSeparator.next(
          ".mega-group-container",
        );

        const $interfaceSeparator = $form
          .find(".mega-group-separator")
          .filter(function () {
            return $(this).text().includes("Interface");
          });
        const $interfaceContainer = $interfaceSeparator.next(
          ".mega-group-container",
        );

        const $mediasSeparator = $form
          .find(".mega-group-separator")
          .filter(function () {
            return $(this).text().includes("Médias");
          });
        const $mediasContainer = $mediasSeparator.next(
          ".mega-medias-container",
        );

        // Ordre souhaité : Général, Interface, puis Médias
        if ($generalContainer.length > 0 && $interfaceSeparator.length > 0) {
          $generalContainer.after($interfaceSeparator);
          $interfaceSeparator.after($interfaceContainer);
        }

        if ($interfaceContainer.length > 0 && $mediasSeparator.length > 0) {
          $interfaceContainer.after($mediasSeparator);
          $mediasSeparator.after($mediasContainer);
        }
      }
    }
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
