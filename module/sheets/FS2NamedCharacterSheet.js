import * as Dice from "../dice.js";
import FS2ActorSheetBase from "./FS2ActorSheetBase.js";

export default class FS2NamedCharacterSheet extends FS2ActorSheetBase {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/fs2e/templates/sheets/namedCharacter-sheet.hbs",
      resizable: false,
      classes: ["fs2e", "sheet", "namedCharacter"]
    });
  }

  getData() {
    let sheetData = super.getData();

    if (sheetData.actor.type != "mook") {
      sheetData.shticks = sheetData.items.filter(function (item) { return item.type == "shtick" });
      sheetData.skills = sheetData.items.filter(function (item) { return item.type == "skill" });
      sheetData.gear = sheetData.items.filter(function (item) {
        return item.type == "armor" || item.type == "vehicle"
      });


      sheetData.armors = sheetData.items.filter(function (item) { return item.type == "armor" });
      sheetData.vehicles = sheetData.items.filter(function (item) { return item.type == "vehicle" });

      sheetData.evenShticks = [];
      sheetData.oddShticks = [];

      // enrich Shticks HTML
      for (let shtick of sheetData.shticks) {
        shtick.system.description = TextEditor.enrichHTML(shtick.system.description, {async: false});

        if (shtick.flags.fs2e?.position == 1) {
          sheetData.oddShticks.push(shtick);
        }
        else {
          sheetData.evenShticks.push(shtick);
        }
      }
    }

    return sheetData;
  }

  activateListeners(html) {
    if (this.isEditable) {
      html.find(".inline-edit").change(this._onSkillEdit.bind(this));
      html.find(".shtick-toggle").click(this._onShtickToggle.bind(this));
      html.find('.death-icons').on("click contextmenu", this._onDeathMarkChange.bind(this));

      new ContextMenu(html, ".skill-item", this.itemContextMenu);
      new ContextMenu(html, ".shtick-border", this.itemContextMenu);
      new ContextMenu(html, ".gear-item", this.itemContextMenu);
    }

    //Owner-only Listeners
    if (this.actor.isOwner) {
      html.find(".death-check").click(this._onDeathCheck.bind(this));
    }

    super.activateListeners(html);
  }

  async _onShtickToggle(event) {
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const shtick = this.actor.items.get(itemID);
    const effects = this.actor.getEmbeddedCollection("ActiveEffect").contents;
    const relevantEffects = effects.filter(effect => effect.origin.endsWith(itemID));

    if (relevantEffects.length == 0) {
      return;
    }

    const newStatus = !shtick.system.active;

    const effect = relevantEffects[0];
    await effect.update({ disabled: !newStatus });
    return shtick.update({ "system.active": newStatus })
  }

  _onDeathCheck(event) {
    Dice.DeathCheck(this.actor);
  }

  _onSkillEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);
    let field = element.dataset.field;

    return item.update({ [field]: element.value });
  }

  _onDeathMarkChange(event) {
    event.preventDefault();
    let currentCount = this.actor.system.deathMarks;
    let newCount;

    if (event.type == "click") {
      newCount = Math.min(currentCount + 1, 6);
    } else {
      // contextmenu
      newCount = Math.max(currentCount - 1, 0);
    }

    this.actor.update({ "system.deathMarks": newCount });
  }
}