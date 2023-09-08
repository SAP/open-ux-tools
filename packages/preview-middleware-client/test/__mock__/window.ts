export const fetchMock = jest.fn();
export const sapCoreMock = {
    byId: jest.fn()
};
export const sapMock = {
    ui: {
        getCore: jest.fn().mockReturnValue(sapCoreMock)
    }
};

window.fetch = fetchMock;
window.sap = sapMock as unknown as typeof sap;
