import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { Game } from './game';
import type { EncounterState, EquippedGearIds, GearItem, MartialArt, PlayerAction, SceneData, StatusEffect, Technique, TurnResult, WaigongCategory } from './types';

const mainMenuOptions = [
	{ code: '1', label: '开始江湖遭遇' },
	{ code: '2', label: '游历当前场景' },
	{ code: '3', label: '切换游历场景' },
	{ code: '4', label: '查看角色面板' },
	{ code: '5', label: '查看武学目录' },
	{ code: '6', label: '查看装备背包' },
	{ code: '7', label: '修炼' },
	{ code: '8', label: '更换装备' },
	{ code: '9', label: '查看操作说明' },
	{ code: '10', label: '退出' },
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
	result.actionLog.forEach((action, index) => {
		const side = index === 0 && result.playerAction === action ? '你方行动' : action.attacker === result.state.hero.name ? '你方行动' : '敌方行动';
		console.log(`${side}：${action.summary}`);
	});

	result.roundLog.forEach((entry) => {
		console.log(`回合结算：${entry}`);
	});

	if (result.state.isFinished) {
		printDivider();
		if (result.state.winner === result.state.hero.name) {
			console.log(`胜负已分，${result.state.winner}赢下了这场遭遇战。`);
			result.rewards.forEach((reward) => {
				console.log(`战利品：${reward}`);
			});
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
	const scene = game.getCurrentScene();
	printDivider();
	console.log(`角色：${hero.name}`);
	console.log(`当前场景：${scene.title}`);
	console.log(`累计修为：${game.getCultivation()}`);
	console.log(`气血：${hero.maxHealth}`);
	console.log(`真气：${hero.maxQi}`);
	console.log(`臂力：${hero.attributes.strength}`);
	console.log(`身法：${hero.attributes.agility}`);
	console.log(`根骨：${hero.attributes.constitution}`);
	console.log(`悟性：${hero.attributes.insight}`);
	console.log(`轻功：${hero.equipment.qinggong.name} - ${hero.equipment.qinggong.description}`);
	console.log(`内功：${hero.equipment.neigong.name} - ${hero.equipment.neigong.description}`);
	console.log(`当前外功：${hero.equipment.waigong.name} [${translateCategory(hero.equipment.activeWaigongCategory)}] - ${hero.equipment.waigong.description}`);
	console.log(`武器：${hero.gear.weapon ? `${hero.gear.weapon.name} - ${hero.gear.weapon.description}` : '未装备武器，默认按拳法流派作战'}`);
	console.log(`衣服：${hero.gear.clothes.name} - ${hero.gear.clothes.description}`);
	console.log(`饰品：${hero.gear.accessory.name} - ${hero.gear.accessory.description}`);
	console.log(`护腕：${hero.gear.bracer.name} - ${hero.gear.bracer.description}`);
	console.log(`鞋子：${hero.gear.shoes.name} - ${hero.gear.shoes.description}`);
	console.log(`帽子：${hero.gear.hat.name} - ${hero.gear.hat.description}`);
	console.log(`戒指：${hero.gear.ring.name} - ${hero.gear.ring.description}`);
}

function describeMartialArt(martialArt: MartialArt): string {
	return `${martialArt.name} - ${martialArt.description}`;
}

function describeGear(item: GearItem): string {
	return `${item.name} - ${item.description}`;
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
	console.log(`当前兵器：${hero.gear.weapon ? hero.gear.weapon.name : '空手'}`);
	console.log(`当前外功：${hero.equipment.waigong.name} [${translateCategory(hero.equipment.activeWaigongCategory)}]`);
	console.log('分类外功装配');
	console.log(`拳：${hero.equipment.waigongLoadout.fist.name}`);
	console.log(`刀：${hero.equipment.waigongLoadout.blade.name}`);
	console.log(`剑：${hero.equipment.waigongLoadout.sword.name}`);
	console.log(`棍：${hero.equipment.waigongLoadout.staff.name}`);
	console.log(`暗器：${hero.equipment.waigongLoadout['hidden-weapon'].name}`);
	console.log(`武器：${hero.gear.weapon ? hero.gear.weapon.name : '空手'}`);
	console.log(`衣服：${hero.gear.clothes.name}`);
	console.log(`饰品：${hero.gear.accessory.name}`);
	console.log(`护腕：${hero.gear.bracer.name}`);
	console.log(`鞋子：${hero.gear.shoes.name}`);
	console.log(`帽子：${hero.gear.hat.name}`);
	console.log(`戒指：${hero.gear.ring.name}`);
	console.log('基础招式');
	game.getHeroBasicTechniques().forEach((technique, index) => {
		console.log(`${index + 1}. ${describeTechnique(technique)}`);
	});
	console.log('绝招列表');
	game.getHeroTechniques().forEach((technique, index) => {
		console.log(`${index + 1}. ${describeTechnique(technique)}`);
	});
}

function printGearInventory(game: Game): void {
	const inventory = game.getHeroGearInventory();
	printDivider();
	console.log('装备背包');
	console.log(`武器：${inventory.weapon.map((item) => item.name).join('、') || '无'}`);
	console.log(`衣服：${inventory.clothes.map((item) => item.name).join('、') || '无'}`);
	console.log(`饰品：${inventory.accessory.map((item) => item.name).join('、') || '无'}`);
	console.log(`护腕：${inventory.bracer.map((item) => item.name).join('、') || '无'}`);
	console.log(`鞋子：${inventory.shoes.map((item) => item.name).join('、') || '无'}`);
	console.log(`帽子：${inventory.hat.map((item) => item.name).join('、') || '无'}`);
	console.log(`戒指：${inventory.ring.map((item) => item.name).join('、') || '无'}`);
}

function printTrainingOverview(game: Game): void {
	const overview = game.getHeroTrainingOverview();
	printDivider();
	console.log(`当前修为：${overview.cultivation}`);
	console.log(`基础修炼：筋骨 ${overview.state.bodyLevel} / 吐纳 ${overview.state.breathLevel} / 走桩 ${overview.state.movementLevel} / 臂力 ${overview.state.strengthLevel}`);
	console.log(`基础收益：气血 +${overview.bonuses.maxHealth} / 真气 +${overview.bonuses.maxQi} / 臂力 +${overview.bonuses.attributes.strength} / 身法 +${overview.bonuses.attributes.agility} / 根骨 +${overview.bonuses.attributes.constitution} / 悟性 +${overview.bonuses.attributes.insight}`);
	console.log(`武学收益：命中 +${Math.round(overview.bonuses.passiveBonuses.accuracy * 100)}% / 闪避 +${Math.round(overview.bonuses.passiveBonuses.evasion * 100)}% / 速度 +${overview.bonuses.passiveBonuses.speed} / 回气 +${overview.bonuses.passiveBonuses.qiRecovery} / 护体 +${overview.bonuses.passiveBonuses.guard} / 伤害 +${overview.bonuses.passiveBonuses.damage}`);
	console.log('可修炼项目');
	overview.options.forEach((option, index) => {
		const target = option.targetMartialArtName ? ` [${option.targetMartialArtName}]` : '';
		const status = option.available ? '可修炼' : '修为不足';
		console.log(`${index + 1}. ${option.name}${target} - 当前 ${option.currentLevel} 层 / 消耗 ${option.nextCost} / ${status}`);
		console.log(`   ${option.effectPreview}`);
	});
}

function printSceneOverview(game: Game): void {
	const scene = game.getCurrentScene();
	printDivider();
	console.log(`当前场景：${scene.title}`);
	console.log(scene.description);
	console.log(`场景威胁：${scene.threats.join('、')}`);
	console.log(`累计修为：${game.getCultivation()}`);
}

function printHelp(): void {
	printDivider();
	console.log('操作说明');
	console.log('1. 角色一次只能装备 1 个轻功和 1 个内功。');
	console.log('2. 拳、刀、剑、棍、暗器五个流派各自可以预设 1 门外功。');
	console.log('3. 当前使用的外功由武器决定：拳套对应拳法、刀对应刀法、剑对应剑法、棍对应棍法、暗器对应暗器套路。');
	console.log('4. 卸下武器时视为空手状态，默认按拳法流派作战。');
	console.log('5. 普通攻击会从当前外功的基础招式池中随机施展一招。');
	console.log('6. 破绽会提高目标承受的下一次伤害，流血会在回合结算时扣血，凝神会强化下一次进攻。');
	console.log('7. 装备共有 7 个槽位：武器、衣服、饰品、护腕、鞋子、帽子、戒指。');
	console.log('8. 战斗胜利后会掉落敌方装备，并自动进入装备背包。');
	console.log('9. 在主菜单中可以分别查看背包，并切换轻功、内功、各流派外功，以及 7 个装备槽位。');
	console.log('10. 每回合按速度决定先后手，速度更高的一方先行动。');
	console.log('11. 在战斗界面输入 q 可退出当前遭遇并返回主菜单。');
	console.log('12. 游历当前场景会触发传闻、修炼或遭遇事件；非战斗事件会直接转化为修为。');
	console.log('13. 修炼分为基础修炼和武学研习两类，都会永久影响后续角色面板与战斗数值。');
}

async function runTrainingMenu(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	while (true) {
		const overview = game.getHeroTrainingOverview();
		printTrainingOverview(game);
		console.log('q. 返回主菜单');

		const answer = await rl.question('选择修炼项目：');
		if (answer.trim().toLowerCase() === 'q') {
			return;
		}

		const optionIndex = Number(answer.trim()) - 1;
		if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= overview.options.length) {
			console.log('无效编号。');
			continue;
		}

		const option = overview.options[optionIndex];
		if (!option.available) {
			console.log(`修为不足，${option.name}需要${option.nextCost}点修为。`);
			continue;
		}

		const result = game.trainHero(option.id);
		console.log(result.summary);
		console.log(`本次消耗 ${result.spentCultivation} 点修为，剩余 ${result.remainingCultivation}。`);
	}
}

async function runTravel(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	printSceneOverview(game);
	const result = game.travel();
	printDivider();
	console.log(`游历结果：${result.summary}`);
	result.log.forEach((entry) => {
		console.log(entry);
	});
	console.log(`当前累计修为：${result.totalCultivation}`);

	if (result.encounter) {
		console.log('你已卷入一场遭遇战。');
		await runEncounter(rl, game);
		return;
	}

	await rl.question('按回车返回主菜单。');
}

async function runSceneSelection(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	const scenes = game.getAvailableScenes();

	while (true) {
		const currentScene = game.getCurrentScene();
		printDivider();
		console.log(`当前游历场景：${currentScene.title}`);
		scenes.forEach((scene, index) => {
			console.log(`${index + 1}. ${scene.title} - ${scene.description}`);
		});
		console.log('q. 返回主菜单');

		const answer = await rl.question('请选择场景：');
		if (answer.trim().toLowerCase() === 'q') {
			return;
		}

		const index = Number(answer.trim()) - 1;
		if (!Number.isInteger(index) || index < 0 || index >= scenes.length) {
			console.log('无效场景编号。');
			continue;
		}

		const scene: SceneData = game.travelToScene(scenes[index].id);
		console.log(`你已前往${scene.title}。`);
	}
}

async function chooseTechnique(rl: ReturnType<typeof createInterface>, game: Game): Promise<Technique | undefined> {
	const techniques = game.getHeroTechniques();
	if (techniques.length === 0) {
		console.log('当前外功没有可主动施展的绝招。');
		return undefined;
	}

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

async function runEquipmentMenu(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	const menuOptions = [
		{ code: '1', label: '更换武学' },
		{ code: '2', label: '更换装备' },
	];

	while (true) {
		printDivider();
		console.log('调整配置');
		menuOptions.forEach((entry) => console.log(`${entry.code}. ${entry.label}`));
		console.log('q. 返回主菜单');

		const answer = await rl.question('请选择：');
		const normalized = answer.trim().toLowerCase();

		if (normalized === 'q') {
			return;
		}

		if (normalized === '1') {
			await runMartialArtLoadoutMenu(rl, game);
			continue;
		}

		if (normalized === '2') {
			await runGearLoadoutMenu(rl, game);
			continue;
		}

		console.log('无效选择。');
	}
}

async function runMartialArtLoadoutMenu(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	const waigongSlots: Array<{ code: string; category: WaigongCategory; label: string }> = [
		{ code: '3', category: 'fist', label: '拳法' },
		{ code: '4', category: 'blade', label: '刀法' },
		{ code: '5', category: 'sword', label: '剑法' },
		{ code: '6', category: 'staff', label: '棍法' },
		{ code: '7', category: 'hidden-weapon', label: '暗器' },
	];

	while (true) {
		const hero = game.getHeroReferenceProfile();
		const options = game.getHeroLoadoutOptions();
		printDivider();
		console.log('更换武学');
		console.log(`当前轻功：${hero.equipment.qinggong.name}`);
		console.log(`当前内功：${hero.equipment.neigong.name}`);
		console.log(`当前外功：${hero.equipment.waigong.name} [${translateCategory(hero.equipment.activeWaigongCategory)}]`);
		console.log('1. 更换轻功');
		console.log('2. 更换内功');
		waigongSlots.forEach((entry) => console.log(`${entry.code}. 更换${entry.label}`));
		console.log('q. 返回主菜单');

		const answer = await rl.question('请选择装备槽：');
		const normalized = answer.trim().toLowerCase();
		if (normalized === 'q') {
			return;
		}

		if (normalized === '1' || normalized === '2') {
			const slot = normalized === '1' ? 'qinggong' : 'neigong';
			const label = normalized === '1' ? '轻功' : '内功';
			const list = options[slot];

			printDivider();
			console.log(`可选${label}`);
			list.forEach((martialArt, index) => {
				console.log(`${index + 1}. ${describeMartialArt(martialArt)}`);
			});
			console.log('q. 返回上一层');

			const choice = await rl.question('请输入编号：');
			if (choice.trim().toLowerCase() === 'q') {
				continue;
			}

			const optionIndex = Number(choice.trim()) - 1;
			if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= list.length) {
				console.log('无效编号。');
				continue;
			}

			const martialArt = list[optionIndex];
			game.equipHeroMartialArt(slot, martialArt.id);
			console.log(`已将${label}更换为${martialArt.name}。`);
			continue;
		}

		const target = waigongSlots.find((entry) => entry.code === normalized);
		if (!target) {
			console.log('无效选择。');
			continue;
		}

		printDivider();
		console.log(`可选${target.label}`);
		console.log('0. 卸下该流派外功，改用基础外功');
		options.waigong[target.category].forEach((martialArt, index) => {
			console.log(`${index + 1}. ${describeMartialArt(martialArt)}`);
		});
		console.log('q. 返回上一层');

		const choice = await rl.question('请输入编号：');
		if (choice.trim().toLowerCase() === 'q') {
			continue;
		}

		if (choice.trim() === '0') {
			game.equipHeroWaigong(target.category, null);
			console.log(`已将${target.label}恢复为基础外功。`);
			continue;
		}

		const optionIndex = Number(choice.trim()) - 1;
		if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.waigong[target.category].length) {
			console.log('无效编号。');
			continue;
		}

		const martialArt = options.waigong[target.category][optionIndex];
		game.equipHeroWaigong(target.category, martialArt.id);
		console.log(`已将${target.label}更换为${martialArt.name}。`);
	}
}

