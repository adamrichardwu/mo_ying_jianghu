import type {
    BaseAttributes,
    CharacterProfile,
    HeroTrainingOverview,
    HeroTrainingState,
    MartialArt,
    PassiveBonuses,
    TrainingBonuses,
    TrainingOption,
    TrainingOptionId,
} from '../types';

const ZERO_ATTRIBUTES: BaseAttributes = {
    strength: 0,
    agility: 0,
    constitution: 0,
    insight: 0,
};

const ZERO_PASSIVE_BONUSES: PassiveBonuses = {
    accuracy: 0,
    evasion: 0,
    speed: 0,
    qiRecovery: 0,
    guard: 0,
    damage: 0,
};

export function createEmptyHeroTrainingState(): HeroTrainingState {
    return {
        bodyLevel: 0,
        breathLevel: 0,
        movementLevel: 0,
        strengthLevel: 0,
        martialArtMastery: {},
    };
}

export function createTrainingOverview(profile: CharacterProfile, trainingState: HeroTrainingState, cultivation: number): HeroTrainingOverview {
    return {
        cultivation,
        state: cloneTrainingState(trainingState),
        bonuses: calculateTrainingBonuses(profile, trainingState),
        options: getTrainingOptions(profile, trainingState, cultivation),
    };
}

export function calculateTrainingBonuses(profile: CharacterProfile, trainingState: HeroTrainingState): TrainingBonuses {
    const qinggongLevel = trainingState.martialArtMastery[profile.equipment.qinggong.id] ?? 0;
    const neigongLevel = trainingState.martialArtMastery[profile.equipment.neigong.id] ?? 0;
    const waigongLevel = trainingState.martialArtMastery[profile.equipment.waigong.id] ?? 0;

    return {
        maxHealth: trainingState.bodyLevel * 6,
        maxQi: trainingState.breathLevel * 4,
        attributes: {
            strength: trainingState.strengthLevel,
            agility: trainingState.movementLevel,
            constitution: trainingState.bodyLevel,
            insight: trainingState.breathLevel,
        },
        passiveBonuses: {
            accuracy: waigongLevel * 0.01,
            evasion: qinggongLevel * 0.01,
            speed: Math.floor(qinggongLevel / 2),
            qiRecovery: Math.floor((neigongLevel + 1) / 2),
            guard: Math.floor(neigongLevel / 2),
            damage: Math.floor((waigongLevel + 1) / 2),
        },
    };
}

export function applyTrainingToMartialArt(martialArt: MartialArt, trainingState: HeroTrainingState): MartialArt {
    const level = trainingState.martialArtMastery[martialArt.id] ?? 0;

    if (level === 0) {
        return martialArt;
    }

    const passiveBonuses = mergePassiveBonuses(martialArt.passiveBonuses, getMartialArtTrainingBonus(martialArt.id, martialArt.type, level));

    return {
        ...martialArt,
        passiveBonuses,
    };
}

export function applyTrainingToAttributes(attributes: BaseAttributes, trainingState: HeroTrainingState): BaseAttributes {
    return {
        strength: attributes.strength + trainingState.strengthLevel,
        agility: attributes.agility + trainingState.movementLevel,
        constitution: attributes.constitution + trainingState.bodyLevel,
        insight: attributes.insight + trainingState.breathLevel,
    };
}

export function getTrainingOptions(profile: CharacterProfile, trainingState: HeroTrainingState, cultivation: number): TrainingOption[] {
    const qinggong = createMartialTrainingOption('qinggong', '研习轻功', '闭门体悟当前轻功的走位、借力与闪转节奏。', profile.equipment.qinggong, trainingState, cultivation);
    const neigong = createMartialTrainingOption('neigong', '研习内功', '闭关运转周天，打磨护体、回气与内息衔接。', profile.equipment.neigong, trainingState, cultivation);
    const waigong = createMartialTrainingOption('waigong', '研习外功', '反复拆解当前外功的起手、发力与收招。', profile.equipment.waigong, trainingState, cultivation);

    return [
        createBaseTrainingOption('body', '打熬筋骨', '用桩功和负重打熬筋骨，提升抗打与血气底子。', trainingState.bodyLevel, cultivation, '+1 根骨，+6 气血上限'),
        createBaseTrainingOption('breath', '吐纳周天', '调息归元，稳固经络与气海，提升真气底子。', trainingState.breathLevel, cultivation, '+1 悟性，+4 真气上限'),
        createBaseTrainingOption('movement', '轻身走桩', '反复走桩换步，夯实身法和出手节奏。', trainingState.movementLevel, cultivation, '+1 身法'),
        createBaseTrainingOption('strength', '磨砺臂力', '以器械和桩架磨砺发力，强化正面压制。', trainingState.strengthLevel, cultivation, '+1 臂力'),
        qinggong,
        neigong,
        waigong,
    ];
}

