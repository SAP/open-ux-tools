import { jest } from '@jest/globals';

const mockStartRta = jest.fn<any>();
const mockGetOverlays = jest.fn<any>();
const mockGetActions = jest.fn<any>();
const mockGetElementContext = jest.fn<any>();
const mockExecuteAction = jest.fn<any>();
const mockSaveChanges = jest.fn<any>();
const mockStopBrowser = jest.fn<any>();

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/rta/index.js', () => ({
    startRta: mockStartRta,
    getOverlays: mockGetOverlays,
    getActions: mockGetActions,
    getElementContext: mockGetElementContext,
    executeAction: mockExecuteAction,
    saveChanges: mockSaveChanges,
    FrontendActionError: class FrontendActionError extends Error {
        public readonly code: string;
        constructor(actionName: string, code: string, message: string | null | undefined) {
            super(`Frontend action ${actionName} failed [${code}]: ${message ?? '(no message)'}`);
            this.name = 'FrontendActionError';
            this.code = code;
        }
    }
}));

jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/browser/index.js', () => ({
    defaultTransport: {
        callFrontendAction: jest.fn(),
        disconnectSite: jest.fn(),
        stopBrowser: mockStopBrowser
    }
}));

const { runRtaWorkflowStep } = await import(
    '../../../../src/tools/run-rta-workflow-step/index.js'
);
const { FrontendActionError } = await import(
    '../../../../src/tools/run-rta-workflow-step/rta/index.js'
);

/**
 * Session IDs accumulated by tests that start a session but do not stop it.
 * The stopBrowser test drains this list so the sessions Map is empty when
 * it runs its own start+stop sequence.
 */
const openSessionIds: string[] = [];

async function startSession(): Promise<string> {
    mockStartRta.mockResolvedValueOnce({ rtaStarted: true });
    const result = (await runRtaWorkflowStep({
        step: 'start',
        payload: { site: 'https://example.com' }
    })) as any;
    openSessionIds.push(result.sessionId);
    return result.sessionId;
}

