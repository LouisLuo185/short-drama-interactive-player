import { runPaddleOcrWorker } from "../services/videoOcr/paddleOcrRunner.js";

runPaddleOcrWorker({
  args: process.argv.slice(2)
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
