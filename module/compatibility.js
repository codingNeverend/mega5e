/**
 * Patch de compatibilité pour l'intégration de MegaSocket
 * Ce fichier assure la transition en douceur pour les anciennes références
 */

Hooks.once("ready", function () {
  // Vérifier si l'ancien module MegaSocket est actif et avertir l'utilisateur
  const oldMegaSocket = game.modules.get("megasocket");
  if (oldMegaSocket && oldMegaSocket.active) {
    ui.notifications.warn(
      "Le module MegaSocket est maintenant intégré dans le système MEGA. " +
        "Vous pouvez désactiver le module externe 'MegaSocket' pour éviter les conflits.",
      { permanent: true },
    );
    console.warn(
      "MEGA System: Le module MegaSocket externe devrait être désactivé.",
    );
  }

  // Créer un alias de compatibilité si l'ancienne API est encore référencée quelque part
  // (utile pour les macros utilisateur qui n'auraient pas été mises à jour)
  if (!game.mega) {
    game.mega = {};
  }

  // Vérifier que game.systems est disponible
  if (!game?.systems?.get) {
    console.warn("game.systems is not available yet in compatibility.js");
    return;
  }

  // Alias de compatibilité pour l'ancienne API
  const megaSystem = game.systems.get("mega");
  if (megaSystem?.api && !game.mega.api) {
    game.mega.api = megaSystem.api;
    console.log("MEGA System: Alias de compatibilité créé pour game.mega.api");
  } else if (!megaSystem?.api) {
    console.error(
      "MEGA System: L'API n'est pas disponible. Vérifiez que socket.js est bien chargé.",
    );
  }
});
