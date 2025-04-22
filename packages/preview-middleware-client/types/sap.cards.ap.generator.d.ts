declare module 'sap/cards/ap/generator' {
    import type Component from 'sap/ui/core/Component';
    export type CardGeneratorType = {
        initializeAsync(componentInstance: Component): void;
    }
	export function initializeAsync(componentInstance: Component): void;
}