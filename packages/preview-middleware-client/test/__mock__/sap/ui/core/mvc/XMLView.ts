import BaseObject from 'sap/ui/base/Object';
import ComponentContainer from 'sap/ui/core/ComponentContainer';

// add required functionality for testing here
export default class extends ComponentContainer {
    isA = jest.fn().mockImplementation((type) => type === 'sap.ui.core.mvc.XMLView') as unknown as <
        T extends BaseObject = BaseObject
    >(
        vTypeName: string | string[]
    ) => this is T;
    create = jest.fn();
    getContent = jest.fn();
    getParent = jest.fn();
    getViewName = jest.fn();
    getViewData = jest.fn();
    getDomRef = jest.fn();
    getId = jest.fn();
    getLocalId = jest.fn();
}
