import { createHash } from 'node:crypto';

/**
 * Classifier corpus overlay: adds authorized services to the classifier's train and calibration
 * partitions without touching the canonical registry, the sealed evaluation services or the gates.
 *
 * Nodes are services with a kind:
 *   new        a candidate source being admitted
 *   idle       an already-authorized registered service that sits in a holdout split unused
 *   fit        a registered train or calibration service
 *   protected  every other registered service (sealed and evaluation-only)
 * Families come from shared identity and from shared *distinctive* field contexts, so generic fields
 * (draft and admin columns shared by hundreds of services) do not chain unrelated services together.
 */

export const DEFAULT_FAMILY_RULE = Object.freeze({ genericDf: 5, containment: 0.5, minShared: 6, jaccard: 0.5 });

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function appendTo(map, key, value) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
}

/**
 * Whether two context sets overlap enough to be the same service family.
 *
 * @param {number} shared contexts in both sets
 * @param {number} left size of the first set
 * @param {number} right size of the second set
 * @param {typeof DEFAULT_FAMILY_RULE} rule thresholds
 * @returns {boolean} true when the overlap links the two services
 */
export function overlapLinks(shared, left, right, rule = DEFAULT_FAMILY_RULE) {
    if (shared === 0 || left === 0 || right === 0) return false;
    const containment = shared / Math.min(left, right);
    const jaccard = shared / (left + right - shared);
    return (containment >= rule.containment && shared >= rule.minShared) || jaccard >= rule.jaccard;
}

