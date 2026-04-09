import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __testdir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lzString = require('lz-string');

const mockGetCapModelAndServices = jest.fn().mockResolvedValue({
    model: {
        namespace: 'mockNamespace',
        definitions: { 'test.SalesData': { 'kind': 'entity', 'elements': {} } }
    }
});

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    getCapCustomPaths: jest.fn().mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' }),
    getCapModelAndServices: mockGetCapModelAndServices
}));

jest.unstable_mockModule('lz-string', () => ({
    default: lzString,
    compressToBase64: lzString.compressToBase64,
    decompressFromBase64: lzString.decompressFromBase64
}));

// Mock persistence and project modules to allow controlling writeIntegrityData and checkProjectIntegrity
const mockWriteIntegrityData = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockCheckProjectIntegrity = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateProjectIntegrity = jest.fn<(...args: unknown[]) => Promise<void>>();

// Get the real persistence for readIntegrityData
const realPersistence = await import('../../../src/integrity/persistence');

jest.unstable_mockModule('../../../src/integrity/persistence', () => ({
    readIntegrityData: realPersistence.readIntegrityData,
    writeIntegrityData: mockWriteIntegrityData
}));

// We need to get the real functions from integrity/project for the non-mocked cases
const realProject = await import('../../../src/integrity/project');

jest.unstable_mockModule('../../../src/integrity/project', () => ({
    checkProjectIntegrity: mockCheckProjectIntegrity,
    disableProjectIntegrity: realProject.disableProjectIntegrity,
    enableProjectIntegrity: realProject.enableProjectIntegrity,
    initProject: realProject.initProject,
    isProjectIntegrityEnabled: realProject.isProjectIntegrityEnabled,
    updateProjectIntegrity: mockUpdateProjectIntegrity
}));

const {
    checkFioriProjectIntegrity,
    disableFioriProjectIntegrity,
    enableFioriProjectIntegrity,
    initFioriProject,
    isFioriProjectIntegrityEnabled,
    isFioriProjectIntegrityInitialized,
    updateFioriProjectIntegrity
} = await import('../../../src/fiori-project');

beforeEach(() => {
    jest.clearAllMocks();
    // Set defaults for mock functions
    mockWriteIntegrityData.mockResolvedValue(undefined);
});

describe('Test for initFioriProject()', () => {
    test('Init valid Fiori project', async () => {
        const projectRoot = join(__testdir, '../../test-input/valid-fiori-project');
        await initFioriProject(projectRoot);
        expect(mockWriteIntegrityData).toHaveBeenCalledWith(
            expect.stringContaining('ai-integrity.json'),
            expect.objectContaining({
                enabled: true,
                fileIntegrity: expect.any(Array),
                contentIntegrity: expect.any(Array)
            })
        );
    });

    test('Init invalid Fiori project, no db/schema.cds', async () => {
        const projectRoot = join(__testdir, '../../test-input/invalid-fiori-project-no-schema-cds');
        try {
            await initFioriProject(projectRoot);
            expect(false).toBe('initFioriProject() should have thrown error but did not');
        } catch (error) {
            expect((error as Error).message).toContain('schema.cds');
        }
    });

    test('Init valid Fiori project no srv/service.cds', async () => {
        const projectRoot = join(__testdir, '../../test-input/invalid-fiori-project-no-service-cds');
        try {
            await initFioriProject(projectRoot);
            expect(false).toBe('initFioriProject() should have thrown error but did not');
        } catch (error) {
            expect((error as Error).message).toContain('service.cds');
        }
    });
});

