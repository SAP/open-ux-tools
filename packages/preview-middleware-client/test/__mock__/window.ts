document.getElementById = jest.fn();
export const documentMock = document as unknown as  typeof document & {
    getElementById: jest.Mock
};

export const fetchMock = jest.fn();
export const sapCoreMock = {
    byId: jest.fn(),
    getComponent: jest.fn(),
    getConfiguration: () => ({
        getLanguage: jest.fn()
    })
};
export const sapMock = {
    ui: {
        getCore: jest.fn().mockReturnValue(sapCoreMock),
        require: jest.fn(),
        loader: {
            config: jest.fn()
        }
    },
    ushell: {
        Container: {
            createRenderer: jest.fn().mockReturnValue({ placeAt: jest.fn() }),
            attachRendererCreatedEvent: jest.fn(),
            getServiceAsync: jest.fn()
        }
    }
};

(sapMock.ui.require as any).toUrl = jest.fn();

window.fetch = fetchMock;
window.sap = sapMock as unknown as typeof sap & typeof sapMock;
