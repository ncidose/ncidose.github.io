export const summarizeAnnouncement = (body, limit = 300) => {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const excerpt = text.slice(0, limit - 1);
  const boundary = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, boundary > 0 ? boundary : excerpt.length).trimEnd()}…`;
};

export const readableAnnouncementSummary = (summary, body) => {
  // Preserve editorial summaries; repair the old 300-character fallback.
  if (!summary || (summary.length === 300 && body?.startsWith(summary))) {
    return summarizeAnnouncement(body);
  }
  return summary;
};