describe('Test for checkFioriProjectIntegrity()', () => {
    test('Check valid project', async () => {
        const projectRoot = join(__testdir, '../../test-input/valid-fiori-project');
        mockCheckProjectIntegrity.mockResolvedValueOnce({
            files: {
                differentFiles: [],
                equalFiles: [join(projectRoot, 'db', 'schema.cds'), join(projectRoot, 'srv', 'service.cds')]
            },
            additionalStringContent: { differentContent: [], equalContent: ['capPaths', 'csn'] }
        });
        const results = await checkFioriProjectIntegrity(projectRoot);
        expect(results).toStrictEqual({
            'files': {
                'differentFiles': [],
                'equalFiles': [expect.stringContaining('schema.cds'), expect.stringContaining('service.cds')]
            },
            'additionalStringContent': { 'differentContent': [], 'equalContent': ['capPaths', 'csn'] }
        });
    });
    test('Check valid project - discard file difference as csn integrity is not changed [case 1]', async () => {
        const projectRoot = join(__testdir, '../../test-input/valid-fiori-project');
        mockCheckProjectIntegrity.mockResolvedValueOnce({
            files: {
                differentFiles: [
                    {
                        filePath: join(projectRoot, 'db', 'schema.cds'),
                        oldContent: 'old content',
                        newContent: 'new content'
                    }
                ],
                equalFiles: []
            },
            additionalStringContent: {
                differentContent: [],
                equalContent: ['capPaths', 'csn']
            }
        });
        const results = await checkFioriProjectIntegrity(projectRoot);
        expect(results).toStrictEqual({
            'files': {
                'differentFiles': [],
                'equalFiles': [expect.stringContaining('schema.cds')]
            },
            'additionalStringContent': { 'differentContent': [], 'equalContent': ['capPaths', 'csn'] }
        });
        expect(mockCheckProjectIntegrity).toHaveBeenCalledWith(expect.stringContaining('integrity.json'), {
            capPaths: '{"app":"app/","db":"db/","srv":"srv/"}',
            csn: expect.stringContaining('definitions')
        });
        expect(mockWriteIntegrityData).toHaveBeenCalledWith(expect.stringContaining('ai-integrity.json'), {
            enabled: true,
            fileIntegrity: [
                {
                    filePath: expect.stringContaining('schema.cds'),
                    hash: expect.any(String),
                    content: expect.any(String)
                },
                {
                    filePath: expect.stringContaining('service.cds'),
                    hash: expect.any(String),
                    content: expect.any(String)
                }
            ],
            contentIntegrity: [
                {
                    contentKey: 'capPaths',
                    hash: expect.any(String),
                    content: '{"app":"app/","db":"db/","srv":"srv/"}'
                },
                {
                    contentKey: 'csn',
                    hash: expect.any(String),
                    content: expect.stringContaining('definitions')
                }
            ]
        });
    });
    test('Check valid project - discard csn as file is not changed [case 2]', async () => {
        const projectRoot = join(__testdir, '../../test-input/valid-fiori-project');
        mockCheckProjectIntegrity.mockResolvedValueOnce({
            files: {
                differentFiles: [],
                equalFiles: [join(projectRoot, 'db', 'schema.cds'), join(projectRoot, 'srv', 'service.cds')]
            },
            additionalStringContent: {
                differentContent: [
                    {
                        key: 'csn',
                        oldContent: 'old content',
                        newContent: 'new content'
                    }
                ],
                equalContent: ['capPaths']
            }
        });
        const results = await checkFioriProjectIntegrity(projectRoot);
        expect(results).toStrictEqual({
            'files': {
                'differentFiles': [],
                'equalFiles': [expect.stringContaining('schema.cds'), expect.stringContaining('service.cds')]
            },
            'additionalStringContent': { 'differentContent': [], 'equalContent': ['capPaths', 'csn'] }
        });
        expect(mockCheckProjectIntegrity).toHaveBeenCalledWith(expect.stringContaining('integrity.json'), {
            capPaths: '{"app":"app/","db":"db/","srv":"srv/"}',
            csn: expect.stringContaining('definitions')
        });
        expect(mockWriteIntegrityData).toHaveBeenCalledWith(expect.stringContaining('ai-integrity.json'), {
            enabled: true,
            fileIntegrity: [
                {
                    filePath: expect.stringContaining('schema.cds'),
                    hash: expect.any(String),
                    content: expect.any(String)
                },
                {
                    filePath: expect.stringContaining('service.cds'),
                    hash: expect.any(String),
                    content: expect.any(String)
                }
            ],
            contentIntegrity: [
                {
                    contentKey: 'capPaths',
                    hash: expect.any(String),
                    content: '{"app":"app/","db":"db/","srv":"srv/"}'
                },
                {
                    contentKey: 'csn',
                    hash: expect.any(String),
                    content: expect.stringContaining('definitions')
                }
            ]
        });
    });
    test('Check valid project - do not discard as csn and file changed [case 3]', async () => {
        const projectRoot = join(__testdir, '../../test-input/valid-fiori-project');
        mockCheckProjectIntegrity.mockResolvedValueOnce({
            files: {
                differentFiles: [
                    {
                        filePath: join(projectRoot, 'db', 'schema.cds'),
                        oldContent: 'old content',
                        newContent: 'new content'
                    }
                ],
                equalFiles: []
            },
            additionalStringContent: {
                differentContent: [
                    {
                        key: 'csn',
                        oldContent: 'old content',
                        newContent: 'new content'
                    }
                ],
                equalContent: ['capPaths']
            }
        });
        const results = await checkFioriProjectIntegrity(projectRoot);
        expect(results).toStrictEqual({
            'files': {
                'differentFiles': [
                    {
                        filePath: expect.stringContaining('schema.cds'),
                        oldContent: 'old content',
                        newContent: 'new content'
                    }
                ],
                'equalFiles': []
            },
            'additionalStringContent': {
                'differentContent': [
                    {
                        key: 'csn',
                        oldContent: 'old content',
                        newContent: 'new content'
                    }
                ],
                'equalContent': ['capPaths']
            }
        });
        expect(mockCheckProjectIntegrity).toHaveBeenCalledWith(expect.stringContaining('integrity.json'), {
            capPaths: '{"app":"app/","db":"db/","srv":"srv/"}',
            csn: expect.stringContaining('definitions')
        });
        expect(mockWriteIntegrityData).not.toHaveBeenCalled();
    });
});

