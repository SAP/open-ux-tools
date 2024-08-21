declare module 'sap/ui/core/util/reflection/JsControlTreeModifier' {
    interface JsControlTreeModifier {
        bySelector(selector: string, oAppComponent: any): any;
    }

    const JsControlTreeModifier: JsControlTreeModifier;
    export default JsControlTreeModifier;
}