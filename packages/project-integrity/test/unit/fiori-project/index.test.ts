import { join } from 'path';
import {
    checkFioriProjectIntegrity,
    disableFioriProjectIntegrity,
    enableFioriProjectIntegrity,
    initFioriProject,
    isFioriProjectIntegrityEnabled,
    isFioriProjectIntegrityInitialized,
    updateFioriProjectIntegrity
} from '../../../src';
jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getCapModelAndServices: jest.fn().mockResolvedValue({
        model: {
            namespace: 'mockNamespace',
            definitions: { 'test.SalesData': { 'kind': 'entity', 'elements': {} } }
        }
    })
}));

import * as persistence from '../../../src/integrity/persistence';
import * as updateMock from '../../../src/integrity';

afterEach(() => {
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
        const mockCheckProjectIntegrity = jest.spyOn(updateMock, 'checkProjectIntegrity');
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        const results = await checkFioriProjectIntegrity(projectRoot);
        expect(results).toStrictEqual({
            'files': {
                'differentFiles': [],
                'equalFiles': [expect.stringContaining('schema.cds'), expect.stringContaining('service.cds')]
            },
            'additionalStringContent': { 'differentContent': [], 'equalContent': ['capPaths'] }
        });
        expect(mockCheckProjectIntegrity).toBeCalledWith(
            expect.stringContaining('integrity.json'),
            expect.stringContaining('definitions'),
            {
                capPaths: '{"app":"app/","db":"db/","srv":"srv/"}'
            }
        );
    });
});

describe('Test for updateFioriProjectIntegrity()', () => {
    test('Update additional string content', async () => {
        const mockUpdateFioriProjectIntegrity = jest
            .spyOn(updateMock, 'updateProjectIntegrity')
            .mockResolvedValueOnce();
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        await updateFioriProjectIntegrity(projectRoot);
        expect(mockUpdateFioriProjectIntegrity).toBeCalledWith(
            expect.stringContaining('integrity.json'),
            expect.stringContaining('definitions'),
            {
                capPaths: '{"app":"app/","db":"db/","srv":"srv/"}'
            }
        );
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
        expect(mockWriteIntegrityData).toBeCalledWith(expect.stringContaining('ai-integrity.json'), {
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
        expect(mockWriteIntegrityData).toBeCalledWith(expect.stringContaining('ai-integrity.json'), {
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
