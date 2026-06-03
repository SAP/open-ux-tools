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

        await initOrphanedChangeDetection();

        expect(console.error).toBe(originalConsoleError);
    });

    test('does not wrap console.error when changes are empty', async () => {
        mockChangesResponse({});

        await initOrphanedChangeDetection();

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

        console.error(
            'Change \'id_addXML_1\' could not be applied. Error: resource com/sap/app/changes/fragments/MyFragment.fragment.xml could not be loaded'
        );
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_ORPHANED_CHANGE_ERROR_TITLE',
                description:
                    'ADP_ORPHANED_FILE_DESCRIPTION - fragments/MyFragment.fragment.xml, id_addXML_1.change',
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

        console.error(
            'Change \'id_codeExt_1\' could not be applied. Error: resource com/sap/app/changes/coding/MyController.js could not be loaded'
        );
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_ORPHANED_CHANGE_ERROR_TITLE',
                description: 'ADP_ORPHANED_FILE_DESCRIPTION - coding/MyController.js, id_codeExt_1.change',
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

        console.error('resource custom/module/path/fragments/Custom.fragment.xml could not be loaded');
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_ORPHANED_CHANGE_ERROR_TITLE',
                description:
                    'ADP_ORPHANED_FILE_DESCRIPTION - fragments/Custom.fragment.xml, id_addXML_1.change',
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

        console.error('resource com/sap/app/changes/fragments/B.fragment.xml could not be loaded');
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_ORPHANED_CHANGE_ERROR_TITLE',
                description:
                    'ADP_ORPHANED_FILE_DESCRIPTION - fragments/B.fragment.xml, id_addXML_2.change',
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

        await initOrphanedChangeDetection();

        expect(console.error).toBe(originalConsoleError);
    });

    test('handles fetch failure gracefully', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        await initOrphanedChangeDetection();

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

        await initOrphanedChangeDetection();

        expect(console.error).not.toBe(originalConsoleError);

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

        console.error(
            'Change \'id_addXML_1\' could not be applied.',
            'resource com/sap/app/changes/fragments/Multi.fragment.xml could not be loaded'
        );
        await flushPromises();

        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'ADP_ORPHANED_CHANGE_ERROR_TITLE',
                description:
                    'ADP_ORPHANED_FILE_DESCRIPTION - fragments/Multi.fragment.xml, id_addXML_1.change',
                type: MessageBarType.error
            })
        );
    });
});
