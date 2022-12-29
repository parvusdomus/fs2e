import { fs2e } from "../config.js";

export default class FS2ActiveEffectConfig extends ActiveEffectConfig {
  get template() {
    return "systems/fs2e/templates/sheets/activeEffect-config.hbs";
  }

  getData() {
    const sheetData = super.getData();

    sheetData.config = fs2e;

    return sheetData;
  }
}