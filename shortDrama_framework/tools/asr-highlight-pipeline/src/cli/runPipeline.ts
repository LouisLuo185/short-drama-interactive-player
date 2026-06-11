import { runAsrPreprocessPipeline } from "../asr/asrPreprocessPipeline.js";
import { loadPipelineConfig } from "../config/pipelineConfig.js";
import { analyzeHighlightsWithDoubao } from "../highlight/doubaoHighlightAnalyzer.js";
import { getStringArg, parseArgs } from "./args.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = getStringArg(
    args,
    "config",
    "tools/asr-highlight-pipeline/config.local.json"
  );

  const config = await loadPipelineConfig(configPath);
  const preprocessResult = await runAsrPreprocessPipeline({
    asrRoot: config.asrRoot,
    outRoot: config.preprocessOutRoot,
    episodeId: config.episodeId ?? undefined
  });
  const analyzeResult = await analyzeHighlightsWithDoubao({
    inputRoot: config.preprocessOutRoot,
    outRoot: config.highlightOutRoot,
    episodeId: config.episodeId ?? undefined,
    limit: config.limit ?? undefined,
    minScore: config.minScore ?? 0.7
  });

  console.log(
    JSON.stringify(
      {
        status: "ok",
        preprocessed_episodes: preprocessResult.episodes.length,
        analyzed_episodes: analyzeResult.length,
        preprocess_out_root: config.preprocessOutRoot,
        highlight_out_root: config.highlightOutRoot
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
