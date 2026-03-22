import charactersData from './characters.json';
import configData from './game-config.json';
import martialArtsData from './martial-arts.json';
import scenesData from './scenes.json';

import type {
    CharacterProfile,
    CharacterTemplate,
    EquippedMartialArts,
    GameConfig,
    GameContent,
    MartialArt,
    SceneData,
} from '../types';

export function loadGameContent(): GameContent {
    return {
        martialArts: martialArtsData as MartialArt[],
        characters: charactersData as CharacterTemplate[],
        scenes: scenesData as SceneData[],
        config: configData as GameConfig,
    };
}

export function buildCharacterProfile(content: GameContent, characterId: string): CharacterProfile {
    const template = content.characters.find((entry) => entry.id === characterId);

    if (!template) {
        throw new Error(`Character not found: ${characterId}`);
    }

    const equipment = resolveEquipment(content.martialArts, template);

    return {
        name: template.name,
        maxHealth: template.maxHealth,
        maxQi: template.maxQi,
        attributes: template.attributes,
        equipment,
    };
}

function resolveEquipment(martialArts: MartialArt[], template: CharacterTemplate): EquippedMartialArts {
    return {
        qinggong: findMartialArt(martialArts, template.equippedMartialArtIds.qinggong),
        neigong: findMartialArt(martialArts, template.equippedMartialArtIds.neigong),
        waigong: findMartialArt(martialArts, template.equippedMartialArtIds.waigong),
    };
}

function findMartialArt(martialArts: MartialArt[], martialArtId: string): MartialArt {
    const martialArt = martialArts.find((entry) => entry.id === martialArtId);

    if (!martialArt) {
        throw new Error(`Martial art not found: ${martialArtId}`);
    }

    return martialArt;
}