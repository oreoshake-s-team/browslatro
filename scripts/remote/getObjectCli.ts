import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { getObject, s3ConfigFromEnv } from "./s3";

export async function downloadObject(key: string, filePath: string): Promise<number> {
  const config = s3ConfigFromEnv();
  const body = await getObject(config, key);
  writeFileSync(filePath, body);
  return body.length;
}

const __filename = fileURLToPath(import.meta.url);
const isMain = !!process.argv[1] && resolve(process.argv[1]) === __filename;

if (isMain) {
  const key = process.argv[2];
  const filePath = process.argv[3];
  if (key === undefined || filePath === undefined) {
    console.error("Usage: yarn dlx tsx scripts/remote/getObjectCli.ts <object-key> <file>");
    process.exit(1);
  }
  const bytes = await downloadObject(key, filePath);
  console.log(`downloaded ${key} -> ${filePath} (${bytes} bytes)`);
}
