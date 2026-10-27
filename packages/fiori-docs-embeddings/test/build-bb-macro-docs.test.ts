import { jest } from '@jest/globals';

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.unstable_mockModule('@sap-ux/logger', () => ({
    ToolsLogger: jest.fn().mockImplementation(() => mockLogger)
}));

const mockFs = {
    access: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn()
};
jest.unstable_mockModule('node:fs/promises', () => mockFs);

interface BuilderType {
    build(): Promise<void>;
}

/** Minimal TypeScript source with one @public @property and one @public @event. */
const MINIMAL_SOURCE = `
/**
 * A simple macro.
 * @public
 */
@defineUI5Class("sap.fe.macros.Simple")
class Simple {
    /**
     * The meta path.
     * @public
     */
    @property({ type: "string", required: true, expectedAnnotations: ["com.sap.vocabularies.UI.v1.LineItem"] })
    metaPath!: string;

    /**
     * The context path.
     * @public
     */
    @property({ type: "string" })
    contextPath!: string;

    /**
     * Fired when something happens.
     * @public
     */
    @event()
    press!: unknown;

    /**
     * Internal only.
     * @private
     */
    @property({ type: "boolean" })
    hidden!: boolean;
}
`;

/** Source that produces no @public members. */
const NO_PUBLIC_MEMBERS_SOURCE = `
/**
 * Internal class.
 */
@defineUI5Class("sap.fe.macros.Internal")
class Internal {
    /**
     * @private
     */
    @property({ type: "string" })
    secret!: string;
}
`;

/** Source with @deprecated and @since tags. */
const DEPRECATED_AND_SINCE_SOURCE = `
/**
 * Legacy macro.
 * @public
 */
@defineUI5Class("sap.fe.macros.Legacy")
class Legacy {
    /**
     * Old property.
     * @public
     * @deprecated since 1.100 use newProp instead
     */
    @property({ type: "string" })
    oldProp?: string;

    /**
     * New property.
     * @public
     * @since 1.100
     */
    @property({ type: "string" })
    newProp?: string;
}
`;

describe('FeMacrosDocBuilder', () => {
    let FeMacrosDocBuilder: new () => BuilderType;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await import('../src/scripts/build-bb-macro-docs.js');
        FeMacrosDocBuilder = (module as unknown as { FeMacrosDocBuilder: new () => BuilderType }).FeMacrosDocBuilder;
    });

    describe('build - missing repo', () => {
        it('should warn and return early when sap.fe repo directory does not exist', async () => {
            const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
            mockFs.access.mockRejectedValue(enoent);

            const builder = new FeMacrosDocBuilder();
            await builder.build();

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('skipping'));
            expect(mockFs.readFile).not.toHaveBeenCalled();
            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });

        it('should rethrow non-ENOENT access errors', async () => {
            const eacces = Object.assign(new Error('EACCES'), { code: 'EACCES' });
            mockFs.access.mockRejectedValue(eacces);

            const builder = new FeMacrosDocBuilder();
            await expect(builder.build()).rejects.toThrow('EACCES');
        });
    });

    describe('build - missing source files', () => {
        it('should warn and continue when an individual source file is not found', async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);

            // First file missing, rest succeed with minimal source
            mockFs.readFile
                .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
                .mockResolvedValue(MINIMAL_SOURCE);

            const builder = new FeMacrosDocBuilder();
            await builder.build();

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Source file not found'));
            expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
        });

        it('should rethrow non-ENOENT readFile errors', async () => {
            mockFs.access.mockResolvedValue(undefined);
            const eperm = Object.assign(new Error('EPERM'), { code: 'EPERM' });
            mockFs.readFile.mockRejectedValue(eperm);

            const builder = new FeMacrosDocBuilder();
            await expect(builder.build()).rejects.toThrow('EPERM');
        });
    });

    describe('build - normal flow', () => {
        beforeEach(() => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue(MINIMAL_SOURCE);
        });

        it('should write output file containing all public members', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;

            expect(written).toContain('metaPath');
            expect(written).toContain('contextPath');
            expect(written).toContain('press');
        });

        it('should mark required properties with [required]', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('### metaPath (string) [required]');
            expect(written).toContain('### contextPath (string) [optional]');
        });

        it('should render expectedAnnotations when present', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('expectedAnnotations: com.sap.vocabularies.UI.v1.LineItem');
        });

        it('should exclude @private members', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('hidden');
        });

        it('should include the class description in the INTRODUCTION', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('A simple macro.');
        });

        it('should include the alias in TITLE and TAGS', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('**TITLE**: sap.fe.macros.FilterBar — Building Block API');
            expect(written).toContain('building block');
            expect(written).toContain('macro');
        });

        it('should separate chunks with the section separator', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('--------------------------------');
        });
    });

    describe('build - skips classes with no public members', () => {
        it('should warn and skip a file that yields no @public members', async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue(NO_PUBLIC_MEMBERS_SOURCE);

            const builder = new FeMacrosDocBuilder();
            await builder.build();

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No @public members found'));
            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('sap.fe.macros.Internal');
        });
    });

    describe('build - @deprecated and @since tags', () => {
        beforeEach(() => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue(DEPRECATED_AND_SINCE_SOURCE);
        });

        it('should render @deprecated tag in the output', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('@deprecated');
            expect(written).toContain('oldProp');
        });

        it('should render @since tag in the output', async () => {
            const builder = new FeMacrosDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('@since 1.100');
            expect(written).toContain('newProp');
        });
    });
});
