import { initDb } from "./client.js";
import { seedIfEmpty } from "./seed.js";

await initDb();
const result = await seedIfEmpty();
console.log(result);
process.exit(0);
