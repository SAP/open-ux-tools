// add required functionality for testing here
export default class Controller {
    public static create = jest.fn();
    public loadFragment() {
        return {
            open: jest.fn()
        };
    }
    public getView() {
        return this;
    }
    public addDependent() {
        return this;
    }
    public setModel() {
        return this;
    }
}
