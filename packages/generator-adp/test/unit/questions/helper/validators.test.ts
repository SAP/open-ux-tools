import { resolveNodeModuleGenerator } from '../../../../src/app/extension-project';
import { validateExtensibilityGenerator } from '../../../../src/app/questions/helper/validators';
import { t } from '../../../../src/utils/i18n';

jest.mock('../../../../src/app/extension-project', () => ({
    resolveNodeModuleGenerator: jest.fn()
}));

const resolveNodeModuleGeneratorMock = resolveNodeModuleGenerator as jest.Mock;

describe('validateExtensibilityGenerator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when user accepts and generator is found', () => {
        resolveNodeModuleGeneratorMock.mockReturnValue('/some/path/to/generator');

        const result = validateExtensibilityGenerator(true, true, true);

        expect(resolveNodeModuleGeneratorMock).toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it('should return error message when user accepts but generator is not found', () => {
        resolveNodeModuleGeneratorMock.mockReturnValue(undefined);

        const result = validateExtensibilityGenerator(true, true, true);

        expect(resolveNodeModuleGeneratorMock).toHaveBeenCalled();
        expect(result).toBe(t('error.extensibilityGenNotFound'));
    });

    it('should return true when user declines and app is supported and has sync views', () => {
        const result = validateExtensibilityGenerator(false, true, true);
        expect(result).toBe(true);
    });

    it('should return prompt label when user declines and app is unsupported', () => {
        const result = validateExtensibilityGenerator(false, false, true);

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });

    it('should return prompt label when user declines and no sync views exist', () => {
        const result = validateExtensibilityGenerator(false, true, false);

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });

    it('should return prompt label when user declines and both app unsupported and no sync views', () => {
        const result = validateExtensibilityGenerator(false, false, false);

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });
});
