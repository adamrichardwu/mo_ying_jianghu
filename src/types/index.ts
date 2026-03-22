export type MartialArtType = 'qinggong' | 'neigong' | 'waigong';
export type WaigongCategory = 'sword' | 'fist' | 'hidden-weapon';
export type MartialArtCategory = 'movement' | 'internal' | WaigongCategory;

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
    category: MartialArtCategory;
    description: string;
    passiveBonuses?: Partial<PassiveBonuses>;
    synergy?: SynergyBonus[];
    techniques?: Technique[];
}

export interface Technique {
    id: string;
    name: string;
    description: string;
    power: number;
    qiCost: number;
    accuracy: number;
    effects?: MartialArtEffect[];
}

export interface PassiveBonuses {
    accuracy: number;
    evasion: number;
    speed: number;
    qiRecovery: number;
    guard: number;
    damage: number;
}

export interface SynergyBonus {
    waigongCategories: WaigongCategory[];
    accuracy: number;
    damage: number;
    qiRecovery: number;
    guard: number;
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
    equippedMartialArtIds: EquippedMartialArtIds;
}

export interface EquippedMartialArtIds {
    qinggong: string;
    neigong: string;
    waigong: string;
}

export interface EquippedMartialArts {
    qinggong: MartialArt;
    neigong: MartialArt;
    waigong: MartialArt;
}

export interface CharacterProfile {
    name: string;
    maxHealth: number;
    maxQi: number;
    attributes: BaseAttributes;
    equipment: EquippedMartialArts;
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
    technique?: string;
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
    actionLog: CombatActionResult[];
    roundLog: string[];
    state: EncounterState;
}