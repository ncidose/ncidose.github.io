export const allowsFolderBundleDownload = (tool: string, prefix: string) =>
  (tool === "PHANTOM" || tool === "DCC")
  && !prefix.toLowerCase().split("/").includes("dicomrt");
