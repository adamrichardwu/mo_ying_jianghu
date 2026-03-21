export type MartialArtType = 'qinggong' | 'neigong' | 'waigong';

export interface BaseAttributes {
    strength: number;
    agility: number;
    constitution: number;
    insight: number;
}

export interface MartialArt {
    name: string;
    type: MartialArtType;
    power: number;
    qiCost: number;
    accuracy: number;
}

export interface CharacterProfile {
    name: string;
    maxHealth: number;
    maxQi: number;
    attributes: BaseAttributes;
    martialArts: MartialArt[];
}

export interface CharacterState {
    health: number;
    qi: number;
}

export interface CombatActionResult {
    attacker: string;
    defender: string;
    martialArt: string;
    hit: boolean;
    damage: number;
    defenderRemainingHealth: number;
    attackerRemainingQi: number;
    summary: string;
}

export interface CombatSummary {
    winner: string;
    loser: string;
    rounds: number;
    log: string[];
}

export interface SceneData {
    id: string;
    title: string;
    description: string;
    threats: string[];
}

export interface GameState {
    currentSceneId: string;
    hero: CharacterProfile;
}