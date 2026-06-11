import { spawn } from "node:child_process";

export type RunCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  label?: string;
  timeoutMs?: number;
  heartbeatMs?: number;
  streamOutput?: boolean;
};

export function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const startedAt = Date.now();
    const label = options.label ?? command;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        PYTHONUTF8: "1",
        PYTHONIOENCODING: "utf-8",
        CONDA_REPORT_ERRORS: "false",
        CONDA_NO_PLUGINS: "true",
        ...options.env
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const cleanup = () => {
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };

    const timeoutTimer = options.timeoutMs
      ? setTimeout(() => {
          const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
          console.error(`[TIMEOUT] ${label} exceeded ${formatDuration(options.timeoutMs ?? 0)}.`);
          terminateChildTree(child.pid);
          cleanup();
          reject(new Error(`${label} timed out after ${elapsedSec}s`));
        }, options.timeoutMs)
      : null;

    const heartbeatTimer = options.heartbeatMs
      ? setInterval(() => {
          if (settled) return;
          const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
          console.log(`[RUNNING] ${label}: ${elapsedSec}s elapsed...`);
        }, options.heartbeatMs)
      : null;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (options.streamOutput) process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (options.streamOutput) process.stderr.write(chunk);
    });
    child.on("error", (error) => {
      cleanup();
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      cleanup();
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with ${code}`));
    });
  });
}

export function runShellCommand(commandLine: string, options: RunCommandOptions = {}) {
  const isWindows = process.platform === "win32";
  return runCommand(
    isWindows ? "cmd.exe" : "sh",
    isWindows ? ["/d", "/s", "/c", commandLine] : ["-lc", commandLine],
    options
  );
}

function terminateChildTree(pid?: number) {
  if (!pid) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore"
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // The process may already be gone.
  }
}

function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (minutes >= 1) return `${minutes}m`;
  return `${Math.round(ms / 1000)}s`;
}
