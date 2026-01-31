const SYSTEM_ID = "mega";

//logging
function log(...args) {
  try {
    const isDebugging = window.DEV?.getPackageDebugValue(SYSTEM_ID);

    if (isDebugging) {
      console.log(SYSTEM_ID, "|", ...args);
    }
  } catch (e) {}
}

const _requestResolvers = {};

const api = {
  isMainGM() {
    return game.user === game.users.find((u) => u.isGM && u.active);
  },

  // old API, kept for compatibility and not needing to rewrite a million macros
  async applyCUBCondition(condition, entity) {
    if (!game.modules.get("combat-utility-belt")?.active) return false;
    let document = getDocument(entity);
    const content = { condition, document };
    return handlerBridge(content, "applyCUBCondition");
  },

  async removeCUBCondition(condition, entity) {
    if (!game.modules.get("combat-utility-belt")?.active) return false;
    let document = getDocument(entity);
    const content = { condition, document };
    return handlerBridge(content, "removeCUBCondition");
  },

  async entityGetFlag(entity, scope, flag) {
    let document = getDocument(entity);
    return this.documentGetFlag(document, scope, flag);
  },

  async entitySetFlag(entity, scope, flag, value) {
    let document = getDocument(entity);
    return this.documentSetFlag(document, scope, flag, value);
  },

  async entityUnsetFlag(entity, scope, flag) {
    let document = getDocument(entity);
    return this.documentUnsetFlag(document, scope, flag);
  },

  async entityUpdate(entity, newData, options) {
    let document = getDocument(entity);
    return this.documentUpdate(document, newData, options);
  },

  async entityDelete(entity, options) {
    let document = getDocument(entity);
    return this.documentDelete(document, options);
  },

  async entityCreateEmbeddedEntity(entity, embedType, embedData, options) {
    let document = getDocument(entity);
    if (!Array.isArray(embedData)) embedData = [embedData];
    return this.documentCreateEmbeddedDocuments(
      document,
      embedType,
      embedData,
      options,
    );
  },

  async entityDeleteEmbeddedEntity(entity, embedType, embedIds, options) {
    let document = getDocument(entity);
    if (!Array.isArray(embedIds)) embedIds = [embedIds];
    return this.documentDeleteEmbeddedDocuments(
      document,
      embedType,
      embedIds,
      options,
    );
  },

  //0.8 API.  Mostly just functions which the old ones will pass into (except for handling the embedded changes), but using the new naming scheme
  async documentGetFlag(document, scope, flag) {
    const content = { document, scope, flag };
    return handlerBridge(content, "documentGetFlag");
  },

  async documentSetFlag(document, scope, flag, value) {
    const content = { document, scope, flag, value };
    return handlerBridge(content, "documentSetFlag");
  },

  async documentUnsetFlag(document, scope, flag) {
    const content = { document, scope, flag };
    return handlerBridge(content, "documentUnsetFlag");
  },

  async documentUpdate(document, newData, options) {
    const content = { document, newData, options };
    return handlerBridge(content, "documentUpdate");
  },

  async documentDelete(document, options) {
    const content = { document, options };
    return handlerBridge(content, "documentDelete");
  },

  async documentCreateEmbeddedDocuments(
    document,
    embedType,
    embedData,
    options,
  ) {
    const content = { document, embedType, embedData, options };
    return handlerBridge(content, "documentCreateEmbeddedDocuments");
  },

  async documentDeleteEmbeddedDocuments(
    document,
    embedType,
    embedIds,
    options,
  ) {
    const content = { document, embedType, embedIds, options };
    return handlerBridge(content, "documentDeleteEmbeddedDocuments");
  },
};

function getDocument(entity, skipCheck) {
  let document;
  if (entity instanceof foundry.canvas.placeables.PlaceableObject) {
    document = entity.document;
  } else {
    document = entity;
  }
  if (document instanceof foundry.abstract.Document || skipCheck) {
    return document;
  } else
    throw new Error(
      `${SYSTEM_ID}| Object provided was not a Document or reducible to one.`,
    );
}

function getUniqueID() {
  return `${game.user.id}-${Date.now()}-${randomID()}`;
}

function extendedUuid(document) {
  let euuid = document.uuid;
  if (document.documentName === "Actor" && !document.uuid.includes("Actor")) {
    euuid += ".Actor";
  }
  return euuid;
}

async function fromEUuid(euuid) {
  let parts = euuid?.split(".");
  let isActor = false;
  if (parts?.pop() === "Actor") {
    euuid = parts.join(".");
    isActor = true;
  }
  let document = await fromUuid(euuid);
  if (isActor) document = document.actor;

  return document;
}

