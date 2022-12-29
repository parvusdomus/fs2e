import FS2CombatantConfig from "./combatantConfig.js";
import { fs2e } from "../config.js";

export default class FS2CombatTracker extends CombatTracker {
  get template() {
    return "systems/fs2e/templates/combat-tracker.hbs";
  }

  _onConfigureCombatant(li) {
    const combatant = this.viewed.combatants.get(li.data('combatant-id'));
    new FS2CombatantConfig(combatant, {
      top: Math.min(li[0].offsetTop, window.innerHeight - 350),
      left: window.innerWidth - 720,
      width: 400
    }).render(true);
  }

  async getData(options) {
    const data = await super.getData(options);

    if (!data.hasCombat) {
      return data;
    }

    for (let [i, combatant] of data.combat.turns.entries()) {
      data.turns[i].shotCost = combatant.getFlag("fs2e", "shotCost")
    }
    return data;
  }


  activateListeners(html) {
    super.activateListeners(html);

    html.find(".shotCost").change(this._onShotCostChanged.bind(this));
    html.find(".interrupt").click(this._onInterrupt.bind(this));
  }

  async _onShotCostChanged(event) {
    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const c = this.viewed.combatants.get(li.dataset.combatantId);

    await c.setFlag("fs2e", "shotCost", btn.value);

    this.render();
  }

  async _onInterrupt(event) {
    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const c = this.viewed.combatants.get(li.dataset.combatantId);

    fs2e.socket.executeAsGM("interrupt", this.viewed.id, c.id);
  }
}
