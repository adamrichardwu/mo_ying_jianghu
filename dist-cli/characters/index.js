"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Character = void 0;
class Character {
    constructor(profile) {
        this.profile = profile;
        this.state = {
            health: profile.maxHealth,
            qi: profile.maxQi,
            guard: 0,
            statuses: [],
        };
    }
    get name() {
        return this.profile.name;
    }
    get health() {
        return this.state.health;
    }
    get qi() {
        return this.state.qi;
    }
    get maxHealth() {
        return this.profile.maxHealth;
    }
    get maxQi() {
        return this.profile.maxQi;
    }
    get guard() {
        return this.state.guard;
    }
    get equipment() {
        return this.profile.equipment;
    }
    get knownMartialArts() {
        return this.profile.knownMartialArts;
    }
    get gear() {
        return this.profile.gear;
    }
    get knownGear() {
        return this.profile.knownGear;
    }
    get equippedQinggong() {
        return this.profile.equipment.qinggong;
    }
    get equippedNeigong() {
        return this.profile.equipment.neigong;
    }
    get equippedWaigong() {
        return this.profile.equipment.waigong;
    }
    get waigongLoadout() {
        return this.profile.equipment.waigongLoadout;
    }
    get activeWaigongCategory() {
        return this.profile.equipment.activeWaigongCategory;
    }
    get statuses() {
        return this.state.statuses.map((status) => ({ ...status }));
    }
    get agility() {
        return this.profile.attributes.agility + this.getGearBonus('agility');
    }
    get strength() {
        return this.profile.attributes.strength + this.getGearBonus('strength');
    }
    get constitution() {
        return this.profile.attributes.constitution + this.getGearBonus('constitution');
    }
    get insight() {
        return this.profile.attributes.insight + this.getGearBonus('insight');
    }
    isDefeated() {
        return this.state.health <= 0;
    }
    spendQi(amount) {
        this.state.qi = Math.max(0, this.state.qi - amount);
    }
    recoverQi(amount) {
        this.state.qi = Math.min(this.maxQi, this.state.qi + amount);
    }
    setGuard(amount) {
        this.state.guard = Math.max(0, amount);
    }
    addGuard(amount) {
        this.state.guard = Math.max(0, this.state.guard + amount);
    }
    consumeGuard(amount) {
        const blocked = Math.min(this.state.guard, amount);
        this.state.guard -= blocked;
        return blocked;
    }
    takeDamage(amount) {
        this.state.health = Math.max(0, this.state.health - amount);
    }
    addStatus(status) {
        const existing = this.state.statuses.find((entry) => entry.type === status.type);
        if (existing) {
            existing.duration = Math.max(existing.duration, status.duration);
            existing.potency = Math.max(existing.potency, status.potency);
            return;
        }
        this.state.statuses.push({ ...status });
    }
    hasStatus(type) {
        return this.state.statuses.some((status) => status.type === type);
    }
    getStatusPotency(type) {
        return this.state.statuses
            .filter((status) => status.type === type)
            .reduce((highest, status) => Math.max(highest, status.potency), 0);
    }
    consumeStatus(type) {
        this.state.statuses = this.state.statuses.filter((status) => status.type !== type);
    }
    resolveRoundEffects() {
        const logs = [];
        const nextStatuses = [];
        this.state.statuses.forEach((status) => {
            if (status.type === 'bleed') {
                this.takeDamage(status.potency);
                logs.push(`${this.name}因流血损失${status.potency}点气血。`);
            }
            const remainingDuration = status.duration - 1;
            if (remainingDuration > 0) {
                nextStatuses.push({
                    ...status,
                    duration: remainingDuration,
                });
            }
        });
        this.state.statuses = nextStatuses;
        return logs;
    }
    getMartialArtById(martialArtId) {
        return [
            this.profile.equipment.qinggong,
            this.profile.equipment.neigong,
            ...Object.values(this.profile.equipment.waigongLoadout),
        ].find((martialArt) => martialArt.id === martialArtId);
    }
    getTechniqueById(techniqueId) {
        return this.equippedWaigong.techniques?.find((technique) => technique.id === techniqueId);
    }
    getBasicTechniqueById(techniqueId) {
        return this.equippedWaigong.basicTechniques?.find((technique) => technique.id === techniqueId);
    }
    getBasicTechniques() {
        return this.equippedWaigong.basicTechniques ?? [];
    }
    getAvailableTechniques() {
        return (this.equippedWaigong.techniques ?? []).filter((technique) => technique.qiCost <= this.qi);
    }
    chooseAvailableBasicTechnique() {
        const basicTechniques = this.getBasicTechniques();
        if (basicTechniques.length > 0) {
            return [...basicTechniques].sort((left, right) => right.power - left.power)[0];
        }
        return {
            id: 'basic-strike',
            name: '基础出手',
            description: '当外功未提供基础招式时使用的默认攻击。',
            power: Math.max(1, Math.floor(this.strength / 2)),
            qiCost: 0,
            accuracy: 0.85,
        };
    }
    chooseAvailableTechnique() {
        const usable = this.getAvailableTechniques().sort((left, right) => right.power - left.power);
        if (usable.length > 0) {
            return usable[0];
        }
        return {
            id: 'basic-strike',
            name: '基础出手',
            description: '当真气不足时使用的基础攻击。',
            power: Math.max(1, Math.floor(this.strength / 2)),
            qiCost: 0,
            accuracy: 0.85,
        };
    }
    getSpeed() {
        return this.agility + (this.equippedQinggong.passiveBonuses?.speed ?? 0) + this.getGearBonus('speed');
    }
    getAccuracyBonus(category) {
        return (this.equippedQinggong.passiveBonuses?.accuracy ?? 0)
            + this.getSynergyBonus(category).accuracy
            + this.getGearBonus('accuracy');
    }
    getEvasionBonus() {
        return (this.equippedQinggong.passiveBonuses?.evasion ?? 0) + this.getGearBonus('evasion');
    }
    getDamageBonus(category) {
        return (this.equippedNeigong.passiveBonuses?.damage ?? 0)
            + this.getSynergyBonus(category).damage
            + this.getGearBonus('damage');
    }
    getQiRecoveryBonus(category) {
        return (this.equippedNeigong.passiveBonuses?.qiRecovery ?? 0)
            + this.getSynergyBonus(category).qiRecovery
            + this.getGearBonus('qiRecovery');
    }
    getGuardBonus(category) {
        return (this.equippedNeigong.passiveBonuses?.guard ?? 0)
            + this.getSynergyBonus(category).guard
            + this.getGearBonus('guard');
    }
    getGearItem(slot) {
        return this.profile.gear[slot];
    }
    getSynergyBonus(category) {
        return this.equippedNeigong.synergy?.find((entry) => entry.waigongCategories.includes(category)) ?? {
            waigongCategories: [category],
            accuracy: 0,
            damage: 0,
            qiRecovery: 0,
            guard: 0,
        };
    }
    getGearBonus(key) {
        return Object.values(this.profile.gear).reduce((total, item) => total + (item?.bonuses[key] ?? 0), 0);
    }
    snapshot() {
        return {
            ...this.profile,
            ...this.state,
        };
    }
}
exports.Character = Character;
