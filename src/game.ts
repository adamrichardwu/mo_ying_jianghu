import { Character } from './characters';
import { Combat } from './combat';
import { buildCharacterProfile, loadGameContent } from './data';
import { SceneManager } from './scenes';
import type { CombatSummary, GameContent, GameState, SceneData } from './types';

interface StartSummary {
    scene: SceneData;
    hero: ReturnType<Character['snapshot']>;
    battle: CombatSummary;
}

export class Game {
    private readonly content: GameContent;
    private readonly sceneManager: SceneManager;
    private readonly state: GameState;

    constructor() {
        this.content = loadGameContent();
        this.sceneManager = new SceneManager(this.content.scenes, this.content.config.initialSceneId);
        this.state = {
            currentSceneId: this.content.config.initialSceneId,
            heroId: this.content.config.heroId,
            rivalId: this.content.config.rivalId,
        };
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
}