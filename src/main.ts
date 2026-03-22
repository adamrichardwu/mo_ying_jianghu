import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { Game } from './game';
import type { EncounterState, MartialArt, PlayerAction, StatusEffect, TurnResult } from './types';

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
	console.log('墨影江湖：终端版 v1.1.0');
	console.log('一段可在终端体验的最小武侠文字原型。');
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
	console.log(`已习武学：${hero.martialArts.map((martialArt) => martialArt.name).join('、')}`);
}

function describeMartialArt(martialArt: MartialArt): string {
	const effects = martialArt.effects && martialArt.effects.length > 0
		? `，效果：${martialArt.effects.map((effect) => `${effect.target === 'self' ? '自身' : '目标'}获得${effect.type}(${effect.potency}/${effect.duration}回合)`).join('；')}`
		: '';

	return `${martialArt.name} [${martialArt.type}] 威力 ${martialArt.power} / 消耗 ${martialArt.qiCost} / 命中 ${Math.round(martialArt.accuracy * 100)}%${effects}`;
}

function printMartialArts(game: Game): void {
	printDivider();
	console.log('武学目录');
	game.getHeroMartialArts().forEach((martialArt, index) => {
		console.log(`${index + 1}. ${describeMartialArt(martialArt)}`);
	});
}

function printHelp(): void {
	printDivider();
	console.log('操作说明');
	console.log('1. 在主菜单里选择开始遭遇，进入一场回合制战斗。');
	console.log('2. 战斗内可以普通攻击、施展武学、防御或调息。');
	console.log('3. 施展武学时，如果有多门武学，会继续让你选择具体招式。');
	console.log('4. 破绽会提高目标承受的下一次伤害，流血会在回合结算时扣血，凝神会强化下一次进攻。');
	console.log('5. 在战斗界面输入 q 可退出当前遭遇并返回主菜单。');
}

async function chooseMartialArt(rl: ReturnType<typeof createInterface>, game: Game): Promise<MartialArt | undefined> {
	const martialArts = game.getHeroMartialArts();
	printDivider();
	console.log('选择武学');
	martialArts.forEach((martialArt, index) => {
		console.log(`${index + 1}. ${describeMartialArt(martialArt)}`);
	});
	console.log('q. 返回上一层');

	const answer = await rl.question('武学编号：');
	if (answer.trim().toLowerCase() === 'q') {
		return undefined;
	}

	const index = Number(answer.trim()) - 1;
	if (!Number.isInteger(index) || index < 0 || index >= martialArts.length) {
		console.log('无效武学编号。');
		return undefined;
	}

	return martialArts[index];
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

		let martialArtId: string | undefined;
		if (action === 'martial') {
			const martialArt = await chooseMartialArt(rl, game);
			if (!martialArt) {
				continue;
			}
			martialArtId = martialArt.id;
		}

		const result = game.takeTurn(action, martialArtId);
		printTurnResult(result);
		state = result.state;
	}

	await rl.question('按回车返回主菜单。');
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