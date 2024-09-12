import ManagedObject from 'sap/ui/base/ManagedObject';
import Component from 'sap/ui/core/Component';

export default class ComponentMock {
    static get(_id: string) {}
    static create() {
        return new ComponentMock();
    }
    static getComponentById(_id: string): ComponentMock | undefined {
        return undefined;
    }
    static getOwnerComponentFor(_control: ManagedObject): Component | undefined {
        return undefined;
    }
}
