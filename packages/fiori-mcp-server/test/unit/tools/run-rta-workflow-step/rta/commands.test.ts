import type {
    FrontendActionResult,
    FrontendActionTransport
} from '../../../../../src/tools/run-rta-workflow-step/browser/types.js';
import {
    FrontendActionError,
    describeUi,
    executeAction,
    executeUfaAction,
    getElementContext,
    getOverlays,
    saveChanges,
    startRta,
    startVisualization,
    stopRta
} from '../../../../../src/tools/run-rta-workflow-step/rta/commands.js';

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

// UFA actions (describeUI/executeAction) are reached by requiring ActionHelpers
// directly; the transport normalizes their raw result into the same
// { isSuccess, payload, error } envelope as the Flex actions. `ok`/`fail` above
// already model that envelope, so UFA tests use them directly:
//   - describeUI success → ok(<tree>)                 (payload is the UI tree)
//   - executeAction success → ok({ success: true })   (payload is the raw result)
//   - any failure → fail(code, message)               (isSuccess:false)

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
            ok({
                overlays: [
                    {
                        overlayId: 'o1',
                        controlId: 'c1',
                        label: 'L',
                        controlType: 'sap.m.Button',
                        parentElementId: null,
                        parentAggregationName: 'content',
                        index: 0,
                        actionIds: ['rename']
                    }
                ],
                actionsCatalog: { rename: { id: 'rename', label: 'Rename', parameters: [] } }
            })
        );
        const result = await getOverlays(transport, { site: SITE });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.flex.getOverlaysInformation.v1',
            {},
            undefined
        );
        expect(result.overlays).toHaveLength(1);
        expect(result.actionsCatalog).toHaveProperty('rename');
    });

    test('getElementContext requires controlId and actionId in payload', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            ok({
                elementType: 'sap.m.Button',
                actionParameters: [],
                aggregationsByClass: [],
                availableModels: {},
                actionSpecificContext: {}
            })
        );
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
        await expect(getElementContext(transport, { site: SITE }, 'x', 'rename')).rejects.toMatchObject({
            name: 'FrontendActionError',
            code: 'CONTROL_NOT_FOUND',
            message: expect.stringContaining('CONTROL_NOT_FOUND')
        });

        transport.callFrontendAction.mockResolvedValueOnce(fail('CONTROL_NOT_FOUND', 'Control with id x not found'));
        await expect(getElementContext(transport, { site: SITE }, 'x', 'rename')).rejects.toBeInstanceOf(
            FrontendActionError
        );
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

    test('FrontendActionError uses GENERIC_ERROR code when error has no code', async () => {
        transport.callFrontendAction.mockResolvedValueOnce({
            isSuccess: false,
            payload: null,
            error: { code: '', message: 'something went wrong' }
        });
        await expect(startRta(transport, { site: SITE })).rejects.toMatchObject({
            name: 'FrontendActionError'
        });
    });

    // --- Unified Frontend Actions (describeUi / executeUfaAction) ---
    // Reached via ActionHelpers; the transport normalizes their raw results into
    // the { isSuccess, payload, error } envelope, so these use ok()/fail().

    test('describeUi calls the UFA describeUI action and returns the root node directly', async () => {
        const tree = { id: 'root', type: 'sap.m.Page', children: [{ id: 'go', type: 'sap.m.Button' }] };
        transport.callFrontendAction.mockResolvedValueOnce(ok(tree));
        const result = await describeUi(transport, { site: SITE, frameId: FRAME });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.describeUI',
            {},
            FRAME
        );
        expect(result).toEqual(tree);
    });

    test('describeUi forwards rootElementId when provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ id: 'sub', type: 'sap.m.VBox' }));
        await describeUi(transport, { site: SITE }, 'sub');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.describeUI',
            { rootElementId: 'sub' },
            undefined
        );
    });

    test('describeUi throws FrontendActionError when the action fails', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(fail('UFA_ACTION_FAILED', 'Control not found: sub'));
        await expect(describeUi(transport, { site: SITE }, 'sub')).rejects.toMatchObject({
            name: 'FrontendActionError',
            message: expect.stringContaining('Control not found: sub')
        });
    });

    test('executeUfaAction maps a successful press to isSuccess:true', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ success: true }));
        const result = await executeUfaAction(transport, { site: SITE, frameId: FRAME }, 'press', 'go-btn');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.executeAction',
            { actionName: 'press', elementId: 'go-btn' },
            FRAME
        );
        expect(result.isSuccess).toBe(true);
        expect(result.result).toEqual({ success: true });
    });

    test('executeUfaAction maps a failed press to isSuccess:false and surfaces the error reason', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(
            fail('UFA_ACTION_FAILED', "Control does not support 'press' action")
        );
        const result = await executeUfaAction(transport, { site: SITE }, 'press', 'label-1');
        expect(result.isSuccess).toBe(false);
        // The failure reason lives in the envelope's error, not payload — it must be surfaced.
        expect(result.result).toMatchObject({ message: "Control does not support 'press' action" });
    });

    test('executeUfaAction forwards actionParameters when provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ success: true }));
        await executeUfaAction(transport, { site: SITE }, 'setValue', 'field-1', { value: 'X' });
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.executeAction',
            { actionName: 'setValue', elementId: 'field-1', actionParameters: { value: 'X' } },
            undefined
        );
    });

    test('executeUfaAction omits elementId from the params when not provided', async () => {
        transport.callFrontendAction.mockResolvedValueOnce(ok({ success: true }));
        await executeUfaAction(transport, { site: SITE }, 'refresh');
        expect(transport.callFrontendAction).toHaveBeenCalledWith(
            SITE,
            'com.sap.ui.unified.frontend.actions.executeAction',
            { actionName: 'refresh' },
            undefined
        );
    });

    test('executeUfaAction falls back to payload when a failure carries no error', async () => {
        // isSuccess:false with error:null — the result should fall back to payload.
        transport.callFrontendAction.mockResolvedValueOnce({
            isSuccess: false,
            payload: { note: 'nothing happened' },
            error: null
        });
        const result = await executeUfaAction(transport, { site: SITE }, 'press', 'x');
        expect(result.isSuccess).toBe(false);
        expect(result.result).toEqual({ note: 'nothing happened' });
    });
});
