/**
 * Splits a description into plain and emphasized segments for display.
 *
 * The saved description is plain text (see `qualificationsSummary`), so the
 * emphasis has to be inferred at render time rather than stored. Only the parts
 * worth scanning for are matched: how much experience a posting asks for, and
 * the named tools and technologies it asks for them in.
 */
export type Segment = { text: string; emphasis: boolean };

/**
 * Experience requirements, e.g. "5+ years", "3-5 years", "two years".
 * The trailing qualifier ("of experience") is left plain — the number is the
 * part a reader is looking for.
 */
const EXPERIENCE =
  /\b\d+\s*\+?\s*(?:-\s*\d+\s*)?(?:year|yr)s?\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:year|yr)s?\b/gi;

/**
 * Named tools and technologies.
 *
 * This is a list rather than a pattern because there is no shape that separates
 * a technology from an ordinary capitalized word — "Go" and "Rust" look like
 * prose, and inferring from capitalization alone bolds every sentence start.
 * Unlisted technologies simply render plain, which is the safe failure.
 */
const TECHNOLOGIES = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "Kotlin", "Swift", "Go",
  "Golang", "Rust", "Ruby", "PHP", "Scala", "Elixir", "Erlang", "Clojure",
  "Haskell", "Perl", "Lua", "Dart", "C\\+\\+", "C#", "C", "R", "MATLAB",
  "Objective-C", "Solidity", "Bash", "Shell", "PowerShell", "SQL", "HTML",
  "CSS", "Sass", "SCSS",
  // Frontend
  "React", "React Native", "Next\\.js", "Vue", "Vue\\.js", "Nuxt", "Angular",
  "Svelte", "SvelteKit", "Ember", "Backbone", "jQuery", "Redux", "MobX",
  "Tailwind", "Tailwind CSS", "Bootstrap", "Material UI", "Webpack", "Vite",
  "Rollup", "Babel", "ESLint", "Storybook",
  // Backend / frameworks
  "Node\\.js", "Node", "Deno", "Bun", "Express", "NestJS", "Django", "Flask",
  "FastAPI", "Rails", "Ruby on Rails", "Spring", "Spring Boot", "Laravel",
  "ASP\\.NET", "\\.NET", "GraphQL", "gRPC", "REST", "tRPC",
  // Data stores
  "PostgreSQL", "Postgres", "MySQL", "MariaDB", "SQLite", "MongoDB", "Redis",
  "Cassandra", "DynamoDB", "Elasticsearch", "OpenSearch", "Neo4j", "CockroachDB",
  "Snowflake", "BigQuery", "Redshift", "Databricks", "ClickHouse",
  // Cloud / infra
  "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "Kubernetes",
  "K8s", "Docker", "Terraform", "Pulumi", "Ansible", "Chef", "Puppet", "Helm",
  "Jenkins", "CircleCI", "GitHub Actions", "GitLab CI", "ArgoCD", "Vagrant",
  "Nginx", "Apache", "Kafka", "RabbitMQ", "Airflow", "Spark", "Hadoop", "Flink",
  "dbt", "Prometheus", "Grafana", "Datadog", "Splunk", "Sentry", "Lambda",
  "EC2", "S3", "Serverless",
  // ML
  "TensorFlow", "PyTorch", "Keras", "scikit-learn", "sklearn", "Pandas",
  "NumPy", "Jupyter", "Hugging Face", "LangChain", "OpenCV",
  // Tools
  "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Linear",
  "Figma", "Notion", "Slack", "Salesforce", "SAP", "Tableau", "Looker",
  "Power BI", "Excel", "Postman", "Kibana",
];

/**
 * Longest first, so "React Native" wins over "React" and "Node.js" over "Node"
 * at the same start position.
 */
const TECHNOLOGY = new RegExp(
  `(?<![\\w.#+-])(?:${[...TECHNOLOGIES]
    .sort((a, b) => b.length - a.length)
    .join("|")})(?![\\w#+]|\\.\\w|-\\w)`,
  "gi",
);

/**
 * Returns `text` split into consecutive segments, every character preserved.
 *
 * Overlapping matches are resolved by taking the earliest, and on a tie the
 * longest, so no character lands in two segments.
 */
export function highlightJd(text: string): Segment[] {
  if (!text) return [];

  const matches: Array<{ start: number; end: number }> = [];
  for (const pattern of [EXPERIENCE, TECHNOLOGY]) {
    // The patterns are module-level and global, so lastIndex has to be reset
    // before each scan or a previous call resumes mid-string.
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) {
      matches.push({ start: m.index, end: m.index + m[0].length });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end } of matches) {
    if (start < cursor) continue; // Overlaps an emphasis already taken.
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), emphasis: false });
    }
    segments.push({ text: text.slice(start, end), emphasis: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), emphasis: false });
  }

  return segments;
}
