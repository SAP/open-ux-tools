import { jest } from '@jest/globals';
import * as nodePath from 'node:path';

const mockMkdirSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    default: {
        mkdirSync: mockMkdirSync,
        readdirSync: mockReaddirSync,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
        existsSync: mockExistsSync,
        statSync: mockStatSync
    },
    mkdirSync: mockMkdirSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync,
    statSync: mockStatSync
}));

jest.unstable_mockModule('node:path', () => ({
    ...nodePath,
    default: nodePath
}));

describe('copy-skill-refs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // skillsRoot: one skill with SKILL.md + references/, one with SKILL.md only, one non-directory entry
        mockReaddirSync
            .mockReturnValueOnce(['sap-fiori-opa5-test-development', 'sap-fiori-app-development', 'some-file.json']) // skillsRoot
            .mockReturnValueOnce(['v4-instructions.md', 'README.txt']); // opa5 references/
        mockStatSync
            .mockReturnValueOnce({ isDirectory: () => true }) // opa5 is a dir
            .mockReturnValueOnce({ isDirectory: () => true }) // app-development is a dir
            .mockReturnValueOnce({ isDirectory: () => false }); // some-file.json is not a dir
        mockExistsSync
            .mockReturnValueOnce(true) // opa5 SKILL.md exists
            .mockReturnValueOnce(true) // opa5 references/ exists
            .mockReturnValueOnce(true) // app-development SKILL.md exists
            .mockReturnValueOnce(false); // app-development references/ does not exist
        mockReadFileSync.mockReturnValue('# Section\n\nContent\n\n---\n\n# Next\n\nMore');
    });

    it('copies SKILL.md for every skill and references/*.md where present, with delimiter conversion', async () => {
        await import('../src/scripts/copy-skill-refs.js');

        // Both skills get a dest dir
        expect(mockMkdirSync).toHaveBeenCalledTimes(2);
        expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('sap-fiori-opa5-test-development'), {
            recursive: true
        });
        expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('sap-fiori-app-development'), {
            recursive: true
        });

        // opa5: SKILL.md + v4-instructions.md (README.txt skipped) = 2 writes
        // app-development: SKILL.md only = 1 write
        expect(mockWriteFileSync).toHaveBeenCalledTimes(3);

        // All written content has the converted delimiter
        for (const call of mockWriteFileSync.mock.calls) {
            const content = (call as [string, string])[1];
            expect(content).toContain('--------------------------------');
            expect(content).not.toMatch(/^---$/m);
        }

        // app-development got no references/ dir written
        const writtenPaths = mockWriteFileSync.mock.calls.map((c) => (c as [string, string])[0]);
        expect(writtenPaths.filter((p) => p.includes('sap-fiori-app-development'))).toHaveLength(1);
        expect(writtenPaths.filter((p) => p.includes('sap-fiori-app-development'))[0]).toContain('SKILL.md');
    });
});
