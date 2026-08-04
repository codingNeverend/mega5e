/**
 * Utilitaires MEGA pour l'accès sécurisé à l'API
 */

let _cachedAPI = null;

/**
 * Fonction utilitaire pour accéder à l'API MEGA de façon sécurisée
 * @returns {Object|null} L'API MEGA ou null si non disponible
 */
export function getMegaAPI() {
  // Return cached API if available
  if (_cachedAPI) return _cachedAPI;

  // Try accessing via globalThis first (most reliable)
  if (typeof globalThis !== "undefined" && globalThis.megaS) {
    _cachedAPI = globalThis.megaS;
    return _cachedAPI;
  }

  // Try accessing via game.mega
  try {
    if (game?.mega?.api) {
      _cachedAPI = game.mega.api;
      return _cachedAPI;
    }
  } catch (e) {
    console.debug("MEGA: game.mega.api not available");
  }

  // Try accessing via game.systems
  try {
    const systemAPI = game?.systems?.get("mega")?.api;
    if (systemAPI) {
      _cachedAPI = systemAPI;
      return _cachedAPI;
    }
  } catch (e) {
    console.debug("MEGA: game.systems.get('mega').api not available");
  }

  console.warn("MEGA API not found in any expected location");
  return null;
}

// Reset cache when API is registered
if (typeof globalThis !== "undefined") {
  globalThis.resetMegaAPICache = () => {
    _cachedAPI = null;
  };
}

/**
 * Wrapper sécurisé pour documentUpdate
 * @param {Object} document - Le document à mettre à jour
 * @param {Object} data - Les données de mise à jour
 * @param {Object} options - Options de mise à jour
 * @returns {Promise|null} Promesse de mise à jour ou null si API indisponible
 */
export function safeDocumentUpdate(document, data, options = {}) {
  const megaAPI = getMegaAPI();
  if (megaAPI && megaAPI.documentUpdate) {
    return megaAPI.documentUpdate(document, data, options);
  } else {
    console.error(
      "MEGA API non disponible pour la mise à jour:",
      document,
      data,
    );
    return null;
  }
}

/**
 * Vérifie si le module FXMaster est installé et activé
 * @returns {boolean} True si FXMaster est disponible
 */
export function checkFXMaster() {
  return game.modules.get("fxmaster")?.active || false;
}

/**
 * Affiche un message d'erreur si FXMaster n'est pas disponible
 * @returns {boolean} True si FXMaster est disponible, False sinon
 */
export function requireFXMaster() {
  if (!checkFXMaster()) {
    ui.notifications.error(
      "Les effets dépendent du module FXMaster. Veuillez l'installer et l'activer depuis la gestion des modules.",
      { permanent: false, console: false },
    );
    return false;
  }
  return true;
}

/**
 * Lance un outil de sélection de position sur le canvas FoundryVTT.
 * Un overlay avec curseur mire s'affiche ; au clic gauche, les décalages
 * offX/offY par rapport au token sélectionné sont calculés et passés au callback.
 *
 * @param {Function} onConfirm - Callback appelé avec (offX, offY) quand la position est confirmée.
 */
