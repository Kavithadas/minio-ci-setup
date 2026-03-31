// tests/integration/s3.test.js
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { test } from "node:test";
import assert from "node:assert";

// ── Client setup ─────────────────────────────────────────────────────────────
// All config comes from env vars set by the GitHub Actions workflow.
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,        // http://localhost:9000
  region:   process.env.AWS_REGION,         // us-east-1 (MinIO ignores this)
  forcePathStyle: true,                     // REQUIRED for MinIO
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const Bucket = process.env.TEST_BUCKET;    // "integration-tests"

// ── Tests ─────────────────────────────────────────────────────────────────────

test("upload and retrieve an object", async () => {
  const Key  = "hello.txt";
  const Body = "world";

  await s3.send(new PutObjectCommand({ Bucket, Key, Body }));

  const res  = await s3.send(new GetObjectCommand({ Bucket, Key }));
  const text = await res.Body.transformToString();

  assert.equal(text, Body);
});

test("list objects includes uploaded file", async () => {
  const Key = "listed-file.txt";
  await s3.send(new PutObjectCommand({ Bucket, Key, Body: "data" }));

  const res = await s3.send(new ListObjectsV2Command({ Bucket }));
  const keys = res.Contents?.map((o) => o.Key) ?? [];

  assert.ok(keys.includes(Key), `Expected ${Key} in listing`);
});

test("delete an object", async () => {
  const Key = "to-delete.txt";
  await s3.send(new PutObjectCommand({ Bucket, Key, Body: "bye" }));
  await s3.send(new DeleteObjectCommand({ Bucket, Key }));

  const res  = await s3.send(new ListObjectsV2Command({ Bucket }));
  const keys = res.Contents?.map((o) => o.Key) ?? [];

  assert.ok(!keys.includes(Key), `Expected ${Key} to be deleted`);
});
