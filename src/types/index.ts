export type MartialArtType = 'qinggong' | 'neigong' | 'waigong';

export interface BaseAttributes {
    strength: number;
    agility: number;
    constitution: number;
    insight: number;
}

export interface MartialArt {
    id: string;
    name: string;
    type: MartialArtType;
    power: number;
    qiCost: number;
    accuracy: number;
    effects?: MartialArtEffect[];
}

export type StatusEffectType = 'bleed' | 'exposed' | 'focus';

export interface MartialArtEffect {
    type: StatusEffectType;
    target: 'self' | 'target';
    duration: number;
    potency: number;
    chance?: number;
}

export interface StatusEffect {
    type: StatusEffectType;
    name: string;
    duration: number;
    potency: number;
}

export interface CharacterTemplate {
    id: string;
    name: string;
    maxHealth: number;
    maxQi: number;
    attributes: BaseAttributes;
    martialArtIds: string[];
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
    guard: number;
    statuses: StatusEffect[];
}

export type CombatActionType = 'martial' | 'attack' | 'defend' | 'meditate';
export type PlayerAction = 'attack' | 'martial' | 'defend' | 'meditate';

export interface CombatActionResult {
    actionType: CombatActionType;
    attacker: string;
    defender: string;
    martialArt: string;
    hit: boolean;
    damage: number;
    defenderRemainingHealth: number;
    attackerRemainingQi: number;
    defenderGuard: number;
    qiRecovered?: number;
    guardGained?: number;
    appliedStatuses?: string[];
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

export interface GameConfig {
    initialSceneId: string;
    heroId: string;
    rivalId: string;
}

export interface GameContent {
    martialArts: MartialArt[];
    characters: CharacterTemplate[];
    scenes: SceneData[];
    config: GameConfig;
}

export interface GameState {
    currentSceneId: string;
    heroId: string;
    rivalId: string;
}

export interface EncounterState {
    scene: SceneData;
    hero: CharacterProfile & CharacterState;
    rival: CharacterProfile & CharacterState;
    round: number;
    isFinished: boolean;
    winner?: string;
}

export interface TurnResult {
    round: number;
    playerAction: CombatActionResult;
    enemyAction?: CombatActionResult;
    roundLog: string[];
    state: EncounterState;
}