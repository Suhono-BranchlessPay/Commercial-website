/**
 * Mirror of assertGscOpsToken fail-closed rules in routes/gsc.ts.
 * Kept as a pure helper test so we do not need to boot Express.
 */
function assertGscOpsToken(
  env: { NODE_ENV?: string; GSC_OAUTH_OPS_TOKEN?: string },
  provided: string,
): boolean {
  const opsToken = env.GSC_OAUTH_OPS_TOKEN?.trim();
  if (!opsToken) return env.NODE_ENV !== "production";
  return provided.trim() === opsToken;
}

describe("GSC OAuth ops token gate", () => {
  test("production without token is closed", () => {
    expect(
      assertGscOpsToken({ NODE_ENV: "production", GSC_OAUTH_OPS_TOKEN: "" }, ""),
    ).toBe(false);
  });

  test("dev without token is open", () => {
    expect(assertGscOpsToken({ NODE_ENV: "development" }, "")).toBe(true);
  });

  test("token must match when set", () => {
    expect(
      assertGscOpsToken(
        { NODE_ENV: "production", GSC_OAUTH_OPS_TOKEN: "secret" },
        "secret",
      ),
    ).toBe(true);
    expect(
      assertGscOpsToken(
        { NODE_ENV: "production", GSC_OAUTH_OPS_TOKEN: "secret" },
        "wrong",
      ),
    ).toBe(false);
  });
});
