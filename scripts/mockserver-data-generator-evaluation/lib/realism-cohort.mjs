import { dirname, isAbsolute, resolve, sep } from 'node:path';

const DOMAINS = Object.freeze(['finance', 'sales', 'service', 'maintenance', 'master-data', 'non-sap']);
const SCHEMA_FORMATS = Object.freeze(['edmx-v2', 'edmx-v4', 'csn']);
const REQUIRED_ASSERTION_TYPES = Object.freeze([
    'code-text',
    'amount-currency',
    'quantity-unit',
    'date-range',
    'person-address',
    'status',
    'draft',
    'value-help'
]);
const REQUIRED_ISOLATION_INPUTS = Object.freeze([
    'classifier-train',
    'classifier-validation',
    'classifier-public-real',
    'classifier-reviewed-fixtures',
    'sft-train',
    'sft-eval',
    'pilot-model-selection'
]);
const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_REVISION = /^[a-f0-9]{40}$/u;
const IDENTIFIER = /^[a-z0-9][a-z0-9._-]*$/u;
const MINIMUM_FIELDS = 300;
const MINIMUM_FIELDS_PER_STRATUM = 50;
const CURRENCIES = new Set(['EUR', 'USD', 'GBP', 'JPY', 'CHF']);
const UNITS = new Set(['EA', 'KG', 'L', 'H', 'PC', 'M', 'S', 'MIN', 'D', 'WK']);
const STATUS_TEXT = new Map([
    ['O', 'Open'],
    ['I', 'In Progress'],
    ['A', 'Approved'],
    ['C', 'Completed']
]);
const UNIT_TEXT = new Map([
    ['EA', 'Each'],
    ['KG', 'Kilogram'],
    ['L', 'Litre'],
    ['H', 'Hour'],
    ['PC', 'Piece'],
    ['M', 'Metre'],
    ['S', 'Second'],
    ['MIN', 'Minute'],
    ['D', 'Day'],
    ['WK', 'Week']
]);
const COUNTRY_BY_CITY = new Map([
    ['Berlin', 'DE'],
    ['Dublin', 'IE'],
    ['Milan', 'IT'],
    ['Prague', 'CZ']
]);

function record(value, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function nonEmptyString(value, label) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function relativePath(value, label) {
    const path = nonEmptyString(value, label);
    if (isAbsolute(path) || path.split(/[\\/]/u).includes('..')) {
        throw new TypeError(`${label} must be a contained relative path`);
    }
    return path;
}

function artifact(value, label) {
    const input = record(value, label);
    const bytes = input.bytes;
    if (!Number.isSafeInteger(bytes) || bytes < 1 || !SHA256.test(input.sha256)) {
        throw new TypeError(`${label} must bind positive bytes and a lowercase SHA-256`);
    }
    return input;
}

function validateIsolation(value, targetCount) {
    const isolation = record(value, 'cohort isolation');
    if (isolation.policy !== 'service-and-source-family-disjoint' || isolation.status !== 'verified') {
        throw new TypeError('cohort isolation must be verified and service/source-family disjoint');
    }
    if (!Array.isArray(isolation.checkedAgainst)) {
        throw new TypeError('cohort isolation checkedAgainst must be an array');
    }
    const roles = new Set();
    for (const [index, entry] of isolation.checkedAgainst.entries()) {
        const input = artifact(entry, `cohort isolation input ${index}`);
        const role = nonEmptyString(input.role, `cohort isolation input ${index} role`);
        if (roles.has(role)) {
            throw new TypeError(`duplicate cohort isolation input role: ${role}`);
        }
        roles.add(role);
    }
    for (const role of REQUIRED_ISOLATION_INPUTS) {
        if (!roles.has(role)) {
            throw new TypeError(`cohort isolation is missing required input: ${role}`);
        }
    }
    const audit = record(isolation.audit, 'cohort isolation audit');
    if (
        audit.candidateServiceCount !== targetCount ||
        audit.serviceOverlapCount !== 0 ||
        audit.sourceFamilyOverlapCount !== 0
    ) {
        throw new TypeError('cohort isolation audit contains overlaps or an incomplete service count');
    }
}

function validateSource(value, targetIndex) {
    const source = record(value, `cohort target ${targetIndex} source`);
    nonEmptyString(source.sourceFamily, `cohort target ${targetIndex} source family`);
    const repository = nonEmptyString(source.repository, `cohort target ${targetIndex} repository`);
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/u.test(repository)) {
        throw new TypeError(`cohort target ${targetIndex} repository must be an exact GitHub repository URL`);
    }
    if (!GIT_REVISION.test(source.revision)) {
        throw new TypeError(`cohort target ${targetIndex} revision must be a lowercase Git commit`);
    }
    if (!Array.isArray(source.repositoryPaths) || source.repositoryPaths.length === 0) {
        throw new TypeError(`cohort target ${targetIndex} must bind at least one repository path`);
    }
    for (const [pathIndex, pathEntry] of source.repositoryPaths.entries()) {
        const binding = record(pathEntry, `cohort target ${targetIndex} repository path ${pathIndex}`);
        relativePath(binding.path, `cohort target ${targetIndex} repository path ${pathIndex}`);
        if (!GIT_REVISION.test(binding.blobSha)) {
            throw new TypeError(`cohort target ${targetIndex} repository blob must be a lowercase Git object`);
        }
    }
    nonEmptyString(source.licenseIdentifier, `cohort target ${targetIndex} license identifier`);
}

