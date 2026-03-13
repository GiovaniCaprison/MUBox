import { beforeEach, describe, expect, it, vi } from "vitest";

import { monitorOperation, publishMetricsWithDimensions, type Metric } from "../../src/helpers/monitoring";

const mockSubsegment = vi.hoisted(() => ({
  addErrorFlag: vi.fn(),
  close: vi.fn(),
  addNewSubsegment: vi.fn(),
}));

const mockSegment = vi.hoisted(() => ({
  addNewSubsegment: vi.fn(() => mockSubsegment),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

const mockMetrics = vi.hoisted(() => ({
  addDimensions: vi.fn(),
  addMetric: vi.fn(),
  publishStoredMetrics: vi.fn(),
}));

const mockTracer = vi.hoisted(() => ({
  getSegment: vi.fn(() => mockSegment),
  setSegment: vi.fn(),
}));

// Mock the monitoring clients
vi.mock("../../src/clients/monitoring", () => ({
  logger: mockLogger,
  metrics: mockMetrics,
  tracer: mockTracer,
}));

const mockPerformance = vi.spyOn(performance, "now");

describe("Monitoring Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // First call returns 1000, second call returns 1500 to simulate 500ms elapsed
    mockPerformance.mockReturnValueOnce(1000).mockReturnValueOnce(1500);
  });

  describe("monitorOperation", () => {
    it("should successfully monitor an operation that succeeds", async () => {
      const operationLogic = (arg1: string, arg2: string) => `Success:arg1:${arg1},arg2:${arg2}`;
      const monitoredOperation = monitorOperation("TestOperation", operationLogic);

      const result = await monitoredOperation("mockArg1", "mockArg2");

      expect(result).toBe("Success:arg1:mockArg1,arg2:mockArg2");
      expect(mockTracer.getSegment).toHaveBeenCalled();
      expect(mockSegment.addNewSubsegment).toHaveBeenCalledWith("TestOperation");
      expect(mockTracer.setSegment).toHaveBeenCalledWith(mockSubsegment);
      expect(mockLogger.info).toHaveBeenCalledWith("Executing operation logic", { operationName: "TestOperation" });
      expect(mockSubsegment.addErrorFlag).not.toHaveBeenCalled();
      expect(mockMetrics.addDimensions).toHaveBeenCalledWith({ Operation: "TestOperation" });
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Count", "Count", 1);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Latency", "Milliseconds", 500);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Success", "Count", 1);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Failure", "Count", 0);
      expect(mockSubsegment.close).toHaveBeenCalled();
      expect(mockTracer.setSegment).toHaveBeenCalledWith(mockSegment);
      expect(mockLogger.info).toHaveBeenCalledWith("Successfully performed operation", {
        response: "Success:arg1:mockArg1,arg2:mockArg2",
        latency: 500,
        operationName: "TestOperation",
      });
    });

    it("should handle an operation that throws an error", async () => {
      const error = new Error("Test error");
      const operationLogic = vi.fn().mockRejectedValue(error);
      const monitoredOperation = monitorOperation("ErrorOperation", operationLogic);

      await expect(monitoredOperation("arg1")).rejects.toThrow("Test error");

      expect(mockSubsegment.addErrorFlag).toHaveBeenCalled();
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Success", "Count", 0);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Failure", "Count", 1);
      expect(mockLogger.error).toHaveBeenCalledWith("Operation threw an error", {
        error,
        latency: 500,
        operationName: "ErrorOperation",
      });
    });

    it("should handle an operation with response error", async () => {
      const mockErrorOperationResult = { status: "error", message: "Something went wrong" };
      const mockErrorOperation = () => mockErrorOperationResult;
      const isResponseError = vi.fn().mockReturnValue(true);

      const monitoredOperation = monitorOperation("ResponseErrorOperation", mockErrorOperation, { isResponseError });

      const result = await monitoredOperation();

      expect(result).toEqual(mockErrorOperationResult);
      expect(isResponseError).toHaveBeenCalledWith(mockErrorOperationResult);
      expect(mockSubsegment.addErrorFlag).toHaveBeenCalled();
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Success", "Count", 0);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("Failure", "Count", 1);
      expect(mockLogger.error).toHaveBeenCalledWith("Response from operation had an error", {
        response: mockErrorOperationResult,
        latency: 500,
        operationName: "ResponseErrorOperation",
      });
    });

    it("should include additional dimensions when provided", async () => {
      const operationLogic = vi.fn().mockResolvedValue("success");
      const additionalDimensions = vi.fn().mockReturnValue({ Service: "TestService", Region: "us-west-2" });

      const monitoredOperation = monitorOperation("DimensionsOperation", operationLogic, { additionalDimensions });

      await monitoredOperation("arg1");

      expect(additionalDimensions).toHaveBeenCalledWith("arg1");
      expect(mockMetrics.addDimensions).toHaveBeenCalledWith({
        Operation: "DimensionsOperation",
        Service: "TestService",
        Region: "us-west-2",
      });
    });

    it("should include additional metrics when provided", async () => {
      const operationLogic = vi.fn().mockResolvedValue("success");
      const additionalMetric = vi.fn().mockReturnValue({
        name: "CustomMetric",
        unit: "Count",
        value: 42,
      });

      const monitoredOperation = monitorOperation("MetricsOperation", operationLogic, {
        additionalMetrics: [additionalMetric],
      });

      await monitoredOperation("arg1");

      expect(additionalMetric).toHaveBeenCalled();
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("CustomMetric", "Count", 42);
    });

    it("should handle synchronous operations", async () => {
      const mockSynchronousOperationResult = () => "Mock Synchronous Operation Result";
      const mockSynchronousOperation = () => mockSynchronousOperationResult;
      const monitoredOperation = monitorOperation("SyncOperation", mockSynchronousOperation);

      const result = await monitoredOperation();

      expect(result).toBe(mockSynchronousOperationResult);
      expect(mockLogger.info).toHaveBeenCalledWith("Successfully performed operation", {
        response: mockSynchronousOperationResult,
        latency: 500,
        operationName: "SyncOperation",
      });
    });

    it("should preserve 'this' context", async () => {
      const context = { value: "test context" };
      const operationLogic = vi.fn(function (this: typeof context) {
        return this.value;
      });

      const monitoredOperation = monitorOperation("ContextOperation", operationLogic);

      const result = await monitoredOperation.call(context);

      expect(result).toBe("test context");
      expect(operationLogic).toHaveBeenCalledWith();
    });
  });

  describe("publishMetricsWithDimensions", () => {
    it("should publish metrics with the provided dimensions", () => {
      const testMetrics: Metric[] = [
        { name: "TestMetric1", unit: "Count", value: 1 },
        { name: "TestMetric2", unit: "Milliseconds", value: 500 },
      ];

      const dimensions = { Service: "TestService", Operation: "TestOperation" };

      publishMetricsWithDimensions(testMetrics, dimensions);

      expect(mockMetrics.addDimensions).toHaveBeenCalledWith(dimensions);
      expect(mockMetrics.addMetric).toHaveBeenCalledTimes(2);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("TestMetric1", "Count", 1);
      expect(mockMetrics.addMetric).toHaveBeenCalledWith("TestMetric2", "Milliseconds", 500);
      expect(mockMetrics.publishStoredMetrics).toHaveBeenCalledTimes(1);
    });
  });
});
