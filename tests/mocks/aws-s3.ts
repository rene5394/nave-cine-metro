// Hand-rolled mock of @aws-sdk/client-s3 (no aws-sdk-client-mock dependency),
// used only by lib/s3.test.ts. lib/s3.ts instantiates `new S3Client(...)`
// once at module load time, so the mocked class shares one `send` spy across
// the whole test file.
const s3SendMock = vi.hoisted(() => vi.fn());
export { s3SendMock };

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    send = s3SendMock;
  }
  class PutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class DeleteObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return { S3Client, PutObjectCommand, DeleteObjectCommand };
});
