import type { FrontendActionResult, FrontendActionTransport } from '../../../../../src/tools/run-rta-workflow-step/browser/types';
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

const SITE = 'http://localhost:8080/test/adaptation-editor.html';
const FRAME = 'preview';

const ok = <T>(payload: T): FrontendActionResult<T> => ({
    isSuccess: true,
    payload,
    error: null
});
const fail = (code: string, message: string): FrontendActionResult<never> => ({
    isSuccess: false,
    payload: null,
    error: { code, message }
});

interface FakeTransport extends FrontendActionTransport {
    callFrontendAction: jest.MockedFunction<FrontendActionTransport['callFrontendAction']>;
    disconnectSite: jest.MockedFunction<FrontendActionTransport['disconnectSite']>;
    stopBrowser: jest.MockedFunction<FrontendActionTransport['stopBrowser']>;
}

function createFakeTransport(): FakeTransport {
    return {
        callFrontendAction: jest.fn(),
        disconnectSite: jest.fn().mockResolvedValue(undefined),
        stopBrowser: jest.fn().mockResolvedValue(undefined)
    };
}

describe('rta/commands', () => {
    let transport: FakeTransport;

    beforeEach(() => {
        transport = createFakeTransport();
    });

    test('startRta calls com.sap.ui.flex.startRTA.v1 with empty payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ rtaStarted: true }));
        const result = await startRta(transport, { site: SITE, frameId: FRAME });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(SITE, 'com.sap.ui.flex.startRTA.v1', {}, FRAME);
        expect(result).toEqual({ rtaStarted: true });
    });

    test('getOverlays calls getOverlaysInformation', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            ok([{ overlayId: 'o1', controlId: 'c1', label: 'L', controlType: 'sap.m.Button' }])
        );
        const result = await getOverlays(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getOverlaysInformation.v1',
            {},
            undefined
        );
        expect(result).toHaveLength(1);
    });

    test('getActions wraps controlId in payload object', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok([{ id: 'rename' }]));
        await getActions(transport, { site: SITE, frameId: FRAME }, 'control-1');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getActions.v1',
            { controlId: 'control-1' },
            FRAME
        );
    });

    test('getElementContext requires controlId and actionId in payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ defaultChildAggregationName: 'items', content: [] }));
        await getElementContext(transport, { site: SITE }, 'control-1', 'rename');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getContext.v1',
            { controlId: 'control-1', actionId: 'rename' },
            undefined
        );
    });

    test('executeAction passes a single payload object with controlId, actionId, payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok(true));
        await executeAction(transport, { site: SITE, frameId: FRAME }, 'control-1', 'rename', { newLabel: 'Hi' });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.callAction.v1',
            { controlId: 'control-1', actionId: 'rename', payload: { newLabel: 'Hi' } },
            FRAME
        );
    });

    test('saveChanges calls saveChanges with empty payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok(true));
        await saveChanges(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.saveChanges.v1',
            {},
            undefined
        );
    });

    test('startVisualization calls startVisualization with empty payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ visualizationStarted: true }));
        const result = await startVisualization(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.startVisualization.v1',
            {},
            undefined
        );
        expect(result).toEqual({ visualizationStarted: true });
    });

    test('an isSuccess=false result throws a FrontendActionError carrying the code', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getActions(transport, { site: SITE }, 'x')).rejects.toMatchObject({
            name: 'FrontendActionError',
            code: 'CONTROL_NOT_FOUND',
            message: expect.stringContaining('CONTROL_NOT_FOUND')
        });

        transport.callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getActions(transport, { site: SITE }, 'x')).rejects.toBeInstanceOf(FrontendActionError);
    });

    test('stopRta(site) disconnects only that site', async () => {
        await stopRta(transport, { site: SITE });
        expect(transport.disconnectSite).toHaveBeenCalledWith(SITE);
        expect(transport.stopBrowser).not.toHaveBeenCalled();
    });

    test('stopRta() with no site stops the transport entirely', async () => {
        await stopRta(transport);
        expect(transport.stopBrowser).toHaveBeenCalledTimes(1);
        expect(transport.disconnectSite).not.toHaveBeenCalled();
    });
});
