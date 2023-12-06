import * as devServer from 'jest-dev-server';
import { startServer, teardownServer } from '../../../src';

jest.mock('jest-dev-server');
const devServerMock = jest.mocked(devServer, { shallow: true });
test('startServer', async () => {
    const setupMocked = jest.spyOn(devServerMock, 'setup').mockReturnValue('setup-called');
    const result = await startServer({ command: 'npm i' });
    expect(result).toStrictEqual('setup-called');
    expect(setupMocked.mock.calls).toHaveLength(1);
});
test('teardownServer', async () => {
    const teardownMocked = jest.spyOn(devServerMock, 'teardown').mockReturnValue(null);
    await teardownServer();
    expect(teardownMocked.mock.calls).toHaveLength(1);
});
