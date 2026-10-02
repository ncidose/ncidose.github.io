import { describe, expect, it, vi } from "vitest";
import portalWorker, { adminPortalActivityFilter, adminPortalActivityQueries, adminPortalExcludedEmails, adminRecentActivityQuery, adminSandboxActivityQueries, adminSandboxExcludedCities, adminSandboxReportingFilter, adminUsersQuery, announcementEmailHtml, canPublishQuestion, canViewDiscussion, communityDiscussionEmailsEnabled, discussionAuthorForUser, discussionReplyNotificationEmail, folderArchiveKeys, generateLoginCode, isFolderDownloadPrefix, linkedEmailWelcomeHtml, loginCodeEmailHtml, newDiscussionNotificationEmail, normalizeAdminUserDetails, normalizePortalEmail, normalizeQuestionVisibility, portalSessionCookieHeader, qaAttachmentValidationError, secondaryEmailAddedHtml, shouldNotifyDiscussionReplyRecipient, shouldNotifyNewDiscussionRecipient, vendorDemoErrorForUpstream, vendorDemoLimits, vendorDemoLocationForRequest, vendorDemoPresetForInput, vendorDemoPresets, vendorDemoRequestForInput, welcomeEmailHtml } from "../../scripts/portal/worker.js";

describe("admin activity query", () => {
  it("uses an indexed primary-identity join instead of a per-event correlated lookup", () => {
    expect(adminRecentActivityQuery).toContain("LEFT JOIN user_identities identities");
    expect(adminRecentActivityQuery).toContain("identities.user_id=events.user_id AND identities.is_primary=1");
    expect(adminRecentActivityQuery).toContain("WHERE event_type='login'");
    expect(adminRecentActivityQuery).toContain("WHERE event_type='download'");
    expect(adminRecentActivityQuery).not.toContain("(SELECT identities.normalized_email");
  });

  it("excludes the administrator account from every User Portal activity report", () => {
    expect(adminPortalExcludedEmails).toEqual(["choonsiklee@gmail.com"]);
    expect(adminPortalActivityFilter).toContain("LOWER(TRIM(excluded_identity.normalized_email))");
    for (const query of Object.values(adminPortalActivityQueries)) {
      expect(query).toContain("choonsiklee@gmail.com");
    }
  });

  it("aggregates every User Portal report for all selectable activity periods", () => {
    expect(adminPortalActivityQueries.summary).toContain("download_users_today");
    expect(adminPortalActivityQueries.summary).toContain("download_users_7_days");
    expect(adminPortalActivityQueries.summary).toContain("download_users_30_days");
    expect(adminPortalActivityQueries.summary).toContain("logins_today");
    expect(adminPortalActivityQueries.summary).toContain("logins_7_days");
    expect(adminPortalActivityQueries.summary).toContain("logins_30_days");
    for (const query of [adminPortalActivityQueries.tools, adminPortalActivityQueries.files]) {
      expect(query).toContain("downloads_today");
      expect(query).toContain("downloads_7_days");
      expect(query).toContain("downloads_30_days");
    }
    expect(adminRecentActivityQuery).toContain("within_today");
    expect(adminRecentActivityQuery).toContain("within_7_days");
    expect(adminRecentActivityQuery).toContain("datetime('now', '-30 days')");
  });

  it("excludes the Maryland test cities from every sandbox activity report", () => {
    expect(adminSandboxExcludedCities).toEqual(["rockville", "gaithersburg", "frederick"]);
    expect(adminSandboxReportingFilter).toContain("UPPER(TRIM(COALESCE(country_code, ''))) = 'US'");
    for (const query of Object.values(adminSandboxActivityQueries)) {
      expect(query).toContain("'rockville', 'gaithersburg', 'frederick'");
    }
  });

  it("aggregates API usage and locations for all selectable activity periods", () => {
    for (const query of [adminSandboxActivityQueries.tools, adminSandboxActivityQueries.locations]) {
      expect(query).toContain("datetime('now', '-1 day')");
      expect(query).toContain("datetime('now', '-7 days')");
      expect(query).toContain("datetime('now', '-30 days')");
    }
    expect(adminSandboxActivityQueries.tools).toContain("requests_today");
    expect(adminSandboxActivityQueries.tools).toContain("requests_7_days");
    expect(adminSandboxActivityQueries.tools).toContain("requests_30_days");
    expect(adminSandboxActivityQueries.locations).toContain("unique_clients_today");
    expect(adminSandboxActivityQueries.locations).toContain("unique_clients_7_days");
    expect(adminSandboxActivityQueries.locations).toContain("unique_clients_30_days");
  });
});

