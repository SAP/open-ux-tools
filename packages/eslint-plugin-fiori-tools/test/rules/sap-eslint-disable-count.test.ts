import rule from '../../src/rules/sap-eslint-disable-count.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

ruleTester.run('sap-eslint-disable-count', rule, {
    valid: [
        'var x = 1;',
        '// regular comment',
        '/* block comment */',
        '// Do not add eslint-disable here',
        '/* Please do not use eslint-disable in this file */'
    ],
    invalid: [
        {
            code: '/* eslint-disable strict */',
            errors: [{ message: 'Detected use of `eslint-disable`' }]
        },
        {
            code: 'var x = 1; // eslint-disable-line strict',
            errors: [{ message: 'Detected use of `eslint-disable`' }]
        }
    ]
});
