import rule from '../../src/rules/sap-not-localized.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const errorMessage = 'All strings should be localized and defined in an external file for translation' as const;

ruleTester.run('sap-not-localized', rule, {
    valid: [
        "obj.setText('');",
        'obj.setText(bundle.getText("KEY"));',
        'obj.setText(myVar);',
        "obj.setLabel('hardcoded');",
        "obj.someOtherMethod('hardcoded');"
    ],
    invalid: [
        {
            code: "obj.setText('Hello World');",
            errors: [{ message: errorMessage }]
        },
        {
            code: "obj.setHeaderText('Header Text');",
            errors: [{ message: errorMessage }]
        },
        {
            code: "obj.setPurpose('Purpose');",
            errors: [{ message: errorMessage }]
        }
    ]
});
