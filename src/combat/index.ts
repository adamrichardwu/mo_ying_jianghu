import { Character } from '../characters';
import type { CombatActionResult, CombatSummary, MartialArt } from '../types';

export class Combat {
    private readonly battleLog: string[] = [];

    public resolveAction(attacker: Character, defender: Character, martialArt?: MartialArt): CombatActionResult {
        const selectedMartialArt = martialArt ?? attacker.chooseAvailableMartialArt();
        const hitChance = Math.min(0.98, selectedMartialArt.accuracy + (attacker.agility - defender.agility) * 0.02);
        const hit = hitChance >= 0.55;

        attacker.spendQi(selectedMartialArt.qiCost);

        const damage = hit
            ? Math.max(1, selectedMartialArt.power + attacker.strength - Math.floor(defender.agility / 2))
            : 0;

        if (damage > 0) {
            defender.takeDamage(damage);
        }

        const summary = hit
            ? `${attacker.name}施展${selectedMartialArt.name}，对${defender.name}造成${damage}点伤害。`
            : `${attacker.name}施展${selectedMartialArt.name}，但被${defender.name}避开。`;

        this.battleLog.push(summary);

        return {
            attacker: attacker.name,
            defender: defender.name,
            martialArt: selectedMartialArt.name,
            hit,
            damage,
            defenderRemainingHealth: defender.health,
            attackerRemainingQi: attacker.qi,
            summary,
        };
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