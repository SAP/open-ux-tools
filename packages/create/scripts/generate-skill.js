import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const README_PATH = path.resolve(__dirname, '../README.md');
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../package.json');
const SKILL_OUTPUT_PATH = path.resolve(
    __dirname,
    '../../../plugins-coding-agents/fiori/skills/sap-fiori-create-cli/SKILL.md'
);
const REFERENCES_DIR = path.resolve(path.dirname(SKILL_OUTPUT_PATH), 'references');

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
 * Converts a command heading like `add mockserver-config` to the reference filename
 * `add-mockserver-config.md` by replacing spaces with hyphens.
 * @param {string} commandPath - The command path extracted from the heading, e.g. "convert preview-config".
 * @returns {string} The reference filename, e.g. "convert-preview-config.md".
 */
function referenceFilename(commandPath) {
    return commandPath.replace(/\s+/g, '-') + '.md';
}

/**
 * Injects a reference pointer after each command section heading that has a
 * matching file in the references/ directory.
 *
 * Heading format in README: ## [`convert preview-config`](#convert-preview-config)
 * Matching reference file:  references/convert-preview-config.md
 * @param {string} commandsSection - The commands section of the README.
 * @returns {string} The commands section with reference pointers injected.
 */
function injectReferencePointers(commandsSection) {
    // Match subcommand headings: ## [`<parent> <sub>`](#anchor) — two-word command paths only
    return commandsSection.replace(/^(## \[`([^`]+)`\]\(#[^)]+\))/gm, (match, heading, commandPath) => {
        // Only inject for subcommands (command path contains a space, e.g. "add mockserver-config")
        if (!commandPath.includes(' ')) return match;

        const filename = referenceFilename(commandPath);
        const filepath = path.join(REFERENCES_DIR, filename);

        if (!fs.existsSync(filepath)) return match;

        return (
            match +
            `\n\n> For the full workflow guide including prerequisites and manual steps, read \`references/${filename}\`.`
        );
    });
}

/**
 * Strips README formatting that bloats SKILL.md beyond the 500-line vally limit:
 * 1. Removes `--------------------------------` separator lines.
 * 2. Collapses group-command blocks (single-word commands like `add`, `generate`) to
 *    just the heading and the "The available subcommands are:" line — the verbose
 *    description and Usage line add no value for an agent tool.
 * 3. Merges 3+ consecutive blank lines into one.
 * @param {string} section - The commands section of README.md (from "# [Commands]" onwards).
 * @returns {string} Compacted section suitable for SKILL.md.
 */
function compactCommandsSection(section) {
    let text = section.replace(/^-{32}\n\n?/gm, '');

    const blocks = text.split(/(?=^## \[`)/m);
    text = blocks
        .map((block) => {
            const headingMatch = block.match(/^## \[`([^`]+)`\]/);
            if (!headingMatch) return block;

            const commandName = headingMatch[1];
            if (!commandName.includes(' ')) {
                const subMatch = block.match(/^(The available subcommands are:[^\n]+)/m);
                if (subMatch) {
                    const anchorMatch = block.match(/^## \[`[^`]+`\]\(#([^)]+)\)/);
                    const anchor = anchorMatch ? anchorMatch[1] : commandName.toLowerCase();
                    return `## [\`${commandName}\`](#${anchor})\n\n${subMatch[1]}\n\n`;
                }
            }
            return block;
        })
        .join('');

    return text.replace(/\n{3,}/g, '\n\n');
}

try {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    const { version } = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

    // Drop badges, header, and usage section — keep from "# [Commands]" onwards
    const commandsIndex = readme.indexOf('# [Commands]');
    if (commandsIndex === -1) {
        throw new Error('Could not find "# [Commands]" section in README.md');
    }
    const commandsSection = compactCommandsSection(injectReferencePointers(readme.slice(commandsIndex)));

    // Only write if the dynamic commands content changed.
    // Frontmatter and BEHAVIOR_GUIDANCE are static (defined in this script), so comparing
    // just commandsSection is sufficient and avoids fragile version-stripping logic.
    // This prevents a SKILL.md diff — and the MCP review it triggers — on every
    // @sap-ux/create release where only the package version bumped but no commands changed.
    const existingSkill = fs.existsSync(SKILL_OUTPUT_PATH) ? fs.readFileSync(SKILL_OUTPUT_PATH, 'utf8') : '';

    // Extract the commands section from the existing file for comparison.
    // Everything from "# [Commands]" onwards is the dynamic part — frontmatter
    // and BEHAVIOR_GUIDANCE are static so we don't need to compare them.
    const existingCommandsIndex = existingSkill.indexOf('# [Commands]');
    const existingCommandsSection = existingCommandsIndex !== -1 ? existingSkill.slice(existingCommandsIndex) : '';

    const frontmatter = `---
name: sap-fiori-create-cli
description: Run, invoke, and test the @sap-ux/create CLI — generate, add, convert, remove, update, change, list, get commands for SAP Fiori projects. Use when asked to run sap-ux, invoke create CLI, add config to a project, generate adaptation-project, or test any sap-ux/create subcommand.
argument-hint: command and subcommand (e.g., add mockserver-config, generate adaptation-project)
metadata:
  author: sap-fiori-tools
  version: "${version}"
---

`;
    const newSkill = frontmatter + BEHAVIOR_GUIDANCE + '\n---\n\n' + commandsSection;
    const lineCount = newSkill.split('\n').length;
    if (lineCount > 500) {
        console.error(
            `❌ SKILL.md exceeds 500 lines (${lineCount} lines). Reduce README.md content to stay within the vally skill-size limit.`
        );
        process.exit(1);
    }

    if (commandsSection === existingCommandsSection) {
        console.log('ℹ️  SKILL.md content unchanged — skipping write.');
    } else {
        fs.mkdirSync(path.dirname(SKILL_OUTPUT_PATH), { recursive: true });
        fs.writeFileSync(SKILL_OUTPUT_PATH, newSkill, 'utf8');
        console.log(`✅ SKILL.md generated successfully at ${SKILL_OUTPUT_PATH} (${lineCount} lines)`);
    }
} catch (error) {
    console.error('❌ Failed to generate SKILL.md:', error.message);
    process.exit(1);
}
