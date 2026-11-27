import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyV3TrainingArtifacts } from '../../training/role-head/artifact-preflight.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

describe('verifyV3TrainingArtifacts', () => {
    let root;
    let input;
    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'mockgen-v3-preflight-'));
        const encoder = join(root, 'encoder.onnx');
        const vocabulary = join(root, 'vocab.txt');
        await writeFile(encoder, 'encoder-bytes');
        await writeFile(vocabulary, 'vocabulary-bytes');
        const files = [
            { role: 'encoder', sha256: sha256('encoder-bytes'), bytes: 13 },
            { role: 'vocabulary', sha256: sha256('vocabulary-bytes'), bytes: 16 }
        ];
        input = {
            manifest: { components: [{ kind: 'classifier', files }] },
            artifact: { tokenizer: { vocabularySha256: sha256('vocabulary-bytes'), maxWordPieceTokens: 64 } },
            encoder,
            vocabulary,
            encoderSha256: sha256('encoder-bytes')
        };
    });
    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    test('accepts the exact packaged encoder and vocabulary', async () => {
        // Given files that match the manifest, then both digests are returned
        await expect(verifyV3TrainingArtifacts(input)).resolves.toEqual({
            encoderSha256: sha256('encoder-bytes'),
            vocabularySha256: sha256('vocabulary-bytes')
        });
    });

    test('refuses a corrupt encoder, a wrong declared digest and a foreign export vocabulary', async () => {
        // Given an encoder with the right size but other bytes
        await writeFile(input.encoder, 'corrupt-bytes');
        await expect(verifyV3TrainingArtifacts(input)).rejects.toThrow(/encoder checksum/u);
        await writeFile(input.encoder, 'encoder-bytes');
        // Given a declared digest that is not the packaged one
        await expect(verifyV3TrainingArtifacts({ ...input, encoderSha256: 'a'.repeat(64) })).rejects.toThrow(
            /declared encoder checksum/u
        );
        // Given an export made with another vocabulary
        const foreign = { tokenizer: { vocabularySha256: 'b'.repeat(64), maxWordPieceTokens: 64 } };
        await expect(verifyV3TrainingArtifacts({ ...input, artifact: foreign })).rejects.toThrow(
            /export vocabulary checksum/u
        );
    });

    test('refuses a manifest without exactly one classifier and a short token budget', async () => {
        // Given no classifier component, or a 32-token export, then the preflight refuses
        await expect(verifyV3TrainingArtifacts({ ...input, manifest: { components: [] } })).rejects.toThrow(
            /exactly one/u
        );
        const short = { tokenizer: { ...input.artifact.tokenizer, maxWordPieceTokens: 32 } };
        await expect(verifyV3TrainingArtifacts({ ...input, artifact: short })).rejects.toThrow(/64-token/u);
    });
});
