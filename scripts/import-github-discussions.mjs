import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const outputPath = "/tmp/ncidose-discussions-import.sql";
const excludedTitle = /^(welcome|feature request|publication|peer-reviewed publications)/i;
const teamLogins = new Set(["choonsiklee", "ncidoseteam"]);
const technicalCategories = new Set(["NCICT", "NCIRF", "NCINM", "PHANTOM"]);

const historicalAuthor = (value = "") => value.match(/^\s*\*\*([^*\n]{2,100})\*\*/)?.[1].trim() || null;

const isTeamResponse = (response) => {
  const author = historicalAuthor(response.body);
  if (author) return /^(?:Dr\.?\s+)?Choonsik(?:\s+Lee)?$|^Dr\.?\s+Lee$|^NCI Dose Team$/i.test(author);
  return teamLogins.has(response.author?.login);
};

const pluralizeTeamVoice = (value = "") => value
  .replace(/\bI(?:'|’)m\b/g, "we're")
  .replace(/\bI(?:'|’)ve\b/g, "we've")
  .replace(/\bI(?:'|’)ll\b/g, "we'll")
  .replace(/\bI(?:'|’)d\b/g, "we'd")
  .replace(/\bI am\b/g, "we are")
  .replace(/\bI was\b/g, "we were")
  .replace(/\bMyself\b/g, "Ourselves")
  .replace(/\bmyself\b/g, "ourselves")
  .replace(/\bMine\b/g, "Ours")
  .replace(/\bmine\b/g, "ours")
  .replace(/\bMy\b/g, "Our")
  .replace(/\bmy\b/g, "our")
  .replace(/\bMe\b/g, "Us")
  .replace(/\bme\b/g, "us")
  .replace(/\bI\b/g, "we")
  .replace(/(^|[.!?]\s+|\n)(we)\b/g, (_match, prefix) => `${prefix}We`);

const teamVoice = (value = "") => {
  const cleaned = value
    .replace(/^Hi the user,\s*thanks for the comments\./i, "Thank you for the comments.")
    .replace(/^Hi the user,\s*/i, "")
    .replace(/^Thank you the user for\b/i, "Thank you for");
  if (!cleaned.includes("**")) return pluralizeTeamVoice(cleaned);
  const firstLineBreak = cleaned.indexOf("\n");
  const introduction = firstLineBreak >= 0 ? pluralizeTeamVoice(cleaned.slice(0, firstLineBreak)) : "";
  const questionAndAnswers = (firstLineBreak >= 0 ? cleaned.slice(firstLineBreak) : cleaned)
    .replace(/\*\*([\s\S]*?)\*\*/g, (_match, answer) => `**${pluralizeTeamVoice(answer)}**`);
  return introduction + questionAndAnswers;
};

const query = `
  query DiscussionArchive($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      discussions(first: 60, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes {
          number title body createdAt
          category { name }
          comments(first: 50) {
            nodes {
              id body createdAt author { login }
              replies(first: 25) {
                nodes { id body createdAt author { login } }
              }
            }
          }
        }
      }
    }
  }
`;

const normalizeMarkdown = (value = "") => value
  .replace(/\b(?:Dr\.?\s+)?Choonsik(?:\s+Lee)?\b|\bDr\.?\s+Lee\b/gi, "the NCI Dose Team")
  .replace(/\b(?:Dogan\s+Bor|Seth\s+Streitmatter|Allan\s+Thomas|Haegin\s+Han|Kenneth\s+Lewis|Mikhail\s+V\s+Osipov|Defez\s+Didier)\b/gi, "the user")
  .replace(/\b(?:Seth|Allan|Haegin|Mikhail)\b/g, "the user")
  .replace(/\*{3}@\*{3}\.\*{3}/g, "[email removed]")
  .replace(/^\*\*[^*\n]{2,100}\*\*\s*\n+/i, "")
  .replace(/^(?:dear|hi|hello)\s+[^,\n]{1,80},?\s*\n+/i, "")
  .split(/\nOn [\s\S]{0,500}?\nwrote:\s*\n/i)[0]
  .replace(/\n>[^\n]*(?:\n>[^\n]*)*\s*$/g, "")
  .replace(/\n-{5,}[\s\S]*$/g, "")
  .replace(/\n(?:best regards|kind regards|sincerely|thanks!?),?\s*\n[\s\S]*$/i, "")
  .replace(/\n(?:regards|thank you|thanks!?),?\s*\n[\s\S]*$/i, "")
  .replace(/\n[A-Z][A-Za-z .'-]{2,100}(?:Ph\.?D|M\.?D\.?|DABR)\s*$/i, "")
  .replace(/\n\s*-?the user\s*(?=\n|$)/gi, "\n")
  .replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = tag.match(/\balt="([^"]*)"/i)?.[1] || "Attached image";
    return src ? `![${alt}](${src})` : "";
  })
  .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
  .replace(/\r\n/g, "\n")
  .trim();

const sql = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;

const response = execFileSync("gh", [
  "api", "graphql", "-f", `query=${query}`,
  "-F", "owner=ncidose", "-F", "name=ncidosetools",
], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

const discussions = JSON.parse(response).data.repository.discussions.nodes
  .filter((item) => technicalCategories.has(item.category.name) && !excludedTitle.test(item.title))
  .map((item) => {
    const responses = item.comments.nodes.flatMap((comment) => [comment, ...comment.replies.nodes])
      .filter((responseItem) => normalizeMarkdown(responseItem.body));
    return { ...item, responses };
  })
  .filter((item) => item.responses.length > 0);

const statements = [];
for (const discussion of discussions) {
  const questionId = `github-${discussion.number}`;
  statements.push(`INSERT OR IGNORE INTO qa_questions (id, tool, title, body, status, source, source_ref, created_at, updated_at, published_at) VALUES (${sql(questionId)}, ${sql(discussion.category.name)}, ${sql(discussion.title)}, ${sql(normalizeMarkdown(discussion.body))}, 'published', 'github_discussions', ${sql(String(discussion.number))}, ${sql(discussion.createdAt)}, ${sql(discussion.createdAt)}, ${sql(discussion.createdAt)});`);
  discussion.responses.forEach((responseItem, index) => {
    const answerId = `github-${responseItem.id}`;
    const responseType = isTeamResponse(responseItem) ? "team" : "community";
    const normalizedBody = normalizeMarkdown(responseItem.body);
    const body = responseType === "team" ? teamVoice(normalizedBody) : normalizedBody;
    statements.push(`INSERT OR IGNORE INTO qa_answers (id, question_id, body, response_type, sort_order, source_ref, created_at, updated_at) VALUES (${sql(answerId)}, ${sql(questionId)}, ${sql(body)}, ${sql(responseType)}, ${index}, ${sql(responseItem.id)}, ${sql(responseItem.createdAt)}, ${sql(responseItem.createdAt)});`);
    statements.push(`UPDATE qa_answers SET body=${sql(body)}, response_type=${sql(responseType)}, updated_at=CURRENT_TIMESTAMP WHERE id=${sql(answerId)} AND source_ref=${sql(responseItem.id)};`);
  });
}
await writeFile(outputPath, `${statements.join("\n")}\n`);
console.log(`Prepared ${discussions.length} answered technical Q&A records in ${outputPath}.`);
