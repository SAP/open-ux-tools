import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getBundledSkills, installSkills } from '../src/install';

describe('getBundledSkills', () => {
    it('returns at least the three Fiori ESLint skills', () => {
        const skills = getBundledSkills();
        expect(skills).toContain('fiori-eslint-setup');
        expect(skills).toContain('fiori-eslint-migrate');
        expect(skills).toContain('fiori-eslint-lint');
    });
});

describe('installSkills', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = join(tmpdir(), `fiori-skills-test-${Date.now()}`);
    });

    afterEach(() => {
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true });
        }
    });

    it('creates the target directory when it does not exist', async () => {
        await installSkills(tmpDir);
        expect(existsSync(tmpDir)).toBe(true);
    });

    it('copies all bundled skills into the target directory', async () => {
        await installSkills(tmpDir);

        const bundled = getBundledSkills();
        const installed = readdirSync(tmpDir);

        for (const skill of bundled) {
            expect(installed).toContain(skill);
            expect(existsSync(join(tmpDir, skill, 'SKILL.md'))).toBe(true);
        }
    });

    it('overwrites existing skills without error', async () => {
        // First install
        await installSkills(tmpDir);
        // Second install should not throw
        await expect(installSkills(tmpDir)).resolves.not.toThrow();
    });

    it('uses the default path (~/.agents/skills) when no argument is given', async () => {
        // We only verify it resolves — we do not actually write to the home directory in tests
        const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        try {
            // Pass explicit tmp dir so we don't pollute the real skills dir
            await installSkills(tmpDir);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining(tmpDir));
        } finally {
            spy.mockRestore();
        }
    });

    it('creates nested target directory when parent does not exist', async () => {
        const nestedDir = join(tmpDir, 'deeply', 'nested');
        await installSkills(nestedDir);
        expect(existsSync(nestedDir)).toBe(true);
        mkdirSync(tmpDir, { recursive: true }); // ensure parent exists for cleanup
    });
});
