import { config } from "./config.js";
import { initDb } from "./db/client.js";
import { seedIfEmpty } from "./db/seed.js";
import { buildApp } from "./app.js";

async function main() {
  await initDb();
  const seed = await seedIfEmpty();
  const app = await buildApp();

  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    {
      port: config.port,
      docs: `${config.publicApiUrl}/docs`,
      seed,
    },
    "Vespera API ready",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
