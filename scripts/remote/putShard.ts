import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { putObject, s3ConfigFromEnv } from "./s3";

export async function putShard(filePath: string, key: string): Promise<void> {
  const config = s3ConfigFromEnv();
  const body = readFileSync(filePath);
  await putObject(config, key, body);
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

if (isMain) {
  const filePath = process.argv[2];
  const key = process.argv[3];
  if (filePath === undefined || key === undefined) {
    console.error("Usage: yarn dlx tsx scripts/remote/putShard.ts <file> <object-key>");
    process.exit(1);
  }
  await putShard(filePath, key);
  console.log(`uploaded ${filePath} -> ${key}`);
}
