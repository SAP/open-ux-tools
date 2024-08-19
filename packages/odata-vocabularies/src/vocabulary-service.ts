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
    VocabulariesInformation,
    TypeDefinition,
    EnumType
} from './types/vocabulary-service';
import { TermApplicability, CDS_VOCABULARY_NAMESPACE, CDS_VOCABULARY_ALIAS } from './types/vocabulary-service';
import { loadVocabulariesInformation } from './loader';
import type { VocabularyNamespace, VocabularyAlias } from './resources';
import { NAMESPACE_TO_ALIAS } from './resources';
import type {
    TargetKind,
    FullyQualifiedName,
    SimpleIdentifier,
    FullyQualifiedTypeName,
    NameQualifier,
    QualifiedName,
    NamespaceString,
    AliasInformation
} from '@sap-ux/odata-annotation-core-types';
import { TERM_KIND, COMPLEX_TYPE_KIND, TYPE_DEFINITION_KIND, PROPERTY_KIND } from '@sap-ux/odata-annotation-core-types';
type ElementType = TypeDefinition | EnumType | ComplexType | Term | ComplexTypeProperty | EnumValue;

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
    public readonly upperCaseNameMap: Map<string, string | Map<string, string>>;
    readonly cdsVocabulary: CdsVocabulary;

    /**
     *
     * @param fullyQualifiedName Fully qualified name
     * @returns Namespace and simple identifier
     */
    private resolveName(fullyQualifiedName: FullyQualifiedName): {
        namespace: NamespaceString;
        name: SimpleIdentifier;
    } {
        const parts = (fullyQualifiedName || '').trim().split('.');
        const name = parts.pop() ?? '';
        const namespace = parts.join('.');
        return { namespace, name };
    }

    /**
     * Get alias qualified name.
     * If no matching alias is found, then uses the parameter itself.
     *
     * @param qualifiedName Identifier in <Namespace|Alias>.<Name>  format
     * @param aliasInfo alias information
     * @returns qualified name.
     */
    private toAliasQualifiedName(qualifiedName: QualifiedName, aliasInfo: AliasInformation): string {
        const resolvedName = this.resolveName(qualifiedName);
        const alias = resolvedName.namespace ? aliasInfo.reverseAliasMap[resolvedName.namespace] : undefined;
        const aliasQualifiedName = alias ? `${alias}.${resolvedName.name}` : qualifiedName;
        return aliasQualifiedName;
    }

    /**
     *
     * @param type Name of the type that will be checked
     * @param complyingType Name of the type to check against
     * @returns True if types are compatible
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
                if (complyingTypeDef?.underlyingType) {
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
     * @param includeCds Flag indicating if CDS vocabulary be loaded
     * @param includeCdsAnalytics (for includeCds=true only) Flag indicating if additional vocabularies for CDS analytics should be loaded
     * @returns Vocabulary service instance
     */
    constructor(includeCds?: boolean, includeCdsAnalytics?: boolean) {
        if (!includeCds && includeCdsAnalytics) {
            throw new Error(
                'Vocabulary service instantiation: invalid parameterization includeCds=false and includeCdsAnalytics=true'
            );
        }
        let vocabularyInformation = loadVocabulariesInformation(includeCds, includeCdsAnalytics);
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
                        (item.kind === 'Term' && item.cdsName) ||
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
            appliesTo: ['Property'], //modified
            facets: { isNullable: true }
        };
        const insertable: Term = {
            kind: 'Term', // modified
            name: 'Org.OData.Capabilities.V1.Insertable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be inserted',
            defaultValue: true,
            appliesTo: ['EntitySet'] //added
        };
        const updatable: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Updatable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be updated',
            defaultValue: true,
            appliesTo: ['EntitySet']
        };
        const deletable: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Deletable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be deleted',
            defaultValue: true,
            appliesTo: ['EntitySet']
        };
        const readable: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Readable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be retrieved',
            defaultValue: true,
            appliesTo: ['EntitySet']
        };
        // End of CDS specific shortcut annotation terms

        // set TextArrangement to dictionary map
        if (!vocabularyInformation.dictionary.has('com.sap.vocabularies.Common.v1.TextArrangement')) {
            vocabularyInformation.dictionary.set('com.sap.vocabularies.Common.v1.TextArrangement', TextArrangement);
        }

        // set TextArrangement to byTarget map
        const propertyTarget = vocabularyInformation.byTarget.get('Property');
        if (propertyTarget && !propertyTarget.has(TextArrangement.name)) {
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
        if (!entitySetTarget) {
            return vocabularyInformation;
        }
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
     * @param namespace Namespace
     * @returns Sap Oasis Vocabulary Alias;
     */
    getDefaultAlias(namespace: string): VocabularyAlias | undefined {
        return NAMESPACE_TO_ALIAS.get(namespace as VocabularyNamespace);
    }

    /**
     * Returns map of all vocabularies supported by this library.
     *
     * @returns - map of vocabularies
     */
    getVocabularies(): Map<NamespaceString, Vocabulary> {
        return this.supportedVocabularies;
    }

    /**
     * Returns the supported namespace for a qualified name.
     *
     * @param name - Qualified name, i.e. <Namespace|Alias>.<Name>
     * @returns - namespace for a qualified name
     */
    getVocabularyNamespace(name: QualifiedName): NamespaceString | undefined {
        let vocabulary = this.getVocabulary(name);
        if (vocabulary) {
            return vocabulary.namespace;
        }

        const resolvedTermNamespace = this.resolveName(name).namespace;
        if (resolvedTermNamespace) {
            vocabulary = this.getVocabulary(resolvedTermNamespace);
        }
        return vocabulary?.namespace;
    }

    /**
     * Returns information about a vocabulary identified by its name qualifier.
     *
     * @param nameQualifier - Name qualifier.
     * @returns - vocabulary information
     */
    getVocabulary(nameQualifier: NameQualifier): Vocabulary | null {
        const namespace = this.namespaceByDefaultAlias.get(nameQualifier) ?? (nameQualifier as VocabularyNamespace);
        return this.supportedVocabularies.get(namespace) ?? null;
    }

    /**
     * Returns all terms which are applicable for a given context.
     *
     * The context is defined by the following parameters.
     *
     * @param targetKinds - Target kinds, see symbolic values in http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_Applicability
     * @param targetType  - Type name of the annotated element.
     * @returns - all terms which are applicable for a given context.
     */
    getTermsForTargetKinds(targetKinds: TargetKind[], targetType: FullyQualifiedTypeName): FullyQualifiedName[] {
        const uniqueTerms = new Set<string>();

        for (const targetKind of ['', ...targetKinds]) {
            const termsByTarget = this.byTarget.get(targetKind)?.keys() ?? [];
            for (const term of termsByTarget) {
                uniqueTerms.add(term);
            }
        }

        const terms = [...uniqueTerms.keys()];
        return terms.filter((termName) => {
            const term = this.dictionary.get(termName);
            if (term?.kind !== 'Term') {
                return false;
            } else if (term.constraints?.requiresType && targetType) {
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
            let applicable = this.byTarget.get('')?.has(termName);
            for (let i = 0; i < targetKinds.length && !applicable; i++) {
                applicable = this.byTarget.get(targetKinds[i])?.has(termName);
            }
            if (!applicable) {
                return TermApplicability.TermNotApplicable;
            } else if (targetType && term.constraints?.requiresType) {
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
     * Supplementary function which returns part of documentation describing vocabulary object type.
     *
     * @param element element object
     * @param elementType element type object
     * @param experimentalDescription experimental type description
     * @param aliasInfo - alias information
     * @returns array of markdown lines
     */
    private getElementTypeDescription(
        element: VocabularyObject | ComplexTypeProperty | EnumValue,
        elementType: VocabularyObject | undefined,
        experimentalDescription: string,
        aliasInfo?: AliasInformation
    ): MarkdownString[] {
        const values: MarkdownString[] = [];
        if (elementType?.description) {
            values.push(`**Type Description:** ${elementType.description} \n`);
        }

        if (elementType?.longDescription) {
            values.push(`**Type Long Description:** ${elementType.longDescription} \n`);
        }

        values.push(...this.getElementRequireTypeValue(element));

        if (elementType?.experimental) {
            values.push(`**Type Experimental:** ${experimentalDescription} \n`);
        }
        if (elementType?.deprecated) {
            values.push(`**Type Deprecated:** ${elementType.deprecatedDescription} \n`);
        }

        if (element.kind === COMPLEX_TYPE_KIND && element.baseType) {
            let type = element.baseType;
            if (aliasInfo) {
                type = this.toAliasQualifiedName(element.baseType, aliasInfo);
            }
            values.push(`**BaseType:** ${type} \n`);
        }
        return values;
    }

    /**
     * Returns the documentation for an vocabulary element.
     *
     * The result is an array of Markdown strings.
     *
     * @param name           - Fully qualified name of the element.
     * @param [propertyName] - Name of a property of the element (in case fName is a complex type and you want to get
     *                         the documentation of the property instead of the properties element)
     * @param aliasInfo      - Alias information
     * @returns - mark down string.
     */
    getDocumentation(
        name: FullyQualifiedName,
        propertyName?: SimpleIdentifier,
        aliasInfo?: AliasInformation
    ): MarkdownString[] {
        const values: MarkdownString[] = [];
        const { element, elementType, enumTypeDocumentation } = this.resolveDocumentationElement(name, propertyName);
        if (!element) {
            return values;
        }
        const experimentalTerm = this.getTerm('com.sap.vocabularies.Common.v1.Experimental');
        const experimentalDescription = `${experimentalTerm?.description ?? ''} ${
            experimentalTerm?.longDescription ?? ''
        }`;
        const languageDependentDesc = this.getTerm('Org.OData.Core.V1.IsLanguageDependent')?.description ?? '';

        values.push(...this.checkExperimentalElement(element, experimentalDescription));
        values.push(...this.checkDeprecatedElement(element));
        values.push(...this.getElementKindIsProperty(element));
        values.push(...this.getElementDescription(element));
        values.push(...this.getElementLongDescription(element));

        if (element.kind === TERM_KIND && element.baseTerm) {
            values.push(`**Base Term:** ${element.baseTerm} \n`);
        }
        values.push(...this.getElementAppliesToValue(element));

        values.push(...this.getElementKindIsMemberAndTerm(element, elementType, aliasInfo));

        values.push(...this.getElementTypeDescription(element, elementType, experimentalDescription, aliasInfo));

        values.push(...this.getElementIsLanguageDependent(element, languageDependentDesc));

        values.push(...this.getElementDefaultValue(element));

        if (element.kind !== 'Member' && element.kind !== 'EnumType') {
            values.push(this.getFormattedNullableText(element));
        }

        if (enumTypeDocumentation.length > 0) {
            values.unshift(...enumTypeDocumentation);
        }

        if (
            (element.kind === COMPLEX_TYPE_KIND || element.kind === PROPERTY_KIND || element.kind === TERM_KIND) &&
            element.constraints?.applicableTerms
        ) {
            let applicableTerms = element.constraints.applicableTerms;
            if (aliasInfo) {
                applicableTerms = applicableTerms.map((fullyQualifiedName) =>
                    this.toAliasQualifiedName(fullyQualifiedName, aliasInfo)
                );
            }
            // In Markdown you need to append \n\n for opening a new paragraph, and two spaces + '\n` for new line
            values.push(`**Applicable Terms:**  \n${applicableTerms.join('  \n')} \n`);
        }

        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @param experimentalDescription - description
     * @returns - values
     */
    checkExperimentalElement(element: ElementType, experimentalDescription: string): MarkdownString[] {
        const values: MarkdownString[] = [];

        if (element.experimental) {
            const experimental = element.kind === 'Member' ? `**Enum Value Experimental:**` : `**Experimental:**`;
            values.push(`${experimental} ${experimentalDescription} \n`);
        }

        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    checkDeprecatedElement(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];

        if (element.deprecated) {
            const deprecated = element.kind === 'Member' ? `**Enum Value Deprecated:**` : `**Deprecated:**`;
            values.push(`${deprecated} ${element.deprecatedDescription} \n`);
        }

        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    getElementKindIsProperty(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];

        if (element?.kind !== 'Property') {
            const kind = element.kind === 'Member' ? `**Enum Value Kind:**` : `**Kind:**`;
            values.push(`${kind} ${element.kind} \n`);
        }

        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @param elementType - element type
     * @param aliasInfo - alias information
     * @returns - values
     */
    getElementKindIsMemberAndTerm(
        element: ElementType,
        elementType: VocabularyObject | undefined,
        aliasInfo?: AliasInformation
    ): MarkdownString[] {
        const values: MarkdownString[] = [];
        if (element.kind !== 'Member' && elementType?.kind !== 'Term') {
            values.push(this.getFormattedTypeText(element, elementType, aliasInfo));
            if (element.kind === 'Property' && element.constraints?.derivedTypeConstraints) {
                values.push(`**Derived type(s):** ${element.constraints.derivedTypeConstraints.join(', ')} \n`);
            }
        }
        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @param languageDependentDesc - string
     * @returns - values
     */
    getElementIsLanguageDependent(element: ElementType, languageDependentDesc: string): MarkdownString[] {
        const values: MarkdownString[] = [];
        if ((element.kind === TERM_KIND || element.kind === 'Property') && element.constraints?.isLanguageDependent) {
            values.push(`**IsLanguageDependent:** ${languageDependentDesc} \n`);
        }
        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    getElementDefaultValue(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];
        if ((element.kind === TERM_KIND || element.kind === 'Property') && element.defaultValue) {
            values.push(`**DefaultValue:** ${element.defaultValue} \n`);
        }
        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    getElementAppliesToValue(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];
        if (element.kind === TERM_KIND && element.appliesTo && element.appliesTo?.length > 0) {
            values.push(`**Applies To:** ${element.appliesTo.join('  ')} \n`);
        }
        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    getElementRequireTypeValue(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];
        if ((element.kind === 'Term' || element.kind === 'Property') && element.constraints?.requiresType) {
            values.push(`**Require Type:** ${element.constraints.requiresType} \n`);
        }
        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    getElementDescription(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];
        if (element.description) {
            const description = element.kind === 'Member' ? `**Enum Value Description:**` : `**Description:**`;
            values.push(`${description} ${element.description} \n`);
        }
        return values;
    }

    /**
     *
     * @param element  - element and element type
     * @returns - values
     */
    getElementLongDescription(element: ElementType): MarkdownString[] {
        const values: MarkdownString[] = [];
        if (element.longDescription) {
            const longDescription =
                element.kind === 'Member' ? `**Enum Value Long Description:**` : `**Long Description:**`;
            values.push(`${longDescription} ${element.longDescription} \n`);
        }
        return values;
    }

    /**
     *
     * @param name         - Fully qualified name of the element.
     * @param propertyName - Name of a property of the element.
     * @returns - element and element type
     */
    private resolveDocumentationElement(
        name: FullyQualifiedName,
        propertyName?: SimpleIdentifier
    ): {
        element: VocabularyObject | ComplexTypeProperty | EnumValue | undefined;
        elementType: VocabularyObject | undefined;
        enumTypeDocumentation: string[];
    } {
        let element: VocabularyObject | ComplexTypeProperty | EnumValue | undefined;
        let elementType: VocabularyObject | undefined;
        const enumTypeDocumentation = [];
        element = this.getTerm(name) ?? this.getType(name);
        if (element) {
            if (element.kind === 'Term') {
                elementType = this.getElementType(element);
            } else if (element.kind === 'ComplexType' && propertyName) {
                const expandedComplexType = this.getComplexType(name);
                element = expandedComplexType?.properties?.get(propertyName);
                if (element) {
                    elementType = this.getElementType(element);
                }
            } else if (element.kind === 'EnumType' && propertyName) {
                enumTypeDocumentation.push(...this.getDocumentation(name));

                element = element.values.find((value) => value.name === propertyName);
            }
        }
        return {
            element,
            elementType,
            enumTypeDocumentation
        };
    }

    /**
     *
     * @param element Vocabulary object
     * @returns - vocabulary object
     */
    private getElementType(element: Term | ComplexTypeProperty): VocabularyObject | undefined {
        return this.getType(element.type) ?? this.getTerm(element.type);
    }

    /**
     *
     * @param element Vocabulary object
     * @param elementType Vocabulary type object
     * @param aliasInfo - alias information
     * @returns - element type
     */
    private getFormattedTypeText(
        element: VocabularyObject | ComplexTypeProperty,
        elementType?: VocabularyType,
        aliasInfo?: AliasInformation
    ): string {
        let sResultText = '';
        if (element.kind === TERM_KIND || element.kind === 'Property') {
            let type = element.isCollection && element.type ? `Collection(${element.type}) \n` : element.type;
            if (aliasInfo) {
                type = this.toAliasQualifiedName(type, aliasInfo);
            }
            if (elementType?.experimental) {
                sResultText = `**Type:** ${type}(**experimental**) \n`;
            } else if (elementType?.deprecated) {
                sResultText = `**Type:** ${type}(**deprecated**) \n`;
            } else {
                sResultText = `**Type:** ${type} \n`;
            }
        }

        return sResultText;
    }

    /**
     *
     * @param object Vocabulary object
     * @returns - text
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
        }

        return sResultText;
    }

    /**
     * Returns information about a term.
     *
     * @param termName - Fully qualified name of a term.
     * @returns - Term.
     */
    getTerm(termName: FullyQualifiedName): Term | undefined {
        const vocabularyObject = this.dictionary.get(termName);
        return vocabularyObject?.kind === TERM_KIND ? vocabularyObject : undefined;
    }

    /**
     * Returns information about a vocabulary type.
     *
     * @param typeName - Fully qualified name of the type.
     * @returns - information about a vocabulary type.
     */
    getType(typeName: FullyQualifiedName): VocabularyType | undefined {
        const vocabularyObject = this.dictionary.get(typeName);
        return vocabularyObject?.kind !== TERM_KIND ? vocabularyObject : undefined;
    }

    /**
     * Returns the names of all derived types for a given type (including the provided type name).
     *
     * @param typeName        - Name of the vocabulary type for which you want to get the derived types
     * @param includeAbstract - true: include names of abstract types in addition to concrete types,
     *                          false: return concrete types only
     * @returns - Returns the names of all derived types for a given type (including the provided type name)
     */
    getDerivedTypeNames(typeName: FullyQualifiedName, includeAbstract?: boolean): Set<FullyQualifiedName> {
        let names: { fName: FullyQualifiedName; isAbstract: boolean | undefined }[] = [];
        const type = this.dictionary.get(typeName);
        if (type && type.kind === COMPLEX_TYPE_KIND) {
            // collect all derived types
            names.push({ fName: typeName, isAbstract: type.isAbstract });
            const stack = [typeName];
            while (stack.length > 0) {
                const name = stack.shift();
                if (!name) {
                    continue;
                }
                const types = this.derivedTypesPerType.get(name) ?? new Map<FullyQualifiedName, boolean>();
                for (const [derivedName, isAbstract] of types) {
                    names.push({ fName: derivedName, isAbstract: isAbstract });
                    stack.push(derivedName);
                }
            }
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
     * The result also contains the aggregated information of the base type chain.
     *
     * @param typeName - Fully qualified name of the type.
     * @returns complex type information for a given type name.
     */
    getComplexType(typeName: FullyQualifiedName): ExpandedComplexType | undefined {
        let complexType = this._getComplexType(typeName);
        if (!complexType) {
            return undefined;
        }

        const { baseType: _, ...rest } = complexType;
        const expandedComplexType: ExpandedComplexType = { baseTypes: [], ...rest };
        while (complexType?.baseType) {
            // isOpenType of base type might affect resolvedType: but currently not in supported vocabularies
            expandedComplexType.baseTypes.push(complexType.baseType);
            complexType = this._getComplexType(complexType.baseType);
            for (const [name, property] of complexType?.properties ?? []) {
                expandedComplexType.properties.set(name, property);
            }
        }
        return expandedComplexType;
    }

    /**
     *
     * @param name Fully qualified name of the type
     * @returns Complex type object if it exists
     */
    private _getComplexType(name: FullyQualifiedName): ComplexType | undefined {
        const dictionaryType = this.dictionary.get(name);
        return dictionaryType?.kind === COMPLEX_TYPE_KIND ? dictionaryType : undefined;
    }

    /**
     * Returns a property of an complex type.
     *
     * The result also contains the properties of the base type chain.
     *
     * @param typeName     - Fully qualified name of complex type.
     * @param propertyName - Name of the property to return.
     * @returns - property of an complex type.
     */
    getComplexTypeProperty(
        typeName: FullyQualifiedName,
        propertyName: SimpleIdentifier
    ): ComplexTypeProperty | undefined {
        let name: string | undefined = typeName;

        while (name) {
            const complexType = this._getComplexType(name);
            const property = complexType?.properties.get(propertyName);
            if (property) {
                return property;
            }
            name = complexType?.baseType;
        }

        return undefined;
    }
}
