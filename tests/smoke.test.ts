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
});