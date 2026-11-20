import type { SchemaProperty } from '../../src/schema/graph.js';

// The lexical rule chain of lexical-fallback.ts as it was before its rules moved to the semantic rule
// store (commit 22235d92be), kept verbatim as the oracle of the rule-engine equivalence test.
// Intentional rule changes since then are mirrored here: 'fax' routes to phone (a fax number has its format),
// and first or last name only as one compound (LastName, not LastChangedByUserName).
function tokens(name: string): ReadonlyArray<string> {
    return name
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

function has(words: ReadonlySet<string>, ...candidates: ReadonlyArray<string>): boolean {
    return candidates.some((candidate) => words.has(candidate));
}

export function oracleLexicalRoleForText(
    text: string,
    primitiveType: SchemaProperty['primitiveType']
): string | undefined {
    const fieldTokens = tokens(text);
    const words = new Set(fieldTokens);
    const last = fieldTokens.at(-1);
    const numeric = primitiveType === 'int' || primitiveType === 'decimal';
    const compound = (first: string, second: string): boolean =>
        fieldTokens.some((token, index) => token === first && fieldTokens[index + 1] === second);

    // Exclude neighboring concepts: a manufacturer's URL, a distance's unit, a hierarchy depth,
    // a credit grade and a rating's caption.
    if (
        primitiveType === 'string' &&
        has(words, 'manufacturer', 'producer') &&
        !has(words, 'url', 'uri', 'link', 'id', 'code', 'number', 'no', 'country', 'date', 'part')
    ) {
        return 'manufacturer';
    }
    if (numeric && has(words, 'mileage', 'distance', 'odometer') && !has(words, 'unit', 'uom', 'root', 'hierarchy')) {
        return 'distance';
    }
    if (
        numeric &&
        has(words, 'rating', 'stars') &&
        !has(words, 'credit', 'risk', 'text', 'description', 'comment', 'count')
    ) {
        return 'rating';
    }

    if (has(words, 'email', 'mail')) {
        return 'email';
    }
    if (has(words, 'mobile')) {
        return 'mobile_phone';
    }
    if (has(words, 'phone', 'telephone', 'fax')) {
        return 'phone';
    }
    if (has(words, 'url', 'uri', 'website', 'homepage')) {
        return 'url';
    }
    if (has(words, 'firstname', 'given') || compound('first', 'name')) {
        return 'person_first_name';
    }
    if (has(words, 'lastname', 'surname', 'family') || compound('last', 'name')) {
        return 'person_last_name';
    }
    if (has(words, 'fullname') || (has(words, 'full', 'display') && has(words, 'name'))) {
        return 'person_full_name';
    }
    if (has(words, 'artist') && has(words, 'name')) {
        return 'person_full_name';
    }
    if (has(words, 'account') && has(words, 'holder')) {
        return 'org_name';
    }
    if (has(words, 'bank') && has(words, 'account') && has(words, 'internal') && has(words, 'id')) {
        return 'bank_account_internal_id';
    }
    if (has(words, 'bank') && has(words, 'account') && has(words, 'type')) {
        return 'bank_account_type';
    }
    if (has(words, 'statement') && has(words, 'format')) {
        return 'bank_statement_format';
    }
    if (has(words, 'bank') && has(words, 'statement') && has(words, 'page') && has(words, 'number')) {
        return 'bank_statement_page';
    }
    if (has(words, 'bank') && has(words, 'statement') && has(words, 'type')) {
        return 'bank_statement_type';
    }
    if (
        has(words, 'bank') &&
        has(words, 'statement') &&
        !has(words, 'page', 'format', 'short', 'type', 'item', 'items', 'record', 'records')
    ) {
        return 'bank_statement_id';
    }
    if (has(words, 'house') && has(words, 'bank') && !has(words, 'name', 'text', 'description', 'account')) {
        return 'house_bank';
    }
    if (has(words, 'bank') && has(words, 'name')) {
        return 'bank_name';
    }
    if (has(words, 'incoming', 'payment') && has(words, 'file')) {
        return 'payment_file_id';
    }
    if (has(words, 'payment', 'pmnt') && has(words, 'transaction', 'tran') && has(words, 'group')) {
        return 'payment_transaction_group';
    }
    if (has(words, 'sending') && has(words, 'bank')) {
        return 'bank_name';
    }
    if (has(words, 'company') && has(words, 'code') && !has(words, 'name', 'text', 'description')) {
        return 'company_code';
    }
    if (has(words, 'storage') && has(words, 'location')) {
        return 'storage_location';
    }
    if (has(words, 'tech', 'technical') && has(words, 'obj', 'object') && has(words, 'type')) {
        return 'technical_object_type';
    }
    if (has(words, 'equipment') && has(words, 'name', 'description', 'text')) {
        return 'equipment_name';
    }
    if (has(words, 'tech', 'technical') && has(words, 'object') && has(words, 'name', 'description', 'text')) {
        return 'equipment_name';
    }
    if (has(words, 'unique') && has(words, 'item') && has(words, 'id', 'identifier')) {
        return 'unique_item_identifier';
    }
    if (has(words, 'distribution') && has(words, 'channel')) {
        return 'distribution_channel';
    }
    if (has(words, 'division') && !has(words, 'description', 'name', 'text')) {
        return 'sales_division';
    }
    if (has(words, 'sales') && has(words, 'organization', 'organisation') && has(words, 'description', 'name')) {
        return 'org_name';
    }
    if (has(words, 'sales') && has(words, 'organization', 'organisation') && !has(words, 'fc')) {
        return 'sales_organization';
    }
    if (has(words, 'payment') && has(words, 'terms')) {
        return 'payment_terms';
    }
    if (has(words, 'employee') && !has(words, 'name', 'description')) {
        return 'employee_id';
    }
    if (
        has(words, 'service') &&
        has(words, 'organization', 'organisation') &&
        !has(words, 'name', 'text', 'description')
    ) {
        return 'service_organization';
    }
    if (has(words, 'service') && has(words, 'team')) {
        return 'service_team';
    }
    if (primitiveType === 'string' && has(words, 'is', 'has') && has(words, 'open', 'error')) {
        return 'indicator';
    }
    if (has(words, 'purchase') && has(words, 'order') && has(words, 'customer')) {
        return 'customer_purchase_order';
    }
    if (has(words, 'service') && has(words, 'doc', 'document') && has(words, 'item') && has(words, 'category')) {
        return 'service_document_item_category';
    }
    if (has(words, 'service') && has(words, 'document') && has(words, 'item') && has(words, 'object', 'type')) {
        return 'object_type';
    }
    if (
        primitiveType === 'string' &&
        has(words, 'service') &&
        has(words, 'document') &&
        has(words, 'item') &&
        !has(
            words,
            'name',
            'text',
            'description',
            'status',
            'uuid',
            'guid',
            'char',
            'open',
            'error',
            'amount',
            'net',
            'gross',
            'quantity',
            'qty',
            'category'
        )
    ) {
        return 'document_item';
    }
    if (has(words, 'service') && has(words, 'document') && has(words, 'type')) {
        return 'service_document_type';
    }
    if (
        has(words, 'service') &&
        has(words, 'document') &&
        !has(
            words,
            'name',
            'text',
            'description',
            'status',
            'uuid',
            'guid',
            'char',
            'item',
            'items',
            'open',
            'error',
            'amount',
            'net',
            'gross',
            'quantity',
            'qty',
            'category'
        )
    ) {
        return 'document_id';
    }
    if (has(words, 'sales') && has(words, 'document') && has(words, 'type')) {
        return 'sales_document_type';
    }
    if (has(words, 'object') && has(words, 'type')) {
        return 'object_type';
    }
    if (primitiveType === 'string' && has(words, 'length') && has(words, 'unit')) {
        return 'length_unit';
    }
    if (has(words, 'formatted') && has(words, 'name')) {
        return 'person_full_name';
    }
    if (has(words, 'timezone') || (has(words, 'time') && has(words, 'zone'))) {
        return 'timezone';
    }
    if (primitiveType === 'string' && has(words, 'source') && has(words, 'name')) {
        return 'source_name';
    }
    if (primitiveType === 'string' && has(words, 'account') && has(words, 'text', 'description')) {
        return 'account_description';
    }
    if (primitiveType === 'string' && has(words, 'uuid', 'guid')) {
        return 'guid_text';
    }
    if (primitiveType === 'string' && has(words, 'batch')) {
        return 'batch';
    }
    if (primitiveType === 'string' && has(words, 'plant')) {
        return 'plant';
    }
    if (primitiveType === 'string' && has(words, 'gl') && has(words, 'account')) {
        return 'gl_account';
    }
    if (primitiveType === 'string' && has(words, 'account') && has(words, 'number')) {
        return 'numeric_identifier';
    }
    if (
        primitiveType === 'string' &&
        !has(words, 'status', 'name', 'text', 'description', 'address') &&
        ((has(words, 'document') && has(words, 'item')) || has(words, 'order'))
    ) {
        return 'numeric_identifier';
    }
    if (
        primitiveType === 'string' &&
        !has(words, 'name', 'text', 'description', 'address', 'status') &&
        has(words, 'customer', 'supplier', 'payer', 'party', 'owner')
    ) {
        return 'numeric_identifier';
    }
    if (primitiveType === 'string' && has(words, 'identifier', 'reference') && has(words, 'id', 'number', 'key')) {
        return 'business_identifier';
    }
    if (has(words, 'currency', 'waers')) {
        return 'currency';
    }
    if (has(words, 'chart') && has(words, 'account', 'accounts')) {
        return 'chart_of_accounts';
    }
    if (last === 'equipment' || (has(words, 'technical') && has(words, 'object'))) {
        return 'equipment_id';
    }
    if (has(words, 'interest') && has(words, 'rate')) {
        return 'interest_rate';
    }
    if (has(words, 'price')) {
        return 'price';
    }
    if (has(words, 'amount', 'total', 'net', 'gross', 'fee', 'charge', 'cost')) {
        return 'monetary_amount';
    }
    if (has(words, 'quantity', 'qty')) {
        return 'quantity';
    }
    if (primitiveType === 'string' && has(words, 'unit') && has(words, 'iso') && has(words, 'code')) {
        return 'unit_of_measure_iso';
    }
    if (has(words, 'dimension')) {
        return 'measurement_dimension';
    }
    if (has(words, 'additive') && has(words, 'constant', 'value')) {
        return 'conversion_offset';
    }
    if (has(words, 'conversion', 'cnvrsn') && has(words, 'numerator', 'denominator')) {
        return 'conversion_factor';
    }
    if (has(words, 'decimal', 'decimals', 'dcmls') && has(words, 'place', 'places', 'number', 'nmbr', 'rounding')) {
        return 'decimal_places';
    }
    if (has(words, 'exponent')) {
        return 'exponent';
    }
    if (primitiveType === 'string' && has(words, 'temperature') && has(words, 'unit')) {
        return 'temperature_unit';
    }
    if (primitiveType === 'string' && has(words, 'pressure') && has(words, 'unit')) {
        return 'pressure_unit';
    }
    if (
        (primitiveType === 'int' || primitiveType === 'decimal') &&
        has(words, 'unit') &&
        has(words, 'measure') &&
        has(words, 'pressure', 'length', 'mass', 'temperature', 'time')
    ) {
        return 'dimension_exponent';
    }
    if (has(words, 'temperature')) {
        return 'temperature';
    }
    if (has(words, 'pressure')) {
        return 'pressure';
    }
    if (
        (primitiveType === 'int' || primitiveType === 'string') &&
        (has(words, 'count') || (has(words, 'number', 'no', 'nmbr') && has(words, 'item', 'items')))
    ) {
        return 'count';
    }
    if (has(words, 'unit', 'uom') || (last === 'measure' && primitiveType === 'string')) {
        return 'unit_of_measure';
    }
    if (has(words, 'percentage', 'percent', 'rate') && primitiveType === 'decimal') {
        return 'percentage';
    }
    if (has(words, 'start', 'begin', 'from') && has(words, 'date', 'time')) {
        return 'start_date';
    }
    if (has(words, 'end', 'until', 'to') && has(words, 'date', 'time')) {
        return 'end_date';
    }
    if (has(words, 'date')) {
        return 'date';
    }
    if (has(words, 'datetime', 'timestamp')) {
        return 'datetime';
    }
    if (has(words, 'time')) {
        return 'time';
    }
    if (has(words, 'country')) {
        return has(words, 'name', 'text', 'description') ? 'country_name' : 'country';
    }
    if (has(words, 'city', 'town')) {
        return 'city';
    }
    if (has(words, 'region', 'state', 'province')) {
        return has(words, 'name', 'text', 'description') ? 'region_name' : 'region';
    }
    if (has(words, 'postal', 'postcode', 'zipcode') || (has(words, 'zip') && has(words, 'code'))) {
        return 'postal_code';
    }
    if (has(words, 'street') || (has(words, 'address') && !has(words, 'email'))) {
        return 'street_address';
    }
    if (has(words, 'company', 'organization', 'organisation', 'supplier', 'vendor') && has(words, 'name')) {
        return 'org_name';
    }
    if (has(words, 'product', 'material') && has(words, 'name')) {
        return 'product_name';
    }
    // `descr` abbreviates the description concept.
    if (has(words, 'description', 'descr')) {
        return 'description';
    }
    // Each narrative word is its own role; the first one the name uses wins.
    const narrativeRole = fieldTokens.find((token) => token === 'comment' || token === 'remark' || token === 'notes');
    if (narrativeRole) {
        return narrativeRole;
    }
    if (has(words, 'status')) {
        if (has(words, 'approval')) {
            return 'approval_status';
        }
        if (primitiveType === 'string' && has(words, 'error') && has(words, 'has')) {
            return 'indicator';
        }
        return 'status';
    }
    if (has(words, 'language', 'locale')) {
        return 'language';
    }
    if (has(words, 'year')) {
        return 'year';
    }
    return undefined;
}
