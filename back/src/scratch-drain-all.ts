import "dotenv/config";
import { runOnce } from "./workers/click.worker.js";
import { redis } from "./db/redis.js";

let total = 0;
for (let i = 0; i < 40; i++) {
  const { processed } = await runOnce();
  total += processed;
  console.log(`iteracao ${i + 1}: processed=${processed} (total=${total})`);
  if (processed === 0) {
    console.log("stream drenada (0 processados nesta iteracao).");
    break;
  }
}

await redis.quit();
process.exit(0);
