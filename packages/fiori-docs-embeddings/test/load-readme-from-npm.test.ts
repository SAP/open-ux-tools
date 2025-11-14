const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock('@sap-ux/logger', () => ({
    ToolsLogger: jest.fn().mockImplementation(() => mockLogger)
}));

jest.mock('node:fs/promises', () => ({
    writeFile: jest.fn()
}));

describe('download readme from npmjs', () => {
    const testPackageName = '@sap/ux-ui5-tooling';
    const testReadmeContent = '# Test README';

    beforeAll(() => {
        process.argv = ['node', 'script.js', testPackageName];
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    it('should download readme from npmjs', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                readme: testReadmeContent
            })
        });
        const { writeFile } = await import('node:fs/promises');
        const mockedWriteFile = writeFile as jest.Mock;

        const script = await import('../src/scripts/load-readme-from-npm');
        await script.execution;

        expect(mockLogger.info).toHaveBeenCalledWith(`Fetching README for ${testPackageName}...`);
        expect(mockLogger.info).toHaveBeenCalledWith(`Successfully saved README to './data_local'`);
        const expectedFileName = `${testPackageName.split('/').pop()}-README.md`;
        expect(mockedWriteFile).toHaveBeenCalledWith(
            expect.stringContaining(expectedFileName),
            testReadmeContent,
            'utf-8'
        );
    });

    it('should handle fetch error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            statusText: 'Not Found'
        });

        const script = await import('../src/scripts/load-readme-from-npm');
        await script.execution;

        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to fetch package: Not Found.`);
        expect(mockLogger.error).toHaveBeenCalledWith(`Could not fetch README for ${testPackageName}.`);
    });

    it('should handle fetch throwing an exception', async () => {
        const fetchError = new Error('Network error');
        global.fetch = jest.fn().mockRejectedValue(fetchError);

        const script = await import('../src/scripts/load-readme-from-npm');
        await script.execution;

        expect(mockLogger.error).toHaveBeenCalledWith(
            `Error fetching README for ${testPackageName}: ${fetchError.message}`
        );
        expect(mockLogger.error).toHaveBeenCalledWith(`Could not fetch README for ${testPackageName}.`);
    });

    it('should handle missing readme content', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({})
        });

        const script = await import('../src/scripts/load-readme-from-npm');
        await script.execution;

        expect(mockLogger.error).toHaveBeenCalledWith(`Could not find README content for ${testPackageName}.`);
        expect(mockLogger.error).toHaveBeenCalledWith(`Could not fetch README for ${testPackageName}.`);
    });

    it('should handle writeFile error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                readme: testReadmeContent
            })
        });
        const { writeFile } = await import('node:fs/promises');
        const mockedWriteFile = writeFile as jest.Mock;
        mockedWriteFile.mockRejectedValue(new Error('Permission denied'));

        const script = await import('../src/scripts/load-readme-from-npm');
        await script.execution;

        const expectedFileName = `${testPackageName.split('/').pop()}-README.md`;
        expect(mockLogger.error).toHaveBeenCalledWith(
            `Error writing README file for ${expectedFileName}: Error: Permission denied.`
        );
    });

    it('should handle no package name error', async () => {
        //this test should always be the last one because we are overriding process.argv
        process.argv = ['node', 'script.js'];
        const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

        const script = await import('../src/scripts/load-readme-from-npm');
        await script.execution;

        expect(mockLogger.error).toHaveBeenCalledWith(`Please provide a package name as an argument.`);
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
