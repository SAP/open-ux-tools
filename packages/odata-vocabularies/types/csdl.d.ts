/**
 * This file was automatically generated by json-schema-to-typescript.
 * BUT IT WAS NOT ENOUGH !
 * So it was modified by hand to be completely awesome
 * DO NOT just regenerate this file if the csdl schema change
 */

declare namespace CSDL {
    type ElementType<T> = T extends any[] ? T[number] : T;
    type UnboxContent<T> = {
        [P in keyof T]: ElementType<T[P]>;
    };

    /**
     * Maximum length of string or binary value
     */
    export type MaxLength = number;
    /**
     * Unicode values allowed
     */
    export type Unicode = boolean;
    /**
     * Maximum number of significant digits
     */
    export type Precision = number;
    /**
     * Maximum number of fractional digits
     */
    export type Scale = number | ('floating' | 'variable');
    /**
     * Coordinate reference system as defined by the European Petroleum Survey Group
     */
    export type SRID = string;
    /**
     * Parameter
     */
    export type Parameter = UnboxContent<CSDLAnnotations> &
        {
            /**
             * Parameter name
             */
            $Name: string;
            /**
             * Qualified name of parameter type
             */
            $Type?: string;
            /**
             * Collection-valued parameter
             */
            $Collection?: boolean;
            /**
             * Nullable parameter
             */
            $Nullable?: boolean;
            $MaxLength?: MaxLength;
            $Unicode?: Unicode;
            $Precision?: Precision;
            $Scale?: Scale;
            $SRID?: SRID;
        }[];

    export type CSDL = CsdlSchema & Dictionary<SchemaWrapper>;

    interface Dictionary<T> {
        [key: string]: T;
    }

    /**
     * OData Common Schema Definition Language (CSDL) JSON Representation Version 4.01
     */
    export interface CsdlSchema {
        /**
         * OData version used in this document
         */
        $Version?: '4.0' | '4.01';
        /**
         * Qualified name of the entity container
         */
        $EntityContainer?: string;
        /**
         * References to other CSDL documents
         */
        $Reference?: {
            /**
             * Reference Object
             *
             * This interface was referenced by `undefined`'s JSON-Schema definition
             * via the `patternProperty` ".*".
             */
            [k: string]: CSDLAnnotations & {
                /**
                 * Included schemas
                 */
                $Include?: CSDLAnnotations &
                    {
                        /**
                         * Namespace to include
                         */
                        $Namespace: string;
                        /**
                         * Alias of included namespace
                         */
                        $Alias?: string;
                    }[];
                /**
                 * Included annotations
                 */
                $IncludeAnnotations?: {
                    /**
                     * Term namespace of annotations to include
                     */
                    $TermNamespace: string;
                    /**
                     * Target namespace of annotations to include
                     */
                    $TargetNamespace?: string;
                    /**
                     * Qualifier of annotations to include
                     */
                    $Qualifier?: string;
                }[];
            };
        };
    }

    /**
     * Annotation
     *
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `Schema`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `EntityType`'s JSON-Schema definition
     * via the `patternProperty` "@".
     *
     * This interface was referenced by `Property`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "@".
     *
     * This interface was referenced by `NavigationProperty`'s JSON-Schema definition
     * via the `patternProperty` "@".
     *
     * This interface was referenced by `NavigationProperty`'s JSON-Schema definition
     * via the `patternProperty` "^\$OnDelete@".
     *
     * This interface was referenced by `ComplexType`'s JSON-Schema definition
     * via the `patternProperty` "@".
     *
     * This interface was referenced by `EnumType`'s JSON-Schema definition
     * via the `patternProperty` "@".
     *
     * This interface was referenced by `TypeDefinition`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `Term`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `EntityContainer`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `EntitySet`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `Singleton`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `ActionImport`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `FunctionImport`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `ReturnType`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `Action`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     *
     * This interface was referenced by `Function`'s JSON-Schema definition
     * via the `patternProperty` "^@".
     */

    export type SchemaWrapper = Schema & Dictionary<SchemaElement | Action[] | Function[], string>;

    export type SchemaElement = EntityType | ComplexType | EnumType | TypeDefinition | Term | EntityContainer;

