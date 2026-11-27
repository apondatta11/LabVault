import { NextResponse } from "next/server";
import { getLabService } from "@/lib/services/lab-service";

/**
 * @openapi
 * /api/analytics:
 *   get:
 *     tags: [Analytics]
 *     summary: Retrieve real-time lab KPIs, low-stock alerts, and recent audit trail
 *     responses:
 *       200:
 *         description: Analytics summary payload
 */
export async function GET() {
  try {
    const analytics = await getLabService().getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("GET /api/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
