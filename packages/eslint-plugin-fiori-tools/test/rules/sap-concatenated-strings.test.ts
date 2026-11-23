import rule from '../../src/rules/sap-concatenated-strings.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const errorMessage =
    'Strings should not be concatenated, all concatenations must be done as a specific parameterized resource' as const;

ruleTester.run('sap-concatenated-strings', rule, {
    valid: [
        "obj.setText('ORGANIZER=Organizer: {0}');",
        "obj.setText('{i18n>GREETING}');",
        "obj.setText(bundle.getText('KEY'));",
        "obj.setLabel('First' + 'Second');",
        "obj.someOtherMethod('First' + 'Second');"
    ],
    invalid: [
        {
            code: 'obj.setText("Text " + "Hi");',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'obj.setHeaderText("Header: " + "Hi");',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'obj.setPurpose("Purpose: " + "Hi");',
            errors: [{ message: errorMessage }]
        }
    ]
});
