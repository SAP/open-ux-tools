import { readFileSync } from 'node:fs';
import { parseSftConfiguration } from '../../src/model/learned-runtime.js';
import type { SftPromptTemplate } from '../../src/model/sft-runtime.js';

/** The packaged SFT artifact's generation config, as shipped in `resources/models/sft/`. */
export const SHIPPED_SFT_GENERATION_CONFIG: Record<string, unknown> = JSON.parse(
    readFileSync(new URL('../../resources/models/sft/generation-config.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

/** The prompt template of the packaged SFT artifact, parsed by the runtime's strict parser. */
export const SHIPPED_PROMPT_TEMPLATE: SftPromptTemplate =
    parseSftConfiguration(SHIPPED_SFT_GENERATION_CONFIG).promptTemplate;
