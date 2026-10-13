export const allowsFolderBundleDownload = (tool: string, prefix: string) =>
  tool === "DCC" && prefix.startsWith("DCC/");
