import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const outputPath = "/tmp/ncidose-discussions-import.sql";
const excludedTitle = /^(welcome|publication|peer-reviewed publications)/i;
const teamLogins = new Set(["choonsiklee", "ncidoseteam"]);
const technicalCategories = new Set(["NCICT", "NCIRF", "NCINM", "PHANTOM"]);
// These were the four pinned feature-request discussions in the legacy GitHub forum.
// Keep the list explicit so ordinary technical questions are never reclassified by
// a loose keyword match.
const featureRequestNumbers = new Set([31, 34, 36, 39]);
const bugReportNumbers = new Set([9, 12, 14, 15, 21, 22, 27, 30, 45]);
const embeddedBugPattern = /^(?:bug report|error report)\s*:\s*/i;

const requestTypeForDiscussion = (number) => featureRequestNumbers.has(number)
  ? "feature_request"
  : bugReportNumbers.has(number) ? "bug_report" : "technical_question";

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
      discussions(first: 100, orderBy: { field: CREATED_AT, direction: ASC }) {
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
  .replace(/^Anonymous\s*\n+/i, "")
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

const embeddedBugs = [];
const discussions = JSON.parse(response).data.repository.discussions.nodes
  .filter((item) => technicalCategories.has(item.category.name) && !excludedTitle.test(item.title))
  .map((item) => {
    const featureRequest = featureRequestNumbers.has(item.number);
    const bugComments = featureRequest
      ? item.comments.nodes.filter((comment) => embeddedBugPattern.test(normalizeMarkdown(comment.body)))
      : [];
    const bugResponseIds = new Set(bugComments.flatMap((comment) => [
      comment.id,
      ...comment.replies.nodes.map((reply) => reply.id),
    ]));
    bugComments.forEach((comment, index) => embeddedBugs.push({
      discussionNumber: item.number,
      index,
      tool: item.category.name,
      comment,
    }));
    const responses = item.comments.nodes.flatMap((comment) => [comment, ...comment.replies.nodes])
      .filter((responseItem) => !bugResponseIds.has(responseItem.id))
      .filter((responseItem) => normalizeMarkdown(responseItem.body));
    return { ...item, responses };
  })
  .filter((item) => item.responses.length > 0);

const statements = [];
for (const discussion of discussions) {
  const questionId = `github-${discussion.number}`;
  const requestType = requestTypeForDiscussion(discussion.number);
  const tool = requestType === "feature_request" ? "General" : discussion.category.name;
  const pinned = requestType === "feature_request" ? 1 : 0;
  statements.push(`INSERT OR IGNORE INTO qa_questions (id, tool, request_type, is_pinned, title, body, status, source, source_ref, created_at, updated_at, published_at) VALUES (${sql(questionId)}, ${sql(tool)}, ${sql(requestType)}, ${pinned}, ${sql(discussion.title)}, ${sql(normalizeMarkdown(discussion.body))}, 'published', 'github_discussions', ${sql(String(discussion.number))}, ${sql(discussion.createdAt)}, ${sql(discussion.createdAt)}, ${sql(discussion.createdAt)});`);
  statements.push(`UPDATE qa_questions SET tool=${sql(tool)}, request_type=${sql(requestType)}, is_pinned=${pinned}, title=${sql(discussion.title)}, body=${sql(normalizeMarkdown(discussion.body))}, status='published', published_at=COALESCE(published_at, ${sql(discussion.createdAt)}), updated_at=CURRENT_TIMESTAMP WHERE id=${sql(questionId)} AND source='github_discussions';`);
  discussion.responses.forEach((responseItem, index) => {
    const answerId = `github-${responseItem.id}`;
    const responseType = requestType === "feature_request" || isTeamResponse(responseItem) ? "team" : "community";
    const normalizedBody = normalizeMarkdown(responseItem.body);
    const body = responseType === "team" ? teamVoice(normalizedBody) : normalizedBody;
    statements.push(`INSERT OR IGNORE INTO qa_answers (id, question_id, body, response_type, sort_order, source_ref, created_at, updated_at) VALUES (${sql(answerId)}, ${sql(questionId)}, ${sql(body)}, ${sql(responseType)}, ${index}, ${sql(responseItem.id)}, ${sql(responseItem.createdAt)}, ${sql(responseItem.createdAt)});`);
    statements.push(`UPDATE qa_answers SET body=${sql(body)}, response_type=${sql(responseType)}, updated_at=CURRENT_TIMESTAMP WHERE id=${sql(answerId)} AND source_ref=${sql(responseItem.id)};`);
  });
}

for (const bug of embeddedBugs) {
  const normalizedBody = normalizeMarkdown(bug.comment.body);
  const title = normalizedBody.replace(embeddedBugPattern, "").split("\n")[0].trim();
  const questionId = `github-${bug.discussionNumber}-bug-${bug.index + 1}`;
  const sourceRef = `feature-bug:${bug.comment.id}`;
  statements.push(`INSERT OR IGNORE INTO qa_questions (id, tool, request_type, is_pinned, title, body, status, source, source_ref, created_at, updated_at, published_at) VALUES (${sql(questionId)}, ${sql(bug.tool)}, 'bug_report', 0, ${sql(title)}, ${sql(normalizedBody)}, 'published', 'github_discussions', ${sql(sourceRef)}, ${sql(bug.comment.createdAt)}, ${sql(bug.comment.createdAt)}, ${sql(bug.comment.createdAt)});`);
  statements.push(`UPDATE qa_questions SET tool=${sql(bug.tool)}, request_type='bug_report', is_pinned=0, title=${sql(title)}, body=${sql(normalizedBody)}, updated_at=CURRENT_TIMESTAMP WHERE id=${sql(questionId)} AND source='github_discussions';`);
  bug.comment.replies.nodes.forEach((reply, index) => {
    const answerId = `github-${reply.id}`;
    const body = teamVoice(normalizeMarkdown(reply.body));
    statements.push(`INSERT OR IGNORE INTO qa_answers (id, question_id, body, response_type, sort_order, source_ref, created_at, updated_at) VALUES (${sql(answerId)}, ${sql(questionId)}, ${sql(body)}, 'team', ${index}, ${sql(reply.id)}, ${sql(reply.createdAt)}, ${sql(reply.createdAt)});`);
    statements.push(`UPDATE qa_answers SET question_id=${sql(questionId)}, body=${sql(body)}, response_type='team', sort_order=${index}, updated_at=CURRENT_TIMESTAMP WHERE id=${sql(answerId)} AND source_ref=${sql(reply.id)};`);
  });
}
await writeFile(outputPath, `${statements.join("\n")}\n`);
console.log(`Prepared ${discussions.length} answered Q&A records and ${embeddedBugs.length} embedded bug reports in ${outputPath}.`);
