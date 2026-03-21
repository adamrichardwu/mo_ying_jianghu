import type { SceneData } from '../types';

export class SceneManager {
    private readonly scenes: SceneData[];
    private currentSceneId: string;

    constructor(scenes: SceneData[], initialSceneId: string) {
        this.scenes = scenes;
        this.currentSceneId = initialSceneId;
    }

    loadScene(sceneId: string): SceneData {
        const scene = this.findScene(sceneId);
        this.currentSceneId = scene.id;
        return scene;
    }

    getCurrentScene(): SceneData {
        return this.findScene(this.currentSceneId);
    }

    transitionToScene(sceneId: string): SceneData {
        return this.loadScene(sceneId);
    }

    private findScene(sceneId: string): SceneData {
        const scene = this.scenes.find((entry) => entry.id === sceneId);

        if (!scene) {
            throw new Error(`Scene not found: ${sceneId}`);
        }

        return scene;
    }
}