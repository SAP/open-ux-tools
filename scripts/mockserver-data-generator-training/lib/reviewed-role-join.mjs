import { createFieldContextV3 } from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import { SEMANTIC_ROLE_REGISTRY } from '../../../packages/mock-data-generator/dist/index.js';
import { LEGACY_HEAD_LABEL_ALIASES } from '../../../packages/mock-data-generator/dist/model/embedding-classifier.js';

/** Join one prior semantic-role review to the verified schema field it described. */
export function joinReviewedRole({ review, binding, purpose }) {
    if (purpose !== 'train' && purpose !== 'calibration' && purpose !== 'evaluation') {
        throw new TypeError('review purpose must be train, calibration or evaluation');
    }
    if (purpose !== 'evaluation' && binding.permission?.derivativeTrainingAllowed !== true) {
        throw new TypeError('derivative training is not permitted for this review source');
    }
    if (purpose !== 'evaluation' && !binding.permission?.permittedUses?.includes('training')) {
        throw new TypeError('training use is not permitted for this review source');
    }
    if (purpose === 'evaluation' && !binding.permission?.permittedUses?.includes('evaluation')) {
        throw new TypeError('evaluation is not permitted for this review source');
    }
    if (review?.hint === 'REVIEW_ME') {
        throw new TypeError('unresolved review cannot be joined');
    }
    // Incumbent judgments use the pilot vocabulary; translate renamed roles before validation.
    const role = LEGACY_HEAD_LABEL_ALIASES[review?.hint] ?? review?.hint;
    if (role !== 'unknown' && !SEMANTIC_ROLE_REGISTRY[role]) {
        throw new TypeError('reviewed role is not registered');
    }
    if (review.source_service !== binding.reviewSourceService) {
        throw new TypeError('review source service mismatch');
    }
    if (!/^[a-f0-9]{64}$/u.test(binding.sourceChecksum ?? '')) {
        throw new TypeError('verified source checksum is required');
    }
    if (binding.schemaEntitySet && binding.reviewEntityName !== review.entity_type_name) {
        throw new TypeError('review entity binding mismatch');
    }
    const entities = binding.graph?.entities?.filter((entity) =>
        binding.schemaEntitySet
            ? entity.entitySetName === binding.schemaEntitySet
            : entity.name === review.entity_type_name || entity.entitySetName === review.entity_type_name
    );
    if (entities?.length !== 1) {
        throw new TypeError('review must match exactly one schema entity');
    }
    const entity = entities[0];
    const properties = entity.properties.filter((property) => property.name === review.property_name);
    if (properties.length !== 1) {
        throw new TypeError('review must match exactly one schema property');
    }
    const context = createFieldContextV3(binding.graph, entity, properties[0]);
    return Object.freeze({
        id: `${binding.serviceId}/${entity.entitySetName}/${properties[0].name}`,
        group: binding.serviceId,
        label: role,
        context,
        reviewKind: binding.reviewKind,
        source: Object.freeze({
            serviceId: binding.serviceId,
            reviewSourceService: binding.reviewSourceService,
            sourceChecksum: binding.sourceChecksum
        })
    });
}
