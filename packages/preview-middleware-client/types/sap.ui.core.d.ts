declare module 'sap/ui/core/util/reflection/JsControlTreeModifier' {
    import type Selector from 'sap/ui/fl/Selector';
    import Control from 'sap/ui/core/Control';
    import type { Component } from 'sap/ui/core/UIComponent';
    interface JsControlTreeModifier {
        bySelector(selector: Selector, oAppComponent: Component): Control;
        getControlIdBySelector(selector: ChangeSelector | sting, oAppComponent: Component): string;
    }

    const JsControlTreeModifier: JsControlTreeModifier;
    export default JsControlTreeModifier;
}