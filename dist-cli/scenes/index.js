"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneManager = void 0;
class SceneManager {
    constructor(scenes, initialSceneId) {
        this.scenes = scenes;
        this.currentSceneId = initialSceneId;
    }
    loadScene(sceneId) {
        const scene = this.findScene(sceneId);
        this.currentSceneId = scene.id;
        return scene;
    }
    getCurrentScene() {
        return this.findScene(this.currentSceneId);
    }
    transitionToScene(sceneId) {
        return this.loadScene(sceneId);
    }
    findScene(sceneId) {
        const scene = this.scenes.find((entry) => entry.id === sceneId);
        if (!scene) {
            throw new Error(`Scene not found: ${sceneId}`);
        }
        return scene;
    }
}
exports.SceneManager = SceneManager;
