import type { JSONSchema4Type } from 'json-schema';
import type { ObjectAggregation, AggregationVariant } from './ObjectAggregation';
import type { PageEditProperty } from './PageEditProperty';
import type { PageData, PropertyPath } from './types';
import { ValidationState } from './types';
import i18next from 'i18next';
import { addValidationMessages } from './utils';

/**
 * Represents validator for aggregations.
 */
export class AggregationValidator {
    /**
     * Method validates states of properties and aggregation. Following states are supported:
     * 1. Valid.
     * 2. Invalid - when value is set for property/aggregation, but it is not valid.
     * 3. Skipped - when property/aggregation is not relevant in current value context and value does not set.
     *
     * @param aggregation ObjectAggregation which state should be validated.
     * @param data Page data.
     */
    validate(aggregation: ObjectAggregation, data: PageData): void {
        if (aggregation.state === ValidationState.Valid && aggregation.variants.length >= 1) {
            const properties = this.validateVariants(aggregation.variants, aggregation);
            for (const property in properties) {
                const entry = aggregation.properties[property] || aggregation.aggregations[property];
                if (entry) {
                    entry.state = properties[property];
                    if (entry.state === ValidationState.Invalid) {
                        // Property is defined in source, but it is not allowed
                        addValidationMessages(entry, [
                            {
                                text: i18next.t('PAGE_EDITOR_PROPERTIES_PROPERTY_WARNING_PROPERTY_NOT_ALLOWED', {
                                    name: property
                                }),
                                deletable: true
                            }
                        ]);
                    }
                }
            }
        }
        // Go through standard aggregation with recursion
        for (const name in aggregation.aggregations) {
            this.validate(aggregation.aggregations[name], data ? (data[name] as PageData) : {});
        }
    }

    /**
     * Method receives possible variants of variants received from schema and validates against current values.
     *
     * @param variants Array of variants.
     * @param aggregation Aggregation to validate.
     * @returns State of each property and aggregation.
     */
    validateVariants(
        variants: Array<AggregationVariant>,
        aggregation: ObjectAggregation
    ): { [k: string]: ValidationState } {
        const valueProperties: { [k: string]: unknown } = {};
        // Get properties with actual values
        for (const property in aggregation.properties) {
            if (aggregation.properties[property].value !== undefined) {
                valueProperties[property] = aggregation.properties[property].value;
            }
        }
        for (const property in aggregation.aggregations) {
            if (aggregation.aggregations[property].value !== undefined) {
                valueProperties[property] = aggregation.aggregations[property].value;
            }
        }
        // Get valid variants
        let validVariants: Array<AggregationVariant> = [...variants];
        for (const property in valueProperties) {
            validVariants = validVariants.filter((variant: AggregationVariant) => {
                const result = this.validateVariant(variant, aggregation, property);
                return result === ValidationState.Valid;
            });
        }
        if (validVariants.length === 0) {
            validVariants = [...variants];
            for (const property in valueProperties) {
                validVariants = validVariants.filter((variant: AggregationVariant) => {
                    const result = this.validateVariant(variant, aggregation, property, true);
                    return result === ValidationState.Valid;
                });
            }
        }
        // Unify aggregation and variants if 'unionName' is used in aggregation
        this.unifyVariants(aggregation, validVariants);
        // Populate property states
        const propertyStates: { [k: string]: ValidationState } = {};
        const properties = [...Object.keys(aggregation.properties), ...Object.keys(aggregation.aggregations)];
        for (const property of properties) {
            const valid = validVariants.some((variant) => {
                return property in variant.properties || property in variant.aggregations;
            });
            if (valid) {
                propertyStates[property] = ValidationState.Valid;
            } else if (property in valueProperties) {
                propertyStates[property] = ValidationState.Invalid;
            } else {
                propertyStates[property] = ValidationState.Skipped;
            }
        }
        return propertyStates;
    }

