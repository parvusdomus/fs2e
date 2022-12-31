import * as Dice from "./dice.js";
import FS2Actor from "./FS2Actor.js";
import * as Utils from "./utils.js";

export function addChatListeners(html) {
  html.on('click', 'button.reload', onReload);
  html.on('click', 'button.attack', onAttack);
  html.on('click', 'button.attack-resolve', onAttackResolve);
  html.on('click', 'button.dodge', onDodge);
  html.on('click', 'button.upcheck-button', onUpCheck);
  html.on('click', 'button.smackdown-button', onApplySmackdown);
  html.on('click', 'button.damage-button', onApplyDamage);
}

async function onReload(event) {
  const card = event.currentTarget.closest(".weapon");
  const weapon = await fromUuid(card.dataset.itemId);
  Dice.ReloadCheck(weapon);
}

async function onAttack(event) {
  const card = event.currentTarget.closest(".weapon");
  let weapon = await fromUuid(card.dataset.itemId);
  let attacker = weapon.actor;

  Dice.Attack(attacker, weapon, event.shiftKey);
}

async function onAttackResolve(event) {
  const button = event.currentTarget.closest("button.attack-resolve");
  const attacker = await Utils.getActorFromUUID(button.dataset.attackerUuid);
  const weapon = await fromUuid(button.dataset.weapon);

  ResolveAttack(attacker, weapon, button.dataset.roll);
}

async function onDodge(event) {
  const button = event.currentTarget.closest(".dodge");
  const attacker = await Utils.getActorFromUUID(button.dataset.attackerId);
  const defender = await Utils.getActorFromUUID(button.dataset.defenderId);

  const retroactive = button.dataset.retroactive;
  const outcome = button.dataset.outcome;

  Dice.Dodge(attacker, defender, event.shiftKey, retroactive, outcome);
}

async function onUpCheck(event) {
  const button = event.currentTarget.closest(".upcheck-button");
  const actor = await Utils.getActorFromUUID(button.dataset.tokenId);

  Dice.UpCheck(actor, event.shiftKey);
}

async function onApplySmackdown(event) {
  const button = event.currentTarget.closest(".smackdown-button");
  const actor = await Utils.getActorFromUUID(button.dataset.defenderId);
  const smackdown = parseInt(button.dataset.smackdown);
  const actorData = actor.system;
  const wounds = actorData.wounds;

  let downed = false;
  let requireUpCheck = false;

  let effectiveToughness = actorData.toughness;

  const armors = actor.getEmbeddedCollection("Item").contents
    .filter(item => item.type == "armor");

  const canUseArmor = armors.length > 0;

  if (canUseArmor && button.dataset.useThunk) {
    const armor = armors[0];

    effectiveToughness += parseInt(armor.system.thunk);
  }

  let actualDamage = Math.max(0, smackdown - effectiveToughness);
  let newWounds = Math.min(parseInt(wounds.max), parseInt(wounds.value) + actualDamage);

  switch (actor.type) {
    case "featuredFoe":
      downed = newWounds === wounds.max;
      break;
    case "boss":
    case "hero":
      requireUpCheck = newWounds >= actorData.impairment.threshold + 10;
      break;
  }

  const template = "systems/fs2e/templates/chat/smackdown.hbs";

  let templateData = {
    smackdown: smackdown,
    actorId: button.dataset.defenderId,
    actorName: button.dataset.defenderName,
    damage: actualDamage,
    downed: downed,
    requireUpCheck: requireUpCheck,
    canUsePopBack: canUseArmor
  };

  ChatMessage.create({
    user: game.user._id,
    speaker: game.user.name,
    content: await renderTemplate(template, templateData),
    whisper: game.users.filter(user => actor.testUserPermission(user, "OWNER"))
  });
}

async function onApplyDamage(event) {
  const button = event.currentTarget.closest(".damage-button");
  const actor = await Utils.getActorFromUUID(button.dataset.actorId);
  const damage = parseInt(button.dataset.damage);

  actor.applyDamage(damage);
}

/**
 * 
 * @param {FS2Actor} attacker 
 * @param {FS2Item} weapon 
 * @param {Roll} roll 
 */
