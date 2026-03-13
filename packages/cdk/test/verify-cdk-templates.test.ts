// eslint-disable-next-line import/order
import { chdir } from "node:process";

chdir("../..");

// eslint-disable-next-line import/first
import { describe, expect, it } from "vitest";

// eslint-disable-next-line import/first
import { app } from "../src/app";

// Filters down to the main stacks we are interested in.
const stackArtifacts = app.synth().stacks;

// Actually snapshot tests the stacks.
describe("CloudFormation Templates Match Snapshots", () => {
  it.each(stackArtifacts)("$stackName", async ({ template, displayName }) =>
    expect(template).toMatchFileSnapshot("__snapshots__/" + displayName + ".snap"),
  );
});
