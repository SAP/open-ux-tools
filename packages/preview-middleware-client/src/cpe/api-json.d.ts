export type LibraryVersion = string;
export type ConcreteSymbol =
    | TypedefSymbol
    | NamespaceSymbol
    | DatatypeSymbol
    | InterfaceSymbol
    | EnumSymbol
    | ClassSymbol
    | FunctionSymbol;
export type TypedefSymbol = SymbolBase &
    (
        | {
              kind?: 'typedef';
              extends?: string;
              'ui5-metamodel'?: boolean;
              type?: string;
              properties?: ObjProperty[];
              [k: string]: any;
          }
        | {
              kind?: 'typedef';
              extends?: string;
              'ui5-metamodel'?: boolean;
              type?: string;
              properties?: Ui5Property[];
              [k: string]: any;
          }
        | {
              kind?: 'typedef';
              extends?: string;
              parameters?: ObjCallableParameters;
              returnValue?: {
                  type?: string;
                  description?: string;
              };
              throws?: Exceptions;
              [k: string]: any;
          }
    );
/**
 * ( package '/' )* name
 */
export type ModuleName = string;
/**
 * Version with which the documented entity has been introduced the first time, no matter in what state it has been introduced
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type Since = LibraryVersion | 'undefined';
/**
 * references to internal or external sources of information that are related to the documented entity. References can be URLs, absolute or relative JSDoc symbol names. Relative JSDoc symbols usually are meant to be relative to the documented entity
 */
export type References = string[];
export type Examples = {
    caption?: string;
    text?: string;
}[];
export type Ui5SettingName = string;
export type ObjCallableParameters = {
    name: string;
    type: string;
    optional?: boolean;
    defaultValue?: any;
    parameterProperties?: NestedProperties;
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    repeatable?: boolean;
}[];
/**
 * With this element, a callable (constructor, method) can document the exceptions that may occur during its execution
 */
export type Exceptions = {
    type?: string;
    description?: string;
    [k: string]: any;
}[];
/**
 * Namespaces can have the common symbol properties and extend another symbol
 */
export type NamespaceSymbol = SymbolBase & {
    kind?: 'namespace' | 'member';
    extends?: string;
    implements?: string[];
    properties?: ObjProperty[];
    methods?: ObjMethod[];
    events?: ObjEvent[];
    abstract?: boolean;
    final?: boolean;
    'ui5-metamodel'?: boolean;
    'ui5-metadata'?: Ui5Metadata;
    [k: string]: any;
};
/**
 * Namespaces can have the common symbol properties and extend another symbol
 */
export type DatatypeSymbol = SymbolBase & {
    kind?: 'namespace';
    final?: boolean;
    'ui5-metamodel'?: boolean;
    'ui5-metadata': {
        stereotype?: 'datatype';
        basetype?: 'string' | 'int' | 'any' | 'float[]';
        pattern?: string;
        range?: {
            minExclusive?: number;
            maxInclusive?: number;
            minInclusive?: number;
            maxExclusive?: number;
        };
    };
    examples?: Examples;
    [k: string]: any;
};
/**
 * Interfaces can have the common symbol properties and extend another symbol
 */
export type InterfaceSymbol = SymbolBase & {
    kind?: 'interface';
    extends?: string;
    'ui5-metamodel'?: boolean;
    methods?: (ObjMethod & {
        optional?: boolean;
        [k: string]: any;
    })[];
    events?: ObjEvent[];
    [k: string]: any;
};
/**
 * An enum has the standard symbol properties and may contain a set of properties
 */
export type EnumSymbol = SymbolBase & {
    kind?: 'enum';
    'ui5-metamodel'?: boolean;
    properties?: EnumProperty[];
    'ui5-metadata'?: {
        stereotype?: 'enum';
    };
    [k: string]: any;
};
/**
 * A class is the basic building block of our user interfaces; it is a reusable entity with properties, events, methods, and relations. The most important relations are aggregations to other elements, and in this way a tree structure of elements can be created. Note that the term 'control' is used both for the individual instance (object) and for the type (class) of all such instances; sometimes the distinction will be made explicit, sometimes it becomes clear from the context.
 */
