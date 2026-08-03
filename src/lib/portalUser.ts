export const getPortalHeaderEmail = (user: { primaryEmail: string; signedInEmail?: string }) =>
  user.signedInEmail || user.primaryEmail;

export const selectPrimaryPortalIdentity = <T extends { id: string; email: string; primary: boolean }>(
  identities: T[],
  identityId: string,
) => {
  const selected = identities.find((identity) => identity.id === identityId);
  if (!selected) return null;
  return {
    primaryEmail: selected.email,
    identities: identities.map((identity) => ({ ...identity, primary: identity.id === identityId })),
  };
};
