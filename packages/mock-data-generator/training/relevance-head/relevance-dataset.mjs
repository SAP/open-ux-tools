const SPLITS = Object.freeze(['train', 'calibration', 'sealed']);

/**
 * The runtime field request of a published pair, in the runtime's key order.
 * @param {object} field published `field`
 * @returns {object} the field request
 */
function fieldRequest(field) {
    return {
        name: field.name,
        primitiveType: field.primitiveType,
        nullable: field.nullable !== false,
        ...(field.isKey ? { isKey: true } : {}),
        ...(field.label ? { label: field.label } : {}),
        ...(field.description ? { description: field.description } : {}),
        ...(field.maxLength === undefined ? {} : { maxLength: field.maxLength })
    };
}

/**
 * Turn the dataset's `relevance_pairs` records into reviewed relevance rows and their partitions.
 * Every negative pair of the dataset is a cross-domain hard negative (a same-type value from another
 * service group); the service identity is the published opaque service group.
 * @param {object[]} records `relevance_pairs/train` records in file order
 * @returns {{ rows: object[], partitions: { train: string[], calibration: string[], sealed: string[] } }} rows and id lists
 */
export function relevanceRowsFromDataset(records) {
    const rows = records.map((record) => {
        if (!SPLITS.includes(record.split)) {
            throw new TypeError(`relevance pair ${record.pair_id} has unknown split ${record.split}`);
        }
        return {
            id: record.pair_id,
            serviceGroup: record.service_group,
            reviewed: record.reviewed === true,
            relevant: record.relevant,
            ...(record.relevant ? {} : { negativeKind: 'cross-domain' }),
            pair: {
                service: { alias: record.service_group, urlPath: `/${record.service_group}`, odataVersion: '4.0' },
                resource: record.resource,
                entity: record.entity,
                field: fieldRequest(record.field),
                value: record.value,
                linkedCode: record.linked_code,
                textLink: record.text_link,
                relatedResources: record.related_resources ?? []
            }
        };
    });
    const partitions = Object.fromEntries(
        SPLITS.map((split) => [
            split,
            records.filter((record) => record.split === split).map((record) => record.pair_id)
        ])
    );
    return { rows, partitions };
}
