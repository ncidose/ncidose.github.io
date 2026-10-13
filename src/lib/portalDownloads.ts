export const portalDownloadUrl = (key: string) => `/api/download?key=${encodeURIComponent(key)}`;

export const queuePortalDownloads = (
  keys: string[],
  trigger: (key: string) => void,
  schedule: (task: () => void, delay: number) => unknown = (task, delay) => window.setTimeout(task, delay),
) => keys.forEach((key, index) => schedule(() => trigger(key), index * 100));
