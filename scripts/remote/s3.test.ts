// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import {
  encodeObjectKey,
  s3ConfigFromEnv,
  signS3Request,
  type S3Config,
} from "./s3";

const CONFIG: S3Config = {
  endpoint: "https://fly.storage.tigris.dev",
  region: "auto",
  bucket: "browslatro",
  accessKeyId: "AKID",
  secretAccessKey: "SECRET",
};

const FIXED = new Date("2026-06-26T12:00:00.000Z");

describe("encodeObjectKey", () => {
  test("preserves slashes while encoding segments", () => {
    expect(encodeObjectKey("datasets/run 1/shard-0.jsonl")).toBe("datasets/run%201/shard-0.jsonl");
  });
});

describe("signS3Request", () => {
  test("builds a path-style url", () => {
    const signed = signS3Request(CONFIG, "PUT", "datasets/run1/shard-0.jsonl", Buffer.from("x"), FIXED);
    expect(signed.url).toBe("https://fly.storage.tigris.dev/browslatro/datasets/run1/shard-0.jsonl");
  });

  test("sets x-amz-date from the supplied clock", () => {
    const signed = signS3Request(CONFIG, "GET", "k", Buffer.alloc(0), FIXED);
    expect(signed.headers["x-amz-date"]).toBe("20260626T120000Z");
  });

  test("hashes the payload into x-amz-content-sha256", () => {
    const body = Buffer.from("payload");
    const signed = signS3Request(CONFIG, "PUT", "k", body, FIXED);
    expect(signed.headers["x-amz-content-sha256"]).toBe(
      createHash("sha256").update(body).digest("hex"),
    );
  });

  test("scopes the credential to region and s3 service", () => {
    const signed = signS3Request(CONFIG, "GET", "k", Buffer.alloc(0), FIXED);
    expect(signed.headers.Authorization).toContain("Credential=AKID/20260626/auto/s3/aws4_request");
  });

  test("is deterministic for identical inputs", () => {
    const a = signS3Request(CONFIG, "PUT", "k", Buffer.from("x"), FIXED);
    const b = signS3Request(CONFIG, "PUT", "k", Buffer.from("x"), FIXED);
    expect(a.headers.Authorization).toBe(b.headers.Authorization);
  });

  test("changes the signature when the payload changes", () => {
    const a = signS3Request(CONFIG, "PUT", "k", Buffer.from("x"), FIXED);
    const b = signS3Request(CONFIG, "PUT", "k", Buffer.from("y"), FIXED);
    expect(a.headers.Authorization).not.toBe(b.headers.Authorization);
  });
});

describe("s3ConfigFromEnv", () => {
  test("reads a complete configuration from env", () => {
    const config = s3ConfigFromEnv({
      AWS_ENDPOINT_URL_S3: "https://fly.storage.tigris.dev",
      BROWSLATRO_DATASET_BUCKET: "browslatro",
      AWS_ACCESS_KEY_ID: "AKID",
      AWS_SECRET_ACCESS_KEY: "SECRET",
    });
    expect(config.bucket).toBe("browslatro");
  });

  test("defaults region to auto", () => {
    const config = s3ConfigFromEnv({
      AWS_ENDPOINT_URL_S3: "https://e",
      BROWSLATRO_DATASET_BUCKET: "b",
      AWS_ACCESS_KEY_ID: "k",
      AWS_SECRET_ACCESS_KEY: "s",
    });
    expect(config.region).toBe("auto");
  });

  test("throws listing the missing variables", () => {
    expect(() => s3ConfigFromEnv({})).toThrow(/missing S3 configuration/);
  });
});
