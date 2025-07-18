import ManagedObject from 'sap/ui/base/ManagedObject';
import Component from 'sap/ui/core/Component';
import Control from 'sap/ui/core/Control';
import UIComponent from 'sap/ui/core/UIComponent';

export default class ComponentMock extends UIComponent {
    static get(_id: string) {
        return {} as unknown as UIComponent;
    }
    static create() {
        return new ComponentMock() as unknown as Promise<UIComponent>;
    }
    getRootControl(): Control {
        return {} as unknown as Control;
    }
    static getComponentById(_id: string): ComponentMock | undefined {
        return undefined;
    }
    static getOwnerComponentFor(_control: ManagedObject): Component | undefined {
        return undefined;
    }
}
