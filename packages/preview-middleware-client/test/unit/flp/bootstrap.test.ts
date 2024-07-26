import { documentMock } from 'mock/window';
import { ushellBootstrap } from '../../../src/flp/bootstrap';

describe('flp/ushellBootstrap', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    function dummyCallback(): void {}

    test('ushell src when ui5 version is 1.x', async () => {
        const fetchSpy = jest
            .spyOn(global, 'fetch')
            .mockImplementation(
                jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ version: '1.126.0' }) })) as jest.Mock
            );
        const htmlElement = {
            onload: jest.fn(),
            setAttribute: jest.fn()
        };
        documentMock.getElementById.mockReturnValue(htmlElement);

        await ushellBootstrap(dummyCallback);

        expect(fetchSpy).toHaveBeenCalled();
    });
});
