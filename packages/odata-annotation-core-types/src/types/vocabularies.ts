/**
 * All types representing vocabulary objects should go here
 * (expected: one type per $Kind)
 *
 * Vocabularies will be imported from their json format
 *  described here: (https://docs.oasis-open.org/odata/odata-csdl-json/v4.01/odata-csdl-json-v4.01.html)
 *
 * Typescript types should represent at minimum those features of a vocabulary object that are used in
 * annotation-modeler core or annotation modeler APIs
 */

import type { FullyQualifiedName, FullyQualifiedTypeName } from '../specification';

/**
 * Constraints can be provided via Annotations on terms or properties
 * (commented out terms have been considered but discarded)
 */
export interface Constraints {
    // ------ validation vocabulary--------
    // pattern: string; // regular expression applied to string value (Property or Term) - only in Core.LocalDateTime
    // minimum: number; // minimum value (Property or Term) - only used in DataModificationExceptionType.responseCode
    // maximum: number; // maximum value (Property or Term) - only used in DataModificationExceptionType.responseCode
    allowedValues?: AllowedValues[]; // valid values (Property or Term)
    openPropertyTypeConstraints?: FullyQualifiedTypeName[]; // used in UI vocabulary
    allowedTerms?: FullyQualifiedTypeName[]; // restrict terms allowed for annotation path (Property or Term)
    applicableTerms?: FullyQualifiedTypeName[]; //Names of specific terms that are applicable and may be applied in the current context
    // MaxItems, MinItems: no usage in supported vocabularies
    derivedTypeConstraints?: FullyQualifiedTypeName[]; // listed sub types (and their subtypes) (Property only!)
    // ------ core vocabulary--------
    // isURL? Can we check this ?
    isLanguageDependent?: boolean; // string value is language dependent (Property or Term)
    // term can only be applied to elements of this type/subType (Term)
    // applies to says it's only used for terms, but properties use it too, e.g. RecursiveHierarchyType.IsLeafProperty
    requiresType?: FullyQualifiedName;
    // ------common vocabulary------------
    // IsUpperCase: no usage in supported vocabularies
    // MinOccurs: no usage in supported vocabularies
    // MaxOccurs: no usage in supported vocabularies
    // ------ communication vocabulary----
    // isEmailAddress: boolean;  no usage in supported vocabularies
    // isPhoneNumber: boolean;  no usage in supported vocabularies
}

export interface AllowedValues {
    value: any;
    description: string;
    longDescription: string;
}
