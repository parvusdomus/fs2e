import * as Dice from "./dice.js";

export default class FS2Item extends Item {
  chatTemplate = {
    "weapon": "systems/fs2e/templates/chat/weapon-chat.hbs",
    "armor": "systems/fs2e/templates/partials/armor-card.hbs",
    "vehicle": "systems/fs2e/templates/partials/vehicle-card.hbs",
    "shtick": "systems/fs2e/templates/partials/shtick-card.hbs"
  };

  async roll() {
    if (this.type == "skill") {
      return Dice.TaskCheck({
        actor: this.actor,
        actionValue: this.system.value,
        taskType: this.name
      });
    }
    //console.log ("THIS SYSTEM")
    //console.log (...this.system)
    let cardData = {
      ...this,
      uuid: this.uuid,
      ownerID: this.actor.uuid,
      config: CONFIG.fs2e
    };
    console.log ("CARD DATA")
    console.log (cardData)

    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      //roll: true,
      content: await renderTemplate(this.chatTemplate[this.type], cardData)
    };
    console.log ("CHAT DATA")
    console.log (chatData)

    return ChatMessage.create(chatData);
  }

  enableShtickEffects(enabled) {
    const owner = this.owner;

    if (owner == null) {
      return;
    }

    this.update({ "data.data.active": enabled });
  }
}