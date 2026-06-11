export function parseArgs(args: string[]) {
  const result = new Map<string, string | boolean>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      result.set(key, true);
      continue;
    }

    result.set(key, next);
    index += 1;
  }

  return result;
}

export function getStringArg(args: Map<string, string | boolean>, key: string, fallback?: string) {
  const value = args.get(key);
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}

export function getNumberArg(args: Map<string, string | boolean>, key: string, fallback?: number) {
  const value = args.get(key);
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${key} must be a number`);
  }

  return parsed;
}
