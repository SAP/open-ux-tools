import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { verifyV3TrainingArtifacts } from './lib/v3-artifact-preflight.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('verifies the exact packaged encoder and vocabulary before native loading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-v3-preflight-'));
    try {
        const encoder = join(root, 'encoder.onnx');
        const vocabulary = join(root, 'vocab.txt');
        await writeFile(encoder, 'encoder-bytes');
        await writeFile(vocabulary, 'vocabulary-bytes');
        const manifest = {
            components: [
                {
                    kind: 'classifier',
                    files: [
                        { role: 'encoder', sha256: sha256('encoder-bytes'), bytes: 13 },
                        { role: 'vocabulary', sha256: sha256('vocabulary-bytes'), bytes: 16 }
                    ]
                }
            ]
        };
        const artifact = { tokenizer: { vocabularySha256: sha256('vocabulary-bytes'), maxWordPieceTokens: 64 } };
        const input = { manifest, artifact, encoder, vocabulary, encoderSha256: sha256('encoder-bytes') };
        assert.equal((await verifyV3TrainingArtifacts(input)).encoderSha256, sha256('encoder-bytes'));
        await writeFile(encoder, 'corrupt-bytes');
        await assert.rejects(verifyV3TrainingArtifacts(input), /encoder checksum/u);
        await writeFile(encoder, 'encoder-bytes');
        await assert.rejects(
            verifyV3TrainingArtifacts({ ...input, encoderSha256: 'a'.repeat(64) }),
            /declared encoder checksum/u
        );
        await assert.rejects(
            verifyV3TrainingArtifacts({
                ...input,
                artifact: { tokenizer: { vocabularySha256: 'b'.repeat(64), maxWordPieceTokens: 64 } }
            }),
            /export vocabulary checksum/u
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
