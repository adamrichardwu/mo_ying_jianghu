import { Character } from '../characters';
import type { CombatActionResult, CombatSummary, MartialArt, MartialArtEffect, StatusEffect } from '../types';

const STATUS_NAMES: Record<StatusEffect['type'], string> = {
    bleed: '流血',
    exposed: '破绽',
    focus: '凝神',
};

export class Combat {
    private readonly battleLog: string[] = [];

    public resolveRoundEffects(actor: Character): string[] {
        const logs = actor.resolveRoundEffects();
        this.battleLog.push(...logs);
        return logs;
    }

    public resolveAction(attacker: Character, defender: Character, martialArt?: MartialArt): CombatActionResult {
        const selectedMartialArt = martialArt ?? attacker.chooseAvailableMartialArt();

        if (selectedMartialArt.type === 'neigong') {
            return this.resolveInternalArt(attacker, selectedMartialArt);
        }

        const hitChance = Math.min(
            0.98,
            selectedMartialArt.accuracy
                + (attacker.agility - defender.agility) * 0.02
                + this.getFocusAccuracyBonus(attacker),
        );
        const hit = hitChance >= 0.55;

        attacker.spendQi(selectedMartialArt.qiCost);

        const rawDamage = hit
            ? Math.max(
                1,
                selectedMartialArt.power
                    + attacker.strength
                    + this.getFocusDamageBonus(attacker)
                    + defender.getStatusPotency('exposed')
                    - Math.floor(defender.agility / 2),
            )
            : 0;

        const blockedDamage = hit ? defender.consumeGuard(rawDamage) : 0;
        const damage = Math.max(0, rawDamage - blockedDamage);
        const appliedStatuses = hit ? this.applyMartialArtEffects(attacker, defender, selectedMartialArt.effects ?? []) : [];

        if (damage > 0) {
            defender.takeDamage(damage);
            defender.consumeStatus('exposed');
        }

        attacker.consumeStatus('focus');

        const suffix = appliedStatuses.length > 0 ? ` ${appliedStatuses.join(' ')}` : '';
        const summary = hit
            ? `${attacker.name}施展${selectedMartialArt.name}，对${defender.name}造成${damage}点伤害。${suffix}`.trim()
            : `${attacker.name}施展${selectedMartialArt.name}，但被${defender.name}避开。`;

        this.battleLog.push(summary);

        return {
            actionType: 'martial',
            attacker: attacker.name,
            defender: defender.name,
            martialArt: selectedMartialArt.name,
            hit,
            damage,
            defenderRemainingHealth: defender.health,
            attackerRemainingQi: attacker.qi,
            defenderGuard: defender.guard,
            appliedStatuses,
            summary,
        };
    }

    public resolveBasicAttack(attacker: Character, defender: Character): CombatActionResult {
        const hitChance = Math.min(0.95, 0.8 + (attacker.agility - defender.agility) * 0.02 + this.getFocusAccuracyBonus(attacker));
        const hit = hitChance >= 0.55;
        const rawDamage = hit
            ? Math.max(
                1,
                attacker.strength
                    + Math.floor(attacker.agility / 2)
                    + this.getFocusDamageBonus(attacker)
                    + defender.getStatusPotency('exposed')
                    - Math.floor(defender.constitution / 3),
            )
            : 0;
        const blockedDamage = hit ? defender.consumeGuard(rawDamage) : 0;
        const damage = Math.max(0, rawDamage - blockedDamage);

        if (damage > 0) {
            defender.takeDamage(damage);
            defender.consumeStatus('exposed');
        }

        attacker.consumeStatus('focus');

        const summary = hit
            ? `${attacker.name}发动普通攻击，对${defender.name}造成${damage}点伤害。`
            : `${attacker.name}发动普通攻击，但被${defender.name}避开。`;

        this.battleLog.push(summary);

        return {
            actionType: 'attack',
            attacker: attacker.name,
            defender: defender.name,
            martialArt: '普通攻击',
            hit,
            damage,
            defenderRemainingHealth: defender.health,
            attackerRemainingQi: attacker.qi,
            defenderGuard: defender.guard,
            summary,
        };
    }

