/**
 * @fileoverview Detect some warning for usages of (window.)document APIs
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-history-manipulation';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
const errorMessage =
    'Direct history manipulation, does not work with deep links, use router and navigation events instead' as const;
ruleTester.run('sap-no-history-manipulation', rule, {
    valid: [
        'if(true) history.go(-1);',
        'if(true){}else{history.go(-1);}',
        'if(true){history.back();}',
        "(true?history.go(-1):'');",
        "(true?history.fly(-1):'');", // increase code coverage
        'if (sPreviousHash !== undefined || !oCrossAppNavigator) {history.go(-1);}',
        // false negatives
        'var m = window.history.go; m(-2);',
        'function myHiddenGo(go, delta){go(delta);} myHiddenGo(history.go, -5);',
        'history.uninterestingMethod();'
    ],
    invalid: [
        // xxxxxxxxxxxxxxxxxxxx History xxxxxxxxxxxxxxxxxxxx
        {
            code: 'history.go();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'history.back();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'history.forward();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'window.history.forward();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        // xxxxxxxxxx History-Objects xxxxxxxxxx
        {
            code: 'var h = history; h.back();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var w = window; w.history.back();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var h = window.history; h.back();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var w = window; var c = w; c.history.back();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'var x; x = window.history; x.back();',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        // xxxxxxxxxx Conditions xxxxxxxxxx
        {
            code: 'history.go(-1);',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'if(true) history.go(-2);',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'if(true){history.go(-2);}',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'if(true){}else{history.go(-2);}',
            errors: [
                {
                    message: errorMessage,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
