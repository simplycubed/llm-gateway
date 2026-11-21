/**
 * GATE — trailing-slash stripping, the shape CodeQL flagged (js/polynomial-redos).
 *
 * `stripToGatewayRoot` once used `/\/+$/` at both of its call sites. A quantifier
 * directly before an anchor backtracks once per start position, so a base URL
 * carrying a long run of slashes that are NOT at the end costs O(n^2). The fix is
 * a character walk, which leaves exactly one hazard behind: a future edit that
 * "simplifies" it back to a regex. Correctness assertions cannot see that
 * regression — the two implementations agree on every output — so this file pairs
 * the behaviour table with a cost assertion.
 *
 * This file imports `stripToGatewayRoot` directly instead of driving
 * `createGatewayClient` over a fake fetch the way `routing.test.ts` does, because
 * the degenerate inputs that matter are unreachable through the public API:
 * `configuredOrUndefined` turns an empty or whitespace `baseUrl` into `undefined`
 * long before the stripper would see it. The public-API side of this behaviour is
 * covered in `routing.test.ts` under the baseUrl-override block.
 */
import { describe, it, expect } from "vitest";
import { stripToGatewayRoot } from "../src/routing.js";

describe("stripToGatewayRoot — trailing-slash semantics", () => {
  it.each([
    ["", ""],
    ["/", ""],
    ["//", ""],
    ["///", ""],
    ["a", "a"],
    ["/a/", "/a"],
    // Slashes that are not trailing are left ALONE. This is also the input shape
    // that was quadratic under the old regex; asserted here for behaviour and
    // again below for cost.
    ["////a", "////a"],
    ["https://x", "https://x"],
    ["https://x/", "https://x"],
    // The case a well-meaning cleanup is most likely to "fix": the stripper is
    // purely textual, so a bare scheme loses its OWN slashes. Pre-existing
    // behaviour that the ReDoS fix had to preserve exactly — locked because it is
    // preserved, not because the input is sensible.
    ["https://", "https:"],
    ["https://x///", "https://x"],
  ])("maps %j to %j", (input, expected) => {
    expect(stripToGatewayRoot(input)).toBe(expected);
  });

  it("strips a whole run of trailing slashes, not merely the last one", () => {
    expect(stripToGatewayRoot(`a${"/".repeat(100_000)}`)).toBe("a");
  });

  it("trims whitespace BEFORE looking for slashes, so a padded paste still reduces", () => {
    // Order-dependent: scanning for slashes first would see a space as the final
    // character and strip nothing at all.
    expect(stripToGatewayRoot("  https://gw.example.test/v1/acct/gw///  ")).toBe(
      "https://gw.example.test/v1/acct/gw",
    );
  });
});

describe("stripToGatewayRoot — trailing slashes around the dashboard-URL stripping", () => {
  it("reduces a pasted chat-completions URL that also carries trailing slashes", () => {
    // The `/chat/completions$` replace is anchored, so the LEADING strip is what
    // lets it match at all. Lose that first call site and the dashboard foot-gun
    // guard silently stops firing on any pasted URL with a trailing slash.
    expect(stripToGatewayRoot("https://gw.example.test/v1/acct/gw/compat/chat/completions//")).toBe(
      "https://gw.example.test/v1/acct/gw",
    );
  });

  it("reduces a pasted compat URL that also carries trailing slashes", () => {
    expect(stripToGatewayRoot("https://gw.example.test/v1/acct/gw/compat///")).toBe(
      "https://gw.example.test/v1/acct/gw",
    );
  });

  it("re-strips the slash that the compat replace leaves behind", () => {
    // The SECOND call site specifically: removing `/compat` here exposes a slash
    // that was interior right up until that replace ran.
    expect(stripToGatewayRoot("https://gw.example.test/v1/acct/gw//compat")).toBe(
      "https://gw.example.test/v1/acct/gw",
    );
  });
});

describe("stripToGatewayRoot — polynomial-ReDoS regression guard", () => {
  // Both constants come from a measurement, not a guess. With `/\/+$/` back at the
  // two call sites this input costs ~9s on the authoring machine (cleanly
  // quadratic: 10k ≈ 90ms, 20k ≈ 360ms, 50k ≈ 2.2s); the character walk costs
  // ~0.01ms. The budget therefore sits ~18x BELOW the regressed cost and ~25,000x
  // ABOVE the fixed one. That two-sided margin is why a wall-clock assertion is
  // safe here instead of flaky — no plausible CI machine, however slow or
  // contended, moves either side across it.
  const N = 100_000;
  const BUDGET_MS = 500;

  it(
    "handles a long LEADING run of slashes in linear time",
    () => {
      // The quadratic shape: the quantifier eats to the end of the run, the anchor
      // fails because a non-slash follows, and the scan retries from every
      // position in the run. Built outside the timed region.
      const pathological = `${"/".repeat(N)}a`;

      const started = performance.now();
      const out = stripToGatewayRoot(pathological);
      const elapsed = performance.now() - started;

      // Correctness is asserted separately from cost so the input stays locked
      // even if someone later relaxes the budget.
      expect(out).toBe(pathological);
      expect(
        elapsed,
        `${N} leading slashes took ${elapsed.toFixed(1)}ms, budget ${BUDGET_MS}ms — ` +
          `a quantified trailing-slash regex is back in stripToGatewayRoot`,
      ).toBeLessThan(BUDGET_MS);
    },
    // Generous on purpose: a REGRESSED implementation must survive long enough to
    // report the assertion above rather than die of a vitest timeout that explains
    // nothing. Costs nothing in the fixed state, which finishes in microseconds.
    30_000,
  );
});
