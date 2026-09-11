import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const DEFAULT_SKILLS_PATH = join(homedir(), '.agents', 'skills');
const SKILLS_SOURCE_DIR = join(__dirname, '..', 'skills');

/**
 * Returns the list of skill names bundled with this package.
 *
 * @returns Array of skill directory names found in the bundled skills directory.
 */
export function getBundledSkills(): string[] {
    return readdirSync(SKILLS_SOURCE_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
}

/**
 * Copies all bundled Fiori skills into the target directory.
 * Each skill is placed in its own subdirectory named after the skill.
 *
 * @param targetPath Optional path to the skills directory. Defaults to ~/.agents/skills.
 */
export async function installSkills(targetPath?: string): Promise<void> {
    const targetDir = resolve(targetPath ?? DEFAULT_SKILLS_PATH);

    if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
    }

    const skills = getBundledSkills();

    if (skills.length === 0) {
        process.stdout.write('No skills found to install.\n');
        return;
    }

    process.stdout.write(`Installing ${skills.length} Fiori skill(s) to: ${targetDir}\n\n`);

    for (const skill of skills) {
        const sourceSkillDir = join(SKILLS_SOURCE_DIR, skill);
        const targetSkillDir = join(targetDir, skill);

        const isUpdate = existsSync(targetSkillDir);
        cpSync(sourceSkillDir, targetSkillDir, { recursive: true });

        const status = isUpdate ? 'updated' : 'installed';
        process.stdout.write(`  ${status}: ${skill}\n`);
    }

    process.stdout.write(`\nDone. Skills are ready to use in your AI agent client.\n`);
}
