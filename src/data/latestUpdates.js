// Shared by the homepage and its static HTML. Release histories are the only
// source of dates and highlights, so publishing a history updates both views.
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const releaseDate = (heading) => {
  const match = heading.match(/^([A-Z][a-z]+) (\d{1,2}), (\d{4})(?:\s|$)/);
  if (!match) return null;
  const month = months.indexOf(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (month < 0 || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return {
    date: `${match[1]} ${day}, ${year}`,
    isoDate: date.toISOString().slice(0, 10),
  };
};

const highlight = (body) => {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^[-*] /.test(line));
  if (start < 0) return "Read the latest changes in the version history.";
  const bullet = [lines[start].slice(2)];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line) || /^\s+[-*] /.test(line)) break;
    bullet.push(line.trim());
  }
  const text = bullet.join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Keep version numbers and decimal values intact when finding a sentence.
  const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] || text;
  if (sentence.length <= 200) return sentence;
  return `${sentence.slice(0, 197).replace(/\s+\S*$/, "")}…`;
};

export const getLatestUpdates = (histories) => histories.flatMap((history) => {
  const entries = history.markdown.replace(/\r\n/g, "\n")
    .split(/^### (?!#)/m).slice(1)
    .flatMap((entry) => {
      const [heading, ...body] = entry.split("\n");
      const date = releaseDate(heading);
      return date ? [{ ...date, summary: highlight(body.join("\n")) }] : [];
    })
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  if (!entries.length) return [];
  return [{
    ...entries[0],
    id: history.id,
    product: history.product,
    href: `/versions/${history.id}`,
  }];
}).sort((a, b) => b.isoDate.localeCompare(a.isoDate) || a.product.localeCompare(b.product));
