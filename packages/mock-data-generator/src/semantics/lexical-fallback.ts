import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { SemanticClassification } from '../types.js';
import {
    SAP_PROTOCOL_ENTITY_SET_PREFIX,
    SAP_V2_DISPLAY_FORMAT,
    SAP_V2_TERM,
    VOCABULARY_TERM_SUFFIX
} from '../spec/odata.js';
import { capCodeListField } from './cap-code-lists.js';
import { semanticPropertyKey } from './classifier.js';
import { routedRoleCompatibility, semanticRoleDefinition } from './role-registry.js';
import { semanticRules, type WordLexicalRule } from './rule-store.js';
import { identifierTokens } from '../naming.js';

function has(words: ReadonlySet<string>, ...candidates: ReadonlyArray<string>): boolean {
    return candidates.some((candidate) => words.has(candidate));
}

// Framework bookkeeping fields carry no business meaning: CAP draft administration
// (`IsActiveEntity`, `HasDraftEntity`, `DraftAdministrativeData_DraftUUID`, `DraftEntity*`) and
// Fiori action-control flags (`*_ac`). Routing them as booleans, timestamps or users would generate
// business values for technical columns.
const TECHNICAL_FIELD_PATTERN = /^(?:Is|Has)(?:Active|Draft)Entity$|^Draft(?:AdministrativeData|Entity|UUID)|_ac$/iu;

/**
 * Whether a property is framework bookkeeping rather than business data.
 *
 * @param propertyName
 */
function isTechnicalField(propertyName: string): boolean {
    return TECHNICAL_FIELD_PATTERN.test(propertyName);
}

/**
 * The words of a name for the lexical rules: split as {@link tokens}, with each SAP abbreviation the
 * rule store marks as applied replaced by its full word, so the rules name only full words.
 *
 * @param name field name, label or description
 * @returns the words in name order
 */
function lexicalWords(name: string): ReadonlyArray<string> {
    return identifierTokens(name).map((token) => semanticRules().lexicalAbbreviations.get(token) ?? token);
}

/**
 * Whether a word rule matches: the type is one it names, the last word is one it names, every group
 * has a word of the name (consecutive words, in order, for an adjacent rule), and the name has none of the
 * excluded words.
 *
 * @param rule lexical word rule
 * @param tokens the words of the name, in order
 * @param primitiveType the field's primitive type
 * @returns true when the rule applies
 */
function wordRuleMatches(
    rule: WordLexicalRule,
    tokens: ReadonlyArray<string>,
    primitiveType: SchemaProperty['primitiveType']
): boolean {
    const words = new Set(tokens);
    const last = tokens.at(-1);
    const groupsMatch = rule.adjacent
        ? tokens.some((_, start) => rule.all.every((group, offset) => group.has(tokens[start + offset] ?? '')))
        : rule.all.every((group) => has(words, ...group));
    return (
        (rule.primitiveTypes === undefined || rule.primitiveTypes.has(primitiveType)) &&
        (rule.lastWord === undefined || (last !== undefined && rule.lastWord.has(last))) &&
        groupsMatch &&
        !has(words, ...rule.none)
    );
}

/**
 * The role of the first lexical rule of the rule store that matches a name; rule order is behaviour.
 * Exported for the rule-engine equivalence test.
 *
 * @param text field name, label or description
 * @param primitiveType the field's primitive type
 * @returns the role, or undefined when no rule matches
 */
export function lexicalRoleForText(text: string, primitiveType: SchemaProperty['primitiveType']): string | undefined {
    const fieldTokens = lexicalWords(text);
    for (const rule of semanticRules().lexicalRules) {
        if (rule.kind === 'first-word') {
            const word = fieldTokens.find((token) => rule.words.has(token));
            if (word) {
                return word;
            }
        } else if (wordRuleMatches(rule, fieldTokens, primitiveType)) {
            return rule.role;
        }
    }
    return undefined;
}

/**
 * Prefer a business-facing label over the technical property name.
 *
 * @param property - Canonical schema property.
 * @returns A conservative lexical role, when one is recognized.
 */
