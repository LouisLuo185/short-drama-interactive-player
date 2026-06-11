import { spawn } from "node:child_process";
import Tesseract from "tesseract.js";
import type { OcrRecognition, VideoOcrConfig } from "./types.js";
import { cleanOcrText } from "./textUtils.js";

export class OcrEngine {
  private worker: Tesseract.Worker | null = null;

  constructor(private readonly config: VideoOcrConfig) {}

  async recognize(imagePath: string) {
    try {
      const result =
        this.config.ocrEngine === "external"
          ? await runExternalOcr(this.config, imagePath)
          : await this.runTesseractJs(imagePath);

      return {
        text: cleanOcrText(result.text),
        confidence: result.confidence
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[WARN] OCR skipped frame: ${message}`);
      return {
        text: "",
        confidence: null
      };
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  private async runTesseractJs(imagePath: string) {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker(parseLanguages(this.config.ocrLanguages), Tesseract.OEM.LSTM_ONLY, {
        cachePath: this.config.tesseractCachePath,
        langPath: this.config.tesseractLangPath,
        logger: (message) => {
          if (message.progress === 1) {
            console.log(`[INFO] Tesseract.js ${message.status}`);
          }
        }
      });
      await this.worker.setParameters({
        tessedit_pageseg_mode: toTesseractPsm(this.config.tesseractPsm),
        preserve_interword_spaces: "0"
      });
    }

    const result = await this.worker.recognize(imagePath);
    return {
      text: result.data.text,
      confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : null
    };
  }
}

async function runExternalOcr(config: VideoOcrConfig, imagePath: string): Promise<OcrRecognition> {
  const text = config.ocrCommand
    ? await runTemplateCommand(config.ocrCommand, imagePath)
    : await runProcess("tesseract", [imagePath, "stdout", "-l", config.ocrLanguages, "--psm", "7"]);

  return {
    text,
    confidence: null
  };
}

function toTesseractPsm(value: VideoOcrConfig["tesseractPsm"]) {
  if (value === "single_block") {
    return Tesseract.PSM.SINGLE_BLOCK;
  }

  if (value === "sparse_text") {
    return Tesseract.PSM.SPARSE_TEXT;
  }

  return Tesseract.PSM.SINGLE_LINE;
}

async function runTemplateCommand(template: string, imagePath: string) {
  const command = template.includes("{image}")
    ? template.replaceAll("{image}", quoteForShell(imagePath))
    : `${template} ${quoteForShell(imagePath)}`;

  return runShell(command);
}

function runShell(command: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, { shell: true, windowsHide: true });
    collectOutput(child, resolve, reject);
  });
}

function runProcess(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    collectOutput(child, resolve, reject);
  });
}

function collectOutput(
  child: ReturnType<typeof spawn>,
  resolve: (value: string) => void,
  reject: (reason?: unknown) => void
) {
  let stdout = "";
  let stderr = "";

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve(stdout);
      return;
    }

    reject(new Error(stderr.trim() || `OCR command exited with ${code}`));
  });
}

function quoteForShell(value: string) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function parseLanguages(value: string) {
  return value
    .split("+")
    .map((item) => item.trim())
    .filter(Boolean);
}
