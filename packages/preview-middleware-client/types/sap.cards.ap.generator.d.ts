declare module 'sap/cards/ap/generator' {
    import type Component from 'sap/ui/core/Component';
    export type CardGeneratorType = {
        initializeAsync(componentInstance: Component): void;
    };
    const CardGenerator: CardGeneratorType;
    export default CardGenerator;
}