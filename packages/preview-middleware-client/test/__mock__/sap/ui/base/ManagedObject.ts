import ManagedObject from 'sap/ui/base/ManagedObject';

// add required functionality for testing here
export class ManagedObjectMock {
    isA = jest.fn();
}

export default ManagedObjectMock as unknown as ManagedObject & typeof ManagedObject;
