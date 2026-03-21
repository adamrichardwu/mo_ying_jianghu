import charactersData from './characters.json';
import configData from './game-config.json';
import martialArtsData from './martial-arts.json';
import scenesData from './scenes.json';

import type { CharacterProfile, CharacterTemplate, GameConfig, GameContent, MartialArt, SceneData } from '../types';

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

    const martialArts = template.martialArtIds.map((martialArtId) => {
        const martialArt = content.martialArts.find((entry) => entry.id === martialArtId);

        if (!martialArt) {
            throw new Error(`Martial art not found: ${martialArtId}`);
        }

        return martialArt;
    });

    return {
        name: template.name,
        maxHealth: template.maxHealth,
        maxQi: template.maxQi,
        attributes: template.attributes,
        martialArts,
    };
}