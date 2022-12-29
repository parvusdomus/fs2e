import * as Dice from "../dice.js";
import * as Utils from "../utils.js";
import FS2ActorSheetBase from "./FS2ActorSheetBase.js";

export default class FS2VehicleSheet extends FS2ActorSheetBase {
  static get defaultOptions() {
    let newOptions = super.defaultOptions;
    newOptions.template = "systems/fs2e/templates/sheets/vehicle-actor-sheet.hbs";
    newOptions.classes.push("vehicle");
    newOptions.dragDrop.push({ dragSelector: ".passenger-list .passenger", dropSelector: null });
    return newOptions;
  }

  getData() {
    let sheetData = super.getData();
    const vehicleData = this.actor.data.data;

    const driver = Utils.getActorFromToken(vehicleData.driver);

    if (driver) {
      sheetData.driver = driver.data;
      sheetData.driver.drivingSkill = driver.getActionValueForSkillName("Driving");
      sheetData.drivingSkill = sheetData.driver.drivingSkill;
    }
    else {
      sheetData.drivingSkill = 0;
    }

    sheetData.passengers = vehicleData.passengers.map((passenger) => {
      return {
        tokenId: passenger,
        data: Utils.getActorFromToken(passenger).data
      };
    })

    return sheetData;
  }

  activateListeners(html) {

    if (this.actor.isOwner) {
      html.find(".passenger-control").click(this._onPassengerControl.bind(this));
    }
    else {
      html.find(".passenger-control").addClass("hidden");
    }

    super.activateListeners(html);
  }

  async _onPassengerControl(event) {
    const action = event.currentTarget.dataset.action;
    const currentPassengers = this.actor.data.data.passengers;

    if (action == "add") {
      let newPassengers = await this._pickPassengers();
      return this.actor.update({
        "data.passengers": newPassengers.concat(currentPassengers)
      });
    }

    if (action == "empty") {
      return this.actor.update({
        "data.passengers": []
      });
    }
    const passengerId = event.currentTarget.closest(".passenger").dataset.passengerId;

    if (action == "delete") {
      let passengers = this.actor.data.data.passengers.filter(id => id != passengerId);

      return this.actor.update({
        "data.passengers": passengers
      });
    }
  }

  async _pickPassengers() {
    const template = "systems/fs2e/templates/chat/token-picker-dialog.hbs";
    const currentPassengers = this.actor.data.data.passengers;
    // Non-GM users cannot assign hostile passengers to the vehicle.
    const filteredTokens = canvas.tokens.children[0].children.filter(token =>
      token.actor.type != "vehicle"
      && !currentPassengers.includes(token.id)
      && (game.user.isGM || token.data.disposition != CONST.TOKEN_DISPOSITIONS.HOSTILE)
    );
    const sceneTokens = filteredTokens.map(token => {
      return {
        name: token.data.name,
        img: token.data.img,
        id: token.data._id
      };
    });

    const templateData = { passengers: sceneTokens };
    const html = await renderTemplate(template, templateData);

    return new Promise(resolve => {
      const data = {
        title: game.i18n.format("fs2e.vehicle.passengerPicker", {}),
        content: html,
        buttons: {
          normal: {
            label: game.i18n.localize("fs2e.vehicle.addPassengers"),
            callback: html => resolve(this._processTokenPickerForm(html[0].querySelector("form")))
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

  _processTokenPickerForm(form) {
    const selectedTokens = Array.from(form.querySelectorAll(".token-select"))
      .filter(token => token.checked === true);
    return selectedTokens.map(token => token.dataset.id);
  }

  _onDragStart(event) {
    if (!event.currentTarget.classList.contains("passenger")) {
      super._onDragStart(event);
    }

    const dragData = {
      type: "Actor",
      id: event.currentTarget.dataset.passengerId,
      passenger: true
    };

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  async _onDropActor(event, data) {
    if (!this.actor.isOwner) {
      return false;
    }

    if (!data.passenger) {
      return;
    }

    let passengers = this.actor.data.data.passengers;
    const newPassenger = data.id;

    if (passengers.includes(newPassenger)) {
      // Existing passenger, sort.
      if (passengers.length == 1) {
        return;
      }

      // Remove passenger to be moved from the current list
      passengers.splice(passengers.indexOf(newPassenger), 1);
      const targetPassenger = event.target.closest(".passenger");

      if (targetPassenger) {
        // Re-add passenger in the right spot.
        passengers.splice(passengers.indexOf(targetPassenger.dataset.passengerId), 0, newPassenger);
      }
      else {
        // Re-add at the end
        passengers.push(newPassenger);
      }

      return this.actor.update({
        "data.passengers": passengers
      });
    }

    // New passenger, add to the list
    passengers.push(newPassenger);

    await this.actor.update({
      "data.passengers": passengers
    });
  }
}
