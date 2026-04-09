import { jest } from '@jest/globals';

const mockSetup = jest.fn();
const mockTeardown = jest.fn();

jest.unstable_mockModule('jest-dev-server', () => ({
    setup: mockSetup,
    teardown: mockTeardown
}));

const { startServer, teardownServer } = await import('../../../src/server/index.js');

test('startServer', async () => {
    mockSetup.mockReturnValue('setup-called');
    const result = await startServer({ command: 'npm i' });
    expect(result).toStrictEqual('setup-called');
    expect(mockSetup.mock.calls).toHaveLength(1);
});
test('teardownServer', async () => {
    mockTeardown.mockReturnValue(null);
    await teardownServer();
    expect(mockTeardown.mock.calls).toHaveLength(1);
});
