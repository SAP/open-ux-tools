import type {
    ComplexType,
    ExpandedComplexType,
    MarkdownString,
    ComplexTypeProperty,
    Term,
    Vocabulary,
    VocabularyObject,
    VocabularyType,
    EnumValue,
    CdsVocabulary,
    VocabulariesInformation
} from './types/vocabularyService';
import {
    TermApplicability,
    CDS_VOCABULARY_NAMESPACE,
    CDS_VOCABULARY_ALIAS,
    TargetKindValue
} from './types/vocabularyService';
import { loadVocabulariesInformation } from './loader';
import type { VocabularyNamespace, VocabularyAlias } from './resources';
import { NAMESPACE_TO_ALIAS } from './resources';
import type {
    Namespace,
    TargetKind,
    FullyQualifiedName,
    SimpleIdentifier,
    FullyQualifiedTypeName,
    NameQualifier,
    QualifiedName
} from './types/baseTypes';
import { TERM_KIND, COMPLEX_TYPE_KIND, TYPE_DEFINITION_KIND } from './types/baseTypes';

/**
 * Vocabulary service class
 *
 * @class
 */
export class VocabularyService {
    private readonly dictionary: Map<FullyQualifiedName, VocabularyObject>;
    private readonly byTarget: Map<TargetKind | '', Set<FullyQualifiedName>>;
    private readonly supportedVocabularies: Map<VocabularyNamespace, Vocabulary>;
    private readonly namespaceByDefaultAlias: Map<SimpleIdentifier, VocabularyNamespace>;
    private readonly derivedTypesPerType: Map<FullyQualifiedName, Map<FullyQualifiedName, boolean>>;
    private readonly upperCaseNameMap: Map<string, string | Map<string, string>>;
    readonly cdsVocabulary: CdsVocabulary;

    /**
     *
     * @param fullyQualifiedName
     * @returns
     */
    private resolveName(fullyQualifiedName: FullyQualifiedName): { namespace: Namespace; name: SimpleIdentifier } {
        const parts = (fullyQualifiedName || '').trim().split('.');
        const name = parts.pop() || '';
        const namespace = parts.join('.');
        return { namespace, name };
    }

    /**
     *
     * @param type
     * @param complyingType
     * @returns {boolean}
     */
    private isOfType(type: FullyQualifiedTypeName, complyingType: FullyQualifiedTypeName): boolean {
        let isOfType = false;
        if (type === complyingType) {
            isOfType = true;
        } else if (type.startsWith('Edm.')) {
            if (complyingType.startsWith('Edm.')) {
                // TODO check abstract base types (e.g. Edm.PrimitiveType) ?
                isOfType = complyingType === type;
            } else {
                const complyingTypeDef = this.getType(complyingType);
                if (complyingTypeDef && complyingTypeDef.underlyingType) {
                    isOfType = complyingTypeDef.underlyingType === type;
                }
            }
        } else {
            const derivedTargetTypes = this.getDerivedTypeNames(type);
            isOfType = derivedTargetTypes.has(complyingType);
        }
        return isOfType;
    }

    /**
     *
     * @param includeCds
     * @returns {boolean}
     */
    constructor(includeCds?: boolean) {
        let vocabularyInformation = loadVocabulariesInformation(includeCds);
        // add cds specific annotations (TextArrangement and Capabilities) on fly
        vocabularyInformation = includeCds
            ? this.addCdsSpecificAnnotations(vocabularyInformation)
            : vocabularyInformation;
        this.dictionary = vocabularyInformation.dictionary;
        this.byTarget = vocabularyInformation.byTarget;
        this.supportedVocabularies = vocabularyInformation.supportedVocabularies;
        this.namespaceByDefaultAlias = vocabularyInformation.namespaceByDefaultAlias;
        this.derivedTypesPerType = vocabularyInformation.derivedTypesPerType;
        this.upperCaseNameMap = vocabularyInformation.upperCaseNameMap;
        // TODO this should be filled by information coming from the CDS vocabulary file
        this.cdsVocabulary = {
            namespace: CDS_VOCABULARY_NAMESPACE,
            alias: CDS_VOCABULARY_ALIAS,
            nameMap: new Map(),
            reverseNameMap: new Map(),
            groupNames: new Set(),
            singletonNames: new Set()
        };
        if (includeCds) {
            this.dictionary.forEach((item) => {
                const resolvedName = this.resolveName(item.name);
                if (resolvedName.namespace === CDS_VOCABULARY_NAMESPACE) {
                    const name =
                        item['cdsName'] ||
                        resolvedName.name
                            .replace(/([A-Z])/g, ' $1')
                            .trim()
                            .split(' ')
                            .join('.')
                            .toLowerCase();
                    const property = `${CDS_VOCABULARY_ALIAS}.${resolvedName.name}`;
                    this.cdsVocabulary.nameMap.set(name, property);
                    const nameSegments = name.split('.');
                    if (nameSegments.length === 1) {
                        this.cdsVocabulary.singletonNames.add(name);
                    } else {
                        this.cdsVocabulary.groupNames.add(nameSegments[0]);
                    }
                }
            });

            this.cdsVocabulary.nameMap.forEach((value, key) => this.cdsVocabulary.reverseNameMap.set(value, key));
        }
    }

