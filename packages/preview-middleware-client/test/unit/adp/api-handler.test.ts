import {
    ApiEndpoints,
    RequestMethod,
    getFragments,
    getManifestAppdescr,
    request,
    writeFragment
} from '../../../src/adp/api-handler';
import { fetchMock } from 'mock/window';

describe('API Handler', () => {
    describe('request', () => {
        afterEach(() => {
            fetchMock.mockRestore();
        });

        test('GET - parses the response', async () => {
            const jsonSpy = jest.fn();
            try {
                fetchMock.mockResolvedValue({
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
                fetchMock.mockResolvedValue({
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
                fetchMock.mockResolvedValue({
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
                fetchMock.mockResolvedValue({
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
            fetchMock.mockRestore();
        });

        test('request is called and correct data is returned', async () => {
            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    fragments: [{ fragmentName: 'Share.fragment.xml' }],
                    message: '1 fragment found in the project workspace.'
                }),
                ok: true
            });

            const data = await getFragments<{ fragments: [] }>();

            expect(data.fragments.length).toBe(1);
        });
    });

    describe('writeFragment', () => {
        afterEach(() => {
            fetchMock.mockRestore();
        });

        test('request is called and message is recieved from the backend', async () => {
            fetchMock.mockResolvedValue({
                text: jest.fn().mockReturnValue('Message from backend'),
                ok: true
            });

            const data = await writeFragment<unknown>({ fragmentName: 'Share' });

            expect(data).toBe('Message from backend');
        });
    });

    describe('getManifestAppdescr', () => {
        afterEach(() => {
            fetchMock.mockRestore();
        });

        test('request is called and correct data is returned', async () => {
            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({ layer: 'VENDOR' }),
                ok: true
            });

            const data = await getManifestAppdescr<{ layer: string }>();

            expect(data.layer).toBe('VENDOR');
        });
    });
});