function normalized(value) {
    return value.replace(/[^a-z0-9]/giu, '').toLowerCase();
}

function rowValue(row, properties, match) {
    const property = properties.find((name) => match(normalized(name)));
    return property === undefined ? undefined : row[property];
}

function numericValues(row, properties) {
    return properties.map((property) => row[property]).filter((value) => typeof value === 'number');
}

function amountCurrencyIsCoherent(row, properties) {
    const currency = rowValue(row, properties, (name) => name.includes('currency'));
    const amounts = numericValues(row, properties);
    if (typeof currency !== 'string' || !CURRENCIES.has(currency) || amounts.length === 0) {
        return false;
    }
    if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
        return false;
    }
    const opening = rowValue(row, properties, (name) => name.includes('opening') && name.includes('balance'));
    const debit = rowValue(row, properties, (name) => name.includes('debit') && name.includes('amount'));
    const credit = rowValue(row, properties, (name) => name.includes('credit') && name.includes('amount'));
    const closing = rowValue(row, properties, (name) => name.includes('closing') && name.includes('balance'));
    if ([opening, debit, credit, closing].every((value) => typeof value === 'number')) {
        return Math.abs(opening + credit - debit - closing) < 0.000_001;
    }
    return true;
}

function quantityUnitIsCoherent(row, properties) {
    const quantity = rowValue(row, properties, (name) => name.includes('quantity') && !name.includes('unit'));
    const unit = rowValue(row, properties, (name) => name.includes('unit'));
    return typeof quantity === 'number' && quantity >= 0 && typeof unit === 'string' && UNITS.has(unit);
}

function dateRangeIsCoherent(row, properties) {
    const start = rowValue(row, properties, (name) => name.includes('start') || name.includes('begin'));
    const end = rowValue(row, properties, (name) => name.includes('end') || name.includes('until'));
    return typeof start === 'string' && typeof end === 'string' && start <= end;
}

function codeTextIsCoherent(row, properties) {
    const textProperty = properties.find((property) => normalized(property).endsWith('text'));
    const codeProperty = properties.find((property) => property !== textProperty);
    if (!codeProperty || !textProperty) {
        return false;
    }
    return STATUS_TEXT.get(String(row[codeProperty])) === row[textProperty];
}

function personAddressIsCoherent(row, properties) {
    const first = rowValue(row, properties, (name) => name.includes('firstname'));
    const last = rowValue(row, properties, (name) => name.includes('lastname'));
    const email = rowValue(row, properties, (name) => name.includes('email'));
    const phone = rowValue(row, properties, (name) => name.includes('phone'));
    const city = rowValue(row, properties, (name) => name.endsWith('city') || name.endsWith('cityname'));
    const country = rowValue(row, properties, (name) => name.endsWith('country'));
    return (
        typeof first === 'string' &&
        typeof last === 'string' &&
        typeof email === 'string' &&
        email.toLowerCase().includes(first.toLowerCase()) &&
        email.toLowerCase().includes(last.toLowerCase()) &&
        typeof phone === 'string' &&
        /^\+?[\d ]{7,}$/u.test(phone) &&
        typeof city === 'string' &&
        COUNTRY_BY_CITY.get(city) === country
    );
}

