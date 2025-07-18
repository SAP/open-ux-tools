import UIComponentMock from 'mock/sap/ui/core/UIComponent';
import AppComponentMock from './AppComponent';
export default class TemplateComponentMock extends UIComponentMock {
    isA(type: string): boolean {
        return type === 'sap.fe.core.TemplateComponent';
    }
    getAppComponent(): AppComponentMock {
        return new AppComponentMock();
    }
}
