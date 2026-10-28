import { jest } from '@jest/globals';
import type { EditorSession } from '../../../../src/utils/editor-session.js';
import type { FrontendActionTransport } from '../../../../src/tools/run-rta-workflow-step/browser/types.js';
import type * as rta from '../../../../src/tools/run-rta-workflow-step/rta/index.js';

const SITE = 'https://editor-workspaces-test.eu10.applicationstudio.cloud.sap/test/adaptation-editor.html';
const LOCAL_SITE = 'http://127.0.0.1:49152/test/adaptation-editor.html';
const FRAME = 'preview';

const mockHttpTransport = {
    callFrontendAction: jest.fn<FrontendActionTransport['callFrontendAction']>(),
    disconnectSite: jest.fn<FrontendActionTransport['disconnectSite']>(),
    stopBrowser: jest.fn<FrontendActionTransport['stopBrowser']>(),
    reloadPage: jest.fn<(site: string) => Promise<void>>(),
    stopEditor: jest.fn<(site: string) => Promise<boolean>>()
};
const mockDefaultTransport = {
    callFrontendAction: jest.fn<FrontendActionTransport['callFrontendAction']>(),
    disconnectSite: jest.fn<FrontendActionTransport['disconnectSite']>(),
    stopBrowser: jest.fn<FrontendActionTransport['stopBrowser']>()
};
const mockIsRegistryEmpty = jest.fn<() => boolean>();
jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/browser/index.js', () => ({
    defaultTransport: mockDefaultTransport,
    httpTransport: mockHttpTransport,
    isRegistryEmpty: mockIsRegistryEmpty
}));

const mockStartRta = jest.fn<typeof rta.startRta>();
const mockGetOverlays = jest.fn<typeof rta.getOverlays>();
jest.unstable_mockModule('../../../../src/tools/run-rta-workflow-step/rta/index.js', () => ({
    startRta: mockStartRta,
    getOverlays: mockGetOverlays,
    getElementContext: jest.fn(),
    executeAction: jest.fn(),
    saveChanges: jest.fn(),
    getPageActions: jest.fn(),
    callPageAction: jest.fn(),
    pressInteractive: jest.fn(),
    FrontendActionError: class FrontendActionError extends Error {}
}));

const mockRequireEditorSession =
    jest.fn<(site: string) => Pick<EditorSession, 'localUrl' | 'browserUrl' | 'relayToken'>>();
jest.unstable_mockModule('../../../../src/utils/editor-session.js', () => ({
    requireEditorSession: mockRequireEditorSession
}));
jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
    logger: { error: jest.fn(), warn: jest.fn() }
}));

// Transport selection happens at import time. Keep this suite independent of
// both the caller's environment and the default browser dispatcher tests.
// Outside BAS the relay transport is selected via SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN.
const savedForceAutoOpen = process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN;
process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN = 'true';
const { runRtaWorkflowStep } = await import('../../../../src/tools/run-rta-workflow-step/index.js');
if (savedForceAutoOpen === undefined) {
    delete process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN;
} else {
    process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN = savedForceAutoOpen;
}

