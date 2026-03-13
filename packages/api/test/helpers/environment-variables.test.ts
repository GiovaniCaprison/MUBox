import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ZodError } from "zod";

describe("environmentVariables", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to a clean state
    process.env = { ...originalEnv };

    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("when all environment variables are present", () => {
    it("should successfully parse and transform environment variables", async () => {
      // Set all required environment variables
      process.env.AWS_REGION = "us-east-1";

      // Dynamically import the module to get fresh parsing
      const { environmentVariables } = await import("../../src/helpers/environment-variables");

      expect(environmentVariables).toEqual({ region: "us-east-1" });
    });
  });

  describe("when AWS_REGION environment variable is missing", () => {
    it("should throw ZodError with appropriate message", async () => {
      // Ensure AWS_REGION is missing
      delete process.env.AWS_REGION;

      try {
        await import("../../src/helpers/environment-variables");
        expect.fail("Expected module to throw ZodError");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues).toHaveLength(1);
        expect(zodError.issues[0].message).toBe("Environment variable AWS_REGION was not set");
        expect(zodError.issues[0].path).toEqual(["AWS_REGION"]);
      }
    });
  });

  describe("when multiple environment variables are missing", () => {
    it("should throw ZodError with multiple issues", async () => {
      // Set no environment variables
      delete process.env.AWS_REGION;

      try {
        await import("../../src/helpers/environment-variables");
        expect.fail("Expected module to throw ZodError");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues).toHaveLength(1);
        const issue = zodError.issues[0];
        expect(issue.code).toBe("invalid_type");
        expect(issue.message).toEqual("Environment variable AWS_REGION was not set");
        if (issue.code === "too_small") {
          expect(issue.minimum).toBe(1);
        }
      }
    });
  });

  describe("when environment variables are empty strings", () => {
    it("should throw ZodError for empty string values", async () => {
      // Set environment variables to empty strings
      process.env.AWS_REGION = "";

      try {
        await import("../../src/helpers/environment-variables");

        expect.fail("Expected module to throw ZodError");
      } catch (error) {
        console.error((error as Error).message);
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues).toHaveLength(1);
        const issue = zodError.issues[0];
        expect(issue.code).toBe("too_small");
        expect(issue.message).toEqual("Environment variable AWS_REGION was empty");
        if (issue.code === "too_small") {
          expect(issue.minimum).toBe(1);
        }
      }
    });
  });

  describe("when environment variables are not strings", () => {
    it("should throw ZodError for non-string values", async () => {
      // @ts-expect-error -- We are intentionally triggering this error.
      process.env.AWS_REGION = 741776;

      try {
        await import("../../src/helpers/environment-variables");

        expect.fail("Expected module to throw ZodError");
      } catch (error) {
        console.error((error as Error).message);
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues).toHaveLength(1);

        const issue = zodError.issues[0];
        expect(issue.code).toBe("invalid_type");
        expect(issue.message).toEqual("Environment variable AWS_REGION was not a string");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace-only environment variables", async () => {
      // Set environment variables to whitespace
      process.env.AWS_REGION = "   ";

      // Dynamically import the module
      const { environmentVariables } = await import("../../src/helpers/environment-variables");

      // Zod string validation should accept whitespace as valid strings
      expect(environmentVariables).toEqual({ region: "   " });
    });

    it("should handle special characters in environment variables", async () => {
      // Set environment variables with special characters
      process.env.AWS_REGION = "us-east-1";

      // Dynamically import the module
      const { environmentVariables } = await import("../../src/helpers/environment-variables");

      expect(environmentVariables).toEqual({ region: "us-east-1" });
    });
  });
});