export type ClassSymbol = SymbolBase & {
    kind?: 'class';
    /**
     * any other class, control or element type, incl. the predefined types sap.ui.core/Element and sap.ui.core/Control
     */
    extends?: string;
    /**
     * interfaces that this class implements
     */
    implements?: string[];
    abstract?: boolean;
    final?: boolean;
    'ui5-metadata'?: Ui5Metadata;
    'ui5-metamodel'?: boolean;
    constructor?: ObjConstructor;
    properties?: ObjProperty[];
    events?: ObjEvent[];
    methods?: (ObjMethod & {
        [k: string]: any;
    })[];
    [k: string]: any;
};
/**
 * A function can be a top-level symbol when exported from a module
 */
export type FunctionSymbol = SymbolBase &
    ObjMethod & {
        kind?: 'function';
        [k: string]: any;
    };

/**
 * Schema that describes the structure of the api.json files that the 'sapui5-jsdoc3' template can generate for each UI5 library
 */
export interface SchemaForApiJsonFiles {
    /**
     * A reference to this schema to make the structure of the file obvious.
     */
    '$schema-ref': 'http://schemas.sap.com/sapui5/designtime/api.json/1.0';
    library?: string;
    version?: LibraryVersion;
    symbols?: ConcreteSymbol[];
}
export interface SymbolBase {
    kind?: 'namespace' | 'member' | 'class' | 'interface' | 'enum' | 'typedef' | 'function';
    name: string;
    basename: string;
    resource?: string;
    module?: ModuleName;
    export?: string;
    static?: boolean;
    visibility?: 'public' | 'protected' | 'private' | 'restricted';
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    references?: References;
    allowedFor?: string[];
    [k: string]: any;
}
/**
 * Describes whether the documented entity is still experimental and should not be used in productive apps. The since attribute describes since when the library is in that state, it must be equal or higher than the since version of the entity, but not higher than the current version of the whole delivery unit.
 */
export interface Experimental {
    since?: LibraryVersion;
    text?: string;
    [k: string]: any;
}
/**
 * If the entity has been deprecated, this element should contain information about when and why this happened and should describe any potential alternatives
 */
