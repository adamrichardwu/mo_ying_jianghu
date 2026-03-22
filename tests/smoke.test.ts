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
    expect(heroProfile.equipment.waigong.category).toBe('sword');
    expect(banditProfile.equipment.waigong.category).toBe('hidden-weapon');
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
    expect(action.damage).toBe(25);
    expect(action.defenderRemainingHealth).toBe(23);
    expect(action.attackerRemainingQi).toBe(24);
    expect(action.appliedStatuses).toContain('黑风盗获得破绽(4)');
  });

  it('lets qinggong affect speed and hit calculation', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);

    expect(hero.getSpeed()).toBeGreaterThan(bandit.getSpeed());
    expect(hero.getAccuracyBonus('sword')).toBeGreaterThan(bandit.getAccuracyBonus('hidden-weapon'));
  });

  it('uses neigong synergy to improve defend and meditate', () => {
    const hero = new Character(heroProfile);
    const combat = new Combat();

    hero.spendQi(10);
    const defend = combat.resolveDefend(hero);
    const meditate = combat.resolveMeditate(hero);

    expect(defend.guardGained).toBe(9);
    expect(meditate.qiRecovered).toBe(9);
    expect(meditate.attackerRemainingQi).toBe(27);
  });

  it('allows a basic attack without qi cost', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const action = combat.resolveBasicAttack(hero, bandit);

    expect(action.actionType).toBe('attack');
    expect(action.hit).toBe(true);
    expect(action.damage).toBe(15);
    expect(action.attackerRemainingQi).toBe(heroProfile.maxQi);
    expect(action.defenderRemainingHealth).toBe(33);
  });

  it('reduces incoming damage after defending', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const defend = combat.resolveDefend(bandit);
    const action = combat.resolveBasicAttack(hero, bandit);

    expect(defend.actionType).toBe('defend');
    expect(defend.guardGained).toBe(9);
    expect(action.damage).toBe(6);
    expect(action.defenderGuard).toBe(0);
    expect(action.defenderRemainingHealth).toBe(42);
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
    expect(hero.health).toBe(54);
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
    expect(game.getHeroReferenceProfile().equipment.waigong.name).toBe('清霜江月剑');
  });
});