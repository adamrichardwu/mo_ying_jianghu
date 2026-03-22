import type {
    CharacterProfile,
    CharacterState,
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

    get equippedQinggong(): MartialArt {
        return this.profile.equipment.qinggong;
    }

    get equippedNeigong(): MartialArt {
        return this.profile.equipment.neigong;
    }

    get equippedWaigong(): MartialArt {
        return this.profile.equipment.waigong;
    }

    get statuses(): StatusEffect[] {
        return this.state.statuses.map((status) => ({ ...status }));
    }

    get agility(): number {
        return this.profile.attributes.agility;
    }

    get strength(): number {
        return this.profile.attributes.strength;
    }

    get constitution(): number {
        return this.profile.attributes.constitution;
    }

    get insight(): number {
        return this.profile.attributes.insight;
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
        return Object.values(this.profile.equipment).find((martialArt) => martialArt.id === martialArtId);
    }

    getTechniqueById(techniqueId: string): Technique | undefined {
        return this.equippedWaigong.techniques?.find((technique) => technique.id === techniqueId);
    }

    getAvailableTechniques(): Technique[] {
        return (this.equippedWaigong.techniques ?? []).filter((technique) => technique.qiCost <= this.qi);
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
        return this.agility + (this.equippedQinggong.passiveBonuses?.speed ?? 0);
    }

    getAccuracyBonus(category: WaigongCategory): number {
        return (this.equippedQinggong.passiveBonuses?.accuracy ?? 0)
            + this.getSynergyBonus(category).accuracy;
    }

    getEvasionBonus(): number {
        return this.equippedQinggong.passiveBonuses?.evasion ?? 0;
    }

    getDamageBonus(category: WaigongCategory): number {
        return (this.equippedNeigong.passiveBonuses?.damage ?? 0)
            + this.getSynergyBonus(category).damage;
    }

    getQiRecoveryBonus(category: WaigongCategory): number {
        return (this.equippedNeigong.passiveBonuses?.qiRecovery ?? 0)
            + this.getSynergyBonus(category).qiRecovery;
    }

    getGuardBonus(category: WaigongCategory): number {
        return (this.equippedNeigong.passiveBonuses?.guard ?? 0)
            + this.getSynergyBonus(category).guard;
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

    snapshot(): CharacterProfile & CharacterState {
        return {
            ...this.profile,
            ...this.state,
        };
    }
}