const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

/**
 * Static basic usage section of the README.
 */
const STATIC_USAGE_SECTION = `# [Usage](#usage)

It is recommended to use the cli using \`npx\` to always get the latest version without the need to install or update it manually. You can run it using:

\`\`\`sh
npx -y @sap-ux/create@latest [command] [sub-command] /path/to/project
\`\`\`

If you prefer to download the module, you can install it globally or add it as \`devDependency\` to a project. Once installed, you can run it using

\`\`\`sh
# install globally
npm i -g @sap-ux/create@latest
# or install as devDependency
npm i -D @sap-ux/create@latest
# then run
sap-ux [command] [sub-command] /path/to/project
\`\`\`

\`Note:\` If the project path is not provided, the current working directory is used.

---

`;

/**
 * Executes the CLI command to get its JSON specification.
 *
 * @returns The parsed JSON specification object.
 */
function getJsonSpec() {
    const result = spawnSync('node', ['dist/index.js', '--generateJsonSpec'], {
        encoding: 'utf8'
    });

    if (result.error) {
        throw new Error(`Failed to execute CLI: ${result.error.message}`);
    }

    if (result.status !== 0) {
        throw new Error(`CLI process exited with code ${result.status}${result.stderr ? `\nStderr: ${result.stderr}` : ''}`);
    }

    const output = result.stdout;

    // Extract JSON from output, ignoring any non-JSON content (e.g., i18next messages, logger formatting)
    // Find the first '{' and the last '}' to extract the JSON object
    const firstBrace = output.indexOf('{');
    const lastBrace = output.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error(`No JSON object found in CLI output`);
    }

    const jsonString = output.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
}

/**
 * Creates a URL-friendly anchor string from a command path.
 *
 * @param commandPath - The array of command names leading to the command.
 * @returns The anchor string.
 */
function generateAnchor(commandPath) {
    return commandPath.join('-');
}

/**
 * Renders the options list for a command into a Markdown bulleted list.
 *
 * @param options - The array of option objects.
 * @returns A Markdown string representing the options.
 */
function renderOptions(options) {
    if (!options || options.length === 0) return '';

    return options.map(opt => {
        let md = `- \`${opt.name}\``;
        if (opt.required) md += ' _(required)_';
        md += ` - ${opt.description}`;
        if (opt.defaultValue !== undefined) {
            md += ` _(default: \`${opt.defaultValue}\`)_`;
        }
        return md;
    }).join('\n');
}

/**
 * Recursively renders a command and all its subcommands.
 *
 * @param cmd - The command object from the JSON spec.
 * @param parentPath - The array of parent command names leading to this command.
 * @returns An array of Markdown strings for the command and its subcommands.
 */
function renderCommandAndSubcommands(cmd, parentPath) {
    const currentPath = [...parentPath, cmd.name].filter(Boolean);
    const fullCommandName = currentPath.join(' ');
    const anchor = generateAnchor(currentPath);

    let md = `## [\`${fullCommandName}\`](#${anchor})\n\n`;
    md += `${cmd.description.replace(/ {2,}/g, '\n')}\n\n`;

    if (cmd.options && cmd.options.length > 0) {
        md += `Options:\n${renderOptions(cmd.options)}\n\n`;
    }

    const commandDocs = [md];
    let subCommandDocs = [];
    const subcommands = cmd.subcommands || [];

    subcommands.forEach(sub => {
        subCommandDocs = subCommandDocs.concat(
            renderCommandAndSubcommands(sub, currentPath)
        );
    });

    return commandDocs.concat(subCommandDocs);
}

/**
 * Generates the full README content from the CLI specification.
 *
 * @param spec - The JSON specification object.
 * @returns The complete README content as a Markdown string.
 */
function generateReadme(spec) {
    // --- 0. Badges ---
    let md = `[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/create/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/create)\n`;

    // --- 1. Header ---
    md += `# [\`@sap-ux/create\`](https://github.com/SAP/open-ux-tools/tree/main/packages/create) CLI Reference\n\n`;
    md += `${spec.description}\n\n`;

    // --- 2. Static Usage Section ---
    md += STATIC_USAGE_SECTION;

    // --- 3. Generated Commands Section ---
    md += `# [Commands](#commands)\n\n`;

    let allCommandDocs = [];
    const rootPath = [spec.name];
    const topLevelCommands = spec.commands || [];

    topLevelCommands.forEach(cmd => {
        allCommandDocs = allCommandDocs.concat(
            renderCommandAndSubcommands(cmd, rootPath)
        );
    });

    md += allCommandDocs.join('--------------------------------\n\n');

    return md;
}

// Main execution
try {
    const spec = getJsonSpec();
    const readme = generateReadme(spec);
    fs.writeFileSync('README.md', readme, 'utf8');
    console.log('✅ README.md generated successfully.');
} catch (error) {
    console.error('❌ Failed to generate README:', error.message);
    process.exit(1);
}