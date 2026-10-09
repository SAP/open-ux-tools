import rule from '../../src/rules/sap-no-console-log.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const errorMessage = 'Use Log from sap/base/Log (Log.info, Log.debug, Log.error) instead of console.log' as const;

ruleTester.run('sap-no-console-log', rule, {
    valid: ['Log.info("test");', 'Log.debug("test");', 'Log.error("test");', 'myObj.log("test");'],
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
