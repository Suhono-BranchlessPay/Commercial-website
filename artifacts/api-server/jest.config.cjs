/**
 * Jest config for @workspace/api-server.
 *
 * Why Jest (not Vitest): this monorepo's pnpm overrides strip every native
 * rollup/esbuild binary, so Vite (and therefore Vitest) cannot load on any
 * platform here. Jest + @swc/jest uses SWC (whose native build IS allowed via
 * pnpm `onlyBuiltDependencies`) and needs no rollup/vite.
 *
 * Unit tests run everywhere (no DB). Integration tests (tenant isolation) run
 * ONLY when TEST_DATABASE_URL points at a disposable test/sandbox Postgres —
 * see test/setup.ts and test/integration/*.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFiles: ["<rootDir>/test/setup.ts"],
  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: false },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  // Workspace packages (@workspace/db, @workspace/api-zod) ship raw .ts via
  // package "exports" and MUST be transformed; everything else in node_modules
  // is already CJS-consumable and is left ignored.
  transformIgnorePatterns: ["/node_modules/(?!@workspace/)"],
  // pino-pretty transport + pg Pool keep handles open; tests are deterministic
  // and self-cleaning, so exit once the run completes.
  forceExit: true,
  testTimeout: 30000,
};
