import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLabService, LabServiceError } from "@/lib/services/lab-service";
import type { EquipmentCategory } from "@/lib/types";

const createEquipmentSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(50),
  serialNumber: z.string().max(80).nullable().optional(),
  category: z.enum([
    "Consumable",
    "ReturnableComponent",
    "HighValueInstrument",
  ]),
  description: z.string().min(3).max(500),
  totalStock: z.coerce.number().int().min(1),
  availableStock: z.coerce.number().int().min(0).optional(),
  minStockAlert: z.coerce.number().int().min(0).default(3),
  replacementCost: z.coerce.number().min(0).default(25),
  location: z.string().min(2).max(120).default("CSE Hardware Lab"),
});

/**
 * @openapi
 * /api/equipment:
 *   get:
 *     tags: [Equipment]
 *     summary: List lab equipment and hardware components
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [ALL, Consumable, ReturnableComponent, HighValueInstrument]
 *     responses:
 *       200:
 *         description: Array of equipment items
 *   post:
 *     tags: [Equipment]
 *     summary: Create a new hardware item in inventory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEquipmentInput'
 *     responses:
 *       201:
 *         description: Equipment created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate SKU
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const category = (searchParams.get("category") ?? "ALL") as
      | EquipmentCategory
      | "ALL";

    const items = await getLabService().listEquipment({ search, category });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/equipment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid equipment payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const item = await getLabService().createEquipment({
      ...data,
      availableStock: data.availableStock ?? data.totalStock,
      serialNumber: data.serialNumber ?? null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/equipment error:", error);
    return NextResponse.json(
      { error: "Failed to create equipment" },
      { status: 500 }
    );
  }
}
