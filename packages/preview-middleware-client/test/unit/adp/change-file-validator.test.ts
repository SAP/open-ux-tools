import { jest } from '@jest/globals';
import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { documentMock, fetchMock } from 'mock/window';

jest.unstable_mockModule('open/ux/preview/client/i18n', () => ({
    getTextBundle: () =>
        Promise.resolve({
            getText: jest
                .fn()
                .mockImplementation((key, params) =>
                    Array.isArray(params) ? `${key} - ${params.join(', ')}` : key
                )
        })
}));

const { CommunicationService } = await import('open/ux/preview/client/cpe/communication-service');
const { initOrphanedChangeDetection } = await import('open/ux/preview/client/adp/change-file-validator');

/**
 * Flushes pending microtasks so fire-and-forget async calls (sendInfoCenterMessage)
 * resolve before assertions.
 */
function flushPromises(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * Flushes pending microtasks without touching timers — usable while fake timers are active.
 * Two ticks cover a fetch → response.json() await chain.
 */
async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

describe('change-file-validator', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        console.error = originalConsoleError;

        jest.spyOn(CommunicationService, 'sendAction');

        documentMock.getElementById.mockImplementation((id) => {
            if (id === 'sap-ui-bootstrap') {
                return { dataset: { openUxPreviewBaseUrl: '' } };
            }
            return null;
        });
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    function mockChangesResponse(changes: Record<string, unknown>): void {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(changes)
        });
    }

    test('wraps console.error when addXML changes exist', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        expect(console.error).not.toBe(originalConsoleError);
    });

    test('wraps console.error when codeExt changes exist', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_codeExt_1': {
                changeType: 'codeExt',
                fileName: 'id_codeExt_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { codeRef: 'coding/MyController.js' }
            }
        });

        await initOrphanedChangeDetection();

        expect(console.error).not.toBe(originalConsoleError);
    });

    test('does not wrap console.error when no addXML or codeExt changes exist', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_rename_1': {
                changeType: 'rename',
                fileName: 'id_rename_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: {}
            }
        });

        initOrphanedChangeDetection();
        await flushPromises();

        expect(console.error).toBe(originalConsoleError);
    });

    test('does not wrap console.error when changes are empty', async () => {
        mockChangesResponse({});

        initOrphanedChangeDetection();
        await flushPromises();

        expect(console.error).toBe(originalConsoleError);
    });

    test('still calls original console.error', async () => {
        const spy = jest.fn();
        console.error = spy;

        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        console.error('some message');

        expect(spy).toHaveBeenCalledWith('some message');
    });

    test('sends InfoCenter error when console.error matches addXML fragment module name', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        const browserError =
            'Change \'id_addXML_1\' could not be applied. Error: resource com/sap/app/changes/fragments/MyFragment.fragment.xml could not be loaded';
        console.error(browserError);
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: browserError,
                type: MessageBarType.error
            })
        );
    });

    test('sends InfoCenter error when console.error matches codeExt controller module name', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_codeExt_1': {
                changeType: 'codeExt',
                fileName: 'id_codeExt_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { codeRef: 'coding/MyController.js' }
            }
        });

        await initOrphanedChangeDetection();

        const browserError =
            'Change \'id_codeExt_1\' could not be applied. Error: resource com/sap/app/changes/coding/MyController.js could not be loaded';
        console.error(browserError);
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: browserError,
                type: MessageBarType.error
            })
        );
    });

    test('de-duplicates: only sends one InfoCenter error per module name', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/Dup.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        console.error('resource com/sap/app/changes/fragments/Dup.fragment.xml could not be loaded');
        await flushPromises();
        console.error('resource com/sap/app/changes/fragments/Dup.fragment.xml could not be loaded again');
        await flushPromises();

        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => call[0]?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(1);
    });

    test('restores original console.error after all matches are found', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/Only.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        expect(console.error).not.toBe(originalConsoleError);

        console.error('resource com/sap/app/changes/fragments/Only.fragment.xml could not be loaded');
        await flushPromises();

        expect(console.error).toBe(originalConsoleError);
    });

    test('does not send InfoCenter error when console.error does not match any module name', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/MyFragment.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        console.error('some unrelated error happened');
        await flushPromises();

        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => call[0]?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(0);
    });

    test('uses moduleName from change when available instead of computing it', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                moduleName: 'custom/module/path/fragments/Custom.fragment.xml',
                content: { fragmentPath: 'fragments/Custom.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        const browserError = 'resource custom/module/path/fragments/Custom.fragment.xml could not be loaded';
        console.error(browserError);
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: browserError,
                type: MessageBarType.error
            })
        );
    });

    test('handles multiple changes — only reports matching one', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/A.fragment.xml' }
            },
            'sap.ui.fl.id_addXML_2': {
                changeType: 'addXML',
                fileName: 'id_addXML_2',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/B.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        const browserError = 'resource com/sap/app/changes/fragments/B.fragment.xml could not be loaded';
        console.error(browserError);
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: browserError,
                type: MessageBarType.error
            })
        );

        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => call[0]?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(1);
    });

    test('skips changes without reference', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: '',
                content: { fragmentPath: 'fragments/NoRef.fragment.xml' }
            }
        });

        initOrphanedChangeDetection();
        await flushPromises();

        expect(console.error).toBe(originalConsoleError);
    });

    test('handles fetch failure gracefully', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        initOrphanedChangeDetection();
        await flushPromises();

        expect(console.error).toBe(originalConsoleError);
    });

    test('uses baseUrl from sap-ui-bootstrap element', async () => {
        const mockBaseUrl = '/my-base-url';
        documentMock.getElementById.mockImplementation((id) => {
            if (id === 'sap-ui-bootstrap') {
                return { dataset: { openUxPreviewBaseUrl: mockBaseUrl } };
            }
            return null;
        });
        mockChangesResponse({});

        await initOrphanedChangeDetection();

        expect(fetchMock).toHaveBeenCalledWith(`${mockBaseUrl}/preview/api/changes`, expect.any(Object));
    });

    test('handles non-string console.error arguments gracefully', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/My.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        console.error(42, { key: 'value' }, null);
        await flushPromises();

        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => call[0]?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(0);
    });

    test('restores original console.error after safety timeout', async () => {
        jest.useFakeTimers();

        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/Timeout.fragment.xml' }
            }
        });

        initOrphanedChangeDetection();
        expect(console.error).not.toBe(originalConsoleError);
        await flushMicrotasks();

        jest.advanceTimersByTime(60_000);

        expect(console.error).toBe(originalConsoleError);

        jest.useRealTimers();
    });

    test('matches module name across multiple console.error string arguments', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/Multi.fragment.xml' }
            }
        });

        await initOrphanedChangeDetection();

        const arg1 = 'Change \'id_addXML_1\' could not be applied.';
        const arg2 = 'resource com/sap/app/changes/fragments/Multi.fragment.xml could not be loaded';
        console.error(arg1, arg2);
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: `${arg1}${arg2}`,
                type: MessageBarType.error
            })
        );
    });

    test('replays errors buffered before the changes list is loaded', async () => {
        let resolveFetch: (value: { ok: true; json: () => Promise<unknown> }) => void = () => undefined;
        fetchMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveFetch = resolve;
            })
        );

        initOrphanedChangeDetection();

        expect(console.error).not.toBe(originalConsoleError);
        const browserError =
            'Error: resource com/sap/app/changes/fragments/Early.fragment.xml could not be loaded';
        console.error(browserError);

        resolveFetch({
            ok: true,
            json: () =>
                Promise.resolve({
                    'sap.ui.fl.id_addXML_1': {
                        changeType: 'addXML',
                        fileName: 'id_addXML_1',
                        fileType: 'change',
                        reference: 'com.sap.app',
                        content: { fragmentPath: 'fragments/Early.fragment.xml' }
                    }
                })
        });
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: browserError,
                type: MessageBarType.error
            })
        );
    });

    test('strips the UI5 log timestamp prefix from the description', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/Ts.fragment.xml' }
            }
        });

        initOrphanedChangeDetection();
        await flushPromises();

        const rawErrorText = 'Error: resource com/sap/app/changes/fragments/Ts.fragment.xml could not be loaded';
        console.error(`2026-07-07 11:35:16.516500 ${rawErrorText}`);
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_CHANGE_ERROR_TITLE',
                description: rawErrorText,
                type: MessageBarType.error
            })
        );
    });

    test('returned cancel function immediately restores console.error', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                content: { fragmentPath: 'fragments/Cancel.fragment.xml' }
            }
        });

        const cancel = initOrphanedChangeDetection();

        expect(console.error).not.toBe(originalConsoleError);

        cancel();

        expect(console.error).toBe(originalConsoleError);
    });

    test('cancel prevents buffered-replay from sending InfoCenter messages', async () => {
        let resolveFetch: (value: { ok: true; json: () => Promise<unknown> }) => void = () => undefined;
        fetchMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveFetch = resolve;
            })
        );

        const cancel = initOrphanedChangeDetection();

        const browserError =
            'Error: resource com/sap/app/changes/fragments/CancelReplay.fragment.xml could not be loaded';
        console.error(browserError);

        cancel();

        resolveFetch({
            ok: true,
            json: () =>
                Promise.resolve({
                    'sap.ui.fl.id_addXML_1': {
                        changeType: 'addXML',
                        fileName: 'id_addXML_1',
                        fileType: 'change',
                        reference: 'com.sap.app',
                        content: { fragmentPath: 'fragments/CancelReplay.fragment.xml' }
                    }
                })
        });
        await flushPromises();

        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => (call[0] as { type?: string })?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(0);
    });

    test('does not fire spurious InfoCenter message for empty moduleName', async () => {
        mockChangesResponse({
            'sap.ui.fl.id_addXML_1': {
                changeType: 'addXML',
                fileName: 'id_addXML_1',
                fileType: 'change',
                reference: 'com.sap.app',
                moduleName: '',
                content: { fragmentPath: 'fragments/Empty.fragment.xml' }
            }
        });

        initOrphanedChangeDetection();
        await flushPromises();

        console.error('some completely unrelated error');
        await flushPromises();

        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => (call[0] as { type?: string })?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(0);
        // Wrapper should still be active — not prematurely cancelled.
        expect(console.error).not.toBe(originalConsoleError);
    });

    test('caps the buffer at 200 entries and does not buffer further', async () => {
        let resolveFetch: (value: { ok: true; json: () => Promise<unknown> }) => void = () => undefined;
        fetchMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveFetch = resolve;
            })
        );

        initOrphanedChangeDetection();

        // Push 250 errors before the fetch resolves.
        for (let i = 0; i < 250; i++) {
            console.error(`unrelated error ${i}`);
        }
        // The orphaned-change error arrives after the buffer is capped.
        const targetError =
            'Error: resource com/sap/app/changes/fragments/Late.fragment.xml could not be loaded';
        console.error(targetError);

        resolveFetch({
            ok: true,
            json: () =>
                Promise.resolve({
                    'sap.ui.fl.id_addXML_1': {
                        changeType: 'addXML',
                        fileName: 'id_addXML_1',
                        fileType: 'change',
                        reference: 'com.sap.app',
                        content: { fragmentPath: 'fragments/Late.fragment.xml' }
                    }
                })
        });
        await flushPromises();

        // The target error arrived after the 200-entry cap, so it was not buffered
        // and no InfoCenter message should be sent.
        const matchingCalls = (CommunicationService.sendAction as jest.Mock).mock.calls.filter(
            (call) => (call[0] as { type?: string })?.type === '[ext] show-info-center-message'
        );
        expect(matchingCalls).toHaveLength(0);
    });
});
