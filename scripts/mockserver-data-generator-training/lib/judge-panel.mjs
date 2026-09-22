/**
 * Transport-agnostic judge panel: validates per-judge judgments, applies majority consensus,
 * and reports agreement statistics. Labels produced here are machine consensus; the provenance
 * always states humanVerified: false.
 */

export const JUDGMENT_METHOD = 'model-panel-consensus';
const HEX64 = /^[a-f0-9]{64}$/u;

/**
 * Validate one judge's judgments against a packet.
 *
 * @param {object} options options
 * @param {object} options.packet adjudication packet
 * @param {{ judgeId: string, model: string, promptSha256: string, judgments: object[] }} options.run judge run
 * @param {string[]} options.roles registered roles
 * @returns {{ judgeId: string, model: string, promptSha256: string, byItem: Map<string, object> }} normalized run
 */
export function validateJudgeRun({ packet, run, roles }) {
    if (typeof run?.judgeId !== 'string' || typeof run?.model !== 'string' || !HEX64.test(run?.promptSha256 ?? '')) {
        throw new TypeError('judge run requires judgeId, model and a sha256 prompt fingerprint');
    }
    if (!Array.isArray(run.judgments)) throw new TypeError(`judge ${run.judgeId} judgments must be an array`);
    const registered = new Set([...roles, 'unknown']);
    const itemIds = new Set(packet.items.map((item) => item.itemId));
    const byItem = new Map();
    for (const judgment of run.judgments) {
        if (!itemIds.has(judgment?.itemId))
            throw new TypeError(`judge ${run.judgeId} judged unknown item ${judgment?.itemId}`);
        if (byItem.has(judgment.itemId))
            throw new TypeError(`judge ${run.judgeId} judged item ${judgment.itemId} twice`);
        if (!registered.has(judgment.expectedRole))
            throw new TypeError(`judge ${run.judgeId} used unregistered role ${judgment.expectedRole}`);
        if (typeof judgment.supported !== 'boolean' || typeof judgment.decisiveMetadata !== 'boolean') {
            throw new TypeError(`judge ${run.judgeId} omitted boolean flags for ${judgment.itemId}`);
        }
        byItem.set(judgment.itemId, {
            itemId: judgment.itemId,
            expectedRole: judgment.expectedRole,
            supported: judgment.supported,
            decisiveMetadata: judgment.decisiveMetadata,
            rationale: typeof judgment.rationale === 'string' ? judgment.rationale.slice(0, 200) : ''
        });
    }
    return { judgeId: run.judgeId, model: run.model, promptSha256: run.promptSha256, byItem };
}

function majorityBoolean(values) {
    const trues = values.filter(Boolean).length;
    return trues * 2 > values.length;
}

/**
 * Apply majority consensus across judge runs.
 *
 * @param {object} options options
 * @param {object} options.packet adjudication packet
 * @param {object[]} options.judgeRuns raw judge runs
 * @param {string[]} options.roles registered roles
 * @param {number} [options.minimumAgreement] votes required for consensus
 * @param {string[]} [options.statusRoles] roles in the status family (for the consistency report)
 * @returns {object} adjudication result
 */
export function adjudicatePacket({ packet, judgeRuns, roles, minimumAgreement = 2, statusRoles = [] }) {
    if (!Array.isArray(judgeRuns) || judgeRuns.length < 2)
        throw new TypeError('consensus requires at least two judge runs');
    const runs = judgeRuns.map((run) => validateJudgeRun({ packet, run, roles }));
    const judgeIds = new Set(runs.map((run) => run.judgeId));
    if (judgeIds.size !== runs.length) throw new TypeError('judge ids must be distinct');
    const models = new Set(runs.map((run) => run.model));
    if (models.size !== runs.length) throw new TypeError('judges must be distinct model identities');
    const items = packet.items.map((item) => {
        const votes = runs.map((run) => run.byItem.get(item.itemId)).filter(Boolean);
        const tally = {};
        for (const vote of votes) tally[vote.expectedRole] = (tally[vote.expectedRole] ?? 0) + 1;
        const [top] = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const consensus = top && top[1] >= minimumAgreement ? top[0] : null;
        const agreeing = consensus === null ? [] : votes.filter((vote) => vote.expectedRole === consensus);
        const base = {
            itemId: item.itemId,
            serviceId: item.serviceId,
            fieldId: item.fieldId,
            split: item.split,
            partition: item.partition,
            domain: item.domain,
            sourceChecksum: item.sourceChecksum,
            votes: tally,
            judged: votes.length
        };
        if (votes.length < minimumAgreement)
            return { ...base, expectedRole: null, reviewStatus: 'pending-missing', agreement: 'none' };
        if (consensus === null)
            return { ...base, expectedRole: null, reviewStatus: 'pending-disagreement', agreement: 'none' };
        return {
            ...base,
            expectedRole: consensus,
            reviewStatus: JUDGMENT_METHOD,
            agreement: agreeing.length === votes.length ? 'unanimous' : 'majority',
            supported: majorityBoolean(agreeing.map((vote) => vote.supported)),
            decisiveMetadata: majorityBoolean(agreeing.map((vote) => vote.decisiveMetadata))
        };
    });
    return {
        format: 'mockgen-role-adjudication-result',
        version: 1,
        provenance: {
            method: JUDGMENT_METHOD,
            humanVerified: false,
            minimumAgreement,
            guidelineSha256: packet.guidelineSha256,
            judges: runs.map((run) => ({ judgeId: run.judgeId, model: run.model, promptSha256: run.promptSha256 }))
        },
        items,
        consistency: panelConsistencyReport({ packet, runs, items, statusRoles })
    };
}

