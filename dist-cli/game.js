"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const characters_1 = require("./characters");
const combat_1 = require("./combat");
const data_1 = require("./data");
const scenes_1 = require("./scenes");
class Game {
    constructor(random = Math.random) {
        this.random = random;
        this.content = (0, data_1.loadGameContent)();
        this.sceneManager = new scenes_1.SceneManager(this.content.scenes, this.content.config.initialSceneId);
        const heroTemplate = this.content.characters.find((entry) => entry.id === this.content.config.heroId);
        if (!heroTemplate) {
            throw new Error(`Character template not found: ${this.content.config.heroId}`);
        }
        this.state = {
            currentSceneId: this.content.config.initialSceneId,
            heroId: this.content.config.heroId,
            rivalId: this.content.config.rivalId,
            heroLoadout: { ...heroTemplate.equippedMartialArtIds },
            heroGearLoadout: { ...heroTemplate.equippedGearIds },
            heroKnownGearIds: { ...heroTemplate.knownGearIds },
        };
        this.scene = this.sceneManager.loadScene(this.state.currentSceneId);
        this.hero = new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds));
        this.rival = new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.rivalId));
        this.combat = new combat_1.Combat();
        this.round = 1;
        this.pendingRewards = [];
    }
    start() {
        const scene = this.sceneManager.loadScene(this.state.currentSceneId);
        const hero = new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds));
        const rival = new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.rivalId));
        const combat = new combat_1.Combat();
        const battle = combat.runDuel(hero, rival);
        return {
            scene,
            hero: hero.snapshot(),
            battle,
        };
    }
    beginEncounter() {
        this.resetEncounter();
        return this.getEncounterState();
    }
    getEncounterState() {
        const winner = this.hero.isDefeated() ? this.rival.name : this.rival.isDefeated() ? this.hero.name : undefined;
        return {
            scene: this.scene,
            hero: this.hero.snapshot(),
            rival: this.rival.snapshot(),
            round: this.round,
            isFinished: winner !== undefined,
            winner,
        };
    }
    takeTurn(action, techniqueId) {
        if (this.hero.isDefeated() || this.rival.isDefeated()) {
            throw new Error('Battle already finished.');
        }
        const completedRound = this.round;
        const roundLog = [];
        const actionLog = [];
        const enemyPlan = this.chooseEnemyAction();
        let playerAction;
        let enemyAction;
        if (this.hero.getSpeed() >= this.rival.getSpeed()) {
            playerAction = this.resolvePlayerAction(action, techniqueId);
            actionLog.push(playerAction);
            if (!this.rival.isDefeated()) {
                enemyAction = this.resolveEnemyTurn(enemyPlan);
                actionLog.push(enemyAction);
            }
        }
        else {
            enemyAction = this.resolveEnemyTurn(enemyPlan);
            actionLog.push(enemyAction);
            if (this.hero.isDefeated()) {
                playerAction = this.createSkippedAction();
            }
            else {
                playerAction = this.resolvePlayerAction(action, techniqueId);
                actionLog.push(playerAction);
            }
        }
        if (!this.hero.isDefeated() && !this.rival.isDefeated()) {
            roundLog.push(...this.combat.resolveRoundEffects(this.hero));
            roundLog.push(...this.combat.resolveRoundEffects(this.rival));
        }
        if (!this.hero.isDefeated() && !this.rival.isDefeated()) {
            this.round += 1;
        }
        if (this.rival.isDefeated()) {
            this.pendingRewards = this.resolveEncounterRewards();
        }
        const state = this.getEncounterState();
        return {
            round: completedRound,
            playerAction,
            enemyAction,
            actionLog,
            roundLog,
            rewards: [...this.pendingRewards],
            state,
        };
    }
    getHeroReferenceProfile() {
        return new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds)).snapshot();
    }
    getHeroTechniques() {
        return (0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds).equipment.waigong.techniques ?? [];
    }
    getHeroBasicTechniques() {
        return (0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds).equipment.waigong.basicTechniques ?? [];
    }
    getHeroLoadoutOptions() {
        return (0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds).knownMartialArts;
    }
    getHeroGearOptions() {
        return (0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds).knownGear;
    }
    getHeroGearInventory() {
        return this.getHeroGearOptions();
    }
    equipHeroMartialArt(slot, martialArtId) {
        const options = this.getHeroLoadoutOptions()[slot];
        if (!options.some((martialArt) => martialArt.id === martialArtId)) {
            throw new Error(`Martial art not available for slot ${slot}: ${martialArtId}`);
        }
        this.state.heroLoadout = {
            ...this.state.heroLoadout,
            [slot]: martialArtId,
        };
    }
    equipHeroWaigong(category, martialArtId) {
        const options = this.getHeroLoadoutOptions().waigong[category];
        if (martialArtId && !options.some((martialArt) => martialArt.id === martialArtId)) {
            throw new Error(`Martial art not available for waigong category ${category}: ${martialArtId}`);
        }
        this.state.heroLoadout = {
            ...this.state.heroLoadout,
            waigong: {
                ...this.state.heroLoadout.waigong,
                [category]: martialArtId,
            },
        };
    }
    equipHeroGear(slot, gearId) {
        const options = this.getHeroGearOptions()[slot];
        if (slot === 'weapon' && gearId === null) {
            this.state.heroGearLoadout = {
                ...this.state.heroGearLoadout,
                weapon: null,
            };
            return;
        }
        if (!gearId || !options.some((item) => item.id === gearId)) {
            throw new Error(`Gear not available for slot ${slot}: ${gearId}`);
        }
        this.state.heroGearLoadout = {
            ...this.state.heroGearLoadout,
            [slot]: gearId,
        };
    }
    getBattleActions() {
        return [
            { code: '1', action: 'attack', label: '普通攻击' },
            { code: '2', action: 'martial', label: '施展武学' },
            { code: '3', action: 'defend', label: '防御' },
            { code: '4', action: 'meditate', label: '调息' },
        ];
    }
    resetEncounter() {
        this.scene = this.sceneManager.loadScene(this.state.currentSceneId);
        this.hero = new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.heroId, this.state.heroLoadout, this.state.heroGearLoadout, this.state.heroKnownGearIds));
        this.rival = new characters_1.Character((0, data_1.buildCharacterProfile)(this.content, this.state.rivalId));
        this.combat = new combat_1.Combat();
        this.round = 1;
        this.pendingRewards = [];
    }
    resolveEncounterRewards() {
        const rivalTemplate = this.content.characters.find((entry) => entry.id === this.state.rivalId);
        if (!rivalTemplate?.lootTable || rivalTemplate.lootTable.length === 0) {
            return ['本次战斗未获得新装备。'];
        }
        const weightedCandidates = rivalTemplate.lootTable
            .map((entry) => this.resolveLootCandidate(entry))
            .filter((entry) => entry !== null)
            .filter(({ item }) => !this.state.heroKnownGearIds[item.slot].includes(item.id));
        if (weightedCandidates.length === 0) {
            return ['本次战斗未获得新装备。'];
        }
        const selected = chooseWeighted(weightedCandidates, this.random);
        this.addHeroGearToInventory(selected.item.slot, selected.item);
        return [`获得装备：${selected.item.name}（${slotLabel(selected.item.slot)} / ${rarityLabel(selected.item.rarity)}）`];
    }
    resolveLootCandidate(entry) {
        const item = this.content.gear.find((gear) => gear.id === entry.gearId);
        if (!item) {
            return null;
        }
        const bias = this.scene.lootBias?.[item.rarity] ?? 0;
        const weight = Math.max(1, entry.weight + bias);
        return {
            entry,
            item,
            weight,
        };
    }
    addHeroGearToInventory(slot, item) {
        this.state.heroKnownGearIds = {
            ...this.state.heroKnownGearIds,
            [slot]: [...this.state.heroKnownGearIds[slot], item.id],
        };
    }
    resolvePlayerAction(action, techniqueId) {
        switch (action) {
            case 'attack':
                return this.combat.resolveBasicAttack(this.hero, this.rival, techniqueId ? this.hero.getBasicTechniqueById(techniqueId) : undefined);
            case 'defend':
                return this.combat.resolveDefend(this.hero);
            case 'meditate':
                return this.combat.resolveMeditate(this.hero);
            case 'martial':
            default:
                return this.combat.resolveTechnique(this.hero, this.rival, techniqueId ? this.hero.getTechniqueById(techniqueId) : undefined);
        }
    }
    resolveEnemyTurn(action) {
        switch (action) {
            case 'defend':
                return this.combat.resolveDefend(this.rival);
            case 'meditate':
                return this.combat.resolveMeditate(this.rival);
            case 'attack':
                return this.combat.resolveBasicAttack(this.rival, this.hero);
            case 'martial':
            default:
                return this.combat.resolveTechnique(this.rival, this.hero);
        }
    }
    chooseEnemyAction() {
        if (this.rival.qi <= 2 && this.rival.health < this.rival.maxHealth) {
            return 'meditate';
        }
        if (this.rival.guard === 0 && this.rival.health <= Math.floor(this.rival.maxHealth / 2)) {
            return 'defend';
        }
        if (this.rival.qi < 3) {
            return 'attack';
        }
        return 'martial';
    }
    createSkippedAction() {
        return {
            actionType: 'attack',
            attacker: this.hero.name,
            defender: this.rival.name,
            martialArt: '未出手',
            hit: false,
            damage: 0,
            defenderRemainingHealth: this.rival.health,
            attackerRemainingQi: this.hero.qi,
            defenderGuard: this.rival.guard,
            summary: `${this.hero.name}尚未来得及出手，已被抢先压制。`,
        };
    }
    getHeroTemplate() {
        const template = this.content.characters.find((entry) => entry.id === this.state.heroId);
        if (!template) {
            throw new Error(`Character template not found: ${this.state.heroId}`);
        }
        return template;
    }
}
exports.Game = Game;
function chooseWeighted(entries, random) {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = random() * total;
    for (const entry of entries) {
        cursor -= entry.weight;
        if (cursor < 0) {
            return entry;
        }
    }
    return entries[entries.length - 1];
}
function slotLabel(slot) {
    switch (slot) {
        case 'weapon':
            return '武器';
        case 'clothes':
            return '衣服';
        case 'accessory':
            return '饰品';
        case 'bracer':
            return '护腕';
        case 'shoes':
            return '鞋子';
        case 'hat':
            return '帽子';
        case 'ring':
            return '戒指';
    }
}
function rarityLabel(rarity) {
    switch (rarity) {
        case 'common':
            return '凡品';
        case 'uncommon':
            return '良品';
        case 'rare':
            return '珍奇';
    }
}
