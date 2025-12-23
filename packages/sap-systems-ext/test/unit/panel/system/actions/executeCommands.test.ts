import {
    createFioriProject,
    openOutputChannel,
    openGuidedAnswers
} from '../../../../../src/panel/system/actions/executeCommads';
import type { BackendSystem } from '@sap-ux/store';
import * as vscodeMod from 'vscode';
import SystemsLogger from '../../../../../src/utils/logger';

describe('Test the executeCommands actions', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const vsCodeCommands = vscodeMod.commands;

    it('should run the launch app gen commands', async () => {
        const executeCommandSpy = jest.spyOn(vsCodeCommands, 'executeCommand');
        const backendSystem: BackendSystem = {
            name: 'Mock system',
            url: 'https://mock.url.com',
            connectionType: 'abap_catalog',
            systemType: 'OnPrem'
        };
        await createFioriProject({} as any, {
            type: 'CREATE_FIORI_PROJECT',
            payload: { system: backendSystem }
        });
        expect(executeCommandSpy).toHaveBeenCalledWith('sap.ux.tools.sapSystems.launchAppGen', backendSystem);

        await createFioriProject({} as any, { type: 'CREATE_FIORI_PROJECT', payload: {} as any });
        expect(executeCommandSpy).toHaveBeenCalledTimes(1);
    });

    it('should open the output channel', async () => {
        const executeCommandSpy = jest.spyOn(vsCodeCommands, 'executeCommand');

        await openOutputChannel();
        expect(executeCommandSpy).toHaveBeenCalledWith('sap.ux.tools.sapSystems.openOutputChannel');
    });

    it('should open the guided answers extension', async () => {
        const executeCommandSpy = jest.spyOn(vsCodeCommands, 'executeCommand');
        const loggerErrorSpy = jest.spyOn(SystemsLogger.logger, 'error').mockImplementation();

        await openGuidedAnswers({} as any, {
            type: 'OPEN_GUIDED_ANSWERS',
            payload: { command: { id: 'guidedAnswers.open', params: ['param1'] } }
        });
        expect(executeCommandSpy).toHaveBeenCalledWith('guidedAnswers.open', ['param1']);

        executeCommandSpy.mockRejectedValueOnce(new Error('Failed to open'));
        await openGuidedAnswers({} as any, {
            type: 'OPEN_GUIDED_ANSWERS',
            payload: { command: { id: 'guidedAnswers.open', params: ['param1'] } }
        });
        expect(loggerErrorSpy).toHaveBeenCalled();

        await openGuidedAnswers({} as any, { type: 'OPEN_GUIDED_ANSWERS', payload: { command: {} as any } });
        expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    });
});
