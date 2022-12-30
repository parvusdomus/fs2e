import { fs2e } from "./module/config.js";
import * as Chat from "./module/chat.js";
import * as Macros from "./module/macros.js";
import FS2Actor from "./module/FS2Actor.js";
import FS2Combat from "./module/combat/combat.js";
import FS2Combatant from "./module/combat/combatant.js";
import FS2CombatantConfig from "./module/combat/combatantConfig.js";
import FS2CombatTracker from "./module/combat/combatTracker.js";
import FS2Item from "./module/FS2Item.js";
import FS2ItemSheet from "./module/sheets/FS2ItemSheet.js";
import FS2NamedCharacterSheet from "./module/sheets/FS2NamedCharacterSheet.js";
import FS2VehicleSheet from "./module/sheets/FS2VehicleSheet.js";
import FS2ActiveEffectConfig from "./module/sheets/FS2ActiveEffectConfig.js";
import FS2ActiveEffect from "./module/FS2ActiveEffect.js";

async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/fs2e/templates/partials/character-stat-block.hbs",
    "systems/fs2e/templates/partials/vehicle-stat-block.hbs",
    "systems/fs2e/templates/partials/weapon-card.hbs",
    "systems/fs2e/templates/partials/weapon-card-chat.hbs",
    "systems/fs2e/templates/partials/wound-points.hbs",
    "systems/fs2e/templates/partials/shtick-card.hbs",
    "systems/fs2e/templates/partials/armor-card.hbs",
    "systems/fs2e/templates/partials/vehicle-card.hbs",
    "systems/fs2e/templates/partials/shtick-card.hbs",
    "systems/fs2e/templates/partials/actor-skills.hbs",
    "systems/fs2e/templates/partials/death-marks.hbs",
    "templates/dice/roll.html"
  ];

  return loadTemplates(templatePaths);
};

function registerSystemSettings() {
  game.settings.register("fs2e", "showTaskCheckOptions", {
    config: true,
    scope: "client",
    name: "SETTINGS.showTaskCheckOptions.name",
    hint: "SETTINGS.showTaskCheckOptions.label",
    type: Boolean,
    default: true
  });

  game.settings.register("fs2e", "automateFortuneSpending", {
    config: true,
    scope: "world",
    name: "SETTINGS.automateFortuneSpending.name",
    hint: "SETTINGS.automateFortuneSpending.label",
    type: Boolean,
    default: true
  });

  game.settings.register("fs2e", "allowRetroactiveDodge", {
    config: true,
    scope: "world",
    name: "SETTINGS.allowRetroactiveDodge.name",
    hint: "SETTINGS.allowRetroactiveDodge.label",
    type: Boolean,
    default: true
  });

  game.settings.register("fs2e", "systemMigrationVersion", {
    config: false,
    scope: "world",
    type: String,
    default: ""
  });
}

function migrateActorData(actor) {
  let updateData = {};

  if (actor.type != "hero") {
    return updateData;
  }

  let actorData = actor.data;
  if (actorData.fortune && !actorData.fortune.max) {
    updateData["data.fortune.max"] = actorData.fortune.value;
  }

  return updateData;
}

async function migrateWorld() {
  for (let actor of game.actors.contents) {
    const updateData = migrateActorData(actor.data);
    if (!foundry.utils.isObjectEmpty(updateData)) {
      console.log(`Migrating Actor entity ${actor.name}.`);
      await actor.update(updateData);
    }
  }

  for (let scene of game.scenes.contents) {
    let sceneUpdate = migrateSceneData(scene);
    if (!foundry.utils.isObjectEmpty(sceneUpdate)) {
      console.log(`Migrating Scene ${scene.name}.`);
      await scene.update(sceneUpdate);
    }
  }

  for (let pack of game.packs) {
    if (pack.metadata.package != "world") {
      continue;
    }

    const packType = pack.metadata.entity;
    if (!["Actor", "Scene"].includes(packType)) {
      continue;
    }

    const wasLocked = pack.locked;
    await pack.configure({ locked: false });

    await pack.migrate();
    const documents = await pack.getDocuments();

    for (let document of documents) {
      let updateData = {};
      switch (packType) {
        case "Actor":
          updateData = migrateActorData(document.data);
          break;
        case "Scene":
          updateData = migrateSceneData(document.data);
          break;
      }
      if (foundry.utils.isObjectEmpty(updateData)) {
        continue;
      }
      await document.update(updateData);
      console.log(`Migrated ${packType} entity ${document.name} in Compendium ${pack.collection}`);
    }

    await pack.configure({ locked: wasLocked });
  }

  game.settings.set('fs2e', 'systemMigrationVersion', game.system.data.version);
}

