/**
 * @fileoverview Rule to ensure the correct usage ot the auto refresh interval options for sap.ushell.ui.footerbar.AddBookmarkButton.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-bookmark-performance';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester: RuleTester = new RuleTester();
ruleTester.run('sap-bookmark-performance', rule, {
    valid: [
        'myObj.setAppData({});',
        'myObj.setServiceRefreshInterval();',
        'myObj.setServiceRefreshInterval(5000);',
        "oAddToHome.setAppData({ title: 'My Bookmark', serviceUrl: '/any/service/$count', serviceRefreshInterval: 300, customUrl: 'http://www.sap.com'});"
    ],
    invalid: [
        {
            code: "oAddToHome.setAppData({ title: 'My Bookmark', serviceUrl: '/any/service/$count', serviceRefreshInterval: 1, customUrl: 'http://www.sap.com'});",
            errors: [
                {
                    message:
                        'A value of more than 0 and less than 300 for the property serviceRefreshIntervall may result in performance limitations.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: 'oAddToHome.setServiceRefreshInterval(299);',
            errors: [
                {
                    message:
                        'A value of more than 0 and less than 300 for the property serviceRefreshIntervall may result in performance limitations.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
