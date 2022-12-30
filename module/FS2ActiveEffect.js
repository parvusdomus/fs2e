export default class FS2ActiveEffect extends ActiveEffect {
  apply(actor, change) {
    let key = change.key.split(".");
    if (key[0] == "attack") {
      const attack = key[1];
      const actorData = actor.system;
      let stat = change.key;

      if (actorData.attackPrimary.name === attack) {
        stat = "system.attackPrimary.value";
      }
      else if (actorData.attackBackup.name === attack) {
        stat = "system.attackBackup.value";
      }
    }
    return super.apply(actor, change);
  }
}