function migrateSceneData(scene) {
  const tokens = scene.tokens.map(token => {
    const t = token.toJSON();

    if (!t.actorLink) {
      const actor = duplicate(t.actorData);
      actor.type = t.actor?.type;
      const update = migrateActorData(actor);
      mergeObject(t.actorData, update);
    }
    return t;
  });

  return { tokens };
}

Hooks.once("init", function () {
  console.log("fs2e | Initialising Feng Shui 2 System");

  CONFIG.fs2e = fs2e;
  CONFIG.Item.documentClass = FS2Item;
  CONFIG.Actor.documentClass = FS2Actor;
  CONFIG.Combat.documentClass = FS2Combat;
  CONFIG.ui.combat = FS2CombatTracker;
  CONFIG.Combatant.documentClass = FS2Combatant;
  CONFIG.Combatant.sheetClass = FS2CombatantConfig;
  CONFIG.ActiveEffect.sheetClass = FS2ActiveEffectConfig;
  CONFIG.ActiveEffect.documentClass = FS2ActiveEffect;

  CONFIG.canvasTextStyle.fontFamily = "Baron Neue";
  CONFIG.fontFamilies.push("Baron Neue", "Gotham Book");
  CONFIG.defaultFontFamily = "Baron Neue";

  CONFIG.TinyMCE.content_css.push("systems/fs2e/fs2e-mce.css");

  CONFIG.ChatMessage.template = "systems/fs2e/templates/chat/chat-message.hbs";

  CONFIG.time.roundTime = 80;

  game.fs2e = {
    macros: Macros
  }

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("fs2e", FS2ItemSheet, { makeDefault: true });

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("fs2e", FS2NamedCharacterSheet, {
    types: ["mook", "boss", "featuredFoe", "hero"],
    makeDefault: true
  });
  Actors.registerSheet("fs2e", FS2VehicleSheet, {
    types: ["vehicle"],
    makeDefault: true
  });


  preloadHandlebarsTemplates();

  registerSystemSettings();

  Handlebars.registerHelper("times", function (n, content) {
    let result = "";
    for (let i = 0; i < n; ++i) {
      content.data.index = i + 1;
      result += content.fn(i);
    }

    return result;
  });
});

Hooks.once("ready", function () {

  Hooks.on("hotbarDrop", (bar, data, slot) => Macros.createRollItemMacro(data, slot));

  if (!game.user.isGM) {
    return;
  }

  const currentVersion = game.settings.get("fs2e", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = 0.01;

  const needsMigration = !currentVersion || isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion);

  if (needsMigration) {
    migrateWorld();
  }
});

Hooks.on("renderChatLog", (app, html, data) => Chat.addChatListeners(html));

Hooks.on("renderChatMessage", (app, html, data) => {
  Chat.hideChatActionButtons(app, html, data);
  Chat.highlightTaskCheckResults(app, html, data);
});

Hooks.once("socketlib.ready", () => {
  fs2e.socket = socketlib.registerSystem("fs2e");
  fs2e.socket.register("interrupt", interrupt);
});

function interrupt(combatId, combatantId, shotCost = null) {
  const combat = game.combats.get(combatId);
  combat.interrupt(combat.combatants.get(combatantId), shotCost);
}
