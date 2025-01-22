const createMockXHR = require('../../src/env/mockXHR');
describe('Mock XHR', () => {
    let mockXHR;
    let XHR;
    const openMock = jest.fn();
    const sendMock = jest.fn();
    let callback;
    const addEventMock = jest.fn().mockImplementation((event, outCallback) => {
        callback = outCallback;
    });
    const setRequestHeaderMock = jest.fn();
    const getResponseHeaderMock = jest.fn();
    const getAllResponseHeadersMock = jest.fn();

    beforeEach(() => {
        const pathMappingFn = jest.fn();
        const fakeWindow = jest.fn();
        const shimmedFilePath = {};

        const mockData = { 'mockedPath.xml': 'mockedData' };
        XHR = jest.fn().mockImplementation(() => {
            return {
                open: openMock,
                send: sendMock,
                addEventListener: addEventMock,
                setRequestHeader: setRequestHeaderMock,
                getResponseHeader: getResponseHeaderMock,
                getAllResponseHeaders: getAllResponseHeadersMock
            };
        });
        mockXHR = createMockXHR(fakeWindow, pathMappingFn, shimmedFilePath, mockData, XHR);
    });

    it('Can be used to query mockedData', (done) => {
        mockXHR.open('GET', 'mockedPath.xml');
        mockXHR.addEventListener('load', () => {
            expect(mockXHR.responseText).toBe('mockedData');
            done();
        });
        expect( mockXHR.getResponseHeader('Content-Type')).toBe("application/xml");
        mockXHR.send();
    });
    it('Can be used to query data from the backend', (done) => {
        mockXHR.onload = jest.fn();
        mockXHR.open('PUT', 'http://localhost:8080/xxxc');
        expect(openMock).toHaveBeenCalledWith('PUT', 'http://localhost:8080/xxxc');
        mockXHR.setRequestHeader('Content-Type', 'application/json');
        expect(setRequestHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/json');

        mockXHR.send('Hello');
        expect(sendMock).toHaveBeenCalledWith('Hello');
        expect(addEventMock).toHaveBeenCalled();
        expect(callback).toBeDefined();
        callback();
        mockXHR.getResponseHeader('Content-Type');
        expect(getResponseHeaderMock).toHaveBeenCalledWith('Content-Type');
        mockXHR.getAllResponseHeaders();
        expect(getAllResponseHeadersMock).toHaveBeenCalled();
        mockXHR.onload();
        expect(mockXHR.onload).toHaveBeenCalled();
        done();
    });
});
