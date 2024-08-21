import UIComponentMock from 'mock/sap/ui/core/UIComponent';
export default class AppComponentMock extends UIComponentMock {
    getManifest() {
        return {
            'sap.app': {
                id: 'test.id'
            }
        };
    }
}
