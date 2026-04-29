import { fetchMock, sapMock, documentMock } from 'mock/window';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { execute } from '../../../src/flp/init2';

jest.mock('../../../src/flp/common', () => ({
    attachRtaListener: jest.fn().mockReturnValue('FE_FROM_SCRATCH'),
    loadI18nResourceBundle: jest.fn().mockResolvedValue({
        hasText: jest.fn().mockReturnValue(false),
        getText: jest.fn()
    }),
    registerComponentDependencyPaths: jest.fn().mockResolvedValue(undefined),
    registerSAPFonts: jest.fn(),
    resetAppState: jest.fn().mockResolvedValue(undefined),
    setI18nTitle: jest.fn()
}));

import {
    attachRtaListener,
    loadI18nResourceBundle,
    registerComponentDependencyPaths,
    registerSAPFonts,
    resetAppState,
    setI18nTitle
} from '../../../src/flp/common';

const attachRtaListenerMock = attachRtaListener as jest.Mock;
const loadI18nMock = loadI18nResourceBundle as jest.Mock;
const registerPathsMock = registerComponentDependencyPaths as jest.Mock;
const registerFontsMock = registerSAPFonts as jest.Mock;
const resetAppStateMock = resetAppState as jest.Mock;
const setI18nTitleMock = setI18nTitle as jest.Mock;

describe('flp/init2', () => {
    let bootstrapEl: HTMLScriptElement;

    beforeEach(() => {
        bootstrapEl = document.createElement('script');
        bootstrapEl.id = 'sap-ui-bootstrap';
        documentMock.getElementById.mockReturnValue(bootstrapEl);

        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '2.0.0' });
        sapMock.ushell.Container.getServiceAsync.mockReset();
        sapMock.ui.require.mockReset();
        attachRtaListenerMock.mockReset().mockReturnValue('FE_FROM_SCRATCH');
        resetAppStateMock.mockReset().mockResolvedValue(undefined);
        loadI18nMock.mockReset().mockResolvedValue({
            hasText: jest.fn().mockReturnValue(false),
            getText: jest.fn()
        });
        registerFontsMock.mockReset();
        setI18nTitleMock.mockReset();
        registerPathsMock.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => {
        documentMock.getElementById.mockReset();
        window.location.hash = '';
    });

    test('execute exports a function', () => {
        expect(typeof execute).toBe('function');
    });

    test('execute() calls registerSAPFonts and setI18nTitle', async () => {
        await execute();
        expect(registerFontsMock).toHaveBeenCalledTimes(1);
        expect(setI18nTitleMock).toHaveBeenCalledTimes(1);
    });

    test('execute() calls resetAppState', async () => {
        await execute();
        expect(resetAppStateMock).toHaveBeenCalledTimes(1);
    });

    test('execute() does NOT call container.init() or createRenderer*()', async () => {
        await execute();
        expect(sapMock.ushell.Container.init).not.toHaveBeenCalled();
        expect(sapMock.ushell.Container.createRenderer).not.toHaveBeenCalled();
        expect(sapMock.ushell.Container.createRendererInternal).not.toHaveBeenCalled();
    });

    test('execute() registers component paths when appUrls dataset is set', async () => {
        bootstrapEl.dataset.openUxPreviewLibsManifests = JSON.stringify(['/app']);
        await execute();
        expect(registerPathsMock).toHaveBeenCalledWith(['/app'], expect.any(URLSearchParams));
    });

    test('execute() attaches RTA renderer listener when flex dataset is set', async () => {
        const flexSettings = JSON.stringify({ layer: 'CUSTOMER_BASE', scenario: 'FE_FROM_SCRATCH' });
        bootstrapEl.dataset.openUxPreviewFlexSettings = flexSettings;
        await execute();
        expect(attachRtaListenerMock).toHaveBeenCalledTimes(1);
        expect(attachRtaListenerMock).toHaveBeenCalledWith(
            sap.ushell.Container,
            flexSettings,
            expect.any(Object)
        );
    });

    test('execute() calls customInit module when dataset is set', async () => {
        bootstrapEl.dataset.openUxPreviewCustomInit = 'my/custom/init';
        await execute();
        expect(sapMock.ui.require).toHaveBeenCalledWith(['my/custom/init']);
    });
});
