import { describe, expect, it } from 'vitest';

import { Character } from '../src/characters';
import { Combat } from '../src/combat';
import { buildCharacterProfile, loadGameContent } from '../src/data';
import { Game } from '../src/game';

const content = loadGameContent();
const heroProfile = buildCharacterProfile(content, content.config.heroId);
const banditProfile = buildCharacterProfile(content, content.config.rivalId);

describe('data', () => {
  it('resolves character templates into equipped slots', () => {
    expect(heroProfile.name).toBe('沈孤舟');
    expect(heroProfile.equipment.qinggong.name).toBe('踏云追影步');
    expect(heroProfile.equipment.neigong.name).toBe('潮生归元诀');
    expect(heroProfile.equipment.activeWaigongCategory).toBe('sword');
    expect(heroProfile.equipment.waigong.category).toBe('sword');
    expect(banditProfile.equipment.waigong.category).toBe('hidden-weapon');
  });

  it('loads loot rarity and scene bias data', () => {
    const swallowtailNeedleCase = content.gear.find((item) => item.id === 'swallowtail-needle-case');
    const ancientRoad = content.scenes.find((scene) => scene.id === 'ancient-road');
    const ancientRoadRumor = content.sceneEvents.find((event) => event.id === 'ancient-road-rumor');
    const rivalTemplate = content.characters.find((character) => character.id === content.config.rivalId);

    expect(swallowtailNeedleCase?.rarity).toBe('uncommon');
    expect(ancientRoad?.lootBias?.uncommon).toBe(2);
    expect(ancientRoadRumor?.type).toBe('rumor');
    expect(ancientRoadRumor?.cultivationReward).toBe(1);
    expect(rivalTemplate?.lootTable?.some((entry) => entry.gearId === 'swallowtail-needle-case')).toBe(true);
  });
});

describe('combat', () => {
  it('resolves a deterministic opening technique with equipment bonuses', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const action = combat.resolveTechnique(hero, bandit, hero.getTechniqueById('moonbreak-draw'));

    expect(action.hit).toBe(true);
    expect(action.martialArt).toBe('清霜江月剑');
    expect(action.technique).toBe('断潮横月');
    expect(action.damage).toBe(27);
    expect(action.defenderRemainingHealth).toBe(21);
    expect(action.attackerRemainingQi).toBe(24);
    expect(action.appliedStatuses).toContain('黑风盗获得破绽(4)');
  });

  it('lets qinggong affect speed and hit calculation', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);

    expect(hero.getSpeed()).toBeGreaterThan(heroProfile.attributes.agility);
    expect(hero.getAccuracyBonus('sword')).toBeGreaterThan(bandit.getAccuracyBonus('hidden-weapon'));
  });

  it('uses neigong synergy to improve defend and meditate', () => {
    const hero = new Character(heroProfile);
    const combat = new Combat();

    hero.spendQi(10);
    const defend = combat.resolveDefend(hero);
    const meditate = combat.resolveMeditate(hero);

    expect(defend.guardGained).toBe(12);
    expect(meditate.qiRecovered).toBe(11);
    expect(meditate.attackerRemainingQi).toBe(28);
  });

  it('allows a basic attack without qi cost', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat(() => 0.99);

    const action = combat.resolveBasicAttack(hero, bandit);

    expect(action.actionType).toBe('attack');
    expect(action.hit).toBe(true);
    expect(action.martialArt).toBe('清霜江月剑');
    expect(action.technique).toBe('回澜扫叶');
    expect(action.damage).toBe(24);
    expect(action.attackerRemainingQi).toBe(heroProfile.maxQi);
    expect(action.defenderRemainingHealth).toBe(24);
  });

  it('reduces incoming damage after defending', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat(() => 0.99);

    const defend = combat.resolveDefend(bandit);
    const action = combat.resolveBasicAttack(hero, bandit);

    expect(defend.actionType).toBe('defend');
    expect(defend.guardGained).toBe(9);
    expect(action.damage).toBe(15);
    expect(action.defenderGuard).toBe(0);
    expect(action.defenderRemainingHealth).toBe(33);
  });

  it('applies focus through sword technique and consumes it on next hit', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    combat.resolveTechnique(hero, bandit, hero.getTechniqueById('snow-return-ring'));
    expect(hero.statuses.some((status) => status.type === 'focus')).toBe(true);

    combat.resolveBasicAttack(hero, bandit);
    expect(hero.statuses.some((status) => status.type === 'focus')).toBe(false);
  });

  it('applies bleed and resolves round damage', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const action = combat.resolveTechnique(bandit, hero, bandit.getTechniqueById('firefly-scatter'));
    const roundLogs = combat.resolveRoundEffects(hero);

    expect(action.appliedStatuses).toContain('沈孤舟获得流血(3)');
    expect(roundLogs).toContain('沈孤舟因流血损失3点气血。');
    expect(hero.health).toBe(52);
  });

  it('finishes a duel with a winner and battle log', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const summary = combat.runDuel(hero, bandit);

    expect(summary.winner).toBe('沈孤舟');
    expect(summary.loser).toBe('黑风盗');
    expect(summary.rounds).toBeGreaterThan(0);
    expect(summary.log.length).toBeGreaterThan(0);
  });
});