export function activateOffsetPicker(onConfirm) {
  // Vérification qu'un token est sélectionné sur la carte
  const token = canvas.tokens.controlled[0];
  if (!token) {
    ui.notifications.warn(
      "Veuillez d'abord sélectionner un token sur la carte pour définir l'origine de l'animation.",
    );
    return;
  }

  // ---- Overlay principal ----
  const overlay = document.createElement("div");
  overlay.id = "mega-offset-picker-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    cursor: "crosshair",
    zIndex: "9999",
    background: "transparent",
  });

  // ---- Viseur (SVG) ----
  const crosshair = document.createElement("div");
  Object.assign(crosshair.style, {
    position: "absolute",
    pointerEvents: "none",
    width: "40px",
    height: "40px",
    transform: "translate(-50%, -50%)",
    transition: "left 0s, top 0s",
  });
  crosshair.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="0"  x2="20" y2="16" stroke="#ff4444" stroke-width="2.5"/>
      <line x1="20" y1="24" x2="20" y2="40" stroke="#ff4444" stroke-width="2.5"/>
      <line x1="0"  y1="20" x2="16" y2="20" stroke="#ff4444" stroke-width="2.5"/>
      <line x1="24" y1="20" x2="40" y2="20" stroke="#ff4444" stroke-width="2.5"/>
      <circle cx="20" cy="20" r="6" stroke="#ff4444" stroke-width="2.5" fill="none"/>
      <circle cx="20" cy="20" r="1.5" fill="#ff4444"/>
    </svg>`;
  overlay.appendChild(crosshair);

  // ---- Tooltip de coordonnées ----
  const tooltip = document.createElement("div");
  Object.assign(tooltip.style, {
    position: "absolute",
    pointerEvents: "none",
    background: "rgba(0,0,0,0.78)",
    color: "#fff",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
  });
  tooltip.textContent = "offX: 0, offY: 0";
  overlay.appendChild(tooltip);

  // ---- Bandeau d'instruction ----
  const instruction = document.createElement("div");
  Object.assign(instruction.style, {
    position: "fixed",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.82)",
    color: "#fff",
    padding: "8px 18px",
    borderRadius: "8px",
    fontSize: "14px",
    zIndex: "10000",
    pointerEvents: "none",
    boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,100,100,0.5)",
  });
  instruction.innerHTML =
    "<i class='fas fa-crosshairs' style='color:#ff4444;margin-right:6px'></i>" +
    "Cliquez sur la carte pour définir l'origine de l'animation. " +
    "<kbd style='background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:3px;'>Échap</kbd> pour annuler.";
  instruction.id = "mega-offset-picker-instruction";

  document.body.appendChild(overlay);
  document.body.appendChild(instruction);

  // ---- Helpers ----
  const getCanvasCoords = (clientX, clientY) => {
    // canvas.canvasCoordinatesFromClient est l'API officielle FoundryVTT v11+
    if (typeof canvas.canvasCoordinatesFromClient === "function") {
      const pt = canvas.canvasCoordinatesFromClient({ x: clientX, y: clientY });
      return { worldX: pt.x, worldY: pt.y };
    }
    // Fallback : la worldTransform PIXI est en coordonnées écran absolues,
    // donc on ne soustrait PAS rect.left/top
    const t = canvas.stage.worldTransform;
    return {
      worldX: (clientX - t.tx) / t.a,
      worldY: (clientY - t.ty) / t.d,
    };
  };

  // Centre du token (0,0 de référence pour offX/offY)
  const getTokenCenter = () => {
    const center = token.center;
    if (center) return center;
    // Fallback si .center n'est pas disponible
    return {
      x: token.x + (token.w ?? token.width ?? 0) / 2,
      y: token.y + (token.h ?? token.height ?? 0) / 2,
    };
  };

  const cleanup = () => {
    overlay.remove();
    instruction.remove();
    document.removeEventListener("keydown", onKeyDown);
  };

  // ---- Événements ----
  overlay.addEventListener("mousemove", (ev) => {
    crosshair.style.left = ev.clientX + "px";
    crosshair.style.top = ev.clientY + "px";

    const { worldX, worldY } = getCanvasCoords(ev.clientX, ev.clientY);
    const center = getTokenCenter();
    const offX = Math.round(worldX - center.x);
    const offY = Math.round(worldY - center.y);

    tooltip.style.left = ev.clientX + 18 + "px";
    tooltip.style.top = ev.clientY + 18 + "px";
    tooltip.textContent = `offX: ${offX},  offY: ${offY}`;
  });

  overlay.addEventListener("click", (ev) => {
    const { worldX, worldY } = getCanvasCoords(ev.clientX, ev.clientY);
    const center = getTokenCenter();
    const offX = Math.round(worldX - center.x);
    const offY = Math.round(worldY - center.y);
    cleanup();
    onConfirm(offX, offY);
  });

  const onKeyDown = (ev) => {
    if (ev.key === "Escape") {
      cleanup();
      ui.notifications.info("Sélection de position annulée.");
    }
  };
  document.addEventListener("keydown", onKeyDown);
}

/**
 * Fait flasher un halo vert magique autour de la fiche de personnage.
 * @param {jQuery} html - L'élément html de la fiche (passé depuis activateListeners)
 */
export function flashMagicHalo(html) {
  const $html = html instanceof jQuery ? html : $(html);
  const appEl = $html.closest(".app")[0] || $html.closest(".window-app")[0];
  if (!appEl) return;

  // Supprimer tout overlay existant avant d'en créer de nouveaux
  document
    .querySelectorAll(
      ".mega-magic-halo-glow, .mega-magic-halo-border, .mega-magic-particle",
    )
    .forEach((el) => el.remove());

  const rect = appEl.getBoundingClientRect();
  const duration = 4000;

  // --- Overlay 1 : halo pulsant (exactement sur la fenêtre) ---
  const glow = document.createElement("div");
  glow.className = "mega-magic-halo-glow";
  glow.style.cssText = [
    "position: fixed",
    `left: ${rect.left}px`,
    `top: ${rect.top}px`,
    `width: ${rect.width}px`,
    `height: ${rect.height}px`,
    "pointer-events: none",
    "z-index: 99998",
    "border-radius: 6px",
  ].join(";");

  document.body.appendChild(glow);
  setTimeout(() => {
    glow.remove();
  }, duration + 200);

  // --- Particules magiques ---
  _spawnMagicParticles(rect, duration);
}

/**
 * Fait apparaitre des étoiles / étincelles magiques autour de la fenêtre.
 * @private
 */
function _spawnMagicParticles(rect, totalDuration) {
  // Formes utilisées pour les particules
  const symbols = [
    "\u2726",
    "\u2727",
    "\u2739",
    "\u2736",
    "\u2734",
    "\u2605",
    "\u2736",
    "\u25c6",
    "\u2022",
    "\u2738",
  ];
  // Nuances de vert émeraude
  const colors = [
    "rgba(58, 173, 110, 0.95)",
    "rgba(80, 200, 130, 0.90)",
    "rgba(46, 139,  87, 0.85)",
    "rgba(120, 220, 160, 1.00)",
    "rgba(180, 240, 200, 0.95)",
    "rgba(36, 120,  72, 0.80)",
  ];

  const count = 32;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < count; i++) {
    // Délai étalé sur les 70% premiers de la durée
    const delay = Math.random() * totalDuration * 0.7;

    setTimeout(() => {
      // Position aléatoire sur l'un des 4 bords, légèrement à l'extérieur
      const side = Math.floor(Math.random() * 4);
      const offset = (Math.random() - 0.5) * 10; // micro-décalage hors-bord
      let x, y;
      switch (side) {
        case 0:
          x = rect.left + Math.random() * rect.width;
          y = rect.top - offset;
          break; // haut
        case 1:
          x = rect.left + Math.random() * rect.width;
          y = rect.bottom + offset;
          break; // bas
        case 2:
          x = rect.left - offset;
          y = rect.top + Math.random() * rect.height;
          break; // gauche
        case 3:
          x = rect.right + offset;
          y = rect.top + Math.random() * rect.height;
          break; // droite
      }

      // Direction : s'éloigner du centre + légèrement vers le haut
      const angle = Math.atan2(y - cy, x - cx);
      const dist = 30 + Math.random() * 65;
      const dx = Math.cos(angle) * dist + (Math.random() - 0.5) * 20;
      const dy = Math.sin(angle) * dist - 15 - Math.random() * 25;

      const size = 9 + Math.random() * 13;
      const animDur = 1.0 + Math.random() * 1.6;
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const p = document.createElement("span");
      p.className = "mega-magic-particle";
      p.textContent = symbol;
      p.style.cssText = [
        "position: fixed",
        `left: ${x}px`,
        `top: ${y}px`,
        `font-size: ${size}px`,
        `color: ${color}`,
        "pointer-events: none",
        "z-index: 100000",
        "transform-origin: center center",
        "user-select: none",
        `--mega-pdx: ${dx}px`,
        `--mega-pdy: ${dy}px`,
        `animation: mega-particle-rise ${animDur.toFixed(2)}s ease-out forwards`,
      ].join(";");

      document.body.appendChild(p);
      setTimeout(() => p.remove(), animDur * 1000 + 100);
    }, delay);
  }
}

/**
 * Démarre un flux continu de particules magiques depuis les bords d'un bouton.
 * @param {HTMLElement} buttonEl - Le bouton sur lequel spawner les particules
 * @returns {Function} Fonction stop() à appeler pour arrêter les particules
 */
export function startButtonParticles(buttonEl) {
  const symbols = ["✦", "✧", "✺", "✶", "✴", "★", "✲", "◆", "•", "✸"];
  const colors = [
    "rgba(58,173,110,0.95)",
    "rgba(80,200,130,0.90)",
    "rgba(46,139,87,0.85)",
    "rgba(120,220,160,1.00)",
    "rgba(180,240,200,0.95)",
    "rgba(36,120,72,0.80)",
  ];
  let active = true;

  function spawnOne() {
    if (!active || !document.body.contains(buttonEl)) {
      clearInterval(interval);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    switch (side) {
      case 0:
        x = rect.left + Math.random() * rect.width;
        y = rect.top;
        break; // haut
      case 1:
        x = rect.left + Math.random() * rect.width;
        y = rect.bottom;
        break; // bas
      case 2:
        x = rect.left;
        y = rect.top + Math.random() * rect.height;
        break; // gauche
      case 3:
        x = rect.right;
        y = rect.top + Math.random() * rect.height;
        break; // droite
    }
    const angle = Math.atan2(y - cy, x - cx);
    const dist = 20 + Math.random() * 40;
    const dx = Math.cos(angle) * dist + (Math.random() - 0.5) * 15;
    const dy = Math.sin(angle) * dist - 10 - Math.random() * 20;
    const size = 7 + Math.random() * 10;
    const dur = 0.8 + Math.random() * 1.2;

    const p = document.createElement("span");
    p.className = "mega-magic-particle";
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.cssText = [
      "position:fixed",
      `left:${x}px`,
      `top:${y}px`,
      `font-size:${size}px`,
      `color:${colors[Math.floor(Math.random() * colors.length)]}`,
      "pointer-events:none",
      "z-index:100000",
      "transform-origin:center center",
      "user-select:none",
      `--mega-pdx:${dx}px`,
      `--mega-pdy:${dy}px`,
      `animation:mega-particle-rise ${dur.toFixed(2)}s ease-out forwards`,
    ].join(";");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), dur * 1000 + 100);
  }

  const interval = setInterval(spawnOne, 300);
  return () => {
    active = false;
    clearInterval(interval);
  };
}

/**
 * Vérifie l'état des effets spéciaux et de FXMaster
 * @returns {{shouldContinue: boolean, shouldPlayEffects: boolean}} État des effets
 */
export function checkEffectsState() {
  const effets_speciaux = game.settings.get("mega", "effets_speciaux");

  // Si les effets spéciaux sont désactivés, continuer SANS effets
  if (!effets_speciaux) {
    return { shouldContinue: true, shouldPlayEffects: false };
  }

  // Si les effets spéciaux sont activés, vérifier FXMaster
  if (!checkFXMaster()) {
    ui.notifications.error(
      "Les effets dépendent du module FXMaster. Veuillez l'installer et l'activer depuis la gestion des modules.",
      { permanent: false, console: false },
    );
    return { shouldContinue: false, shouldPlayEffects: false };
  }

  // Effets activés ET FXMaster disponible
  return { shouldContinue: true, shouldPlayEffects: true };
}
