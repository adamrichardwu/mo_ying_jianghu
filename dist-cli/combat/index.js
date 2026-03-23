"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Combat = void 0;
const STATUS_NAMES = {
    bleed: '流血',
    exposed: '破绽',
    focus: '凝神',
};
class Combat {
    constructor(random = Math.random) {
        this.random = random;
        this.battleLog = [];
    }
    resolveRoundEffects(actor) {
        const logs = actor.resolveRoundEffects();
        this.battleLog.push(...logs);
        return logs;
    }
    resolveTechnique(attacker, defender, technique) {
        const selectedTechnique = technique ?? attacker.chooseAvailableTechnique();
        const category = attacker.equippedWaigong.category;
        const hadFocus = attacker.hasStatus('focus');
        const exposedBonus = defender.getStatusPotency('exposed');
        const hitChance = clamp(selectedTechnique.accuracy
            + (attacker.getSpeed() - defender.getSpeed()) * 0.015
            + attacker.getAccuracyBonus(category)
            + this.getFocusAccuracyBonus(attacker)
            - defender.getEvasionBonus(), 0.35, 0.98);
        const hit = hitChance >= 0.55;
        attacker.spendQi(selectedTechnique.qiCost);
        const rawDamage = hit
            ? Math.max(1, selectedTechnique.power
                + attacker.strength
                + attacker.getDamageBonus(category)
                + this.getFocusDamageBonus(attacker)
                + exposedBonus
                - Math.floor(defender.constitution / 3))
            : 0;
        const blockedDamage = hit ? defender.consumeGuard(rawDamage) : 0;
        const damage = Math.max(0, rawDamage - blockedDamage);
        const appliedStatuses = hit ? this.applyMartialArtEffects(attacker, defender, selectedTechnique.effects ?? []) : [];
        if (damage > 0) {
            defender.takeDamage(damage);
            if (exposedBonus > 0) {
                defender.consumeStatus('exposed');
            }
        }
        if (hadFocus) {
            attacker.consumeStatus('focus');
        }
        const suffix = appliedStatuses.length > 0 ? ` ${appliedStatuses.join(' ')}` : '';
        const summary = hit
            ? `${attacker.name}以${attacker.equippedWaigong.name}使出${selectedTechnique.name}，对${defender.name}造成${damage}点伤害。${suffix}`.trim()
            : `${attacker.name}使出${selectedTechnique.name}，但被${defender.name}避开。`;
        this.battleLog.push(summary);
        return {
            actionType: 'martial',
            attacker: attacker.name,
            defender: defender.name,
            martialArt: attacker.equippedWaigong.name,
            technique: selectedTechnique.name,
            hit,
            damage,
            defenderRemainingHealth: defender.health,
            attackerRemainingQi: attacker.qi,
            defenderGuard: defender.guard,
            appliedStatuses,
            summary,
        };
    }
    resolveBasicAttack(attacker, defender, technique) {
        const selectedTechnique = technique ?? this.chooseRandomBasicTechnique(attacker);
        const category = attacker.equippedWaigong.category;
        const hadFocus = attacker.hasStatus('focus');
        const exposedBonus = defender.getStatusPotency('exposed');
        const hitChance = clamp(selectedTechnique.accuracy
            + (attacker.getSpeed() - defender.getSpeed()) * 0.015
            + attacker.getAccuracyBonus(category)
            + this.getFocusAccuracyBonus(attacker)
            - defender.getEvasionBonus(), 0.35, 0.95);
        const hit = hitChance >= 0.55;
        const rawDamage = hit
            ? Math.max(1, selectedTechnique.power
                + attacker.strength
                + attacker.getDamageBonus(category)
                + this.getFocusDamageBonus(attacker)
                + exposedBonus
                - Math.floor(defender.constitution / 3))
            : 0;
        const blockedDamage = hit ? defender.consumeGuard(rawDamage) : 0;
        const damage = Math.max(0, rawDamage - blockedDamage);
        if (damage > 0) {
            defender.takeDamage(damage);
            if (exposedBonus > 0) {
                defender.consumeStatus('exposed');
            }
        }
        if (hadFocus) {
            attacker.consumeStatus('focus');
        }
        const summary = hit
            ? `${attacker.name}以${attacker.equippedWaigong.name}使出${selectedTechnique.name}，对${defender.name}造成${damage}点伤害。`
            : `${attacker.name}使出${selectedTechnique.name}，但被${defender.name}避开。`;
        this.battleLog.push(summary);
        return {
            actionType: 'attack',
            attacker: attacker.name,
            defender: defender.name,
            martialArt: attacker.equippedWaigong.name,
            technique: selectedTechnique.name,
            hit,
            damage,
            defenderRemainingHealth: defender.health,
            attackerRemainingQi: attacker.qi,
            defenderGuard: defender.guard,
            summary,
        };
    }
    resolveDefend(actor) {
        const category = actor.equippedWaigong.category;
        const guardGained = Math.max(2, Math.floor(actor.constitution / 2) + Math.floor(actor.insight / 2) + actor.getGuardBonus(category));
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
    resolveMeditate(actor) {
        const category = actor.equippedWaigong.category;
        const qiRecovered = Math.max(2, Math.floor(actor.insight / 2) + Math.floor(actor.constitution / 3) + actor.getQiRecoveryBonus(category));
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
    applyMartialArtEffects(attacker, defender, effects) {
        const appliedStatuses = [];
        effects.forEach((effect) => {
            if ((effect.chance ?? 1) < 1) {
                return;
            }
            const target = effect.target === 'self' ? attacker : defender;
            const status = {
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
    getFocusDamageBonus(attacker) {
        return attacker.getStatusPotency('focus');
    }
    getFocusAccuracyBonus(attacker) {
        return attacker.hasStatus('focus') ? 0.08 : 0;
    }
    chooseRandomBasicTechnique(attacker) {
        const techniques = attacker.getBasicTechniques();
        if (techniques.length === 0) {
            return attacker.chooseAvailableBasicTechnique();
        }
        const index = Math.min(techniques.length - 1, Math.floor(this.random() * techniques.length));
        return techniques[index];
    }
    runDuel(first, second, maxRounds = 6) {
        this.battleLog.length = 0;
        let rounds = 0;
        while (!first.isDefeated() && !second.isDefeated() && rounds < maxRounds) {
            rounds += 1;
            const firstActor = first.getSpeed() >= second.getSpeed() ? first : second;
            const secondActor = firstActor === first ? second : first;
            this.resolveTechnique(firstActor, secondActor);
            if (!secondActor.isDefeated()) {
                this.resolveTechnique(secondActor, firstActor);
            }
            if (!first.isDefeated() && !second.isDefeated()) {
                this.resolveRoundEffects(first);
                this.resolveRoundEffects(second);
            }
        }
        const winner = first.isDefeated() ? second : first;
        const loser = winner === first ? second : first;
        return {
            winner: winner.name,
            loser: loser.name,
            rounds,
            log: [...this.battleLog],
        };
    }
}
exports.Combat = Combat;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
