import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLabService, LabServiceError } from "@/lib/services/lab-service";

const updateEquipmentSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z
    .enum(["Consumable", "ReturnableComponent", "HighValueInstrument"])
    .optional(),
  description: z.string().min(3).max(500).optional(),
  totalStock: z.coerce.number().int().min(1).optional(),
  availableStock: z.coerce.number().int().min(0).optional(),
  minStockAlert: z.coerce.number().int().min(0).optional(),
  replacementCost: z.coerce.number().min(0).optional(),
  location: z.string().min(2).max(120).optional(),
});

/**
 * @openapi
 * /api/equipment/{id}:
 *   patch:
 *     tags: [Equipment]
 *     summary: Update an equipment item's stock or metadata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Equipment updated
 *       404:
 *         description: Equipment not found
 *   delete:
 *     tags: [Equipment]
 *     summary: Delete an equipment item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Equipment deleted
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateEquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const item = await getLabService().updateEquipment(id, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await getLabService().deleteEquipment(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
}