function lexicalRole(property: SchemaProperty): string | undefined {
    if (property.primitiveType === 'bool') {
        return 'boolean_flag';
    }
    const propertyTokens = identifierTokens(property.name);
    const propertyWords = new Set(propertyTokens);
    const technicalRole = lexicalRoleForText(property.name, property.primitiveType);
    if (property.name.toLowerCase().endsWith('_fc') || (has(propertyWords, 'field') && has(propertyWords, 'control'))) {
        return property.primitiveType === 'string' ? 'control_code' : 'field_control';
    }
    if (
        technicalRole &&
        (semanticRules().rolePolicy.authoritative.has(technicalRole) ||
            (propertyTokens.includes('text') && ['country_name', 'region_name'].includes(technicalRole)))
    ) {
        return technicalRole;
    }
    if (
        property.primitiveType === 'string' &&
        (property.maxLength ?? Number.POSITIVE_INFINITY) <= 2 &&
        propertyTokens.at(-1) === 'control'
    ) {
        return 'control_code';
    }
    if (
        has(propertyWords, 'created', 'changed', 'modified', 'updated') &&
        has(propertyWords, 'by', 'user') &&
        !has(propertyWords, 'name', 'description', 'fullname')
    ) {
        return 'audit_user';
    }
    if (property.primitiveType === 'string' && has(propertyWords, 'error') && has(propertyWords, 'has')) {
        return 'indicator';
    }
    const roles = new Set(
        [property.name, property.label, property.description]
            .filter((evidence): evidence is string => Boolean(evidence))
            .map((evidence) => lexicalRoleForText(evidence, property.primitiveType))
            .filter((role): role is string => role !== undefined)
    );
    return roles.size === 1 ? roles.values().next().value : undefined;
}

function preferredLexicalRole(property: SchemaProperty): string | undefined {
    for (const evidence of [property.label, property.description, property.name]) {
        if (evidence) {
            const role = lexicalRoleForText(evidence, property.primitiveType);
            if (role) {
                return role;
            }
        }
    }
    return undefined;
}

function specializedUnitRole(
    property: SchemaProperty
): 'duration_unit' | 'length_unit' | 'temperature_unit' | 'pressure_unit' | undefined {
    const roles = new Set(
        [property.name, property.label, property.description]
            .filter((evidence): evidence is string => Boolean(evidence))
            .map((evidence) => lexicalRoleForText(evidence, property.primitiveType))
            .map((role) => {
                if (role === 'duration_unit' || role === 'length_unit') {
                    return role;
                }
                if (role === 'temperature' || role === 'temperature_unit') {
                    return 'temperature_unit';
                }
                if (role === 'pressure' || role === 'pressure_unit') {
                    return 'pressure_unit';
                }
                return undefined;
            })
            .filter(
                (role): role is 'duration_unit' | 'length_unit' | 'temperature_unit' | 'pressure_unit' =>
                    role !== undefined
            )
    );
    return roles.size === 1 ? roles.values().next().value : undefined;
}

/**
 * Resolve only authoritative semantic markers whose meaning is unambiguous.
 *
 * @param property - Canonical schema property.
 * @param entity - Owning entity, when code-list metadata is available.
 * @returns The explicit metadata role, when one is present.
 */