describe('game', () => {
  it('starts with a valid scene and battle summary', () => {
    const game = new Game();
    const summary = game.start();

    expect(summary.scene.title).toBe('青石古道');
    expect(summary.battle.winner).toBe('沈孤舟');
    expect(summary.hero.health).toBeGreaterThan(0);
  });

  it('runs an encounter turn in terminal mode statefully', () => {
    const game = new Game();
    const initialState = game.beginEncounter();
    const turn = game.takeTurn('defend');

    expect(initialState.scene.title).toBe('青石古道');
    expect(turn.playerAction.actionType).toBe('defend');
    expect(turn.enemyAction).toBeDefined();
    expect(turn.actionLog.length).toBeGreaterThan(0);
    expect(turn.state.round).toBe(2);
    expect(turn.state.hero.guard).toBeGreaterThanOrEqual(0);
  });

  it('exposes menu data for terminal display', () => {
    const game = new Game();

    expect(game.getBattleActions()).toHaveLength(4);
    expect(game.getHeroTechniques().map((technique) => technique.name)).toContain('断潮横月');
    expect(game.getHeroBasicTechniques().map((technique) => technique.name)).toContain('江风点锋');
    expect(game.getHeroReferenceProfile().equipment.waigong.name).toBe('清霜江月剑');
    expect(game.getHeroGearOptions().weapon.map((item) => item.name)).toContain('惊涛铁拳套');
    expect(game.getHeroGearOptions().weapon.map((item) => item.name)).not.toContain('燕尾针囊');
    expect(game.getHeroGearOptions().ring.map((item) => item.name)).toContain('鹰目环');
    expect(game.getHeroLoadoutOptions().waigong.blade.map((martialArt) => martialArt.name)).toContain('断浪沉锋刀');
  });

  it('switches active waigong based on weapon category before battle', () => {
    const game = new Game();

    game.equipHeroWaigong('fist', 'cragbreaker-fist');
    game.equipHeroMartialArt('qinggong', 'drifting-reed-glide');
    game.equipHeroGear('weapon', 'storm-iron-gauntlet');
    game.equipHeroGear('clothes', 'iron-scale-vest');
    game.equipHeroGear('ring', 'iron-bone-ring');

    const profile = game.getHeroReferenceProfile();

    expect(profile.equipment.waigong.name).toBe('裂岳崩山拳');
    expect(profile.equipment.activeWaigongCategory).toBe('fist');
    expect(profile.equipment.qinggong.name).toBe('浮萍掠水纵');
    expect(profile.gear.weapon?.name).toBe('惊涛铁拳套');
    expect(profile.gear.clothes.name).toBe('铁鳞短甲');
    expect(profile.gear.ring.name).toBe('铁骨戒');
    expect(game.getHeroBasicTechniques().map((technique) => technique.name)).toContain('开碑直拳');
  });

  it('falls back to base waigong when weapon is removed', () => {
    const game = new Game();

    game.equipHeroGear('weapon', null);

    const profile = game.getHeroReferenceProfile();

    expect(profile.gear.weapon).toBeNull();
    expect(profile.equipment.activeWaigongCategory).toBe('fist');
    expect(profile.equipment.waigong.name).toBe('裂岳崩山拳');

    game.equipHeroWaigong('fist', null);

    const baseProfile = game.getHeroReferenceProfile();
    expect(baseProfile.equipment.waigong.name).toBe('基础拳脚');
  });

  it('adds dropped gear into inventory after victory', () => {
    const game = new Game(() => 0);
    let state = game.beginEncounter();
    let lastTurn: ReturnType<Game['takeTurn']> | undefined;

    while (!state.isFinished) {
      lastTurn = game.takeTurn('martial');
      state = lastTurn.state;
    }

    expect(lastTurn?.rewards).toContain('获得修为：3点');
    expect(lastTurn?.rewards).toContain('获得装备：燕尾针囊（武器 / 良品）');
    expect(game.getHeroGearInventory().weapon.map((item) => item.name)).toContain('燕尾针囊');
    expect(game.getCultivation()).toBe(3);
  });

  it('grants cultivation from non-combat travel events', () => {
    const game = new Game(() => 0);

    const result = game.travel();

    expect(result.event.id).toBe('ancient-road-rumor');
    expect(result.encounter).toBeUndefined();
    expect(result.cultivationGained).toBe(1);
    expect(result.totalCultivation).toBe(1);
    expect(game.getCultivation()).toBe(1);
  });

  it('can switch scenes and trigger encounter travel events', () => {
    const game = new Game(() => 0.99);

    const scene = game.travelToScene('teahouse');
    const result = game.travel();

    expect(scene.title).toBe('临河茶肆');
    expect(game.getCurrentScene().id).toBe('teahouse');
    expect(result.event.id).toBe('teahouse-spy');
    expect(result.encounter).toBeDefined();
    expect(result.encounter?.scene.id).toBe('teahouse');
    expect(result.totalCultivation).toBe(0);
  });

  it('spends cultivation on body training and permanently increases base stats', () => {
    const game = new Game(() => 0);

    for (let index = 0; index < 3; index += 1) {
      game.travel();
    }

    const before = game.getHeroReferenceProfile();
    const result = game.trainHero('body');
    const after = game.getHeroReferenceProfile();

    expect(result.spentCultivation).toBe(3);
    expect(result.newLevel).toBe(1);
    expect(after.maxHealth).toBe(before.maxHealth + 6);
    expect(after.attributes.constitution).toBe(before.attributes.constitution + 1);
    expect(game.getCultivation()).toBe(0);
  });

  it('improves current waigong through focused training', () => {
    const game = new Game(() => 0);

    for (let index = 0; index < 4; index += 1) {
      game.travel();
    }

    const before = game.getHeroReferenceProfile();
    const result = game.trainHero('waigong');
    const after = game.getHeroReferenceProfile();

    expect(result.newLevel).toBe(1);
    expect(after.equipment.waigong.passiveBonuses?.damage ?? 0).toBeGreaterThan(before.equipment.waigong.passiveBonuses?.damage ?? 0);
    expect(after.equipment.waigong.passiveBonuses?.accuracy ?? 0).toBeGreaterThan(before.equipment.waigong.passiveBonuses?.accuracy ?? 0);
  });
});