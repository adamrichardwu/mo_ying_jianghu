import { Character } from './characters';
import { Combat } from './combat';
import { SceneManager } from './scenes';
import type { CharacterProfile, CombatSummary, GameState, SceneData } from './types';

interface StartSummary {
    scene: SceneData;
    hero: ReturnType<Character['snapshot']>;
    battle: CombatSummary;
}

const heroProfile: CharacterProfile = {
    name: '沈孤舟',
    maxHealth: 72,
    maxQi: 28,
    attributes: {
        strength: 10,
        agility: 8,
        constitution: 9,
        insight: 7,
    },
    martialArts: [
        {
            name: '破影拳',
            type: 'waigong',
            power: 14,
            qiCost: 4,
            accuracy: 0.9,
        },
        {
            name: '归息诀',
            type: 'neigong',
            power: 8,
            qiCost: 2,
            accuracy: 0.88,
        },
    ],
};

const banditProfile: CharacterProfile = {
    name: '黑风盗',
    maxHealth: 48,
    maxQi: 12,
    attributes: {
        strength: 7,
        agility: 5,
        constitution: 6,
        insight: 4,
    },
    martialArts: [
        {
            name: '乱石刀',
            type: 'waigong',
            power: 9,
            qiCost: 3,
            accuracy: 0.72,
        },
    ],
};

const openingScenes: SceneData[] = [
    {
        id: 'ancient-road',
        title: '青石古道',
        description: '山风掠过古道，行商与流寇都在这里试探彼此的胆色。',
        threats: ['流寇', '伏击', '江湖传闻'],
    },
    {
        id: 'teahouse',
        title: '临河茶肆',
        description: '茶客混杂，消息和麻烦往往一同上门。',
        threats: ['传闻', '悬赏', '暗探'],
    },
];

export class Game {
    private readonly sceneManager: SceneManager;
    private readonly state: GameState;

    constructor() {
        this.sceneManager = new SceneManager(openingScenes, 'ancient-road');
        this.state = {
            currentSceneId: 'ancient-road',
            hero: heroProfile,
        };
    }

    start(): StartSummary {
        const scene = this.sceneManager.loadScene(this.state.currentSceneId);
        const hero = new Character(this.state.hero);
        const rival = new Character(banditProfile);
        const combat = new Combat();
        const battle = combat.runDuel(hero, rival);

        return {
            scene,
            hero: hero.snapshot(),
            battle,
        };
    }
}