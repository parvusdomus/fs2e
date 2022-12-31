export default class FS2Combat extends Combat {
  _sortCombatants(a, b) {
    const initA = Number.isNumeric(a.initiative) ? a.initiative : -9999;
    const initB = Number.isNumeric(b.initiative) ? b.initiative : -9999;

    let initDifference = initB - initA;
    if (initDifference != 0) {
      return initDifference;
    }

    const typeA = a.actor.type;
    const typeB = b.actor.type;

    if (typeA != typeB) {
      if (typeA == "hero") {
        return -1;
      }
      if (typeB == "hero") {
        return 1;
      }
    }

    return a.tokenId - b.tokenId;
  }

  _onUpdateEmbeddedDocuments(embeddedName, documents, result, options, userId) {
    this.setupTurns();
    if (game.user.id === userId) this.update({ turn: 0 });
    else this.update({ turn: 0 });

    if (this.active && (options.render !== false)) this.collection.render();
  }

  setupTurns() {
    // Determine the turn order and the current turn
    const turns = this.combatants.contents.sort(this._sortCombatants);
    if (this.turn !== null) this.turn = 0;

    // Update state tracking
    let c = turns[0];
    this.current = {
      round: this.round,
      turn: 0,
      combatantId: c ? c.id : null,
      tokenId: c ? c.tokenId : null
    };
    return this.turns = turns;
  }

  async _pushHistory(data) {
    let turnHistory = this.getFlag("fs2e", "turnHistory").slice();
    turnHistory.push(data);
    return this.setFlag("fs2e", "turnHistory", turnHistory);
  }

  async _popHistory() {
    let turnHistory = this.getFlag("fs2e", "turnHistory").slice();
    let result = turnHistory.pop();
    await this.setFlag("fs2e", "turnHistory", turnHistory);
    return result;
  }

  async spendShots(combatant, cost = null) {
    this._pushHistory(combatant.getState());

    return combatant.spendShots(cost);
  }

  async interrupt(combatant, cost = null) {
    const messageTemplate = "systems/fs2e/templates/chat/interrupt.hbs"
    const spendResult = await this.spendShots(combatant, cost);
    const templateData = {
      actor: combatant.actor.name,
      cost: spendResult.shotsSpent,
      initiative: spendResult.newInitiative,
      shotsLeft: spendResult.newInitiative > 0
    }

    ChatMessage.create({
      content: await renderTemplate(messageTemplate, templateData),
    });
  }

  async rollInitiative(ids, formulaopt, updateTurnopt, messageOptionsopt) {
    await super.rollInitiative(ids, formulaopt, updateTurnopt, messageOptionsopt);
    return this.update({ turn: 0 });
  }

  async startCombat() {
    await this.setupTurns();
    await this.setFlag("fs2e", "turnHistory", []);
    return super.startCombat();
  }

  async nextTurn() {
    let missingInitiative = this.combatants.filter(c => c.initiative === null);

    if (missingInitiative.length > 0) {
      missingInitiative.forEach(c =>
        ui.notifications.error(game.i18n.format("fs2e.combat.missingInitiative", { token: c.token.name })));
      return this;
    }

    await this.spendShots(this.combatant);

    let combatant = this.combatant;
    if (combatant.initiative <= 0) {
      return this.nextRound();
    }
    return this.update({ turn: 0 });
  }

  async nextRound() {
    await this._pushHistory(this.combatants.map(c => c.getState()));
    await this._pushHistory("newRound");

    this.combatants.forEach(c => c.setFlag("fs2e", "initiativePenalty", Math.min(c.initiative, 0)));

    await this.resetAll();

    return this.update({ round: this.round + 1, turn: 0 }, { advanceTime: CONFIG.time.roundTime });
  }

  async previousRound() {
    const round = Math.max(this.round - 1, 0);

    if (round > 0) {
      let turnHistory = this.getFlag("fs2e", "turnHistory").slice();
      let data = turnHistory.pop();

      let roundState;

      if (Array.isArray(data)) {
        roundState = data;
      }
      else {
        let index = turnHistory.lastIndexOf("newRound");
        turnHistory.splice(index);
        roundState = turnHistory.pop();
      }
      await this.setFlag("fs2e", "turnHistory", turnHistory);

      for (let c of roundState) {
        const combatant = this.getEmbeddedDocument("Combatant", c.id);
        await combatant.setState(c);
      }

      return this.update({ round: round, turn: 0 }, { advanceTime: -CONFIG.time.roundTime });
    }
  }

  async previousTurn() {
    let data = await this._popHistory();

    if (data == null || data === "newRound") {
      return this.previousRound();
    }

    const combatant = this.getEmbeddedDocument("Combatant", data.id);
    await combatant.setState(data);

    return this.update({ turn: 0 });
  }
}
