import { describe, it, expect } from "bun:test";

function formatTotalRequests(total_requests: number): string {
  return total_requests.toLocaleString();
}

function formatAvgLatency(avg_latency_ms: number): string {
  return `${Math.round(avg_latency_ms)}ms`;
}

function formatTotalCost(total_cost_usd: number): string {
  return `$${total_cost_usd.toFixed(2)}`;
}

function formatErrorRate(error_rate: number): string {
  return `${(error_rate * 100).toFixed(1)}%`;
}

describe("OverviewCards number formatting", () => {
  describe("Total Requests - comma separators", () => {
    it("formats 12345 as '12,345'", () => {
      expect(formatTotalRequests(12345)).toBe("12,345");
    });

    it("formats 1000000 with commas", () => {
      expect(formatTotalRequests(1000000)).toBe("1,000,000");
    });

    it("formats 0 as '0'", () => {
      expect(formatTotalRequests(0)).toBe("0");
    });

    it("formats 999 without comma", () => {
      expect(formatTotalRequests(999)).toBe("999");
    });

    it("formats 1000 as '1,000'", () => {
      expect(formatTotalRequests(1000)).toBe("1,000");
    });
  });

  describe("Avg Latency - integer with ms suffix", () => {
    it("formats 123.456 as '123ms'", () => {
      expect(formatAvgLatency(123.456)).toBe("123ms");
    });

    it("rounds 99.9 to '100ms'", () => {
      expect(formatAvgLatency(99.9)).toBe("100ms");
    });

    it("rounds 50.4 to '50ms'", () => {
      expect(formatAvgLatency(50.4)).toBe("50ms");
    });

    it("formats 0 as '0ms'", () => {
      expect(formatAvgLatency(0)).toBe("0ms");
    });

    it("formats 1500.7 as '1501ms'", () => {
      expect(formatAvgLatency(1500.7)).toBe("1501ms");
    });
  });

  describe("Total Cost - dollar format", () => {
    it("formats 1.2345 as '$1.23'", () => {
      expect(formatTotalCost(1.2345)).toBe("$1.23");
    });

    it("formats 0 as '$0.00'", () => {
      expect(formatTotalCost(0)).toBe("$0.00");
    });

    it("formats 10.999 as '$11.00'", () => {
      expect(formatTotalCost(10.999)).toBe("$11.00");
    });

    it("formats 0.005 as '$0.01'", () => {
      expect(formatTotalCost(0.005)).toBe("$0.01");
    });

    it("formats 100 as '$100.00'", () => {
      expect(formatTotalCost(100)).toBe("$100.00");
    });
  });

  describe("Error Rate - percentage format", () => {
    it("formats 0.025 as '2.5%'", () => {
      expect(formatErrorRate(0.025)).toBe("2.5%");
    });

    it("formats 0 as '0.0%'", () => {
      expect(formatErrorRate(0)).toBe("0.0%");
    });

    it("formats 1 as '100.0%'", () => {
      expect(formatErrorRate(1)).toBe("100.0%");
    });

    it("formats 0.1 as '10.0%'", () => {
      expect(formatErrorRate(0.1)).toBe("10.0%");
    });

    it("formats 0.001 as '0.1%'", () => {
      expect(formatErrorRate(0.001)).toBe("0.1%");
    });

    it("formats 0.005 as '0.5%'", () => {
      expect(formatErrorRate(0.005)).toBe("0.5%");
    });
  });

  describe("Sample data from task spec", () => {
    const overview = {
      total_requests: 12345,
      avg_latency_ms: 123.456,
      total_cost_usd: 1.2345,
      error_rate: 0.025,
    };

    it("total_requests 12345 → '12,345'", () => {
      expect(formatTotalRequests(overview.total_requests)).toBe("12,345");
    });

    it("avg_latency_ms 123.456 → '123ms'", () => {
      expect(formatAvgLatency(overview.avg_latency_ms)).toBe("123ms");
    });

    it("total_cost_usd 1.2345 → '$1.23'", () => {
      expect(formatTotalCost(overview.total_cost_usd)).toBe("$1.23");
    });

    it("error_rate 0.025 → '2.5%'", () => {
      expect(formatErrorRate(overview.error_rate)).toBe("2.5%");
    });
  });
});