async function handlerBridge(content, functionName) {
  log("handlerBridge called with arguments", ...arguments);
  const methodResponse = await new Promise((resolve, reject) => {
    const randomID = getUniqueID();
    _requestResolvers[randomID] = resolve;
    const user = game.user.id;
    content.document = extendedUuid(content.document);
    if ((!content.userID && api.isMainGM()) || content.userID === user) {
      const handlerFunctionName = `${functionName}Handler`;
      handlers[handlerFunctionName]({ content, randomID, user });
    } else {
      game.socket.emit(`system.${SYSTEM_ID}`, {
        operation: functionName,
        user,
        content,
        randomID,
      });
    }
    setTimeout(() => {
      delete _requestResolvers[randomID];
      reject(new Error("timed out waiting for GM execution"));
    }, 5000);
  });

  if (methodResponse.error) throw new Error(methodResponse.error);
  else return methodResponse.result;
}

function returnBridge(retVal, data) {
  log("return bridge called with arguments", ...arguments);
  if (data.user === game.user.id) {
    const resolve = _requestResolvers[data.randomID];
    if (resolve) {
      delete _requestResolvers[data.randomID];
      resolve(retVal);
    }
    return;
  }
  if (retVal.result instanceof foundry.abstract.Document) {
    retVal.result = extendedUuid(retVal.result);
    retVal.isUuid = true;
  } else if (
    Array.isArray(retVal.result) &&
    retVal.result.every((res) => res instanceof foundry.abstract.Document)
  ) {
    retVal.isUuidArray = true;
    retVal.result = retVal.result.map(extendedUuid);
  }
  game.socket.emit(`system.${SYSTEM_ID}`, {
    operation: "return",
    user: game.user.id,
    retVal,
    randomID: data.randomID,
  });
}

const handlers = {
  async applyCUBConditionHandler(data) {
    if (!api.isMainGM()) return;
    const condition = data.content.condition;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await game.cub.addCondition(condition, document);
    returnBridge(retVal, data);
  },

  async removeCUBConditionHandler(data) {
    if (!api.isMainGM()) return;
    const condition = data.content.condition;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await game.cub.removeCondition(condition, document);
    returnBridge(retVal, data);
  },

  async documentGetFlagHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.getFlag(
      data.content.scope,
      data.content.flag,
    );
    returnBridge(retVal, data);
  },

  async documentSetFlagHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.setFlag(
      data.content.scope,
      data.content.flag,
      data.content.value,
    );
    returnBridge(retVal, data);
  },

  async documentUnsetFlagHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.unsetFlag(
      data.content.scope,
      data.content.flag,
    );
    returnBridge(retVal, data);
  },

  async documentUpdateHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.update(
      data.content.newData,
      data.content.options,
    );
    returnBridge(retVal, data);
  },

  async documentDeleteHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.delete(data.content.options);
    returnBridge(retVal, data);
  },

  async documentCreateEmbeddedDocumentsHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.createEmbeddedDocuments(
      data.content.embedType,
      data.content.embedData,
      data.content.options,
    );
    returnBridge(retVal, data);
  },

  async documentDeleteEmbeddedDocumentsHandler(data) {
    if (!api.isMainGM()) return;
    const document = await fromEUuid(data.content.document);
    const retVal = {};
    retVal.result = await document.deleteEmbeddedDocuments(
      data.content.embedType,
      data.content.embedIds,
      data.content.options,
    );
    returnBridge(retVal, data);
  },
};

// Immediate global registration for early access
if (typeof globalThis !== "undefined") {
  globalThis.megaS = api;
}

// Export de l'API pour pouvoir l'importer dans d'autres modules
export { api };

// Hooks d'initialisation
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(SYSTEM_ID);
});

Hooks.once("init", async function () {
  //socket registration
  game.socket.on(`system.${SYSTEM_ID}`, async (data) => {
    log("Received data over socket:", data);
    if (data.operation === "return") {
      if (data.retVal.isUuid) {
        data.retVal.result = fromEUuid(data.retVal.result);
      }
      if (data.retVal.isUuidArray) {
        data.retVal.result = data.retVal.result.map(fromEUuid);
      }
      const resolve = _requestResolvers[data.randomID];
      if (resolve) {
        delete _requestResolvers[data.randomID];
        resolve(data.retVal);
      }
    } else {
      const handlerFunction = data.operation + "Handler";
      handlers[handlerFunction](data);
    }
  });
});

Hooks.once("ready", async function () {
  //API registration
  if (!game?.systems?.get) {
    console.warn(
      "game.systems is not available yet, skipping API registration",
    );
    return;
  }

  const megaSystem = game.systems.get(SYSTEM_ID);
  if (megaSystem) {
    if (!megaSystem.api) {
      megaSystem.api = api;
      log("MEGA API registered successfully");
    } else {
      ui.notifications.warn(`MEGA API is already registered.`);
    }
  } else {
    console.warn("MEGA System not found during API registration");
  }

  // Global API registration for compatibility and immediate access
  if (!globalThis.megaS) {
    globalThis.megaS = api;
    console.log("MEGA Socket API available globally");

    // Reset API cache in utils
    if (globalThis.resetMegaAPICache) {
      globalThis.resetMegaAPICache();
    }
  }
});
