import {
    ApiEndpoints,
    RequestMethod,
    getFragments,
    getManifestAppdescr,
    request,
    writeFragment
} from '../../src/adp/api-handler';
import type { ManifestAppdescr } from '../../../adp-tooling/src/types';
import type { FragmentsResponse } from '../../../../src/preview/client/api-handler';

describe('API Handler', () => {
    const globalAny: any = global;

    describe('request', () => {
        afterEach(() => {
            globalAny.fetch.mockRestore();
        });

        test('GET - parses the response', async () => {
            const jsonSpy = jest.fn();
            try {
                globalAny.fetch = jest.fn().mockResolvedValue({
                    json: jsonSpy,
                    text: jest.fn(),
                    ok: true
                });

                await request(ApiEndpoints.FRAGMENT, RequestMethod.GET);
                expect(jsonSpy.mock.calls.length).toBe(1);
            } catch (e) {
                fail('Test should not have failed!');
            }
        });

        test('GET - throws error when is not ok', async () => {
            const status = 500;
            const jsonSpy = jest.fn();
            try {
                globalAny.fetch = jest.fn().mockResolvedValue({
                    json: jsonSpy,
                    text: jest.fn(),
                    ok: false,
                    status
                });

                await request(ApiEndpoints.FRAGMENT, RequestMethod.GET);
                fail('Expected test to throw error!');
            } catch (e) {
                expect(e.message).toBe(`Request failed, status: ${status}.`);
            }
        });

        test('POST - gets the text from the response', async () => {
            const textSpy = jest.fn();
            try {
                globalAny.fetch = jest.fn().mockResolvedValue({
                    json: jest.fn(),
                    text: textSpy,
                    ok: true
                });

                await request(ApiEndpoints.FRAGMENT, RequestMethod.POST);
                expect(textSpy.mock.calls.length).toBe(1);
            } catch (e) {
                fail('Test should not have failed!');
            }
        });

        test('DELETE - parses the response', async () => {
            const jsonSpy = jest.fn();
            try {
                globalAny.fetch = jest.fn().mockResolvedValue({
                    json: jsonSpy,
                    text: jest.fn(),
                    ok: true
                });

                await request(ApiEndpoints.FRAGMENT, RequestMethod.DELETE);
                expect(jsonSpy.mock.calls.length).toBe(1);
            } catch (e) {
                fail('Test should not have failed!');
            }
        });
    });

    describe('getFragments', () => {
        afterEach(() => {
            globalAny.fetch.mockRestore();
        });

        test('request is called and correct data is returned', async () => {
            globalAny.fetch = jest.fn().mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    fragments: [{ fragmentName: 'Share.fragment.xml' }],
                    message: '1 fragment found in the project workspace.'
                }),
                ok: true
            });

            const data = await getFragments<FragmentsResponse>();

            expect(data.fragments.length).toBe(1);
        });
    });

    describe('writeFragment', () => {
        afterEach(() => {
            globalAny.fetch.mockRestore();
        });

        test('request is called and message is recieved from the backend', async () => {
            globalAny.fetch = jest.fn().mockResolvedValue({
                text: jest.fn().mockReturnValue('Message from backend'),
                ok: true
            });

            const data = await writeFragment<unknown>({ fragmentName: 'Share' });

            expect(data).toBe('Message from backend');
        });
    });

    describe('getManifestAppdescr', () => {
        afterEach(() => {
            globalAny.fetch.mockRestore();
        });

        test('request is called and correct data is returned', async () => {
            globalAny.fetch = jest.fn().mockResolvedValue({
                json: jest.fn().mockReturnValue({ layer: 'VENDOR' }),
                ok: true
            });

            const data = await getManifestAppdescr<ManifestAppdescr>();

            expect(data.layer).toBe('VENDOR');
        });
    });
});
