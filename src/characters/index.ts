import type {
    CharacterProfile,
    CharacterState,
    GearBonuses,
    GearItem,
    MartialArt,
    StatusEffect,
    StatusEffectType,
    SynergyBonus,
    Technique,
    WaigongCategory,
} from '../types';

export class Character {
    private readonly profile: CharacterProfile;
    private state: CharacterState;

    constructor(profile: CharacterProfile) {
        this.profile = profile;
        this.state = {
            health: profile.maxHealth,
            qi: profile.maxQi,
            guard: 0,
            statuses: [],
        };
    }

    get name(): string {
        return this.profile.name;
    }

    get health(): number {
        return this.state.health;
    }

    get qi(): number {
        return this.state.qi;
    }

    get maxHealth(): number {
        return this.profile.maxHealth;
    }

    get maxQi(): number {
        return this.profile.maxQi;
    }

    get guard(): number {
        return this.state.guard;
    }

    get equipment(): CharacterProfile['equipment'] {
        return this.profile.equipment;
    }

    get knownMartialArts(): CharacterProfile['knownMartialArts'] {
        return this.profile.knownMartialArts;
    }

    get gear(): CharacterProfile['gear'] {
        return this.profile.gear;
    }

    get knownGear(): CharacterProfile['knownGear'] {
        return this.profile.knownGear;
    }

    get equippedQinggong(): MartialArt {
        return this.profile.equipment.qinggong;
    }

    get equippedNeigong(): MartialArt {
        return this.profile.equipment.neigong;
    }

    get equippedWaigong(): MartialArt {
        return this.profile.equipment.waigong;
    }

    get waigongLoadout(): CharacterProfile['equipment']['waigongLoadout'] {
        return this.profile.equipment.waigongLoadout;
    }

    get activeWaigongCategory(): WaigongCategory {
        return this.profile.equipment.activeWaigongCategory;
    }

    get statuses(): StatusEffect[] {
        return this.state.statuses.map((status) => ({ ...status }));
    }

    get agility(): number {
        return this.profile.attributes.agility + this.getGearBonus('agility');
    }

    get strength(): number {
        return this.profile.attributes.strength + this.getGearBonus('strength');
    }

    get constitution(): number {
        return this.profile.attributes.constitution + this.getGearBonus('constitution');
    }

    get insight(): number {
        return this.profile.attributes.insight + this.getGearBonus('insight');
    }

    isDefeated(): boolean {
        return this.state.health <= 0;
    }

    spendQi(amount: number): void {
        this.state.qi = Math.max(0, this.state.qi - amount);
    }

    recoverQi(amount: number): void {
        this.state.qi = Math.min(this.maxQi, this.state.qi + amount);
    }

    setGuard(amount: number): void {
        this.state.guard = Math.max(0, amount);
    }

    addGuard(amount: number): void {
        this.state.guard = Math.max(0, this.state.guard + amount);
    }

    consumeGuard(amount: number): number {
        const blocked = Math.min(this.state.guard, amount);
        this.state.guard -= blocked;
        return blocked;
    }

    takeDamage(amount: number): void {
        this.state.health = Math.max(0, this.state.health - amount);
    }

    addStatus(status: StatusEffect): void {
        const existing = this.state.statuses.find((entry) => entry.type === status.type);

        if (existing) {
            existing.duration = Math.max(existing.duration, status.duration);
            existing.potency = Math.max(existing.potency, status.potency);
            return;
        }

        this.state.statuses.push({ ...status });
    }

    hasStatus(type: StatusEffectType): boolean {
        return this.state.statuses.some((status) => status.type === type);
    }

    getStatusPotency(type: StatusEffectType): number {
        return this.state.statuses
            .filter((status) => status.type === type)
            .reduce((highest, status) => Math.max(highest, status.potency), 0);
    }

    consumeStatus(type: StatusEffectType): void {
        this.state.statuses = this.state.statuses.filter((status) => status.type !== type);
    }

    resolveRoundEffects(): string[] {
        const logs: string[] = [];
        const nextStatuses: StatusEffect[] = [];

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

    getMartialArtById(martialArtId: string): MartialArt | undefined {
        return [
            this.profile.equipment.qinggong,
            this.profile.equipment.neigong,
            ...Object.values(this.profile.equipment.waigongLoadout),
        ].find((martialArt) => martialArt.id === martialArtId);
    }

    getTechniqueById(techniqueId: string): Technique | undefined {
        return this.equippedWaigong.techniques?.find((technique) => technique.id === techniqueId);
    }

    getBasicTechniqueById(techniqueId: string): Technique | undefined {
        return this.equippedWaigong.basicTechniques?.find((technique) => technique.id === techniqueId);
    }

    getBasicTechniques(): Technique[] {
        return this.equippedWaigong.basicTechniques ?? [];
    }

    getAvailableTechniques(): Technique[] {
        return (this.equippedWaigong.techniques ?? []).filter((technique) => technique.qiCost <= this.qi);
    }

    chooseAvailableBasicTechnique(): Technique {
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

    chooseAvailableTechnique(): Technique {
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

    getSpeed(): number {
        return this.agility + (this.equippedQinggong.passiveBonuses?.speed ?? 0) + this.getGearBonus('speed');
    }

    getAccuracyBonus(category: WaigongCategory): number {
        return (this.equippedQinggong.passiveBonuses?.accuracy ?? 0)
            + this.getSynergyBonus(category).accuracy
            + this.getGearBonus('accuracy');
    }

    getEvasionBonus(): number {
        return (this.equippedQinggong.passiveBonuses?.evasion ?? 0) + this.getGearBonus('evasion');
    }

    getDamageBonus(category: WaigongCategory): number {
        return (this.equippedNeigong.passiveBonuses?.damage ?? 0)
            + this.getSynergyBonus(category).damage
            + this.getGearBonus('damage');
    }

    getQiRecoveryBonus(category: WaigongCategory): number {
        return (this.equippedNeigong.passiveBonuses?.qiRecovery ?? 0)
            + this.getSynergyBonus(category).qiRecovery
            + this.getGearBonus('qiRecovery');
    }

    getGuardBonus(category: WaigongCategory): number {
        return (this.equippedNeigong.passiveBonuses?.guard ?? 0)
            + this.getSynergyBonus(category).guard
            + this.getGearBonus('guard');
    }

    getGearItem(slot: GearItem['slot']): GearItem | null {
        return this.profile.gear[slot];
    }

    private getSynergyBonus(category: WaigongCategory): SynergyBonus {
        return this.equippedNeigong.synergy?.find((entry) => entry.waigongCategories.includes(category)) ?? {
            waigongCategories: [category],
            accuracy: 0,
            damage: 0,
            qiRecovery: 0,
            guard: 0,
        };
    }

    private getGearBonus(key: keyof GearBonuses): number {
        return Object.values(this.profile.gear).reduce((total, item) => total + (item?.bonuses[key] ?? 0), 0);
    }

    snapshot(): CharacterProfile & CharacterState {
        return {
            ...this.profile,
            ...this.state,
        };
    }
}