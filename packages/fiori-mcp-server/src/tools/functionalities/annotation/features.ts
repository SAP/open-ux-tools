import { readFileSync } from 'fs';
import { FioriFeature } from './types';
import { join } from 'path';
// import { EXTENDED_FIORI_FEATURES } from './extended-features';
const featuresJson = readFileSync(join(__dirname, 'features.json'), 'utf-8');

const BASE_FIORI_FEATURES: FioriFeature[] = JSON.parse(featuresJson) as FioriFeature[];

// export const ALL_FEATURES = BASE_FIORI_FEATURES.concat(EXTENDED_FIORI_FEATURES as FioriFeature[]);

export { BASE_FIORI_FEATURES as FIORI_FEATURES };
