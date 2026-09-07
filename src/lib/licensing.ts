export const LICENSING_EMAIL = "kevin.chang@nih.gov";

const defaultProduct = "NCI Dose Tools REST APIs";

export const createLicensingMailto = (product = defaultProduct) => {
  const productName = product.trim() || defaultProduct;
  const subject = `${productName} commercial licensing inquiry`;
  const body = [
    "Hello Dr. Kevin Chang,",
    "",
    `I would like to discuss licensing ${productName} for production or commercial integration.`,
    "",
    "Organization:",
    "Expected request volume:",
    "Deployment environment (cloud, on-premises, or hybrid):",
    "Implementation timeline:",
    "Proposed use:",
    "",
    "Thank you,",
  ].join("\n");

  return `mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
