export default class FS2ItemSheet extends ItemSheet {

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 530,
      height: 340,
      classes: ["fs2e", "sheet", "item"]
    });
  }

  get template() {
    return `systems/fs2e/templates/sheets/${this.item.type}-sheet.hbs`;
  }

  getData() {
    const baseData = super.getData();
    const item = baseData.item;
    let sheetData = {
      owner: this.item.isOwner,
      editable: this.isEditable,
      item: item,
      data: item.system,
      effects: item.getEmbeddedCollection("ActiveEffect").contents,
      config: CONFIG.fs2e
    };

    return sheetData;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (this.isEditable) {
      html.find(".effect-control").click(this._onEffectControl.bind(this));
      html.find(".shtick-type").change(this._onShtickTypeChange.bind(this));
    }
  }

  _onEffectControl(event) {
    event.preventDefault();
    const owner = this.item;
    const a = event.currentTarget;
    const li = a.closest("li");
    const effect = li?.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    switch (a.dataset.action) {
      case "create":
        if (this.item.isEmbedded) {
          return ui.notifications.error("Managing embedded Documents which are not direct descendants of a primary Document is un-supported at this time.");
        }
        return owner.createEmbeddedDocuments("ActiveEffect", [{
          label: "New Effect",
          icon: "icons/svg/aura.svg",
          origin: owner.uuid,
          disabled: true
        }]);
      case "edit":
        return effect.sheet.render(true);
      case "delete":
        return effect.delete();
    }
  }

  async _onShtickTypeChange(event) {
    await this._onSubmit(event);
    this.item.update({ img: `systems/fs2e/icons/shticks/${this.item.system.type}.png` });
  }
}