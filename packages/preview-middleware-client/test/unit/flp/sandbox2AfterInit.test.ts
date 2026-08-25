import { jest } from '@jest/globals';
import { sapMock, documentMock } from 'mock/window';
import VersionInfo from 'mock/sap/ui/VersionInfo';

jest.unstable_mockModule('open/ux/preview/client/flp/common', () => ({
    addCardGenerationUserAction: jest.fn(),
    registerForControllerExtensionErrors: jest.fn(),
    resetAppState: jest.fn().mockResolvedValue(undefined),
    startRtaForAppInstance: jest.fn()
}));

jest.unstable_mockModule('open/ux/preview/client/flp/initConnectors', () => ({
    default: jest.fn().mockResolvedValue(undefined)
}));

const { execute } = await import('open/ux/preview/client/flp/sandbox2AfterInit');
const common = await import('open/ux/preview/client/flp/common');
const resetAppStateMock = common.resetAppState as jest.Mock;
const registerForControllerExtensionErrorsMock = common.registerForControllerExtensionErrors as jest.Mock;
const startRtaForAppInstanceMock = common.startRtaForAppInstance as jest.Mock;
const addCardGenerationUserActionMock = common.addCardGenerationUserAction as jest.Mock;
const { default: initConnectorsMock } = await import('open/ux/preview/client/flp/initConnectors');

describe('flp/sandbox2AfterInit', () => {
    let bootstrapEl: HTMLScriptElement;
    let lifecycleServiceMock: { attachAppLoaded: jest.Mock };
    let componentInstanceMock: object;

    beforeEach(() => {
        bootstrapEl = document.createElement('script');
        bootstrapEl.id = 'sap-ui-bootstrap';
        documentMock.getElementById.mockReturnValue(bootstrapEl);

        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.150.0' });

        componentInstanceMock = {};
        lifecycleServiceMock = { attachAppLoaded: jest.fn() };
        sapMock.ushell.Container.getServiceAsync.mockResolvedValue(lifecycleServiceMock);
        sapMock.ushell.Container.init.mockResolvedValue(undefined);

        resetAppStateMock.mockReset().mockResolvedValue(undefined);
        registerForControllerExtensionErrorsMock.mockReset();
        startRtaForAppInstanceMock.mockReset();
        addCardGenerationUserActionMock.mockReset();
        (initConnectorsMock as jest.Mock).mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => {
        documentMock.getElementById.mockReset();
        window.location.hash = '';
        jest.restoreAllMocks();
    });

    test('execute exports a function', () => {
        expect(typeof execute).toBe('function');
    });

    test('resets app state by default', async () => {
        await execute();
        expect(resetAppStateMock).toHaveBeenCalledWith(sap.ushell.Container);
    });

    test('does not reset app state when fiori-tools-iapp-state=true', async () => {
        jest.spyOn(globalThis, 'URLSearchParams').mockReturnValueOnce({
            get: (key: string) => (key === 'fiori-tools-iapp-state' ? 'true' : null)
        } as unknown as URLSearchParams);
        await execute();
        expect(resetAppStateMock).not.toHaveBeenCalled();
    });

    test('calls initConnectors', async () => {
        await execute();
        expect(initConnectorsMock).toHaveBeenCalled();
    });

    test('does NOT call container.init or createRenderer when enhancedHomePage is not set', async () => {
        await execute();
        expect(sapMock.ushell.Container.init).not.toHaveBeenCalled();
        expect(sapMock.ushell.Container.createRenderer).not.toHaveBeenCalled();
        expect(sapMock.ushell.Container.createRendererInternal).not.toHaveBeenCalled();
    });

    test('calls container.init("cdm") when enhancedHomePage dataset is set', async () => {
        bootstrapEl.dataset.openUxPreviewEnhancedHomepage = 'true';
        await execute();
        expect(sapMock.ushell.Container.init).toHaveBeenCalledWith('cdm');
    });

    describe('RTA', () => {
        const flexSettings = { scenario: 'ADAPTATION_PROJECT', layer: 'VENDOR' };

        test('does not wire AppLifeCycle when flex is not set', async () => {
            await execute();
            expect(sapMock.ushell.Container.getServiceAsync).not.toHaveBeenCalledWith('AppLifeCycle');
            expect(registerForControllerExtensionErrorsMock).not.toHaveBeenCalled();
        });

        test('wires AppLifeCycle and registers error listener when flex is set', async () => {
            bootstrapEl.dataset.openUxPreviewFlexSettings = JSON.stringify(flexSettings);
            await execute();
            expect(registerForControllerExtensionErrorsMock).toHaveBeenCalled();
            expect(sapMock.ushell.Container.getServiceAsync).toHaveBeenCalledWith('AppLifeCycle');
            expect(lifecycleServiceMock.attachAppLoaded).toHaveBeenCalled();
        });

        test('calls startRtaForAppInstance on app load when hash is not Shell-home', async () => {
            bootstrapEl.dataset.openUxPreviewFlexSettings = JSON.stringify(flexSettings);
            window.location.hash = '#SalesOrder-display';
            lifecycleServiceMock.attachAppLoaded.mockImplementation((cb: (event: unknown) => void) => {
                cb({ getParameter: () => componentInstanceMock });
            });
            await execute();
            expect(startRtaForAppInstanceMock).toHaveBeenCalledWith(
                componentInstanceMock,
                expect.objectContaining({ scenario: 'ADAPTATION_PROJECT' }),
                expect.any(Object)
            );
        });

        test('does not call startRtaForAppInstance when hash is Shell-home', async () => {
            bootstrapEl.dataset.openUxPreviewFlexSettings = JSON.stringify(flexSettings);
            window.location.hash = '#Shell-home';
            lifecycleServiceMock.attachAppLoaded.mockImplementation((cb: (event: unknown) => void) => {
                cb({ getParameter: () => componentInstanceMock });
            });
            await execute();
            expect(startRtaForAppInstanceMock).not.toHaveBeenCalled();
        });
    });

    describe('card generator', () => {
        test('does not wire card generator when dataset is not set', async () => {
            await execute();
            expect(addCardGenerationUserActionMock).not.toHaveBeenCalled();
        });

        test('wires card generator on app load when enabled and UI5 >= 1.121', async () => {
            bootstrapEl.dataset.openUxPreviewEnableCardGenerator = 'true';
            lifecycleServiceMock.attachAppLoaded.mockImplementation((cb: (event: unknown) => void) => {
                cb({ getParameter: () => componentInstanceMock });
            });
            await execute();
            expect(addCardGenerationUserActionMock).toHaveBeenCalledWith(componentInstanceMock, sap.ushell.Container);
        });

        test('logs warning when card generator enabled but UI5 < 1.121', async () => {
            bootstrapEl.dataset.openUxPreviewEnableCardGenerator = 'true';
            VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '1.120.0' });
            const logWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            await execute();
            expect(addCardGenerationUserActionMock).not.toHaveBeenCalled();
            logWarnSpy.mockRestore();
        });
    });
});
