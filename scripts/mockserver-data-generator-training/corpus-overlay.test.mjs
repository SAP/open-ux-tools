import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    decideComponents,
    familyLinks,
    newFamilySplit,
    overlapLinks,
    protectedResemblance,
    validateCorpusOverlay
} from './lib/corpus-overlay.mjs';

const contexts = (prefix, count) => new Set(Array.from({ length: count }, (_, index) => `${prefix}${index}`));
const node = (id, kind, context, extra = {}) => ({ id, kind, contexts: context, identityKeys: [], ...extra });

test('links two services on substantial containment or high Jaccard, never on a small overlap', () => {
    assert.equal(overlapLinks(6, 10, 100), true);
    assert.equal(overlapLinks(5, 10, 100), false);
    assert.equal(overlapLinks(3, 4, 4), true);
    assert.equal(overlapLinks(0, 10, 10), false);
});

test('generic contexts shared by many services do not chain them into one family', () => {
    const generic = contexts('generic', 10);
    const nodes = Array.from({ length: 8 }, (_, index) =>
        node(`s${index}`, 'new', new Set([...generic, ...contexts(`own${index}-`, 20)]))
    );
    assert.deepEqual(familyLinks(nodes), []);
});

test('distinctive overlap links a new service to a registered one, but registered services never link to each other', () => {
    const sharedWithFit = contexts('shared', 12);
    const nodes = [
        node('new-a', 'new', new Set([...sharedWithFit, ...contexts('a', 4)])),
        node('fit-b', 'fit', new Set([...sharedWithFit, ...contexts('b', 4)]), { split: 'train' }),
        node('fit-c', 'fit', new Set([...contexts('b', 4), ...contexts('c', 20)]), { split: 'train' })
    ];
    const links = familyLinks(nodes).map(([a, b]) => [a, b].sort().join('|'));
    assert.deepEqual(links, ['fit-b|new-a']);
});

test('excludes new services that resemble or share identity with a protected service', () => {
    const sealed = contexts('sealed', 20);
    const nodes = [
        node('sealed-1', 'protected', sealed, { identityKeys: ['ns:Demo|Container'] }),
        node('near', 'new', new Set([...sealed, ...contexts('x', 5)])),
        node('same-container', 'new', contexts('y', 30), { identityKeys: ['ns:Demo|Container'] }),
        node('same-app-only', 'new', contexts('z', 30), { identityKeys: ['app:shared'] }),
        node('far', 'idle', contexts('w', 30))
    ];
    const excluded = protectedResemblance(nodes);
    assert.equal(excluded.get('near'), 'protected-resemblance');
    assert.equal(excluded.get('same-container'), 'protected-identity');
    assert.equal(excluded.has('same-app-only'), false);
    assert.equal(excluded.has('far'), false);
});

test('decides families: protected or bridging families are excluded, single-partition families inherit, others get a seeded split', () => {
    const nodes = [
        node('p', 'protected', new Set()),
        node('n-protected', 'new', new Set()),
        node('fit-train', 'fit', new Set(), { split: 'train' }),
        node('fit-cal', 'fit', new Set(), { split: 'calibration' }),
        node('n-bridge', 'new', new Set()),
        node('fit-train-2', 'fit', new Set(), { split: 'train' }),
        node('n-inherit', 'idle', new Set()),
        node('n-free', 'new', new Set(), { identityKeys: ['ns:Free|C'] })
    ];
    const links = [
        ['p', 'n-protected', 'x'],
        ['fit-train', 'n-bridge', 'x'],
        ['fit-cal', 'n-bridge', 'x'],
        ['fit-train-2', 'n-inherit', 'x']
    ];
    const { admitted, excluded } = decideComponents({
        nodes,
        links,
        protectedExclusions: new Map(),
        seed: 's',
        calibrationFraction: 0.2
    });
    assert.equal(excluded.get('n-protected'), 'family-touches-protected');
    assert.equal(excluded.get('n-bridge'), 'family-bridges-train-and-calibration');
    assert.deepEqual(admitted.get('n-inherit'), {
        split: 'train',
        familyKey: 'inherit:fit-train-2',
        inheritFrom: 'fit-train-2'
    });
    assert.equal(admitted.get('n-free').split, newFamilySplit('s', 'ns:Free|C', 0.2));
});

test('seeded family split is deterministic and roughly honours the fraction', () => {
    const splits = Array.from({ length: 2000 }, (_, index) => newFamilySplit('seed', `family-${index}`, 0.2));
    const calibration = splits.filter((split) => split === 'calibration').length / splits.length;
    assert.ok(calibration > 0.17 && calibration < 0.23);
    assert.equal(newFamilySplit('seed', 'family-1', 0.2), newFamilySplit('seed', 'family-1', 0.2));
});

test('validation catches changed canonical records, clusters that span splits and unclustered new services', () => {
    const baseRegistry = {
        services: [
            { id: 'a', license: {} },
            { id: 'b', license: {} }
        ]
    };
    const baseSplits = { assignments: { a: 'train', b: 'unseen-sap-holdout' }, clusters: [['a'], ['b']] };
    const authorized = {
        license: { identifier: 'INTERNAL-OWNER-AUTHORIZATION' },
        trainingAuthorization: { privacyReview: { status: 'passed' } }
    };
    const valid = {
        registry: { services: [...baseRegistry.services, { id: 'n', ...authorized }] },
        splits: {
            assignments: { a: 'train', b: 'calibration', n: 'train' },
            clusters: [['a', 'n'], ['b']],
            overlay: { reassigned: ['b'] }
        }
    };
    assert.deepEqual(validateCorpusOverlay({ baseRegistry, baseSplits, ...valid }), []);

    const changed = {
        ...valid,
        registry: { services: [{ id: 'a', license: { identifier: 'MIT' } }, ...valid.registry.services.slice(1)] }
    };
    assert.ok(
        validateCorpusOverlay({ baseRegistry, baseSplits, ...changed }).some((problem) =>
            problem.startsWith('canonical record changed')
        )
    );

    const spanning = { ...valid, splits: { ...valid.splits, clusters: [['a', 'n', 'b']] } };
    assert.ok(
        validateCorpusOverlay({ baseRegistry, baseSplits, ...spanning }).some((problem) =>
            problem.startsWith('cluster spans splits')
        )
    );

    const unclustered = { ...valid, splits: { ...valid.splits, clusters: [['a'], ['b']] } };
    assert.ok(
        validateCorpusOverlay({ baseRegistry, baseSplits, ...unclustered }).some((problem) =>
            problem.startsWith('new service has no cluster')
        )
    );
});
