import { jest } from '@jest/globals';
import * as nodePath from 'node:path';

const mockMkdirSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
const mockRmSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    default: {
        mkdirSync: mockMkdirSync,
        readdirSync: mockReaddirSync,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
        existsSync: mockExistsSync,
        statSync: mockStatSync,
        rmSync: mockRmSync
    },
    mkdirSync: mockMkdirSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    statSync: mockStatSync,
    rmSync: mockRmSync
}));

jest.unstable_mockModule('node:path', () => ({
    ...nodePath,
    default: nodePath
}));

describe('copy-skill-refs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReaddirSync
            .mockReturnValueOnce(['sap-fiori-opa5-test-development', 'sap-fiori-app-development', 'some-file.json']) // skillsRoot
            .mockReturnValueOnce(['v4-instructions.md', 'README.txt']); // opa5 references/
        mockStatSync.mockReturnValueOnce({ isDirectory: () => true }); // opa5 is a dir
        mockExistsSync
            .mockReturnValueOnce(true) // destRoot exists — rmSync should be called
            .mockReturnValueOnce(true) // opa5 SKILL.md exists
            .mockReturnValueOnce(true); // opa5 references/ exists
        mockReadFileSync.mockReturnValue('# Section\n\nContent\n\n---\n\n# Next\n\nMore');
    });

    it('copies SKILL.md and references/*.md only for sap-fiori-opa5-test-development, skipping other skills', async () => {
        await import('../src/scripts/copy-skill-refs.js');

        // destRoot is cleaned before writing
        expect(mockRmSync).toHaveBeenCalledTimes(1);
        expect(mockRmSync).toHaveBeenCalledWith(expect.stringContaining('skills_copy'), { recursive: true, force: true });

        // statSync called once — only for the allowlisted skill (non-allowlisted entries are filtered before stat)
        expect(mockStatSync).toHaveBeenCalledTimes(1);
        expect(mockStatSync).toHaveBeenCalledWith(expect.stringContaining('sap-fiori-opa5-test-development'));

        // Only opa5 gets a dest dir
        expect(mockMkdirSync).toHaveBeenCalledTimes(1);
        expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('sap-fiori-opa5-test-development'), {
            recursive: true
        });
        expect(mockMkdirSync).not.toHaveBeenCalledWith(
            expect.stringContaining('sap-fiori-app-development'),
            expect.anything()
        );

        // opa5: SKILL.md + v4-instructions.md (README.txt skipped) = 2 writes
        expect(mockWriteFileSync).toHaveBeenCalledTimes(2);

        // All written content has the converted delimiter
        for (const call of mockWriteFileSync.mock.calls) {
            const content = (call as [string, string])[1];
            expect(content).toContain('--------------------------------');
            expect(content).not.toMatch(/^---$/m);
        }

        // app-development was not written
        const writtenPaths = mockWriteFileSync.mock.calls.map((c) => (c as [string, string])[0]);
        expect(writtenPaths.filter((p) => p.includes('sap-fiori-app-development'))).toHaveLength(0);
    });
});
