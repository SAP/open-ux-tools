export default class ComponentMock {
    static get(id: string) {}
    static create() {
        return new ComponentMock();
    }
}