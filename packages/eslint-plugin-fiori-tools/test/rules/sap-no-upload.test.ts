import rule from '../../src/rules/sap-no-upload.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const errorMessage =
    'Dynamically constructed upload control. Uploaded files shall be sent to VSI 2.0 before stored on DB.' as const;

ruleTester.run('sap-no-upload', rule, {
    valid: ['new sap.m.Input();', 'sap.m.Input();', 'new sap.ca.ui.FileUploadOther();'],
    invalid: [
        {
            code: 'new sap.ca.ui.FileUpload();',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'new sap.ca.ui.AddPicture();',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'sap.ca.ui.FileUpload();',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'sap.ca.ui.AddPicture();',
            errors: [{ message: errorMessage }]
        }
    ]
});
