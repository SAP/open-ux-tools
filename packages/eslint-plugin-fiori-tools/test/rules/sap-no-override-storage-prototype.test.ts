/**
 * @fileoverview detects override of storage prototype
 */
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-no-override-storage-prototype';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-no-override-storage-prototype', rule, {
    valid: [
        'storage.prototype.setObj = function(key, obj) {};',
        'var abc = 5;abc.setObj = function(key, obj) {};',
        'getTest().result = function(){};',
        'var abd = abc[i];'
    ],
    invalid: [
        {
            code: 'Storage.prototype.setObj = function(key, obj) {};',
            errors: [
                {
                    message: 'Storage prototype should not be overridden as this can lead to unpredictable errors',
                    type: 'AssignmentExpression'
                }
            ]
        },
        {
            code: 'var str1 = Storage.prototype, str2 = Storage.prototype; str2.setObj = function(key, obj) {};',
            errors: [
                {
                    message: 'Storage prototype should not be overridden as this can lead to unpredictable errors',
                    type: 'AssignmentExpression'
                }
            ]
        }
    ]
});
