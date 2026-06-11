import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const commands = [
  { name: "web", args: ["run", "dev", "-w", "apps/web"] },
  { name: "server", args: ["run", "dev", "-w", "apps/server"] }
];

const children = commands.map(({ name, args }) => {
  const child = spawn(npmCmd, args, {
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, FORCE_COLOR: "1" }
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] exited with signal ${signal}`);
    } else if (code && code !== 0) {
      console.log(`[${name}] exited with code ${code}`);
      shutdown();
    }
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
