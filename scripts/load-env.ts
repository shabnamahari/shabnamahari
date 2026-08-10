import { config } from "dotenv";

/**
 * Loads the same environment files Next.js does, in the same precedence order.
 *
 * `import "dotenv/config"` reads `.env` and nothing else, so a script using it
 * silently sees no configuration at all in this project — every secret lives in
 * `.env.local`. The failure is confusing rather than loud: variables come back
 * `undefined` and the first error is about a malformed URL somewhere further
 * downstream.
 *
 * dotenv does not overwrite a variable that is already set, so listing
 * `.env.local` first is what makes it win over `.env`.
 */
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
