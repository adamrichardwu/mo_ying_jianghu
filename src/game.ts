import { Character } from './characters';
import { Combat } from './combat';
import { buildCharacterProfile, loadGameContent } from './data';
import { SceneManager } from './scenes';
import { createEmptyHeroTrainingState, createTrainingOverview, levelUpTraining } from './training';
import type {
    CombatActionResult,
    CombatSummary,
    EquippedGearIds,
    EquippedMartialArtIds,
    EncounterState,
    GameContent,
    GameState,
    GearItem,
    GearRarity,
    GearSlot,
    HeroTrainingOverview,
    KnownGearIds,
    LootTableEntry,
    PlayerAction,
    SceneEventData,
    SceneData,
    Technique,
    TrainingResult,
    TravelResult,
    TurnResult,
    WaigongCategory,
} from './types';

interface StartSummary {
    scene: SceneData;
    hero: ReturnType<Character['snapshot']>;
    battle: CombatSummary;
}

export class Game {
    private readonly content: GameContent;
    private readonly sceneManager: SceneManager;
    private readonly state: GameState;
    private hero: Character;
    private rival: Character;
    private combat: Combat;
    private scene: SceneData;
    private round: number;
    private pendingRewards: string[];
    private readonly random: () => number;

    constructor(random: () => number = Math.random) {
        this.random = random;
        this.content = loadGameContent();
        this.sceneManager = new SceneManager(this.content.scenes, this.content.config.initialSceneId);
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
            cultivation: 0,
            heroTraining: createEmptyHeroTrainingState(),
        };
        this.scene = this.sceneManager.loadScene(this.state.currentSceneId);
        this.hero = new Character(this.buildHeroProfile());
        this.rival = new Character(buildCharacterProfile(this.content, this.state.rivalId));
        this.combat = new Combat();
        this.round = 1;
        this.pendingRewards = [];
    }

    start(): StartSummary {
        const scene = this.sceneManager.loadScene(this.state.currentSceneId);
        const hero = new Character(this.buildHeroProfile());
        const rival = new Character(buildCharacterProfile(this.content, this.state.rivalId));
        const combat = new Combat();
        const battle = combat.runDuel(hero, rival);

        return {
            scene,
            hero: hero.snapshot(),
            battle,
        };
    }

    beginEncounter(): EncounterState {
        this.resetEncounter();
        return this.getEncounterState();
    }

    travel(): TravelResult {
        const scene = this.sceneManager.getCurrentScene();
        const event = this.chooseSceneEvent(scene.id);
        const log = [event.description];
        const cultivationGained = event.cultivationReward ?? 0;

        if (cultivationGained > 0) {
            this.state.cultivation += cultivationGained;
            log.push(`你获得了${cultivationGained}点修为。`);
        }

        if (event.type === 'encounter') {
            const encounter = this.beginEncounter();
            log.push(`${encounter.rival.name}现身，遭遇战一触即发。`);

            return {
                scene,
                event,
                encounter,
                summary: `${scene.title}·${event.title}`,
                log,
                cultivationGained,
                totalCultivation: this.state.cultivation,
            };
        }

        return {
            scene,
            event,
            summary: `${scene.title}·${event.title}`,
            log,
            cultivationGained,
            totalCultivation: this.state.cultivation,
        };
    }

    getCultivation(): number {
        return this.state.cultivation;
    }

    getCurrentScene(): SceneData {
        return this.sceneManager.getCurrentScene();
    }

    getAvailableScenes(): SceneData[] {
        return this.sceneManager.getScenes();
    }

    travelToScene(sceneId: string): SceneData {
        const scene = this.sceneManager.transitionToScene(sceneId);
        this.state.currentSceneId = scene.id;
        this.scene = scene;
        return scene;
    }

    getEncounterState(): EncounterState {
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

    takeTurn(action: PlayerAction, techniqueId?: string): TurnResult {
        if (this.hero.isDefeated() || this.rival.isDefeated()) {
            throw new Error('Battle already finished.');
        }

        const completedRound = this.round;
        const roundLog: string[] = [];
        const actionLog: CombatActionResult[] = [];
        const enemyPlan = this.chooseEnemyAction();
        let playerAction: CombatActionResult;
        let enemyAction: CombatActionResult | undefined;

        if (this.hero.getSpeed() >= this.rival.getSpeed()) {
            playerAction = this.resolvePlayerAction(action, techniqueId);
            actionLog.push(playerAction);

            if (!this.rival.isDefeated()) {
                enemyAction = this.resolveEnemyTurn(enemyPlan);
                actionLog.push(enemyAction);
            }
        } else {
            enemyAction = this.resolveEnemyTurn(enemyPlan);
            actionLog.push(enemyAction);

            if (this.hero.isDefeated()) {
                playerAction = this.createSkippedAction();
            } else {
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

    getHeroReferenceProfile(): ReturnType<Character['snapshot']> {
        return new Character(this.buildHeroProfile()).snapshot();
    }

    getHeroTechniques(): Technique[] {
        return this.buildHeroProfile().equipment.waigong.techniques ?? [];
    }

    getHeroBasicTechniques(): Technique[] {
        return this.buildHeroProfile().equipment.waigong.basicTechniques ?? [];
    }

    getHeroLoadoutOptions(): ReturnType<Character['snapshot']>['knownMartialArts'] {
        return this.buildHeroProfile().knownMartialArts;
    }

    getHeroGearOptions(): ReturnType<Character['snapshot']>['knownGear'] {
        return this.buildHeroProfile().knownGear;
    }

    getHeroGearInventory(): ReturnType<Character['snapshot']>['knownGear'] {
        return this.getHeroGearOptions();
    }

    getHeroTrainingOverview(): HeroTrainingOverview {
        return createTrainingOverview(this.buildHeroProfile(), this.state.heroTraining, this.state.cultivation);
    }

    trainHero(optionId: HeroTrainingOverview['options'][number]['id']): TrainingResult {
        const overview = this.getHeroTrainingOverview();
        const option = overview.options.find((entry) => entry.id === optionId);

        if (!option) {
            throw new Error(`Training option not found: ${optionId}`);
        }

        if (this.state.cultivation < option.nextCost) {
            throw new Error(`修为不足，${option.name}还需要${option.nextCost}点修为。`);
        }

        this.state.cultivation -= option.nextCost;
        this.state.heroTraining = levelUpTraining(this.state.heroTraining, option.id, option.targetMartialArtId);

        const newLevel = option.targetMartialArtId
            ? this.state.heroTraining.martialArtMastery[option.targetMartialArtId] ?? 0
            : getBaseTrainingLevel(this.state.heroTraining, option.id);

        return {
            option,
            spentCultivation: option.nextCost,
            remainingCultivation: this.state.cultivation,
            summary: buildTrainingSummary(option, newLevel),
            newLevel,
        };
    }

    equipHeroMartialArt(slot: 'qinggong' | 'neigong', martialArtId: string): void {
        const options = this.getHeroLoadoutOptions()[slot];

        if (!options.some((martialArt) => martialArt.id === martialArtId)) {
            throw new Error(`Martial art not available for slot ${slot}: ${martialArtId}`);
        }

        this.state.heroLoadout = {
            ...this.state.heroLoadout,
            [slot]: martialArtId,
        };
    }

    equipHeroWaigong(category: WaigongCategory, martialArtId: string | null): void {
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

    equipHeroGear(slot: keyof EquippedGearIds, gearId: string | null): void {
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

    getBattleActions(): Array<{ code: string; action: PlayerAction; label: string }> {
        return [
            { code: '1', action: 'attack', label: '普通攻击' },
            { code: '2', action: 'martial', label: '施展武学' },
            { code: '3', action: 'defend', label: '防御' },
            { code: '4', action: 'meditate', label: '调息' },
        ];
    }

    private resetEncounter(): void {
        this.scene = this.sceneManager.loadScene(this.state.currentSceneId);
        this.hero = new Character(this.buildHeroProfile());
        this.rival = new Character(buildCharacterProfile(this.content, this.state.rivalId));
        this.combat = new Combat();
        this.round = 1;
        this.pendingRewards = [];
    }

    private chooseSceneEvent(sceneId: string): SceneEventData {
        const candidates = this.content.sceneEvents.filter((event) => event.sceneId === sceneId);

        if (candidates.length === 0) {
            throw new Error(`No scene events configured for scene: ${sceneId}`);
        }

        return chooseWeighted(candidates, this.random);
    }

    private resolveEncounterRewards(): string[] {
        const cultivationReward = Math.max(2, this.scene.threats.length);
        const rewards = [`获得修为：${cultivationReward}点`];
        this.state.cultivation += cultivationReward;
        const rivalTemplate = this.content.characters.find((entry) => entry.id === this.state.rivalId);

        if (!rivalTemplate?.lootTable || rivalTemplate.lootTable.length === 0) {
            rewards.push('本次战斗未获得新装备。');
            return rewards;
        }

        const weightedCandidates = rivalTemplate.lootTable
            .map((entry) => this.resolveLootCandidate(entry))
            .filter((entry): entry is { entry: LootTableEntry; item: GearItem; weight: number } => entry !== null)
            .filter(({ item }) => !this.state.heroKnownGearIds[item.slot].includes(item.id));

        if (weightedCandidates.length === 0) {
            rewards.push('本次战斗未获得新装备。');
            return rewards;
        }

        const selected = chooseWeighted(weightedCandidates, this.random);
        this.addHeroGearToInventory(selected.item.slot, selected.item);

        rewards.push(`获得装备：${selected.item.name}（${slotLabel(selected.item.slot)} / ${rarityLabel(selected.item.rarity)}）`);
        return rewards;
    }

    private resolveLootCandidate(entry: LootTableEntry): { entry: LootTableEntry; item: GearItem; weight: number } | null {
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

    private addHeroGearToInventory(slot: GearSlot, item: GearItem): void {
        this.state.heroKnownGearIds = {
            ...this.state.heroKnownGearIds,
            [slot]: [...this.state.heroKnownGearIds[slot], item.id],
        } as KnownGearIds;
    }

    private resolvePlayerAction(action: PlayerAction, techniqueId?: string): CombatActionResult {
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

    private resolveEnemyTurn(action: PlayerAction): CombatActionResult {
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

    private chooseEnemyAction(): PlayerAction {
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

    private createSkippedAction(): CombatActionResult {
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

    private getHeroTemplate() {
        const template = this.content.characters.find((entry) => entry.id === this.state.heroId);

        if (!template) {
            throw new Error(`Character template not found: ${this.state.heroId}`);
        }

        return template;
    }

    private buildHeroProfile() {
        return buildCharacterProfile(
            this.content,
            this.state.heroId,
            this.state.heroLoadout,
            this.state.heroGearLoadout,
            this.state.heroKnownGearIds,
            this.state.heroTraining,
        );
    }
}

function getBaseTrainingLevel(state: GameState['heroTraining'], optionId: HeroTrainingOverview['options'][number]['id']): number {
    switch (optionId) {
        case 'body':
            return state.bodyLevel;
        case 'breath':
            return state.breathLevel;
        case 'movement':
            return state.movementLevel;
        case 'strength':
            return state.strengthLevel;
        default:
            return 0;
    }
}

function buildTrainingSummary(option: HeroTrainingOverview['options'][number], newLevel: number): string {
    const target = option.targetMartialArtName ? `《${option.targetMartialArtName}》` : option.name;
    return `${target}修炼完成，当前层数提升至 ${newLevel}。${option.effectPreview}`;
}

function chooseWeighted<T extends { weight: number }>(entries: T[], random: () => number): T {
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

function slotLabel(slot: GearSlot): string {
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

function rarityLabel(rarity: GearRarity): string {
    switch (rarity) {
        case 'common':
            return '凡品';
        case 'uncommon':
            return '良品';
        case 'rare':
            return '珍奇';
    }
}