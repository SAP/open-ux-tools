document.getElementById = jest.fn();
export const documentMock = document as unknown as typeof document & {
    getElementById: jest.Mock;
    querySelector: jest.Mock;
};

export const fetchMock = jest.fn();
export const openMock = jest.fn();
export const sapCoreMock = {
    byId: jest.fn(),
    getComponent: jest.fn(),
    getConfiguration: () => ({
        getLanguage: jest.fn()
    })
};
export const sapMock = {
    ui: {
        version: '',
        getCore: jest.fn().mockReturnValue(sapCoreMock),
        require: jest.fn(),
        define: jest.fn(),
        loader: {
            config: jest.fn()
        }
    },
    ushell: {
        Container: {
            createRenderer: jest.fn().mockReturnValue({ placeAt: jest.fn() }),
            createRendererInternal: jest.fn().mockReturnValue({ placeAt: jest.fn() }),
            attachRendererCreatedEvent: jest.fn(),
            getServiceAsync: jest.fn()
        }
    }
};

export const jQueryMock = {
    extend: jest.fn()
};

(sapMock.ui.require as any).toUrl = jest.fn();

window.fetch = fetchMock;
window.open = openMock;
window.sap = sapMock as unknown as typeof sap & typeof sapMock;
window.jQuery = jQueryMock;
