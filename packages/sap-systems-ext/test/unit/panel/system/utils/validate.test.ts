import { validateSystemInfo, validateSystemName, validateSystemUrl } from '../../../../../src/panel/system/utils';
import { initI18n } from '../../../../../src/utils';
import { SystemPanelViewType } from '../../../../../src/utils/constants';

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
                validateSystemInfo({
                    url: 'https://valid-url.com',
                    name: 'Valid System',
                    systemType: 'OnPrem',
                    connectionType: 'abap_catalog'
                })
            ).toBe(true);
        });

        it('should throw an error for missing URL', () => {
            expect(
                validateSystemInfo({
                    url: '',
                    name: 'No URL System',
                    systemType: 'OnPrem',
                    connectionType: 'abap_catalog'
                })
            ).toBe('Please provide a valid URL to test the connection.');
        });
    });

    describe('validateSystemName', () => {
        it('should return true for a valid system name', async () => {
            systemServiceGetAllMock.mockResolvedValue([
                { name: 'Existing System 1', url: 'https://existing.com', systemType: 'OnPrem' }
            ]);
            expect(await validateSystemName('New System 1 ', 'New System')).toBe(true);
        });

        it('should return error message when creating a new system and the same name already exists in the store', async () => {
            systemServiceGetAllMock.mockResolvedValue([
                { name: 'Existing System 1', url: 'https://existing.com', systemType: 'OnPrem' }
            ]);

            await expect(
                validateSystemName('Existing System 1 ', 'New System', SystemPanelViewType.Create)
            ).rejects.toBe('This connection name already exists. Choose a different name.');
        });

        it('should return error message when importing a new system and the same name already exists in the store', async () => {
            systemServiceGetAllMock.mockResolvedValue([
                { name: 'Existing System 1', url: 'https://existing.com', systemType: 'OnPrem' }
            ]);

            await expect(
                validateSystemName('Existing System 1 ', 'New System', SystemPanelViewType.Import)
            ).rejects.toBe('This connection name already exists. Choose a different name.');
        });

        it('should return error message when editing an existing system and the new name matches another system in the store', async () => {
            systemServiceGetAllMock.mockResolvedValue([
                { name: 'Existing System 1', url: 'https://existing.com', systemType: 'OnPrem' },
                { name: 'Existing System 2', url: 'https://existing2.com', systemType: 'OnPrem' }
            ]);

            await expect(
                validateSystemName('Existing System 2 ', 'Existing System 1', SystemPanelViewType.View)
            ).rejects.toBe('This connection name already exists. Choose a different name.');
        });
    });

    describe('validateSystemUrl', () => {
        it('should return true for valid URL with port', () => {
            expect(validateSystemUrl('https://example.com:8080')).toBe(true);
        });

        it('should return true for valid URL with path', () => {
            expect(validateSystemUrl('https://example.com/path/to/resource')).toBe(true);
        });

        it('should throw an error for invalid URL without protocol', () => {
            expect(() => validateSystemUrl('example.com')).toThrow("The URL 'example.com' provided is invalid");
        });

        it('should throw an error for invalid URL without protocol', () => {
            expect(() => validateSystemUrl('q!@#$%^')).toThrow("The URL 'q!@#$%^' provided is invalid");
        });
    });
});
