/**
 * Canonical service-family resolution shared by every v3 converter.
 *
 * A family is the sorted, pipe-joined cluster from the canonical splits manifest. It is the
 * partition unit for `family-disjoint-v2`: train and calibration rows may never share one.
 * This is a service cluster family, not a semantic-role family.
 */

/**
 * Resolve the canonical family identity of a registered service.
 *
 * @param {{ services?: Array<{ id: string }> }} registry canonical registry
 * @param {{ clusters?: string[][], assignments?: Record<string, string> }} splits canonical splits manifest
 * @param {{ id: string, productFamily?: string }} service registry entry
 * @returns {string} family identity
 */
export function familyFor(registry, splits, service) {
    const clusters = (splits.clusters ?? []).filter((cluster) => cluster.includes(service.id));
    if (clusters.length > 1) throw new TypeError(`service ${service.id} has multiple canonical families`);
    const cluster = clusters[0];
    if (cluster) {
        const clusterSplits = new Set(cluster.map((id) => splits.assignments?.[id]));
        if (clusterSplits.size !== 1 || clusterSplits.has(undefined)) {
            throw new TypeError(`canonical service family has conflicting splits for ${service.id}`);
        }
        const absent = cluster.filter((id) => !(registry.services ?? []).some((candidate) => candidate.id === id));
        if (absent.length > 0) throw new TypeError(`canonical family contains unregistered services for ${service.id}`);
        return [...cluster].sort().join('|');
    }
    return service.productFamily ?? service.id;
}

/**
 * Resolve the family for a service id, throwing when the id is not registered.
 *
 * @param {{ services?: Array<{ id: string }> }} registry canonical registry
 * @param {{ clusters?: string[][], assignments?: Record<string, string> }} splits canonical splits manifest
 * @param {string} serviceId registry service id
 * @returns {string} family identity
 */
export function familyForServiceId(registry, splits, serviceId) {
    const service = (registry.services ?? []).find((candidate) => candidate.id === serviceId);
    if (!service) throw new TypeError(`service ${serviceId} is not in the canonical registry`);
    return familyFor(registry, splits, service);
}
