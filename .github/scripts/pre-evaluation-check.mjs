#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "precheck-results");
mkdirSync(outputDir, { recursive: true });

const maxEvidence = 8;
const textExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".html",
]);
const skippedDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".opencode",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativePath(filePath) {
  return toPosix(path.relative(root, filePath));
}

function fileExists(filePath) {
  return existsSync(path.join(root, filePath));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function charCount(filePath) {
  return existsSync(filePath) ? readText(filePath).length : 0;
}

function walkFiles(startDir) {
  const fullStart = path.join(root, startDir);
  if (!existsSync(fullStart)) return [];

  const results = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skippedDirs.has(entry.name)) {
          visit(path.join(dir, entry.name));
        }
        continue;
      }

      if (!entry.isFile()) continue;
      const fullPath = path.join(dir, entry.name);
      if (textExtensions.has(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  };

  visit(fullStart);
  return results;
}

function firstLineMatches(files, patterns, limit = maxEvidence) {
  const matches = [];

  for (const file of files) {
    const lines = readText(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        if (!pattern.regex.test(line)) continue;
        pattern.regex.lastIndex = 0;
        matches.push({
          file: relativePath(file),
          line: index + 1,
          text: line.trim().slice(0, 220),
          pattern: pattern.label,
        });
        break;
      }
    });

    if (matches.length >= limit) break;
  }

  return matches.slice(0, limit);
}

function formatEvidenceItem(item) {
  return `${item.file}:${item.line}: ${item.text}`;
}

function statusFromChecks(checks) {
  return checks.some((check) => check.status === "fail" || check.status === "error") ? "fail" : "pass";
}

