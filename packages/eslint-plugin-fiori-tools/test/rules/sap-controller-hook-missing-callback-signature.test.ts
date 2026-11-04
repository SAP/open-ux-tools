import rule from '../../src/rules/sap-controller-hook-missing-callback-signature.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const MSG = 'Controller hook documentation does not contain callback signature' as const;

ruleTester.run('sap-controller-hook-missing-callback-signature', rule, {
    valid: [
        `
        /**
         * @ControllerHook Short Text here
         * Description on Extension Point usage here.
         *
         * @callback sap.ca.scfld.md.controller.BaseDetailController~onDataReceived
         * @param {sap.ui.model.json.JSONModel} model ...
         * @return {void}  ...
         */
        `
    ],
    invalid: [
        {
            code: `
                /**
                 * @ControllerHook Short Text here
                 * Description on Extension Point usage here.
                 *
                 * @param {sap.ui.model.json.JSONModel} model ...
                 * @return {void}  ...
                 */
            `,
            errors: [
                {
                    message: MSG,
                    type: 'Block'
                }
            ]
        }
    ]
});
