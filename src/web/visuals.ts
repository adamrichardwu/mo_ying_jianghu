export interface PortraitAsset {
  actorName: string;
  filePath: string;
  alt: string;
  notes: string;
}

export interface SceneThemeAsset {
  sceneId: string;
  className: string;
  label: string;
  notes: string;
}

export const portraitAssets: Record<string, PortraitAsset> = {
  '沈孤舟': {
    actorName: '沈孤舟',
    filePath: '/portraits/shen-guzhou-rage.svg',
    alt: '沈孤舟立绘',
    notes: '当前主角浏览器立绘，占位用途，后续可直接替换同路径文件或改这里的映射。',
  },
  '黑风盗': {
    actorName: '黑风盗',
    filePath: '/portraits/blackwind-rage.svg',
    alt: '黑风盗立绘',
    notes: '当前敌方浏览器立绘，占位用途，后续可直接替换同路径文件或改这里的映射。',
  },
};

export const defaultPortraitAsset: PortraitAsset = {
  actorName: '默认角色',
  filePath: '/portraits/shen-guzhou-rage.svg',
  alt: '默认角色立绘',
  notes: '未建立角色映射时的回退立绘。',
};

export const sceneThemeAssets: Record<string, SceneThemeAsset> = {
  'ancient-road': {
    sceneId: 'ancient-road',
    className: 'theme-ancient-road',
    label: '古道山风',
    notes: '使用 CSS 生成的古道远山、地表和日光层，不依赖位图资源。',
  },
  teahouse: {
    sceneId: 'teahouse',
    className: 'theme-teahouse',
    label: '临河夜肆',
    notes: '使用 CSS 生成的夜色与茶肆氛围层，不依赖位图资源。',
  },
};

export const defaultSceneThemeAsset: SceneThemeAsset = sceneThemeAssets['ancient-road'];

export function getPortraitAsset(actorName: string): PortraitAsset {
  return portraitAssets[actorName] ?? defaultPortraitAsset;
}

export function getSceneThemeAsset(sceneId?: string): SceneThemeAsset {
  if (!sceneId) {
    return defaultSceneThemeAsset;
  }

  return sceneThemeAssets[sceneId] ?? defaultSceneThemeAsset;
}