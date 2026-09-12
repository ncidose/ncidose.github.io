// Both imported TCM threads contain the same five replies; github-7 also
// retains the linked Li et al. paper. Keep that thread as the public entry.
export const discussionAliases = { "github-1": "github-7" };

export const canonicalDiscussionId = (id) => discussionAliases[id] || id;

export const visibleDiscussions = (questions) => questions.filter((question) => {
  const canonicalId = discussionAliases[question.id];
  return !canonicalId || !questions.some((candidate) => candidate.id === canonicalId);
});
