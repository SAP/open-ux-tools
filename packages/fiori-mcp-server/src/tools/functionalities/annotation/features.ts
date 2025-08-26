import { readFileSync } from 'fs';
import { FioriFeature } from './types';
import { join } from 'path';

const getAnnotationFeatures = (): FioriFeature[] => {
    try {
        // first try in `.fiori-ai`
        const featuresJson = readFileSync(join(__dirname, '.fiori-ai', 'annotation_features.json'), 'utf-8');
        return JSON.parse(featuresJson) as FioriFeature[];
    } catch (error) {
        const featuresJson = readFileSync(join(__dirname, 'annotation_features.json'), 'utf-8');
        return JSON.parse(featuresJson) as FioriFeature[];
    }
};

const BASE_FIORI_FEATURES = getAnnotationFeatures();

export { BASE_FIORI_FEATURES as FIORI_FEATURES };
