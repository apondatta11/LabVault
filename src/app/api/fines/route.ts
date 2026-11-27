import { NextRequest, NextResponse } from "next/server";
import { getLabRepository } from "@/lib/services/lab-service";
import type { FineStatus } from "@/lib/types";

/**
 * @openapi
 * /api/fines:
 *   get:
 *     tags: [Fines]
 *     summary: List all assessed damage and overdue fines
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, Pending, Settled, Waived]
 *     responses:
 *       200:
 *         description: Array of fines
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "ALL") as FineStatus | "ALL";
    const fines = await getLabRepository().listFines(status);
    return NextResponse.json({ fines });
  } catch (error) {
    console.error("GET /api/fines error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fines" },
      { status: 500 }
    );
  }
}
