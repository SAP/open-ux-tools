import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Load per-judge judgment files written by the panel workflow.
 *
 * Incomplete or malformed batch files are reported and skipped, never partially trusted.
 *
 * @param {object} options options
 * @param {string} options.runsDir directory with one subdirectory per judge
 * @param {Array<{ judgeId: string, model: string }>} options.judges judge identities
 * @param {Map<string, string[]>} options.batchItems item ids per batch id
 * @param {string} options.format expected judgments format
 * @returns {Promise<{ runs: Array<{ judgeId: string, model: string, judgments: object[] }>, problems: object[] }>} loaded runs
 */
export async function loadJudgeRuns({ runsDir, judges, batchItems, format }) {
    const runs = [];
    const problems = [];
    for (const judge of judges) {
        const judgments = [];
        const files = new Set(await readdir(join(runsDir, judge.judgeId)).catch(() => []));
        for (const [batchId, itemIds] of batchItems) {
            const name = `${batchId}.json`;
            if (!files.has(name)) {
                problems.push({ judgeId: judge.judgeId, batchId, problem: 'missing' });
                continue;
            }
            let parsed;
            try {
                parsed = JSON.parse(await readFile(join(runsDir, judge.judgeId, name), 'utf8'));
            } catch {
                problems.push({ judgeId: judge.judgeId, batchId, problem: 'unparseable' });
                continue;
            }
            const list = Array.isArray(parsed?.judgments) ? parsed.judgments : [];
            const ids = new Set(list.map((entry) => entry?.itemId));
            const complete =
                parsed?.format === format &&
                parsed.batchId === batchId &&
                list.length === itemIds.length &&
                itemIds.every((id) => ids.has(id));
            if (!complete) {
                problems.push({
                    judgeId: judge.judgeId,
                    batchId,
                    problem: 'incomplete',
                    judged: list.length,
                    expected: itemIds.length
                });
                continue;
            }
            judgments.push(...list);
        }
        runs.push({ judgeId: judge.judgeId, model: judge.model, judgments });
    }
    return { runs, problems };
}
