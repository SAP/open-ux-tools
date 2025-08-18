import { join } from 'path';
import {
    GENERATE_FIORI_UI_APP,
    generateFioriUIAppHandlers
} from '../../../../../src/tools/functionalities/generate-fiori-ui-app';

// Mock child_process.exec
const mockExec = jest.fn();

jest.mock('child_process', () => ({
    exec: (...args: any) => mockExec(...args)
}));

describe('getFunctionalityDetails', () => {
    test('getFunctionalityDetails', async () => {
        const details = await generateFioriUIAppHandlers.getFunctionalityDetails({
            appPath: 'app1',
            functionalityId: GENERATE_FIORI_UI_APP.id
        });
        expect(details).toEqual(GENERATE_FIORI_UI_APP);
    });
});

describe('executeFunctionality', () => {
    test('executeFunctionality - success', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(null, 'mock stdout', 'mock stderr');
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: 'app1',
            functionalityId: GENERATE_FIORI_UI_APP.id,
            parameters: {
                projectPath: 'app1',
                appGenConfig: {}
            }
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join('app1', 'app', 'default'),
                changes: [],
                functionalityId: 'generate-fiori-ui-app',
                message: `Generation completed successfully: ${join('app1', 'app', 'default')}`,
                parameters: {
                    appGenConfig: {},
                    projectPath: 'app1'
                },
                status: 'Success'
            })
        );
    });

    test('executeFunctionality - unsuccess', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        const result = await generateFioriUIAppHandlers.executeFunctionality({
            appPath: 'app1',
            functionalityId: GENERATE_FIORI_UI_APP.id,
            parameters: {
                projectPath: 'app1',
                appGenConfig: {}
            }
        });
        expect(result).toEqual(
            expect.objectContaining({
                appPath: join('app1', 'app', 'default'),
                changes: [],
                functionalityId: 'generate-fiori-ui-app',
                message: `Error generating application: Dummy`,
                parameters: {
                    appGenConfig: {},
                    projectPath: 'app1'
                },
                status: 'Error'
            })
        );
    });

    test('executeFunctionality - empty parameters', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIAppHandlers.executeFunctionality({
                appPath: '',
                functionalityId: GENERATE_FIORI_UI_APP.id,
                parameters: {}
            })
        ).rejects.toThrow('Please provide a valid path to the CAP project folder.');
    });

    test('executeFunctionality - wrong appGenConfig', async () => {
        mockExec.mockImplementation((cmd, opts, callback) => {
            throw new Error('Dummy');
        });
        await expect(
            generateFioriUIAppHandlers.executeFunctionality({
                appPath: 'app1',
                functionalityId: GENERATE_FIORI_UI_APP.id,
                parameters: {
                    projectPath: 'app1',
                    appGenConfig: 'dummy'
                }
            })
        ).rejects.toThrow('Invalid appGenConfig. Please provide a valid configuration object.');
    });
});
