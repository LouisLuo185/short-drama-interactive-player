import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../..");
const repoRoot = path.resolve(serverRoot, "../..");
const workerScript = path.join(repoRoot, "tools", "paddle-ocr-worker", "run_video_ocr.py");

export type PaddleOcrRunnerOptions = {
  args: string[];
  python?: string;
};

export function runPaddleOcrWorker(options: PaddleOcrRunnerOptions) {
  const python = options.python ?? process.env.PADDLE_OCR_PYTHON ?? "python";

  return new Promise<void>((resolve, reject) => {
    const child = spawn(python, [workerScript, ...options.args], {
      cwd: path.dirname(workerScript),
      stdio: "inherit",
      windowsHide: true
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`PaddleOCR worker exited with ${code}`));
    });
  });
}
