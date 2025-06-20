import { initI18n, t } from '../../../../src/utils/i18n';
import { getProjectNameTooltip } from '../../../../src/app/questions/helper/tooltip';

describe('tooltip', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('getProjectNameTooltip', () => {
        it('should return correct message when isCustomerBase is false', () => {
            const result = getProjectNameTooltip(false);

            expect(result).toEqual(
                `${t('prompts.projectNameLengthErrorInt')} ${t('prompts.projectNameValidationErrorInt')}`
            );
        });

        it('should return correct message when isCustomerBase is true', () => {
            const result = getProjectNameTooltip(true);

            expect(result).toEqual(
                `${t('prompts.projectNameLengthErrorExt')} ${t('prompts.projectNameValidationErrorExt')}`
            );
        });
    });
});
