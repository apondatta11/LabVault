import type { EquipmentCategory } from "@/lib/types";

export interface EquipmentBorrowingRules {
  requiresReturn: boolean;
  loanDurationDays: number;
  requiresSlotReservation: boolean;
  maxQuantityPerLoan: number;
}

export interface EquipmentSpec {
  id: string;
  name: string;
  sku: string;
  replacementCost: number;
  availableStock: number;
}

export interface CheckoutValidationResult {
  allowed: boolean;
  reason?: string;
  dueAt: Date | null;
  requiresReturn: boolean;
  requiresSlotReservation: boolean;
}

/**
 * Product interface for the Factory Method pattern.
 * Encapsulates category-specific borrowing policies for lab hardware.
 */
export interface LabEquipmentProduct {
  readonly category: EquipmentCategory;
  readonly spec: EquipmentSpec;
  getBorrowingRules(): EquipmentBorrowingRules;
  validateCheckout(
    quantity: number,
    hasActiveReservation: boolean,
    now?: Date
  ): CheckoutValidationResult;
}

export class ConsumableItem implements LabEquipmentProduct {
  readonly category: EquipmentCategory = "Consumable";

  constructor(public readonly spec: EquipmentSpec) {}

  getBorrowingRules(): EquipmentBorrowingRules {
    return {
      requiresReturn: false,
      loanDurationDays: 0,
      requiresSlotReservation: false,
      maxQuantityPerLoan: 10,
    };
  }

  validateCheckout(
    quantity: number,
    _hasActiveReservation: boolean
  ): CheckoutValidationResult {
    const rules = this.getBorrowingRules();
    if (quantity <= 0) {
      return {
        allowed: false,
        reason: "Quantity must be at least 1.",
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    if (quantity > rules.maxQuantityPerLoan) {
      return {
        allowed: false,
        reason: `Consumables are capped at ${rules.maxQuantityPerLoan} units per checkout.`,
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    if (quantity > this.spec.availableStock) {
      return {
        allowed: false,
        reason: `Insufficient stock for ${this.spec.name}. Available: ${this.spec.availableStock}.`,
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    return {
      allowed: true,
      dueAt: null,
      requiresReturn: false,
      requiresSlotReservation: false,
    };
  }
}

export class ReturnableComponent implements LabEquipmentProduct {
  readonly category: EquipmentCategory = "ReturnableComponent";

  constructor(public readonly spec: EquipmentSpec) {}

  getBorrowingRules(): EquipmentBorrowingRules {
    return {
      requiresReturn: true,
      loanDurationDays: 7,
      requiresSlotReservation: false,
      maxQuantityPerLoan: 5,
    };
  }

  validateCheckout(
    quantity: number,
    _hasActiveReservation: boolean,
    now: Date = new Date()
  ): CheckoutValidationResult {
    const rules = this.getBorrowingRules();
    if (quantity <= 0) {
      return {
        allowed: false,
        reason: "Quantity must be at least 1.",
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    if (quantity > rules.maxQuantityPerLoan) {
      return {
        allowed: false,
        reason: `Returnable components are limited to ${rules.maxQuantityPerLoan} units per loan.`,
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    if (quantity > this.spec.availableStock) {
      return {
        allowed: false,
        reason: `Insufficient stock for ${this.spec.name}. Available: ${this.spec.availableStock}.`,
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    const dueAt = new Date(
      now.getTime() + rules.loanDurationDays * 24 * 60 * 60 * 1000
    );
    return {
      allowed: true,
      dueAt,
      requiresReturn: true,
      requiresSlotReservation: false,
    };
  }
}

export class HighValueInstrument implements LabEquipmentProduct {
  readonly category: EquipmentCategory = "HighValueInstrument";

  constructor(public readonly spec: EquipmentSpec) {}

  getBorrowingRules(): EquipmentBorrowingRules {
    return {
      requiresReturn: true,
      loanDurationDays: 1,
      requiresSlotReservation: true,
      maxQuantityPerLoan: 1,
    };
  }

  validateCheckout(
    quantity: number,
    hasActiveReservation: boolean,
    now: Date = new Date()
  ): CheckoutValidationResult {
    const rules = this.getBorrowingRules();
    if (quantity !== 1) {
      return {
        allowed: false,
        reason: "High-value instruments can only be checked out 1 unit at a time.",
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    if (!hasActiveReservation) {
      return {
        allowed: false,
        reason: `${this.spec.name} requires a confirmed Lab Slot Reservation before checkout.`,
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    if (quantity > this.spec.availableStock) {
      return {
        allowed: false,
        reason: `No units available for ${this.spec.name}.`,
        dueAt: null,
        requiresReturn: rules.requiresReturn,
        requiresSlotReservation: rules.requiresSlotReservation,
      };
    }
    const dueAt = new Date(
      now.getTime() + rules.loanDurationDays * 24 * 60 * 60 * 1000
    );
    return {
      allowed: true,
      dueAt,
      requiresReturn: true,
      requiresSlotReservation: true,
    };
  }
}

/**
 * Abstract Creator in the Factory Method pattern.
 */
export abstract class AbstractEquipmentFactory {
  abstract createEquipment(spec: EquipmentSpec): LabEquipmentProduct;
}

export class ConsumableFactory extends AbstractEquipmentFactory {
  createEquipment(spec: EquipmentSpec): LabEquipmentProduct {
    return new ConsumableItem(spec);
  }
}

export class ReturnableComponentFactory extends AbstractEquipmentFactory {
  createEquipment(spec: EquipmentSpec): LabEquipmentProduct {
    return new ReturnableComponent(spec);
  }
}

export class HighValueInstrumentFactory extends AbstractEquipmentFactory {
  createEquipment(spec: EquipmentSpec): LabEquipmentProduct {
    return new HighValueInstrument(spec);
  }
}

/**
 * Registry-backed EquipmentFactory delegating to category-specific creators.
 */
export class EquipmentFactory {
  private static readonly factories: Record<
    EquipmentCategory,
    AbstractEquipmentFactory
  > = {
    Consumable: new ConsumableFactory(),
    ReturnableComponent: new ReturnableComponentFactory(),
    HighValueInstrument: new HighValueInstrumentFactory(),
  };

  static create(
    category: EquipmentCategory,
    spec: EquipmentSpec
  ): LabEquipmentProduct {
    const factory = this.factories[category];
    if (!factory) {
      throw new Error(`Unsupported equipment category: ${category}`);
    }
    return factory.createEquipment(spec);
  }
}
