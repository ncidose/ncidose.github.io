import { PDFDocument } from "pdf-lib";

export const staTemplatePath = "/forms/ncidose-software-transfer-agreement.pdf";
export const staTemplateSha256 = "128b131a71ccb83d8d6f0bd2c23c8e2efc6b8031364c7fc23d02e17724ef1880";

export type StaFormValues = {
  recipientInstitution: string;
  nonprofit: "yes" | "no";
  commercialReplacement: "yes" | "no";
  clinicalUse: "yes" | "no";
  researchUse: string;
  officialName: string;
  officialTitle: string;
  investigatorName: string;
  investigatorTitle: string;
  mailingAddress: string;
  legalEmail: string;
  legalPhone: string;
  tools: string[];
};

const officialToolFields = new Map([
  ["NCICT", "NCI Dosimetry System for Computed Tomography"],
  ["NCINM", "NCI Dosimetry System for Nuclear Medicine"],
  ["NCIRF", "NCI Dosimetry System for Radiography and Fluoroscopy"],
  ["PHANTOM", "Computational human phantom series"],
]);

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function fillStaPdf(templateBytes: Uint8Array, values: StaFormValues) {
  if (await sha256Hex(templateBytes) !== staTemplateSha256) {
    throw new Error("The official STA template did not pass its integrity check.");
  }

  const document = await PDFDocument.load(templateBytes);
  if (document.getPageCount() !== 4) throw new Error("The official STA template must contain four pages.");
  const form = document.getForm();

  form.getTextField("Recipient Institution").setText(values.recipientInstitution);
  form.getRadioGroup("YesNo").select(values.nonprofit === "yes" ? "Yes" : "No");
  form.getRadioGroup("YesNo2").select(values.commercialReplacement === "yes" ? "Yes" : "No");
  form.getRadioGroup("YesNo3").select(values.clinicalUse === "yes" ? "Yes" : "No");
  form.getTextField("Describe the scope of use of this software under this agreement").setText(values.researchUse);
  form.getTextField("Name_1").setText(values.officialName);
  form.getTextField("Job Title_1").setText(values.officialTitle);
  form.getTextField("Name_2").setText(values.investigatorName);
  form.getTextField("Job Title_2").setText(values.investigatorTitle);
  form.getTextField("Recipient's mailing address").setText(values.mailingAddress);
  form.getTextField("Email").setText(values.legalEmail);
  form.getTextField("Phone").setText(values.legalPhone);

  for (const [tool, fieldName] of officialToolFields) {
    const checkbox = form.getCheckBox(fieldName);
    if (values.tools.includes(tool)) checkbox.check();
    else checkbox.uncheck();
  }

  form.updateFieldAppearances();
  return document.save();
}

export async function downloadStaPdf(values: StaFormValues) {
  const response = await fetch(staTemplatePath, { cache: "no-store" });
  if (!response.ok) throw new Error("The official STA template could not be loaded.");
  const filled = await fillStaPdf(new Uint8Array(await response.arrayBuffer()), values);
  const safeName = values.investigatorName.trim().replaceAll(/[^a-zA-Z0-9_-]+/g, "_").replaceAll(/^_+|_+$/g, "") || "recipient";
  const url = URL.createObjectURL(new Blob([filled], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `NCI_STA_${safeName}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
