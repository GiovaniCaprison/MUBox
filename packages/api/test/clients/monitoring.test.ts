import { describe, expect, it, vi } from "vitest";

import { logger, metrics, tracer } from "../../src/clients/monitoring";
import { SERVICE_NAME } from "../../src/constants/service";

const mockLoggerInstance = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => vi.fn(() => mockLoggerInstance));
vi.mock("@aws-lambda-powertools/logger", () => ({ Logger: mockLogger }));

const mockMetricsInstance = vi.hoisted(() => vi.fn());
const mockMetrics = vi.hoisted(() => vi.fn(() => mockMetricsInstance));
vi.mock("@aws-lambda-powertools/metrics", () => ({ Metrics: mockMetrics }));

const mockTracerInstance = vi.hoisted(() => vi.fn());
const mockTracer = vi.hoisted(() => vi.fn(() => mockTracerInstance));
vi.mock("@aws-lambda-powertools/tracer", () => ({ Tracer: mockTracer }));

describe("Monitoring", () => {
  describe("Logger", () => {
    it("should initialize logger with correct service name", () => {
      expect(mockLogger).toHaveBeenCalledWith({ serviceName: SERVICE_NAME });
      expect(logger).toEqual(mockLoggerInstance);
    });
  });

  describe("Metrics", () => {
    it("should initialize metrics with correct configuration", () => {
      expect(mockMetrics).toHaveBeenCalledWith({
        namespace: SERVICE_NAME,
        serviceName: SERVICE_NAME,
      });
      expect(metrics).toEqual(mockMetricsInstance);
    });
  });

  describe("Tracer", () => {
    it("should initialize tracer with correct service name", () => {
      expect(mockTracer).toHaveBeenCalledWith({ serviceName: SERVICE_NAME });
      expect(tracer).toEqual(mockTracerInstance);
    });
  });
});
