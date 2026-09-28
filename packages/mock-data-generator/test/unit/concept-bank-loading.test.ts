import { readFile } from 'node:fs/promises';
import { createLearnedRuntime } from '../../src/index.js';
import { createLearnedRuntime as createModelLearnedRuntime } from '../../src/model/learned-runtime.js';
import { parsePackagedModelManifest, verifyPackagedModels } from '../../src/model/packaged-models.js';
import { packagedRuntimeManifest } from '../../src/standalone.js';
import { VALUE_BANKS, conceptValueBank } from '../../src/semantics/bank-store.js';
import { SEMANTIC_ROLE_REGISTRY, SEMANTIC_ROLE_REGISTRY_FINGERPRINT } from '../../src/semantics/role-registry.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, serializeFieldContextV3 } from '../../src/semantics/field-context.js';
import type { ModelManifest } from '../../src/model/manifest.js';
import type { VerifiedModelArtifacts } from '../../src/model/runtime-artifacts.js';

/**
 * The packaged classifier alone (no SFT component), verified from the package's own model files.
 *
 * @returns the runtime manifest and its verified artifacts
 */
async function packagedClassifier(): Promise<{ manifest: ModelManifest; cache: VerifiedModelArtifacts }> {
    const packaged = parsePackagedModelManifest(
        JSON.parse(await readFile('resources/models/manifest.json', 'utf8')) as unknown
    );
    const verification = await verifyPackagedModels('resources/models', packaged);
    const runtimeManifest = packagedRuntimeManifest(packaged);
    const classifier = runtimeManifest.components.find(({ kind }) => kind === 'classifier');
    const files = classifier && verification.files.get(classifier.id);
    if (!classifier || !files) {
        throw new Error('The packaged classifier fixture is missing');
    }
    return {
        manifest: { ...runtimeManifest, components: [classifier] },
        cache: { ready: true, failures: [], files: new Map([[classifier.id, files]]) }
    };
}

describe('concept head loading from the value-bank store', () => {
    it('given the packaged classifier, when it loads, then every concept reads its values from the store', async () => {
        const { manifest, cache } = await packagedClassifier();
        const handle = await createLearnedRuntime(manifest, cache);
        try {
            expect(handle.diagnostics).toEqual([]);
            const concept = [...VALUE_BANKS.banks.values()].find((bank) => bank.kind === 'concept');
            const loaded = concept && handle.runtime.classifier?.conceptBank?.(concept.id);
            expect(loaded).toBeDefined();
            expect(loaded?.values).toBe(conceptValueBank(VALUE_BANKS, concept?.id ?? '')?.values);
        } finally {
            await handle.dispose();
        }
    });

    it('given a contract without value banks, when the concept head loads, then the classifier is unavailable', async () => {
        const { manifest, cache } = await packagedClassifier();
        // The full v3 contract except the value banks, so only the missing banks can fail the load.
        const handle = await createModelLearnedRuntime(manifest, cache, undefined, {
            serializeV3Input: serializeFieldContextV3,
            v3Roles: SEMANTIC_ROLE_REGISTRY,
            v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        });
        try {
            expect(handle.runtime.classifier).toBeUndefined();
            expect(handle.diagnostics.map(({ code }) => code)).toEqual(['CLASSIFIER_RUNTIME_UNAVAILABLE']);
        } finally {
            await handle.dispose();
        }
    });
});