function explicitMetadataRole(property: SchemaProperty, entity?: SchemaGraph['entities'][number]): string | undefined {
    const codeListField = entity ? capCodeListField(entity, property) : undefined;
    if (codeListField && 'role' in codeListField) {
        return codeListField.role;
    }
    const textOwner = entity?.properties.find((candidate) => candidate.links?.text === property.name);
    if (textOwner) {
        const ownerWords = new Set(identifierTokens(textOwner.name));
        if (entity?.codeList === 'currency' || has(ownerWords, 'currency', 'waers')) {
            return 'currency_name';
        }
        if (has(ownerWords, 'country', 'nation')) {
            return 'country_name';
        }
    }
    const links = property.links;
    if (links?.currency && (property.primitiveType === 'decimal' || property.primitiveType === 'int')) {
        return 'monetary_amount';
    }
    if (entity?.codeList === 'currency' && (links?.scale || links?.standardCode)) {
        return 'currency';
    }
    for (const annotation of property.annotations) {
        if (annotation.value === false || annotation.value === 'false') {
            continue;
        }
        const term = annotation.term.toLowerCase();
        if (
            (term === SAP_V2_TERM.displayFormat || term.endsWith(VOCABULARY_TERM_SUFFIX.displayFormat)) &&
            typeof annotation.value === 'string' &&
            annotation.value.toLowerCase() === SAP_V2_DISPLAY_FORMAT.nonNegative
        ) {
            return 'numeric_identifier';
        }
        const termRole = semanticRules().metadataRoles.vocabularyTerms.find(({ termSuffix }) =>
            term.endsWith(termSuffix)
        )?.role;
        if (termRole) {
            return termRole;
        }
        if (term.endsWith(VOCABULARY_TERM_SUFFIX.unit) && term.includes('measures')) {
            return 'quantity';
        }
        if (term === SAP_V2_TERM.semantics && typeof annotation.value === 'string') {
            const sapSemanticRole = semanticRules().metadataRoles.sapSemantics.get(annotation.value.toLowerCase());
            if (sapSemanticRole) {
                return sapSemanticRole;
            }
        }
    }
    return property.dataElement ? semanticRules().roleByDataElement.get(property.dataElement.toUpperCase()) : undefined;
}

function refinedMetadataRole(property: SchemaProperty, explicitRole: string): string {
    if (explicitRole === 'unit_of_measure') {
        return specializedUnitRole(property) ?? explicitRole;
    }
    const lexicalRefinement = preferredLexicalRole(property);
    return lexicalRefinement !== undefined &&
        semanticRules().rolePolicy.refinableTo.get(explicitRole)?.has(lexicalRefinement) === true
        ? lexicalRefinement
        : explicitRole;
}

function acceptedClassification(
    role: string,
    source: SemanticClassification['source'],
    candidate?: SemanticClassification
): SemanticClassification {
    return Object.freeze({
        ...(candidate ?? { confidence: source === 'metadata' ? 1 : semanticRules().thresholds.lexicalConfidence }),
        role,
        source,
        routeThreshold: source === 'classifier' ? (candidate?.routeThreshold ?? semanticRules().thresholds.route) : 0,
        abstentionReason: undefined
    });
}

function abstention(
    candidate: SemanticClassification | undefined,
    reason: NonNullable<SemanticClassification['abstentionReason']>
): SemanticClassification {
    return Object.freeze({
        role: 'unknown',
        confidence: candidate?.confidence ?? 0,
        source: 'unknown',
        ...(candidate?.routeThreshold === undefined ? {} : { routeThreshold: candidate.routeThreshold }),
        ...(candidate?.predictionSetSize === undefined ? {} : { predictionSetSize: candidate.predictionSetSize }),
        ...(candidate?.top === undefined ? {} : { top: candidate.top }),
        abstentionReason: reason
    });
}

/**
 * Whether a string field displays the name of an organisation, from the name words of the rule store. The
 * word before a field's display word is the head of its name and names what is displayed: an organisation
 * when it is a subject word; with no word before it, the field displays its entity, an organisation when
 * the entity's name has a subject word. A text of a code whose name has a subject word also displays an
 * organisation.
 *
 * @param entity the field's entity
 * @param property the field
 * @returns true when the field displays an organisation name
 */
function hasOrganizationDisplayEvidence(entity: SchemaGraph['entities'][number], property: SchemaProperty): boolean {
    if (property.primitiveType !== 'string') {
        return false;
    }
    const { subjectWords, displayWords } = semanticRules().rolePolicy.organizationNameEvidence;
    const hasSubject = (words: ReadonlyArray<string>): boolean => words.some((word) => subjectWords.has(word));
    const owner = entity.properties.find((candidate) => candidate.links?.text === property.name);
    if (owner !== undefined && hasSubject(identifierTokens(owner.name))) {
        return true;
    }
    const propertyWords = identifierTokens(property.name).filter((word) => !/^\d+$/u.test(word));
    const entityWords = identifierTokens(`${entity.name} ${entity.entitySetName}`);
    const display = propertyWords.findLastIndex((word) => displayWords.has(word));
    if (display < 0) {
        return false;
    }
    const head = propertyWords[display - 1];
    return head === undefined ? hasSubject(entityWords) : subjectWords.has(head);
}

