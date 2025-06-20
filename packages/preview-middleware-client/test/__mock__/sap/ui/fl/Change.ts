import type Selector from 'sap/ui/fl/Selector';
import type { Layer } from 'sap/ui/fl';
export default class Change<ContentType> {
    public get fileName(): string | undefined {
        return this.change.fileName;
    }
    constructor(private change: { selector: Selector; changeType: string; layer: Layer; fileName?: string }) {}
    public getSelector = jest.fn().mockImplementation(() => {
        return this.change.selector;
    });
    public getChangeType = jest.fn().mockImplementation(() => {
        return this.change.changeType;
    });
    public getLayer = jest.fn().mockImplementation(() => {
        return this.change.layer;
    });
    public getDefinition = jest.fn().mockImplementation(() => {
        return { fileName: this.change.fileName };
    });
    public getContent = jest.fn().mockImplementation(() => {
        return {
            selector: this.change.selector,
            changeType: this.change.changeType,
            layer: this.change.layer
        } as ContentType;
    });
    public setContent = jest.fn();
    public getJson = jest.fn();
    public getProperty = jest.fn();
}
