import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { getFunnelCounts, getFunnelInsight, mapCountsToSankey } from "@/lib/analytics/funnel";

export async function GET() {
  const { user } = await getAuthContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const counts = await getFunnelCounts(user.id);
  const sankey = mapCountsToSankey(counts);
  const insight = getFunnelInsight(counts);

  return NextResponse.json({ counts, sankey, insight });
}