    public resolveDefend(actor: Character): CombatActionResult {
        const guardGained = Math.max(2, Math.floor(actor.constitution / 2) + Math.floor(actor.insight / 2));
        actor.addGuard(guardGained);

        const summary = `${actor.name}稳住架势，获得${guardGained}点防御。`;
        this.battleLog.push(summary);

        return {
            actionType: 'defend',
            attacker: actor.name,
            defender: actor.name,
            martialArt: '防御',
            hit: true,
            damage: 0,
            defenderRemainingHealth: actor.health,
            attackerRemainingQi: actor.qi,
            defenderGuard: actor.guard,
            guardGained,
            summary,
        };
    }

    public resolveMeditate(actor: Character): CombatActionResult {
        const qiRecovered = Math.max(2, Math.floor(actor.insight / 2) + Math.floor(actor.constitution / 3));
        actor.recoverQi(qiRecovered);

        const summary = `${actor.name}调息回气，恢复${qiRecovered}点真气。`;
        this.battleLog.push(summary);

        return {
            actionType: 'meditate',
            attacker: actor.name,
            defender: actor.name,
            martialArt: '调息',
            hit: true,
            damage: 0,
            defenderRemainingHealth: actor.health,
            attackerRemainingQi: actor.qi,
            defenderGuard: actor.guard,
            qiRecovered,
            summary,
        };
    }

    private resolveInternalArt(actor: Character, martialArt: MartialArt): CombatActionResult {
        actor.spendQi(martialArt.qiCost);
        const qiRecovered = Math.max(3, Math.floor(martialArt.power / 2) + Math.floor(actor.insight / 2));
        const guardGained = Math.max(2, Math.floor(martialArt.power / 3) + Math.floor(actor.constitution / 3));

        actor.recoverQi(qiRecovered);
        actor.addGuard(guardGained);

        const appliedStatuses = this.applyMartialArtEffects(actor, actor, martialArt.effects ?? []);
        const suffix = appliedStatuses.length > 0 ? ` ${appliedStatuses.join(' ')}` : '';
        const summary = `${actor.name}运转${martialArt.name}，恢复${qiRecovered}点真气并获得${guardGained}点防御。${suffix}`.trim();

        this.battleLog.push(summary);

        return {
            actionType: 'martial',
            attacker: actor.name,
            defender: actor.name,
            martialArt: martialArt.name,
            hit: true,
            damage: 0,
            defenderRemainingHealth: actor.health,
            attackerRemainingQi: actor.qi,
            defenderGuard: actor.guard,
            qiRecovered,
            guardGained,
            appliedStatuses,
            summary,
        };
    }

    private applyMartialArtEffects(attacker: Character, defender: Character, effects: MartialArtEffect[]): string[] {
        const appliedStatuses: string[] = [];

        effects.forEach((effect) => {
            if ((effect.chance ?? 1) < 1) {
                return;
            }

            const target = effect.target === 'self' ? attacker : defender;
            const status: StatusEffect = {
                type: effect.type,
                name: STATUS_NAMES[effect.type],
                duration: effect.duration,
                potency: effect.potency,
            };

            target.addStatus(status);
            appliedStatuses.push(`${target.name}获得${status.name}(${status.potency})`);
        });

        return appliedStatuses;
    }

    private getFocusDamageBonus(attacker: Character): number {
        return attacker.getStatusPotency('focus');
    }

    private getFocusAccuracyBonus(attacker: Character): number {
        return attacker.hasStatus('focus') ? 0.08 : 0;
    }

    public runDuel(first: Character, second: Character, maxRounds = 6): CombatSummary {
        this.battleLog.length = 0;

        let attacker = first.agility >= second.agility ? first : second;
        let defender = attacker === first ? second : first;
        let rounds = 0;

        while (!attacker.isDefeated() && !defender.isDefeated() && rounds < maxRounds) {
            rounds += 1;
            this.resolveAction(attacker, defender);
            if (defender.isDefeated()) {
                break;
            }

            this.resolveAction(defender, attacker);
            if (attacker.isDefeated()) {
                break;
            }

            this.resolveRoundEffects(attacker);
            this.resolveRoundEffects(defender);
        }

        const winner = attacker.isDefeated() ? defender : attacker;
        const loser = winner === attacker ? defender : attacker;

        return {
            winner: winner.name,
            loser: loser.name,
            rounds,
            log: [...this.battleLog],
        };
    }
}