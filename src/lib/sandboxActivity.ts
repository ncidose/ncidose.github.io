export const sandboxApis = [
  { tool: "ncict", label: "NCICT" },
  { tool: "ncinm", label: "NCINM" },
  { tool: "ncirf", label: "NCIRF CPU" },
  { tool: "ncirfgpu", label: "NCIRF GPU" },
] as const;

export type SandboxApiUsage = {
  tool: string;
  requests: number;
  uniqueClients: number;
  succeeded: number;
  failed: number;
  rateLimited: number;
  busy: number;
  successRate: number | null;
  averageDurationMs: number | null;
};

export const sandboxApiLabel = (tool: string) =>
  sandboxApis.find((api) => api.tool === tool)?.label ?? tool.toUpperCase();

export const sandboxApiUsageRows = (entries: SandboxApiUsage[]): SandboxApiUsage[] =>
  sandboxApis.map(({ tool }) => entries.find((entry) => entry.tool === tool) ?? {
    tool,
    requests: 0,
    uniqueClients: 0,
    succeeded: 0,
    failed: 0,
    rateLimited: 0,
    busy: 0,
    successRate: null,
    averageDurationMs: null,
  });
