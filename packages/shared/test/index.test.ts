import { describe, expect, it } from "vitest";

import { GLOBAL_INFRASTRUCTURE_REGION, OPERATIONS, REGIONS } from "../src";

describe("operations", () => {
  it("OPERATIONS", () => {
    expect(OPERATIONS).toEqual({
      GET_CURRENT_USER_ID: "GetCurrentUserId",
      GET_REGION: "GetRegion",
    });
  });
});

describe("regions", () => {
  it("REGIONS", () => {
    expect(REGIONS).toEqual([
      {
        alias: "SYD",
        id: "ap-southeast-2",
        name: "🇦🇺 Asia Pacific (Sydney)",
      },
      {
        alias: "DUB",
        id: "eu-west-1",
        name: "🇮🇪 Europe (Ireland)",
      },
      {
        alias: "IAD",
        id: "us-east-1",
        name: "🇺🇸 US East (N. Virginia)",
      },
      {
        alias: "PDX",
        id: "us-west-2",
        name: "🇺🇸 US West (Oregon)",
      },
    ]);
  });

  it("GLOBAL_INFRASTRUCTURE_REGION", () => {
    expect(GLOBAL_INFRASTRUCTURE_REGION).toEqual({
      alias: "IAD",
      id: "us-east-1",
      name: "🇺🇸 US East (N. Virginia)",
    });
  });
});
