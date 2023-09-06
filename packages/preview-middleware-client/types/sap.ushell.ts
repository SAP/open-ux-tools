/*eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace sap.ushell {
    export class Container {
        static getServiceAsync<T = unknown>(name: string): Promise<T>;
        static attachRendererCreatedEvent(callback: Function): void;
        static createRenderer(): { placeAt(id: string): void };
    }
}