describe("admin users query", () => {
  it("aggregates login activity once instead of scanning it for every user", () => {
    expect(adminUsersQuery).toContain("WITH login_activity AS");
    expect(adminUsersQuery).toContain("GROUP BY user_id");
    expect(adminUsersQuery).toContain("LEFT JOIN last_logins");
    expect(adminUsersQuery).not.toContain("WHERE events.user_id=users.id");
    expect(adminUsersQuery).not.toContain("WHERE sessions.user_id=users.id");
  });
});

describe("public vendor API demo", () => {
  it("keeps only approximate Cloudflare location fields", () => {
    expect(vendorDemoLocationForRequest({ cf: { country: "us", city: " Washington\nDC ", latitude: "38.9", longitude: "-77.0" } })).toEqual({
      countryCode: "US",
      city: "WashingtonDC",
    });
    expect(vendorDemoLocationForRequest({ cf: { country: "USA", city: "" } })).toEqual({ countryCode: null, city: null });
    expect(vendorDemoLocationForRequest(new Request("https://portal.ncidosetools.com"))).toEqual({ countryCode: null, city: null });
  });

  it("reports the selected calculation service availability with usage", async () => {
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => ({ total: 2 })),
      run: vi.fn(async () => ({ success: true })),
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, service: "ncictapi" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo?tool=ncict", {
      headers: {
        "origin": "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.4",
      },
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      DB: { prepare: vi.fn(() => statement) },
    }, { waitUntil: vi.fn() });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      usage: { used: 2, limit: 30, remaining: 28, windowMinutes: 60 },
      service: { status: "available", checkedAt: expect.any(String) },
    });
    expect(fetch).toHaveBeenCalledWith(new URL("https://ncict-api.ncidosetools.com/health"), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("accepts bounded parameters and rejects arbitrary calculation input", () => {
    const valid = vendorDemoRequestForInput({
      presetId: "ncict-adult-chest",
      parameters: { age: 10, sex: "m", protocol: "abdomenPelvis", bodySizeMethod: "wed", wedCm: 25, heightCm: 145, weightKg: 40, kvp: 100, tcmStrength: 0.5, headBody: 1, ctdivol: 20 },
    });
    expect(valid?.payload).toMatchObject({ age: 10, sex: "m", wed: 25, start: 1006, end: 1009, kvp: 100, tcm_strength: 0.5, head_body: 1, ctdivol: 20 });
    expect(valid?.payload).not.toHaveProperty("height");
    expect(valid?.payload).not.toHaveProperty("weight");
    const heightWeight = vendorDemoRequestForInput({
      presetId: "ncict-adult-chest",
      parameters: { bodySizeMethod: "height-weight", heightCm: 175, weightKg: 80 },
    });
    expect(heightWeight?.payload).toMatchObject({ height: 175, weight: 80 });
    expect(heightWeight?.payload).not.toHaveProperty("wed");
    expect(vendorDemoRequestForInput({ presetId: "ncict-adult-chest", parameters: { history: 10000000 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncict-adult-chest", parameters: { ctdivol: 500 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncict-adult-chest", parameters: { wedCm: 500 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncict-adult-chest", parameters: { tcmStrength: -1 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "unknown", parameters: {} })).toBeNull();
    expect(vendorDemoPresetForInput({ presetId: "ncict-adult-chest" })).toBe(vendorDemoPresets["ncict-adult-chest"]);
  });

  it("allows bounded clinical-style NCINM text for fuzzy matching", () => {
    const defaults = vendorDemoRequestForInput({
      presetId: "ncinm-fdg-adult",
      parameters: {},
    });
    expect(defaults?.payload).toMatchObject({ phantom_library: 4 });
    const valid = vendorDemoRequestForInput({
      presetId: "ncinm-fdg-adult",
      parameters: { phantomLibrary: 1, sex: "male", age: 42, radiopharmaceutical: "  Tc99m MDP bone scan  ", administeredActivityMbq: 740 },
    });
    expect(valid?.payload).toMatchObject({
      phantom_library: 1,
      sex: "male",
      age: 42,
      radiopharmaceutical: "Tc99m MDP bone scan",
      administered_activity_mbq: 740,
    });
    const mesh = vendorDemoRequestForInput({
      presetId: "ncinm-fdg-adult",
      parameters: { phantomLibrary: 4 },
    });
    expect(mesh?.payload).toMatchObject({ phantom_library: 4 });
    expect(vendorDemoRequestForInput({ presetId: "ncinm-fdg-adult", parameters: { phantomLibrary: 3 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncinm-fdg-adult", parameters: { radiopharmaceutical: "" } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncinm-fdg-adult", parameters: { radiopharmaceutical: "F-18\nFDG" } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncinm-fdg-adult", parameters: { radiopharmaceutical: "x".repeat(121) } })).toBeNull();
  });

  it("classifies unmatched NCINM radiopharmaceuticals as actionable input errors", () => {
    const preset = vendorDemoPresets["ncinm-fdg-adult"];
    expect(vendorDemoErrorForUpstream(preset, 400, {
      error: "Invalid radiopharmaceutical: No close radiopharmaceutical match was found.",
    })).toEqual({
      error: "ncinm_radiopharmaceutical_not_found",
      httpStatus: 400,
      failureReason: "invalid_radiopharmaceutical",
    });
    expect(vendorDemoErrorForUpstream(preset, 400, {
      error: "Biokinetic data are unavailable for newborns.",
    })).toEqual({
      error: "ncinm_newborn_biokinetics_unavailable",
      httpStatus: 400,
      failureReason: "newborn_biokinetics_unavailable",
    });
    expect(vendorDemoErrorForUpstream(preset, 500, { error: "internal detail" })).toEqual({
      error: "demo_upstream_error",
      httpStatus: 502,
      failureReason: "upstream_error",
    });
  });

  it("keeps the public NCIRF example computationally bounded", () => {
    const preset = vendorDemoPresets["ncirf-size-demo"];
    const gpuPreset = vendorDemoPresets["ncirf-gpu-size-demo"];
    expect(preset.payload.Hist).toBe(1000000);
    expect(preset.payload.Thread).toBe(4);
    expect(preset.timeoutMs).toBe(30 * 60_000);
    expect(preset.pollIntervalMs).toBe(5_000);
    expect(gpuPreset.payload).toMatchObject({ Hist: 1000000, Thread: 4, PSDMode: 0 });
    expect(gpuPreset.endpoint).toBe("https://ncirfgpu-api.ncidosetools.com/param");
    const varied = vendorDemoRequestForInput({
      presetId: "ncirf-size-demo",
      parameters: {
        phantomLibrary: 5,
        age: 30,
        pregnantAge: "35wk",
        sex: "m",
        heightCm: 170,
        weightKg: 70,
        kvp: 80,
        hvlMmAl: 4.56,
        sidCm: 100,
        fieldWidthCm: 20,
        fieldHeightCm: 15,
        dapGyCm2: 250,
        ppaDeg: 90,
        psaDeg: -15,
        isoXCm: 20,
        isoYCm: 15,
        isoZCm: 90,
        tableCm: 2,
      },
    });
    expect(varied?.payload).toMatchObject({
      PhtLib: 5,
      Age: "35wk",
      SpectrumID: "builtin_036",
      kVp: 80,
      HVL: 4.56,
      SID: 100,
      FW: 20,
      FH: 15,
      DAP: 250,
      PPA: 90,
      PSA: -15,
      ISOZ: 90,
      Hist: 1000000,
      Thread: 4,
    });
    const gpuVaried = vendorDemoRequestForInput({
      presetId: "ncirf-gpu-size-demo",
      parameters: { phantomLibrary: 5, pregnantAge: "35wk" },
    });
    expect(gpuVaried?.payload).toMatchObject({
      PhtLib: 5,
      Age: "35wk",
      SpectrumID: "builtin_001",
      Hist: 1000000,
      Thread: 4,
      PSDMode: 0,
    });
    expect(vendorDemoRequestForInput({ presetId: "ncirf-size-demo", parameters: { Hist: 5000000 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncirf-size-demo", parameters: { threads: 8 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncirf-size-demo", parameters: { kvp: 60, hvlMmAl: 4.56 } })).toBeNull();
    expect(vendorDemoRequestForInput({ presetId: "ncirf-size-demo", parameters: { kvp: 102, hvlMmAl: 4.5 } })).toBeNull();
    expect(vendorDemoLimits.perIpHourly).toBe(30);
    expect(vendorDemoLimits.perIpThirtyMinutesNcirf).toBe(5);
    expect(vendorDemoLimits.globalDailyNcirf).toBe(60);
    expect(vendorDemoLimits.concurrentNcirf).toBe(3);
    expect(vendorDemoLimits.perIpThirtyMinutesNcirfGpu).toBe(5);
    expect(vendorDemoLimits.globalDailyNcirfGpu).toBe(100);
    expect(vendorDemoLimits.concurrentNcirfGpu).toBe(3);
  });

  it("counts the NCIRF hourly allowance separately from faster tool requests", async () => {
    const statements: string[] = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        statements.push(sql);
        const statement = {
          bind: vi.fn(() => statement),
          first: vi.fn(async () => ({ total: 0 })),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
      const href = String(url);
      if (href.endsWith("/jobs") && options?.method === "POST") {
        return new Response(JSON.stringify({ status_url: "/jobs/cpu-demo", result_url: "/jobs/cpu-demo/result" }), {
          status: 202,
          headers: { "content-type": "application/json" },
        });
      }
      if (href.endsWith("/result")) return Response.json({ ok: true });
      return Response.json({ status: "completed", duration_seconds: 2 });
    }));

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.4",
      },
      body: JSON.stringify({ presetId: "ncirf-size-demo", parameters: { dapGyCm2: 50 } }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-demo-key",
      DB: db,
    }, { waitUntil: vi.fn() });

    expect(response.status).toBe(200);
    expect(statements.some((sql) => sql.includes("request_ip_hash=? AND preset_id=?") && sql.includes("datetime('now', '-30 minutes')"))).toBe(true);
    expect(await response.json()).toMatchObject({
      usage: { used: 1, limit: 5, remaining: 4, windowMinutes: 30 },
      request: { Hist: 1000000, Thread: 4 },
      demo: { engine: "NCIRF CPU", histories: 1000000 },
    });
  });

  it("submits the GPU demo through the persistent queue with a separate key", async () => {
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => ({ total: 0 })),
      run: vi.fn(async () => ({ success: true })),
    };
    const upstreamFetch = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
      const href = String(url);
      if (href.endsWith("/jobs") && options?.method === "POST") {
        return new Response(JSON.stringify({ status_url: "/jobs/gpu-demo", result_url: "/jobs/gpu-demo/result" }), {
          status: 202,
          headers: { "content-type": "application/json" },
        });
      }
      if (href.endsWith("/result")) {
        return Response.json({ ok: true, patient_id: "public-vendor-gpu-demo", dose: { brain: 1 }, error_percent: { brain: 2 } });
      }
      return Response.json({ status: "completed", duration_seconds: 4 });
    });
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.5",
      },
      body: JSON.stringify({ presetId: "ncirf-gpu-size-demo", parameters: { phantomLibrary: 5, pregnantAge: "20wk" } }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-cpu-key",
      NCIDOSE_VENDOR_GPU_DEMO_API_KEY: "unit-test-gpu-key",
      DB: { prepare: vi.fn(() => statement) },
    }, { waitUntil: vi.fn() });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload).toMatchObject({
      demo: {
        presetId: "ncirf-gpu-size-demo",
        calculationDurationMs: 4000,
        engine: "NCIRF GPU",
        histories: 1000000,
        psdHistories: 100000,
      },
      usage: { used: 1, limit: 5, remaining: 4, windowMinutes: 30 },
      request: { PhtLib: 5, Age: "20wk", Hist: 1000000, Thread: 4, PSDMode: 0 },
    });
    const submission = upstreamFetch.mock.calls.find(([url, options]) => String(url).endsWith("/jobs") && options?.method === "POST");
    expect(submission).toBeDefined();
    expect(submission?.[1]?.headers).toMatchObject({ "x-api-key": "unit-test-gpu-key" });
    expect(JSON.stringify(payload)).not.toContain("unit-test-gpu-key");
  });

  it("streams the NCIRF queue position before the final result", async () => {
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => ({ total: 0 })),
      run: vi.fn(async () => ({ success: true })),
    };
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
      const href = String(url);
      if (href.endsWith("/jobs") && options?.method === "POST") {
        return Response.json({
          status: "queued",
          queue_position: 2,
          jobs_ahead: 1,
          estimated_wait_seconds: 42,
          status_url: "/jobs/cpu-stream-demo",
          result_url: "/jobs/cpu-stream-demo/result",
        }, { status: 202 });
      }
      if (href.endsWith("/result")) return Response.json({ ok: true, dose: { brain: 1 } });
      return Response.json({ status: "completed", duration_seconds: 33 });
    }));

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        accept: "application/x-ndjson",
        "content-type": "application/json",
        origin: "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.6",
      },
      body: JSON.stringify({ presetId: "ncirf-size-demo", parameters: {} }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-cpu-key",
      DB: { prepare: vi.fn(() => statement) },
    }, { waitUntil: vi.fn() });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events[0]).toMatchObject({
      event: "progress",
      queue: { status: "queued", queuePosition: 2, jobsAhead: 1, estimatedWaitSeconds: 42 },
      usage: { used: 1, limit: 5, remaining: 4, windowMinutes: 30 },
    });
    expect(events.at(-1)).toMatchObject({
      event: "result",
      httpStatus: 200,
      ok: true,
      demo: { engine: "NCIRF CPU", calculationDurationMs: 33000 },
    });
  });

  it("records rejected sandbox traffic without consuming more allowance", async () => {
    const statements: string[] = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        statements.push(sql);
        const statement = {
          bind: vi.fn(() => statement),
          first: vi.fn(async () => ({ total: sql.includes("request_ip_hash=?") ? 30 : 0 })),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.4",
      },
      body: JSON.stringify({ presetId: "ncict-adult-chest", parameters: {} }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-demo-key",
      DB: db,
    }, { waitUntil: vi.fn() });

    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: "too_many_demo_requests", usage: { used: 30, limit: 30, remaining: 0 } });
    expect(statements.some((sql) => sql.includes("counts_toward_limit=1") && sql.includes("request_ip_hash=?"))).toBe(true);
    expect(statements.some((sql) => sql.includes("counts_toward_limit, failure_reason, attempt_count") && sql.includes("ON CONFLICT(id) DO UPDATE"))).toBe(true);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("returns an actionable error when the NCINM fuzzy match fails", async () => {
    const completedRequests: unknown[][] = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn((...values: unknown[]) => {
            if (sql.includes("UPDATE vendor_demo_requests SET result=")) completedRequests.push(values);
            return statement;
          }),
          first: vi.fn(async () => ({ total: 0 })),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: false,
      status: 400,
      error: "Invalid radiopharmaceutical: No close radiopharmaceutical match was found.",
    }, { status: 400 })));

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.4",
      },
      body: JSON.stringify({ presetId: "ncinm-fdg-adult", parameters: { radiopharmaceutical: "choonsik i-131" } }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-demo-key",
      DB: db,
    }, { waitUntil: vi.fn() });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "ncinm_radiopharmaceutical_not_found" });
    expect(completedRequests).toContainEqual(["failed", 400, expect.any(Number), "invalid_radiopharmaceutical", expect.any(String)]);
  });

  it("identifies restart-like upstream statuses as temporary maintenance", async () => {
    const completedRequests: unknown[][] = [];
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = {
          bind: vi.fn((...values: unknown[]) => {
            if (sql.includes("UPDATE vendor_demo_requests SET result=")) completedRequests.push(values);
            return statement;
          }),
          first: vi.fn(async () => ({ total: 0 })),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Connection timed out", { status: 522 })));

    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.4",
      },
      body: JSON.stringify({ presetId: "ncict-adult-chest", parameters: {} }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-demo-key",
      DB: db,
    }, { waitUntil: vi.fn() });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "demo_server_maintenance" });
    expect(completedRequests).toContainEqual(["failed", 522, expect.any(Number), "upstream_maintenance", expect.any(String)]);
  });

  it("keeps the API key server-side while proxying the fixed payload", async () => {
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => ({ total: 0 })),
      run: vi.fn(async () => ({ success: true })),
    };
    const db = { prepare: vi.fn(() => statement) };
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, matched_phantom_id: "1050005" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", upstreamFetch);
    const waitUntil = vi.fn();
    const response = await portalWorker.fetch(new Request("https://portal.ncidosetools.com/api/public/vendor-demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "https://ncidose.github.io",
        "cf-connecting-ip": "192.0.2.4",
      },
      body: JSON.stringify({ presetId: "ncict-adult-chest", parameters: { age: 10, sex: "m", protocol: "head", kvp: 100, ctdivol: 20 } }),
    }), {
      ALLOWED_ORIGINS: "https://ncidose.github.io",
      AUTH_SECRET: "unit-test-auth-secret",
      NCIDOSE_VENDOR_DEMO_API_KEY: "unit-test-demo-key",
      DB: db,
    }, { waitUntil });
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.usage).toEqual({ used: 1, limit: 30, remaining: 29, windowMinutes: 60 });
    expect(payload.request).toMatchObject({ age: 10, sex: "m", start: 1001, end: 1003, kvp: 100, ctdivol: 20 });
    expect(JSON.stringify(payload)).not.toContain("unit-test-demo-key");
    expect(upstreamFetch).toHaveBeenCalledWith(
      "https://ncict-api.ncidosetools.com/param",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "unit-test-demo-key" }),
      }),
    );
    expect(JSON.parse(String(upstreamFetch.mock.calls[0][1].body))).toMatchObject({
      age: 10,
      sex: "m",
      start: 1001,
      end: 1003,
      kvp: 100,
      ctdivol: 20,
    });
  });
});