function lexicalFallbackIsSafe(
    entity: SchemaGraph['entities'][number],
    property: SchemaProperty,
    role: string
): boolean {
    if (semanticRules().rolePolicy.lexicalBlocked.has(role)) {
        return false;
    }
    if (semanticRoleDefinition(role)?.lexicalPrecisionGate === true) {
        return true;
    }
    // `time` is kept out of name-only routing, but a column the schema declares as a time of day
    // is not name-only evidence: the declared type and the name agree independently. Decided here
    // rather than in the registry, which would invalidate the packaged classifier head.
    if (role === 'time' && property.primitiveType === 'time') {
        return true;
    }
    // RAP generates `<field>_fc` field-control properties; the suffix is a framework convention, not a
    // naming guess, so an integer `_fc` column is the field-control state of its field.
    if (role === 'field_control' && property.primitiveType === 'int' && property.name.toLowerCase().endsWith('_fc')) {
        return true;
    }
    return role === 'org_name' && hasOrganizationDisplayEvidence(entity, property);
}

export function semanticRoleCandidate(
    entity: SchemaGraph['entities'][number],
    property: SchemaProperty
): string | undefined {
    const words = new Set(identifierTokens(property.name));
    if (has(words, 'iban')) {
        return 'iban';
    }
    if (has(words, 'bic', 'swift')) {
        return 'bic';
    }
    if (has(words, 'bank') && has(words, 'internal') && has(words, 'id')) {
        return 'bank_account_internal_id';
    }
    if (has(words, 'country') && has(words, 'name', 'text', 'description')) {
        return 'country_name';
    }
    const textOwner = entity.properties.find((candidate) => candidate.links?.text === property.name);
    if (textOwner) {
        const ownerWords = new Set(identifierTokens(textOwner.name));
        if (entity.codeList === 'currency' || has(ownerWords, 'currency', 'waers')) {
            return 'currency_name';
        }
        if (has(ownerWords, 'country', 'nation')) {
            return 'country_name';
        }
    }
    if (property.primitiveType === 'string' && lexicalRole(property) === 'numeric_identifier') {
        return 'numeric_identifier';
    }
    if (
        property.primitiveType === 'string' &&
        has(words, 'id', 'identifier', 'key', 'reference', 'ref') &&
        !has(words, 'name', 'text', 'description', 'status')
    ) {
        return 'business_identifier';
    }
    if (hasOrganizationDisplayEvidence(entity, property)) {
        return 'org_name';
    }
    // Generic display labels are weaker evidence than an explicit technical semantic name.
    if (/^(?:description|text|name)$/iu.test(property.label ?? '')) {
        const technical = lexicalRoleForText(property.name, property.primitiveType);
        if (
            technical &&
            ['person_full_name', 'person_first_name', 'person_last_name', 'region_name'].includes(technical)
        ) {
            return technical;
        }
    }
    return lexicalRole(property) ?? preferredLexicalRole(property);
}

/** The compatibility of a candidate role with a field. */
type RoleCompatibility = ReturnType<typeof routedRoleCompatibility>;

/** The classifier and lexical candidates of one field without a metadata role, and how each fits it. */
interface FieldCandidates {
    /** The classifier's decision, when it classified the field. */
    classifier: SemanticClassification | undefined;
    classifierCompatibility: RoleCompatibility | undefined;
    /** The classifier's role when it is compatible with the field. */
    classifierRole: string | undefined;
    /** The role the field name suggests. */
    lexicalRole: string | undefined;
    lexicalCompatibility: RoleCompatibility | undefined;
    /** The lexical role when it is compatible with the field. */
    compatibleLexicalRole: string | undefined;
    /** The compatible lexical role when it may also be accepted on its own, as a fallback. */
    lexicalFallback: string | undefined;
}

/**
 * Accept the lexical fallback when it is allowed, or abstain for the given reason.
 *
 * @param candidates the field's candidates
 * @param reason the abstention reason when no fallback is allowed
 * @returns the decision
 */
