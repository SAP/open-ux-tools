import { validateUI5Version } from '../src/data/validators';
import { t } from '../src/i18n';

describe('Validators', () => {
    // Tests validation of ui5 version strings
    test('UI5 version', () => {
        expect(validateUI5Version('1')).toEqual(true);
        expect(validateUI5Version('1.0')).toEqual(true);
        expect(validateUI5Version('1.0.0')).toEqual(true);
        expect(validateUI5Version('snapshot-1.0.0')).toEqual(true);
        // No parseable version
        expect(() => validateUI5Version('snapshot-a.b.c')).toThrowError(
            t('error.invalidUI5Version', { version: 'snapshot-a.b.c' })
        );
    });
});
