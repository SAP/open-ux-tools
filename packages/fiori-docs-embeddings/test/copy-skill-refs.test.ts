import { jest } from '@jest/globals';
import * as nodePath from 'node:path';

const mockMkdirSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    default: {
        mkdirSync: mockMkdirSync,
        readdirSync: mockReaddirSync,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
        existsSync: mockExistsSync
    },
    mkdirSync: mockMkdirSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    existsSync: mockExistsSync
}));

jest.unstable_mockModule('node:path', () => ({
    ...nodePath,
    default: nodePath
}));

describe('copy-skill-refs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // skills root: two skills, one with references/, one without
        mockReaddirSync
            .mockReturnValueOnce(['sap-fiori-opa5-test-development', 'sap-fiori-app-development']) // skillsRoot readdir
            .mockReturnValueOnce(['v4-instructions.md', 'README.txt']); // opa5 references/ readdir
        mockExistsSync
            .mockReturnValueOnce(true) // opa5 references/ exists
            .mockReturnValueOnce(false); // app-development references/ does not exist
        mockReadFileSync.mockReturnValue('# Section\n\nContent\n\n---\n\n# Next Section\n\nMore content');
    });

    it('copies .md files from each skill references/ into per-skill subdirectory with delimiter conversion', async () => {
        await import('../src/scripts/copy-skill-refs.js');

        // Created dest dir for opa5 skill only
        expect(mockMkdirSync).toHaveBeenCalledTimes(1);
        expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('sap-fiori-opa5-test-development'), {
            recursive: true
        });

        // Only the .md file copied — README.txt skipped
        expect(mockWriteFileSync).toHaveBeenCalledTimes(1);

        const [destPath, writtenContent] = mockWriteFileSync.mock.calls[0] as [string, string];
        expect(destPath).toContain('sap-fiori-opa5-test-development');
        expect(destPath).toContain('v4-instructions.md');
        expect(writtenContent).toContain('--------------------------------');
        expect(writtenContent).not.toMatch(/^---$/m);

        // Skill with no references/ dir is skipped entirely
        expect(mockMkdirSync).not.toHaveBeenCalledWith(
            expect.stringContaining('sap-fiori-app-development'),
            expect.anything()
        );
    });
});
