import { fs2e } from "./config.js";
import * as Utils from "./utils.js";

export default class FS2Actor extends Actor {
  prepareData() {
    super.prepareData();

    let actorData = this;
    let data = actorData.system;

    // Extra data for named characters.
    if (actorData.type != "mook") {
      // Calculate Impairment.
      let offsetWounds = data.wounds.value - data.impairment.threshold;
      if (offsetWounds >= 5) {
        data.impairment.fromWounds = 2;
      }
      else if (offsetWounds >= 0) {
        data.impairment.fromWounds = 1;
      }
      else {
        data.impairment.fromWounds = 0;
      }
      data.impairment.total = data.impairment.fromWounds + data.impairment.extra;

      if (actorData.type == "vehicle") {
        data.speed = data.acceleration;
        data.squeal = data.handling + 2;
        data.crunch = data.frame + 2;

        if (data.isMilitaryVehicle) {
          data.crunch += 1;
        }

        data.driver = data.passengers[0];
      }
    }
  }

  get hasFortune() {
    return this.system.fortune?.value > 0;
  }

  getEffectiveDefense() {
    let actorData = this.data;
    let data = actorData.data;

    let baseDefense;
    if (actorData.type == "vehicle") {
      // Assuming the driver's defense.
      baseDefense = Utils.getActorFromToken(data.driver)?.data.data.defense;
    }
    else {
      baseDefense = data.defense;
    }

    if (data.dodgeBonus) {
      baseDefense += data.dodgeBonus;
    }

    const impairment = actorData.type == "mook" ? 0 : data.impairment.total;

    return baseDefense - impairment;
  }

  getActionValueForSkillName(name) {
    let actionValue = fs2e.unskilledCheckValue;
    const relevantSkills = this.getEmbeddedCollection("Item").contents
      .filter(item => item.data.type == "skill" && item.data.name == name);


    if (relevantSkills.length > 0) {
      actionValue = parseInt(relevantSkills[0].data.data.value);
    }

    return actionValue;
  }

  getStatForAttackName(name) {
    let data = this.data.data;

    if (this.data.type == "mook") {
      // mooks always use primary attack
      return data.attackPrimary.value;
    }
    if (data.attackPrimary.name === name) {
      return data.attackPrimary.value;
    }
    else if (data.attackBackup.name === name) {
      return data.attackBackup.value;
    }
    return fs2e.unskilledCheckValue;
  }

  applyDamage(damage) {

    const wounds = this.data.data.wounds;
    const newWounds = Math.min(Math.max(wounds.value + damage, 0), wounds.max);

    this.update({ "data.wounds.value": newWounds });
  }
}