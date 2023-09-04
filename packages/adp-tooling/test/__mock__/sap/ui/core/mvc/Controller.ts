/* eslint-disable @typescript-eslint/no-empty-function */
// add required functionality for testing here
export default class Controller {
    public static async create() {}
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
