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
 * Returns a reference pointer line if a matching file exists in the root skill's
 * references/ directory, otherwise returns null.
 *
 * @param subcommandFullName - e.g. "convert preview-config"
 */
function referencePointer(subcommandFullName) {
    const filename = subcommandFullName.replace(/\s+/g, '-') + '.md';
    const filepath = path.join(ROOT_SKILL_DIR, 'references', filename);
    if (!fs.existsSync(filepath)) return null;
    return `> For the full workflow guide including prerequisites and manual steps, read \`references/${filename}\`.`;
}

/**
 * Renders all subcommands of a top-level command into markdown sections (for reference files).
 *
 * @param topLevelCmd - The top-level command object from the JSON spec.
 */
function renderSubcommands(topLevelCmd) {
    const sections = [];
    for (const sub of topLevelCmd.subcommands || []) {
        const fullName = `${topLevelCmd.name} ${sub.name}`;
        const anchor = `${topLevelCmd.name}-${sub.name}`;
        let md = `## [\`${fullName}\`](#${anchor})\n\n`;
        md += `${sub.description.replace(/ {2,}/g, '\n').trim()}\n\n`;

        const pointer = referencePointer(fullName);
        if (pointer) md += `${pointer}\n\n`;

        if (sub.options && sub.options.length > 0) {
            md += `Options:\n${renderOptions(sub.options)}\n\n`;
        }
        sections.push(md);
    }
    return sections.join('--------------------------------\n\n');
}

/**
 * Generates the root skill with per-command sections, full subcommand names and
 * descriptions, and pointers to per-command reference files for full option details.
 *
 * @param spec - The full CLI JSON spec.
 * @param version - The package version string.
 */
function generateRootSkill(spec, version) {
    const frontmatter = `---
name: sap-fiori-create-cli
description: Invokes the @sap-ux/create CLI — generate, add, convert, remove, update, change, list, get commands for SAP Fiori projects. Use when asked to run sap-ux, invoke create CLI, add config to a project, generate adaptation-project, or use any sap-ux/create subcommand. Full options for each command group are in the linked references.
argument-hint: command and subcommand (e.g., add mockserver-config, generate adaptation-project)
metadata:
  author: sap-fiori-tools
  version: "${version}"
---
`;

    const commandSections = spec.commands
        .map((cmd) => {
            const cmdDesc = cmd.description.split('\n')[0].trim();
            const tableRows = (cmd.subcommands || [])
                .map((sub) => {
                    const desc = sub.description.replace(/ {2,}/g, '\n').trim().split('\n')[0];
                    return `| \`${sub.name}\` | ${desc} |`;
                })
                .join('\n');

            return [
                `## \`${cmd.name}\``,
                '',
                cmdDesc,
                '',
                '| Subcommand | Description |',
                '|---|---|',
                tableRows,
                '',
                `> Full options and flags: \`references/${cmd.name}.md\``,
            ].join('\n');
        })
        .join('\n\n--------------------------------\n\n');

    return frontmatter + BEHAVIOR_GUIDANCE + '\n---\n\n# Commands\n\n' + commandSections + '\n';
}

/**
 * Generates the reference file for one top-level command group containing
 * full option details for all its subcommands.
 *
 * @param cmd - The top-level command object from the JSON spec.
 */
function generateReferenceFile(cmd) {
    return `# \`${cmd.name}\` — Full Options\n\n` + renderSubcommands(cmd);
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

/**
 * Writes a reference file only if its content has changed (idempotency).
 * Reference files have no line limit — they are not subject to the vally skill-size check.
 *
 * @param filePath - Absolute path to the reference markdown file.
 * @param content - The new content to write.
 * @param label - Short label used in log messages.
 */
function writeReference(filePath, content, label) {
    const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    if (content === existing) {
        console.log(`ℹ️  ${label} unchanged — skipping write.`);
        return;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${label} written`);
}

try {
    const spec = getJsonSpec();
    const { version } = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    // Root skill — per-command sections with subcommand descriptions
    writeSkill(
        path.join(ROOT_SKILL_DIR, 'SKILL.md'),
        generateRootSkill(spec, version),
        'sap-fiori-create-cli/SKILL.md'
    );

    // Reference files — full options per command group (auto-generated, no line limit)
    for (const cmd of spec.commands) {
        writeReference(
            path.join(ROOT_SKILL_DIR, 'references', `${cmd.name}.md`),
            generateReferenceFile(cmd),
            `references/${cmd.name}.md`
        );
    }
} catch (error) {
    console.error('❌ Failed to generate skills:', error.message);
    process.exit(1);
}
