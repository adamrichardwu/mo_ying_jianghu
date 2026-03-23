import charactersData from './characters.json';
import configData from './game-config.json';
import gearData from './gear.json';
import martialArtsData from './martial-arts.json';
import sceneEventsData from './scene-events.json';
import scenesData from './scenes.json';
import { applyTrainingToAttributes, applyTrainingToMartialArt } from '../training';

import type {
    CharacterProfile,
    CharacterTemplate,
    EquippedGear,
    EquippedGearIds,
    EquippedMartialArts,
    EquippedMartialArtIds,
    GameConfig,
    GameContent,
    GearItem,
    HeroTrainingState,
    KnownGear,
    KnownGearIds,
    KnownMartialArts,
    MartialArt,
    SceneEventData,
    SceneData,
    WaigongCategory,
} from '../types';

export function loadGameContent(): GameContent {
    return {
        martialArts: martialArtsData as MartialArt[],
        gear: gearData as GearItem[],
        characters: charactersData as CharacterTemplate[],
        scenes: scenesData as SceneData[],
        sceneEvents: sceneEventsData as SceneEventData[],
        config: configData as GameConfig,
    };
}

export function buildCharacterProfile(
    content: GameContent,
    characterId: string,
    loadoutOverride?: EquippedMartialArtIds,
    gearOverride?: EquippedGearIds,
    knownGearOverride?: KnownGearIds,
    trainingState?: HeroTrainingState,
): CharacterProfile {
    const template = content.characters.find((entry) => entry.id === characterId);

    if (!template) {
        throw new Error(`Character not found: ${characterId}`);
    }

    const gear = resolveGear(content.gear, gearOverride ?? template.equippedGearIds);
    const equipment = resolveEquipment(content.martialArts, loadoutOverride ?? template.equippedMartialArtIds, gear, trainingState);
    const knownMartialArts = resolveKnownMartialArts(content.martialArts, template);
    const knownGear = resolveKnownGear(content.gear, knownGearOverride ?? template.knownGearIds);
    const attributes = trainingState ? applyTrainingToAttributes(template.attributes, trainingState) : template.attributes;
    const maxHealth = template.maxHealth + (trainingState?.bodyLevel ?? 0) * 6;
    const maxQi = template.maxQi + (trainingState?.breathLevel ?? 0) * 4;

    return {
        name: template.name,
        maxHealth,
        maxQi,
        attributes,
        equipment,
        knownMartialArts,
        gear,
        knownGear,
    };
}

function resolveEquipment(martialArts: MartialArt[], equippedIds: EquippedMartialArtIds, gear: EquippedGear, trainingState?: HeroTrainingState): EquippedMartialArts {
    const waigongLoadout = resolveWaigongLoadout(martialArts, equippedIds.waigong, trainingState);
    const activeWaigongCategory = gear.weapon?.weaponCategory ?? 'fist';
    const qinggong = findMartialArt(martialArts, equippedIds.qinggong);
    const neigong = findMartialArt(martialArts, equippedIds.neigong);

    return {
        qinggong: trainingState ? applyTrainingToMartialArt(qinggong, trainingState) : qinggong,
        neigong: trainingState ? applyTrainingToMartialArt(neigong, trainingState) : neigong,
        waigong: waigongLoadout[activeWaigongCategory],
        waigongLoadout,
        activeWaigongCategory,
    };
}

function resolveKnownMartialArts(martialArts: MartialArt[], template: CharacterTemplate): KnownMartialArts {
    return {
        qinggong: template.knownMartialArtIds.qinggong.map((id) => findMartialArt(martialArts, id)),
        neigong: template.knownMartialArtIds.neigong.map((id) => findMartialArt(martialArts, id)),
        waigong: {
            fist: template.knownMartialArtIds.waigong.fist.map((id) => findMartialArt(martialArts, id)),
            blade: template.knownMartialArtIds.waigong.blade.map((id) => findMartialArt(martialArts, id)),
            sword: template.knownMartialArtIds.waigong.sword.map((id) => findMartialArt(martialArts, id)),
            staff: template.knownMartialArtIds.waigong.staff.map((id) => findMartialArt(martialArts, id)),
            'hidden-weapon': template.knownMartialArtIds.waigong['hidden-weapon'].map((id) => findMartialArt(martialArts, id)),
        },
    };
}

