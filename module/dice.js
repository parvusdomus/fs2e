import { fs2e } from "./config.js";
import * as Chat from "./chat.js";

export async function TaskCheck({
  taskType = null,
  actor = null,
  actionValue = null,
  closedRoll = false,
  useFortune = false,
  modifier = 0,
  difficulty = null,
  extraMessageData = {},
  askForOptions = true,
  sendMessage = true,
  isAttack = false } = {}) {
  const messageTemplate = "systems/fs2e/templates/chat/task-check.hbs";
  const actorData = actor ? actor.system : null;
  const hasFortune = actor.hasFortune;

  useFortune = useFortune && hasFortune;

  let optionsSettings = game.settings.get("fs2e", "showTaskCheckOptions");

  if (askForOptions != optionsSettings) {
    let checkOptions = await GetRollOptions({ hasFortune, taskType, useFortune, modifier, difficulty, closedRoll });

    if (checkOptions.cancelled) {
      return;
    }

    useFortune = checkOptions.useFortune;
    difficulty = checkOptions.difficulty;
    modifier = checkOptions.modifier;
    closedRoll = checkOptions.closedRoll;
  }

  let baseDice = closedRoll == true ? "1d6" : "1d6x";
  let rollFormula = `${baseDice}[green] - ${baseDice}[red] + @actionValue`;

  if (!closedRoll && useFortune) {
    rollFormula += " + 1d6[white]";
  }

  if (actorData && actorData.impairment?.total > 0) {
    rollFormula += " - @impairment.total";
  }

  if (modifier != 0) {
    rollFormula += " + @modifier";
  }

  let rollData = {
    ...actorData,
    actionValue: actionValue,
    modifier: modifier
  };

  let rollresult = await new Roll(rollFormula, rollData).roll({ async: true });

  if (useFortune && game.settings.get("fs2e", "automateFortuneSpending")) {
    // Spend fortune point.
    actor.update({ "system.fortune.value": actorData.fortune.value - 1 });
  }

  if (sendMessage) {
    RollToCustomMessage(actor, rollresult, messageTemplate, {
      ...extraMessageData,
      type: taskType,
      difficulty: difficulty,
      actorID: actor.uuid,
      isAttack,
      outcome: difficulty ? (rollresult.total - difficulty) : null,
      swerve: _getSwerve(rollresult)
    });
  }
  return rollresult;
}

async function GetRollOptions({
  hasFortune = true,
  taskType = null,
  useFortune = false,
  difficulty = 0,
  modifier = 0,
  closedRoll = false,
  template = "systems/fs2e/templates/chat/task-check-dialog.hbs" } = {}) {
  const html = await renderTemplate(template, { hasFortune, useFortune, difficulty, modifier, closedRoll });

  return new Promise(resolve => {
    const data = {
      title: game.i18n.format("fs2e.chat.taskCheck.title", { type: taskType }),
      content: html,
      buttons: {
        normal: {
          label: game.i18n.localize("fs2e.chat.actions.roll"),
          callback: html => resolve(_processTaskCheckOptions(html[0].querySelector("form")))
        },
        cancel: {
          label: game.i18n.localize("fs2e.chat.actions.cancel"),
          callback: html => resolve({ cancelled: true })
        }
      },
      default: "normal",
      close: () => resolve({ cancelled: true })
    };

    new Dialog(data, null).render(true);
  });
}

function _processTaskCheckOptions(form) {
  return {
    difficulty: parseInt(form.difficulty?.value),
    modifier: parseInt(form.modifier?.value),
    useFortune: form.useFortune?.checked,
    closedRoll: form.closedRoll?.checked
  }
}

function _getSwerve(roll) {
  const diceAdder = (total, roll) => total + roll;
  const plusDie = roll.dice[0].results.map(el => el.result).reduce(diceAdder);
  const minusDie = roll.dice[1].results.map(el => el.result).reduce(diceAdder);
  const fortuneDie = roll.dice.length === 3 ? roll.dice[2] : null;

  let swerve = plusDie - minusDie;

  if (fortuneDie) {
    swerve += fortuneDie.results[0].result;
  }

  return swerve;
}

export async function DeathCheck(actor) {
  const actorData = actor.system;
  TaskCheck({
    taskType: game.i18n.localize(fs2e.taskCheckTypes["death"]),
    actor,
    actionValue: actorData.toughness,
    closedRoll: true,
    difficulty: fs2e.deathCheckBaseDifficulty + actorData.deathMarks
  });
}

export async function ReloadCheck(weapon) {
  const template = "systems/fs2e/templates/chat/binary-check.hbs";
  const taskType = game.i18n.localize(fs2e.taskCheckTypes["reload"]);
  let rollResult = await new Roll("1d6cs>@reload", weapon.system).roll({ async: true });

  let extraData = {
    taskType,
    success: rollResult.total > 0
  };

  return RollToCustomMessage(null, rollResult, template, extraData);
}

