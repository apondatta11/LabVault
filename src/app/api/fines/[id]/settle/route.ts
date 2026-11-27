import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLabService, LabServiceError } from "@/lib/services/lab-service";

const settleSchema = z.object({
  status: z.enum(["Settled", "Waived"]).default("Settled"),
});

/**
 * @openapi
 * /api/fines/{id}/settle:
 *   patch:
 *     tags: [Fines]
 *     summary: Mark a fine as Settled or Waived
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Fine updated
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = settleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid fine status", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const fine = await getLabService().settleFine(id, parsed.data.status);
    return NextResponse.json({ fine });
  } catch (error) {
    if (error instanceof LabServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Failed to settle fine" },
      { status: 500 }
    );
  }
}