function fleissKappa(rows, categories) {
    const n = rows[0]?.length ?? 0;
    if (rows.length === 0 || n < 2) return null;
    const N = rows.length;
    const pj = new Map(categories.map((c) => [c, 0]));
    let sumPi = 0;
    for (const row of rows) {
        const counts = new Map(categories.map((c) => [c, 0]));
        for (const label of row) counts.set(label, counts.get(label) + 1);
        let pi = 0;
        for (const [c, count] of counts) {
            pj.set(c, pj.get(c) + count);
            pi += count * (count - 1);
        }
        sumPi += pi / (n * (n - 1));
    }
    const pBar = sumPi / N;
    let pe = 0;
    for (const count of pj.values()) pe += (count / (N * n)) ** 2;
    if (pe === 1) return 1;
    return (pBar - pe) / (1 - pe);
}

/**
 * Agreement and abstention statistics; counts only, no field text.
 *
 * @param {object} options options
 * @param {object} options.packet packet
 * @param {object[]} options.runs normalized judge runs
 * @param {object[]} options.items adjudicated items
 * @param {string[]} options.statusRoles status-family roles
 * @returns {object} report
 */
export function panelConsistencyReport({ packet, runs, items, statusRoles }) {
    const pairwise = [];
    for (let i = 0; i < runs.length; i += 1) {
        for (let j = i + 1; j < runs.length; j += 1) {
            let agreed = 0;
            let total = 0;
            for (const item of packet.items) {
                const a = runs[i].byItem.get(item.itemId);
                const b = runs[j].byItem.get(item.itemId);
                if (!a || !b) continue;
                total += 1;
                if (a.expectedRole === b.expectedRole) agreed += 1;
            }
            pairwise.push({
                judges: [runs[i].judgeId, runs[j].judgeId],
                agreed,
                total,
                rate: total ? agreed / total : null
            });
        }
    }
    const perJudge = Object.fromEntries(
        runs.map((run) => {
            const labels = [...run.byItem.values()].map((vote) => vote.expectedRole);
            return [
                run.judgeId,
                {
                    judged: labels.length,
                    unknown: labels.filter((label) => label === 'unknown').length,
                    statusFamily: labels.filter((label) => statusRoles.includes(label)).length
                }
            ];
        })
    );
    const histogram = {};
    for (const item of items) {
        const bucket = (histogram[item.partition] ??= {});
        const key = item.expectedRole ?? item.reviewStatus;
        bucket[key] = (bucket[key] ?? 0) + 1;
    }
    const complete = packet.items.filter((item) => runs.every((run) => run.byItem.has(item.itemId)));
    const categories = [
        ...new Set(complete.flatMap((item) => runs.map((run) => run.byItem.get(item.itemId).expectedRole)))
    ].sort();
    const kappa = fleissKappa(
        complete.map((item) => runs.map((run) => run.byItem.get(item.itemId).expectedRole)),
        categories
    );
    const statusItems = items.filter((item) => statusRoles.includes(item.expectedRole));
    const nameOnly = statusItems.filter((item) => {
        const context = packet.items.find((candidate) => candidate.itemId === item.itemId)?.context ?? {};
        const evidence = [
            context.label,
            context.description,
            context.dataElement,
            ...(context.linkedMetadataPaths ?? []),
            ...(context.relationshipParticipation ?? []).map((p) => `${p.relationship} ${p.property}`),
            JSON.stringify(context.annotations ?? [])
        ].join(' ');
        return !/status/iu.test(evidence);
    });
    return {
        pairwiseAgreement: pairwise,
        perJudge,
        labelHistogramPerPartition: histogram,
        adjudicated: items.filter((item) => item.expectedRole !== null).length,
        pendingDisagreement: items.filter((item) => item.reviewStatus === 'pending-disagreement').length,
        pendingMissing: items.filter((item) => item.reviewStatus === 'pending-missing').length,
        fleissKappa: kappa,
        statusLabelsWithNameOnlySignal: { count: nameOnly.length, total: statusItems.length }
    };
}
