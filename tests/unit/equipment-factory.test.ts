import { describe, expect, it } from "vitest";
import {
  ConsumableItem,
  EquipmentFactory,
  HighValueInstrument,
  ReturnableComponent,
} from "@/lib/patterns/equipment-factory";

describe("EquipmentFactory (Factory Method Pattern)", () => {
  const now = new Date("2026-11-27T10:00:00.000Z");

  it("instantiates ConsumableItem with no-return rule and max 10 per checkout", () => {
    const item = EquipmentFactory.create("Consumable", {
      id: "eq_1",
      name: "MB-102 Breadboard",
      sku: "CON-BB-830",
      replacementCost: 3.5,
      availableStock: 20,
    });

    expect(item).toBeInstanceOf(ConsumableItem);
    const rules = item.getBorrowingRules();
    expect(rules.requiresReturn).toBe(false);
    expect(rules.loanDurationDays).toBe(0);
    expect(rules.maxQuantityPerLoan).toBe(10);

    const valid = item.validateCheckout(4, false, now);
    expect(valid.allowed).toBe(true);
    expect(valid.dueAt).toBeNull();
    expect(valid.requiresReturn).toBe(false);

    const overCap = item.validateCheckout(11, false, now);
    expect(overCap.allowed).toBe(false);
    expect(overCap.reason).toContain("capped at 10");
  });

  it("instantiates ReturnableComponent with 7-day loan window and stock validation", () => {
    const item = EquipmentFactory.create("ReturnableComponent", {
      id: "eq_2",
      name: "STM32 Nucleo-F446RE",
      sku: "MCU-STM32-F446",
      replacementCost: 28.5,
      availableStock: 3,
    });

    expect(item).toBeInstanceOf(ReturnableComponent);
    const valid = item.validateCheckout(2, false, now);
    expect(valid.allowed).toBe(true);
    expect(valid.requiresReturn).toBe(true);
    expect(valid.dueAt?.toISOString()).toBe("2026-12-04T10:00:00.000Z");

    const insufficient = item.validateCheckout(4, false, now);
    expect(insufficient.allowed).toBe(false);
    expect(insufficient.reason).toContain("Insufficient stock");
  });

  it("instantiates HighValueInstrument requiring slot reservation and 1-day loan", () => {
    const item = EquipmentFactory.create("HighValueInstrument", {
      id: "eq_3",
      name: "Rigol DS1054Z Oscilloscope",
      sku: "INS-RIGOL-1054Z",
      replacementCost: 399,
      availableStock: 2,
    });

    expect(item).toBeInstanceOf(HighValueInstrument);

    const noRes = item.validateCheckout(1, false, now);
    expect(noRes.allowed).toBe(false);
    expect(noRes.reason).toContain("Lab Slot Reservation");

    const multiQty = item.validateCheckout(2, true, now);
    expect(multiQty.allowed).toBe(false);

    const valid = item.validateCheckout(1, true, now);
    expect(valid.allowed).toBe(true);
    expect(valid.dueAt?.toISOString()).toBe("2026-11-28T10:00:00.000Z");
  });

  it("rejects non-positive quantity and unsupported categories", () => {
    const consumable = EquipmentFactory.create("Consumable", {
      id: "eq_1",
      name: "Jumper Wires",
      sku: "CON-JMP",
      replacementCost: 2.5,
      availableStock: 10,
    });
    expect(consumable.validateCheckout(0, false, now).allowed).toBe(false);

    expect(() =>
      EquipmentFactory.create("InvalidCategory" as never, {
        id: "x",
        name: "x",
        sku: "x",
        replacementCost: 1,
        availableStock: 1,
      })
    ).toThrow("Unsupported equipment category");
  });
});
