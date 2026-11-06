import { isReservedHost, webAddress } from '../spec/reserved-domains.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/**
 * Generated e-mail and web addresses lie in reserved domains (RFC 2606, RFC 6761), so mock data never names a
 * host someone could register. Every string field holding an address is examined, whatever its role.
 *
 * @param input check input
 * @returns findings and coverage
 */
export function checkReservedHosts(input: RealismInput): CheckOutcome {
    const collector = new OutcomeCollector(REALISM_CHECK.reservedHost);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        for (const property of entity.properties.filter(({ primitiveType }) => primitiveType === 'string')) {
            const hosts = rows.flatMap((row) => {
                const value = row[property.name];
                const address = typeof value === 'string' ? webAddress(value) : undefined;
                return typeof value === 'string' && address ? [{ value, host: address.host }] : [];
            });
            if (hosts.length === 0) {
                continue;
            }
            collector.field({
                entitySet: entity.entitySetName,
                property: property.name,
                checked: hosts.length,
                failing: hosts.filter(({ host }) => !isReservedHost(host)).map(({ value }) => value)
            });
        }
    }
    return collector.outcome();
}