describe('runRtaWorkflowStep HTTP dispatcher', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockHttpTransport.disconnectSite.mockResolvedValue(undefined);
        mockHttpTransport.reloadPage.mockResolvedValue(undefined);
        mockHttpTransport.stopEditor.mockResolvedValue(true);
        mockStartRta.mockResolvedValue({ rtaStarted: true });
        mockIsRegistryEmpty.mockReturnValue(true);
        mockRequireEditorSession.mockImplementation((site) => {
            if (site !== SITE && site !== LOCAL_SITE) {
                throw new Error('Unknown editor session. Use its exact returned editor URL.');
            }
            return { localUrl: LOCAL_SITE, browserUrl: SITE, relayToken: 'a'.repeat(64) };
        });
    });

    test.each([SITE, LOCAL_SITE])(
        'starts RTA only for the exact registered URL %s using the HTTP transport',
        async (site) => {
            await expect(runRtaWorkflowStep({ step: 'start', site, frameId: FRAME })).resolves.toEqual({
                site,
                frameId: FRAME,
                rtaStarted: true
            });
            expect(mockRequireEditorSession).toHaveBeenCalledTimes(1);
            expect(mockRequireEditorSession).toHaveBeenCalledWith(site);
            expect(mockHttpTransport.disconnectSite).toHaveBeenCalledWith(site);
            expect(mockStartRta).toHaveBeenCalledWith(mockHttpTransport, { site, frameId: FRAME });
            expect(mockRequireEditorSession.mock.invocationCallOrder[0]).toBeLessThan(
                mockHttpTransport.disconnectSite.mock.invocationCallOrder[0]
            );
            expect(mockDefaultTransport.disconnectSite).not.toHaveBeenCalled();
        }
    );

    test('validates the exact session on subsequent steps and defaults the frameId', async () => {
        mockGetOverlays.mockResolvedValue({ overlays: [], actionsCatalog: {} });
        await expect(runRtaWorkflowStep({ step: 'get_overlays', site: SITE })).resolves.toEqual({
            overlays: [],
            actionsCatalog: {}
        });
        expect(mockRequireEditorSession).toHaveBeenCalledWith(SITE);
        expect(mockGetOverlays).toHaveBeenCalledWith(mockHttpTransport, { site: SITE, frameId: FRAME });
    });

    test.each([
        `${SITE}/`,
        `${SITE}?unregistered=true`,
        `${SITE}#unregistered`,
        SITE.replace('/test/adaptation-editor.html', '/other-editor.html'),
        'https://port49152-workspaces-test.eu10.applicationstudio.cloud.sap/test/adaptation-editor.html',
        'http://localhost:49152/test/adaptation-editor.html',
        'https://attacker.example.com/test/adaptation-editor.html'
    ])('rejects an unregistered URL %s without dispatching', async (site) => {
        await expect(runRtaWorkflowStep({ step: 'start', site })).rejects.toThrow('Unknown editor session');
        expect(mockRequireEditorSession).toHaveBeenCalledWith(site);
        expect(mockHttpTransport.disconnectSite).not.toHaveBeenCalled();
        expect(mockStartRta).not.toHaveBeenCalled();
        expect(mockDefaultTransport.disconnectSite).not.toHaveBeenCalled();
    });

    test.each(['stop', 'restart', 'get_overlays'] as const)(
        'rejects an unknown session for %s before side effects',
        async (step) => {
            await expect(runRtaWorkflowStep({ step, site: `${SITE}?unknown` })).rejects.toThrow(
                'Unknown editor session'
            );
            expect(mockHttpTransport.disconnectSite).not.toHaveBeenCalled();
            expect(mockHttpTransport.stopEditor).not.toHaveBeenCalled();
            expect(mockHttpTransport.reloadPage).not.toHaveBeenCalled();
            expect(mockStartRta).not.toHaveBeenCalled();
            expect(mockGetOverlays).not.toHaveBeenCalled();
        }
    );

    test.each([true, false])('stop reports editorServerStopped=%s from the HTTP transport', async (stopped) => {
        mockHttpTransport.stopEditor.mockResolvedValueOnce(stopped);
        await expect(runRtaWorkflowStep({ step: 'stop', site: SITE })).resolves.toEqual({
            stopped: true,
            editorServerStopped: stopped
        });
        expect(mockRequireEditorSession).toHaveBeenCalledWith(SITE);
        expect(mockHttpTransport.disconnectSite).toHaveBeenCalledWith(SITE);
        expect(mockHttpTransport.stopEditor).toHaveBeenCalledTimes(1);
        expect(mockHttpTransport.stopEditor).toHaveBeenCalledWith(SITE);
        expect(mockHttpTransport.disconnectSite.mock.invocationCallOrder[0]).toBeLessThan(
            mockHttpTransport.stopEditor.mock.invocationCallOrder[0]
        );
        expect(mockHttpTransport.stopBrowser).not.toHaveBeenCalled();
        expect(mockDefaultTransport.stopBrowser).not.toHaveBeenCalled();
        expect(mockIsRegistryEmpty).not.toHaveBeenCalled();
    });

    test('restart waits for reload before starting RTA', async () => {
        let finishReload: () => void = () => {};
        mockHttpTransport.reloadPage.mockReturnValueOnce(
            new Promise<void>((resolve) => {
                finishReload = resolve;
            })
        );
        const result = runRtaWorkflowStep({ step: 'restart', site: SITE, frameId: 'custom-frame' });
        await Promise.resolve();
        expect(mockHttpTransport.reloadPage).toHaveBeenCalledWith(SITE);
        expect(mockStartRta).not.toHaveBeenCalled();
        finishReload();
        await expect(result).resolves.toEqual({ site: SITE, frameId: 'custom-frame', rtaStarted: true });
        expect(mockHttpTransport.disconnectSite.mock.invocationCallOrder[0]).toBeLessThan(
            mockHttpTransport.reloadPage.mock.invocationCallOrder[0]
        );
        expect(mockHttpTransport.reloadPage.mock.invocationCallOrder[0]).toBeLessThan(
            mockStartRta.mock.invocationCallOrder[0]
        );
        expect(mockStartRta).toHaveBeenCalledWith(mockHttpTransport, { site: SITE, frameId: 'custom-frame' });
    });

    test('restart surfaces readiness failure without starting RTA', async () => {
        const error = new Error('Reloaded editor did not become ready');
        mockHttpTransport.reloadPage.mockRejectedValueOnce(error);
        await expect(runRtaWorkflowStep({ step: 'restart', site: SITE })).rejects.toBe(error);
        expect(mockHttpTransport.reloadPage).toHaveBeenCalledTimes(1);
        expect(mockStartRta).not.toHaveBeenCalled();
    });
});
