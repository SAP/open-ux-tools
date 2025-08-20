import type { JSONSchema4 } from 'json-schema';
import type { Location, SettingOption, PropertyMessage } from './types';
import { ValidationState } from './types';
import type { ArtifactType } from '@sap/ux-specification/dist/types/src';

export interface PageProperties {
    [key: string]: PageEditProperty;
}

/**
 * Represents a configurable aggregation property in the page editing model.
 * `PageEditProperty` wraps schema-based metadata for a property and stores
 * runtime values, validation state, messages, and UI-related options.
 */
export class PageEditProperty implements SettingOption {
    public schema: JSONSchema4;
    public value?: unknown;
    public pattern?: string;
    // True if user can enter text freely. Is used to display as combobox:
    // 1. Selection options from enum;
    // 2. Free text to enter using input field;
    public freeText?: boolean;
    public disabled?: boolean;
    public state?: ValidationState = ValidationState.Valid;
    // Property description
    public description?: string;
    // Is property required for input
    public required?: boolean;

    public isAtomic?: boolean;

    public i18nClassification?: string;

    public name: string;
    public displayName?: string;
    // Property's artifact type
    public artifactType?: ArtifactType;
    // Property's minimum allowed value
    public minimum?: number;
    // Property messages
    public messages?: PropertyMessage[];
    // Location in source file
    public locations?: Location[];

    /**
     *
     * @param schema
     * @param displayName
     */
    constructor(schema: JSONSchema4, displayName: string) {
        // Use copy - it allows to make changes in schema if we need.
        this.schema = JSON.parse(JSON.stringify(schema));
        this.name = displayName;
    }
}
