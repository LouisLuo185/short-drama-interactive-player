import { analyzeHighlightsWithDoubao } from "../highlight/doubaoHighlightAnalyzer.js";
import { getNumberArg, getStringArg, parseArgs } from "./args.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputRoot = getStringArg(args, "input-root", "apps/server/data/asr");
  const outRoot = getStringArg(args, "out-root", "apps/server/data/llm-highlights");
  const episodeId = getStringArg(args, "episode-id");
  const limit = getNumberArg(args, "limit");
  const minScore = getNumberArg(args, "min-score", 0.7);

  const result = await analyzeHighlightsWithDoubao({
    inputRoot,
    outRoot,
    episodeId,
    limit,
    minScore
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