function pairCounts(nodes, contextsOf, include) {
    const index = new Map();
    nodes.forEach((node, position) => {
        for (const context of contextsOf(node)) {
            const list = index.get(context);
            if (list) list.push(position);
            else index.set(context, [position]);
        }
    });
    const counts = new Map();
    for (const positions of index.values()) {
        for (let a = 0; a < positions.length; a++) {
            for (let b = a + 1; b < positions.length; b++) {
                if (!include(nodes[positions[a]], nodes[positions[b]])) continue;
                const key = `${positions[a]}:${positions[b]}`;
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
        }
    }
    return counts;
}

/**
 * Family links between services. At least one side of every link is new or idle; registered services
 * never link to each other here, so existing families are never merged.
 *
 * @param {object[]} nodes services with `kind`, `contexts` (Set) and `identityKeys` (string[])
 * @param {typeof DEFAULT_FAMILY_RULE} rule thresholds
 * @returns {Array<[string, string, string]>} links as [id, id, reason]
 */
export function familyLinks(nodes, rule = DEFAULT_FAMILY_RULE) {
    const movable = (node) => node.kind === 'new' || node.kind === 'idle';
    const links = [];
    const byIdentity = new Map();
    for (const node of nodes) {
        for (const key of node.identityKeys ?? []) appendTo(byIdentity, key, node);
    }
    for (const [key, members] of byIdentity) {
        for (let a = 0; a < members.length; a++) {
            for (let b = a + 1; b < members.length; b++) {
                if (movable(members[a]) || movable(members[b]))
                    links.push([members[a].id, members[b].id, `identity:${key.split(':')[0]}`]);
            }
        }
    }
    const frequency = new Map();
    for (const node of nodes)
        for (const context of node.contexts) frequency.set(context, (frequency.get(context) ?? 0) + 1);
    const distinctive = new Map(
        nodes.map((node) => [node.id, [...node.contexts].filter((context) => frequency.get(context) <= rule.genericDf)])
    );
    const counts = pairCounts(
        nodes,
        (node) => distinctive.get(node.id),
        (left, right) => movable(left) || movable(right)
    );
    for (const [key, shared] of counts) {
        const [a, b] = key.split(':').map(Number);
        if (overlapLinks(shared, distinctive.get(nodes[a].id).length, distinctive.get(nodes[b].id).length, rule)) {
            links.push([nodes[a].id, nodes[b].id, 'distinctive-contexts']);
        }
    }
    return links;
}

/**
 * New or idle services that directly resemble a protected service on their full context sets, or share
 * its checksum or namespace/container. These are excluded outright, whatever family they end up in.
 *
 * @param {object[]} nodes services
 * @param {typeof DEFAULT_FAMILY_RULE} rule thresholds
 * @returns {Map<string, string>} excluded service id -> reason
 */
export function protectedResemblance(nodes, rule = DEFAULT_FAMILY_RULE) {
    const excluded = new Map();
    const protectedNodes = nodes.filter((node) => node.kind === 'protected');
    const protectedIdentity = new Set(
        protectedNodes.flatMap((node) => (node.identityKeys ?? []).filter((key) => !key.startsWith('app:')))
    );
    const byContext = new Map();
    protectedNodes.forEach((node, position) => {
        for (const context of node.contexts) appendTo(byContext, context, position);
    });
    for (const node of nodes.filter((candidate) => candidate.kind === 'new' || candidate.kind === 'idle')) {
        if ((node.identityKeys ?? []).some((key) => !key.startsWith('app:') && protectedIdentity.has(key))) {
            excluded.set(node.id, 'protected-identity');
            continue;
        }
        const shared = new Map();
        for (const context of node.contexts) {
            for (const position of byContext.get(context) ?? []) shared.set(position, (shared.get(position) ?? 0) + 1);
        }
        for (const [position, count] of shared) {
            if (overlapLinks(count, node.contexts.size, protectedNodes[position].contexts.size, rule)) {
                excluded.set(node.id, 'protected-resemblance');
                break;
            }
        }
    }
    return excluded;
}

/**
 * Connected components of the link graph (union-find), each a sorted list of service ids.
 *
 * @param {string[]} ids all service ids
 * @param {Array<[string, string, string]>} links family links
 * @returns {string[][]} components
 */
export function components(ids, links) {
    const parent = new Map(ids.map((id) => [id, id]));
    const find = (id) => {
        let root = id;
        while (parent.get(root) !== root) root = parent.get(root);
        while (parent.get(id) !== root) {
            const next = parent.get(id);
            parent.set(id, root);
            id = next;
        }
        return root;
    };
    for (const [a, b] of links) {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent.set(rootA < rootB ? rootB : rootA, rootA < rootB ? rootA : rootB);
    }
    const groups = new Map();
    for (const id of ids) appendTo(groups, find(id), id);
    return [...groups.values()].map((group) => group.sort());
}

/**
 * Seeded split for a new family: calibration when the family's hash falls below the fraction.
 *
 * @param {string} seed split seed
 * @param {string} familyKey stable family key
 * @param {number} calibrationFraction share of families sent to calibration
 * @returns {'train' | 'calibration'} split
 */
export function newFamilySplit(seed, familyKey, calibrationFraction) {
    return Number.parseInt(sha256(`${seed}|${familyKey}`).slice(0, 8), 16) / 2 ** 32 < calibrationFraction
        ? 'calibration'
        : 'train';
}

/**
 * Decide what happens to the new and idle members of every component.
 *
 * @param {object} options inputs
 * @param {object[]} options.nodes services
 * @param {Array<[string, string, string]>} options.links family links
 * @param {Map<string, string>} options.protectedExclusions direct resemblance exclusions
 * @param {string} options.seed split seed
 * @param {number} options.calibrationFraction share of new families in calibration
 * @returns {{ admitted: Map<string, { split: string, familyKey: string, inheritFrom?: string }>, excluded: Map<string, string> }} decisions
 */
export function decideComponents({ nodes, links, protectedExclusions, seed, calibrationFraction }) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const admitted = new Map();
    const excluded = new Map(protectedExclusions);
    for (const group of components(
        nodes.map((node) => node.id),
        links
    )) {
        const members = group.map((id) => byId.get(id));
        const movable = members.filter(
            (node) => (node.kind === 'new' || node.kind === 'idle') && !excluded.has(node.id)
        );
        if (movable.length === 0) continue;
        if (members.some((node) => node.kind === 'protected')) {
            for (const node of movable) excluded.set(node.id, 'family-touches-protected');
            continue;
        }
        const fit = members.filter((node) => node.kind === 'fit');
        const fitSplits = new Set(fit.map((node) => node.split));
        if (fitSplits.size > 1) {
            for (const node of movable) excluded.set(node.id, 'family-bridges-train-and-calibration');
            continue;
        }
        if (fitSplits.size === 1) {
            const anchor = fit.map((node) => node.id).sort()[0];
            for (const node of movable)
                admitted.set(node.id, {
                    split: [...fitSplits][0],
                    familyKey: `inherit:${anchor}`,
                    inheritFrom: anchor
                });
            continue;
        }
        const familyKey = movable
            .flatMap((node) => (node.identityKeys?.length ? node.identityKeys : [node.id]))
            .sort()[0];
        const split = newFamilySplit(seed, familyKey, calibrationFraction);
        for (const node of movable) admitted.set(node.id, { split, familyKey });
    }
    return { admitted, excluded };
}

