import { describe, it, expect, mock, beforeEach } from "bun:test";

const capturedQueryOptions: Array<{
  queryKey: unknown[];
  queryFn: () => unknown;
}> = [];

const capturedKyGetCalls: Array<{ url: string; options: RequestInit }> = [];

const mockKyGet = mock((url: string, options: RequestInit) => {
  capturedKyGetCalls.push({ url, options });
  return {
    json: mock(() => Promise.resolve({})),
  };
});

mock.module("ky", () => ({
  default: {
    get: mockKyGet,
  },
}));

mock.module("@tanstack/react-query", () => ({
  useQuery: mock((options: { queryKey: unknown[]; queryFn: () => unknown }) => {
    capturedQueryOptions.push(options);
    return { data: undefined, isLoading: false, isError: false };
  }),
}));

mock.module("@/lib/api", () => ({
  BASE_URL: "http://localhost:8080",
}));

const {
  useAnalyticsOverview,
  useAnalyticsTimeSeries,
  useAnalyticsLatency,
  useAnalyticsCost,
  useAnalyticsErrors,
} = await import("./analytics");

function getLastQueryOpts() {
  const opts = capturedQueryOptions[capturedQueryOptions.length - 1];
  if (!opts) throw new Error("No query options captured");
  return opts;
}

function getLastKyCall() {
  const call = capturedKyGetCalls[capturedKyGetCalls.length - 1];
  if (!call) throw new Error("No ky.get calls captured");
  return call;
}

describe("useAnalyticsOverview", () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
    capturedKyGetCalls.length = 0;
  });

  it("query key: ['analytics', 'overview', '1D']", () => {
    useAnalyticsOverview("1D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "overview", "1D"]);
  });

  it("query key: ['analytics', 'overview', '1H']", () => {
    useAnalyticsOverview("1H");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "overview", "1H"]);
  });

  it("query key: ['analytics', 'overview', '15M']", () => {
    useAnalyticsOverview("15M");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "overview", "15M"]);
  });

  it("query key: ['analytics', 'overview', '7D']", () => {
    useAnalyticsOverview("7D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "overview", "7D"]);
  });

  it("URL: /v1/analytics/overview?interval=1D", async () => {
    useAnalyticsOverview("1D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().url).toBe(
      "http://localhost:8080/v1/analytics/overview?interval=1D",
    );
  });

  it("credentials: include", async () => {
    useAnalyticsOverview("1D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().options.credentials).toBe("include");
  });
});

describe("useAnalyticsTimeSeries", () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
    capturedKyGetCalls.length = 0;
  });

  it("query key: ['analytics', 'timeseries', '1D']", () => {
    useAnalyticsTimeSeries("1D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "timeseries", "1D"]);
  });

  it("query key: ['analytics', 'timeseries', '7D']", () => {
    useAnalyticsTimeSeries("7D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "timeseries", "7D"]);
  });

  it("URL: /v1/analytics/timeseries?interval=1H", async () => {
    useAnalyticsTimeSeries("1H");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().url).toBe(
      "http://localhost:8080/v1/analytics/timeseries?interval=1H",
    );
  });

  it("credentials: include", async () => {
    useAnalyticsTimeSeries("1D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().options.credentials).toBe("include");
  });
});

describe("useAnalyticsLatency", () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
    capturedKyGetCalls.length = 0;
  });

  it("query key: ['analytics', 'latency', '1D']", () => {
    useAnalyticsLatency("1D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "latency", "1D"]);
  });

  it("query key: ['analytics', 'latency', '15M']", () => {
    useAnalyticsLatency("15M");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "latency", "15M"]);
  });

  it("URL: /v1/analytics/latency?interval=7D", async () => {
    useAnalyticsLatency("7D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().url).toBe(
      "http://localhost:8080/v1/analytics/latency?interval=7D",
    );
  });

  it("credentials: include", async () => {
    useAnalyticsLatency("1D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().options.credentials).toBe("include");
  });
});

describe("useAnalyticsCost", () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
    capturedKyGetCalls.length = 0;
  });

  it("query key: ['analytics', 'cost', '1D']", () => {
    useAnalyticsCost("1D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "cost", "1D"]);
  });

  it("query key: ['analytics', 'cost', '1H']", () => {
    useAnalyticsCost("1H");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "cost", "1H"]);
  });

  it("URL: /v1/analytics/cost?interval=15M", async () => {
    useAnalyticsCost("15M");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().url).toBe(
      "http://localhost:8080/v1/analytics/cost?interval=15M",
    );
  });

  it("credentials: include", async () => {
    useAnalyticsCost("1D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().options.credentials).toBe("include");
  });
});

describe("useAnalyticsErrors", () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
    capturedKyGetCalls.length = 0;
  });

  it("query key: ['analytics', 'errors', '1D']", () => {
    useAnalyticsErrors("1D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "errors", "1D"]);
  });

  it("query key: ['analytics', 'errors', '7D']", () => {
    useAnalyticsErrors("7D");
    expect(getLastQueryOpts().queryKey).toEqual(["analytics", "errors", "7D"]);
  });

  it("URL: /v1/analytics/errors?interval=1H", async () => {
    useAnalyticsErrors("1H");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().url).toBe(
      "http://localhost:8080/v1/analytics/errors?interval=1H",
    );
  });

  it("credentials: include", async () => {
    useAnalyticsErrors("1D");
    await getLastQueryOpts().queryFn();
    expect(getLastKyCall().options.credentials).toBe("include");
  });
});

describe("All hooks - interval propagation to URL", () => {
  beforeEach(() => {
    capturedQueryOptions.length = 0;
    capturedKyGetCalls.length = 0;
  });

  const intervals = ["15M", "1H", "1D", "7D"] as const;

  for (const interval of intervals) {
    it(`useAnalyticsOverview URL contains interval=${interval}`, async () => {
      useAnalyticsOverview(interval);
      await getLastQueryOpts().queryFn();
      expect(getLastKyCall().url).toContain(`interval=${interval}`);
    });

    it(`useAnalyticsTimeSeries URL contains interval=${interval}`, async () => {
      useAnalyticsTimeSeries(interval);
      await getLastQueryOpts().queryFn();
      expect(getLastKyCall().url).toContain(`interval=${interval}`);
    });

    it(`useAnalyticsLatency URL contains interval=${interval}`, async () => {
      useAnalyticsLatency(interval);
      await getLastQueryOpts().queryFn();
      expect(getLastKyCall().url).toContain(`interval=${interval}`);
    });

    it(`useAnalyticsCost URL contains interval=${interval}`, async () => {
      useAnalyticsCost(interval);
      await getLastQueryOpts().queryFn();
      expect(getLastKyCall().url).toContain(`interval=${interval}`);
    });

    it(`useAnalyticsErrors URL contains interval=${interval}`, async () => {
      useAnalyticsErrors(interval);
      await getLastQueryOpts().queryFn();
      expect(getLastKyCall().url).toContain(`interval=${interval}`);
    });
  }
});
