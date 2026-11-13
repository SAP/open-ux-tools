#!/usr/bin/env node
/**
 * Build the concept prototype head from the dataset's `concepts/train` (ids, value kinds, banks) and
 * `concept_examples/train` (v3 field contexts), and write the concept banks into a copy of the value-bank
 * store. The encoder contract is copied from the role head; the head is validated by the runtime parser
 * against the new store before anything is written.
 */
import { datasetFile, log, numberFlag, parseCli, readJson, readJsonl, runCli, writeJson } from '../common/io.mjs';
import {
    conceptValueBank,
    embedAll,
    openEncoder,
    parseConceptHead,
    parseValueBankStore,
    serializeFieldContextV3
} from '../common/runtime.mjs';
import { buildConceptHead, conceptCatalogue, MINIMUM_EXAMPLES, replaceConceptBanks } from './concept-head.mjs';

await runCli('build-concept-head', async () => {
    const args = parseCli(
        {
            'dataset': { required: true },
            'classifier-head': { required: true },
            'encoder': { required: true },
            'vocabulary': { required: true },
            'value-banks': { required: true },
            'output-head': { required: true },
            'output-value-banks': { required: true },
            'similarity': { default: '0.75' },
            'margin': { default: '0.02' },
            'examples': { default: '100' }
        },
        'Usage: build-concept-head.mjs --dataset DIR --classifier-head head.json --encoder encoder.onnx --vocabulary vocab.txt --value-banks value-banks.v2.json --output-head concept-head.json --output-value-banks value-banks.v2.json [--similarity 0.75] [--margin 0.02] [--examples 100]'
    );
    const thresholds = {
        similarity: numberFlag(args.similarity, 'similarity'),
        margin: numberFlag(args.margin, 'margin')
    };
    const maxExamples = numberFlag(args.examples, 'examples');
    if (
        !(thresholds.similarity > 0 && thresholds.similarity <= 1) ||
        !(thresholds.margin >= 0 && thresholds.margin < 1)
    ) {
        throw new TypeError('--similarity must be in (0, 1] and --margin in [0, 1)');
    }
    if (!Number.isInteger(maxExamples) || maxExamples < MINIMUM_EXAMPLES) {
        throw new TypeError(`--examples must be an integer >= ${MINIMUM_EXAMPLES}`);
    }
    const classifierHead = await readJson(args['classifier-head']);
    const contract = {
        dim: classifierHead.dim,
        encoderSha256: classifierHead.encoderSha256,
        tokenizerSha256: classifierHead.tokenizerSha256,
        serializerFingerprint: classifierHead.serializerFingerprint
    };
    const catalogue = conceptCatalogue(await readJsonl(await datasetFile(args.dataset, 'concepts', 'train')));
    const textsByConcept = new Map();
    for (const example of await readJsonl(await datasetFile(args.dataset, 'concept_examples', 'train'))) {
        const texts = textsByConcept.get(example.concept) ?? [];
        texts.push(serializeFieldContextV3(example.context));
        textsByConcept.set(example.concept, texts);
    }
    const embedder = await openEncoder({
        encoder: args.encoder,
        vocabulary: args.vocabulary,
        encoderSha256: contract.encoderSha256,
        vocabularySha256: contract.tokenizerSha256,
        hiddenSize: contract.dim
    });
    let built;
    try {
        built = await buildConceptHead({
            catalogue,
            textsByConcept,
            embed: (texts) => embedAll(embedder, texts),
            contract,
            thresholds,
            maxExamples
        });
    } finally {
        await embedder.dispose();
    }
    const store = replaceConceptBanks(await readJson(args['value-banks']), built.banks);
    const parsedStore = parseValueBankStore(store);
    parseConceptHead(built.head, contract, (id) => conceptValueBank(parsedStore, id));
    await writeJson(args['output-value-banks'], store, { indent: 4 });
    await writeJson(args['output-head'], built.head);
    log('INFO', 'build-concept-head.done', {
        concepts: built.head.concepts.length,
        tooFewExamples: built.tooFewExamples
    });
});
