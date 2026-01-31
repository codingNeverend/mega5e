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
