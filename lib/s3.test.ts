import { s3SendMock } from "@/tests/mocks/aws-s3";
import { describe, it, expect, afterEach } from "vitest";
import { isS3Configured, uploadImage, deleteImage } from "@/lib/s3";

const BUCKET = process.env.S3_BUCKET_NAME!;
const BASE_URL = process.env.S3_BASE_URL!;

const REQUIRED_ENV_VARS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "S3_BASE_URL",
] as const;

describe("isS3Configured", () => {
  afterEach(() => {
    // Restore whatever value vitest.setup.ts originally assigned, in case a
    // test in this block deleted it.
    process.env.AWS_ACCESS_KEY_ID ??= "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY ??= "test-secret-key";
    process.env.S3_BUCKET_NAME ??= "test-bucket";
    process.env.S3_BASE_URL ??= "https://cdn.test.example.com";
  });

  it("returns true when all required env vars are set", () => {
    expect(isS3Configured()).toBe(true);
  });

  it.each(REQUIRED_ENV_VARS)("returns false when %s is missing", (varName) => {
    const original = process.env[varName];
    delete process.env[varName];

    expect(isS3Configured()).toBe(false);

    process.env[varName] = original;
  });
});

describe("uploadImage", () => {
  afterEach(() => {
    s3SendMock.mockClear();
  });

  it("sends a PutObjectCommand with the bucket, key, body, and content type", async () => {
    const file = Buffer.from("image-bytes");

    await uploadImage(file, "uploads/photo.png", "image/png");

    expect(s3SendMock).toHaveBeenCalledTimes(1);
    expect(s3SendMock.mock.calls[0][0].input).toEqual({
      Bucket: BUCKET,
      Key: "uploads/photo.png",
      Body: file,
      ContentType: "image/png",
    });
  });

  it("returns the base URL joined with the key", async () => {
    const file = Buffer.from("image-bytes");

    const url = await uploadImage(file, "uploads/photo.png", "image/png");

    expect(url).toBe(`${BASE_URL}/uploads/photo.png`);
  });
});

describe("deleteImage", () => {
  afterEach(() => {
    s3SendMock.mockClear();
  });

  it("does nothing when the URL does not start with the base URL", async () => {
    await deleteImage("https://other-cdn.example.com/uploads/photo.png");

    expect(s3SendMock).not.toHaveBeenCalled();
  });

  it("sends a DeleteObjectCommand with the bucket and extracted key when the URL matches the base URL", async () => {
    await deleteImage(`${BASE_URL}/uploads/photo.png`);

    expect(s3SendMock).toHaveBeenCalledTimes(1);
    expect(s3SendMock.mock.calls[0][0].input).toEqual({
      Bucket: BUCKET,
      Key: "uploads/photo.png",
    });
  });

  it("extracts a nested key correctly", async () => {
    await deleteImage(`${BASE_URL}/a/b/c/photo.png`);

    expect(s3SendMock.mock.calls[0][0].input).toEqual({
      Bucket: BUCKET,
      Key: "a/b/c/photo.png",
    });
  });
});
