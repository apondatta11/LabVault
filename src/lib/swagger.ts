import swaggerJsdoc from "swagger-jsdoc";

export function getOpenApiSpec() {
  return swaggerJsdoc({
    definition: {
      openapi: "3.0.3",
      info: {
        title: "LabVault Hardware & Lab Component Lending API",
        version: "1.0.0",
        description:
          "REST API for Hardware LabVault — Equipment Inventory, Borrow & Return Checkout, Damage Inspection & Fine Engine, Lab Slot Reservations, and Usage Analytics & Audit Log.",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local Development Server",
        },
      ],
      tags: [
        { name: "Equipment", description: "Module 1: Equipment & Kit Inventory" },
        { name: "Loans", description: "Module 2: Borrow & Return Checkout" },
        { name: "Fines", description: "Module 3: Damage Inspection & Fine Engine" },
        { name: "Reservations", description: "Module 4: Lab Slot Reservation" },
        { name: "Analytics", description: "Module 5: Usage Analytics & Audit Log" },
      ],
      components: {
        schemas: {
          CreateEquipmentInput: {
            type: "object",
            required: ["name", "sku", "category", "description", "totalStock"],
            properties: {
              name: { type: "string", example: "Raspberry Pi 5 (8GB)" },
              sku: { type: "string", example: "SBC-RPI5-8G" },
              serialNumber: { type: "string", nullable: true },
              category: {
                type: "string",
                enum: ["Consumable", "ReturnableComponent", "HighValueInstrument"],
              },
              description: { type: "string" },
              totalStock: { type: "integer", example: 6 },
              availableStock: { type: "integer", example: 6 },
              minStockAlert: { type: "integer", example: 2 },
              replacementCost: { type: "number", example: 80.0 },
              location: { type: "string", example: "Rack A4" },
            },
          },
          CheckoutInput: {
            type: "object",
            required: [
              "equipmentId",
              "studentId",
              "studentName",
              "studentEmail",
              "quantity",
            ],
            properties: {
              equipmentId: { type: "string", example: "eq_stm32" },
              studentId: { type: "string", example: "2104012" },
              studentName: { type: "string", example: "Rafiqul Islam" },
              studentEmail: { type: "string", example: "2104012@cse.buet.ac.bd" },
              quantity: { type: "integer", example: 1 },
              notes: { type: "string" },
            },
          },
          ReturnInput: {
            type: "object",
            required: ["condition"],
            properties: {
              condition: {
                type: "string",
                enum: ["Good", "MinorDamage", "Broken", "Lost"],
              },
              policy: {
                type: "string",
                enum: ["standard", "damaged", "grace"],
                default: "standard",
              },
            },
          },
          CreateReservationInput: {
            type: "object",
            required: ["workbench", "studentId", "studentName", "purpose", "startTime", "endTime"],
            properties: {
              equipmentId: { type: "string", nullable: true, example: "eq_rigol" },
              workbench: { type: "string", example: "Bench 01 - High Voltage & Signal" },
              studentId: { type: "string", example: "2104012" },
              studentName: { type: "string", example: "Rafiqul Islam" },
              purpose: { type: "string", example: "Oscilloscope signal capture" },
              startTime: { type: "string", format: "date-time" },
              endTime: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    apis: ["./src/app/api/**/*.ts"],
  });
}
