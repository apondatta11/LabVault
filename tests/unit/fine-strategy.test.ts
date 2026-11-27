import { describe, expect, it } from "vitest";
import {
  AcademicGracePeriodStrategy,
  DamagedItemFineStrategy,
  FineCalculatorContext,
  StandardLateFeeStrategy,
  resolveFineStrategy,
} from "@/lib/patterns/fine-strategy";

describe("FineCalculationStrategy (Strategy Pattern)", () => {
  it("computes standard late fee at ৳50/day/unit", () => {
    const ctx = new FineCalculatorContext(new StandardLateFeeStrategy());
    expect(ctx.getStrategyName()).toBe("StandardLateFeeStrategy");

    const onTime = ctx.compute({
      daysLate: 0,
      condition: "Good",
      replacementCost: 1850,
      quantity: 1,
    });
    expect(onTime.amount).toBe(0);

    const late = ctx.compute({
      daysLate: 4,
      condition: "Good",
      replacementCost: 1850,
      quantity: 2,
    });
    // 4 * 50 * 2 = 400
    expect(late.amount).toBe(400);
    expect(late.reason).toContain("4 day(s) late");
  });

  it("computes combined late + damage fee via DamagedItemFineStrategy", () => {
    const ctx = new FineCalculatorContext(new DamagedItemFineStrategy());

    const minor = ctx.compute({
      daysLate: 2,
      condition: "MinorDamage",
      replacementCost: 1000,
      quantity: 1,
    });
    // 2 * 50 + 0.25 * 1000 = 100 + 250 = 350
    expect(minor.amount).toBe(350);

    const broken = ctx.compute({
      daysLate: 0,
      condition: "Broken",
      replacementCost: 1000,
      quantity: 1,
    });
    expect(broken.amount).toBe(750);

    const lost = ctx.compute({
      daysLate: 1,
      condition: "Lost",
      replacementCost: 500,
      quantity: 2,
    });
    // 1 * 50 * 2 + 500 * 1.0 * 2 = 100 + 1000 = 1100
    expect(lost.amount).toBe(1100);
  });

  it("waives first 2 late days under AcademicGracePeriodStrategy", () => {
    const ctx = new FineCalculatorContext(new AcademicGracePeriodStrategy());

    const withinGrace = ctx.compute({
      daysLate: 2,
      condition: "Good",
      replacementCost: 1000,
      quantity: 1,
    });
    expect(withinGrace.amount).toBe(0);
    expect(withinGrace.reason).toContain("grace period");

    const beyondGrace = ctx.compute({
      daysLate: 5,
      condition: "Good",
      replacementCost: 1000,
      quantity: 1,
    });
    // (5 - 2) * ৳30 = ৳90
    expect(beyondGrace.amount).toBe(90);

    const damagedWithGrace = ctx.compute({
      daysLate: 3,
      condition: "MinorDamage",
      replacementCost: 1000,
      quantity: 1,
    });
    // (3 - 2) * 50 + 0.25 * 1000 = 50 + 250 = 300
    expect(damagedWithGrace.amount).toBe(300);
  });

  it("switches strategy dynamically via setStrategy and resolveFineStrategy", () => {
    const ctx = new FineCalculatorContext(
      resolveFineStrategy("Good", "standard")
    );
    expect(ctx.getStrategyName()).toBe("StandardLateFeeStrategy");

    ctx.setStrategy(resolveFineStrategy("Broken", "standard"));
    expect(ctx.getStrategyName()).toBe("DamagedItemFineStrategy");

    ctx.setStrategy(resolveFineStrategy("Good", "grace"));
    expect(ctx.getStrategyName()).toBe("AcademicGracePeriodStrategy");
  });
});