function lexicalFallbackOr(
    candidates: FieldCandidates,
    reason: NonNullable<SemanticClassification['abstentionReason']>
): SemanticClassification {
    return candidates.lexicalFallback !== undefined
        ? acceptedClassification(candidates.lexicalFallback, 'lexical-fallback')
        : abstention(candidates.classifier, reason);
}

/**
 * Decide between the classifier's and the lexical candidate of a field the classifier did not abstain
 * on: a classifier role must pass its route threshold and prediction set, and must outweigh a
 * disagreeing lexical role by its conflict threshold.
 *
 * @param candidates the field's candidates
 * @returns the decision
 */
function arbitrateCandidates(candidates: FieldCandidates): SemanticClassification {
    const { classifier, classifierCompatibility, classifierRole, lexicalRole, lexicalCompatibility } = candidates;
    const { compatibleLexicalRole } = candidates;
    if (classifierRole && classifier) {
        // A calibrated head carries its own per-role and per-family route threshold
        // (conformal calibration plus support floors); the registry default only
        // governs decisions that arrive without one.
        const threshold =
            classifier.routeThreshold ??
            semanticRoleDefinition(classifierRole)?.routeThreshold ??
            semanticRules().thresholds.route;
        const outsideSet = classifier.predictionSetSize !== undefined && classifier.predictionSetSize !== 1;
        const contradictsSet =
            classifier.predictionSet !== undefined &&
            (classifier.predictionSet.length !== 1 || classifier.predictionSet[0] !== classifierRole);
        if (classifier.confidence < threshold || outsideSet || contradictsSet) {
            return lexicalFallbackOr(
                candidates,
                classifier.confidence < threshold ? 'below-threshold' : 'conflicting-candidates'
            );
        }
    }

    if (classifierRole && compatibleLexicalRole && classifier) {
        if (classifierRole === compatibleLexicalRole) {
            return acceptedClassification(classifierRole, 'classifier', classifier);
        }
        const definition = semanticRoleDefinition(classifierRole);
        const conflictThreshold = Math.max(
            classifier.routeThreshold ?? definition?.routeThreshold ?? semanticRules().thresholds.route,
            definition?.conflictThreshold ?? semanticRules().thresholds.conflict
        );
        if (classifier.predictionSetSize === 1 && classifier.confidence >= conflictThreshold) {
            return acceptedClassification(classifierRole, 'classifier', classifier);
        }
        return lexicalFallbackOr(candidates, 'conflicting-candidates');
    }

    if (classifierRole && classifier) {
        // The confidence and prediction-set gates above have already passed.
        return acceptedClassification(classifierRole, 'classifier', classifier);
    }

    if (compatibleLexicalRole) {
        return lexicalFallbackOr(candidates, 'lexical-gate');
    }

    if (classifier && classifierCompatibility && classifierCompatibility !== 'compatible') {
        return abstention(classifier, classifierCompatibility);
    }
    if (lexicalRole && lexicalCompatibility && lexicalCompatibility !== 'compatible') {
        return abstention(classifier, lexicalCompatibility);
    }
    return abstention(classifier, 'no-candidate');
}

/**
 * Decide the role of one field: a compatible metadata role first, then no role for technical and
 * code-list companion fields, then the classifier and lexical candidates.
 *
 * @param entity the field's entity
 * @param property the field
 * @param learned the classifier's decisions by semantic key
 * @returns the decision
 */
