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
const mockGetApplicationInfo = jest.fn<any>();
const mockCleanup = jest.fn<any>();
const mockGetPageActions = jest.fn<any>();
const mockCallPageAction = jest.fn<any>();

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/rta/index.js', () => ({
    startRta: mockStartRta,
    getOverlays: mockGetOverlays,
    getElementContext: mockGetElementContext,
    executeAction: mockExecuteAction,
    saveChanges: mockSaveChanges,
    getApplicationInfo: mockGetApplicationInfo,
    cleanup: mockCleanup,
    getPageActions: mockGetPageActions,
    callPageAction: mockCallPageAction,
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
                site: SITE,
                frameId: FRAME
            });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStartRta).toHaveBeenCalledWith(expect.anything(), { site: SITE, frameId: FRAME }, undefined);
            expect(result).toMatchObject({ site: SITE, frameId: FRAME, rtaStarted: true });
        });

        test('forwards agentName from payload to startRta', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            await runRtaWorkflowStep({
                step: 'start',
                site: SITE,
                frameId: FRAME,
                payload: { agentName: 'Joule' }
            });
            expect(mockStartRta).toHaveBeenCalledWith(expect.anything(), { site: SITE, frameId: FRAME }, 'Joule');
        });

        test('throws when payload.agentName is present but empty', async () => {
            await expect(runRtaWorkflowStep({ step: 'start', site: SITE, payload: { agentName: '' } })).rejects.toThrow(
                'payload.agentName must be a non-empty string when provided'
            );
        });

        test('throws when site is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'start', site: '' })).rejects.toThrow('site is required');
        });

        test('throws when site is not an http/https URL', async () => {
            await expect(runRtaWorkflowStep({ step: 'start', site: 'file:///etc/passwd' })).rejects.toThrow(
                'http:// or https://'
            );
        });

        test('throws when site points to an external host', async () => {
            await expect(
                runRtaWorkflowStep({ step: 'start', site: 'https://attacker.example.com/editor' })
            ).rejects.toThrow('localhost or 127.0.0.1');
        });

        test('accepts 127.0.0.1 as a valid site host', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            const result = await runRtaWorkflowStep({
                step: 'start',
                site: 'http://127.0.0.1:8080/test/adaptation-editor.html'
            });
            expect(result).toMatchObject({ rtaStarted: true });
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
        test('returns the registered list', async () => {
            const registered = [{ id: 'loadData', layer: 'framework', label: 'Load', description: '' }];
            mockGetPageActions.mockResolvedValue({ registered });
            const result = await runRtaWorkflowStep({ step: 'get_page_actions', site: SITE });
            expect(result).toEqual({ registered });
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

    describe('get_application_info step', () => {
        test('calls getApplicationInfo and wraps the result', async () => {
            const applicationInfo = {
                appId: 'my.app',
                system: 'U1Y',
                client: '120',
                appTitle: 'My App',
                appVersion: '1.0.0'
            };
            mockGetApplicationInfo.mockResolvedValue(applicationInfo);
            const result = await runRtaWorkflowStep({ step: 'get_application_info', site: SITE });
            expect(result).toEqual({ applicationInfo });
        });
    });

    describe('cleanup step', () => {
        test('calls cleanup without a reason and returns cleaned flag', async () => {
            mockCleanup.mockResolvedValue({ cleaned: true });
            const result = await runRtaWorkflowStep({ step: 'cleanup', site: SITE });
            expect(mockCleanup).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined);
            expect(result).toEqual({ cleaned: true });
        });

        test('forwards reason from payload', async () => {
            mockCleanup.mockResolvedValue({ cleaned: true });
            await runRtaWorkflowStep({ step: 'cleanup', site: SITE, payload: { reason: 'done' } });
            expect(mockCleanup).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'done');
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
