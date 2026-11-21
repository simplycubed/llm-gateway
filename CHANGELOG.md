# Changelog

All notable changes to this package are documented here, in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Versions follow semver, with an
honest `0.x` while there is only one consumer.

A breaking change ships with a `### Migration` block giving the old call, the new call, and any
config change. Consumers link that block from their bump PR.

## [Unreleased]

## [0.2.3] - 2026-11-21

### Fixed

- Security: `stripToGatewayRoot` stripped trailing slashes with `/\/+$/` at both of its
  call sites. A quantifier placed directly before an anchor backtracks once per start
  position, so a `baseUrl` carrying a long run of slashes that are not at the end cost
  O(n^2) — 100k slashes measured at ~9s. Both uses are now one character walk, which is
  linear. Reported by CodeQL as `js/polynomial-redos` (high), alerts #1 and #2.

  No public API change and no behaviour change: the two implementations agree on every
  output, including the purely textual `"https://"` → `"https:"`. `baseUrl` is
  configuration rather than request input, so this was a deployment-time foot-gun rather
  than a reachable DoS path.

## [0.2.2] - 2026-11-21

### Changed

- Dev-only: roll the open dependency updates into one change. TypeScript
  5.9.3 → 6.0.3, ESLint 9.39.5 → 10.15.0, `@types/node` 25.9.5 → 26.6.6,
  `@cloudflare/workers-types` 4.20260702.1 → 5.20261120.1, `typescript-eslint`
  8.68.0 → 8.73.0, `globals` 17.11.0 → 17.14.0, `prettier` 3.9.6 → 3.10.1.
  Actions: `actions/checkout` v6 → v7, `actions/setup-node` v6 → v7,
  `actions/download-artifact` v6 → v8. No runtime dependency and no public API
  change.

## [0.2.1] - 2026-11-12

### Changed

- Republish so the npm Trusted Publisher on `@simplycubed/llm-gateway` can validate. No API change.

## [0.2.0] - 2026-11-12

### Changed

- The published name is `@simplycubed/llm-gateway`.

### Migration

Install and import the new name. Config is unchanged.

```sh
pnpm add @simplycubed/llm-gateway
```

```ts
import { createGatewayClient } from "@simplycubed/llm-gateway";
```

`@charlesgreen/llm-gateway` stays published at 0.1.4 and receives no further releases.

## [0.1.4] - 2026-11-12

### Changed

- Copyright holder is SimplyCubed, GK. The repository is
  https://github.com/simplycubed/llm-gateway.
- `CLAUDE.md` is removed. Agent instructions live in `AGENTS.md`.
- Dev-only: vitest and `@vitest/coverage-v8` 4.1.11 / 4.1.8 → 4.1.12. The
  lockfile resolves `vite` 8.2.6, `source-map-js` 1.2.2, `brace-expansion`
  1.1.21 and 5.0.12, and `minimatch` 11.0.8 in place of 10.2.6. These close
  the open dependency alerts.

## [0.1.3] - 2026-09-15

### Added

- A third, presence-driven URL shape: when `projectId` and `location` are both set, the client
  addresses `{provider}/v1/projects/{projectId}/locations/{location}/publishers/{publisher}/models/{model}:{rpc}`,
  sends a contents / systemInstruction envelope, and reads candidate text parts plus
  `usageMetadata` token counts. `publisher` and `rpc` are required alongside the pair.
  Setting `projectId` together with `resourceName` is a named config error (two shapes at once).
  The unified and path-addressed chat-completions shapes are unchanged.

## [0.1.2] - 2026-09-13

### Changed

- README, `AGENTS.md`, and this changelog rewritten in plainer prose. No code or public API
  change.
- Dev-only: vitest 4.1.8 → 4.1.11.

## [0.1.1] - 2026-09-02

### Changed

- Publishing now uses npm's OIDC trusted publishing instead of a stored account token. No
  functional change for consumers, no public API change.

## [0.1.0] - 2026-09-02

### Added

- Initial implementation.
  - `createGatewayClient(config)`: chat-completions traffic over Cloudflare AI Gateway, with the
    URL shape selected by the presence of `resourceName` and no provider-name comparison
    anywhere.
  - Composable dual credentials: a gateway-hop token and an optional provider key whose header name
    and scheme are configuration. Zero credentials is a valid, supported state.
  - `<placeholder>` detection, errors that name the value to fix, an optional `varNames` label map,
    and redaction of the configured model / provider / resource out of upstream error bodies.
  - Lazy config resolution, and the platform `fetch` bound once at construction.
  - `resolveEndpoint`: the single extension point; it overrides the URL only.
  - `./testing` subpath: `fakeFetch()` and `cassetteClient()`.
- `scripts/no-provider-literals.mjs`: the consumer-compatibility gate, run over `src/`, `dist/`,
  `README.md` and `package.json`, with a negative control proving it goes red on a planted token.

### Fixed

- `main`/`types`/`typesVersions` added for legacy `"moduleResolution": "node"` consumers, which the
  `exports` map alone does not satisfy.
