export const oDataMetadataLoadedSpy = jest.fn();
export const oDataDestroySpy = jest.fn();

export default jest.fn().mockImplementation(() => ({
    metadataLoaded: oDataMetadataLoadedSpy,
    destroy: oDataDestroySpy
}));