describe("portal email normalization", () => {
  it("normalizes a valid approved email", () => {
    expect(normalizePortalEmail("  Researcher@University.EDU ")).toBe("researcher@university.edu");
  });

  it("generates a six-digit one-time code", () => {
    expect(generateLoginCode()).toMatch(/^[0-9]{6}$/);
  });

  it("uses a host-only secure session cookie that JavaScript cannot read", () => {
    const header = portalSessionCookieHeader("secret-token");

    expect(header).toContain("__Host-ncidose_session=secret-token");
    expect(header).toContain("Max-Age=2592000");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).not.toContain("Domain=");
  });

  it("rejects malformed email values", () => {
    expect(normalizePortalEmail("not-an-email")).toBe("");
    expect(normalizePortalEmail("person@example")).toBe("");
  });

  it("normalizes editable admin user details and an optional secondary email", () => {
    expect(normalizeAdminUserDetails({
      institution: "  University of Utah  ",
      country: "  United States ",
      secondaryEmail: " Seth.Streitmatter@Gmail.com ",
    })).toEqual({
      hasInstitution: true,
      institution: "University of Utah",
      hasCountry: true,
      country: "United States",
      hasSecondaryEmail: true,
      secondaryEmail: "seth.streitmatter@gmail.com",
      invalidSecondaryEmail: false,
    });
    expect(normalizeAdminUserDetails({ secondaryEmail: "not-an-email" }).invalidSecondaryEmail).toBe(true);
  });
});

