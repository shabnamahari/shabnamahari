import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // The brain imports `server-only`, which throws on purpose anywhere the
      // `react-server` export condition is not set. Vitest runs these through
      // Vite's SSR resolver, where `resolve.conditions` does not apply — so the
      // condition is bypassed and the package's own empty build is named
      // directly, by absolute path — the package's `exports` map only offers
      // that build under the `react-server` condition, so naming the subpath
      // would be refused too. The guard still works everywhere it matters: a
      // Client Component importing the brain is still a build error.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    // These talk to Supabase, Cohere and OpenRouter over the network, and a
    // model answering in Persian is not a two-second operation.
    //
    // 120s was too tight and produced failures that said nothing about the
    // brand. One turn costs about 45 seconds: four Cohere calls spaced by the
    // trial key's nine-per-minute limit, then a free model that is slower than
    // the paid one it will be replaced by. A three-turn conversation therefore
    // needs well over two minutes before the bot has said anything wrong.
    testTimeout: 300_000,
    hookTimeout: 60_000,
    // Sequential on purpose. Running them in parallel would multiply the
    // request rate against three rate-limited APIs, and a 429 would read as a
    // brand failure rather than as the throttling it is.
    fileParallelism: false,
    maxConcurrency: 1,
    setupFiles: ["./evals/setup.ts"],
  },
});