describe('runRtaWorkflowStep', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('start', () => {
        test('throws when site is missing from payload', async () => {
            await expect(runRtaWorkflowStep({ step: 'start', payload: {} })).rejects.toThrow(
                'payload.site is required and must be a non-empty string'
            );
        });

        test('returns sessionId and rtaStarted on success', async () => {
            const sessionId = await startSession();
            expect(typeof sessionId).toBe('string');
            expect(sessionId.length).toBeGreaterThan(0);
        });
    });

    describe('get_overlays', () => {
        test('throws when sessionId is missing', async () => {
            await expect(runRtaWorkflowStep({ step: 'get_overlays' })).rejects.toThrow('sessionId is required');
        });

        test('returns overlays on success', async () => {
            const sessionId = await startSession();
            const overlays = [{ id: 'ctrl1' }];
            mockGetOverlays.mockResolvedValue(overlays);
            const result = await runRtaWorkflowStep({ step: 'get_overlays', sessionId });
            expect(result).toEqual({ overlays });
        });
    });

    describe('get_actions', () => {
        test('throws when controlId is missing', async () => {
            const sessionId = await startSession();
            await expect(
                runRtaWorkflowStep({ step: 'get_actions', sessionId, payload: {} })
            ).rejects.toThrow('payload.controlId is required and must be a non-empty string');
        });

        test('returns actions on success', async () => {
            const sessionId = await startSession();
            const actions = [{ id: 'rename', name: 'Rename' }];
            mockGetActions.mockResolvedValue(actions);
            const result = await runRtaWorkflowStep({
                step: 'get_actions',
                sessionId,
                payload: { controlId: 'ctrl1' }
            });
            expect(result).toEqual({ actions });
        });
    });

    describe('get_context', () => {
        test('throws when controlId is missing', async () => {
            const sessionId = await startSession();
            await expect(
                runRtaWorkflowStep({ step: 'get_context', sessionId, payload: { actionId: 'rename' } })
            ).rejects.toThrow('payload.controlId is required and must be a non-empty string');
        });

        test('throws when actionId is missing', async () => {
            const sessionId = await startSession();
            await expect(
                runRtaWorkflowStep({ step: 'get_context', sessionId, payload: { controlId: 'ctrl1' } })
            ).rejects.toThrow('payload.actionId is required and must be a non-empty string');
        });

        test('returns context on success', async () => {
            const sessionId = await startSession();
            const context = { properties: [] };
            mockGetElementContext.mockResolvedValue(context);
            const result = await runRtaWorkflowStep({
                step: 'get_context',
                sessionId,
                payload: { controlId: 'ctrl1', actionId: 'rename' }
            });
            expect(result).toEqual({ context });
        });
    });

    describe('call_action', () => {
        test('throws when actionPayload is missing', async () => {
            const sessionId = await startSession();
            await expect(
                runRtaWorkflowStep({
                    step: 'call_action',
                    sessionId,
                    payload: { controlId: 'ctrl1', actionId: 'rename' }
                })
            ).rejects.toThrow('payload.actionPayload is required and must be an object');
        });

        test('throws when actionPayload is not an object', async () => {
            const sessionId = await startSession();
            await expect(
                runRtaWorkflowStep({
                    step: 'call_action',
                    sessionId,
                    payload: { controlId: 'ctrl1', actionId: 'rename', actionPayload: 'notAnObject' }
                })
            ).rejects.toThrow('payload.actionPayload is required and must be an object');
        });

        test('returns success true on success', async () => {
            const sessionId = await startSession();
            mockExecuteAction.mockResolvedValue(true);
            const result = await runRtaWorkflowStep({
                step: 'call_action',
                sessionId,
                payload: { controlId: 'ctrl1', actionId: 'rename', actionPayload: { newValue: 'foo' } }
            });
            expect(result).toEqual({ success: true });
        });
    });

    describe('save', () => {
        test('returns saved true on success', async () => {
            const sessionId = await startSession();
            mockSaveChanges.mockResolvedValue(true);
            const result = await runRtaWorkflowStep({ step: 'save', sessionId });
            expect(result).toEqual({ saved: true });
        });
    });

    describe('stop', () => {
        test('returns stopped true on success', async () => {
            const sessionId = await startSession();
            const result = await runRtaWorkflowStep({ step: 'stop', sessionId });
            // Remove from open list since it was stopped here
            const idx = openSessionIds.indexOf(sessionId);
            if (idx !== -1) openSessionIds.splice(idx, 1);
            expect(result).toEqual({ stopped: true });
        });

        test('calls stopBrowser when the last session is removed', async () => {
            // Drain all sessions accumulated by earlier tests so the Map is empty
            // after this test stops its own session.
            for (const id of openSessionIds.splice(0)) {
                try {
                    await runRtaWorkflowStep({ step: 'stop', sessionId: id });
                } catch {
                    // already stopped — ignore
                }
            }
            mockStopBrowser.mockClear();

            mockStartRta.mockResolvedValueOnce({ rtaStarted: true });
            const startResult = (await runRtaWorkflowStep({
                step: 'start',
                payload: { site: 'https://example.com' }
            })) as any;

            await runRtaWorkflowStep({ step: 'stop', sessionId: startResult.sessionId });
            expect(mockStopBrowser).toHaveBeenCalledTimes(1);
        });
    });

    describe('unknown step', () => {
        test('throws with message containing Unknown step', async () => {
            await expect(
                runRtaWorkflowStep({ step: 'not_a_real_step' as any })
            ).rejects.toThrow('Unknown step');
        });
    });

    describe('FrontendActionError', () => {
        test('is re-thrown from the step handler', async () => {
            const sessionId = await startSession();
            const frontendError = new (FrontendActionError as any)('someAction', 'ERR_CODE', 'something failed');
            mockGetOverlays.mockRejectedValue(frontendError);
            await expect(
                runRtaWorkflowStep({ step: 'get_overlays', sessionId })
            ).rejects.toThrow('something failed');
        });
    });
});
