import {
  getMetaUnmappedSkipStats,
  recordMetaUnmappedSkip,
  resetUnmappedSkipStatsForTests,
} from "../../src/lib/webhookUnmappedStats";

describe("webhookUnmappedStats", () => {
  beforeEach(() => {
    resetUnmappedSkipStatsForTests();
  });

  test("records total + last page id", () => {
    expect(getMetaUnmappedSkipStats().total).toBe(0);
    recordMetaUnmappedSkip("page-a");
    recordMetaUnmappedSkip("page-b");
    const s = getMetaUnmappedSkipStats();
    expect(s.total).toBe(2);
    expect(s.last_id).toBe("page-b");
    expect(s.last_at).toBeTruthy();
  });
});