    /**
     * Method receives single variants and validates received property against variant schema.
     *
     * @param variant Variant to use as validation rule.
     * @param aggregation Aggregation to validate.
     * @param property Name of inner property or aggregation, which should be validated.
     * @param ignoreUnexisting Do not return skip state when ignore passed and variant property does not exist.
     * @returns Validation result.
     */
    validateVariant(
        variant: AggregationVariant,
        aggregation: ObjectAggregation,
        property: string,
        ignoreUnexisting = false
    ): ValidationState {
        const variantProperty = variant.aggregations[property] || variant.properties[property];
        if (variantProperty === undefined) {
            return ignoreUnexisting ? ValidationState.Valid : ValidationState.Skipped;
        }
        // Check enum value
        const entity = aggregation.properties[property] || aggregation.aggregations[property] || {};
        const value = entity.value as JSONSchema4Type;
        if (variantProperty.schema) {
            if (
                variantProperty.schema.pattern &&
                !new RegExp(variantProperty.schema.pattern).exec((value as string).toString())
            ) {
                return ValidationState.Skipped;
            }
            if (
                variantProperty.schema.enum &&
                !variantProperty.schema.enum.includes(value) &&
                !(variantProperty as PageEditProperty).freeText
            ) {
                return ValidationState.Skipped;
            }
        }
        return ValidationState.Valid;
    }

    /**
     * Iterates over all aggregations contained in the given variants.
     * Useful for replacing nested loops when traversing variant aggregations.
     *
     * @param variants List of variant aggregations to traverse.
     * @yields A tuple containing:
     *  - `name`: The aggregation key within the variant.
     *  - `aggregation`: The aggregation within the variant.
     */
    private *iterateVariantAggregations(variants: AggregationVariant[]): Iterable<[string, ObjectAggregation]> {
        for (const variant of variants) {
            for (const [name, aggregation] of Object.entries(variant.aggregations)) {
                yield [name, aggregation];
            }
        }
    }

    /**
     * Method goes through passed variants and checks for unify aggregations.
     * If there is any aggregation for unification, then method updates unify aggregation with latest valid context paths.
     *
     * @param aggregation Aggregation to validate.
     * @param variants Valid aggeregation to use as context for properties and aggregations paths.
     */
    private unifyVariants(aggregation: ObjectAggregation, variants: AggregationVariant[]): void {
        const handledProperties: { [key: string]: boolean } = {};
        for (const [name, variantAggregation] of this.iterateVariantAggregations(variants)) {
            if (variantAggregation.union && !handledProperties[name]) {
                this.applyContextPath(aggregation.aggregations[name], variantAggregation.path);
                // Name correction to show context
                aggregation.aggregations[name].name =
                    variantAggregation.path[variantAggregation.path.length - 1].toString();
                // Mark handled property
                handledProperties[name] = true;
            }
        }
        if (!Object.keys(handledProperties).length) {
            return;
        }
        // update variant arrays
        for (const name in handledProperties) {
            aggregation.aggregations[name].variants = [];
        }
        for (const variant of variants) {
            for (const name in handledProperties) {
                const variantAggregation = variant.aggregations[name];
                if (!variantAggregation) {
                    continue;
                }

                aggregation.aggregations[name].variants = [
                    ...aggregation.aggregations[name].variants,
                    ...(variantAggregation.variants.length ? variantAggregation.variants : [variantAggregation])
                ];
            }
        }
    }

    /**
     * Recursive method updates paths of all aggregations and properties using passed context path.
     *
     * @param aggregation Target aggregation.
     * @param contextPath Context path.
     */
    applyContextPath(aggregation: ObjectAggregation, contextPath: PropertyPath): void {
        aggregation.path = aggregation.path.slice();
        for (let i = 0; i < contextPath.length; i++) {
            aggregation.path[i] = contextPath[i];
        }
        for (const name in aggregation.aggregations) {
            this.applyContextPath(aggregation.aggregations[name], contextPath);
        }
    }
}