function lifecycleStatusIsCoherent(row, properties) {
    const value = (suffix) => rowValue(row, properties, (name) => name.endsWith(suffix));
    const available = value('isavailable');
    const deleted = value('isdeleted');
    const inactive = value('isinactive');
    const installed = value('isinstalled');
    const warehouse = value('isinwarehouse');
    const customer = value('isatcustomer');
    if (![available, deleted, inactive, installed, warehouse, customer].every((entry) => typeof entry === 'boolean')) {
        return false;
    }
    return (
        available === !(deleted || inactive) &&
        !(installed && warehouse) &&
        !(customer && !installed) &&
        !((deleted || inactive) && (installed || warehouse || customer))
    );
}

function processingStatusIsCoherent(row, properties) {
    const primary = rowValue(row, properties, (name) => name.endsWith('isposted') && !name.includes('subledger'));
    const secondary = rowValue(row, properties, (name) => name.endsWith('ispostedsuccessfully'));
    const interpreted = rowValue(row, properties, (name) => name.endsWith('isinterpreted'));
    return (
        typeof primary === 'boolean' &&
        typeof secondary === 'boolean' &&
        (!secondary || primary) &&
        (primary || secondary) === (interpreted === 'X') &&
        (interpreted === 'X' || interpreted === null)
    );
}

function statusIsCoherent(row, properties) {
    const names = properties.map(normalized);
    if (names.some((name) => name.endsWith('isdeleted'))) {
        return lifecycleStatusIsCoherent(row, properties);
    }
    if (names.some((name) => name.endsWith('isinterpreted'))) {
        return processingStatusIsCoherent(row, properties);
    }
    return false;
}

function draftIsCoherent(row, properties) {
    const hasDraft = rowValue(row, properties, (name) => name === 'hasdraftentity');
    const hasActive = rowValue(row, properties, (name) => name === 'hasactiveentity');
    const isActive = rowValue(row, properties, (name) => name === 'isactiveentity');
    const activeUuid = rowValue(row, properties, (name) => name === 'activeuuid');
    return (
        typeof hasDraft === 'boolean' &&
        typeof hasActive === 'boolean' &&
        typeof isActive === 'boolean' &&
        hasActive === !isActive &&
        hasDraft === isActive &&
        (isActive ? activeUuid === null : typeof activeUuid === 'string')
    );
}

function valueHelpIsCoherent(row, properties) {
    const code = rowValue(row, properties, (name) => name === 'unitofmeasure');
    const text = rowValue(row, properties, (name) => name === 'unitofmeasuretext');
    const iso = rowValue(row, properties, (name) => name === 'unitofmeasureisocode');
    return typeof code === 'string' && UNIT_TEXT.get(code) === text && iso === code;
}

function assertionIsCoherent(assertion, row) {
    switch (assertion.criterionType) {
        case 'code-text':
            return codeTextIsCoherent(row, assertion.properties);
        case 'amount-currency':
            return amountCurrencyIsCoherent(row, assertion.properties);
        case 'quantity-unit':
            return quantityUnitIsCoherent(row, assertion.properties);
        case 'date-range':
            return dateRangeIsCoherent(row, assertion.properties);
        case 'person-address':
            return personAddressIsCoherent(row, assertion.properties);
        case 'status':
            return statusIsCoherent(row, assertion.properties);
        case 'draft':
            return draftIsCoherent(row, assertion.properties);
        case 'value-help':
            return valueHelpIsCoherent(row, assertion.properties);
        default:
            return false;
    }
}

