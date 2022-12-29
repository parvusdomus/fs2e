import { fs2e } from "../config.js";

export default class FS2Combatant extends Combatant {
  _onCreate(data, options, userID) {
    super._onCreate(data, options, userID);
    this.setFlag("fs2e", "shotCost", fs2e.combat.defaultShotCost);
  }

  _getInitiativeFormula(combatant) {
    let baseFormula = super._getInitiativeFormula(combatant);
    const initiativePenalty = this.getFlag("fs2e", "initiativePenalty");

    if (initiativePenalty < 0) {
      baseFormula += ` + ${initiativePenalty}`;
    }
    return baseFormula;
  }

  async spendShots(cost = null) {
    const shotsSpent = cost ? cost : this.getFlag("fs2e", "shotCost");
    const newInitiative = this.initiative - shotsSpent

    await this.update({
      initiative: newInitiative,
      ["flags.fs2e.shotCost"]: fs2e.combat.defaultShotCost
    });

    return { shotsSpent, newInitiative };
  }

  async setState(data) {
    return this.update({
      initiative: data.initiative,
      ["flags.fs2e.shotCost"]: data.shotCost
    });
  }

  getState() {
    return {
      id: this.id,
      initiative: this.initiative,
      shotCost: this.getFlag("fs2e", "shotCost")
    };
  }
}