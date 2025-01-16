import {
    ApiEndpoints,
    RequestMethod,
    getDataSourceAnnotationFileMap,
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
            fetchMock.mockResolvedValue({
                json: jsonSpy,
                text: jest.fn(),
                ok: true
            });

            await request(ApiEndpoints.FRAGMENT, RequestMethod.GET);
            expect(jsonSpy.mock.calls.length).toBe(1);
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
            fetchMock.mockResolvedValue({
                json: jest.fn(),
                text: textSpy,
                ok: true
            });

            await request(ApiEndpoints.FRAGMENT, RequestMethod.POST);
            expect(textSpy.mock.calls.length).toBe(1);
        });

        test('DELETE - parses the response', async () => {
            const jsonSpy = jest.fn();
            fetchMock.mockResolvedValue({
                json: jsonSpy,
                text: jest.fn(),
                ok: true
            });

            await request(ApiEndpoints.FRAGMENT, RequestMethod.DELETE);
            expect(jsonSpy.mock.calls.length).toBe(1);
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

            const data = await getFragments();

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

            const data = await getManifestAppdescr();

            expect(data.layer).toBe('VENDOR');
        });
    });

    describe('getDataSourceAnnotationFileMap', () => {
        afterEach(() => {
            fetchMock.mockRestore();
        });

        test('request is called and correct data is returned', async () => {
            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue(
                    JSON.stringify({
                        mainService: {
                            serviceUrl: 'main/service/url',
                            annotationDetails: {
                                annotationExistsInWS: false,
                                annotationPath: 'c/drive/main/service/url',
                                annotationPathFromRoot: '/main/service/url',
                                isRunningInBAS: false
                            }
                        }
                    })
                ),
                ok: true
            });

            const data = await getDataSourceAnnotationFileMap();

            expect(data).toEqual(
                JSON.stringify({
                    mainService: {
                        serviceUrl: 'main/service/url',
                        annotationDetails: {
                            annotationExistsInWS: false,
                            annotationPath: 'c/drive/main/service/url',
                            annotationPathFromRoot: '/main/service/url',
                            isRunningInBAS: false
                        }
                    }
                })
            );
        });
    });
});
