import * as Dice from "../dice.js";

export default class FS2ActorSheetBase extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/fs2e/templates/sheets/namedCharacter-sheet.hbs",
      resizable: false,
      classes: ["fs2e", "sheet", "namedCharacter"]
    });
  }

  itemContextMenu = [
    {
      name: game.i18n.localize("fs2e.sheet.edit"),
      icon: '<i class="fas fa-edit"></i>',
      condition: element => {
        return !element.hasClass("skill-item");
      },
      callback: element => {
        const item = this.actor.items.get(element.data("item-id"));
        item.sheet.render(true);
      }
    },
    {
      name: game.i18n.localize("fs2e.sheet.delete"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.deleteEmbeddedDocuments("Item", [element.data("item-id")]);
      }
    }
  ];

  getData() {
    const baseData = super.getData();
    let sheetData = {
      owner: this.actor.isOwner,
      editable: this.isEditable,
      actor: baseData.actor,
      data: baseData.actor.system,
      items: baseData.items,
      config: CONFIG.fs2e
    };

    sheetData.typeString = `fs2e.actor.${sheetData.actor.type}`;
    sheetData.weapons = baseData.items.filter(function (item) { return item.type == "weapon" });

    if (sheetData.actor.type != "mook") {
      sheetData.firstImpairment = sheetData.data.impairment.threshold;
      sheetData.secondImpairment = sheetData.firstImpairment + 5;
    }

    return sheetData;
  }

  activateListeners(html) {
    if (this.isEditable) {
      html.find(".item-create").click(this._onItemCreate.bind(this));
      html.find(".item-edit").click(this._onItemEdit.bind(this));
      html.find(".item-delete").click(this._onItemDelete.bind(this));

      html.find('.wound-point').click(this._onWoundsClick.bind(this));

      new ContextMenu(html, ".weapon-card", this.itemContextMenu);
      new ContextMenu(html, ".wound-point", [
        {
          name: game.i18n.localize("fs2e.sheet.setImpairmentThreshold"),
          icon: '<i class="fas fa-edit"></i>',
          callback: element => {
            let selectedIndex = element.data("index");
            this.actor.update({ "data.impairment.threshold": selectedIndex });
          }
        }
      ]);
    }

    //Owner-only Listeners
    if (this.actor.isOwner) {
      html.find(".item-roll").click(this._onItemRoll.bind(this));
      html.find(".task-check").click(this._onTaskCheck.bind(this));
      html.find(".reveal-rollable").on("mouseover mouseout", this._onToggleRollable.bind(this));
    }

    super.activateListeners(html);
  }

  _onTaskCheck(event) {
    const dataset = event.currentTarget.dataset;
    let actor = this.actor;

    if (dataset.actor) {
      // Actor override (for driving checks from vehicle sheet)
      actor = game.actors.get(dataset.actor);
    }

    Dice.TaskCheck({
      actor,
      actionValue: dataset.actionValue,
      taskType: dataset.checkType,
      askForOptions: event.shiftKey
    });
  }

  _onToggleRollable(event) {
    const rollables = event.currentTarget.getElementsByClassName("rollable");
    $.each(rollables, function (index, value) {
      $(value).toggleClass("hidden");
    });
  }

  _onItemRoll(event) {
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);

    item.roll();
  }

  _onItemCreate(event) {
    event.preventDefault();
    let element = event.currentTarget;

    let itemData = {
      name: game.i18n.localize("fs2e.sheet.newItem"),
      type: element.dataset.type
    };

    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _onItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);

    item.sheet.render(true);
  }

  _onItemDelete(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest(".item").dataset.itemId;
    return this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  _onWoundsClick(event) {
    event.preventDefault();
    let index = event.currentTarget.dataset.index;
    let currentWounds = this.actor.system.wounds.value;

    if (index == currentWounds) {
      --index;
    }

    this.actor.update({ "data.wounds.value": index });
  }

  _onSortItem(event, itemData) {
    const source = this.actor.items.get(itemData._id);

    switch (source.data.type) {
      case "armor":
      case "vehicle":
        const siblings = this.actor.items.filter(i => {
          return (i.data._id !== source.data._id);
        });

        // Get the drop target
        const dropTarget = event.target.closest("[data-item-id]");
        const targetId = dropTarget ? dropTarget.dataset.itemId : null;
        const target = siblings.find(s => s.data._id === targetId);

        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(source, { target: target, siblings });
        const updateData = sortUpdates.map(u => {
          const update = u.update;
          update._id = u.target.data._id;
          return update;
        });

        // Perform the update
        return this.actor.updateEmbeddedDocuments("Item", updateData);
      case "shtick":
        const positionTarget = event.target.closest("[data-side]");
        const sideID = positionTarget ? positionTarget.dataset.side : 0;

        source.setFlag("fs2e", "position", sideID);
      default:
        return super._onSortItem(event, itemData);
    }
  }
}