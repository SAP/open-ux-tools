import rule from '../../src/rules/sap-controller-hook-name-convention.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const MSG =
    "The callback function name should follow the naming convention and starts with either 'ext' (follow casing)" as const;

ruleTester.run('sap-controller-hook-name-convention', rule, {
    valid: [
        `
        sap.ui.generic.app.AppComponent.extend("ca.infra.testapp.Component", {
            metadata: {
                includes: ["css/style1.css"],
                manifest: "json",
            },
            /**
             * @ControllerHook Short Text here
             *
             * @callback sap.ca.scfld.md.controller.BaseDetailController~extHookDataReceived
             * @param {string} myparam ...
             * @return {void}  ...
             */
            onDataReceived: function (myparam) {
                console.log("onDataReceived");
            },
        });
        `,
        // Non-ControllerHook comment should not trigger
        `
        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        function onInit() {}
        `
    ],
    invalid: [
        {
            code: `
sap.ui.generic.app.AppComponent.extend("ca.infra.testapp.Component", {
    metadata: {
        manifest: "json",
    },
    /**
     * @ControllerHook Short Text here
     *
     * @callback sap.ca.scfld.md.controller.BaseDetailController~etxDataReceived
     * @param {sap.ui.model.json.JSONModel} model ...
     * @return {void}  ...
     */
    init: function () {},
});`,
            errors: [
                {
                    message: MSG,
                    type: 'Block'
                }
            ]
        }
    ]
});