describe("Q&A attachment validation", () => {
  it("accepts supported technical files within 10 MB", () => {
    expect(qaAttachmentValidationError({ name: "dose-report.pdf", type: "application/pdf", size: 1024 })).toBe("");
    expect(qaAttachmentValidationError({ name: "error.log", type: "text/plain", size: 2048 })).toBe("");
  });

  it("rejects oversized or unsupported files", () => {
    expect(qaAttachmentValidationError({ name: "large.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).toBe("attachment_too_large");
    expect(qaAttachmentValidationError({ name: "script.html", type: "text/html", size: 100 })).toBe("attachment_type_not_allowed");
  });
});

describe("folder downloads", () => {
  it("supports nested PHANTOM and DCC folders through hidden archives", () => {
    expect(isFolderDownloadPrefix("PHANTOM/nci_size/")).toBe(true);
    expect(isFolderDownloadPrefix("DCC/nevada_nuclear_bomb_test/thyroid_dose/")).toBe(true);
    expect(folderArchiveKeys("PHANTOM/nci_size/")).toEqual([
      "_folder-downloads/PHANTOM/nci_size.zip",
      "PHANTOM/nci_size.zip",
    ]);
  });

  it("does not add folder downloads to the three flat software distributions", () => {
    expect(isFolderDownloadPrefix("NCICT/releases/")).toBe(false);
    expect(isFolderDownloadPrefix("NCINM/data/")).toBe(false);
    expect(isFolderDownloadPrefix("NCIRF/examples/")).toBe(false);
    expect(isFolderDownloadPrefix("PHANTOM/")).toBe(false);
  });
});

describe("Q&A visibility", () => {
  it("defaults to reviewable public sharing and blocks team-only publication", () => {
    expect(normalizeQuestionVisibility(undefined)).toBe("public_after_review");
    expect(normalizeQuestionVisibility("team_only")).toBe("team_only");
    expect(canPublishQuestion("public_after_review")).toBe(true);
    expect(canPublishQuestion("team_only")).toBe(false);
  });

  it("allows public reading while keeping private discussions between the author and team", () => {
    const community = { id: "user-1", role: "user", discussion_role: "community" };
    const other = { id: "user-2", role: "user", discussion_role: "community" };
    const team = { id: "team-1", role: "user", discussion_role: "team" };
    expect(canViewDiscussion({ status: "published", visibility: "public_after_review", submitted_by_user_id: community.id }, other)).toBe(true);
    expect(canViewDiscussion({ status: "submitted", visibility: "team_only", submitted_by_user_id: community.id }, community)).toBe(true);
    expect(canViewDiscussion({ status: "submitted", visibility: "team_only", submitted_by_user_id: community.id }, other)).toBe(false);
    expect(canViewDiscussion({ status: "submitted", visibility: "team_only", submitted_by_user_id: community.id }, team)).toBe(true);
  });

  it("labels designated team members separately from community users", () => {
    expect(discussionAuthorForUser({ role: "admin", discussion_role: "team", discussion_handle: "choonsiklee" })).toEqual({ type: "team", name: "@choonsiklee" });
    expect(discussionAuthorForUser({ role: "user", discussion_role: "community", display_name: "Grace Lee" })).toEqual({ type: "community", name: "Grace Lee" });
  });

  it("notifies every designated team member about a new private discussion", () => {
    const author = { id: "user-1", role: "user", discussion_role: "community" };
    const administrator = { id: "admin-1", role: "admin", discussion_role: "team" };
    const teamMember = { id: "team-1", role: "user", discussion_role: "team" };
    const communityMember = { id: "user-2", role: "user", discussion_role: "community" };

    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, administrator)).toBe(true);
    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, teamMember)).toBe(true);
    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, communityMember)).toBe(false);
    expect(shouldNotifyNewDiscussionRecipient("team_only", author.id, author)).toBe(false);
  });

  it("sends new public discussions to every opted-in member", () => {
    const author = { id: "user-1", role: "user", discussion_role: "community", community_email_notifications: 1 };
    const optedInMember = { id: "user-2", role: "user", discussion_role: "community", community_email_notifications: 1 };
    const optedOutMember = { id: "user-3", role: "user", discussion_role: "community", community_email_notifications: 0 };

    expect(communityDiscussionEmailsEnabled(optedInMember)).toBe(true);
    expect(communityDiscussionEmailsEnabled(optedOutMember)).toBe(false);
    expect(shouldNotifyNewDiscussionRecipient("public_after_review", author.id, optedInMember)).toBe(true);
    expect(shouldNotifyNewDiscussionRecipient("public_after_review", author.id, optedOutMember)).toBe(false);
    expect(shouldNotifyNewDiscussionRecipient("public_after_review", author.id, author)).toBe(false);
  });

  it("sends public team replies to opted-in members but keeps community replies scoped", () => {
    const question = { visibility: "public_after_review", submitted_by_user_id: "user-1" };
    const replyingTeamMember = { id: "team-1", role: "user", discussion_role: "team", community_email_notifications: 1 };
    const replyingCommunityMember = { id: "user-4", role: "user", discussion_role: "community", community_email_notifications: 1 };
    const submitter = { id: "user-1", role: "user", discussion_role: "community", community_email_notifications: 1 };
    const unrelatedMember = { id: "user-2", role: "user", discussion_role: "community", community_email_notifications: 1 };
    const optedOutMember = { id: "user-3", role: "user", discussion_role: "community", community_email_notifications: 0 };

    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, submitter)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, unrelatedMember)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, optedOutMember)).toBe(false);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingCommunityMember, submitter)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingCommunityMember, unrelatedMember)).toBe(false);
  });

  it("keeps the private team informed as replies accumulate", () => {
    const question = { visibility: "team_only", submitted_by_user_id: "user-1" };
    const replyingTeamMember = { id: "team-1", role: "user", discussion_role: "team" };
    const otherTeamMember = { id: "team-2", role: "user", discussion_role: "team" };
    const submitter = { id: "user-1", role: "user", discussion_role: "community" };
    const unrelatedUser = { id: "user-2", role: "user", discussion_role: "community" };

    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, otherTeamMember)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, submitter)).toBe(true);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, unrelatedUser)).toBe(false);
    expect(shouldNotifyDiscussionReplyRecipient(question, replyingTeamMember, replyingTeamMember)).toBe(false);
  });
});

