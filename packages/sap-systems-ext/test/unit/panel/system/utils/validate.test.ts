import { validateSystemInfo, validateSystemName } from '../../../../../src/panel/system/utils';
import { initI18n } from '../../../../../src/utils';

const systemServiceGetAllMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        getAll: systemServiceGetAllMock
    }))
}));

describe('Test the panel action utils', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateSystemInfo', () => {
        it('should return true for valid system info', () => {
            expect(
                validateSystemInfo({ url: 'https://valid-url.com', name: 'Valid System', systemType: 'OnPrem' })
            ).toBe(true);
        });

        it('should throw an error for missing URL', () => {
            expect(validateSystemInfo({ url: '', name: 'No URL System', systemType: 'OnPrem' })).toBe(
                'Please provide a valid URL to test the connection.'
            );
        });
    });

    describe('validateSystemName', () => {
        it('should return true for a valid system name', async () => {
            systemServiceGetAllMock.mockResolvedValue([
                { name: 'Existing System 1', url: 'https://existing.com', systemType: 'OnPrem' }
            ]);
            expect(await validateSystemName('New System 1 ', 'New System')).toBe(true);
        });

        it('should return error message when the system already exists in the store', async () => {
            systemServiceGetAllMock.mockResolvedValue([
                { name: 'Existing System 1', url: 'https://existing.com', systemType: 'OnPrem' }
            ]);

            await expect(validateSystemName('Existing System 1 ', 'New System')).rejects.toBe(
                'System name is already in use'
            );
        });
    });
});