describe('Test for updateFioriProjectIntegrity()', () => {
    test('Update additional string content', async () => {
        mockUpdateProjectIntegrity.mockResolvedValueOnce(undefined);
        const projectRoot = join(__testdir, '../../test-input/valid-fiori-project');
        await updateFioriProjectIntegrity(projectRoot);
        expect(mockUpdateProjectIntegrity).toHaveBeenCalledWith(expect.stringContaining('integrity.json'), {
            capPaths: '{"app":"app/","db":"db/","srv":"srv/"}',
            csn: expect.stringContaining('definitions')
        });
    });
});

describe('Test isFioriProjectIntegrityEnabled()', () => {
    test('Check enabled Fiori project', async () => {
        const projectRoot = join(__testdir, '../../test-input/enabled-fiori-project');
        const enabled = await isFioriProjectIntegrityEnabled(projectRoot);
        expect(enabled).toBe(true);
    });

    test('Check disabled Fiori project', async () => {
        const projectRoot = join(__testdir, '../../test-input/disabled-fiori-project');
        const enabled = await isFioriProjectIntegrityEnabled(projectRoot);
        expect(enabled).toBe(false);
    });
});

describe('Test enableFioriProjectIntegrity()', () => {
    test('Enable disabled Fiori project', async () => {
        const projectRoot = join(__testdir, '../../test-input/disabled-fiori-project');
        await enableFioriProjectIntegrity(projectRoot);
        expect(mockWriteIntegrityData).toHaveBeenCalledWith(expect.stringContaining('ai-integrity.json'), {
            'enabled': true,
            'fileIntegrity': [],
            'contentIntegrity': []
        });
    });
});

describe('Test disableFioriProjectIntegrity()', () => {
    test('Disable enabled Fiori project', async () => {
        const projectRoot = join(__testdir, '../../test-input/enabled-fiori-project');
        await disableFioriProjectIntegrity(projectRoot);
        expect(mockWriteIntegrityData).toHaveBeenCalledWith(expect.stringContaining('ai-integrity.json'), {
            'enabled': false,
            'fileIntegrity': [],
            'contentIntegrity': []
        });
    });
});

describe('Test isFioriProjectIntegrityInitialized()', () => {
    test('Disabled but initialized Fiori project', () => {
        const projectRoot = join(__testdir, '../../test-input/disabled-fiori-project');
        expect(isFioriProjectIntegrityInitialized(projectRoot)).toBe(true);
    });

    test('Uninitialized Fiori project', () => {
        const projectRoot = join(__testdir, '../../test-input/invalid-fiori-project-no-schema-cds');
        expect(isFioriProjectIntegrityInitialized(projectRoot)).toBe(false);
    });
});
