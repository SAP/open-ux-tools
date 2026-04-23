import nock from 'nock';

// Clean up nock state before each test file
beforeAll(() => {
    nock.cleanAll();
    nock.restore();
    nock.activate();
});

// Ensure proper cleanup after each test file
afterAll(() => {
    nock.abortPendingRequests();
    nock.cleanAll();
    nock.restore();
});
