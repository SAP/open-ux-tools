import { join } from 'path';
import { checkFioriProjectIntegrity, initFioriProject, updateFioriProjectIntegrity } from '../../../src';
import { readIntegrityData } from '../../../src/integrity/persistence';
import * as updateMock from '../../../src/integrity';

describe('Test for initFioriProject()', () => {
    test('Init valid Fiori project', async () => {
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        const integrityFilePath = join(projectRoot, '.fiori-ai/integrity.json');
        const targetIntegrityData = await readIntegrityData(integrityFilePath);
        await initFioriProject(projectRoot);
        const newIntegrityData = await readIntegrityData(integrityFilePath);
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
                'equalFiles': [
                    expect.stringContaining('schema.cds'),
                    expect.stringContaining('service.cds'),
                    expect.stringContaining('travelManagement-Bookings.csv'),
                    expect.stringContaining('travelManagement-Travel.csv')
                ]
            },
            'additionalStringContent': { 'differentContent': [], 'equalContent': ['capPaths'] }
        });
    });
});

describe('Test for updateFioriProjectIntegrity()', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('Update additional string content', async () => {
        const mockUpdateFioriProjectIntegrity = jest
            .spyOn(updateMock, 'updateProjectIntegrity')
            .mockResolvedValueOnce();
        const projectRoot = join(__dirname, '../../test-input/valid-fiori-project');
        await updateFioriProjectIntegrity(projectRoot);
        expect(mockUpdateFioriProjectIntegrity).toBeCalledWith(expect.stringContaining('integrity.json'), {
            capPaths: '{"app":"app/","db":"db/","srv":"srv/"}'
        });
    });
});
