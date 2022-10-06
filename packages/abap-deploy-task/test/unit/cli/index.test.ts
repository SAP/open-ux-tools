import { ParseOptions } from 'commander';
import { join } from 'path';
import nock from 'nock';
import { program, run } from '../../../src/cli';

describe('cli', () => {
    const errorMock = jest.spyOn(program, 'error').mockImplementation();
    const fixture = join(__dirname, '../../test-input/');

    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    afterEach(() => {
        errorMock.mockClear();
    });

    describe('run', () => {
        test('successful run', async () => {
            const target = 'https://target.example';
            nock(target)
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
            expect(errorMock).not.toBeCalled();
        });

        test('error occured', async () => {
            process.argv = ['node', 'test'];
            await run();
            expect(errorMock).toBeCalled();
        });
    });

    describe('program', () => {
        // parse options for testing
        const opts: ParseOptions = { from: 'user' };

        test('missing mandatory parameter --config', () => {
            program.parse([], opts);
            expect(errorMock).toBeCalled();
            expect(errorMock.mock.calls[0][1]).toBeDefined();
        });

        test('minimum parameters', () => {
            const config = join(fixture, 'ui5-deploy.yaml');
            const cmd = program.parse(['-c', config], opts);
            expect(errorMock).not.toBeCalled();
            expect(cmd.opts().config).toBe(config);
        });

        test.each([
            { params: ['--url', '~url', '--destination', '~dest'] },
            { params: ['--client', '001', '--destination', '~dest'] },
            { params: ['--scp', '--destination', '~dest'] }
        ])('conflicting options $params', ({ params }) => {
            program.parse(params, opts);
            expect(errorMock).toBeCalled();
            errorMock.mockClear();
        });
    });
});
