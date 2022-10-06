import { ParseOptions } from 'commander';
import { join } from 'path';
import { program } from '../../../src/cli';

describe('cli', () => {
    const errorMock = jest.spyOn(program, 'error').mockImplementation();
    const fixture = join(__dirname, '../../test-input/');

    beforeEach(() => {
        errorMock.mockClear();
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
            program.parse(['-c', join(fixture, 'ui5-deploy.yaml')], opts);
            expect(errorMock).not.toBeCalled();
        });

        test.each([
            { params: ['--url', '~url', '--destination', '~dest'] },
            { params: ['--url', '~url', '--destination', '~dest'] },
            { params: ['--url', '~url', '--destination', '~dest'] },
            { params: ['--client', '001', '--destination', '~dest'] },
            { params: ['--scp', '--destination', '~dest'] }
        ])('conflicting options $params', ({ params }) => {
            program.parse(params, opts);
            expect(errorMock).toBeCalled();
        });
    });

    describe('run', () => {
        test('successful run', () => {});

        test('error occured', () => {});
    });
});
