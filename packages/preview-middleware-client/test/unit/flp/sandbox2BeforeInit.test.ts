import { fetchMock, sapMock, documentMock } from 'mock/window';
import VersionInfo from 'mock/sap/ui/VersionInfo';

jest.unstable_mockModule('open/ux/preview/client/flp/common', () => ({
    registerComponentDependencyPaths: jest.fn().mockResolvedValue(undefined)
}));

const { execute } = await import('open/ux/preview/client/flp/sandbox2BeforeInit');
const { registerComponentDependencyPaths } = await import('open/ux/preview/client/flp/common');
const registerPathsMock = registerComponentDependencyPaths as jest.Mock;

describe('flp/sandbox2BeforeInit', () => {
    let bootstrapEl: HTMLScriptElement;

    beforeEach(() => {
        bootstrapEl = document.createElement('script');
        bootstrapEl.id = 'sap-ui-bootstrap';
        documentMock.getElementById.mockReturnValue(bootstrapEl);

        VersionInfo.load.mockResolvedValue({ name: 'sap.ui.core', version: '2.0.0' });
        sapMock.ushell.Container.getServiceAsync.mockReset();
        sapMock.ui.require.mockReset();
        registerPathsMock.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => {
        documentMock.getElementById.mockReset();
        window.location.hash = '';
    });

    test('execute exports a function', () => {
        expect(typeof execute).toBe('function');
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

    test('execute() calls customInit module when dataset is set', async () => {
        bootstrapEl.dataset.openUxPreviewCustomInit = 'my/custom/init';
        await execute();
        expect(sapMock.ui.require).toHaveBeenCalledWith(['my/custom/init']);
    });
});
