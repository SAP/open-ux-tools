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
    readdir: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn()
};
jest.unstable_mockModule('node:fs/promises', () => mockFs);

const mockExplain = jest.fn();
jest.unstable_mockModule('jsdoc-api', () => ({ default: { explain: mockExplain } }));

interface BuilderType {
    build(): Promise<void>;
}

describe('FeTestApiDocBuilder', () => {
    let FeTestApiDocBuilder: new () => BuilderType;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await import('../src/scripts/build-fe-test-api-docs.js');
        FeTestApiDocBuilder = (module as unknown as { FeTestApiDocBuilder: new () => BuilderType }).FeTestApiDocBuilder;
    });

    describe('build - missing repo', () => {
        it('should warn and return early when sap.fe repo directory does not exist', async () => {
            const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
            mockFs.access.mockRejectedValue(enoent);

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('skipping'));
            expect(mockExplain).not.toHaveBeenCalled();
            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });

        it('should rethrow non-ENOENT access errors', async () => {
            const eacces = Object.assign(new Error('EACCES'), { code: 'EACCES' });
            mockFs.access.mockRejectedValue(eacces);

            const builder = new FeTestApiDocBuilder();
            await expect(builder.build()).rejects.toThrow('EACCES');
        });

        it('should warn and return early when api directory exists but contains no source files', async () => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue([]); // empty directory

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No .js/.ts files found'));
            expect(mockExplain).not.toHaveBeenCalled();
            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });
    });

    describe('build - normal flow', () => {
        const makeEntry = (name: string, isFile = true) => ({
            name,
            isFile: () => isFile
        });

        const classDoclet = {
            kind: 'class',
            name: 'TableActions',
            longname: 'sap.fe.test.api.TableActions',
            memberof: 'sap.fe.test.api',
            description: 'Actions for tables.',
            access: 'public',
            augments: ['BaseActions']
        };

        const methodDoclet = {
            kind: 'function',
            name: 'iPress',
            longname: 'sap.fe.test.api.TableActions#iPress',
            memberof: 'sap.fe.test.api.TableActions',
            description: 'Presses a button.',
            access: 'public',
            scope: 'instance',
            params: [{ name: 'sText', type: { names: ['string'] }, description: 'Button text' }],
            returns: [{ type: { names: ['Promise'] }, description: 'resolves when done' }]
        };

        const typedefDoclet = {
            kind: 'typedef',
            name: 'TableIdentifier',
            longname: 'sap.fe.test.api.TableIdentifier',
            description: 'Identifies a table.',
            properties: [
                { name: 'id', type: { names: ['string'] }, description: 'The table id' },
                { name: 'index', type: { names: ['number'] }, optional: true }
            ]
        };

        const enumDoclet = {
            kind: 'member',
            name: 'DialogType',
            longname: 'sap.fe.test.api.DialogType',
            description: 'Dialog type enum.',
            isEnum: true
        };

        const enumMember = {
            kind: 'constant',
            name: 'CONFIRMATION',
            longname: 'sap.fe.test.api.DialogType.CONFIRMATION',
            memberof: 'sap.fe.test.api.DialogType',
            description: 'Confirmation dialog'
        };

        const undocumentedDoclet = {
            kind: 'function',
            name: '_internal',
            longname: 'sap.fe.test.api.TableActions#_internal',
            memberof: 'sap.fe.test.api.TableActions',
            access: 'public',
            scope: 'instance',
            undocumented: true
        };

        beforeEach(() => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue([
                makeEntry('TableActions.js'),
                makeEntry('subdir', false), // directory — should be excluded
                makeEntry('types.ts')
            ]);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
            mockExplain.mockResolvedValue([
                classDoclet,
                methodDoclet,
                typedefDoclet,
                enumDoclet,
                enumMember,
                undocumentedDoclet
            ]);
        });

        it('should write output file with class, typedef and enum chunks', async () => {
            const builder = new FeTestApiDocBuilder();
            await builder.build();

            expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;

            // class chunk present
            expect(written).toContain('sap.fe.test.api.TableActions');
            expect(written).toContain('iPress');
            expect(written).toContain('Button text');
            expect(written).toContain('Extends BaseActions');

            // typedef chunk present
            expect(written).toContain('sap.fe.test.api Type Definitions');
            expect(written).toContain('TableIdentifier');

            // enum chunk present
            expect(written).toContain('sap.fe.test.api Enumerations');
            expect(written).toContain('DialogType');
            expect(written).toContain('CONFIRMATION');
        });

        it('should exclude undocumented doclets', async () => {
            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('_internal');
        });

        it('should pass only files (not directories) to jsdocApi.explain', async () => {
            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const { files } = (mockExplain as jest.Mock).mock.calls[0][0] as { files: string[] };
            expect(files).toHaveLength(2);
            expect(files.every((f: string) => f.endsWith('.js') || f.endsWith('.ts'))).toBe(true);
            expect(files.some((f: string) => f.includes('subdir'))).toBe(false);
        });

        it('should log class and method counts', async () => {
            const builder = new FeTestApiDocBuilder();
            await builder.build();

            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('1 classes'));
        });

        it('should skip class chunks with no public methods and log a warning', async () => {
            // Class with no matching instance methods
            mockExplain.mockResolvedValue([classDoclet]);

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('sap.fe.test.api.TableActions');
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('sap.fe.test.api.TableActions'));
        });
    });

    describe('isPublic', () => {
        const makeEntry = (name: string, isFile = true) => ({ name, isFile: () => isFile });

        beforeEach(() => {
            mockFs.access.mockResolvedValue(undefined);
            mockFs.readdir.mockResolvedValue([makeEntry('types.js')]);
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.writeFile.mockResolvedValue(undefined);
        });

        it('should include typedef doclets without explicit access field', async () => {
            const typedefNoAccess = {
                kind: 'typedef',
                name: 'MyType',
                longname: 'sap.fe.test.api.MyType',
                description: 'A type'
            };
            mockExplain.mockResolvedValue([typedefNoAccess]);

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).toContain('MyType');
        });

        it('should exclude undocumented typedefs', async () => {
            const undocumentedTypedef = {
                kind: 'typedef',
                name: 'HiddenType',
                longname: 'sap.fe.test.api.HiddenType',
                undocumented: true
            };
            mockExplain.mockResolvedValue([undocumentedTypedef]);

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('HiddenType');
        });

        it('should exclude @private constants even without undocumented flag', async () => {
            const privateEnumMember = {
                kind: 'constant',
                name: 'MassEdit',
                longname: 'sap.fe.test.api.DialogType.MassEdit',
                memberof: 'sap.fe.test.api.DialogType',
                description: 'Internal mass-edit mode',
                access: 'private'
            };
            const enumContainer = {
                kind: 'member',
                name: 'DialogType',
                longname: 'sap.fe.test.api.DialogType',
                description: 'Dialog type enum.',
                isEnum: true
            };
            mockExplain.mockResolvedValue([enumContainer, privateEnumMember]);

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('MassEdit');
        });

        it('should exclude @protected typedefs', async () => {
            const protectedTypedef = {
                kind: 'typedef',
                name: 'InternalConfig',
                longname: 'sap.fe.test.api.InternalConfig',
                description: 'Internal config type',
                access: 'protected'
            };
            mockExplain.mockResolvedValue([protectedTypedef]);

            const builder = new FeTestApiDocBuilder();
            await builder.build();

            const written = (mockFs.writeFile as jest.Mock).mock.calls[0][1] as string;
            expect(written).not.toContain('InternalConfig');
        });
    });
});
