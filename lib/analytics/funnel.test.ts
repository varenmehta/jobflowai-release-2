import test from "node:test";
import assert from "node:assert/strict";
import { mapCountsToSankey, type FunnelCounts } from "@/lib/analytics/funnel";

test("sankey links never exceed source flow and never go negative", () => {
  const counts: FunnelCounts = {
    APPLIED: 10,
    SCREENING: 3,
    INTERVIEW: 1,
    OFFER: 0,
    REJECTED: 6,
    WITHDRAWN: 1,
  };

  const { links } = mapCountsToSankey(counts);

  for (const link of links) {
    assert.ok(link.value >= 0, "link value cannot be negative");
  }

  const appliedOut = links
    .filter((link) => link.source === 0)
    .reduce((sum, link) => sum + link.value, 0);

  assert.ok(appliedOut <= 10, "applied outgoing flow cannot exceed source count");
});
