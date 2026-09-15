import { jest } from '@jest/globals';
import type { FrontendActionTransport } from '../../../../src/tools/run-rta-workflow-step/browser/types.js';

// --- mock browser/index ---------------------------------------------------

const mockDisconnectSite = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockStopBrowser = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockCallFrontendAction = jest.fn<FrontendActionTransport['callFrontendAction']>();
let registryEmpty = true;

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/browser/index.js', () => ({
    defaultTransport: {
        callFrontendAction: mockCallFrontendAction,
        disconnectSite: mockDisconnectSite,
        stopBrowser: mockStopBrowser
    },
    isRegistryEmpty: () => registryEmpty,
    stopBrowser: mockStopBrowser
}));

// --- mock rta/index -------------------------------------------------------

const mockStartRta = jest.fn<any>();
const mockGetOverlays = jest.fn<any>();
const mockGetElementContext = jest.fn<any>();
const mockExecuteAction = jest.fn<any>();
const mockSaveChanges = jest.fn<any>();
const mockGetPageActions = jest.fn<any>();
const mockCallPageAction = jest.fn<any>();
const mockPressInteractive = jest.fn<any>();

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/rta/index.js', () => ({
    startRta: mockStartRta,
    getOverlays: mockGetOverlays,
    getElementContext: mockGetElementContext,
    executeAction: mockExecuteAction,
    saveChanges: mockSaveChanges,
    getPageActions: mockGetPageActions,
    callPageAction: mockCallPageAction,
    pressInteractive: mockPressInteractive,
    FrontendActionError: class FrontendActionError extends Error {
        code: string;
        constructor(name: string, code: string, msg: string) {
            super(msg);
            this.name = 'FrontendActionError';
            this.code = code;
        }
    }
}));

jest.unstable_mockModule('../../../../src/utils/index.js', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const { runRtaWorkflowStep } = await import('../../../../src/tools/run-rta-workflow-step/index.js');

const SITE = 'http://localhost:8080/test/adaptation-editor.html';
const FRAME = 'preview';

describe('runRtaWorkflowStep dispatcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        registryEmpty = true;
    });

    describe('start step', () => {
        test('disconnects existing page then starts RTA, echoes site and frameId', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            const result = await runRtaWorkflowStep({
                step: 'start',
                site: '',
                payload: { site: SITE, frameId: FRAME }
            });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStartRta).toHaveBeenCalled();
            expect(result).toMatchObject({ site: SITE, frameId: FRAME, rtaStarted: true });
        });

        test('throws when payload.site is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'start', site: '', payload: {} })).rejects.toThrow(
                'payload.site is required'
            );
        });
    });

    describe('get_overlays step', () => {
        test('calls getOverlays and returns result', async () => {
            mockGetOverlays.mockResolvedValue({ overlays: [], actionsCatalog: {} });
            const result = await runRtaWorkflowStep({ step: 'get_overlays', site: SITE });
            expect(mockGetOverlays).toHaveBeenCalled();
            expect(result).toMatchObject({ overlays: [], actionsCatalog: {} });
        });

        test('throws when site is empty', async () => {
            await expect(runRtaWorkflowStep({ step: 'get_overlays', site: '' })).rejects.toThrow('site is required');
        });
    });

    describe('restart step', () => {
        test('disconnects site, starts RTA, echoes site and frameId', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            const result = await runRtaWorkflowStep({ step: 'restart', site: SITE, frameId: FRAME });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStartRta).toHaveBeenCalled();
            expect(result).toMatchObject({ site: SITE, frameId: FRAME, rtaStarted: true });
        });
    });

    describe('stop step', () => {
        test('disconnects site; stops browser when registry is empty', async () => {
            registryEmpty = true;
            const result = await runRtaWorkflowStep({ step: 'stop', site: SITE });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStopBrowser).toHaveBeenCalled();
            expect(result).toEqual({ stopped: true });
        });

        test('disconnects site but does not stop browser when other pages remain', async () => {
            registryEmpty = false;
            await runRtaWorkflowStep({ step: 'stop', site: SITE });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStopBrowser).not.toHaveBeenCalled();
        });
    });

    describe('get_page_actions step', () => {
        test('returns registered and interactive lists', async () => {
            const registered = [{ id: 'loadData', layer: 'framework', label: 'Load', description: '' }];
            const interactive = [{ controlId: 'btn1', controlType: 'sap.m.Button', label: 'Go', kind: 'button' }];
            mockGetPageActions.mockResolvedValue({ registered, interactive });
            const result = await runRtaWorkflowStep({ step: 'get_page_actions', site: SITE });
            expect(result).toMatchObject({ registered, interactive });
        });

        test('includes interactiveTruncated when set', async () => {
            mockGetPageActions.mockResolvedValue({ registered: [], interactive: [], interactiveTruncated: true });
            const result = (await runRtaWorkflowStep({ step: 'get_page_actions', site: SITE })) as any;
            expect(result.interactiveTruncated).toBe(true);
        });
    });

    describe('call_page_action step', () => {
        test('calls callPageAction with the id from payload', async () => {
            const runResult = { status: 'ok' as const };
            mockCallPageAction.mockResolvedValue(runResult);
            const result = (await runRtaWorkflowStep({
                step: 'call_page_action',
                site: SITE,
                payload: { id: 'loadData' }
            })) as any;
            expect(mockCallPageAction).toHaveBeenCalled();
            expect(result.result).toEqual(runResult);
        });

        test('throws when payload.id is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'call_page_action', site: SITE, payload: {} })).rejects.toThrow(
                'payload.id is required'
            );
        });
    });

    describe('press_interactive step', () => {
        test('calls pressInteractive with the controlId from payload', async () => {
            const runResult = { status: 'ok' as const, note: 'focus moved' };
            mockPressInteractive.mockResolvedValue(runResult);
            const result = (await runRtaWorkflowStep({
                step: 'press_interactive',
                site: SITE,
                payload: { controlId: 'btn1' }
            })) as any;
            expect(mockPressInteractive).toHaveBeenCalled();
            expect(result.result).toEqual(runResult);
        });

        test('throws when payload.controlId is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'press_interactive', site: SITE, payload: {} })).rejects.toThrow(
                'payload.controlId is required'
            );
        });
    });

    describe('save step', () => {
        test('calls saveChanges and returns saved flag', async () => {
            mockSaveChanges.mockResolvedValue(true);
            const result = await runRtaWorkflowStep({ step: 'save', site: SITE });
            expect(result).toEqual({ saved: true });
        });
    });

    describe('get_context step', () => {
        test('calls getElementContext with controlId and actionId', async () => {
            const ctx = { elementType: 'sap.m.Button', actionParameters: [] };
            mockGetElementContext.mockResolvedValue(ctx);
            const result = (await runRtaWorkflowStep({
                step: 'get_context',
                site: SITE,
                payload: { controlId: 'ctrl1', actionId: 'rename' }
            })) as any;
            expect(result.context).toEqual(ctx);
        });
    });

    describe('call_action step', () => {
        test('calls executeAction and returns success flag', async () => {
            mockExecuteAction.mockResolvedValue(true);
            const result = (await runRtaWorkflowStep({
                step: 'call_action',
                site: SITE,
                payload: { controlId: 'ctrl1', actionId: 'rename', actionPayload: { newLabel: 'Hi' } }
            })) as any;
            expect(result.success).toBe(true);
        });
    });
});
