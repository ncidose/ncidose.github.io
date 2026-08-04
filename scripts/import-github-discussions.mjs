import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const outputPath = "/tmp/ncidose-discussions-import.sql";
const excludedTitle = /^(welcome|feature request|publication|peer-reviewed publications)/i;
const teamLogins = new Set(["choonsiklee", "ncidoseteam"]);
const technicalCategories = new Set(["NCICT", "NCIRF", "NCINM", "PHANTOM"]);

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
    statements.push(`INSERT OR IGNORE INTO qa_answers (id, question_id, body, response_type, sort_order, source_ref, created_at, updated_at) VALUES (${sql(`github-${responseItem.id}`)}, ${sql(questionId)}, ${sql(normalizeMarkdown(responseItem.body))}, ${sql(teamLogins.has(responseItem.author?.login) ? "team" : "community")}, ${index}, ${sql(responseItem.id)}, ${sql(responseItem.createdAt)}, ${sql(responseItem.createdAt)});`);
  });
}
await writeFile(outputPath, `${statements.join("\n")}\n`);
console.log(`Prepared ${discussions.length} answered technical Q&A records in ${outputPath}.`);
