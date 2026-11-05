import rule from '../../src/rules/sap-controller-hook-bad-callback-signature.js';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2018, sourceType: 'script' } });

const ERROR_MSG = 'Controller hook documentation contains malformed callback signature: ' as const;
const ERROR_TYPES = {
    CALLBACK_MISSING_SIGNATURE: 'The callback is missing its full signature (ownertype and function name) ',
    CALLBACK_OWNER_TYPE_MISSING: 'No owner type maintained for callback',
    CALLBACK_PARAMETER_MISSING_NAME_OR_TYPE: 'Callback parameters must document type and name',
    CALLBACK_ARGUMENTS_MISSMATCH:
        'Number of arguments in callback documentation does not match number of callback arguments in code',
    CALLBACK_MISSING_IN_CODE: 'Documented callback not in source code'
} as const;

type ErrorKey = keyof typeof ERROR_TYPES;

function getMessage(type: ErrorKey): string {
    return `${ERROR_MSG}${ERROR_TYPES[type]}`;
}

function getAllErrors(): { message: string; type: string }[] {
    return (Object.keys(ERROR_TYPES) as ErrorKey[]).map((key) => ({
        message: getMessage(key),
        type: 'Block'
    }));
}

ruleTester.run('sap-controller-hook-bad-callback-signature', rule, {
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
             * @callback sap.ca.scfld.md.controller.BaseDetailController~onDataReceived
             * @param {string} myparam ...
             * @return {void}  ...
             */
            onDataReceived: function (myparam) {
                console.log("onDataReceived");
            },
        });
        `,
        `
        sap.ui.generic.app.AppComponent.extend("ca.infra.testapp.Component", {
            metadata: {
                manifest: "json",
            },
            /**
             * @ControllerHook Test hook with simple function call
             * @callback sap.ca.scfld.md.controller.BaseDetailController~extHookCallback
             * @param {string} param1 ...
             * @return {void}
             */
            extHookCallback: function (param1) {
                var fnGetUser = jQuery.sap.getObject("sap.ushell.Container.getUser");
                var result = fnGetUser();
            },
        });
        `
    ],
    invalid: [
        {
            code: `
sap.ui.generic.app.AppComponent.extend("ca.infra.testapp.Component", {
  metadata: {
    includes: ["css/style1.css", "/css/style2.css", "/css/titles.css"],
    manifest: "json",
  },

  /**
   * @ControllerHook Short Text here
   * Description on Extension Point usage here.
   *
   * The description should contain information about when the extension is called.
   *
   * If (like in this example) the extension is
   * a callback the customer provides, then it should be documented like:
   *
   * @callback
   * @param {sap.ui.model.json.JSONModel} model ...
   * @param  name - The name of an employee.
   * @return {void}  ...
   *
   */
  init: function () {

    /**
   * @ControllerHook Short Text here
   * Description on Extension Point usage here.
   *
   * The description should contain information about when the extension is called.
   *
   * If (like in this example) the extension is
   * a callback the customer provides, then it should be documented like:
   *
   * @callback sap.ca.scfld.md.controller.BaseDetailController~extHookDataReceived
   * @param {string} myparam ...
   * @return {void}  ...
   *
   */
  if(this.extHookDataReceived) {
      this.extHookDataReceived()
  }

  },

    /**
   * @ControllerHook Short Text here
   * Description on Extension Point usage here.
   *
   * The description should contain information about when the extension is called.
   *
   * If (like in this example) the extension is
   * a callback the customer provides, then it should be documented like:
   *
   * @callback sap.ca.scfld.md.controller.BaseDetailController~extHookDataSent
   * @return {void}  ...
   *
   */
});
`,
            errors: getAllErrors()
        },
        {
            code: `
sap.ui.generic.app.AppComponent.extend("ca.infra.testapp.Component", {
  metadata: {
    manifest: "json",
  },
  /**
   * @ControllerHook Test hook with simple function call and argument mismatch
   * @callback sap.ca.scfld.md.controller.BaseDetailController~extHookGetUser
   * @param {string} param1 First parameter
   * @param {object} param2 Second parameter
   * @return {void}
   */
  extHookGetUser: function (param1) {
    var fnGetUser = jQuery.sap.getObject("sap.ushell.Container.getUser");
    var result = fnGetUser();
  },
});
`,
            errors: [
                {
                    message: getMessage('CALLBACK_ARGUMENTS_MISSMATCH'),
                    type: 'Block'
                }
            ]
        }
    ]
});
