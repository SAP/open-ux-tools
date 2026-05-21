import * as bridge from '../../../../../src/tools/run-rta-workflow-step/browser/playwright-bridge';
import {
    FrontendActionError,
    executeAction,
    getActions,
    getElementContext,
    getOverlays,
    saveChanges,
    startRta,
    startVisualization,
    stopRta
} from '../../../../../src/tools/run-rta-workflow-step/rta/commands';

jest.mock('../../../../../src/tools/run-rta-workflow-step/browser/playwright-bridge');

const SITE = 'http://localhost:8080/test/adaptation-editor.html';
const FRAME = 'preview';

const ok = <T>(payload: T): { isSuccess: true; payload: T; error: null } => ({
    isSuccess: true,
    payload,
    error: null
});
const fail = (code: string, message: string) => ({
    isSuccess: false as const,
    payload: null,
    error: { code, message }
});

describe('rta/commands', () => {
    const callFrontendAction = bridge.callFrontendAction as jest.MockedFunction<typeof bridge.callFrontendAction>;
    const disconnectSite = bridge.disconnectSite as jest.MockedFunction<typeof bridge.disconnectSite>;
    const stopBrowser = bridge.stopBrowser as jest.MockedFunction<typeof bridge.stopBrowser>;

    beforeEach(() => {
        jest.clearAllMocks();
        disconnectSite.mockResolvedValue(undefined);
        stopBrowser.mockResolvedValue(undefined);
    });

    test('startRta calls com.sap.ui.flex.startRTA.v1 with empty payload', async () => {
        callFrontendAction.mockResolvedValueOnce(ok({ rtaStarted: true }));
        const result = await startRta({ site: SITE, frameId: FRAME });
        expect(callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.startRTA.v1', {}, FRAME);
        expect(result).toEqual({ rtaStarted: true });
    });

    test('getOverlays calls getOverlaysInformation', async () => {
        callFrontendAction.mockResolvedValueOnce(
            ok([{ overlayId: 'o1', controlId: 'c1', label: 'L', controlType: 'sap.m.Button' }])
        );
        const result = await getOverlays({ site: SITE });
        expect(callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getOverlaysInformation.v1',
            {},
            undefined
        );
        expect(result).toHaveLength(1);
    });

    test('getActions wraps controlId in payload object', async () => {
        callFrontendAction.mockResolvedValueOnce(ok([{ id: 'rename' }]));
        await getActions({ site: SITE, frameId: FRAME }, 'control-1');
        expect(callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getActions.v1',
            { controlId: 'control-1' },
            FRAME
        );
    });

    test('getElementContext requires controlId and actionId in payload', async () => {
        callFrontendAction.mockResolvedValueOnce(ok({ defaultChildAggregationName: 'items', content: [] }));
        await getElementContext({ site: SITE }, 'control-1', 'rename');
        expect(callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getContext.v1',
            { controlId: 'control-1', actionId: 'rename' },
            undefined
        );
    });

    test('executeAction passes a single payload object with controlId, actionId, payload', async () => {
        callFrontendAction.mockResolvedValueOnce(ok(true));
        await executeAction({ site: SITE, frameId: FRAME }, 'control-1', 'rename', { newLabel: 'Hi' });
        expect(callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.callAction.v1',
            { controlId: 'control-1', actionId: 'rename', payload: { newLabel: 'Hi' } },
            FRAME
        );
    });

    test('saveChanges calls saveChanges with empty payload', async () => {
        callFrontendAction.mockResolvedValueOnce(ok(true));
        await saveChanges({ site: SITE });
        expect(callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.saveChanges.v1', {}, undefined);
    });

    test('startVisualization calls startVisualization with empty payload', async () => {
        callFrontendAction.mockResolvedValueOnce(ok({ visualizationStarted: true }));
        const result = await startVisualization({ site: SITE });
        expect(callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.startVisualization.v1', {}, undefined);
        expect(result).toEqual({ visualizationStarted: true });
    });

    test('an isSuccess=false result throws a FrontendActionError carrying the code', async () => {
        callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getActions({ site: SITE }, 'x')).rejects.toMatchObject({
            name: 'FrontendActionError',
            code: 'CONTROL_NOT_FOUND',
            message: expect.stringContaining('CONTROL_NOT_FOUND')
        });

        callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getActions({ site: SITE }, 'x')).rejects.toBeInstanceOf(FrontendActionError);
    });

    test('stopRta(site) disconnects only that site', async () => {
        await stopRta({ site: SITE });
        expect(disconnectSite).toHaveBeenCalledWith(SITE);
        expect(stopBrowser).not.toHaveBeenCalled();
    });

    test('stopRta() with no site stops the browser entirely', async () => {
        await stopRta();
        expect(stopBrowser).toHaveBeenCalledTimes(1);
        expect(disconnectSite).not.toHaveBeenCalled();
    });
});