function resolveGear(gear: GearItem[], equippedGearIds: EquippedGearIds): EquippedGear {
    return {
        weapon: equippedGearIds.weapon ? findGear(gear, equippedGearIds.weapon) : null,
        clothes: findGear(gear, equippedGearIds.clothes),
        accessory: findGear(gear, equippedGearIds.accessory),
        bracer: findGear(gear, equippedGearIds.bracer),
        shoes: findGear(gear, equippedGearIds.shoes),
        hat: findGear(gear, equippedGearIds.hat),
        ring: findGear(gear, equippedGearIds.ring),
    };
}

function resolveWaigongLoadout(
    martialArts: MartialArt[],
    equippedIds: EquippedMartialArtIds['waigong'],
    trainingState?: HeroTrainingState,
): Record<WaigongCategory, MartialArt> {
    return {
        fist: findWaigong(martialArts, 'fist', equippedIds.fist, trainingState),
        blade: findWaigong(martialArts, 'blade', equippedIds.blade, trainingState),
        sword: findWaigong(martialArts, 'sword', equippedIds.sword, trainingState),
        staff: findWaigong(martialArts, 'staff', equippedIds.staff, trainingState),
        'hidden-weapon': findWaigong(martialArts, 'hidden-weapon', equippedIds['hidden-weapon'], trainingState),
    };
}

function resolveKnownGear(gear: GearItem[], knownGearIds: KnownGearIds): KnownGear {
    return {
        weapon: knownGearIds.weapon.map((id) => findGear(gear, id)),
        clothes: knownGearIds.clothes.map((id) => findGear(gear, id)),
        accessory: knownGearIds.accessory.map((id) => findGear(gear, id)),
        bracer: knownGearIds.bracer.map((id) => findGear(gear, id)),
        shoes: knownGearIds.shoes.map((id) => findGear(gear, id)),
        hat: knownGearIds.hat.map((id) => findGear(gear, id)),
        ring: knownGearIds.ring.map((id) => findGear(gear, id)),
    };
}

function findMartialArt(martialArts: MartialArt[], martialArtId: string): MartialArt {
    const martialArt = martialArts.find((entry) => entry.id === martialArtId);

    if (!martialArt) {
        throw new Error(`Martial art not found: ${martialArtId}`);
    }

    return martialArt;
}

function findGear(gear: GearItem[], gearId: string): GearItem {
    const item = gear.find((entry) => entry.id === gearId);

    if (!item) {
        throw new Error(`Gear not found: ${gearId}`);
    }

    return item;
}

function findWaigong(martialArts: MartialArt[], category: WaigongCategory, martialArtId: string | null, trainingState?: HeroTrainingState): MartialArt {
    if (martialArtId) {
        const martialArt = findMartialArt(martialArts, martialArtId);

        if (martialArt.type !== 'waigong' || martialArt.category !== category) {
            throw new Error(`Martial art ${martialArtId} does not match waigong category ${category}`);
        }

        return trainingState ? applyTrainingToMartialArt(martialArt, trainingState) : martialArt;
    }

    const baseWaigong = findBaseWaigong(martialArts, category);
    return trainingState ? applyTrainingToMartialArt(baseWaigong, trainingState) : baseWaigong;
}

function findBaseWaigong(martialArts: MartialArt[], category: WaigongCategory): MartialArt {
    const baseIdMap: Record<WaigongCategory, string> = {
        fist: 'basic-fist-art',
        blade: 'basic-blade-art',
        sword: 'basic-sword-art',
        staff: 'basic-staff-art',
        'hidden-weapon': 'basic-hidden-weapon-art',
    };

    return findMartialArt(martialArts, baseIdMap[category]);
}