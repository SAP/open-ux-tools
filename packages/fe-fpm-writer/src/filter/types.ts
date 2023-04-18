import type { CustomElement, InternalCustomElement, Position, EventHandler } from '../common/types';

export interface CustomFilter extends CustomElement, EventHandler {
    label: string;
    property: string;
    controlID: string;
    template?: string;
    required?: boolean;
    position?: Position;
    typescript?: boolean;
}

export type InternalCustomFilter = CustomFilter & InternalCustomElement;