    /**
     * Add CDS specific annotation terms.
     *
     * CDS documentation recommends using a shortcut with below listed annotation terms.
     *
     * Common.TextArrangement.
     * Capabilities.Insertable.
     * Capabilities.Updatable.
     * Capabilities.Deletable.
     * Capabilities.Readable.
     *
     * @param vocabularyInformation - vocabulary information
     * @returns vocabularyInformation - vocabularyInformation added with shortcut terms
     */
    private addCdsSpecificAnnotations(vocabularyInformation: VocabulariesInformation): VocabulariesInformation {
        // CDS specific(can be used as shortcut) annotation terms
        const TextArrangement: Term = {
            kind: 'Term',
            name: 'com.sap.vocabularies.Common.v1.TextArrangement',
            type: 'com.sap.vocabularies.UI.v1.TextArrangementType',
            isCollection: false,
            description: 'Describes the arrangement of a code or ID value and its text',
            longDescription: 'If used for a single property the Common.Text annotation is annotated',
            appliesTo: [TargetKindValue.Property], //modified
            facets: { isNullable: true }
        };
        const insertable: Term = {
            kind: 'Term', // modified
            name: 'Org.OData.Capabilities.V1.Insertable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be inserted',
            defaultValue: true,
            appliesTo: [TargetKindValue.EntitySet] //added
        };
        const updatable: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Updatable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be updated',
            defaultValue: true,
            appliesTo: [TargetKindValue.EntitySet]
        };
        const deletable: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Deletable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be deleted',
            defaultValue: true,
            appliesTo: [TargetKindValue.EntitySet]
        };
        const readable: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Readable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be retrieved',
            defaultValue: true,
            appliesTo: [TargetKindValue.EntitySet]
        };
        // End of CDS specific shortcut annotation terms

        // set TextArrangement to dictionary map
        if (!vocabularyInformation.dictionary.has('com.sap.vocabularies.Common.v1.TextArrangement')) {
            vocabularyInformation.dictionary.set('com.sap.vocabularies.Common.v1.TextArrangement', TextArrangement);
        }

        // set TextArrangement to byTarget map
        const propertyTarget = vocabularyInformation.byTarget.get('Property');
        if (!propertyTarget.has(TextArrangement.name)) {
            propertyTarget.add(TextArrangement.name);
        }

        // set capabilities Insertable cds term to dictionary map
        if (!vocabularyInformation.dictionary.has('Org.OData.Capabilities.V1.Insertable')) {
            vocabularyInformation.dictionary.set('Org.OData.Capabilities.V1.Insertable', insertable);
        }
        // set capabilities Deletable cds term to dictionary map
        if (!vocabularyInformation.dictionary.has('Org.OData.Capabilities.V1.Deletable')) {
            vocabularyInformation.dictionary.set('Org.OData.Capabilities.V1.Deletable', deletable);
        }
        // set capabilities Updatable cds term to dictionary map
        if (!vocabularyInformation.dictionary.has('Org.OData.Capabilities.V1.Updatable')) {
            vocabularyInformation.dictionary.set('Org.OData.Capabilities.V1.Updatable', updatable);
        }
        // set capabilities Readable cds term to dictionary map
        if (!vocabularyInformation.dictionary.has('Org.OData.Capabilities.V1.Readable')) {
            vocabularyInformation.dictionary.set('Org.OData.Capabilities.V1.Readable', readable);
        }

        // set capabilities Insertable to target map
        const entitySetTarget = vocabularyInformation.byTarget.get('EntitySet');
        if (!entitySetTarget.has('Org.OData.Capabilities.V1.Insertable')) {
            entitySetTarget.add('Org.OData.Capabilities.V1.Insertable');
        }
        // set capabilities Deletable to target map
        if (!entitySetTarget.has('Org.OData.Capabilities.V1.Deletable')) {
            entitySetTarget.add('Org.OData.Capabilities.V1.Deletable');
        }
        // set capabilities Updatable to target map
        if (!entitySetTarget.has('Org.OData.Capabilities.V1.Updatable')) {
            entitySetTarget.add('Org.OData.Capabilities.V1.Updatable');
        }
        // set capabilities Readable to target map
        if (!entitySetTarget.has('Org.OData.Capabilities.V1.Readable')) {
            entitySetTarget.add('Org.OData.Capabilities.V1.Readable');
        }

        return vocabularyInformation;
    }

    /**
     * Returns default alias.
     *
     * @param namespace
     * @returns {VocabularyAlias} Sap Oasis Vocabulary Alias;
     */
    getDefaultAlias(namespace: string): VocabularyAlias | undefined {
        return NAMESPACE_TO_ALIAS.get(namespace as VocabularyNamespace);
    }

    /**
     * Returns map of all vocabularies supported by this library.
     *
     * @returns {Map<Namespace, Vocabulary>} - map of vocabularies
     */
    getVocabularies(): Map<Namespace, Vocabulary> {
        return this.supportedVocabularies;
    }

    /**
     * Returns the supported namespace for a qualified name.
     *
     * @param name - Qualified name, i.e. <Namespace|Alias>.<Name>
     * @returns {Namespace} - namespace for a qualified name
     */
    getVocabularyNamespace(name: QualifiedName): Namespace {
        const resolvedTermNamespace = this.resolveName(name).namespace;
        const vocabulary = this.getVocabulary(name) || this.getVocabulary(resolvedTermNamespace);
        return vocabulary && vocabulary.namespace;
    }

    /**
     * Returns information about a vocabulary identified by its name qualifier.
     *
     * @param nameQualifier - Name qualifier.
     * @returns {Vocabulary | null} - vocabulary information
     */
    getVocabulary(nameQualifier: NameQualifier): Vocabulary | null {
        const namespace = this.namespaceByDefaultAlias.get(nameQualifier) || (nameQualifier as VocabularyNamespace);
        return this.supportedVocabularies.get(namespace) || null;
    }

    /**
     *  Returns all terms which are applicable for a given context.
     *
     * The context is defined by the following parameters.
     *
     * @param targetKinds - Target kinds, see symbolic values in http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_Applicability
     * @param targetType  - Type name of the annotated element.
     * @returns {FullyQualifiedName[]} - all terms which are applicable for a given context.
     */
    getTermsForTargetKinds(targetKinds: TargetKind[], targetType: FullyQualifiedTypeName): FullyQualifiedName[] {
        let terms = this.byTarget.has('') ? [...this.byTarget.get('').keys()] : [];
        targetKinds.forEach((targetKind) => {
            if (this.byTarget.has(targetKind)) {
                // eliminate duplicates
                terms = terms.concat([...this.byTarget.get(targetKind).keys()]);
                terms = [...new Set(terms).keys()];
            }
        });
        return terms.filter((termName) => {
            const term = this.dictionary.get(termName) as Term;
            if (term.constraints && term.constraints.requiresType && targetType) {
                return this.isOfType(term.constraints.requiresType, targetType);
            } else {
                return true;
            }
        });
    }

    /**
     * Check if the term is applicable in the given context.
     *
     * The context is described by parameters targetKind and targetType.
     * The result describes whether the term is applicable or gives a reason why it is not applicable.
     *
     * @param termName       - Name of vocabulary term
     * @param targetKinds     - Target kind, see symbolic values in http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_Applicability
     * @param targetType     - Type of the annotated element
     * @returns                TermApplicability: {IsValid|TermNotApplicable|TypeNotApplicable|UnknownTerm|UnknownVocabulary|UnSupportedVocabulary}
     */
    checkTermApplicability(
        termName: FullyQualifiedName,
        targetKinds: TargetKind[],
        targetType: FullyQualifiedTypeName
    ): TermApplicability {
        const term = this.getTerm(termName);
        const namespace = this.getVocabularyNamespace(termName);
        if (!term && !this.supportedVocabularies.has(namespace as VocabularyNamespace)) {
            return TermApplicability.UnSupportedVocabulary;
        } else if (!term) {
            return TermApplicability.UnknownTerm;
        } else {
            let applicable = this.byTarget.has('') && this.byTarget.get('').has(termName);
            for (let i = 0; i < targetKinds.length && !applicable; i++) {
                applicable = this.byTarget.has(targetKinds[i]) && this.byTarget.get(targetKinds[i]).has(termName);
            }
            if (!applicable) {
                return TermApplicability.TermNotApplicable;
            } else if (targetType && term.constraints && term.constraints.requiresType) {
                const requiredType = term.constraints.requiresType;
                return this.isOfType(requiredType, targetType)
                    ? TermApplicability.Applicable
                    : TermApplicability.TypeNotApplicable;
            } else {
                return TermApplicability.Applicable;
            }
        }
    }

    /**
     * Returns the documentation for an vocabulary element.
     *
     * The result is an array of Markdown strings.
     *
     * @param name           - Fully qualified name of the element.
     * @param [propertyName] - Name of a property of the element (in case fName is a complex type and you want to get
     *                         the documentation of the property instead of the properties element)
     * @returns {MarkdownString[]} - mark down string.
     */
    getDocumentation(name: FullyQualifiedName, propertyName?: SimpleIdentifier): MarkdownString[] {
        let element: VocabularyObject | ComplexTypeProperty | EnumValue;
        let elementType: VocabularyObject;
        let enumTypeDocumentation = [];
        let values: MarkdownString[] = [];
        element = this.getTerm(name) || this.getType(name);
        if (element) {
            if (element.kind === 'Term') {
                elementType = this.getElementType(element);
            } else if (element.kind === 'ComplexType' && propertyName) {
                const expandedComplexType = this.getComplexType(name);
                element = expandedComplexType.properties.get(propertyName);
                elementType = this.getElementType(element);
            } else if (element.kind === 'EnumType' && propertyName) {
                enumTypeDocumentation = enumTypeDocumentation.concat(this.getDocumentation(name));
                element = element.values.filter((value) => value.name === propertyName)[0] || null;
            }

            const experimentalTerm = this.getTerm('com.sap.vocabularies.Common.v1.Experimental');
            const experimentalDescription = `${experimentalTerm.description} ${experimentalTerm.longDescription}`;
            const languageDependentDesc = this.getTerm('Org.OData.Core.V1.IsLanguageDependent').description;

            if (element.experimental) {
                const experimental = element.kind === 'Member' ? `**Enum Value Experimental:**` : `**Experimental:**`;
                values.push(`${experimental} ${experimentalDescription} \n`);
            }
            if (element.deprecated) {
                const deprecated = element.kind === 'Member' ? `**Enum Value Depreacated:**` : `**Deprecated:**`;
                values.push(`${deprecated} ${element.deprecatedDescription} \n`);
            }
            if (element.kind && element.kind !== 'Property') {
                const kind = element.kind === 'Member' ? `**Enum Value Kind:**` : `**Kind:**`;
                values.push(`${kind} ${element.kind} \n`);
            }
            if (element.description) {
                const desciption = element.kind === 'Member' ? `**Enum Value Description:**` : `**Description:**`;
                values.push(`${desciption} ${element.description} \n`);
            }
            if (element.longDescription) {
                const longDesciption =
                    element.kind === 'Member' ? `**Enum Value Long Description:**` : `**Long Description:**`;
                values.push(`${longDesciption} ${element.longDescription} \n`);
            }
            if (element.kind === TERM_KIND && element.baseTerm) {
                values.push(`**Base Term:** ${element.baseTerm} \n`);
            }
            if (element.kind === TERM_KIND && element.appliesTo && element.appliesTo.length > 0) {
                values.push(`**Applies To:** ${element.appliesTo.join('  ')} \n`);
            }

            if (element.kind !== 'Member') {
                values.push(this.getFormattedTypeText(element, elementType as VocabularyType));
                if (element.kind === 'Property' && element.constraints?.derivedTypeConstraints) {
                    values.push(`**Derived type(s):** ${element.constraints.derivedTypeConstraints.join(', ')} \n`);
                }
            }

            if (elementType && elementType.description) {
                values.push(`**Type Description:** ${elementType.description} \n`);
            }

            if (elementType && elementType.longDescription) {
                values.push(`**Type Long Description:** ${elementType.longDescription} \n`);
            }

            if (
                (element.kind === 'Term' || element.kind === 'Property') &&
                element.constraints &&
                element.constraints.requiresType
            ) {
                values.push(`**Require Type:** ${element.constraints.requiresType} \n`);
            }

            if (elementType && elementType.experimental) {
                values.push(`**Type Experimental:** ${experimentalDescription} \n`);
            }
            if (elementType && elementType.deprecated) {
                values.push(`**Type Deprecated:** ${elementType.deprecatedDescription} \n`);
            }

            if (element.kind === COMPLEX_TYPE_KIND && element.baseType) {
                values.push(`**BaseType:** ${element.baseType} \n`);
            }

            if (
                (element.kind === TERM_KIND || element.kind === 'Property') &&
                element.constraints &&
                element.constraints.isLanguageDependent
            ) {
                values.push(`**IsLanguageDependent:** ${languageDependentDesc} \n`);
            }

            if ((element.kind === TERM_KIND || element.kind === 'Property') && element.defaultValue) {
                values.push(`**DefaultValue:** ${element.defaultValue} \n`);
            }

            if (element.kind !== 'Member' && element.kind !== 'EnumType') {
                values.push(this.getFormattedNullableText(element));
            }

            if (enumTypeDocumentation.length > 0) {
                values = enumTypeDocumentation.concat(values);
            }
        }

        return values;
    }

    /**
     *
     * @param element
     * @returns {object} - vocabulary object
     */
    private getElementType(element: Term | ComplexTypeProperty): VocabularyObject {
        return this.getType(element.type) || this.getTerm(element.type);
    }

    /**
     *
     * @param element
     * @param elementType
     * @returns {string} - element type
     */
    private getFormattedTypeText(element: VocabularyObject | ComplexTypeProperty, elementType: VocabularyType): string {
        let sResultText = '';
        if (element.kind === TERM_KIND || element.kind === 'Property') {
            const type = element.isCollection && element.type ? `Collection(${element.type}) \n` : element.type;
            if (elementType && elementType.experimental) {
                sResultText = `**Type:** ${type}(**experimental**) \n`;
            } else if (elementType && elementType.deprecated) {
                sResultText = `**Type:** ${type}(**deprecated**) \n`;
            } else {
                sResultText = `**Type:** ${type} \n`;
            }
        }

        return sResultText;
    }

    /**
     *
     * @param object
     * @returns {string} - text
     */
    private getFormattedNullableText(object: VocabularyObject | ComplexTypeProperty): string {
        let sResultText = '';
        const isNullable =
            (object.kind === TERM_KIND || object.kind === 'Property' || object.kind === TYPE_DEFINITION_KIND) &&
            !!object.facets &&
            !!object.facets.isNullable;
        const isCollection = (object.kind === TERM_KIND || object.kind === 'Property') && object.isCollection;

        if (isNullable && isCollection) {
            sResultText = `**Nullable Item:** ${isNullable} \n`;
        } else if (!isNullable && isCollection) {
            sResultText = `**Nullable Item:** false \n`;
        } else if (isNullable) {
            sResultText = `**Nullable:** true \n`;
        } else if (!isNullable) {
            sResultText = `**Nullable:** false \n`;
        } else {
            sResultText = '';
        }

        return sResultText;
    }

    /**
     * Returns information about a term.
     *
     * @param termName - Fully qualified name of a term.
     * @returns {Term} - Term.
     */
    getTerm(termName: FullyQualifiedName): Term {
        const vocabularyObject = this.dictionary.get(termName);
        return vocabularyObject && vocabularyObject.kind === TERM_KIND ? vocabularyObject : null;
    }

    /**
     * Returns information about a vocabulary type.
     *
     * @param typeName - Fully qualified name of the type.
     * @returns {VocabularyType} - information about a vocabulary type.
     */
    getType(typeName: FullyQualifiedName): VocabularyType | null {
        const vocabularyObject = this.dictionary.get(typeName);
        return vocabularyObject && vocabularyObject.kind !== TERM_KIND ? vocabularyObject : null;
    }

    /**
     * Returns the names of all derived types for a given type (including the provided type name).
     *
     * @param typeName        - Name of the vocabulary type for which you want to get the derived types
     * @param includeAbstract - true: include names of abstract types in addition to concrete types,
     *                          false: return concrete types only
     * @returns {Set<FullyQualifiedName>} - Returns the names of all derived types for a given type (including the provided type name)
     */
    getDerivedTypeNames(typeName: FullyQualifiedName, includeAbstract?: boolean): Set<FullyQualifiedName> {
        let names = [];
        const type = this.dictionary.get(typeName);
        const that = this;
        function collectDerivedTypes(name) {
            const derivedTypesMap = that.derivedTypesPerType?.get(name) || new Map();
            derivedTypesMap.forEach((isAbstract, derivedName) => {
                names.push({ fName: derivedName, isAbstract: isAbstract });
                collectDerivedTypes(derivedName);
            });
        }

        if (type && type.kind === COMPLEX_TYPE_KIND) {
            names.push({ fName: typeName, isAbstract: type.isAbstract as boolean });
            collectDerivedTypes(typeName);

            // filter out abstract types if required
            if (!includeAbstract) {
                names = names.filter((entry) => !entry.isAbstract);
            }
        }

        return new Set(names.map((entry) => entry.fName));
    }

    /**
     * Returns the complex type information for a given type name.
     *
     * The result also contains the aggregated information of the basetype chain.
     *
     * @param typeName - Fully qualified name of the type.
     * @returns {ExpandedComplexType} complex type information for a given type name.
     */
    getComplexType(typeName: FullyQualifiedName): ExpandedComplexType {
        let expandedComplexType: ExpandedComplexType | null = null;
        const dictionaryType = this.dictionary.get(typeName);
        let complexType: ComplexType | null =
            dictionaryType && dictionaryType.kind === COMPLEX_TYPE_KIND ? dictionaryType : null;
        if (complexType) {
            expandedComplexType = Object.assign({}, complexType, { baseTypes: [] });
            while (complexType && complexType.baseType) {
                // isOpenType of base type might affect resolvedType: but currently not in supported vocabularies
                expandedComplexType.baseTypes.push(complexType.baseType);
                complexType = this.dictionary.get(complexType.baseType) as ComplexType;
                if (complexType && complexType.properties) {
                    complexType.properties.forEach((property, name) => {
                        expandedComplexType && expandedComplexType.properties.set(name, property);
                    });
                }
            }
            delete expandedComplexType['baseType'];
        }
        if (expandedComplexType) {
            delete expandedComplexType['baseType'];
        }
        return expandedComplexType as ExpandedComplexType;
    }

    /**
     * Returns a property of an complex type.
     *
     * The result also contains the properties of the basetype chain.
     *
     * @param typeName     - Fully qualified name of complex type.
     * @param propertyName - Name of the property to return.
     * @returns {ComplexTypeProperty} - property of an complex type.
     */
    getComplexTypeProperty(typeName: FullyQualifiedName, propertyName: SimpleIdentifier): ComplexTypeProperty {
        let property: ComplexTypeProperty | null = null;
        const dictionaryType = this.dictionary.get(typeName);
        let complexType: ComplexType | null =
            dictionaryType && dictionaryType.kind === COMPLEX_TYPE_KIND ? dictionaryType : null;
        if (complexType) {
            property = complexType.properties.get(propertyName) as ComplexTypeProperty;
            while (!property && complexType.baseType) {
                complexType = this.dictionary.get(complexType.baseType) as ComplexType;
                property = complexType.properties.get(propertyName) as ComplexTypeProperty;
            }
        }
        return property as ComplexTypeProperty;
    }
}
