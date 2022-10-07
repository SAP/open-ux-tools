import { ParseOptions } from 'commander';
import { join } from 'path';
import nock from 'nock';
import { createCommand, run } from '../../../src/cli';

describe('cli', () => {
    const fixture = join(__dirname, '../../test-input/');

    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe('run', () => {
        test('successful run', async () => {
            const target = 'https://target.example';
            const post = nock(target)
                .post((url) => url.startsWith('/sap/opu/odata/UI5/ABAP_REPOSITORY_SRV'))
                .reply(200);

            process.argv = [
                'node',
                'test',
                '-c',
                join(fixture, 'ui5-deploy.yaml'),
                '--archive-folder',
                'webapp',
                '--test',
                '--yes',
                '--url',
                target
            ];
            await run();
            expect(post.isDone()).toBe(true);
        });
    });

    describe('createCommand', () => {
        const cmd = createCommand();
        const errorMock = jest.spyOn(cmd, 'error').mockImplementation();
        // parse options for testing
        const opts: ParseOptions = { from: 'user' };

        afterEach(() => {
            errorMock.mockClear();
        });

        test('missing mandatory parameter --config', () => {
            process.argv = ['node', 'test'];
            cmd.parse([], opts);
            expect(errorMock).toBeCalled();
            expect(errorMock.mock.calls[0][1]).toBeDefined();
        });

        test('minimum parameters', () => {
            const config = join(fixture, 'ui5-deploy.yaml');
            cmd.parse(['-c', config], opts);
            expect(errorMock).not.toBeCalled();
            expect(cmd.opts().config).toBe(config);
        });

        test.each([
            { params: ['--url', '~url', '--destination', '~dest'] },
            { params: ['--client', '001', '--destination', '~dest'] },
            { params: ['--scp', '--destination', '~dest'] }
        ])('conflicting options $params', ({ params }) => {
            cmd.parse(params, opts);
            expect(errorMock).toBeCalled();
            errorMock.mockClear();
        });
    });
});
