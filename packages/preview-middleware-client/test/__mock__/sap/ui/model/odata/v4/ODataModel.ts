export const oDataRequestObjectSpy = jest.fn();
export const oDataDestroySpy = jest.fn();

export default jest.fn().mockImplementation(() => ({
    getMetaModel: jest.fn(() => ({
        requestObject: oDataRequestObjectSpy
    })),
    destroy: oDataDestroySpy
}));
