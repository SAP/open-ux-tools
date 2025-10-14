declare module 'sap/ui/core/util/reflection/JsControlTreeModifier' {
    import type Selector from 'sap/ui/fl/Selector';
    import Control from 'sap/ui/core/Control';
    import type { Component } from 'sap/ui/core/UIComponent';

    interface JsControlTreeModifier {
        bySelector(selector: Selector, appComponent: Component): Control;
        getControlIdBySelector(selector: ChangeSelector | sting, appComponent: Component): string;
    }

    const JsControlTreeModifier: JsControlTreeModifier;
    export default JsControlTreeModifier;
}

declare module 'sap/ui/core/mvc/XMLView' {
    import type XMLViewOriginal from 'sap/ui/core/mvc/XMLView';

    export default interface XMLView extends XMLViewOriginal {
        /**
         * Returns the name of the controller module associated with the XML view.
         *
         * @returns {string} The controller module name.
         * @since SAPUI5 Version 1.135.0.
         */
        getControllerModuleName(): string;
    }
}

