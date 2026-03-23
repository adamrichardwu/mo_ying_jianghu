import { Game } from '../game';
import type {
    CombatActionResult,
    EncounterState,
    EquippedGearIds,
    GearItem,
    GearRarity,
    GearSlot,
    MartialArt,
    PlayerAction,
    Technique,
    TurnResult,
    WaigongCategory,
} from '../types';
import './styles.css';
import { getPortraitAsset, getSceneThemeAsset } from './visuals';

type AppTab = 'overview' | 'battle' | 'training' | 'martial' | 'gear' | 'inventory' | 'help';
type ActionKind = 'system' | 'battle' | 'reward' | 'loadout' | 'training';
type StageActor = EncounterState['hero'] | EncounterState['rival'];

interface AppLogEntry {
    kind: ActionKind;
    title: string;
    detail: string;
}

interface AppState {
    activeTab: AppTab;
    encounter?: EncounterState;
    battleLogs: AppLogEntry[];
    latestRewards: string[];
    selectedMartialCategory: WaigongCategory;
    selectedGearSlot: keyof EquippedGearIds;
    techniqueMode: 'martial' | null;
}

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
    throw new Error('App root not found.');
}

const game = new Game();
const state: AppState = {
    activeTab: 'overview',
    encounter: undefined,
    battleLogs: [
        {
            kind: 'system',
            title: '江湖卷轴已展开',
            detail: '当前为浏览器版界面，你可以直接在此发起遭遇、切换武学与装备，并查看战利品。',
        },
    ],
    latestRewards: [],
    selectedMartialCategory: 'sword',
    selectedGearSlot: 'weapon',
    techniqueMode: null,
};

const tabs: Array<{ id: AppTab; label: string }> = [
    { id: 'overview', label: '总览' },
    { id: 'battle', label: '战斗' },
    { id: 'training', label: '修炼' },
    { id: 'martial', label: '武学' },
    { id: 'gear', label: '装备' },
    { id: 'inventory', label: '背包' },
    { id: 'help', label: '说明' },
];

const martialCategories: Array<{ category: WaigongCategory; label: string }> = [
    { category: 'fist', label: '拳法' },
    { category: 'blade', label: '刀法' },
    { category: 'sword', label: '剑法' },
    { category: 'staff', label: '棍法' },
    { category: 'hidden-weapon', label: '暗器' },
];

const gearSlots: Array<{ slot: keyof EquippedGearIds; label: string }> = [
    { slot: 'weapon', label: '武器' },
    { slot: 'clothes', label: '衣服' },
    { slot: 'accessory', label: '饰品' },
    { slot: 'bracer', label: '护腕' },
    { slot: 'shoes', label: '鞋子' },
    { slot: 'hat', label: '帽子' },
    { slot: 'ring', label: '戒指' },
];

function render(): void {
    const hero = game.getHeroReferenceProfile();
    const encounter = state.encounter;
    const summaryState = encounter?.hero ?? hero;
    const rivalState = encounter?.rival;
    const currentScene = game.getCurrentScene();
    const cultivation = game.getCultivation();

    app.innerHTML = `
        <div class="shell">
            <section class="hero-banner">
                <div class="hero-grid">
                    <div class="title-block">
                        <div class="tag">浏览器试作界面</div>
                        <h1>${escapeHtml(hero.name)}</h1>
                        <p class="subtitle">${escapeHtml(hero.equipment.qinggong.name)}定身位，${escapeHtml(hero.equipment.neigong.name)}定气脉，当前以${escapeHtml(hero.equipment.waigong.name)}应敌。现在这套界面已经不再依赖终端输入，而是直接在页面上完成战斗、换装和武学编排。</p>
                        <div class="tabbar">
                            ${tabs.map((tab) => `<button data-tab="${tab.id}" class="${state.activeTab === tab.id ? 'active' : ''}">${tab.label}</button>`).join('')}
                        </div>
                    </div>
                    <div class="summary-strip">
                        ${renderSummaryCard('气血', `${summaryState.health ?? hero.maxHealth}/${hero.maxHealth}`)}
                        ${renderSummaryCard('真气', `${summaryState.qi ?? hero.maxQi}/${hero.maxQi}`)}
                        ${renderSummaryCard('当前场景', currentScene.title)}
                        ${renderSummaryCard('修为', `${cultivation}`)}
                        ${renderSummaryCard('当前兵器', hero.gear.weapon ? hero.gear.weapon.name : '空手')}
                        ${renderSummaryCard('活跃流派', `${translateCategory(hero.equipment.activeWaigongCategory)} / ${hero.equipment.waigong.name}`)}
                    </div>
                </div>
            </section>
            <div class="main-grid">
                <main class="panel">${renderMainPanel(hero, encounter, rivalState)}</main>
                <aside class="log-panel">
                    <div class="panel-header">
                        <h2>江湖记事</h2>
                        <button class="subtle-button" data-action="clear-log">清空</button>
                    </div>
                    ${renderLogPanel()}
                </aside>
            </div>
        </div>
    `;

    bindEvents();
}

