export type MartialArtType = 'qinggong' | 'neigong' | 'waigong';
export type WaigongCategory = 'fist' | 'blade' | 'sword' | 'staff' | 'hidden-weapon';
export type MartialArtCategory = 'movement' | 'internal' | WaigongCategory;
export type GearSlot = 'weapon' | 'clothes' | 'accessory' | 'bracer' | 'shoes' | 'hat' | 'ring';
export type GearRarity = 'common' | 'uncommon' | 'rare';

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
    basicTechniques?: Technique[];
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

export interface GearBonuses {
    strength: number;
    agility: number;
    constitution: number;
    insight: number;
    accuracy: number;
    evasion: number;
    speed: number;
    damage: number;
    guard: number;
    qiRecovery: number;
}

export interface GearItem {
    id: string;
    name: string;
    slot: GearSlot;
    description: string;
    rarity: GearRarity;
    weaponCategory?: WaigongCategory;
    bonuses: Partial<GearBonuses>;
}

export interface LootTableEntry {
    gearId: string;
    weight: number;
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
    knownMartialArtIds: KnownMartialArtIds;
    equippedGearIds: EquippedGearIds;
    knownGearIds: KnownGearIds;
    lootTable?: LootTableEntry[];
}

export interface EquippedMartialArtIds {
    qinggong: string;
    neigong: string;
    waigong: EquippedWaigongIds;
}

export type EquippedWaigongIds = Record<WaigongCategory, string | null>;

export interface EquippedGearIds {
    weapon: string | null;
    clothes: string;
    accessory: string;
    bracer: string;
    shoes: string;
    hat: string;
    ring: string;
}

export interface EquippedMartialArts {
    qinggong: MartialArt;
    neigong: MartialArt;
    waigong: MartialArt;
    waigongLoadout: Record<WaigongCategory, MartialArt>;
    activeWaigongCategory: WaigongCategory;
}

export interface EquippedGear {
    weapon: GearItem | null;
    clothes: GearItem;
    accessory: GearItem;
    bracer: GearItem;
    shoes: GearItem;
    hat: GearItem;
    ring: GearItem;
}

export interface KnownMartialArtIds {
    qinggong: string[];
    neigong: string[];
    waigong: KnownWaigongIds;
}

export type KnownWaigongIds = Record<WaigongCategory, string[]>;

export interface KnownGearIds {
    weapon: string[];
    clothes: string[];
    accessory: string[];
    bracer: string[];
    shoes: string[];
    hat: string[];
    ring: string[];
}

export interface KnownMartialArts {
    qinggong: MartialArt[];
    neigong: MartialArt[];
    waigong: Record<WaigongCategory, MartialArt[]>;
}

export interface KnownGear {
    weapon: GearItem[];
    clothes: GearItem[];
    accessory: GearItem[];
    bracer: GearItem[];
    shoes: GearItem[];
    hat: GearItem[];
    ring: GearItem[];
}

export type TrainingOptionId = 'body' | 'breath' | 'movement' | 'strength' | 'qinggong' | 'neigong' | 'waigong';

export interface HeroTrainingState {
    bodyLevel: number;
    breathLevel: number;
    movementLevel: number;
    strengthLevel: number;
    martialArtMastery: Record<string, number>;
}

export interface TrainingBonuses {
    maxHealth: number;
    maxQi: number;
    attributes: BaseAttributes;
    passiveBonuses: PassiveBonuses;
}

export interface TrainingOption {
    id: TrainingOptionId;
    name: string;
    description: string;
    currentLevel: number;
    nextCost: number;
    effectPreview: string;
    available: boolean;
    targetMartialArtId?: string;
    targetMartialArtName?: string;
}

export interface HeroTrainingOverview {
    cultivation: number;
    state: HeroTrainingState;
    bonuses: TrainingBonuses;
    options: TrainingOption[];
}

export interface TrainingResult {
    option: TrainingOption;
    spentCultivation: number;
    remainingCultivation: number;
    summary: string;
    newLevel: number;
}

export interface CharacterProfile {
    name: string;
    maxHealth: number;
    maxQi: number;
    attributes: BaseAttributes;
    equipment: EquippedMartialArts;
    knownMartialArts: KnownMartialArts;
    gear: EquippedGear;
    knownGear: KnownGear;
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
    lootBias?: Record<GearRarity, number>;
}

export type SceneEventType = 'encounter' | 'rumor' | 'training';

export interface SceneEventData {
    id: string;
    sceneId: string;
    title: string;
    description: string;
    type: SceneEventType;
    weight: number;
    cultivationReward?: number;
}

export interface GameConfig {
    initialSceneId: string;
    heroId: string;
    rivalId: string;
}

export interface GameContent {
    martialArts: MartialArt[];
    gear: GearItem[];
    characters: CharacterTemplate[];
    scenes: SceneData[];
    sceneEvents: SceneEventData[];
    config: GameConfig;
}

export interface GameState {
    currentSceneId: string;
    heroId: string;
    rivalId: string;
    heroLoadout: EquippedMartialArtIds;
    heroGearLoadout: EquippedGearIds;
    heroKnownGearIds: KnownGearIds;
    cultivation: number;
    heroTraining: HeroTrainingState;
}

export interface TravelResult {
    scene: SceneData;
    event: SceneEventData;
    encounter?: EncounterState;
    summary: string;
    log: string[];
    cultivationGained: number;
    totalCultivation: number;
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
    rewards: string[];
    state: EncounterState;
}