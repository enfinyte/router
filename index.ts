import chalk from "chalk";

const isProd = process.env.NODE_ENV === "production";

const services = [
  // { name: "api", cmd: ["bun", "run", ...(isProd ? [] : ["--hot"]), "packages/api_platform/src/index.ts"], color: chalk.blue },
  {
    name: "backend",
    cmd: ["bun", "run", ...(isProd ? [] : ["--hot"]), "packages/backend/src/index.ts"],
    color: chalk.green,
  },
  {
    name: "frontend",
    cmd: isProd
      ? ["bun", "packages/frontend/.next/standalone/packages/frontend/server.js"]
      : ["bun", "run", "--cwd", "packages/frontend", "dev"],
    color: chalk.yellow,
  },
];

const procs: Bun.Subprocess[] = [];

const pipe = (stream: ReadableStream<Uint8Array> | null, prefix: string) => {
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop()!;
      for (const line of lines) process.stdout.write(`${prefix} ${line}\n`);
    }
    if (buf) process.stdout.write(`${prefix} ${buf}\n`);
  })();
};

for (const { name, cmd, color } of services) {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const prefix = color(`[${name}]`);
  pipe(proc.stdout, prefix);
  pipe(proc.stderr, prefix);
  procs.push(proc);
}

const shutdown = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.allSettled(procs.map((p) => p.exited));
