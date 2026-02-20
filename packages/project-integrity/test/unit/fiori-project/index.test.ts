import { join } from 'node:path';
import {
    checkFioriProjectIntegrity,
    disableFioriProjectIntegrity,
    enableFioriProjectIntegrity,
    initFioriProject,
    isFioriProjectIntegrityEnabled,
    isFioriProjectIntegrityInitialized,
    updateFioriProjectIntegrity
} from '../../../src';
import * as persistence from '../../../src/integrity/persistence';
import * as updateMock from '../../../src/integrity';
import * as project from '../../../src/integrity/project';

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getCapModelAndServices: jest.fn().mockResolvedValue({
        model: {
            namespace: 'mockNamespace',
            definitions: { 'test.SalesData': { 'kind': 'entity', 'elements': {} } }
        }
    })
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Test for initFioriProject()', () => {
    test('Init valid Fiori project', async () => {
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        const integrityFilePath = join(projectRoot, '.fiori-ai/ai-integrity.json');
        const targetIntegrityData = await persistence.readIntegrityData(integrityFilePath);
        await initFioriProject(projectRoot);
        const newIntegrityData = await persistence.readIntegrityData(integrityFilePath);
        expect(newIntegrityData).toStrictEqual(targetIntegrityData);
    });

    test('Init invalid Fiori project, no db/schema.cds', async () => {
        const projectRoot = join(__dirname, '../../test-input/invalid-fiori-project-no-schema-cds');
        try {
            await initFioriProject(projectRoot);
            expect(false).toBe('initFioriProject() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toContain('schema.cds');
        }
    });

    test('Init valid Fiori project no srv/service.cds', async () => {
        const projectRoot = join(__dirname, '../../test-input/invalid-fiori-project-no-service-cds');
        try {
            await initFioriProject(projectRoot);
            expect(false).toBe('initFioriProject() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toContain('service.cds');
        }
    });
});

describe('Test for checkFioriProjectIntegrity()', () => {
    test('Check valid project', async () => {
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
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
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        const mockCheckProjectIntegrity = jest.spyOn(project, 'checkProjectIntegrity').mockResolvedValueOnce({
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
        const mockWriteIntegrityData = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
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
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        const mockCheckProjectIntegrity = jest.spyOn(project, 'checkProjectIntegrity').mockResolvedValueOnce({
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
        const mockWriteIntegrityData = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
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
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        const mockCheckProjectIntegrity = jest.spyOn(project, 'checkProjectIntegrity').mockResolvedValueOnce({
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
        const mockWriteIntegrityData = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
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
        const mockUpdateFioriProjectIntegrity = jest
            .spyOn(updateMock, 'updateProjectIntegrity')
            .mockResolvedValueOnce();
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        await updateFioriProjectIntegrity(projectRoot);
        expect(mockUpdateFioriProjectIntegrity).toHaveBeenCalledWith(expect.stringContaining('integrity.json'), {
            capPaths: '{"app":"app/","db":"db/","srv":"srv/"}',
            csn: expect.stringContaining('definitions')
        });
    });
});

describe('Test isFioriProjectIntegrityEnabled()', () => {
    test('Check enabled Fiori project', async () => {
        const projectRoot = join(__dirname, '../../test-input/enabled-fiori-project');
        const enabled = await isFioriProjectIntegrityEnabled(projectRoot);
        expect(enabled).toBe(true);
    });

    test('Check disabled Fiori project', async () => {
        const projectRoot = join(__dirname, '../../test-input/disabled-fiori-project');
        const enabled = await isFioriProjectIntegrityEnabled(projectRoot);
        expect(enabled).toBe(false);
    });
});

describe('Test enableFioriProjectIntegrity()', () => {
    test('Enable disabled Fiori project', async () => {
        const mockWriteIntegrityData = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
        const projectRoot = join(__dirname, '../../test-input/disabled-fiori-project');

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
        const mockWriteIntegrityData = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
        const projectRoot = join(__dirname, '../../test-input/enabled-fiori-project');

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
        const projectRoot = join(__dirname, '../../test-input/disabled-fiori-project');
        expect(isFioriProjectIntegrityInitialized(projectRoot)).toBe(true);
    });

    test('Uninitialized Fiori project', () => {
        const projectRoot = join(__dirname, '../../test-input/invalid-fiori-project-no-schema-cds');
        expect(isFioriProjectIntegrityInitialized(projectRoot)).toBe(false);
    });
});