function getPackageJson(projectDir) {
  const packagePath = path.join(root, projectDir, "package.json");
  if (!existsSync(packagePath)) return null;

  try {
    return {
      path: packagePath,
      json: JSON.parse(readText(packagePath)),
    };
  } catch (error) {
    return {
      path: packagePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function hasPackageScript(projectDir, scriptName) {
  const packageInfo = getPackageJson(projectDir);
  return Boolean(packageInfo?.json?.scripts?.[scriptName]);
}

function runCommand(projectDir, command, args) {
  const cwd = path.join(root, projectDir);
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  return {
    project: projectDir || ".",
    command: [command, ...args].join(" "),
    status: result.error ? "error" : result.status === 0 ? "pass" : "fail",
    exitCode: result.status ?? null,
    durationMs: Date.now() - startedAt,
    outputExcerpt: output.split(/\r?\n/).slice(-40).join("\n"),
    error: result.error ? result.error.message : null,
  };
}

function artifactInventory() {
  const constitution = {
    path: ".specify/memory/constitution.md",
    exists: fileExists(".specify/memory/constitution.md"),
  };
  constitution.characters = constitution.exists
    ? charCount(path.join(root, constitution.path))
    : 0;

  const specsDir = path.join(root, "specs");
  const featureDirs = existsSync(specsDir)
    ? readdirSync(specsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\d{3}-.+/.test(entry.name))
        .map((entry) => path.join("specs", entry.name))
        .sort()
    : [];

  const features = featureDirs.map((dir) => {
    const files = ["spec.md", "plan.md", "tasks.md"].map((name) => {
      const rel = path.join(dir, name);
      const full = path.join(root, rel);
      return {
        path: toPosix(rel),
        exists: existsSync(full),
        characters: existsSync(full) ? charCount(full) : 0,
      };
    });

    return {
      directory: toPosix(dir),
      complete: files.every((file) => file.exists),
      files,
    };
  });

  const reflectionFile = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .find((entry) => entry.name.toLowerCase() === "reflection.md");
  const reflection = reflectionFile
    ? {
        path: reflectionFile.name,
        exists: true,
        characters: charCount(path.join(root, reflectionFile.name)),
      }
    : { path: "reflection.md or REFLECTION.md", exists: false, characters: 0 };

  const notes = [];
  if (constitution.exists && constitution.characters < 800) {
    notes.push(`${constitution.path} is short (${constitution.characters} chars < 800).`);
  }

  for (const feature of features) {
    for (const file of feature.files) {
      const threshold = file.path.endsWith("spec.md")
        ? 1200
        : file.path.endsWith("plan.md")
          ? 900
          : 500;
      if (file.exists && file.characters < threshold) {
        notes.push(`${file.path} is short (${file.characters} chars < ${threshold}).`);
      }
    }
  }

  if (reflection.exists && reflection.characters < 500) {
    notes.push(`${reflection.path} is short (${reflection.characters} chars < 500).`);
  }

  const failures = [];
  if (!constitution.exists) failures.push("Missing .specify/memory/constitution.md.");
  if (features.length < 4) failures.push(`Expected at least 4 specs/NNN-* feature folders; found ${features.length}.`);
  for (const feature of features) {
    if (!feature.complete) failures.push(`${feature.directory} is missing spec.md, plan.md, or tasks.md.`);
  }
  if (!reflection.exists) failures.push("Missing root reflection.md or REFLECTION.md.");

  return {
    status: failures.length > 0 ? "fail" : "pass",
    constitution,
    featureCount: features.length,
    completeFeatureCount: features.filter((feature) => feature.complete).length,
    features,
    reflection,
    notes,
    failures,
  };
}

const forbiddenPatterns = [
  { category: "WebSockets", label: "socket.io", regex: /socket\.io/i },
  { category: "WebSockets", label: "websocket", regex: /\bwebsocket\b/i },
  { category: "WebSockets", label: "new WebSocket", regex: /new\s+WebSocket\b/ },
  { category: "WebSockets", label: "ws://", regex: /ws:\/\//i },
  { category: "WebSockets", label: "wss://", regex: /wss:\/\//i },
  { category: "WebSockets", label: "from 'ws'", regex: /from\s+["']ws["']/ },
  { category: "WebSockets", label: "require('ws')", regex: /require\(["']ws["']\)/ },
  { category: "Databases", label: "sqlite", regex: /\bsqlite\b/i },
  { category: "Databases", label: "postgres", regex: /\bpostgres(?:ql)?\b/i },
  { category: "Databases", label: "mysql", regex: /\bmysql\b/i },
  { category: "Databases", label: "mongodb", regex: /\bmongodb\b/i },
  { category: "Databases", label: "mongoose", regex: /\bmongoose\b/i },
  { category: "Databases", label: "prisma", regex: /\bprisma\b/i },
  { category: "Databases", label: "typeorm", regex: /\btypeorm\b/i },
  { category: "Databases", label: "sequelize", regex: /\bsequelize\b/i },
  { category: "Databases", label: "knex", regex: /\bknex\b/i },
  { category: "Databases", label: "redis", regex: /\bredis\b/i },
  { category: "Auth/Sessions", label: "jwt", regex: /\bjwt\b/i },
  { category: "Auth/Sessions", label: "jsonwebtoken", regex: /\bjsonwebtoken\b/i },
  { category: "Auth/Sessions", label: "passport", regex: /\bpassport\b/i },
  { category: "Auth/Sessions", label: "oauth", regex: /\boauth\b/i },
  { category: "Auth/Sessions", label: "firebase/auth", regex: /firebase\/auth/i },
];

function forbiddenTechnologyScan() {
  const sourceFiles = [...walkFiles("backend/src"), ...walkFiles("frontend/src")];
  const implementationMatches = firstLineMatches(sourceFiles, forbiddenPatterns, 40);

  const packageFiles = ["backend/package.json", "frontend/package.json"]
    .map((file) => path.join(root, file))
    .filter(existsSync);
  const directDependencyMatches = [];

  for (const packageFile of packageFiles) {
    const json = JSON.parse(readText(packageFile));
    const dependencies = {
      ...json.dependencies,
      ...json.devDependencies,
      ...json.optionalDependencies,
    };

    for (const dependency of Object.keys(dependencies ?? {})) {
      for (const pattern of forbiddenPatterns) {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(dependency)) {
          directDependencyMatches.push({
            file: relativePath(packageFile),
            dependency,
            pattern: pattern.label,
            category: pattern.category,
          });
        }
      }
    }
  }

  const lockFiles = ["backend/package-lock.json", "frontend/package-lock.json"]
    .map((file) => path.join(root, file))
    .filter(existsSync);
  const lockfileNotes = firstLineMatches(lockFiles, forbiddenPatterns, 20);

  const failures = [];
  if (implementationMatches.length > 0) {
    failures.push("Forbidden technology pattern found in backend/src or frontend/src.");
  }
  if (directDependencyMatches.length > 0) {
    failures.push("Forbidden technology appears as a direct dependency.");
  }

  return {
    status: failures.length > 0 ? "fail" : "pass",
    implementationMatches,
    directDependencyMatches,
    lockfileNotes,
    failures,
  };
}

const scenarioDefinitions = [
  {
    name: "Scenario 1: Room & Lobby",
    concepts: [
      {
        name: "room creation and host assignment",
        artifact: [/create room/i, /room creation/i, /creator.*host/i, /assign.*host/i],
        code: [/createRoom/i, /hostId/i, /router\.post\(.{0,40}rooms/i, /creator.*host/i],
      },
      {
        name: "invalid or empty room code feedback",
        artifact: [/invalid.*room code/i, /empty.*room code/i, /clear.*feedback/i],
        code: [/invalid.*room/i, /room.*not found/i, /code.*trim/i, /status\(400\)/i, /status\(404\)/i],
      },
      {
        name: "lobby polling around 2 seconds",
        artifact: [/poll/i, /2\s*s/i, /2000/i, /automatic.*refresh/i],
        code: [/setInterval/i, /2000/i, /poll/i, /fetchRoom/i],
      },
      {
        name: "host-only start with at least two players",
        artifact: [/host.*start/i, /at least.*2/i, />=\s*2/i, /minimum.*2/i],
        code: [/host/i, /players\.length\s*[<>=]/i, /participant.*length\s*[<>=]/i, /at least.*2/i, /status\(403\)/i],
      },
    ],
  },
  {
    name: "Scenario 2: Drawer & Word",
    concepts: [
      {
        name: "trimmed names and empty-name rejection",
        artifact: [/trim/i, /empty.*name/i, /whitespace/i],
        code: [/\.trim\(\)/i, /empty.*name/i, /playerName/i, /min\(1\)/i],
      },
      {
        name: "deterministic drawer assignment",
        artifact: [/deterministic.*drawer/i, /host.*drawer/i, /first player.*drawer/i],
        code: [/drawerId/i, /hostId/i, /players\[0\]/i, /participants\[0\]/i],
      },
      {
        name: "deterministic starter-list word selection",
        artifact: [/deterministic.*word/i, /starter.*word/i, /rocket|pizza|castle|guitar|sunflower/i],
        code: [/STARTER_WORDS/i, /starter.*word/i, /secretWord/i],
      },
      {
        name: "secret word visible only to drawer before result",
        artifact: [/visible only.*drawer/i, /only.*drawer.*word/i, /hide.*word/i],
        code: [/isDrawer/i, /drawerId/i, /secretWord/i, /undefined|null/i],
      },
    ],
  },
  {
    name: "Scenario 3: Gameplay",
    concepts: [
      {
        name: "drawer canvas draw and clear",
        artifact: [/canvas/i, /draw/i, /clear/i],
        code: [/canvas/i, /stroke/i, /draw/i, /clearCanvas/i, /clear/i],
      },
      {
        name: "canvas and clear sync via HTTP polling",
        artifact: [/canvas.*sync/i, /drawing.*sync/i, /clear.*sync/i, /poll/i],
        code: [/strokes/i, /canvas/i, /poll/i, /setInterval/i, /clearCanvas/i],
      },
      {
        name: "guess trim, case-insensitive compare, empty rejection",
        artifact: [/guess/i, /trim/i, /case-insensitive/i, /empty.*guess/i],
        code: [/guess/i, /\.trim\(\)/i, /toLowerCase\(\)/i, /empty/i],
      },
      {
        name: "guess history sync and scoring",
        artifact: [/guess history/i, /\+100/i, /0 points/i, /score/i],
        code: [/guessHistory/i, /guesses/i, /score/i, /100/i],
      },
      {
        name: "correct guess moves to result",
        artifact: [/correct guess.*result/i, /ends.*round/i, /ends.*game/i],
        code: [/status.*result/i, /correct/i, /winner/i, /endedAt/i],
      },
    ],
  },
  {
    name: "Scenario 4: Result & Restart",
    concepts: [
      {
        name: "result shows word, scores, full history",
        artifact: [/result/i, /correct word/i, /final scores/i, /full guess history/i],
        code: [/Result/i, /secretWord/i, /scores/i, /guessHistory|guesses/i],
      },
      {
        name: "host restart preserves players and clears round state",
        artifact: [/restart/i, /preserve.*players/i, /clear.*state/i, /lobby/i],
        code: [/restart/i, /players/i, /participants/i, /status.*lobby/i, /secretWord.*undefined|null/i],
      },
      {
        name: "backend role permissions",
        artifact: [/host-only/i, /drawer-only/i, /guesser/i, /backend.*permission/i],
        code: [/status\(403\)/i, /Forbidden/i, /host/i, /drawer/i, /guesser/i],
      },
    ],
  },
];

function scenarioCoverageHeuristic() {
  const artifactFiles = [...walkFiles("specs"), ...walkFiles(".specify/memory")].filter((file) =>
    [".md", ".json"].includes(path.extname(file))
  );
  const codeFiles = [...walkFiles("backend/src"), ...walkFiles("frontend/src")].filter((file) =>
    [".ts", ".tsx", ".js", ".jsx"].includes(path.extname(file))
  );

  const scenarios = scenarioDefinitions.map((scenario) => {
    const concepts = scenario.concepts.map((concept) => {
      const artifactPatterns = concept.artifact.map((regex, index) => ({
        label: `artifact-${index + 1}`,
        regex,
      }));
      const codePatterns = concept.code.map((regex, index) => ({
        label: `code-${index + 1}`,
        regex,
      }));
      const artifactEvidence = firstLineMatches(artifactFiles, artifactPatterns, 3);
      const codeEvidence = firstLineMatches(codeFiles, codePatterns, 3);
      const status = artifactEvidence.length > 0 && codeEvidence.length > 0 ? "pass" : "fail";

      return {
        name: concept.name,
        status,
        artifactEvidence,
        codeEvidence,
      };
    });

    return {
      name: scenario.name,
      status: statusFromChecks(concepts),
      concepts,
    };
  });

  return {
    status: statusFromChecks(scenarios),
    scenarios,
  };
}

function buildTestSummary() {
  const commands = [];

  for (const project of ["backend", "frontend"]) {
    if (!existsSync(path.join(root, project, "package.json"))) {
      commands.push({
        project,
        command: "npm run build",
        status: "fail",
        reason: `${project}/package.json not found.`,
      });
      continue;
    }

    if (hasPackageScript(project, "build")) {
      commands.push(runCommand(project, "npm", ["run", "build"]));
    } else {
      commands.push({
        project,
        command: "npm run build",
        status: "fail",
        reason: "No build script found.",
      });
    }

    if (hasPackageScript(project, "test")) {
      commands.push(runCommand(project, "npm", ["test"]));
    } else {
      commands.push({
        project,
        command: "npm test",
        status: "pass",
        reason: "No test script found.",
      });
    }
  }

  if (existsSync(path.join(root, "package.json")) && hasPackageScript(".", "test")) {
    commands.push(runCommand(".", "npm", ["test"]));
  }

  const failed = commands.filter((command) => command.status === "fail" || command.status === "error");

  return {
    status: failed.length > 0 ? "fail" : "pass",
    commands,
  };
}

function markdownTable(rows) {
  return rows.join("\n");
}

function formatStatus(status) {
  const mapping = {
    pass: "PASS",
    fail: "FAIL",
    error: "FAIL",
  };
  return mapping[status] || status;
}

function renderArtifactMarkdown(inventory) {
  const rows = [
    "| Item | Status | Details |",
    "|------|--------|---------|",
    `| Constitution | ${formatStatus(inventory.constitution.exists ? "pass" : "fail")} | ${inventory.constitution.path} (${inventory.constitution.characters} chars) |`,
    `| Feature folders | ${formatStatus(inventory.featureCount >= 4 ? "pass" : "fail")} | ${inventory.featureCount} specs/NNN-* folders, ${inventory.completeFeatureCount} complete |`,
    `| Reflection | ${formatStatus(inventory.reflection.exists ? "pass" : "fail")} | ${inventory.reflection.path} (${inventory.reflection.characters} chars) |`,
  ];

  for (const feature of inventory.features) {
    const missing = feature.files.filter((file) => !file.exists).map((file) => path.basename(file.path));
    rows.push(
      `| ${feature.directory} | ${formatStatus(feature.complete ? "pass" : "fail")} | ${
        missing.length > 0 ? `Missing ${missing.join(", ")}` : "spec.md, plan.md, tasks.md present"
      } |`
    );
  }

  const notes = inventory.notes.length > 0
    ? `\n\nSize notes:\n${inventory.notes.map((note) => `- ${note}`).join("\n")}`
    : "";
  const failures = inventory.failures.length > 0
    ? `\n\nFailures:\n${inventory.failures.map((failure) => `- ${failure}`).join("\n")}`
    : "";

  return `${markdownTable(rows)}${notes}${failures}`;
}

function renderForbiddenMarkdown(scan) {
  const lines = [`Status: ${formatStatus(scan.status)}`];

  if (scan.implementationMatches.length > 0) {
    lines.push("\nImplementation matches:");
    lines.push(...scan.implementationMatches.map((match) => `- ${match.pattern}: \`${formatEvidenceItem(match)}\``));
  }

  if (scan.directDependencyMatches.length > 0) {
    lines.push("\nDirect dependency matches:");
    lines.push(
      ...scan.directDependencyMatches.map(
        (match) => `- ${match.pattern}: \`${match.file}\` declares \`${match.dependency}\``
      )
    );
  }

  if (scan.lockfileNotes.length > 0) {
    lines.push("\nLockfile-only notes:");
    lines.push(...scan.lockfileNotes.map((match) => `- ${match.pattern}: \`${formatEvidenceItem(match)}\``));
  }

  if (scan.implementationMatches.length === 0 && scan.directDependencyMatches.length === 0 && scan.lockfileNotes.length === 0) {
    lines.push("\nNo forbidden technology patterns found.");
  }

  return lines.join("\n");
}

function compactEvidence(matches) {
  if (matches.length === 0) return "none";
  return matches.map((match) => `\`${match.file}:${match.line}\``).join(", ");
}

function renderScenarioMarkdown(coverage) {
  const rows = [
    "| Scenario | Concept | Status | Artifact evidence | Code evidence |",
    "|----------|---------|--------|-------------------|---------------|",
  ];

  for (const scenario of coverage.scenarios) {
    for (const concept of scenario.concepts) {
      rows.push(
        `| ${scenario.name} | ${concept.name} | ${formatStatus(concept.status)} | ${compactEvidence(concept.artifactEvidence)} | ${compactEvidence(concept.codeEvidence)} |`
      );
    }
  }

  return markdownTable(rows);
}

function renderBuildMarkdown(summary) {
  const rows = [
    "| Project | Command | Status | Details |",
    "|---------|---------|--------|---------|",
  ];

  for (const command of summary.commands) {
    const details = command.reason
      ? command.reason
      : `exit ${command.exitCode}; ${Math.round((command.durationMs ?? 0) / 1000)}s`;
    rows.push(`| ${command.project} | \`${command.command}\` | ${formatStatus(command.status)} | ${details} |`);
  }

  const excerpts = summary.commands
    .filter((command) => command.outputExcerpt && command.status !== "pass")
    .map((command) => `\n<details><summary>${command.project}: ${command.command}</summary>\n\n\`\`\`text\n${command.outputExcerpt}\n\`\`\`\n</details>`)
    .join("\n");

  return `${markdownTable(rows)}${excerpts}`;
}

const inventory = artifactInventory();
const forbidden = forbiddenTechnologyScan();
const coverage = scenarioCoverageHeuristic();
const buildSummary = buildTestSummary();

const buildFailures = buildSummary.commands
  .filter((command) => command.status === "fail" || command.status === "error")
  .map((command) => command.reason
    ? `Build/test: ${command.project} \`${command.command}\` failed: ${command.reason}`
    : `Build/test: ${command.project} \`${command.command}\` failed with exit ${command.exitCode ?? "error"}.`);

const failureReasons = [
  ...inventory.failures.map((failure) => `Artifact inventory: ${failure}`),
  ...forbidden.failures.map((failure) => `Forbidden technology: ${failure}`),
  ...(coverage.status === "fail" ? ["Scenario coverage: Required scenario evidence was not found in both artifacts and code."] : []),
  ...buildFailures,
];

const report = {
  generatedAt: new Date().toISOString(),
  status: failureReasons.length > 0 ? "fail" : "pass",
  failureReasons,
  artifactInventory: inventory,
  forbiddenTechnologyScan: forbidden,
  scenarioCoverageHeuristic: coverage,
  buildTestSummary: buildSummary,
};

const markdown = `# Pre-Evaluation Check

Generated: ${report.generatedAt}

Overall status: **${formatStatus(report.status)}**

This report is automated evidence for review. It is not the final evaluation score. Reviewers should verify findings independently against the repository.

## Failure Reasons

${failureReasons.length > 0 ? failureReasons.map((reason) => `- ${reason}`).join("\n") : "- None"}

## Artifact Inventory

${renderArtifactMarkdown(inventory)}

## Forbidden Technology Scan

${renderForbiddenMarkdown(forbidden)}

## Scenario Coverage Heuristic

Status: ${formatStatus(coverage.status)}

${renderScenarioMarkdown(coverage)}

## Build/Test Summary

Status: ${formatStatus(buildSummary.status)}

${renderBuildMarkdown(buildSummary)}

## Reviewer Notes

Use this report as a starting evidence bundle only. Verify each finding by reading the referenced files, then apply the official evaluation prompt and rubric.
`;

writeFileSync(path.join(outputDir, "precheck-report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(outputDir, "precheck-report.md"), markdown);

console.log(markdown);
process.exitCode = failureReasons.length > 0 ? 1 : 0;
