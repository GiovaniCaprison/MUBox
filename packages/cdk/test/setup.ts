import { expect, vi } from "vitest";

const mockAssetDirectory = `${import.meta.dirname}/mock-asset`;

// Mocks Lambda asset code to point to a stable file.
vi.mock("aws-cdk-lib/aws-lambda", async (importActual) => {
  const actualModule = await importActual<typeof import("aws-cdk-lib/aws-lambda")>();

  return {
    ...actualModule,
    AssetCode: vi.fn(() => new actualModule.AssetCode(mockAssetDirectory)),
  };
});

// Mocks S3 asset code to point to a stable file.
vi.mock("aws-cdk-lib/aws-s3-deployment", async (importActual) => {
  const actualModule = await importActual<typeof import("aws-cdk-lib/aws-s3-deployment")>();

  return {
    ...actualModule,
    Source: {
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...actualModule.Source,
      asset: vi.fn(() => actualModule.Source.asset(mockAssetDirectory)),
    },
  };
});

// This ensures consistent test snapshot generation between runs for any constructs that produce asset hashes
const FILE_HASH_REGEX = /asset.([A-Fa-f0-9]{64})/;
expect.addSnapshotSerializer({
  test: (val) => typeof val === "string" && FILE_HASH_REGEX.test(val),
  serialize: (val: string) => `"${val.replace(FILE_HASH_REGEX, "asset.[HASH REMOVED]")}"`,
});

// This ensures consistent test snapshot generation between runs for any Lambda versions
const LAMBDA_VERSION_REGEX = /CurrentVersion([A-Fa-f0-9]{40})/;
expect.addSnapshotSerializer({
  test: (val) => typeof val === "string" && LAMBDA_VERSION_REGEX.test(val),
  serialize: (val: string) => `"${val.replace(LAMBDA_VERSION_REGEX, "CurrentVersion[HASH REMOVED]")}"`,
});

// Removes the unique AWS::CDK::Metadata analytics property which is inconsistent between runs
expect.addSnapshotSerializer({
  test: (val) => typeof val === "string" && val.includes("v2:deflate64:"),
  serialize: () => "[ANALYTICS REMOVED]",
});

/**
 * Removes the metadata keys given they are metadata and not core to the functionality of the application and just bloat snapshots making them more
 * difficult to review for actual functional changes.
 */
const METADATA_KEY = "Metadata";
expect.addSnapshotSerializer({
  test: (val) => typeof val === "object" && Object.prototype.hasOwnProperty.call(val, METADATA_KEY),
  serialize: (obj: { [METADATA_KEY]?: string }, config, indentation, depth, refs, printer) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete obj[METADATA_KEY];

    return printer(obj, config, indentation, depth, refs);
  },
});

/**
 * Removes tags from snapshots given they are metadata and not core to the functionality of the application and just bloat snapshots making them more
 * difficult to review for actual functional changes.
 */
const TAGS_KEY = "Tags";
expect.addSnapshotSerializer({
  test: (val) => typeof val === "object" && Object.prototype.hasOwnProperty.call(val, TAGS_KEY),
  serialize: (obj: { [TAGS_KEY]?: string }, config, indentation, depth, refs, printer) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete obj[TAGS_KEY];

    return printer(obj, config, indentation, depth, refs);
  },
});
