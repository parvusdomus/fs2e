import * as Dice from "./dice.js";

export function TestNegativeActionResult() {
  Dice.TaskCheck({
    taskType: "Way-Awful test",
    actionValue: -300
  });
}

export function TestBoxCarFailure() {
  const plusDie = {
    class: "Die",
    number: 1,
    faces: 6,
    modifiers: ["x[green]"],
    results: [
      { result: 6, exploded: true },
      { result: 3 }
    ],
  };
  const minusDie = {
    class: "Die",
    number: 1,
    faces: 6,
    modifiers: ["x[red]"],
    results: [
      { result: 6, exploded: true },
      { result: 1 }
    ],
  };
  const rollData = {
    formula: "1d6x[green] - 1d6x[red]",
    terms: [plusDie, "-", minusDie],
    total: 2,
    dice: [plusDie, minusDie]
  };

  let rollResult = Roll.fromData(rollData);

  Dice.RollToCustomMessage(rollResult, "systems/fs2e/templates/chat/task-check.hbs", {
    type: "BoxCars WayAwful",
    swerve: 2,
    difficulty: 10,
    outcome: -8
  });
}

export async function createRollItemMacro(data, slot) {
  if ( data.type !== "Item" ) return;
  if (!( "data" in data ) ) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.fs2e.macros.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if ( !macro ) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: {"fs2e.itemMacro": true}
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

export function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if ( speaker.token ) actor = game.actors.tokens[speaker.token];
  if ( !actor ) actor = game.actors.get(speaker.actor);

  // Get matching items
  const items = actor ? actor.items.filter(i => i.name === itemName) : [];
  if ( items.length > 1 ) {
    ui.notifications.warn(`Your controlled Actor ${actor.name} has more than one Item with name ${itemName}. The first matched item will be chosen.`);
  } else if ( items.length === 0 ) {
    return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);
  }
  const item = items[0];

  // Trigger the item roll
  return item.roll();
}