/**
 * Structural checks on an overlay before anything is labelled from it.
 *
 * @param {object} options inputs
 * @param {{ services: object[] }} options.baseRegistry canonical registry
 * @param {{ assignments: Record<string, string>, clusters: string[][] }} options.baseSplits canonical splits
 * @param {{ services: object[] }} options.registry overlay registry
 * @param {{ assignments: Record<string, string>, clusters: string[][], overlay?: { reassigned?: string[] } }} options.splits overlay splits
 * @returns {string[]} problems; empty when the overlay is valid
 */
export function validateCorpusOverlay({ baseRegistry, baseSplits, registry, splits }) {
    const problems = [];
    const registered = new Map(registry.services.map((service) => [service.id, service]));
    if (registered.size !== registry.services.length) problems.push('duplicate service ids');
    for (const service of baseRegistry.services) {
        if (JSON.stringify(registered.get(service.id)) !== JSON.stringify(service))
            problems.push(`canonical record changed: ${service.id}`);
    }
    const reassigned = new Set(splits.overlay?.reassigned ?? []);
    for (const [id, split] of Object.entries(baseSplits.assignments)) {
        if (!reassigned.has(id) && splits.assignments[id] !== split)
            problems.push(`canonical assignment changed: ${id}`);
        if (reassigned.has(id) && !['train', 'calibration'].includes(splits.assignments[id]))
            problems.push(`reassigned service not in train or calibration: ${id}`);
    }
    const membership = new Map();
    for (const cluster of splits.clusters) {
        const clusterSplits = new Set(cluster.map((id) => splits.assignments[id]));
        if (clusterSplits.size !== 1 || clusterSplits.has(undefined))
            problems.push(`cluster spans splits: ${cluster.slice(0, 3).join(',')}`);
        for (const id of cluster) {
            if (!registered.has(id)) problems.push(`cluster member not registered: ${id}`);
            if (membership.has(id)) problems.push(`service in more than one cluster: ${id}`);
            membership.set(id, true);
        }
    }
    const baseIds = new Set(baseRegistry.services.map((service) => service.id));
    for (const service of registry.services.filter((candidate) => !baseIds.has(candidate.id))) {
        if (!['train', 'calibration'].includes(splits.assignments[service.id]))
            problems.push(`new service not in train or calibration: ${service.id}`);
        if (!membership.has(service.id)) problems.push(`new service has no cluster: ${service.id}`);
        if (
            service.license?.identifier !== 'INTERNAL-OWNER-AUTHORIZATION' ||
            service.trainingAuthorization?.privacyReview?.status !== 'passed'
        ) {
            problems.push(`new service lacks authorization or privacy review: ${service.id}`);
        }
    }
    return problems;
}
