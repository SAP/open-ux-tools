import type XMLViewOriginal from 'sap/ui/core/mvc/XMLView';
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
    export default interface XMLView extends XMLViewOriginal {
        static getControllerModuleName(): string;
    }
}