    /**
     * CSDL Schema
     *
     * This interface was referenced by `CsdlSchema`'s JSON-Schema definition
     * via the `patternProperty` "^[^$]".
     */
    export interface Schema extends UnboxContent<CSDLAnnotations> {
        /**
         * Alias of CSDL Schema
         */
        $Alias?: string;
    }

    export interface CSDLAnnotations {
        '@Org.OData.Core.V1.Description'?: string;
        '@Org.OData.Core.V1.LongDescription'?: string;
        [term: string]: any;
    }

    /**
     * Entity Type
     */
    export interface EntityType extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'EntityType';
        /**
         * Media entity type
         */
        $HasStream?: boolean;
        /**
         * List of key properties
         */
        $Key?: (
            | string
            | {
                  [k: string]: any;
              }
        )[];
        /**
         * Abstract entity type
         */
        $Abstract?: boolean;
        /**
         * Open entity type
         */
        $OpenType?: boolean;
        /**
         * Qualified name of base entity type
         */
        $BaseType?: string;
    }

    /**
     * Structural Property
     */
    export interface Property extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of property
         */
        $Kind?: 'Property';
        /**
         * Qualified name of primitive or complex type
         */
        $Type?: string;
        /**
         * Collection-valued property
         */
        $Collection?: boolean;
        /**
         * Nullable property
         */
        $Nullable?: boolean;
        $MaxLength?: MaxLength;
        $Unicode?: Unicode;
        $Precision?: Precision;
        $Scale?: Scale;
        $SRID?: SRID;
        /**
         * Default value
         */
        $DefaultValue?: {
            [k: string]: any;
        };
    }

    /**
     * Navigation Property
     */
    export interface NavigationProperty extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of property
         */
        $Kind: 'NavigationProperty';
        /**
         * Qualified name of entity type
         */
        $Type: string;
        /**
         * Collection-valued navigation property
         */
        $Collection?: boolean;
        /**
         * Minimum cardinality is zero
         */
        $Nullable?: boolean;
        /**
         * Partner navigation property leading back to this entity
         */
        $Partner?: string;
        /**
         * Related entities are contained in this entity
         */
        $ContainsTarget?: boolean;
        $ReferentialConstraint?: {
            [k: string]: any;
        };
        /**
         * Action on related entites when deleting this entity
         */
        $OnDelete?: 'Cascade' | 'None' | 'SetNull' | 'SetDefault';
    }

    export type ComplexType = ComplexTypeBase & Dictionary<Property | NavigationProperty>;

    /**
     * Complex Type
     */
    export interface ComplexTypeBase extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'ComplexType';
        /**
         * Abstract complex type
         */
        $Abstract?: boolean;
        /**
         * Open complex type
         */
        $OpenType?: boolean;
        /**
         * Qualified name of base complex type
         */
        $BaseType?: string;
    }

    export type EnumType = EnumTypeBase & Dictionary<number>;

    /**
     * Enumeration Type
     */
    export interface EnumTypeBase extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'EnumType';
        /**
         * Multiple enumeration members can be selected simultaneously
         */
        $IsFlags?: boolean;
        /**
         * Underlying integer type
         */
        $UnderlyingType?: 'Edm.Byte' | 'Edm.SByte' | 'Edm.Int16' | 'Edm.Int32' | 'Edm.Int64';
    }

    /**
     * Type Definition
     */
    export interface TypeDefinition extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'TypeDefinition';
        /**
         * Qualified name of underlying primitive type
         */
        $UnderlyingType: string;
        $MaxLength?: MaxLength;
        $Unicode?: Unicode;
        $Precision?: Precision;
        $Scale?: Scale;
        $SRID?: SRID;
    }

    /**
     * Term
     */
    export interface Term extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'Term';
        /**
         * Qualified type name
         */
        $Type?: string;
        /**
         * Collection-valued term
         */
        $Collection?: boolean;
        /**
         * Nullable term
         */
        $Nullable?: boolean;
        $MaxLength?: MaxLength;
        $Unicode?: Unicode;
        $Precision?: Precision;
        $Scale?: Scale;
        $SRID?: SRID;
        /**
         * Qualified name of base term
         */
        $BaseTerm?: string;
        /**
         * Term can be applied to
         */
        $AppliesTo?: (
            | 'Action'
            | 'ActionImport'
            | 'Annotation'
            | 'Apply'
            | 'Cast'
            | 'Collection'
            | 'ComplexType'
            | 'EntityContainer'
            | 'EntitySet'
            | 'EntityType'
            | 'EnumType'
            | 'Function'
            | 'FunctionImport'
            | 'If'
            | 'Include'
            | 'IsOf'
            | 'LabeledElement'
            | 'Member'
            | 'NavigationProperty'
            | 'Null'
            | 'OnDelete'
            | 'Parameter'
            | 'Property'
            | 'PropertyValue'
            | 'Record'
            | 'Reference'
            | 'ReferentialConstraint'
            | 'ReturnType'
            | 'Schema'
            | 'Singleton'
            | 'Term'
            | 'TypeDefinition'
            | 'UrlRef'
        )[];
        /**
         * Default value of term, only relevant for CSDL XML
         */
        $DefaultValue?: {
            [k: string]: any;
        };
    }

    /**
     * Entity Container
     */
    export interface EntityContainer extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'EntityContainer';
        /**
         * Qualified name of entity container to extend
         */
        $Extends?: string;
    }

    /**
     * Entity Set
     */
    export interface EntitySet extends UnboxContent<CSDLAnnotations> {
        /**
         * Collection-valued
         */
        $Collection: true;
        /**
         * Qualified name of entity type
         */
        $Type: string;
        $NavigationPropertyBinding?: NavigationPropertyBinding;
        /**
         * Advertise in service document
         */
        $IncludeInServiceDocument?: boolean;
    }

    /**
     * Navigation Property Binding
     */
    export interface NavigationPropertyBinding {
        /**
         * Path to navigation property : path to target entity set
         *
         * This interface was referenced by `NavigationPropertyBinding`'s JSON-Schema definition
         * via the `patternProperty` ".*".
         */
        [k: string]: string;
    }

    /**
     * Singleton
     */
    export interface Singleton extends UnboxContent<CSDLAnnotations> {
        /**
         * Qualified name of entity type
         */
        $Type: string;
        /**
         * Nullable singleton
         */
        $Nullable?: boolean;
        $NavigationPropertyBinding?: NavigationPropertyBinding;
    }

    /**
     * Action Import
     */
    export interface ActionImport extends UnboxContent<CSDLAnnotations> {
        /**
         * Qualified name of action
         */
        $Action: string;
        /**
         * Entity set of result entities
         */
        $EntitySet?: string;
    }

    /**
     * Function Import
     */
    export interface FunctionImport extends UnboxContent<CSDLAnnotations> {
        /**
         * Qualified name of function
         */
        $Function: string;
        /**
         * Entity set of result entities
         */
        $EntitySet?: string;
        /**
         * Advertise in service document
         */
        $IncludeInServiceDocument?: boolean;
    }

    /**
     * Action
     */
    export interface Action extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'Action';
        /**
         * Invoke on existing resource
         */
        $IsBound?: boolean;
        /**
         * Path to entity set of result entities
         */
        $EntitySetPath?: string;
        $Parameter?: Parameter;
        $ReturnType?: ReturnType;
    }

    /**
     * Return Type
     */
    export interface ReturnType extends UnboxContent<CSDLAnnotations> {
        /**
         * Qualified name of return type
         */
        $Type?: string;
        /**
         * Returns a collection
         */
        $Collection?: boolean;
        /**
         * Can return null
         */
        $Nullable?: boolean;
        $MaxLength?: MaxLength;
        $Unicode?: Unicode;
        $Precision?: Precision;
        $Scale?: Scale;
        $SRID?: SRID;
    }

    /**
     * Function
     */
    export interface Function extends UnboxContent<CSDLAnnotations> {
        /**
         * Kind of model element
         */
        $Kind: 'Function';
        /**
         * Invoke on existing resource
         */
        $IsBound?: boolean;
        /**
         * Allows additional path segments or system query options
         */
        $IsComposable?: boolean;
        /**
         * Path to entity set of result entities
         */
        $EntitySetPath?: string;
        $Parameter?: Parameter;
        $ReturnType: ReturnType;
    }
}

declare module '@sap-ux/vocabularies/CSDL' {
    export = CSDL;
}
