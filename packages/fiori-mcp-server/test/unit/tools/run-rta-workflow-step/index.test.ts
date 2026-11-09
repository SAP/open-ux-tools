import { jest } from '@jest/globals';
import type { FrontendActionTransport } from '../../../../src/tools/run-rta-workflow-step/browser/types.js';

// --- mock browser/index ---------------------------------------------------

const mockDisconnectSite = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockStopBrowser = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockCallFrontendAction = jest.fn<FrontendActionTransport['callFrontendAction']>();
const mockFetchViaContext = jest.fn<FrontendActionTransport['fetchViaContext']>();
const mockRegisterSite = jest.fn<(site: string, appPath: string) => Promise<void>>().mockResolvedValue(undefined);
let registryEmpty = true;

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/browser/index.js', () => ({
    defaultTransport: {
        callFrontendAction: mockCallFrontendAction,
        fetchViaContext: mockFetchViaContext,
        disconnectSite: mockDisconnectSite,
        stopBrowser: mockStopBrowser
    },
    isRegistryEmpty: () => registryEmpty,
    registerSite: mockRegisterSite,
    stopBrowser: mockStopBrowser
}));

// --- mock rta/index -------------------------------------------------------

const mockStartRta = jest.fn<any>();
const mockGetOverlays = jest.fn<any>();
const mockGetElementContext = jest.fn<any>();
const mockExecuteAction = jest.fn<any>();
const mockSaveChanges = jest.fn<any>();
const mockDescribeUi = jest.fn<any>();
const mockExecuteUfaAction = jest.fn<any>();
const mockGetODataMetadata = jest.fn<any>();

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/rta/index.js', () => ({
    startRta: mockStartRta,
    getOverlays: mockGetOverlays,
    getElementContext: mockGetElementContext,
    executeAction: mockExecuteAction,
    saveChanges: mockSaveChanges,
    describeUi: mockDescribeUi,
    executeUfaAction: mockExecuteUfaAction,
    getODataMetadata: mockGetODataMetadata,
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
                frameId: FRAME,
                appPath: '/tmp/app'
            });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStartRta).toHaveBeenCalled();
            expect(result).toMatchObject({ site: SITE, frameId: FRAME, rtaStarted: true });
        });

        test('registers the site with appPath before starting', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            await runRtaWorkflowStep({ step: 'start', site: SITE, appPath: '/tmp/app' });
            expect(mockRegisterSite).toHaveBeenCalledWith(SITE, '/tmp/app');
        });

        test('throws when appPath is omitted', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            await expect(runRtaWorkflowStep({ step: 'start', site: SITE })).rejects.toThrow(/appPath/i);
            expect(mockRegisterSite).not.toHaveBeenCalled();
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
            ).rejects.toThrow('site must point to localhost, 127.0.0.1 or ::1');
        });

        test('accepts 127.0.0.1 as a valid site host', async () => {
            mockStartRta.mockResolvedValue({ rtaStarted: true });
            const result = await runRtaWorkflowStep({
                step: 'start',
                site: 'http://127.0.0.1:8080/test/adaptation-editor.html',
                appPath: '/tmp/app'
            });
            expect(result).toMatchObject({ rtaStarted: true });
        });

        test('passes backend_login_required through to the result', async () => {
            mockStartRta.mockResolvedValue({
                rtaStarted: false,
                needsUserAction: 'backend_login_required',
                message: 'log in'
            });
            const result = await runRtaWorkflowStep({
                step: 'start',
                site: SITE,
                frameId: FRAME,
                appPath: '/tmp/app'
            });
            expect(result).toMatchObject({
                site: SITE,
                frameId: FRAME,
                rtaStarted: false,
                needsUserAction: 'backend_login_required',
                message: 'log in'
            });
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
            const result = await runRtaWorkflowStep({
                step: 'restart',
                site: SITE,
                frameId: FRAME,
                appPath: '/tmp/app'
            });
            expect(mockDisconnectSite).toHaveBeenCalledWith(SITE);
            expect(mockStartRta).toHaveBeenCalled();
            expect(result).toMatchObject({ site: SITE, frameId: FRAME, rtaStarted: true });
        });

        test('passes backend_login_required through to the result', async () => {
            mockStartRta.mockResolvedValue({
                rtaStarted: false,
                needsUserAction: 'backend_login_required',
                message: 'log in'
            });
            const result = await runRtaWorkflowStep({
                step: 'restart',
                site: SITE,
                frameId: FRAME,
                appPath: '/tmp/app'
            });
            expect(result).toMatchObject({
                rtaStarted: false,
                needsUserAction: 'backend_login_required'
            });
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

    describe('describe_ui step', () => {
        test('calls describeUi without rootElementId and returns uiTree', async () => {
            const tree = [{ id: 'root', type: 'sap.ui.core.mvc.XMLView', children: [] }];
            mockDescribeUi.mockResolvedValue(tree);
            const result = (await runRtaWorkflowStep({ step: 'describe_ui', site: SITE })) as any;
            expect(mockDescribeUi).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ site: SITE }),
                undefined
            );
            expect(result.uiTree).toEqual(tree);
        });

        test('passes rootElementId to describeUi when provided', async () => {
            mockDescribeUi.mockResolvedValue([{ id: 'tbl', type: 'sap.m.Table', children: [] }]);
            await runRtaWorkflowStep({ step: 'describe_ui', site: SITE, payload: { rootElementId: 'tbl' } });
            expect(mockDescribeUi).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'tbl');
        });

        test('throws instead of coercing a non-string rootElementId to [object Object]', async () => {
            await expect(
                runRtaWorkflowStep({ step: 'describe_ui', site: SITE, payload: { rootElementId: { nested: 'x' } } })
            ).rejects.toThrow('payload.rootElementId must be a non-empty string when provided');
            expect(mockDescribeUi).not.toHaveBeenCalled();
        });
    });

    describe('execute_page_action step', () => {
        test('calls executeUfaAction with actionName and elementId', async () => {
            mockExecuteUfaAction.mockResolvedValue({ isSuccess: true, result: undefined });
            const result = (await runRtaWorkflowStep({
                step: 'execute_page_action',
                site: SITE,
                payload: { actionName: 'press', elementId: 'btn1' }
            })) as any;
            expect(mockExecuteUfaAction).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ site: SITE }),
                'press',
                'btn1',
                undefined
            );
            expect(result.isSuccess).toBe(true);
        });

        test('calls executeUfaAction without elementId when omitted', async () => {
            mockExecuteUfaAction.mockResolvedValue({ isSuccess: true, result: undefined });
            await runRtaWorkflowStep({ step: 'execute_page_action', site: SITE, payload: { actionName: 'press' } });
            expect(mockExecuteUfaAction).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                'press',
                undefined,
                undefined
            );
        });

        test('throws when payload.actionName is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'execute_page_action', site: SITE, payload: {} })).rejects.toThrow(
                'payload.actionName is required'
            );
        });

        test('returns isSuccess: false when action fails', async () => {
            mockExecuteUfaAction.mockResolvedValue({ isSuccess: false, result: undefined });
            const result = (await runRtaWorkflowStep({
                step: 'execute_page_action',
                site: SITE,
                payload: { actionName: 'press', elementId: 'btn1' }
            })) as any;
            expect(result.isSuccess).toBe(false);
        });

        test('forwards a valid actionParameters object to executeUfaAction', async () => {
            mockExecuteUfaAction.mockResolvedValue({ isSuccess: true, result: undefined });
            await runRtaWorkflowStep({
                step: 'execute_page_action',
                site: SITE,
                payload: { actionName: 'setValue', elementId: 'field1', actionParameters: { value: 'X' } }
            });
            expect(mockExecuteUfaAction).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                'setValue',
                'field1',
                { value: 'X' }
            );
        });

        test('throws when actionParameters is not a plain object (e.g. an array)', async () => {
            await expect(
                runRtaWorkflowStep({
                    step: 'execute_page_action',
                    site: SITE,
                    payload: { actionName: 'press', elementId: 'btn1', actionParameters: ['not', 'an', 'object'] }
                })
            ).rejects.toThrow('payload.actionParameters must be an object when provided');
            expect(mockExecuteUfaAction).not.toHaveBeenCalled();
        });

        test('throws instead of coercing a non-string elementId to [object Object]', async () => {
            await expect(
                runRtaWorkflowStep({
                    step: 'execute_page_action',
                    site: SITE,
                    payload: { actionName: 'press', elementId: { nested: 'x' } }
                })
            ).rejects.toThrow('payload.elementId must be a non-empty string when provided');
            expect(mockExecuteUfaAction).not.toHaveBeenCalled();
        });
    });

    describe('get_odata_metadata step', () => {
        test('passes uris and appPath to getODataMetadata and returns its entries', async () => {
            mockGetODataMetadata.mockResolvedValue({ entries: [{ url: 'api/svc/', metadata: '<edmx/>' }] });
            const result = (await runRtaWorkflowStep({
                step: 'get_odata_metadata',
                site: SITE,
                appPath: '/tmp/app',
                payload: { uris: ['api/svc/'] }
            })) as any;
            expect(mockGetODataMetadata).toHaveBeenCalledWith(expect.anything(), SITE, ['api/svc/'], '/tmp/app');
            expect(result).toEqual({ entries: [{ url: 'api/svc/', metadata: '<edmx/>' }] });
        });

        test('throws when appPath is omitted', async () => {
            await expect(
                runRtaWorkflowStep({ step: 'get_odata_metadata', site: SITE, payload: { uris: ['api/svc/'] } })
            ).rejects.toThrow(/appPath/i);
        });

        test('rejects when payload.uris is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'get_odata_metadata', site: SITE, payload: {} })).rejects.toThrow(
                /uris/i
            );
        });

        test('rejects when payload.uris is not a string array', async () => {
            await expect(
                runRtaWorkflowStep({ step: 'get_odata_metadata', site: SITE, payload: { uris: 'x' } })
            ).rejects.toThrow(/uris/i);
        });

        test('rejects when payload.uris is an empty array (fail fast, no silent no-op)', async () => {
            await expect(
                runRtaWorkflowStep({
                    step: 'get_odata_metadata',
                    site: SITE,
                    appPath: '/tmp/app',
                    payload: { uris: [] }
                })
            ).rejects.toThrow(/uris/i);
            expect(mockGetODataMetadata).not.toHaveBeenCalled();
        });
    });
});
