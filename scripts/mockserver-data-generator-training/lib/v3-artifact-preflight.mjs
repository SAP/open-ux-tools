import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

async function checkedFile(path, expected, role) {
    const actualSize = (await stat(path)).size;
    if (actualSize !== expected.bytes) throw new TypeError(`${role} size does not match the packaged artifact`);
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(path)) digest.update(chunk);
    const actual = digest.digest('hex');
    if (actual !== expected.sha256) throw new TypeError(`${role} checksum does not match the packaged artifact`);
    return actual;
}

/** Verify export and exact packaged artifact identities before importing ONNX native code. */
export async function verifyV3TrainingArtifacts({ manifest, artifact, encoder, vocabulary, encoderSha256 }) {
    const classifiers = (manifest?.components ?? []).filter((component) => component.kind === 'classifier');
    if (classifiers.length !== 1) throw new TypeError('exactly one packaged role classifier is required');
    const files = classifiers[0].files ?? [];
    const encoderFile = files.find((file) => file.role === 'encoder');
    const vocabularyFile = files.find((file) => file.role === 'vocabulary');
    if (!encoderFile || !vocabularyFile) throw new TypeError('packaged encoder and vocabulary roles are required');
    if (encoderSha256 !== encoderFile.sha256) throw new TypeError('declared encoder checksum differs from package');
    if (artifact?.tokenizer?.maxWordPieceTokens !== 64) throw new TypeError('v3 export requires a 64-token budget');
    if (artifact.tokenizer.vocabularySha256 !== vocabularyFile.sha256) {
        throw new TypeError('export vocabulary checksum differs from package');
    }
    const actualEncoder = await checkedFile(encoder, encoderFile, 'encoder');
    const actualVocabulary = await checkedFile(vocabulary, vocabularyFile, 'vocabulary');
    return { encoderSha256: actualEncoder, vocabularySha256: actualVocabulary };
}
