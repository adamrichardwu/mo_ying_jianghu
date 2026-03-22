import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { Game } from './game';
import type { EncounterState, PlayerAction, StatusEffect, Technique, TurnResult } from './types';

const mainMenuOptions = [
	{ code: '1', label: '开始江湖遭遇' },
	{ code: '2', label: '查看角色面板' },
	{ code: '3', label: '查看武学目录' },
	{ code: '4', label: '查看操作说明' },
	{ code: '5', label: '退出' },
];

function formatStatuses(statuses: StatusEffect[]): string {
	if (statuses.length === 0) {
		return '无';
	}

	return statuses.map((status) => `${status.name}(层效 ${status.potency}, 剩余 ${status.duration} 回合)`).join('、');
}

function printDivider(): void {
	console.log('----------------------------------------');
}

function printState(state: EncounterState): void {
	printDivider();
	console.log(`第 ${state.round} 回合`);
	console.log(`场景：${state.scene.title}`);
	console.log(state.scene.description);
	console.log(`你：${state.hero.name}  气血 ${state.hero.health}/${state.hero.maxHealth}  真气 ${state.hero.qi}/${state.hero.maxQi}  防御 ${state.hero.guard}`);
	console.log(`你方状态：${formatStatuses(state.hero.statuses)}`);
	console.log(`敌：${state.rival.name}  气血 ${state.rival.health}/${state.rival.maxHealth}  真气 ${state.rival.qi}/${state.rival.maxQi}  防御 ${state.rival.guard}`);
	console.log(`敌方状态：${formatStatuses(state.rival.statuses)}`);
}

function printTurnResult(result: TurnResult): void {
	console.log(`你方行动：${result.playerAction.summary}`);

	if (result.enemyAction) {
		console.log(`敌方行动：${result.enemyAction.summary}`);
	}

	result.roundLog.forEach((entry) => {
		console.log(`回合结算：${entry}`);
	});

	if (result.state.isFinished) {
		printDivider();
		if (result.state.winner === result.state.hero.name) {
			console.log(`胜负已分，${result.state.winner}赢下了这场遭遇战。`);
		} else {
			console.log(`你已落败，胜者是${result.state.winner}。`);
		}
	}
}

function parseAction(answer: string, actions: Array<{ code: string; action: PlayerAction; label: string }>): PlayerAction | undefined {
	const normalized = answer.trim().toLowerCase();
	const matched = actions.find((entry) => entry.code === normalized);
	return matched?.action;
}

function printTitle(): void {
	printDivider();
	console.log('墨影江湖：终端重构试作');
	console.log('轻功定先后，内功为根基，外功主招式。');
	printDivider();
}

function printMainMenu(): void {
	console.log('主菜单');
	mainMenuOptions.forEach((entry) => {
		console.log(`${entry.code}. ${entry.label}`);
	});
}

function printHeroPanel(game: Game): void {
	const hero = game.getHeroReferenceProfile();
	printDivider();
	console.log(`角色：${hero.name}`);
	console.log(`气血：${hero.maxHealth}`);
	console.log(`真气：${hero.maxQi}`);
	console.log(`臂力：${hero.attributes.strength}`);
	console.log(`身法：${hero.attributes.agility}`);
	console.log(`根骨：${hero.attributes.constitution}`);
	console.log(`悟性：${hero.attributes.insight}`);
	console.log(`轻功：${hero.equipment.qinggong.name} - ${hero.equipment.qinggong.description}`);
	console.log(`内功：${hero.equipment.neigong.name} - ${hero.equipment.neigong.description}`);
	console.log(`外功：${hero.equipment.waigong.name} - ${hero.equipment.waigong.description}`);
}

function describeTechnique(technique: Technique): string {
	const effects = technique.effects && technique.effects.length > 0
		? `，效果：${technique.effects.map((effect) => `${effect.target === 'self' ? '自身' : '目标'}获得${translateStatusType(effect.type)}(${effect.potency}/${effect.duration}回合)`).join('；')}`
		: '';

	return `${technique.name} 威力 ${technique.power} / 消耗 ${technique.qiCost} / 命中 ${Math.round(technique.accuracy * 100)}%${effects}`;
}

