import { createHash, createHmac } from "node:crypto";

export interface S3Config {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

export interface SignedRequest {
  readonly url: string;
  readonly headers: Record<string, string>;
}

const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

export function encodeObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function toAmzDate(now: Date): string {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export function signS3Request(
  config: S3Config,
  method: "GET" | "PUT",
  key: string,
  body: Buffer,
  now: Date,
): SignedRequest {
  const base = config.endpoint.replace(/\/$/, "");
  const url = new URL(`${base}/${config.bucket}/${encodeObjectKey(key)}`);
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `host:${url.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), SERVICE),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization =
    `${ALGORITHM} Credential=${config.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: url.toString(),
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

export async function putObject(
  config: S3Config,
  key: string,
  body: Buffer,
  contentType = "application/x-ndjson",
): Promise<void> {
  const signed = signS3Request(config, "PUT", key, body, new Date());
  const payload = new Uint8Array(body.byteLength);
  payload.set(body);
  const res = await fetch(signed.url, {
    method: "PUT",
    headers: { ...signed.headers, "content-type": contentType },
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`S3 PUT ${key} failed: ${res.status} ${await res.text()}`);
  }
}

export async function getObject(config: S3Config, key: string): Promise<Buffer> {
  const signed = signS3Request(config, "GET", key, Buffer.alloc(0), new Date());
  const res = await fetch(signed.url, { method: "GET", headers: signed.headers });
  if (!res.ok) {
    throw new Error(`S3 GET ${key} failed: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export function s3ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): S3Config {
  const endpoint = env.AWS_ENDPOINT_URL_S3 ?? env.S3_ENDPOINT;
  const bucket = env.BROWSLATRO_DATASET_BUCKET ?? env.AWS_BUCKET_NAME;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const region = env.AWS_REGION ?? "auto";

  const missing = [
    ["AWS_ENDPOINT_URL_S3 / S3_ENDPOINT", endpoint],
    ["BROWSLATRO_DATASET_BUCKET / AWS_BUCKET_NAME", bucket],
    ["AWS_ACCESS_KEY_ID", accessKeyId],
    ["AWS_SECRET_ACCESS_KEY", secretAccessKey],
  ].filter(([, value]) => value === undefined || value === "");

  if (missing.length > 0) {
    throw new Error(`missing S3 configuration: ${missing.map(([name]) => name).join(", ")}`);
  }

  return {
    endpoint: endpoint as string,
    region,
    bucket: bucket as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
  };
}