async function ResolveAttack(attacker, weapon, roll) {
  const weaponDamage = weapon.system.damage;
  let defenders = Array.from(game.users.current.targets).map(target => target.actor);;
  defenders.sort((a, b) => {
    return b.getEffectiveDefense() - a.getEffectiveDefense();
  });
  const topDefender = defenders[0];
  const topDefenderIsMook = topDefender.type == "mook";
  const mookBonus = weapon.system.mookBonus;
  const attack = topDefenderIsMook ? roll + mookBonus : roll;
  let defense = topDefender.getEffectiveDefense();
  let outcome = attack - defense;
  if (outcome < 0) {
    ChatMessage.create({
      user: game.user.id,
      speaker: game.user.name,
      content: await renderTemplate("systems/fs2e/templates/chat/attack-fail.hbs", {
        blocker: topDefender
      })
    });
  }
  else {
    const smackdown = outcome + weaponDamage;

    for (let defender of defenders) {
      SendDamageMessage(attacker, defender, outcome, smackdown);
    }
  }
}

/**
 * 
 * @param {FS2Actor} attacker 
 * @param {FS2Actor} defender 
 * @param {number} outcome 
 * @param {number} smackdown 
 * @param {boolean} failedDodge 
 */
export async function SendDamageMessage(attacker, defender, outcome, smackdown, failedDodge = false) {
  const template = "systems/fs2e/templates/chat/attack-success.hbs";
  const armors = defender.getEmbeddedCollection("Item").contents
    .filter(item => item.type == "armor");

  let templateData = {
    smackdown: smackdown,
    attackerId: attacker.uuid,
    attackerName: attacker.name,
    defenderName: defender.name,
    defenderId: defender.uuid,
    canUseArmor: armors.length > 0,
    canRetroactiveDodge: !defender.system.dodgeBonus
      && game.settings.get("fs2e", "allowRetroactiveDodge")
      && !failedDodge,
    outcome,
    failedDodge
  };

  if (defender.type == "mook") {
    templateData.downed = true;
    templateData.damage = smackdown;
  }

  defender.update({ "system.dodgeBonus": 0 });

  ChatMessage.create({
    user: game.user._id,
    speaker: game.user.name,
    content: await renderTemplate(template, templateData),
    whisper: game.users.filter(user => defender.testUserPermission(user, "OWNER"))
  });
}

export async function SendAttackNotificationMessage(attacker, target) {
  const template = "systems/fs2e/templates/chat/attack-notification.hbs";
  const templateData = {
    attackerName: attacker.name,
    targetName: target.name,
    attackerId: attacker.uuid,
    defenderId: target.uuid
  };

  ChatMessage.create({
    user: game.user._id,
    content: await renderTemplate(template, templateData),
    whisper: game.users.filter(user => target.testUserPermission(user, "OWNER"))
  });
}

export const hideChatActionButtons = async function (message, html, data) {
  const chatCard = html.find(".fs2e.chat-card");
  if (chatCard.length > 0) {
    let actor = await Utils.getActorFromUUID(chatCard.attr("data-actor-id"));

    if ((actor && actor.isOwner)) {
      return;
    }
    if (game.user.isGM) {
      return
    };

    const buttons = chatCard.find("button[data-action]");
    buttons.each((i, btn) => {
      btn.style.display = "none"
    });
  }
}

export const highlightTaskCheckResults = function (message, html, data) {
  if (!message.isRoll || !message.isContentVisible) {
    return;
  }
  const taskCheck = html.find(".task-check");
  if (!taskCheck.length) {
    return;
  }

  const roll = message.roll;

  const plusDice = roll.dice[0].results[0];
  const minusDice = roll.dice[1].results[0];
  let boxcars = plusDice.exploded && minusDice.exploded;

  if (boxcars) {
    taskCheck.find(".dice-formula").addClass("boxcars");
  }

  if (roll.total < 0) {
    taskCheck.find(".dice-total").addClass("way-awful");
  }
  else {
    const outcome = taskCheck.find(".outcome");
    if (outcome) {
      const outcomeValue = outcome.attr("data-outcome");
      if (outcomeValue < 0 && boxcars) {
        outcome.addClass("way-awful");
      }
    }
  }
}