function printMartialArts(game: Game): void {
	const hero = game.getHeroReferenceProfile();
	printDivider();
	console.log('武学配置');
	console.log(`轻功：${hero.equipment.qinggong.name}`);
	console.log(`  被动：命中 +${Math.round((hero.equipment.qinggong.passiveBonuses?.accuracy ?? 0) * 100)}%，闪避 +${Math.round((hero.equipment.qinggong.passiveBonuses?.evasion ?? 0) * 100)}%，速度 +${hero.equipment.qinggong.passiveBonuses?.speed ?? 0}`);
	console.log(`内功：${hero.equipment.neigong.name}`);
	console.log(`  被动：回气 +${hero.equipment.neigong.passiveBonuses?.qiRecovery ?? 0}，防御 +${hero.equipment.neigong.passiveBonuses?.guard ?? 0}`);
	console.log(`外功：${hero.equipment.waigong.name} [${translateCategory(hero.equipment.waigong.category)}]`);
	console.log('绝招列表');
	game.getHeroTechniques().forEach((technique, index) => {
		console.log(`${index + 1}. ${describeTechnique(technique)}`);
	});
}

function printHelp(): void {
	printDivider();
	console.log('操作说明');
	console.log('1. 角色固定装备 1 个轻功、1 个内功、1 个外功。');
	console.log('2. 轻功决定先手、命中与闪避；内功决定回气、防御和外功流派加成；外功提供绝招。');
	console.log('3. 破绽会提高目标承受的下一次伤害，流血会在回合结算时扣血，凝神会强化下一次进攻。');
	console.log('4. 每回合按速度决定先后手，速度更高的一方先行动。');
	console.log('5. 在战斗界面输入 q 可退出当前遭遇并返回主菜单。');
}

async function chooseTechnique(rl: ReturnType<typeof createInterface>, game: Game): Promise<Technique | undefined> {
	const techniques = game.getHeroTechniques();
	printDivider();
	console.log('选择绝招');
	techniques.forEach((technique, index) => {
		console.log(`${index + 1}. ${describeTechnique(technique)}`);
	});
	console.log('q. 返回上一层');

	const answer = await rl.question('绝招编号：');
	if (answer.trim().toLowerCase() === 'q') {
		return undefined;
	}

	const index = Number(answer.trim()) - 1;
	if (!Number.isInteger(index) || index < 0 || index >= techniques.length) {
		console.log('无效绝招编号。');
		return undefined;
	}

	return techniques[index];
}

async function runEncounter(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	let state = game.beginEncounter();
	const actions = game.getBattleActions();

	while (!state.isFinished) {
		printState(state);
		actions.forEach((entry) => {
			console.log(`${entry.code}. ${entry.label}`);
		});
		console.log('5. 查看状态');
		console.log('6. 查看武学');
		console.log('q. 返回主菜单');

		const answer = await rl.question('你的选择：');
		const normalized = answer.trim().toLowerCase();

		if (normalized === 'q') {
			console.log('你暂时离开了这场遭遇，返回主菜单。');
			return;
		}

		if (normalized === '5') {
			printState(state);
			continue;
		}

		if (normalized === '6') {
			printMartialArts(game);
			continue;
		}

		const action = parseAction(answer, actions);
		if (!action) {
			console.log('无效输入，请重新输入编号。');
			continue;
		}

		let techniqueId: string | undefined;
		if (action === 'martial') {
			const technique = await chooseTechnique(rl, game);
			if (!technique) {
				continue;
			}
			techniqueId = technique.id;
		}

		const result = game.takeTurn(action, techniqueId);
		printTurnResult(result);
		state = result.state;
	}

	await rl.question('按回车返回主菜单。');
}

function translateCategory(category: string): string {
	switch (category) {
		case 'sword':
			return '剑';
		case 'fist':
			return '拳';
		case 'hidden-weapon':
			return '暗器';
		default:
			return category;
	}
}

function translateStatusType(type: string): string {
	switch (type) {
		case 'bleed':
			return '流血';
		case 'exposed':
			return '破绽';
		case 'focus':
			return '凝神';
		default:
			return type;
	}
}

async function main(): Promise<void> {
	const game = new Game();
	const rl = createInterface({ input, output });

	try {
		printTitle();

		while (true) {
			printMainMenu();
			const answer = await rl.question('请选择：');
			const normalized = answer.trim().toLowerCase();

			if (normalized === '1') {
				await runEncounter(rl, game);
				continue;
			}

			if (normalized === '2') {
				printHeroPanel(game);
				continue;
			}

			if (normalized === '3') {
				printMartialArts(game);
				continue;
			}

			if (normalized === '4') {
				printHelp();
				continue;
			}

			if (normalized === '5' || normalized === 'q') {
				console.log('江湖路远，后会有期。');
				return;
			}

			console.log('无效输入，请重新选择主菜单编号。');
		}
	} finally {
		rl.close();
	}
}

void main();