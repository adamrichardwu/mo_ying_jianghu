import type { CharacterProfile, CharacterState, MartialArt } from '../types';

export class Character {
    private readonly profile: CharacterProfile;
    private state: CharacterState;

    constructor(profile: CharacterProfile) {
        this.profile = profile;
        this.state = {
            health: profile.maxHealth,
            qi: profile.maxQi,
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

    get martialArts(): MartialArt[] {
        return this.profile.martialArts;
    }

    get agility(): number {
        return this.profile.attributes.agility;
    }

    get strength(): number {
        return this.profile.attributes.strength;
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

    takeDamage(amount: number): void {
        this.state.health = Math.max(0, this.state.health - amount);
    }

    chooseAvailableMartialArt(): MartialArt {
        const usable = this.martialArts
            .filter((martialArt) => martialArt.qiCost <= this.qi)
            .sort((left, right) => right.power - left.power);

        if (usable.length > 0) {
            return usable[0];
        }

        return {
            name: '徒手招架',
            type: 'waigong',
            power: Math.max(1, Math.floor(this.strength / 2)),
            qiCost: 0,
            accuracy: 0.85,
        };
    }

    snapshot(): CharacterProfile & CharacterState {
        return {
            ...this.profile,
            ...this.state,
        };
    }
}