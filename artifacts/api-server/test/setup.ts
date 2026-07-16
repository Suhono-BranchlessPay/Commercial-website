/**
 * Global test setup (runs before any test module is imported).
 *
 * `@workspace/db` constructs a pg Pool at import time and throws if
 * DATABASE_URL is unset. For pure unit tests we set a dummy URL that is NEVER
 * connected to (the Pool is lazy). For integration tests, set TEST_DATABASE_URL
 * to a disposable Postgres and it becomes DATABASE_URL here.
 */
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";

if (process.env.TEST_DATABASE_URL) {
  // Explicit opt-in for DB-backed integration tests.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (!process.env.DATABASE_URL) {
  // Dummy — importing @workspace/db won't throw; unit tests never query it.
  process.env.DATABASE_URL =
    "postgres://jest:jest@127.0.0.1:5432/jest_no_connect";
}