export async function UpCheck(actor, useFortune = false) {
  const template = "systems/fs2e/templates/chat/binary-check.hbs";
  const taskType = game.i18n.localize(fs2e.taskCheckTypes["up"]);
  const actorData = actor;
  let rollResult;

  let extraData = {
    name: actorData.name,
    taskType
  };

  if (actorData.type == "boss") {
    rollResult = await new Roll("1d2 - 1", actorData.system).roll({ async: true });

    extraData.success = rollResult.total > 0;
  }
  else if (actorData.type == "hero") {
    rollResult = await TaskCheck({
      taskType,
      actor,
      actionValue: actorData.system.toughness,
      useFortune: useFortune,
      difficulty: fs2e.upCheckDifficulty,
      sendMessage: false
    });

    extraData.success = (rollResult.total - fs2e.upCheckDifficulty) > 0;
  }

  return RollToCustomMessage(actor, rollResult, template, extraData);
}

/**
 * 
 * @param {FS2Actor} attacker 
 * @param {FS2Item} weapon 
 * @param {boolean} askforOptions 
 */
export async function Attack(attacker, weapon, askforOptions) {
  const statName = weapon.system.attackWith;
  let actionValue = attacker.getStatForAttackName(statName);
  const targets = Array.from(game.users.current.targets).map(target => target.actor);
  const targetCount = targets.length;

  targets.forEach(target => Chat.SendAttackNotificationMessage(attacker, target));

  TaskCheck({
    taskType: game.i18n.localize(fs2e.taskCheckTypes[statName]),
    actor: attacker,
    actionValue: actionValue,
    askForOptions: askforOptions,
    isAttack: true,
    modifier: targetCount > 1 ? -targetCount : 0,
    extraMessageData: { weapon: weapon, weaponID: weapon.uuid }
  });
}

/**
 * 
 * @param {FS2Actor} attacker 
 * @param {FS2Actor} defender 
 * @param {boolean} askForOptions 
 * @param {boolean} retroactive 
 * @param {number} outcome 
 * @returns 
 */
export async function Dodge(attacker, defender, askForOptions, retroactive = false, outcome = null) {
  const updateData = {};
  const optionsSettings = game.settings.get("fs2e", "showTaskCheckOptions");
  const hasFortune = defender.hasFortune;
  let useFortune = false;
  let modifier = 0;
  let messageTemplate = "systems/fs2e/templates/chat/dodge.hbs";
  let rollResult;

  if (askForOptions != optionsSettings) {
    let rollOptions = await GetRollOptions({
      hasFortune,
      template: "systems/fs2e/templates/chat/roll-options-dialog-dodge.hbs"
    });

    if (rollOptions.cancelled) {
      return;
    }

    useFortune = rollOptions.useFortune;
    modifier = rollOptions.modifier;
  }

  // Find combatant and spend shot.
  const combat = game.combat;

  if (combat) {
    const combatants = Array.from(combat.combatants.values());
    const defenderCombatant = combatants.find(combatant => combatant.actor === defender);

    if (defenderCombatant) {
      fs2e.socket.executeAsGM("interrupt", combat.id, defenderCombatant.id, fs2e.combat.dodgeShotCost);
    }
  }

  let dodgeBonus = fs2e.combat.dodgeDefenseBonus + modifier;

  const templateData = {
    attackerName: attacker.name,
    defenderName: defender.name
  }

  if (useFortune) {
    messageTemplate = "systems/fs2e/templates/chat/dodge-fortune.hbs";
    const rollData = {
      base: fs2e.combat.dodgeDefenseBonus,
      modifier
    };

    if (game.settings.get("fs2e", "automateFortuneSpending")) {
      // Spend fortune point.
      updateData["system.fortune.value"] = defender.system.fortune.value - 1;
    }

    let rollFormula = "@base + 1d6";
    if (modifier) {
      rollFormula += " + @modifer"
    }
    rollResult = await new Roll(rollFormula, rollData).roll({ async: true });
    templateData.tooltip = await rollResult.getTooltip();

    dodgeBonus = rollResult.total;
  }

  templateData.value = dodgeBonus;
  updateData["system.dodgeBonus"] = dodgeBonus;

  // Retroactive dodge handling
  if (retroactive) {
    if (outcome <= dodgeBonus) {
      // Successful Dodge
      messageTemplate = "systems/fs2e/templates/chat/dodge-success.hbs";
    }
    else {
      return Chat.SendDamageMessage(attacker, defender, outcome, null, true);
    }
  }
  else {
    // Store dodge bonus
    defender.update(updateData);
  }

  // Send message
  if (useFortune) {
    RollToCustomMessage(defender, rollResult, messageTemplate, templateData);
  }
  else {
    ChatMessage.create({
      user: game.user._id,
      content: await renderTemplate(messageTemplate, templateData),
    });
  }
}

export async function RollToCustomMessage(actor = null, rollResult, template, extraData) {
  let templateContext = {
    ...extraData,
    roll: rollResult,
    tooltip: await rollResult.getTooltip()
  };

  let chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    roll: rollResult,
    content: await renderTemplate(template, templateContext),
    sound: CONFIG.sounds.dice,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL
  };

  ChatMessage.create(chatData);
}
