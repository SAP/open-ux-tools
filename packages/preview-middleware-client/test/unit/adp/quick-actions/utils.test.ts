import { translateText } from '../../../../src/adp/quick-actions/utils';
import * as i18n from '../../../../src/i18n';

jest.mock('../../../../src/i18n', () => ({
    getTextBundle: jest.fn(),
}));

describe('translateText', () => {
    it('should return the translated text from the bundle', async () => {
        // Mocked data
        const mockText = 'Hello';
        const mockTranslatedText = 'Hallo';
        const mockBundle = {
            getText: jest.fn().mockReturnValue(mockTranslatedText),
        };

        // Mock the i18n.getTextBundle function to resolve with the mocked bundle
        (i18n.getTextBundle as jest.Mock).mockResolvedValue(mockBundle);

        // Act
        const result = await translateText(mockText);

        // Assert
        expect(i18n.getTextBundle).toHaveBeenCalled();
        expect(mockBundle.getText).toHaveBeenCalledWith(mockText);
        expect(result).toBe(mockTranslatedText);
    });

    it('should throw an error if getTextBundle fails', async () => {
        // Mock getTextBundle to reject
        (i18n.getTextBundle as jest.Mock).mockRejectedValue(new Error('Failed to load text bundle'));

        // Act & Assert
        await expect(translateText('Hello')).rejects.toThrow('Failed to load text bundle');
    });
});
