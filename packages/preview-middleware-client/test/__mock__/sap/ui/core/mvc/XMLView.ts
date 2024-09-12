// add required functionality for testing here
export default class {
    isA = jest.fn().mockImplementation((type) => type === 'sap.ui.core.mvc.XMLView')
    create = jest.fn();
    getContent = jest.fn();
    getParent = jest.fn();
    getViewName = jest.fn();
    getDomRef = jest.fn();
    getId = jest.fn();
}
