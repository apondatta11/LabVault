// Fine Policy Note: Supports 2-day academic grace period for late lab returns.
import type { ConditionGrade } from "@/lib/types";

export interface FineCalculationInput {
  daysLate: number;
  condition: ConditionGrade;
  replacementCost: number;
  quantity: number;
}

export interface FineCalculationResult {
  amount: number;
  strategyName: string;
  reason: string;
}

/**
 * Strategy interface for computing overdue and damage fines on returned lab gear.
 */
export interface FineCalculationStrategy {
  readonly name: string;
  calculate(input: FineCalculationInput): FineCalculationResult;
}

const roundCurrency = (value: number): number =>
  Math.round(value * 100) / 100;

/**
 * Standard flat-rate overdue fee (৳50 per late day per unit, no damage surcharge).
 */
export class StandardLateFeeStrategy implements FineCalculationStrategy {
  readonly name = "StandardLateFeeStrategy";
  private readonly dailyRate = 50;

  calculate(input: FineCalculationInput): FineCalculationResult {
    const lateDays = Math.max(0, Math.floor(input.daysLate));
    const qty = Math.max(1, input.quantity);
    const amount = roundCurrency(lateDays * this.dailyRate * qty);
    return {
      amount,
      strategyName: this.name,
      reason:
        lateDays > 0
          ? `${lateDays} day(s) late at ৳${this.dailyRate}/day × ${qty}`
          : "Returned on time with no late fee",
    };
  }
}

/**
 * Combines overdue late fees with condition-based repair/replacement penalties.
 */
export class DamagedItemFineStrategy implements FineCalculationStrategy {
  readonly name = "DamagedItemFineStrategy";
  private readonly dailyRate = 50;

  private getDamageMultiplier(condition: ConditionGrade): number {
    switch (condition) {
      case "Good":
        return 0;
      case "MinorDamage":
        return 0.25;
      case "Broken":
        return 0.75;
      case "Lost":
        return 1.0;
    }
  }

  calculate(input: FineCalculationInput): FineCalculationResult {
    const lateDays = Math.max(0, Math.floor(input.daysLate));
    const qty = Math.max(1, input.quantity);
    const lateFee = lateDays * this.dailyRate * qty;
    const multiplier = this.getDamageMultiplier(input.condition);
    const damageFee = input.replacementCost * multiplier * qty;
    const total = roundCurrency(lateFee + damageFee);

    const parts: string[] = [];
    if (lateFee > 0) {
      parts.push(`${lateDays} day(s) late (৳${lateFee})`);
    }
    if (damageFee > 0) {
      parts.push(
        `${input.condition} fee (${Math.round(multiplier * 100)}% of ৳${input.replacementCost})`
      );
    }

    return {
      amount: total,
      strategyName: this.name,
      reason:
        parts.length > 0
          ? parts.join(" + ")
          : "Returned in Good condition on time",
    };
  }
}

/**
 * Academic grace policy: waives the first 2 late days for Good condition returns,
 * then charges ৳30/day thereafter. Damage penalties still apply if damaged.
 */
export class AcademicGracePeriodStrategy implements FineCalculationStrategy {
  readonly name = "AcademicGracePeriodStrategy";
  private readonly graceDays = 2;
  private readonly reducedDailyRate = 30;

  calculate(input: FineCalculationInput): FineCalculationResult {
    const lateDays = Math.max(0, Math.floor(input.daysLate));
    const qty = Math.max(1, input.quantity);
    const chargeableDays = Math.max(0, lateDays - this.graceDays);
    const lateFee = chargeableDays * this.reducedDailyRate * qty;

    if (input.condition === "Good") {
      return {
        amount: roundCurrency(lateFee),
        strategyName: this.name,
        reason:
          lateDays <= this.graceDays
            ? `Within ${this.graceDays}-day academic grace period (৳0)`
            : `${chargeableDays} chargeable day(s) after ${this.graceDays}-day grace at ৳${this.reducedDailyRate}/day`,
      };
    }

    const damageStrategy = new DamagedItemFineStrategy();
    const damageResult = damageStrategy.calculate({
      ...input,
      daysLate: chargeableDays,
    });
    return {
      amount: damageResult.amount,
      strategyName: this.name,
      reason: `${damageResult.reason} (with ${this.graceDays}-day academic grace)`,
    };
  }
}

/**
 * Context holding the active FineCalculationStrategy.
 */
export class FineCalculatorContext {
  constructor(private strategy: FineCalculationStrategy) {}

  setStrategy(strategy: FineCalculationStrategy): void {
    this.strategy = strategy;
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  compute(input: FineCalculationInput): FineCalculationResult {
    return this.strategy.calculate(input);
  }
}

export function resolveFineStrategy(
  condition: ConditionGrade,
  policy: "standard" | "damaged" | "grace" = "standard"
): FineCalculationStrategy {
  if (policy === "grace") {
    return new AcademicGracePeriodStrategy();
  }
  if (condition !== "Good" || policy === "damaged") {
    return new DamagedItemFineStrategy();
  }
  return new StandardLateFeeStrategy();
}
