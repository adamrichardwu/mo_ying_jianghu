import { Character } from './characters';
import { Combat } from './combat';
import { buildCharacterProfile, loadGameContent } from './data';
import { SceneManager } from './scenes';
import type { CombatActionResult, CombatSummary, EncounterState, GameContent, GameState, MartialArt, PlayerAction, SceneData, TurnResult } from './types';

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

    constructor() {
        this.content = loadGameContent();
        this.sceneManager = new SceneManager(this.content.scenes, this.content.config.initialSceneId);
        this.state = {
            currentSceneId: this.content.config.initialSceneId,
            heroId: this.content.config.heroId,
            rivalId: this.content.config.rivalId,
        };
        this.scene = this.sceneManager.loadScene(this.state.currentSceneId);
        this.hero = new Character(buildCharacterProfile(this.content, this.state.heroId));
        this.rival = new Character(buildCharacterProfile(this.content, this.state.rivalId));
        this.combat = new Combat();
        this.round = 1;
    }

    start(): StartSummary {
        const scene = this.sceneManager.loadScene(this.state.currentSceneId);
        const hero = new Character(buildCharacterProfile(this.content, this.state.heroId));
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

    takeTurn(action: PlayerAction, martialArtId?: string): TurnResult {
        if (this.hero.isDefeated() || this.rival.isDefeated()) {
            throw new Error('Battle already finished.');
        }

        const playerAction = this.resolvePlayerAction(action, martialArtId);
        const roundLog: string[] = [];

        if (this.rival.isDefeated()) {
            return {
                round: this.round,
                playerAction,
                roundLog,
                state: this.getEncounterState(),
            };
        }

        const enemyAction = this.resolveEnemyTurn();
        if (!this.hero.isDefeated() && !this.rival.isDefeated()) {
            roundLog.push(...this.combat.resolveRoundEffects(this.hero));
            roundLog.push(...this.combat.resolveRoundEffects(this.rival));
        }

        const state = this.getEncounterState();
        this.round += 1;

        return {
            round: state.round,
            playerAction,
            enemyAction,
            roundLog,
            state,
        };
    }

    getHeroReferenceProfile(): ReturnType<Character['snapshot']> {
        return new Character(buildCharacterProfile(this.content, this.state.heroId)).snapshot();
    }

    getHeroMartialArts(): MartialArt[] {
        return buildCharacterProfile(this.content, this.state.heroId).martialArts;
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
        this.hero = new Character(buildCharacterProfile(this.content, this.state.heroId));
        this.rival = new Character(buildCharacterProfile(this.content, this.state.rivalId));
        this.combat = new Combat();
        this.round = 1;
    }

    private resolvePlayerAction(action: PlayerAction, martialArtId?: string): CombatActionResult {
        switch (action) {
            case 'attack':
                return this.combat.resolveBasicAttack(this.hero, this.rival);
            case 'defend':
                return this.combat.resolveDefend(this.hero);
            case 'meditate':
                return this.combat.resolveMeditate(this.hero);
            case 'martial':
            default:
                return this.combat.resolveAction(this.hero, this.rival, martialArtId ? this.hero.getMartialArtById(martialArtId) : undefined);
        }
    }

    private resolveEnemyTurn(): CombatActionResult {
        const action = this.chooseEnemyAction();

        switch (action) {
            case 'defend':
                return this.combat.resolveDefend(this.rival);
            case 'meditate':
                return this.combat.resolveMeditate(this.rival);
            case 'attack':
                return this.combat.resolveBasicAttack(this.rival, this.hero);
            case 'martial':
            default:
                return this.combat.resolveAction(this.rival, this.hero);
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
}