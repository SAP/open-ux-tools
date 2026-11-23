import rule from '../../src/rules/sap-no-core-model-usage.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

ruleTester.run('sap-no-core-model', rule, {
    valid: [
        "myObj.model.getProperty('/path');",
        'sap.ui.getCore().getConfiguration();',
        'sap.ui.getCore().attachInit(function() {});'
    ],
    invalid: [
        {
            code: "sap.ui.getCore().getModel('myModel');",
            errors: [
                {
                    message: 'Avoid using `getModel()` on `sap.ui.getCore()`. Consider using component model instead.'
                }
            ]
        },
        {
            code: "sap.ui.getCore().setModel(oModel, 'myModel');",
            errors: [
                {
                    message: 'Avoid using `setModel()` on `sap.ui.getCore()`. Consider using component model instead.'
                }
            ]
        }
    ]
});