/** Evaluate non-empty-resource and predeclared coherence gates for one generated cohort target. */
export function evaluateCohortTarget(target, graph, requestedTargets, resources) {
    const resourceCounts = requestedTargets.map(({ name }) => ({ name, rows: resources[name]?.length ?? 0 }));
    const nonEmptyResources = target.expectedEmpty || resourceCounts.every(({ rows }) => rows > 0);
    const entities = new Map(graph.entities.map((entity) => [entity.name, entity]));
    const assertions = target.relationships.map((assertion) => {
        const entity = entities.get(assertion.entity);
        const rows = entity ? (resources[entity.entitySetName] ?? []) : [];
        return {
            id: assertion.id,
            criterionType: assertion.criterionType,
            rowCount: rows.length,
            passed: rows.length > 0 && rows.every((row) => assertionIsCoherent(assertion, row))
        };
    });
    return {
        serviceId: target.serviceId,
        resourceCounts,
        nonEmptyResources,
        assertions,
        passed: nonEmptyResources && assertions.every(({ passed }) => passed)
    };
}

/** Validate a frozen final-cohort manifest before loading models or running inference. */
export function validateRealismCohortManifest(value) {
    const manifest = record(value, 'realism cohort manifest');
    if (manifest.version !== 2 || manifest.kind !== 'mockserver-data-generator-realism-cohort') {
        throw new TypeError('Unsupported realism cohort manifest contract');
    }
    if (!IDENTIFIER.test(manifest.cohortId)) {
        throw new TypeError('realism cohortId must be a portable identifier');
    }
    if (!Number.isSafeInteger(manifest.minimumReviewedFields) || manifest.minimumReviewedFields < MINIMUM_FIELDS) {
        throw new TypeError(`realism cohort must require at least ${MINIMUM_FIELDS} fields`);
    }
    if (!Array.isArray(manifest.targets) || manifest.targets.length < DOMAINS.length) {
        throw new TypeError('realism cohort must contain at least six targets');
    }
    validateIsolation(manifest.isolation, manifest.targets.length);
    const services = new Set();
    const sourceFamilies = new Set();
    const assertionIds = new Set();
    const assertionTypes = new Set();
    const domainCoverage = Object.fromEntries(DOMAINS.map((domain) => [domain, 0]));
    const formatCoverage = Object.fromEntries(SCHEMA_FORMATS.map((format) => [format, 0]));
    for (const [index, targetValue] of manifest.targets.entries()) {
        const target = record(targetValue, `cohort target ${index}`);
        if (!DOMAINS.includes(target.domain)) {
            throw new TypeError(`cohort target ${index} has an unsupported application family`);
        }
        const serviceId = nonEmptyString(target.serviceId, `cohort target ${index} serviceId`);
        if (services.has(serviceId)) {
            throw new TypeError(`duplicate cohort service identity: ${serviceId}`);
        }
        services.add(serviceId);
        relativePath(target.path, `cohort target ${index} path`);
        if (!['edmx', 'csn'].includes(target.format) || !SCHEMA_FORMATS.includes(target.schemaFormat)) {
            throw new TypeError(`cohort target ${index} has an unsupported schema format`);
        }
        if ((target.format === 'csn') !== (target.schemaFormat === 'csn')) {
            throw new TypeError(`cohort target ${index} input and schema formats disagree`);
        }
        nonEmptyString(target.serviceName, `cohort target ${index} serviceName`);
        nonEmptyString(target.provenance, `cohort target ${index} provenance`);
        if (typeof target.expectedEmpty !== 'boolean') {
            throw new TypeError(`cohort target ${index} must freeze expectedEmpty`);
        }
        if (!Array.isArray(target.relationships) || target.relationships.length === 0) {
            throw new TypeError(`cohort target ${index} must freeze at least one coherence assertion`);
        }
        for (const [assertionIndex, assertionValue] of target.relationships.entries()) {
            const assertion = record(assertionValue, `cohort target ${index} assertion ${assertionIndex}`);
            const id = nonEmptyString(assertion.id, `cohort target ${index} assertion ${assertionIndex} id`);
            if (assertionIds.has(id)) {
                throw new TypeError(`duplicate cohort assertion identity: ${id}`);
            }
            assertionIds.add(id);
            if (!REQUIRED_ASSERTION_TYPES.includes(assertion.criterionType)) {
                throw new TypeError(`cohort assertion ${id} has an unsupported criterion type`);
            }
            assertionTypes.add(assertion.criterionType);
            nonEmptyString(assertion.entity, `cohort assertion ${id} entity`);
            nonEmptyString(assertion.criterion, `cohort assertion ${id} criterion`);
            if (!Array.isArray(assertion.properties) || assertion.properties.length === 0) {
                throw new TypeError(`cohort assertion ${id} properties must be non-empty`);
            }
            const properties = assertion.properties.map((property) =>
                nonEmptyString(property, `cohort assertion ${id} property`)
            );
            if (new Set(properties).size !== properties.length) {
                throw new TypeError(`cohort assertion ${id} contains duplicate properties`);
            }
        }
        artifact({ bytes: target.schemaBytes, sha256: target.schemaSha256 }, `cohort target ${index} frozen schema`);
        if (!Number.isSafeInteger(target.fieldBudget) || target.fieldBudget < 1 || target.fieldBudget > 1_000) {
            throw new TypeError(`cohort target ${index} has an invalid field budget`);
        }
        if (target.selection !== undefined) {
            if (!Array.isArray(target.selection) || target.selection.length === 0) {
                throw new TypeError(`cohort target ${index} explicit selection must be a non-empty array`);
            }
            const selectedFields = new Set();
            for (const [selectionIndex, selectionValue] of target.selection.entries()) {
                const selection = record(selectionValue, `cohort target ${index} selection ${selectionIndex}`);
                const entity = nonEmptyString(
                    selection.entity,
                    `cohort target ${index} selection ${selectionIndex} entity`
                );
                if (!Array.isArray(selection.properties) || selection.properties.length === 0) {
                    throw new TypeError(
                        `cohort target ${index} selection ${selectionIndex} properties must be non-empty`
                    );
                }
                for (const propertyValue of selection.properties) {
                    const property = nonEmptyString(propertyValue, `cohort target ${index} selected property`);
                    const field = `${entity}:${property}`;
                    if (selectedFields.has(field)) {
                        throw new TypeError(`cohort target ${index} contains duplicate selected field ${field}`);
                    }
                    selectedFields.add(field);
                }
            }
            if (selectedFields.size !== target.fieldBudget) {
                throw new TypeError(`cohort target ${index} explicit selection does not match its field budget`);
            }
        }
        validateSource(target.source, index);
        if (sourceFamilies.has(target.source.sourceFamily)) {
            throw new TypeError(`duplicate cohort source family: ${target.source.sourceFamily}`);
        }
        sourceFamilies.add(target.source.sourceFamily);
        domainCoverage[target.domain] += target.fieldBudget;
        formatCoverage[target.schemaFormat] += target.fieldBudget;
    }
    for (const [domain, fields] of Object.entries(domainCoverage)) {
        if (fields < MINIMUM_FIELDS_PER_STRATUM) {
            throw new TypeError(`realism application family ${domain} does not meet the frozen coverage minimum`);
        }
    }
    for (const [format, fields] of Object.entries(formatCoverage)) {
        if (fields < MINIMUM_FIELDS_PER_STRATUM) {
            throw new TypeError(`realism schema format ${format} does not meet the frozen coverage minimum`);
        }
    }
    for (const assertionType of REQUIRED_ASSERTION_TYPES) {
        if (!assertionTypes.has(assertionType)) {
            throw new TypeError(`realism cohort is missing ${assertionType} coherence coverage`);
        }
    }
    const fieldBudget = Object.values(domainCoverage).reduce((total, fields) => total + fields, 0);
    if (fieldBudget < manifest.minimumReviewedFields) {
        throw new TypeError('realism cohort field budget is below its declared minimum');
    }
    return manifest;
}

/** Resolve a manifest-relative schema while rejecting absolute paths and directory traversal. */
export function resolveCohortSourcePath(selectionManifestPath, sourcePath) {
    const root = resolve(dirname(selectionManifestPath));
    const relative = nonEmptyString(sourcePath, 'cohort source path');
    if (isAbsolute(relative)) {
        throw new TypeError('cohort source path must be relative to the cohort directory');
    }
    const path = resolve(root, relative);
    if (!path.startsWith(`${root}${sep}`)) {
        throw new TypeError('cohort source path resolves outside the cohort directory');
    }
    return path;
}