function arbitrateField(
    entity: SchemaGraph['entities'][number],
    property: SchemaProperty,
    learned: ReadonlyMap<string, SemanticClassification>
): SemanticClassification {
    const key = semanticPropertyKey(entity.entitySetName, property.name);
    const metadataRole = explicitMetadataRole(property, entity);
    if (metadataRole) {
        const refinedRole = refinedMetadataRole(property, metadataRole);
        const compatibility = routedRoleCompatibility(refinedRole, property);
        return compatibility === 'compatible'
            ? acceptedClassification(refinedRole, 'metadata')
            : abstention(undefined, compatibility);
    }

    const classifier = learned.get(key);
    // CAP code-list companions (a currency symbol, an ISO numeric code, a language name) have a
    // fixed meaning but no semantic role; the code-list provider fills them from the row's code.
    if (isTechnicalField(property.name) || capCodeListField(entity, property) !== undefined) {
        return abstention(classifier, 'technical-field');
    }
    const lexicalRole = semanticRoleCandidate(entity, property);
    const classifierCompatibility = classifier ? routedRoleCompatibility(classifier.role, property) : undefined;
    const lexicalCompatibility = lexicalRole ? routedRoleCompatibility(lexicalRole, property) : undefined;
    const classifierRole = classifierCompatibility === 'compatible' ? classifier?.role : undefined;
    const compatibleLexicalRole = lexicalCompatibility === 'compatible' ? lexicalRole : undefined;
    const lexicalFallback =
        compatibleLexicalRole !== undefined && lexicalFallbackIsSafe(entity, property, compatibleLexicalRole)
            ? compatibleLexicalRole
            : undefined;
    const candidates: FieldCandidates = {
        classifier,
        classifierCompatibility,
        classifierRole,
        lexicalRole,
        lexicalCompatibility,
        compatibleLexicalRole,
        lexicalFallback
    };
    const classifierAbstained = classifier?.role === 'unknown' || classifier?.top?.[0]?.role === 'unknown';
    if (classifierAbstained) {
        return lexicalFallbackOr(candidates, 'classifier-unknown');
    }
    return arbitrateCandidates(candidates);
}

/**
 * Arbitrate classifier, metadata, and lexical candidates conservatively.
 *
 * @param graph
 * @param learned
 */
export function arbitrateSemanticClassifications(
    graph: SchemaGraph,
    learned: ReadonlyMap<string, SemanticClassification>
): ReadonlyMap<string, SemanticClassification> {
    const resolved = new Map<string, SemanticClassification>();
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            resolved.set(
                semanticPropertyKey(entity.entitySetName, property.name),
                arbitrateField(entity, property, learned)
            );
        }
    }
    acceptConcepts(graph, learned, resolved);
    return resolved;
}

// Only these abstentions mean "no role fits"; metadata conflicts, key policy, framework fields and
// domain gates keep their decision.
const CONCEPT_ELIGIBLE_ABSTENTIONS = new Set<SemanticClassification['abstentionReason']>([
    'no-candidate',
    'classifier-unknown',
    'below-threshold',
    'conflicting-candidates',
    'incompatible-type',
    'lexical-gate'
]);

/**
 * Give a field that no role accepted the concept of the classifier's prototype head (head B), when
 * the field is an ordinary value column of an application entity set: never a key, a flag, a UUID, a
 * framework field or a column of a SAP Gateway protocol set.
 *
 * @param graph schema graph
 * @param learned classifier decisions, which carry the prototype-head match
 * @param resolved arbitrated decisions, updated in place
 */
function acceptConcepts(
    graph: SchemaGraph,
    learned: ReadonlyMap<string, SemanticClassification>,
    resolved: Map<string, SemanticClassification>
): void {
    for (const entity of graph.entities) {
        if (entity.entitySetName.startsWith(SAP_PROTOCOL_ENTITY_SET_PREFIX)) {
            continue;
        }
        for (const property of entity.properties) {
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const decision = resolved.get(key);
            const concept = learned.get(key)?.concept;
            // A recognized role keeps its decision but carries the concept as a fallback, used when the
            // semantic plan later finds that no provider can serve the role.
            if (concept !== undefined && decision !== undefined && decision.role !== 'unknown' && !decision.concept) {
                resolved.set(key, Object.freeze({ ...decision, concept }));
                continue;
            }
            if (
                concept === undefined ||
                decision?.role !== 'unknown' ||
                !CONCEPT_ELIGIBLE_ABSTENTIONS.has(decision.abstentionReason) ||
                property.isKey ||
                property.enumValues !== undefined ||
                (property.primitiveType !== 'string' &&
                    property.primitiveType !== 'int' &&
                    property.primitiveType !== 'decimal')
            ) {
                continue;
            }
            resolved.set(
                key,
                Object.freeze({ role: 'unknown', confidence: concept.similarity, source: 'concept', concept })
            );
        }
    }
}
