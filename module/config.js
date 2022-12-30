export const fs2e = {};

fs2e.deathCheckBaseDifficulty = 4;
fs2e.upCheckDifficulty = 5;
fs2e.unskilledCheckValue = 7;
fs2e.antiVehicleWeaponDamage = 18;
fs2e.mountedWeaponDamage = {
  normal: 15,
  heavy: 16,
  heavyVsVehicle: 25
};

fs2e.combat = {
  defaultShotCost: 3,
  dodgeShotCost: 1,
  dodgeDefenseBonus: 3,
  sequenceDuration: 80
}

fs2e.attackTypes = {
  none: "",
  guns: "fs2e.attack.guns",
  martialArts: "fs2e.attack.martialArts",
  sorcery: "fs2e.attack.sorcery",
  creature: "fs2e.attack.creature",
  scroungetech: "fs2e.attack.scroungetech",
  mutant: "fs2e.attack.mutant"
}

fs2e.activeEffectChanges = {
  "system.defense": "fs2e.stats.defense",
  "system.speed": "fs2e.stats.speed",
  "system.toughness": "fs2e.stats.toughness",
  "system.bonuses.checks.up": "fs2e.chat.actions.upcheck",
  "system.bonuses.checks.reload": "fs2e.chat.actions.reload",
  "attack.guns": "fs2e.attack.guns",
  "attack.martialArts": "fs2e.attack.martialArts",
  "attack.sorcery": "fs2e.attack.sorcery",
  "attack.creature": "fs2e.attack.creature",
  "attack.scroungetech": "fs2e.attack.scroungetech",
  "attack.mutant": "fs2e.attack.mutant"
}

fs2e.shtickTypes = {
  core: "fs2e.shtick.types.core",
  supernatural: "fs2e.shtick.types.supernatural",
  gun: "fs2e.shtick.types.gun",
  animal: "fs2e.shtick.types.animal",
  fu: "fs2e.shtick.types.fu",
  gene: "fs2e.shtick.types.gene",
  driving: "fs2e.shtick.types.driving",
  scroungetech: "fs2e.shtick.types.scroungetech",
  sorcery: "fs2e.shtick.types.sorcery",
  disadvantage: "fs2e.shtick.types.disadvantage"
}

fs2e.wealthLevels = {
  poor: "fs2e.wealth.poor",
  stiff: "fs2e.wealth.stiff",
  rich: "fs2e.wealth.rich"
}

fs2e.fortuneTypes = {
  fortune: "fs2e.stats.fortune",
  chi: "fs2e.stats.chi",
  magic: "fs2e.stats.magic",
  genome: "fs2e.stats.genome",
}

fs2e.taskCheckTypes = {
  guns: "fs2e.chat.taskCheck.types.guns",
  martialArts: "fs2e.chat.taskCheck.types.martialArts",
  sorcery: "fs2e.chat.taskCheck.types.sorcery",
  creature: "fs2e.chat.taskCheck.types.creature",
  scroungetech: "fs2e.chat.taskCheck.types.scroungetech",
  mutant: "fs2e.chat.taskCheck.types.mutant",
  fortune: "fs2e.chat.taskCheck.types.fortune",
  defense: "fs2e.chat.taskCheck.types.defense",
  toughness: "fs2e.chat.taskCheck.types.toughness",
  speed: "fs2e.chat.taskCheck.types.speed",
  death: "fs2e.chat.taskCheck.types.death",
  up: "fs2e.chat.taskCheck.types.up",
  reload: "fs2e.chat.taskCheck.types.reload"
}
