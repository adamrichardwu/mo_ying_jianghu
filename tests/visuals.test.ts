import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { defaultSceneThemeAsset, getPortraitAsset, getSceneThemeAsset, portraitAssets, sceneThemeAssets } from '../src/web/visuals';

describe('visual asset registry', () => {
  it('maps known portrait assets to real files under public', () => {
    Object.values(portraitAssets).forEach((asset) => {
      const relativePath = asset.filePath.replace(/^\//, '');
      const absolutePath = path.join(process.cwd(), 'public', relativePath);

      expect(existsSync(absolutePath), `${asset.actorName} 缺少素材文件 ${asset.filePath}`).toBe(true);
    });
  });

  it('returns a fallback portrait for unknown actors', () => {
    expect(getPortraitAsset('未收录角色').filePath).toBe(portraitAssets['沈孤舟'].filePath);
  });

  it('keeps scene theme mappings stable', () => {
    expect(sceneThemeAssets['ancient-road'].className).toBe('theme-ancient-road');
    expect(sceneThemeAssets.teahouse.className).toBe('theme-teahouse');
    expect(getSceneThemeAsset(undefined)).toBe(defaultSceneThemeAsset);
  });
});