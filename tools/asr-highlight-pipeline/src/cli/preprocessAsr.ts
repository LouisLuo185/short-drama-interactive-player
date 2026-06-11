import { runAsrPreprocessPipeline } from "../asr/asrPreprocessPipeline.js";
import { getStringArg, parseArgs } from "./args.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const asrRoot = getStringArg(args, "asr-root");
  const outRoot = getStringArg(args, "out-root", "apps/server/data/asr");
  const episodeId = getStringArg(args, "episode-id");

  if (!asrRoot) {
    throw new Error("--asr-root is required");
  }

  const result = await runAsrPreprocessPipeline({
    asrRoot,
    outRoot,
    episodeId
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
