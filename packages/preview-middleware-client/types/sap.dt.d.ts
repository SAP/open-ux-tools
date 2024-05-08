// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace sap.ushell {
    import type ComponentContainer from 'sap/ui/core/ComponentContainer';

    export class Container {
        static getServiceAsync<T = unknown>(name: string): Promise<T>;
        static attachRendererCreatedEvent(callback: Function): void;
        static createRenderer(): ComponentContainer;
        static createRenderer(async: true): Promise<ComponentContainer>;
        static createRenderer(renderer?: string, async?: true): Promise<ComponentContainer>;
    }
}