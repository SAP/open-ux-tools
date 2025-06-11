declare module 'sap/cux/home/ToDoPanel' {
    import Control from 'sap/ui/core/Control';
    import Context from 'sap/ui/model/Context';

    export default class ToDoPanel extends Control {
        setProperty(propertyName: string, value: any): this;
        generateCardTemplate(id: string, context: Context): Control;
    }
}