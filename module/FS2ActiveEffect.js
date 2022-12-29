export default class FS2ActiveEffect extends ActiveEffect {
  apply(actor, change) {
    let key = change.key.split(".");
    if (key[0] == "attack") {
      const attack = key[1];
      const actorData = actor.data.data;
      let stat = change.key;

      if (actorData.attackPrimary.name === attack) {
        stat = "data.attackPrimary.value";
      }
      else if (actorData.attackBackup.name === attack) {
        stat = "data.attackBackup.value";
      }
    }
    return super.apply(actor, change);
  }
}