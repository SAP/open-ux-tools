import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');
const SKILLS_ROOT = path.resolve(__dirname, '../../../plugins-coding-agents/fiori/skills');
const ROOT_SKILL_DIR = path.resolve(SKILLS_ROOT, 'sap-fiori-create-cli');

const BEHAVIOR_GUIDANCE = `
## How to use this CLI

- Always invoke via \`npx -y @sap-ux/create@latest\` — never suggest a global install.
- Run with \`--simulate\` / \`-s\` first for any write command when the user has not confirmed they want files changed. It implies \`--verbose\` on most subcommands.
- Pass passwords via \`--password env:MY_VAR\` — never plain-text in the shell command.
- Commands that prompt interactively (\`generate adaptation-project\`, \`add model\`, \`add component-usages\`) require either \`-y\` / \`--yes\` or all required flags pre-filled to run non-interactively.
- \`add annotations\`, \`change data-source\`, and \`change inbound\` are not supported for Cloud Foundry projects.
- \`add adp-cf-config\` is experimental and may change or be removed without notice.
`;

/**
 * Executes the CLI command to get its JSON specification.
 *
 * @returns The parsed JSON specification object.
 */
function getJsonSpec() {
    // cwd is explicit so the script works when called from outside packages/create/
    const output = execSync('node dist/index.js --generateJsonSpec', {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8'
    });
    const firstBrace = output.indexOf('{');
    const lastBrace = output.lastIndexOf('}');
    if (firstBrace === -1) {
        throw new Error('No JSON object found in CLI output');
    }
    return JSON.parse(output.substring(firstBrace, lastBrace + 1));
}

/**
 * Renders the options list for a command into a Markdown bulleted list.
 *
 * @param options - The array of option objects.
 * @returns A Markdown string representing the options.
 */
function renderOptions(options) {
    if (!options || options.length === 0) return '';
    return options
        .map((opt) => {
            let md = `- \`${opt.name}\``;
            if (opt.required) md += ' _(required)_';
            md += ` - ${opt.description}`;
            if (opt.defaultValue !== undefined) md += ` _(default: \`${opt.defaultValue}\`)_`;
            return md;
        })
        .join('\n');
}

/**
 * Returns a reference pointer line if a matching file exists in the skill's
 * references/ directory, otherwise returns null.
 *
 * @param subcommandFullName - e.g. "convert preview-config"
 * @param skillDir - absolute path to the sub-skill directory
 */
function referencePointer(subcommandFullName, skillDir) {
    const filename = subcommandFullName.replace(/\s+/g, '-') + '.md';
    const filepath = path.join(skillDir, 'references', filename);
    if (!fs.existsSync(filepath)) return null;
    return `> For the full workflow guide including prerequisites and manual steps, read \`references/${filename}\`.`;
}

/**
 * Renders all subcommands of a top-level command into markdown sections.
 *
 * @param topLevelCmd - The top-level command object from the JSON spec.
 * @param skillDir - Absolute path to the sub-skill directory (for reference lookup).
 */
function renderSubcommands(topLevelCmd, skillDir) {
    const sections = [];
    for (const sub of topLevelCmd.subcommands || []) {
        const fullName = `${topLevelCmd.name} ${sub.name}`;
        const anchor = `${topLevelCmd.name}-${sub.name}`;
        let md = `## [\`${fullName}\`](#${anchor})\n\n`;
        md += `${sub.description.replace(/ {2,}/g, '\n').trim()}\n\n`;

        const pointer = referencePointer(fullName, skillDir);
        if (pointer) md += `${pointer}\n\n`;

        if (sub.options && sub.options.length > 0) {
            md += `Options:\n${renderOptions(sub.options)}\n\n`;
        }
        sections.push(md);
    }
    return sections.join('--------------------------------\n\n');
}

/**
 * Generates the thin root skill that routes to per-command sub-skills.
 *
 * @param spec - The full CLI JSON spec.
 * @param version - The package version string.
 */
function generateRootSkill(spec, version) {
    const rows = spec.commands
        .map((cmd) => {
            const subs = (cmd.subcommands || []).map((s) => `\`${s.name}\``).join(', ');
            return `| \`${cmd.name}\` | ${subs} | \`sap-fiori-create-cli-${cmd.name}\` |`;
        })
        .join('\n');

    const frontmatter = `---
name: sap-fiori-create-cli
description: Use when asked to run any @sap-ux/create CLI command for SAP Fiori projects. Routes to the specific command skill. Use when the exact subcommand is unknown or when providing general guidance.
argument-hint: command and subcommand (e.g., add mockserver-config, generate adaptation-project)
metadata:
  author: sap-fiori-tools
  version: "${version}"
---
`;

    const commandsTable = `# Commands

| Command | Subcommands | Skill |
|---|---|---|
${rows}

Invoke the skill for the specific command group to get full options and examples.
`;

    return frontmatter + BEHAVIOR_GUIDANCE + '\n---\n\n' + commandsTable;
}

/**
 * Generates a sub-skill for one top-level command group.
 *
 * @param cmd - The top-level command object from the JSON spec.
 * @param version - The package version string.
 * @param skillDir - Absolute path to the sub-skill directory.
 */
function generateSubSkill(cmd, version, skillDir) {
    const subNames = (cmd.subcommands || []).map((s) => s.name).join(', ');
    const frontmatter = `---
name: sap-fiori-create-cli-${cmd.name}
description: Use when running @sap-ux/create ${cmd.name} — ${subNames}.
metadata:
  author: sap-fiori-tools
  version: "${version}"
---
`;

    const groupHeading = `# [\`${cmd.name}\`](#${cmd.name})

> For usage rules (--simulate, --password env:MY_VAR, CF restrictions) see the \`sap-fiori-create-cli\` skill.

The available subcommands are: ${subNames}

--------------------------------

`;

    return frontmatter + '\n' + groupHeading + renderSubcommands(cmd, skillDir);
}

/**
 * Writes a skill file only if its content has changed (idempotency).
 * Exits the process with code 1 if the content exceeds 500 lines.
 *
 * @param filePath - Absolute path to the SKILL.md file.
 * @param content - The new content to write.
 * @param label - Short label used in log messages.
 */
function writeSkill(filePath, content, label) {
    const lineCount = content.split('\n').length;
    if (lineCount > 500) {
        console.error(
            `❌ ${label} exceeds 500 lines (${lineCount} lines). Reduce content to stay within the vally skill-size limit.`
        );
        process.exit(1);
    }

    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    // Exclude version line from comparison — a version-only bump should not regenerate all skills
    const normalize = (text) => text.replace(/^  version: ".*"$/gm, '  version: ""');
    if (normalize(content) === normalize(existing)) {
        console.log(`ℹ️  ${label} unchanged — skipping write.`);
        return;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${label} written (${lineCount} lines)`);
}

try {
    const spec = getJsonSpec();
    const { version } = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    // Root skill — thin routing table
    writeSkill(
        path.join(ROOT_SKILL_DIR, 'SKILL.md'),
        generateRootSkill(spec, version),
        'sap-fiori-create-cli/SKILL.md'
    );

    // Sub-skills — one per top-level command group
    for (const cmd of spec.commands) {
        const skillDir = path.resolve(SKILLS_ROOT, `sap-fiori-create-cli-${cmd.name}`);
        writeSkill(
            path.join(skillDir, 'SKILL.md'),
            generateSubSkill(cmd, version, skillDir),
            `sap-fiori-create-cli-${cmd.name}/SKILL.md`
        );
    }
} catch (error) {
    console.error('❌ Failed to generate skills:', error.message);
    process.exit(1);
}
