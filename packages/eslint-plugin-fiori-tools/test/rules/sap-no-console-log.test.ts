import rule from '../../src/rules/sap-no-console-log.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const errorMessage =
    'Console.log is not supported in all browsers and as such use jQuery.sap.log.info, jQuery.sap.log.debug or jQuery.sap.log.error instead' as const;

ruleTester.run('sap-no-console-log', rule, {
    valid: [
        'jQuery.sap.log.info("test");',
        'jQuery.sap.log.debug("test");',
        'jQuery.sap.log.error("test");',
        'myObj.log("test");'
    ],
    invalid: [
        {
            code: 'console.log("test");',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'console.warn("test");',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'console.info("test");',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'console.error("test");',
            errors: [{ message: errorMessage }]
        },
        {
            code: 'var log = console.log;',
            errors: [{ message: errorMessage }]
        }
    ]
});
