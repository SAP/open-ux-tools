import { stat } from 'node:fs/promises';
import { sha256File } from '../common/io.mjs';

/**
 * Check one file's size and sha256 against its manifest entry.
 * @param {string} path file path
 * @param {{ bytes: number, sha256: string }} expected manifest entry
 * @param {string} role file role, for the error
 * @returns {Promise<string>} the verified sha256
 */
async function checkedFile(path, expected, role) {
    if ((await stat(path)).size !== expected.bytes) {
        throw new TypeError(`${role} size does not match the packaged artifact`);
    }
    const actual = await sha256File(path);
    if (actual !== expected.sha256) {
        throw new TypeError(`${role} checksum does not match the packaged artifact`);
    }
    return actual;
}

/**
 * Verify that the export, the encoder and the vocabulary are exactly the packaged ones before loading native code.
 * @param {object} options options
 * @param {object} options.manifest packaged model manifest
 * @param {object} options.artifact v3 export
 * @param {string} options.encoder encoder path
 * @param {string} options.vocabulary vocabulary path
 * @param {string} options.encoderSha256 declared encoder digest
 * @returns {Promise<{ encoderSha256: string, vocabularySha256: string }>} the verified digests
 */
export async function verifyV3TrainingArtifacts({ manifest, artifact, encoder, vocabulary, encoderSha256 }) {
    const classifiers = (manifest?.components ?? []).filter((component) => component.kind === 'classifier');
    if (classifiers.length !== 1) {
        throw new TypeError('exactly one packaged role classifier is required');
    }
    const files = classifiers[0].files ?? [];
    const encoderFile = files.find((file) => file.role === 'encoder');
    const vocabularyFile = files.find((file) => file.role === 'vocabulary');
    if (!encoderFile || !vocabularyFile) {
        throw new TypeError('packaged encoder and vocabulary roles are required');
    }
    if (encoderSha256 !== encoderFile.sha256) {
        throw new TypeError('declared encoder checksum differs from package');
    }
    if (artifact?.tokenizer?.maxWordPieceTokens !== 64) {
        throw new TypeError('v3 export requires a 64-token budget');
    }
    if (artifact.tokenizer.vocabularySha256 !== vocabularyFile.sha256) {
        throw new TypeError('export vocabulary checksum differs from package');
    }
    return {
        encoderSha256: await checkedFile(encoder, encoderFile, 'encoder'),
        vocabularySha256: await checkedFile(vocabulary, vocabularyFile, 'vocabulary')
    };
}