export interface Deprecated {
    since?: LibraryVersion;
    text?: string;
    [k: string]: any;
}
export interface ObjProperty {
    name: string;
    module?: ModuleName;
    export?: string;
    resource?: string;
    visibility?: 'public' | 'protected' | 'private' | 'restricted';
    static?: boolean;
    type?: string;
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    examples?: Examples;
    references?: References;
    optional?: boolean;
    allowedFor?: string[];
    properties?: {
        [k: string]: any;
    };
}
export interface Ui5Property {
    name: Ui5SettingName;
    type?: string;
    defaultValue?: any;
    group?: string;
    visibility?: 'public' | 'hidden' | 'restricted';
    description?: string;
    since?: Since;
    bindable?: boolean;
    experimental?: Experimental;
    deprecated?: Deprecated;
    methods?: string[];
    optional?: boolean;
    static?: boolean;
    allowedFor?: string[];
    'ui5 - metadata'?: {
        'sap.fe'?: {
            expectedAnnotations: string[];
            expectedTypes: string[];
        };
    };
}
export interface NestedProperties {
    [k: string]: {
        name: string;
        type: string;
        parameterProperties?: NestedProperties;
        description?: string;
        optional?: boolean;
        defaultValue?: any;
        since?: Since;
        experimental?: Experimental;
        deprecated?: Deprecated;
    };
}
export interface ObjMethod {
    name: string;
    module?: ModuleName;
    export?: string;
    resource?: string;
    visibility?: 'public' | 'protected' | 'private' | 'restricted';
    static?: boolean;
    parameters?: ObjCallableParameters;
    returnValue?: {
        type?: string;
        description?: string;
    };
    throws?: Exceptions;
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    examples?: Examples;
    references?: References;
    'ui5-metamodel'?: boolean;
    allowedFor?: string[];
    [k: string]: any;
}
export interface ObjEvent {
    name: string;
    module?: ModuleName;
    resource?: string;
    visibility?: 'public' | 'protected' | 'private' | 'restricted';
    static?: boolean;
    parameters?: {
        name: string;
        type: string;
        parameterProperties?: NestedProperties;
        description?: string;
        since?: Since;
        experimental?: Experimental;
        deprecated?: Deprecated;
    }[];
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    examples?: Examples;
    references?: References;
    allowedFor?: string[];
}
export interface Ui5Metadata {
    stereotype?:
        | 'object'
        | 'element'
        | 'control'
        | 'component'
        | 'library'
        | 'controller'
        | 'controllerextension'
        | 'template'
        | 'xmlmacro'
        | 'webcomponent';
    specialSettings?: Ui5SpecialSetting[];
    properties?: Ui5Property[];
    defaultProperty?: Ui5SettingName;
    aggregations?: Ui5Aggregation[];
    defaultAggregation?: Ui5SettingName;
    associations?: Ui5Association[];
    events?: Ui5Event[];
    dnd?:
        | boolean
        | {
              draggable?: boolean;
              droppable?: boolean;
          };
    annotations?: {
        name: string;
        namespace?: string;
        target?: string[];
        annotation?: string;
        defaultValue?: any;
        appliesTo?: string[];
        description?: string;
        since?: Since;
        experimental?: Experimental;
        deprecated?: Deprecated;
    }[];
    designtime?: boolean | string;
    metadataClass?: string;
    'sap.fe'?: {
        returnTypes?: string[];
    };
}
export interface Ui5SpecialSetting {
    name: Ui5SettingName;
    type?: string;
    visibility?: 'public' | 'hidden' | 'restricted';
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    methods?: string[];
    allowedFor?: string[];
}
export interface Ui5Aggregation {
    name: Ui5SettingName;
    singularName?: Ui5SettingName;
    type?: string;
    altTypes?: string[];
    cardinality?: '0..1' | '0..n';
    visibility?: 'public' | 'hidden' | 'restricted';
    bindable?: boolean;
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    methods?: string[];
    dnd?:
        | boolean
        | {
              draggable?: boolean;
              droppable?: boolean;
              layout?: 'Vertical' | 'Horizontal';
              [k: string]: any;
          };
    allowedFor?: string[];
}
export interface Ui5Association {
    name: Ui5SettingName;
    singularName?: Ui5SettingName;
    type?: string;
    cardinality?: '0..1' | '0..n';
    visibility?: 'public' | 'hidden' | 'restricted';
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    methods?: string[];
    allowedFor?: string[];
}
export interface Ui5Event {
    name: Ui5SettingName;
    visibility?: 'public' | 'hidden' | 'restricted';
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    parameters?: {
        [k: string]: {
            name: Ui5SettingName;
            type: string;
            description?: string;
            since?: Since;
            experimental?: Experimental;
            deprecated?: Deprecated;
        };
    };
    methods?: string[];
    allowPreventDefault?: boolean;
    enableEventBubbling?: boolean;
    allowedFor?: string[];
}
export interface EnumProperty {
    name: string;
    module?: ModuleName;
    export?: string;
    resource?: string;
    visibility?: 'public' | 'protected' | 'private' | 'restricted';
    static?: boolean;
    type?: string;
    description?: string;
    since?: Since;
    experimental?: Experimental;
    deprecated?: Deprecated;
    examples?: Examples;
    references?: References;
    value?: string | number;
    optional?: boolean;
    allowedFor?: string[];
}
export interface ObjConstructor {
    visibility?: 'public' | 'protected' | 'private' | 'restricted';
    parameters?: ObjCallableParameters;
    throws?: Exceptions;
    description?: string;
    examples?: Examples;
    references?: References;
    allowedFor?: string[];
    tsSkip?: boolean;
}
