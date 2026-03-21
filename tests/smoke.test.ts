import { describe, expect, it } from 'vitest';

import { Character } from '../src/characters';
import { Combat } from '../src/combat';
import { Game } from '../src/game';
import type { CharacterProfile } from '../src/types';

const heroProfile: CharacterProfile = {
  name: '沈孤舟',
  maxHealth: 72,
  maxQi: 28,
  attributes: {
    strength: 10,
    agility: 8,
    constitution: 9,
    insight: 7,
  },
  martialArts: [
    {
      name: '破影拳',
      type: 'waigong',
      power: 14,
      qiCost: 4,
      accuracy: 0.9,
    },
  ],
};

const banditProfile: CharacterProfile = {
  name: '黑风盗',
  maxHealth: 48,
  maxQi: 12,
  attributes: {
    strength: 7,
    agility: 5,
    constitution: 6,
    insight: 4,
  },
  martialArts: [
    {
      name: '乱石刀',
      type: 'waigong',
      power: 9,
      qiCost: 3,
      accuracy: 0.72,
    },
  ],
};

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