export function levelUpTraining(trainingState: HeroTrainingState, optionId: TrainingOptionId, martialArtId?: string): HeroTrainingState {
    const nextState = cloneTrainingState(trainingState);

    switch (optionId) {
        case 'body':
            nextState.bodyLevel += 1;
            break;
        case 'breath':
            nextState.breathLevel += 1;
            break;
        case 'movement':
            nextState.movementLevel += 1;
            break;
        case 'strength':
            nextState.strengthLevel += 1;
            break;
        case 'qinggong':
        case 'neigong':
        case 'waigong':
            if (!martialArtId) {
                throw new Error(`Martial art id is required for training option: ${optionId}`);
            }

            nextState.martialArtMastery[martialArtId] = (nextState.martialArtMastery[martialArtId] ?? 0) + 1;
            break;
    }

    return nextState;
}

function createBaseTrainingOption(
    id: TrainingOptionId,
    name: string,
    description: string,
    currentLevel: number,
    cultivation: number,
    effectPreview: string,
): TrainingOption {
    const nextCost = 3 + currentLevel * 2;

    return {
        id,
        name,
        description,
        currentLevel,
        nextCost,
        effectPreview,
        available: cultivation >= nextCost,
    };
}

function createMartialTrainingOption(
    id: TrainingOptionId,
    name: string,
    description: string,
    martialArt: MartialArt,
    trainingState: HeroTrainingState,
    cultivation: number,
): TrainingOption {
    const currentLevel = trainingState.martialArtMastery[martialArt.id] ?? 0;
    const nextCost = 4 + currentLevel * 3;

    return {
        id,
        name,
        description,
        currentLevel,
        nextCost,
        targetMartialArtId: martialArt.id,
        targetMartialArtName: martialArt.name,
        effectPreview: getMartialPreview(id),
        available: cultivation >= nextCost,
    };
}

function getMartialPreview(id: TrainingOptionId): string {
    switch (id) {
        case 'qinggong':
            return '熟练提升后增加闪避，并在偶数层提升速度';
        case 'neigong':
            return '熟练提升后增加回气，并逐步增强护体';
        case 'waigong':
            return '熟练提升后增加命中，并逐步增强伤害';
        default:
            return '';
    }
}

function getMartialArtTrainingBonus(martialArtId: string, type: MartialArt['type'], level: number): Partial<PassiveBonuses> {
    switch (type) {
        case 'qinggong':
            return {
                evasion: level * 0.01,
                speed: Math.floor(level / 2),
            };
        case 'neigong':
            return {
                qiRecovery: Math.floor((level + 1) / 2),
                guard: Math.floor(level / 2),
            };
        case 'waigong':
            return {
                accuracy: level * 0.01,
                damage: Math.floor((level + 1) / 2),
            };
    }
}

function mergePassiveBonuses(base: Partial<PassiveBonuses> | undefined, extra: Partial<PassiveBonuses>): PassiveBonuses {
    return {
        accuracy: (base?.accuracy ?? 0) + (extra.accuracy ?? 0),
        evasion: (base?.evasion ?? 0) + (extra.evasion ?? 0),
        speed: (base?.speed ?? 0) + (extra.speed ?? 0),
        qiRecovery: (base?.qiRecovery ?? 0) + (extra.qiRecovery ?? 0),
        guard: (base?.guard ?? 0) + (extra.guard ?? 0),
        damage: (base?.damage ?? 0) + (extra.damage ?? 0),
    };
}

function cloneTrainingState(trainingState: HeroTrainingState): HeroTrainingState {
    return {
        bodyLevel: trainingState.bodyLevel,
        breathLevel: trainingState.breathLevel,
        movementLevel: trainingState.movementLevel,
        strengthLevel: trainingState.strengthLevel,
        martialArtMastery: { ...trainingState.martialArtMastery },
    };
}

export const zeroTrainingBonuses: TrainingBonuses = {
    maxHealth: 0,
    maxQi: 0,
    attributes: ZERO_ATTRIBUTES,
    passiveBonuses: ZERO_PASSIVE_BONUSES,
};