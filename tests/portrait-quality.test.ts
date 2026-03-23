import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface PortraitScore {
  score: number;
  matchedChecks: string[];
  missingChecks: string[];
}

const portraits = [
  {
    id: 'hero',
    name: '沈孤舟',
    fileName: 'shen-guzhou-rage.svg',
  },
  {
    id: 'rival',
    name: '黑风盗',
    fileName: 'blackwind-rage.svg',
  },
] as const;

const portraitDir = path.join(process.cwd(), 'public', 'portraits');

describe('portrait quality gate', () => {
  it('keeps portrait files available for the browser UI', () => {
    portraits.forEach((portrait) => {
      const svg = readPortrait(portrait.fileName);

      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.includes('viewBox=')).toBe(true);
    });
  });

  it('keeps each portrait above the manga-character readability threshold', () => {
    portraits.forEach((portrait) => {
      const svg = readPortrait(portrait.fileName);
      const result = scorePortrait(svg);

      expect.soft(
        result.score,
        `${portrait.name} 得分 ${result.score} 低于阈值。缺失项: ${result.missingChecks.join('、') || '无'}`,
      ).toBeGreaterThanOrEqual(80);
      expect.soft(result.missingChecks, `${portrait.name} 缺少核心人脸结构`).not.toContain('双眼结构');
      expect.soft(result.missingChecks, `${portrait.name} 缺少核心人脸结构`).not.toContain('瞳孔高光');
      expect.soft(result.missingChecks, `${portrait.name} 缺少核心人脸结构`).not.toContain('眉形');
      expect.soft(result.missingChecks, `${portrait.name} 缺少核心人脸结构`).not.toContain('鼻口结构');
      expect.soft(result.missingChecks, `${portrait.name} 缺少核心人脸结构`).not.toContain('头发轮廓');
      expect.soft(result.missingChecks, `${portrait.name} 缺少核心人脸结构`).not.toContain('脖颈与服装承接');
    });
  });
});

function readPortrait(fileName: string): string {
  return readFileSync(path.join(portraitDir, fileName), 'utf8');
}

function scorePortrait(svg: string): PortraitScore {
  const checks: Array<{ name: string; weight: number; pass: boolean }> = [
    {
      name: '画布与分镜边框',
      weight: 8,
      pass: count(svg, /<rect\b/g) >= 2,
    },
    {
      name: '头部主轮廓',
      weight: 12,
      pass: count(svg, /<ellipse\b/g) >= 1,
    },
    {
      name: '双眼结构',
      weight: 18,
      pass: count(svg, /fill="#FFFFFF" stroke=/g) >= 2 || count(svg, /fill="#FCFAF4" stroke=/g) >= 1,
    },
    {
      name: '瞳孔高光',
      weight: 12,
      pass: count(svg, /<circle\b[^>]*r="5"[^>]*fill="#FFF/gi) >= 2 || count(svg, /<circle\b[^>]*r="6"[^>]*fill="#FFF/gi) >= 2,
    },
    {
      name: '眉形',
      weight: 12,
      pass: count(svg, /stroke-width="9" stroke-linecap="round"/g) >= 2 || count(svg, /stroke-width="10" stroke-linecap="round"/g) >= 2,
    },
    {
      name: '鼻口结构',
      weight: 14,
      pass: count(svg, /stroke-width="6" stroke-linecap="round"/g) >= 4,
    },
    {
      name: '头发轮廓',
      weight: 10,
      pass: count(svg, /fill="#111111"/g)
        + count(svg, /fill="#181512"/g)
        + count(svg, /fill="#161311"/g)
        + count(svg, /fill="#171310"/g) >= 3,
    },
    {
      name: '耳部结构',
      weight: 6,
      pass: count(svg, /stroke-width="6" stroke-linecap="round"/g) >= 4,
    },
    {
      name: '脖颈与服装承接',
      weight: 8,
      pass: count(svg, /stroke-linejoin="round"/g) >= 2,
    },
  ];

  const score = checks.reduce((total, check) => total + (check.pass ? check.weight : 0), 0);

  return {
    score,
    matchedChecks: checks.filter((check) => check.pass).map((check) => check.name),
    missingChecks: checks.filter((check) => !check.pass).map((check) => check.name),
  };
}

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}