function renderMainPanel(hero: ReturnType<Game['getHeroReferenceProfile']>, encounter?: EncounterState, rival?: EncounterState['rival']): string {
    switch (state.activeTab) {
        case 'battle':
            return renderBattlePanel(hero, encounter, rival);
        case 'training':
            return renderTrainingPanel(hero);
        case 'martial':
            return renderMartialPanel(hero);
        case 'gear':
            return renderGearPanel(hero);
        case 'inventory':
            return renderInventoryPanel();
        case 'help':
            return renderHelpPanel();
        case 'overview':
        default:
            return renderOverviewPanel(hero, encounter, rival);
    }
}

function renderOverviewPanel(hero: ReturnType<Game['getHeroReferenceProfile']>, encounter?: EncounterState, rival?: EncounterState['rival']): string {
    const previewHero = encounter?.hero ?? { ...hero, health: hero.maxHealth, qi: hero.maxQi, guard: 0, statuses: [] };
    const currentScene = game.getCurrentScene();
    const scenes = game.getAvailableScenes();
    const cultivation = game.getCultivation();

    return `
        ${renderSceneStage(previewHero, rival, encounter, false)}
        <div class="section-card">
            <div class="panel-header">
                <h2>角色总览</h2>
                <div class="tag">${escapeHtml(encounter?.scene.title ?? '未进入遭遇')}</div>
            </div>
            <div class="list-grid">
                <div class="portrait-showcase">
                    ${renderPortraitCard(previewHero, false, '江湖侠影')}
                    ${rival ? renderPortraitCard(rival, true, '当前敌手') : renderPortraitPlaceholder()}
                </div>
                <div class="list-item">
                    <h4>当前配置</h4>
                    <p>轻功：${escapeHtml(hero.equipment.qinggong.name)}｜内功：${escapeHtml(hero.equipment.neigong.name)}｜外功：${escapeHtml(hero.equipment.waigong.name)} (${translateCategory(hero.equipment.activeWaigongCategory)})</p>
                </div>
                <div class="list-item">
                    <h4>属性</h4>
                    <p>臂力 ${hero.attributes.strength}｜身法 ${hero.attributes.agility}｜根骨 ${hero.attributes.constitution}｜悟性 ${hero.attributes.insight}</p>
                </div>
                <div class="list-item">
                    <h4>游历进度</h4>
                    <p>当前场景：${escapeHtml(currentScene.title)}｜累计修为：${cultivation}｜场景威胁：${currentScene.threats.map((threat) => escapeHtml(threat)).join('、')}</p>
                </div>
                <div class="list-item">
                    <h4>装备提要</h4>
                    <p>${gearSlots.map(({ slot, label }) => `${label}：${getGearName(hero.gear[slot])}`).join('｜')}</p>
                </div>
            </div>
        </div>
        <div class="section-card">
            <div class="panel-header">
                <h2>江湖行程</h2>
                <div class="tag">${escapeHtml(currentScene.title)}</div>
            </div>
            <div class="battle-actions">
                <button class="action-button primary" data-action="travel-scene">
                    <strong>游历一次</strong>
                    在当前场景中触发一次随机事件，可能获得修为，也可能直接卷入遭遇。
                </button>
                ${scenes.map((scene) => `
                    <button class="action-button ${scene.id === currentScene.id ? 'active' : ''}" data-action="switch-scene" data-scene-id="${scene.id}" ${scene.id === currentScene.id ? 'disabled' : ''}>
                        <strong>${escapeHtml(scene.title)}</strong>
                        ${escapeHtml(scene.description)}
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="section-card">
            <div class="panel-header">
                <h2>快速操作</h2>
            </div>
            <div class="battle-actions">
                <button class="action-button primary" data-action="travel-scene">
                    <strong>先游历，再定去留</strong>
                    更适合从场景事件进入战斗，而不是直接固定开打。
                </button>
                <button class="action-button primary" data-action="start-encounter">
                    <strong>${encounter && !encounter.isFinished ? '继续遭遇' : '发起遭遇'}</strong>
                    进入当前场景，开始回合制对决。
                </button>
                <button class="action-button" data-action="switch-tab" data-value="martial">
                    <strong>调整武学</strong>
                    切换轻功、内功与五类外功预设。
                </button>
                <button class="action-button" data-action="switch-tab" data-value="training">
                    <strong>闭门修炼</strong>
                    消耗修为强化筋骨、内息和当前武学。
                </button>
                <button class="action-button" data-action="switch-tab" data-value="gear">
                    <strong>更换装备</strong>
                    直接在七个槽位间切换装备组合。
                </button>
                <button class="action-button" data-action="switch-tab" data-value="inventory">
                    <strong>查看背包</strong>
                    检查已获得的全部装备与稀有度。
                </button>
            </div>
        </div>
        ${rival ? `
        <div class="section-card">
            <div class="panel-header">
                <h2>当前对手</h2>
                <div class="tag">第 ${encounter?.round ?? 1} 回合</div>
            </div>
            ${renderDuelCard(rival, true)}
        </div>
        ` : ''}
    `;
}

function renderBattlePanel(hero: ReturnType<Game['getHeroReferenceProfile']>, encounter?: EncounterState, rival?: EncounterState['rival']): string {
    const techniques = game.getHeroTechniques();
    const basicTechniques = game.getHeroBasicTechniques();
    const stageHero = encounter?.hero ?? { ...hero, health: hero.maxHealth, qi: hero.maxQi, guard: 0, statuses: [] };

    return `
        <div class="panel-header">
            <h2>战斗界面</h2>
            <div class="tag">${escapeHtml(encounter?.scene.title ?? '尚未开始遭遇')}</div>
        </div>
        <div class="battle-arena">
            ${renderSceneStage(stageHero, rival, encounter, true)}
            <div class="duel-grid">
                ${renderDuelCard(stageHero, false)}
                ${rival ? renderDuelCard(rival, true) : `
                    <div class="list-item duel-placeholder">
                        <h4>尚未遇敌</h4>
                        <p>点击下方“发起遭遇”后，将载入当前场景并生成战斗状态。</p>
                    </div>
                `}
            </div>
            <div class="section-card">
                <div class="section-title">
                    <h3>回合操作</h3>
                    <div class="tag">${encounter ? `第 ${encounter.round} 回合` : '待机中'}</div>
                </div>
                <div class="battle-actions">
                    <button class="action-button primary" data-action="start-encounter">
                        <strong>${encounter && !encounter.isFinished ? '重开此战' : '发起遭遇'}</strong>
                        重置当前遭遇并从第一回合开始。
                    </button>
                    <button class="action-button" data-action="battle" data-value="attack" ${!canAct(encounter) ? 'disabled' : ''}>
                        <strong>普通攻击</strong>
                        从基础招式池随机施展一式。当前共 ${basicTechniques.length} 式。
                    </button>
                    <button class="action-button" data-action="prepare-martial" ${!canAct(encounter) ? 'disabled' : ''}>
                        <strong>施展武学</strong>
                        从当前外功绝招中任选一式发动。
                    </button>
                    <button class="action-button" data-action="battle" data-value="defend" ${!canAct(encounter) ? 'disabled' : ''}>
                        <strong>防御</strong>
                        叠加防御，抵消下次受到的部分伤害。
                    </button>
                    <button class="action-button" data-action="battle" data-value="meditate" ${!canAct(encounter) ? 'disabled' : ''}>
                        <strong>调息</strong>
                        恢复真气，准备下一次重手。
                    </button>
                </div>
                ${state.techniqueMode === 'martial' ? `
                    <div class="section-title" style="margin-top: 18px;">
                        <h3>绝招选择</h3>
                        <button class="subtle-button" data-action="cancel-technique">收起</button>
                    </div>
                    <div class="list-grid">
                        ${techniques.length > 0 ? techniques.map((technique) => renderTechniqueItem(technique, true)).join('') : `<div class="empty">当前外功没有可选绝招。</div>`}
                    </div>
                ` : ''}
                ${encounter?.isFinished ? renderRewards(encounter) : ''}
            </div>
        </div>
    `;
}

function renderTrainingPanel(hero: ReturnType<Game['getHeroReferenceProfile']>): string {
    const overview = game.getHeroTrainingOverview();
    const passive = overview.bonuses.passiveBonuses;

    return `
        <div class="panel-header">
            <h2>修炼</h2>
            <div class="tag">当前修为 ${overview.cultivation}</div>
        </div>
        <div class="section-card">
            <div class="section-title">
                <h3>修炼总览</h3>
                <div class="tag">参考传统武侠养成节奏，先把修为转成稳定成长</div>
            </div>
            <div class="list-grid">
                <div class="list-item">
                    <h4>基础修炼</h4>
                    <p>筋骨 ${overview.state.bodyLevel} 层｜吐纳 ${overview.state.breathLevel} 层｜走桩 ${overview.state.movementLevel} 层｜臂力 ${overview.state.strengthLevel} 层</p>
                </div>
                <div class="list-item">
                    <h4>基础收益</h4>
                    <p>额外气血 +${overview.bonuses.maxHealth}｜额外真气 +${overview.bonuses.maxQi}｜臂力 +${overview.bonuses.attributes.strength}｜身法 +${overview.bonuses.attributes.agility}｜根骨 +${overview.bonuses.attributes.constitution}｜悟性 +${overview.bonuses.attributes.insight}</p>
                </div>
                <div class="list-item">
                    <h4>武学熟练收益</h4>
                    <p>命中 +${Math.round(passive.accuracy * 100)}%｜闪避 +${Math.round(passive.evasion * 100)}%｜速度 +${passive.speed}｜回气 +${passive.qiRecovery}｜护体 +${passive.guard}｜伤害 +${passive.damage}</p>
                </div>
                <div class="list-item">
                    <h4>当前武学</h4>
                    <p>轻功：${escapeHtml(hero.equipment.qinggong.name)}｜内功：${escapeHtml(hero.equipment.neigong.name)}｜外功：${escapeHtml(hero.equipment.waigong.name)}</p>
                </div>
            </div>
        </div>
        <div class="section-card">
            <div class="section-title">
                <h3>修炼项目</h3>
            </div>
            <div class="list-grid">
                ${overview.options.map((option) => renderTrainingOption(option)).join('')}
            </div>
        </div>
    `;
}

function renderMartialPanel(hero: ReturnType<Game['getHeroReferenceProfile']>): string {
    const options = game.getHeroLoadoutOptions();
    const category = state.selectedMartialCategory;

    return `
        <div class="panel-header">
            <h2>武学编排</h2>
            <div class="tag">当前兵器: ${hero.gear.weapon ? escapeHtml(hero.gear.weapon.name) : '空手'}</div>
        </div>
        <div class="section-card">
            <div class="section-title">
                <h3>轻功与内功</h3>
            </div>
            <div class="list-grid">
                <div class="list-item">
                    <h4>轻功槽位</h4>
                    <p>当前：${escapeHtml(hero.equipment.qinggong.name)}</p>
                    <footer>
                        ${options.qinggong.map((martialArt) => renderMartialButton(martialArt, 'qinggong', hero.equipment.qinggong.id)).join('')}
                    </footer>
                </div>
                <div class="list-item">
                    <h4>内功槽位</h4>
                    <p>当前：${escapeHtml(hero.equipment.neigong.name)}</p>
                    <footer>
                        ${options.neigong.map((martialArt) => renderMartialButton(martialArt, 'neigong', hero.equipment.neigong.id)).join('')}
                    </footer>
                </div>
            </div>
        </div>
        <div class="section-card">
            <div class="section-title">
                <h3>外功流派</h3>
            </div>
            <div class="selector">
                ${martialCategories.map((entry) => `<button data-action="pick-martial-category" data-value="${entry.category}" class="${category === entry.category ? 'active' : ''}">${entry.label}</button>`).join('')}
            </div>
            <div class="list-item">
                <h4>${translateCategory(category)}预设</h4>
                <p>当前装配：${escapeHtml(hero.equipment.waigongLoadout[category].name)}。若当前兵器属于该类，战斗中会自动启用此门外功。</p>
                <footer>
                    <button class="subtle-button" data-action="equip-base-waigong" data-category="${category}">恢复基础外功</button>
                    ${options.waigong[category].map((martialArt) => renderWaigongButton(martialArt, category, hero.equipment.waigongLoadout[category].id)).join('')}
                </footer>
            </div>
            <div class="list-grid" style="margin-top: 14px;">
                <div class="list-item">
                    <h4>基础招式</h4>
                    <p>${(hero.equipment.waigongLoadout[category].basicTechniques ?? []).map((technique) => describeTechnique(technique)).join('｜') || '无'}</p>
                </div>
                <div class="list-item">
                    <h4>主动绝招</h4>
                    <p>${(hero.equipment.waigongLoadout[category].techniques ?? []).map((technique) => describeTechnique(technique)).join('｜') || '无'}</p>
                </div>
            </div>
        </div>
    `;
}

function renderGearPanel(hero: ReturnType<Game['getHeroReferenceProfile']>): string {
    const options = game.getHeroGearOptions();
    const slot = state.selectedGearSlot;
    const currentItem = hero.gear[slot];

    return `
        <div class="panel-header">
            <h2>装备更换</h2>
            <div class="tag">活跃外功: ${escapeHtml(hero.equipment.waigong.name)}</div>
        </div>
        <div class="selector">
            ${gearSlots.map((entry) => `<button data-action="pick-gear-slot" data-value="${entry.slot}" class="${slot === entry.slot ? 'active' : ''}">${entry.label}</button>`).join('')}
        </div>
        <div class="section-card">
            <div class="section-title">
                <h3>${gearLabel(slot)}</h3>
                <div class="tag">当前: ${getGearName(currentItem)}</div>
            </div>
            <div class="list-grid">
                ${slot === 'weapon' ? `
                    <div class="list-item">
                        <h4>空手</h4>
                        <p>卸下武器后，角色会自动切换到拳法流派。</p>
                        <footer>
                            <button class="subtle-button" data-action="equip-gear" data-slot="weapon" data-gear-id="">卸下武器</button>
                        </footer>
                    </div>
                ` : ''}
                ${options[slot].map((item) => renderGearOption(item, slot, currentItem?.id)).join('')}
            </div>
        </div>
    `;
}

function renderInventoryPanel(): string {
    const inventory = game.getHeroGearInventory();

    return `
        <div class="panel-header">
            <h2>装备背包</h2>
            <div class="tag">胜利后获得的新装备会直接进入这里</div>
        </div>
        <div class="list-grid">
            ${gearSlots.map(({ slot, label }) => `
                <div class="list-item">
                    <h4>${label}</h4>
                    <p>${inventory[slot].length > 0 ? inventory[slot].map((item) => `${item.name}(${rarityLabel(item.rarity)})`).join('｜') : '暂无此类装备。'}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function renderHelpPanel(): string {
    return `
        <div class="panel-header">
            <h2>玩法说明</h2>
        </div>
        <div class="list-grid">
            ${[
                '角色同时只装备 1 门轻功与 1 门内功。',
                '拳、刀、剑、棍、暗器五类外功各有独立预设，武器会自动决定启用哪一类。',
                '普通攻击会在当前外功的基础招式池中随机抽取一式。',
                '绝招需要真气，调息可恢复真气，防御可积累护体值。',
                '破绽会强化下一次受击，流血会在回合结算时掉血，凝神会增幅下一次进攻。',
                '修炼会消耗修为，基础修炼强化属性，闭关研习会强化当前轻功、内功与外功。',
                '装备共有武器、衣服、饰品、护腕、鞋子、帽子、戒指七个槽位。',
                '胜利后若命中掉落，将自动加入背包，并能立即在装备界面换上。',
            ].map((line, index) => `<div class="list-item"><h4>规则 ${index + 1}</h4><p>${line}</p></div>`).join('')}
        </div>
    `;
}

function renderDuelCard(actor: EncounterState['hero'] | EncounterState['rival'], enemy: boolean): string {
    return `
        <article class="duel-card ${enemy ? 'enemy' : ''}">
            <header>
                <div class="duel-avatar-wrap">
                    <img class="duel-avatar ${enemy ? 'enemy' : ''}" src="${portraitPath(actor.name)}" alt="${escapeHtml(actor.name)}立绘" />
                </div>
                <div>
                    <h3>${escapeHtml(actor.name)}</h3>
                    <div class="duel-meta">
                        <span>${enemy ? '对手' : '侠客'}</span>
                        <span>${escapeHtml(actor.equipment.waigong.name)}</span>
                        <span>${translateCategory(actor.equipment.activeWaigongCategory)}</span>
                    </div>
                </div>
                <div class="tag">防御 ${actor.guard}</div>
            </header>
            ${renderMeter('气血', actor.health, actor.maxHealth, 'health')}
            ${renderMeter('真气', actor.qi, actor.maxQi, 'qi')}
            <div class="status-row">
                ${actor.statuses.length > 0 ? actor.statuses.map((status) => `<span class="status-chip">${status.name} ${status.potency}/${status.duration}</span>`).join('') : '<span class="status-chip">无状态</span>'}
            </div>
        </article>
    `;
}

function renderSceneStage(hero: StageActor, rival: StageActor | undefined, encounter: EncounterState | undefined, battleMode: boolean): string {
    const sceneTheme = getSceneThemeAsset(encounter?.scene.id);
    const sceneTitle = encounter?.scene.title ?? '青石古道';
    const sceneDescription = encounter?.scene.description ?? '山风擦过山道，远近层峦与客旅脚步一同延展开来。';
    const highlight = getSceneHighlight();

    return `
        <section class="scene-stage ${sceneTheme.className}">
            <div class="scene-backdrop">
                <div class="scene-sun"></div>
                <div class="scene-cloud scene-cloud-a"></div>
                <div class="scene-cloud scene-cloud-b"></div>
                <div class="scene-ridge ridge-far"></div>
                <div class="scene-ridge ridge-mid"></div>
                <div class="scene-ridge ridge-near"></div>
                <div class="scene-ground-line"></div>
                <div class="scene-grass scene-grass-left"></div>
                <div class="scene-grass scene-grass-right"></div>
            </div>
            <div class="scene-hud">
                <div>
                    <div class="scene-kicker">${battleMode ? '横板对决场景' : '江湖场景预览'}</div>
                    <h3>${escapeHtml(sceneTitle)}</h3>
                    <p>${escapeHtml(sceneDescription)}</p>
                </div>
                <div class="scene-badges">
                    <span class="tag">${sceneTheme.label}</span>
                    <span class="tag">${encounter ? `第 ${encounter.round} 回合` : '待机中'}</span>
                </div>
            </div>
            <div class="scene-portraits ${rival ? 'has-rival' : ''}">
                ${renderStagePortrait(hero, false)}
                ${rival ? renderStagePortrait(rival, true) : ''}
            </div>
            <div class="scene-platform">
                ${renderStageFighter(hero, 'hero', false)}
                ${rival ? renderStageFighter(rival, 'rival', true) : renderEmptyStageSlot()}
                <div class="scene-center-glow ${battleMode ? 'active' : ''}"></div>
            </div>
            <div class="scene-caption">
                <strong>${escapeHtml(highlight.title)}</strong>
                <span>${escapeHtml(highlight.detail)}</span>
            </div>
        </section>
    `;
}

function renderStageFighter(actor: StageActor, side: 'hero' | 'rival', enemy: boolean): string {
    const healthWidth = Math.max(0, Math.min(100, actor.maxHealth === 0 ? 0 : (actor.health / actor.maxHealth) * 100));
    const qiWidth = Math.max(0, Math.min(100, actor.maxQi === 0 ? 0 : (actor.qi / actor.maxQi) * 100));
    const statusTone = actor.statuses[0]?.type ?? 'focus';
    const weaponClass = `weapon-${actor.equipment.activeWaigongCategory}`;
    const auraClass = actor.statuses.length > 0 ? `status-${statusTone}` : 'status-calm';

    return `
        <article class="stage-fighter ${side} ${weaponClass} ${auraClass} ${enemy ? 'enemy' : ''}">
            <div class="fighter-hud ${enemy ? 'enemy' : ''}">
                <div class="fighter-name-row">
                    <strong>${escapeHtml(actor.name)}</strong>
                    <span>${translateCategory(actor.equipment.activeWaigongCategory)} · ${escapeHtml(actor.equipment.waigong.name)}</span>
                </div>
                <div class="fighter-bar-group">
                    <div class="fighter-bar"><span>气血</span><div class="fighter-bar-track"><div class="fighter-bar-fill health" style="width: ${healthWidth}%;"></div></div></div>
                    <div class="fighter-bar"><span>真气</span><div class="fighter-bar-track"><div class="fighter-bar-fill qi" style="width: ${qiWidth}%;"></div></div></div>
                </div>
            </div>
            <div class="fighter-silhouette">
                <div class="fighter-shadow"></div>
                <div class="fighter-aura"></div>
                <div class="fighter-slash"></div>
                <div class="fighter-body">
                    <div class="fighter-hair"></div>
                    <div class="fighter-head"></div>
                    <div class="fighter-torso"></div>
                    <div class="fighter-sleeve left"></div>
                    <div class="fighter-sleeve right"></div>
                    <div class="fighter-weapon"></div>
                    <div class="fighter-leg left"></div>
                    <div class="fighter-leg right"></div>
                </div>
            </div>
            <div class="fighter-status-line">
                ${actor.statuses.length > 0 ? actor.statuses.map((status) => `<span class="status-chip">${status.name} ${status.potency}/${status.duration}</span>`).join('') : '<span class="status-chip">气机平稳</span>'}
            </div>
        </article>
    `;
}

function renderEmptyStageSlot(): string {
    return `
        <div class="stage-fighter rival empty-slot">
            <div class="empty-silhouette"></div>
            <div class="fighter-status-line"><span class="status-chip">等待敌手现身</span></div>
        </div>
    `;
}

function renderStagePortrait(actor: StageActor, enemy: boolean): string {
    return `
        <div class="stage-portrait-card ${enemy ? 'enemy' : ''}">
            <img src="${portraitPath(actor.name)}" alt="${escapeHtml(actor.name)}暴走漫画立绘" />
            <div class="stage-portrait-copy">
                <strong>${escapeHtml(actor.name)}</strong>
                <span>${enemy ? '来势汹汹' : '气定神闲'} · ${translateCategory(actor.equipment.activeWaigongCategory)}</span>
            </div>
        </div>
    `;
}

function renderPortraitCard(actor: StageActor, enemy: boolean, label: string): string {
    return `
        <div class="portrait-card ${enemy ? 'enemy' : ''}">
            <div class="portrait-card-label">${label}</div>
            <img src="${portraitPath(actor.name)}" alt="${escapeHtml(actor.name)}暴走漫画立绘" />
            <div class="portrait-card-copy">
                <strong>${escapeHtml(actor.name)}</strong>
                <span>${escapeHtml(actor.equipment.waigong.name)} · ${translateCategory(actor.equipment.activeWaigongCategory)}</span>
            </div>
        </div>
    `;
}

function renderPortraitPlaceholder(): string {
    return `
        <div class="portrait-card placeholder">
            <div class="portrait-card-label">待机位置</div>
            <div class="portrait-placeholder-face"></div>
            <div class="portrait-card-copy">
                <strong>尚未现身</strong>
                <span>发起遭遇后，这里会显示敌方立绘</span>
            </div>
        </div>
    `;
}

function renderMeter(label: string, value: number, max: number, kind: 'health' | 'qi'): string {
    const width = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
    return `
        <div class="meter">
            <div>${label} ${value}/${max}</div>
            <div class="meter-track"><div class="meter-bar ${kind}" style="width: ${width}%;"></div></div>
        </div>
    `;
}

function renderTechniqueItem(technique: Technique, canUse: boolean): string {
    return `
        <div class="list-item">
            <h4>${escapeHtml(technique.name)}</h4>
            <p>${escapeHtml(describeTechnique(technique))}</p>
            <footer>
                <button class="subtle-button" data-action="battle-technique" data-technique-id="${technique.id}" ${!canUse ? 'disabled' : ''}>施展此招</button>
            </footer>
        </div>
    `;
}

function renderTrainingOption(option: ReturnType<Game['getHeroTrainingOverview']>['options'][number]): string {
    const target = option.targetMartialArtName ? `当前目标：${escapeHtml(option.targetMartialArtName)}` : '基础修炼';

    return `
        <div class="list-item">
            <h4>${escapeHtml(option.name)}</h4>
            <p>${escapeHtml(option.description)}</p>
            <p>${target}｜当前层数 ${option.currentLevel}｜下次消耗 ${option.nextCost} 修为</p>
            <p>${escapeHtml(option.effectPreview)}</p>
            <footer>
                <button class="${option.available ? 'action-button primary' : 'subtle-button'}" data-action="train-hero" data-training-id="${option.id}" ${!option.available ? 'disabled' : ''}>修炼此项</button>
            </footer>
        </div>
    `;
}

function renderMartialButton(martialArt: MartialArt, slot: 'qinggong' | 'neigong', currentId: string): string {
    return `<button class="${martialArt.id === currentId ? 'action-button primary' : 'subtle-button'}" data-action="equip-martial" data-slot="${slot}" data-martial-id="${martialArt.id}">${escapeHtml(martialArt.name)}</button>`;
}

function renderWaigongButton(martialArt: MartialArt, category: WaigongCategory, currentId: string): string {
    return `<button class="${martialArt.id === currentId ? 'action-button primary' : 'subtle-button'}" data-action="equip-waigong" data-category="${category}" data-martial-id="${martialArt.id}">${escapeHtml(martialArt.name)}</button>`;
}

function renderGearOption(item: GearItem, slot: keyof EquippedGearIds, currentId?: string | null): string {
    return `
        <div class="list-item">
            <h4>${escapeHtml(item.name)} <span class="rare">${rarityLabel(item.rarity)}</span></h4>
            <p>${escapeHtml(item.description)}</p>
            <footer>
                ${item.weaponCategory ? `<span class="tag">${translateCategory(item.weaponCategory)}</span>` : ''}
                <button class="${item.id === currentId ? 'action-button primary' : 'subtle-button'}" data-action="equip-gear" data-slot="${slot}" data-gear-id="${item.id}">装备</button>
            </footer>
        </div>
    `;
}

function renderRewards(encounter: EncounterState): string {
    return `
        <div class="section-card" style="margin-top: 18px;">
            <div class="section-title">
                <h3>${encounter.winner === encounter.hero.name ? '胜负已分' : '遭遇结束'}</h3>
                <div class="tag">${escapeHtml(encounter.winner ?? '未定')}</div>
            </div>
            <div class="reward-list">
                ${state.latestRewards.length > 0 ? state.latestRewards.map((entry) => `<span class="reward-pill">${escapeHtml(entry)}</span>`).join('') : '<span class="empty">本场没有新增战利品。</span>'}
            </div>
        </div>
    `;
}

function renderSummaryCard(label: string, value: string): string {
    return `
        <div class="summary-card">
            <div class="label">${escapeHtml(label)}</div>
            <div class="value">${escapeHtml(value)}</div>
        </div>
    `;
}

function renderLogPanel(): string {
    if (state.battleLogs.length === 0) {
        return '<div class="empty">暂无记事。</div>';
    }

    return state.battleLogs.map((entry) => `
        <div class="log-entry">
            <div class="meta">${logKindLabel(entry.kind)} · ${escapeHtml(entry.title)}</div>
            <div>${escapeHtml(entry.detail)}</div>
        </div>
    `).join('');
}

function getSceneHighlight(): { title: string; detail: string } {
    const latest = state.battleLogs[0];

    if (!latest) {
        return { title: '风过长道', detail: '战前静气，等待下一场遭遇。' };
    }

    return {
        title: latest.title,
        detail: latest.detail,
    };
}

function portraitPath(actorName: string): string {
    return getPortraitAsset(actorName).filePath;
}

function bindEvents(): void {
    app.querySelectorAll<HTMLElement>('[data-tab]').forEach((element) => {
        element.addEventListener('click', () => {
            state.activeTab = element.dataset.tab as AppTab;
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="switch-tab"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.activeTab = element.dataset.value as AppTab;
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="start-encounter"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.encounter = game.beginEncounter();
            state.activeTab = 'battle';
            state.techniqueMode = null;
            state.latestRewards = [];
            pushLog('system', '遭遇开始', `${state.encounter.scene.title}中出现了${state.encounter.rival.name}。`);
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="travel-scene"]').forEach((element) => {
        element.addEventListener('click', () => {
            try {
                const result = game.travel();
                state.latestRewards = [];
                state.techniqueMode = null;
                pushLog('system', result.summary, result.log[0] ?? '江湖暂无异动。');

                result.log.slice(1).forEach((entry) => {
                    pushLog(result.event.type === 'encounter' ? 'battle' : 'reward', result.event.title, entry);
                });

                if (result.encounter) {
                    state.encounter = result.encounter;
                    state.activeTab = 'battle';
                }

                render();
            } catch (error) {
                reportError(error);
                render();
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="switch-scene"]').forEach((element) => {
        element.addEventListener('click', () => {
            const sceneId = element.dataset.sceneId;

            if (!sceneId) {
                return;
            }

            try {
                const scene = game.travelToScene(sceneId);
                state.encounter = undefined;
                state.techniqueMode = null;
                state.latestRewards = [];
                pushLog('system', '切换场景', `你转向${scene.title}。${scene.description}`);
                render();
            } catch (error) {
                reportError(error);
                render();
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="battle"]').forEach((element) => {
        element.addEventListener('click', () => {
            const action = element.dataset.value as PlayerAction;
            performBattleAction(action);
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="prepare-martial"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.techniqueMode = state.techniqueMode === 'martial' ? null : 'martial';
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="cancel-technique"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.techniqueMode = null;
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="battle-technique"]').forEach((element) => {
        element.addEventListener('click', () => {
            const techniqueId = element.dataset.techniqueId;
            if (!techniqueId) {
                return;
            }

            performBattleAction('martial', techniqueId);
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="pick-martial-category"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.selectedMartialCategory = element.dataset.value as WaigongCategory;
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="equip-martial"]').forEach((element) => {
        element.addEventListener('click', () => {
            const slot = element.dataset.slot as 'qinggong' | 'neigong';
            const martialId = element.dataset.martialId;

            if (!martialId) {
                return;
            }

            try {
                game.equipHeroMartialArt(slot, martialId);
                pushLog('loadout', '武学已更换', `${slot === 'qinggong' ? '轻功' : '内功'}切换为${game.getHeroReferenceProfile().equipment[slot].name}。`);
                render();
            } catch (error) {
                reportError(error);
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="equip-waigong"]').forEach((element) => {
        element.addEventListener('click', () => {
            const category = element.dataset.category as WaigongCategory;
            const martialId = element.dataset.martialId;

            if (!martialId) {
                return;
            }

            try {
                game.equipHeroWaigong(category, martialId);
                pushLog('loadout', '外功已更换', `${translateCategory(category)}预设切换为${game.getHeroReferenceProfile().equipment.waigongLoadout[category].name}。`);
                render();
            } catch (error) {
                reportError(error);
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="equip-base-waigong"]').forEach((element) => {
        element.addEventListener('click', () => {
            const category = element.dataset.category as WaigongCategory;

            try {
                game.equipHeroWaigong(category, null);
                pushLog('loadout', '恢复基础外功', `${translateCategory(category)}预设恢复为基础外功。`);
                render();
            } catch (error) {
                reportError(error);
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="pick-gear-slot"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.selectedGearSlot = element.dataset.value as keyof EquippedGearIds;
            render();
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="equip-gear"]').forEach((element) => {
        element.addEventListener('click', () => {
            const slot = element.dataset.slot as keyof EquippedGearIds;
            const gearId = element.dataset.gearId ?? '';

            try {
                game.equipHeroGear(slot, gearId || null);
                const hero = game.getHeroReferenceProfile();
                pushLog('loadout', '装备已更换', `${gearLabel(slot)}切换为${getGearName(hero.gear[slot])}。`);
                render();
            } catch (error) {
                reportError(error);
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="train-hero"]').forEach((element) => {
        element.addEventListener('click', () => {
            const trainingId = element.dataset.trainingId as ReturnType<Game['getHeroTrainingOverview']>['options'][number]['id'];

            try {
                const result = game.trainHero(trainingId);
                pushLog('training', '修炼完成', `${result.summary} 剩余修为 ${result.remainingCultivation}。`);
                render();
            } catch (error) {
                reportError(error);
                render();
            }
        });
    });

    app.querySelectorAll<HTMLElement>('[data-action="clear-log"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.battleLogs = [];
            render();
        });
    });
}

function performBattleAction(action: PlayerAction, techniqueId?: string): void {
    if (!state.encounter || state.encounter.isFinished) {
        pushLog('system', '无法行动', '请先发起新的遭遇。');
        render();
        return;
    }

    try {
        const result = game.takeTurn(action, techniqueId);
        consumeTurnResult(result);
        state.encounter = result.state;
        state.techniqueMode = null;
        render();
    } catch (error) {
        reportError(error);
    }
}

function consumeTurnResult(result: TurnResult): void {
    state.latestRewards = [...result.rewards];
    pushLog('battle', `第 ${result.round} 回合`, summarizeAction(result.playerAction));

    if (result.enemyAction) {
        pushLog('battle', `第 ${result.round} 回合`, summarizeAction(result.enemyAction));
    }

    result.roundLog.forEach((entry) => {
        pushLog('battle', '回合结算', entry);
    });

    result.rewards.forEach((reward) => {
        pushLog('reward', '战利品', reward);
    });

    if (result.state.isFinished) {
        pushLog('system', '遭遇结束', result.state.winner === result.state.hero.name ? `${result.state.winner}获胜。` : `${result.state.winner}取胜，你暂退一步。`);
    }
}

function summarizeAction(action: CombatActionResult): string {
    return action.summary;
}

function pushLog(kind: ActionKind, title: string, detail: string): void {
    state.battleLogs = [{ kind, title, detail }, ...state.battleLogs].slice(0, 40);
}

function reportError(error: unknown): void {
    const detail = error instanceof Error ? error.message : '发生未知错误。';
    pushLog('system', '操作失败', detail);
    render();
}

function canAct(encounter?: EncounterState): boolean {
    return Boolean(encounter && !encounter.isFinished);
}

function describeTechnique(technique: Technique): string {
    return `${technique.name} · 威力 ${technique.power} · 耗气 ${technique.qiCost} · 命中 ${Math.round(technique.accuracy * 100)}%`;
}

function gearLabel(slot: GearSlot): string {
    return gearSlots.find((entry) => entry.slot === slot)?.label ?? slot;
}

function getGearName(item: GearItem | null): string {
    return item ? item.name : '空手';
}

function translateCategory(category: WaigongCategory): string {
    switch (category) {
        case 'fist':
            return '拳';
        case 'blade':
            return '刀';
        case 'sword':
            return '剑';
        case 'staff':
            return '棍';
        case 'hidden-weapon':
            return '暗器';
    }
}

function rarityLabel(rarity: GearRarity): string {
    switch (rarity) {
        case 'common':
            return '凡品';
        case 'uncommon':
            return '良品';
        case 'rare':
            return '珍奇';
    }
}

function logKindLabel(kind: ActionKind): string {
    switch (kind) {
        case 'battle':
            return '战斗';
        case 'reward':
            return '战利';
        case 'loadout':
            return '配置';
        case 'training':
            return '修炼';
        case 'system':
        default:
            return '系统';
    }
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

render();