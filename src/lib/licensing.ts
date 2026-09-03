export const LICENSING_EMAIL = "kevin.chang@nih.gov";

const defaultProduct = "NCI Dose Tools REST APIs";

export const createLicensingMailto = (product = defaultProduct) => {
  const productName = product.trim() || defaultProduct;
  const subject = `${productName} commercial evaluation request`;
  const body = [
    "Hello Dr. Kevin Chang,",
    "",
    `I would like to discuss evaluating ${productName} for commercial integration.`,
    "",
    "Organization:",
    "Expected request volume:",
    "Deployment environment (cloud, on-premises, or hybrid):",
    "Evaluation timeline:",
    "Proposed use:",
    "",
    "Thank you,",
  ].join("\n");

  return `mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
