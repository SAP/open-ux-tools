import { t } from '../../../../../../src/i18n';
import { getProjectNameTooltip } from '../../../../../../src';

describe('Tooltips Tests', () => {
    describe('getProjectNameTooltip', () => {
        it('returns the correct tooltip for customer base projects', () => {
            const tooltip = getProjectNameTooltip(true);

            expect(tooltip).toBe(
                t('validators.inputCannotBeEmpty') +
                    ' ' +
                    t('validators.projectNameLengthErrorExt') +
                    ' ' +
                    t('validators.projectNameValidationErrorExt')
            );
        });

        it('returns the correct tooltip for non-customer base projects', () => {
            const tooltip = getProjectNameTooltip(false);

            expect(tooltip).toBe(
                t('validators.inputCannotBeEmpty') +
                    ' ' +
                    t('validators.projectNameLengthErrorInt') +
                    ' ' +
                    t('validators.projectNameValidationErrorInt')
            );
        });
    });
});