describe("discussion notification email content", () => {
  it("includes the full question only for team and administrator recipients", () => {
    const input = {
      id: "discussion-123",
      requestType: "technical_question",
      tool: "NCINM",
      visibility: "team_only",
      title: "Review mesh <dose>",
      body: "Please review the oesophagus dose results before responding.",
      authorName: "Portal Researcher",
    };
    const teamEmail = newDiscussionNotificationEmail({ ...input, includeContent: true });
    const communityEmail = newDiscussionNotificationEmail({ ...input, includeContent: false });

    expect(teamEmail.subject).toContain("Review mesh <dose>");
    expect(teamEmail.html).toContain("Review mesh &lt;dose&gt;");
    expect(teamEmail.html).toContain("Submitted by: Portal Researcher");
    expect(teamEmail.html).toContain("Please review the oesophagus dose results before responding.");
    expect(teamEmail.html).toContain('href="https://portal.ncidosetools.com/#/portal/questions?discussion=discussion-123"');
    expect(teamEmail.text).toContain("Question\nPlease review the oesophagus dose results before responding.");
    expect(communityEmail.html).not.toContain("Please review the oesophagus dose results before responding.");
    expect(communityEmail.text).not.toContain("Please review the oesophagus dose results before responding.");
  });

  it("includes reply and original-question context only for team and administrator recipients", () => {
    const input = {
      question: {
        id: "discussion-456",
        request_type: "bug_report",
        visibility: "public_after_review",
        title: "Unexpected batch result",
        body: "The original question includes the failing input description.",
      },
      authorName: "@ncidoseteam",
      replyBody: "Please check the attached output before I post the final answer. <script>alert(1)</script>",
    };
    const teamEmail = discussionReplyNotificationEmail({ ...input, includeContent: true });
    const communityEmail = discussionReplyNotificationEmail({ ...input, includeContent: false });

    expect(teamEmail.html).toContain("New reply: Unexpected batch result");
    expect(teamEmail.html).toContain("Please check the attached output before I post the final answer.");
    expect(teamEmail.html).toContain("The original question includes the failing input description.");
    expect(teamEmail.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(teamEmail.html).not.toContain("<script>alert(1)</script>");
    expect(teamEmail.text).toContain("New reply\nPlease check the attached output before I post the final answer.");
    expect(teamEmail.text).toContain("Original question\nThe original question includes the failing input description.");
    expect(communityEmail.html).not.toContain("Please check the attached output before I post the final answer.");
    expect(communityEmail.html).not.toContain("The original question includes the failing input description.");
  });
});

describe("announcement email template", () => {
  it("uses the portal blue for branded email accents", () => {
    const html = announcementEmailHtml({
      title: "Brand test",
      body: "Read https://ncidose.github.io/versions/ncict.",
      category: "Release",
    });

    expect(html).toContain("border-bottom:5px solid #0EA5E9");
    expect(html).toContain("border:1px solid #0EA5E9");
    expect(html).toContain("background:#0EA5E9");
    expect(html).toContain("color:#0EA5E9;text-decoration:underline");
    expect(html).toContain("Manage email notifications in Account");
    expect(html).toContain("https://portal.ncidosetools.com/#/portal/account");
    expect(html).not.toContain("#2ba8df");
    expect(html).not.toContain("#147da8");
  });

  it("uses the shared team signature and safely renders a preview", () => {
    const html = announcementEmailHtml({
      title: "Release <Update>",
      body: "A new version is available.",
      category: "Release",
    }, { preview: true, includeUnsubscribe: false });

    expect(html).toContain("NCI Dose Team");
    expect(html).toContain('>NCI Dose Tools portal</a>');
    expect(html).toContain("National Cancer Institute");
    expect(html.match(/href="https:\/\/ncidose\.github\.io\/"/g)).toHaveLength(2);
    expect(html).not.toContain("Visit the NCI Dose Tools public website");
    expect(html).toContain("Preview · Sent only to the portal administrator");
    expect(html).toContain("Release &lt;Update&gt;");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("turns plain announcement URLs into safe email links", () => {
    const url = "https://ncidose.github.io/versions/phantom";
    const html = announcementEmailHtml({
      title: "PHANTOM maintenance",
      body: `Read the details at ${url}.\n\n<script>alert(1)</script>`,
      category: "Maintenance",
    });

    expect(html).toContain(`href="${url}"`);
    expect(html).toContain(`>${url}</a>.`);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders Markdown announcement links as labeled email hyperlinks", () => {
    const downloadUrl = "https://portal.ncidosetools.com/#/portal/downloads?tool=NCINM";
    const html = announcementEmailHtml({
      title: "NCINM4 release",
      body: `[Download NCINM4](${downloadUrl})\n\n[Read the NCINM4 API manual](https://ncidose.github.io/manuals/ncinm-api)`,
      category: "Release",
    });

    expect(html).toContain(`href="${downloadUrl}"`);
    expect(html).toContain(">Download NCINM4</a>");
    expect(html).toContain(">Read the NCINM4 API manual</a>");
    expect(html).not.toContain("[Download NCINM4](<a");
    expect(html).not.toContain(`>${downloadUrl}</a>`);
  });

  it("renders a transactional welcome without an unsubscribe link", () => {
    const html = welcomeEmailHtml("Test Researcher", "researcher@example.org");

    expect(html).toContain("Welcome to the NCI Dose Tools User Portal");
    expect(html).toContain("Approved User Access");
    expect(html).toContain("researcher@example.org");
    expect(html).toContain("Sign in using this exact email address");
    expect(html).toContain("Other email addresses will not receive a code unless they are already linked");
    expect(html).toContain("NCI Dose Team");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("links community emails to the Account notification setting", () => {
    const html = announcementEmailHtml({
      title: "New bug report",
      body: "A public bug report was posted.",
      category: "PHANTOM",
    }, { includeUnsubscribe: false, includeCommunityPreferences: true, headerLabel: "Community Discussions" });

    expect(html).toContain("Do not want community discussion emails?");
    expect(html).toContain("https://portal.ncidosetools.com/#/portal/account");
    expect(html).toContain("Turn them off in Account");
  });

  it("confirms a secondary email and explains verification", () => {
    const html = secondaryEmailAddedHtml("Test Researcher", "secondary@example.org");

    expect(html).toContain("Secondary email added to your NCI Dose Tools account");
    expect(html).toContain("Account Confirmation");
    expect(html).toContain("secondary@example.org");
    expect(html).toContain("you can sign in with either email");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("welcomes an administrator-linked secondary email without changing approval history", () => {
    const html = linkedEmailWelcomeHtml("Test Researcher", "secondary@example.org");

    expect(html).toContain("Welcome to the NCI Dose Tools User Portal");
    expect(html).toContain("administrator linked secondary@example.org");
    expect(html).toContain("approval and download history are unchanged");
    expect(html).toContain("sign in with either linked email");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });

  it("renders a branded expiring portal login code", () => {
    const html = loginCodeEmailHtml("123456");

    expect(html).toContain("Your NCI Dose Tools sign-in code");
    expect(html).toContain("123456");
    expect(html).toContain("expires in 10 minutes");
    expect(html).toContain("NCI Dose Team");
    expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");
  });
});
