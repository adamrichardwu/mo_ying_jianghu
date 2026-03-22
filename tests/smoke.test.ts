import { describe, expect, it } from 'vitest';

import { Character } from '../src/characters';
import { Combat } from '../src/combat';
import { buildCharacterProfile, loadGameContent } from '../src/data';
import { Game } from '../src/game';

const content = loadGameContent();
const heroProfile = buildCharacterProfile(content, content.config.heroId);
const banditProfile = buildCharacterProfile(content, content.config.rivalId);

describe('data', () => {
  it('resolves character templates into full profiles', () => {
    expect(heroProfile.name).toBe('沈孤舟');
    expect(heroProfile.martialArts).toHaveLength(2);
    expect(heroProfile.martialArts[0].id).toBe('breaking-shadow-fist');
    expect(banditProfile.martialArts[0].name).toBe('乱石刀');
  });
});

describe('combat', () => {
  it('resolves a deterministic opening attack', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const action = combat.resolveAction(hero, bandit);

    expect(action.hit).toBe(true);
    expect(action.damage).toBe(22);
    expect(action.defenderRemainingHealth).toBe(26);
    expect(action.attackerRemainingQi).toBe(24);
    expect(action.appliedStatuses).toContain('黑风盗获得破绽(4)');
  });

  it('uses internal art to recover qi, gain guard and focus', () => {
    const hero = new Character(heroProfile);
    const combat = new Combat();

    hero.spendQi(10);
    const action = combat.resolveAction(hero, hero, heroProfile.martialArts[1]);

    expect(action.damage).toBe(0);
    expect(action.qiRecovered).toBe(7);
    expect(action.guardGained).toBe(5);
    expect(action.attackerRemainingQi).toBe(23);
    expect(hero.statuses.some((status) => status.type === 'focus')).toBe(true);
  });

  it('allows a basic attack without qi cost', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const action = combat.resolveBasicAttack(hero, bandit);

    expect(action.actionType).toBe('attack');
    expect(action.hit).toBe(true);
    expect(action.damage).toBe(12);
    expect(action.attackerRemainingQi).toBe(heroProfile.maxQi);
    expect(action.defenderRemainingHealth).toBe(36);
  });

  it('reduces incoming damage after defending', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const defend = combat.resolveDefend(bandit);
    const action = combat.resolveBasicAttack(hero, bandit);

    expect(defend.actionType).toBe('defend');
    expect(defend.guardGained).toBe(5);
    expect(action.damage).toBe(7);
    expect(action.defenderGuard).toBe(0);
    expect(action.defenderRemainingHealth).toBe(41);
  });

  it('recovers qi when meditating', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    combat.resolveAction(hero, bandit);
    const action = combat.resolveMeditate(hero);

    expect(action.actionType).toBe('meditate');
    expect(action.qiRecovered).toBe(6);
    expect(action.attackerRemainingQi).toBe(28);
    expect(action.damage).toBe(0);
  });

  it('applies bleed and resolves round damage', () => {
    const hero = new Character(heroProfile);
    const bandit = new Character(banditProfile);
    const combat = new Combat();

    const action = combat.resolveAction(bandit, hero, banditProfile.martialArts[0]);
    const roundLogs = combat.resolveRoundEffects(hero);

    expect(action.appliedStatuses).toContain('沈孤舟获得流血(3)');
    expect(roundLogs).toContain('沈孤舟因流血损失3点气血。');
    expect(hero.health).toBe(57);
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
    expect(turn.state.round).toBe(1);
    expect(turn.state.hero.guard).toBeGreaterThanOrEqual(0);
  });

  it('exposes menu data for terminal display', () => {
    const game = new Game();

    expect(game.getBattleActions()).toHaveLength(4);
    expect(game.getHeroMartialArts().map((martialArt) => martialArt.name)).toContain('归息诀');
    expect(game.getHeroReferenceProfile().name).toBe('沈孤舟');
  });
});