async function runGearLoadoutMenu(rl: ReturnType<typeof createInterface>, game: Game): Promise<void> {
	const slots: Array<{ code: string; slot: keyof EquippedGearIds; label: string }> = [
		{ code: '1', slot: 'weapon', label: '武器' },
		{ code: '2', slot: 'clothes', label: '衣服' },
		{ code: '3', slot: 'accessory', label: '饰品' },
		{ code: '4', slot: 'bracer', label: '护腕' },
		{ code: '5', slot: 'shoes', label: '鞋子' },
		{ code: '6', slot: 'hat', label: '帽子' },
		{ code: '7', slot: 'ring', label: '戒指' },
	];

	while (true) {
		const hero = game.getHeroReferenceProfile();
		const options = game.getHeroGearOptions();
		printDivider();
		console.log('更换装备');
		console.log(`当前武器：${hero.gear.weapon ? hero.gear.weapon.name : '空手'}`);
		console.log(`当前衣服：${hero.gear.clothes.name}`);
		console.log(`当前饰品：${hero.gear.accessory.name}`);
		console.log(`当前护腕：${hero.gear.bracer.name}`);
		console.log(`当前鞋子：${hero.gear.shoes.name}`);
		console.log(`当前帽子：${hero.gear.hat.name}`);
		console.log(`当前戒指：${hero.gear.ring.name}`);
		slots.forEach((entry) => console.log(`${entry.code}. 更换${entry.label}`));
		console.log('q. 返回上一层');

		const answer = await rl.question('请选择装备槽：');
		const normalized = answer.trim().toLowerCase();
		if (normalized === 'q') {
			return;
		}

		const target = slots.find((entry) => entry.code === normalized);
		if (!target) {
			console.log('无效选择。');
			continue;
		}

		printDivider();
		console.log(`可选${target.label}`);
		if (target.slot === 'weapon') {
			console.log('0. 卸下武器，改用基础外功');
		}
		options[target.slot].forEach((item, index) => {
			console.log(`${index + 1}. ${describeGear(item)}`);
		});
		console.log('q. 返回上一层');

		const choice = await rl.question('请输入编号：');
		if (choice.trim().toLowerCase() === 'q') {
			continue;
		}

		if (target.slot === 'weapon' && choice.trim() === '0') {
			game.equipHeroGear('weapon', null);
			console.log('已卸下武器，当前会默认按拳法流派作战。');
			continue;
		}

		const optionIndex = Number(choice.trim()) - 1;
		if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options[target.slot].length) {
			console.log('无效编号。');
			continue;
		}

		const item = options[target.slot][optionIndex];
		game.equipHeroGear(target.slot, item.id);
		console.log(`已将${target.label}更换为${item.name}。`);
	}
}

function translateCategory(category: string): string {
	switch (category) {
		case 'blade':
			return '刀';
		case 'sword':
			return '剑';
		case 'staff':
			return '棍';
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
				await runTravel(rl, game);
				continue;
			}

			if (normalized === '3') {
				await runSceneSelection(rl, game);
				continue;
			}

			if (normalized === '4') {
				printHeroPanel(game);
				continue;
			}

			if (normalized === '5') {
				printMartialArts(game);
				continue;
			}

			if (normalized === '6') {
				printGearInventory(game);
				continue;
			}

			if (normalized === '7') {
				await runTrainingMenu(rl, game);
				continue;
			}

			if (normalized === '8') {
				await runEquipmentMenu(rl, game);
				continue;
			}

			if (normalized === '9') {
				printHelp();
				continue;
			}

			if (normalized === '10' || normalized === 'q') {
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