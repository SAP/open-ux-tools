export default class ComponentMock {
    static get(_id: string) {}
    static create() {
        return new ComponentMock();
    }
    static getComponentById(_id: string) {
        return undefined;
    }
}