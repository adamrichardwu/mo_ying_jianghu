"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGameContent = loadGameContent;
exports.buildCharacterProfile = buildCharacterProfile;
const characters_json_1 = __importDefault(require("./characters.json"));
const game_config_json_1 = __importDefault(require("./game-config.json"));
const gear_json_1 = __importDefault(require("./gear.json"));
const martial_arts_json_1 = __importDefault(require("./martial-arts.json"));
const scenes_json_1 = __importDefault(require("./scenes.json"));
function loadGameContent() {
    return {
        martialArts: martial_arts_json_1.default,
        gear: gear_json_1.default,
        characters: characters_json_1.default,
        scenes: scenes_json_1.default,
        config: game_config_json_1.default,
    };
}
function buildCharacterProfile(content, characterId, loadoutOverride, gearOverride, knownGearOverride) {
    const template = content.characters.find((entry) => entry.id === characterId);
    if (!template) {
        throw new Error(`Character not found: ${characterId}`);
    }
    const gear = resolveGear(content.gear, gearOverride ?? template.equippedGearIds);
    const equipment = resolveEquipment(content.martialArts, loadoutOverride ?? template.equippedMartialArtIds, gear);
    const knownMartialArts = resolveKnownMartialArts(content.martialArts, template);
    const knownGear = resolveKnownGear(content.gear, knownGearOverride ?? template.knownGearIds);
    return {
        name: template.name,
        maxHealth: template.maxHealth,
        maxQi: template.maxQi,
        attributes: template.attributes,
        equipment,
        knownMartialArts,
        gear,
        knownGear,
    };
}
function resolveEquipment(martialArts, equippedIds, gear) {
    const waigongLoadout = resolveWaigongLoadout(martialArts, equippedIds.waigong);
    const activeWaigongCategory = gear.weapon?.weaponCategory ?? 'fist';
    return {
        qinggong: findMartialArt(martialArts, equippedIds.qinggong),
        neigong: findMartialArt(martialArts, equippedIds.neigong),
        waigong: waigongLoadout[activeWaigongCategory],
        waigongLoadout,
        activeWaigongCategory,
    };
}
function resolveKnownMartialArts(martialArts, template) {
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
function resolveGear(gear, equippedGearIds) {
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
function resolveWaigongLoadout(martialArts, equippedIds) {
    return {
        fist: findWaigong(martialArts, 'fist', equippedIds.fist),
        blade: findWaigong(martialArts, 'blade', equippedIds.blade),
        sword: findWaigong(martialArts, 'sword', equippedIds.sword),
        staff: findWaigong(martialArts, 'staff', equippedIds.staff),
        'hidden-weapon': findWaigong(martialArts, 'hidden-weapon', equippedIds['hidden-weapon']),
    };
}
function resolveKnownGear(gear, knownGearIds) {
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
function findMartialArt(martialArts, martialArtId) {
    const martialArt = martialArts.find((entry) => entry.id === martialArtId);
    if (!martialArt) {
        throw new Error(`Martial art not found: ${martialArtId}`);
    }
    return martialArt;
}
function findGear(gear, gearId) {
    const item = gear.find((entry) => entry.id === gearId);
    if (!item) {
        throw new Error(`Gear not found: ${gearId}`);
    }
    return item;
}
function findWaigong(martialArts, category, martialArtId) {
    if (martialArtId) {
        const martialArt = findMartialArt(martialArts, martialArtId);
        if (martialArt.type !== 'waigong' || martialArt.category !== category) {
            throw new Error(`Martial art ${martialArtId} does not match waigong category ${category}`);
        }
        return martialArt;
    }
    return findBaseWaigong(martialArts, category);
}
function findBaseWaigong(martialArts, category) {
    const baseIdMap = {
        fist: 'basic-fist-art',
        blade: 'basic-blade-art',
        sword: 'basic-sword-art',
        staff: 'basic-staff-art',
        'hidden-weapon': 'basic-hidden-weapon-art',
    };
    return findMartialArt(martialArts, baseIdMap[category]);
}
