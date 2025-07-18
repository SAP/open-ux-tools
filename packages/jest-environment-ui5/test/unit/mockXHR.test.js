const createMockXHR = require('../../src/env/mockXHR');
describe('Mock XHR', () => {
    let mockXHR;
    let XHR;
    const openMock = jest.fn();
    const sendMock = jest.fn();
    let callback;
    let addEventMock;
    const setRequestHeaderMock = jest.fn();
    const getResponseHeaderMock = jest.fn();
    const getAllResponseHeadersMock = jest.fn();
    let currentRealXHR;
    beforeEach(() => {
        const pathMappingFn = jest.fn();
        const fakeWindow = jest.fn();
        const shimmedFilePath = {};
        addEventMock = jest.fn().mockImplementation((event, outCallback) => {
            callback = outCallback;
        });
        const mockData = { 'mockedPath.xml': 'mockedData' };
        XHR = jest.fn().mockImplementation(() => {
            currentRealXHR = {
                open: openMock,
                send: sendMock,
                addEventListener: addEventMock,
                setRequestHeader: setRequestHeaderMock,
                getResponseHeader: getResponseHeaderMock,
                getAllResponseHeaders: getAllResponseHeadersMock
            };
            return currentRealXHR;
        });
        mockXHR = createMockXHR(fakeWindow, pathMappingFn, shimmedFilePath, mockData, XHR);
    });
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('Can be used to query mockedData', (done) => {
        mockXHR.open('GET', 'mockedPath.xml');
        mockXHR.addEventListener('load', () => {
            expect(mockXHR.responseText).toBe('mockedData');
            done();
        });
        expect(mockXHR.getResponseHeader('Content-Type')).toBe('application/xml');
        mockXHR.send();
    });
    it('Can be used to query data from the backend', (done) => {
        mockXHR.onload = jest.fn();
        mockXHR.open('PUT', 'http://localhost:8080/xxxc');
        expect(openMock).toHaveBeenCalledWith('PUT', 'http://localhost:8080/xxxc');
        mockXHR.setRequestHeader('Content-Type', 'application/json');
        expect(setRequestHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/json');
        const callback2 = jest.fn();
        mockXHR.addEventListener('load', callback2);
        mockXHR.send('Hello');
        expect(sendMock).toHaveBeenCalledWith('Hello');
        expect(addEventMock).toHaveBeenCalled();
        expect(callback).toBeDefined();
        callback();
        mockXHR.getResponseHeader('Content-Type');
        expect(getResponseHeaderMock).toHaveBeenCalledWith('Content-Type');
        mockXHR.getAllResponseHeaders();
        expect(getAllResponseHeadersMock).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledTimes(1);
        mockXHR.onload();

        expect(mockXHR.onload).toHaveBeenCalledTimes(1);
        currentRealXHR.onload();
        expect(callback2).toHaveBeenCalledTimes(1);
        expect(mockXHR.onload).toHaveBeenCalledTimes(2);
        done();
    });
});
