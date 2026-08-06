export { toAnnotationFile, toTargetMap, adjustCdsTermNames, toAbsoluteUriString } from './transforms/index.js';
export type { CdsAnnotationFile } from './transforms/index.js';
export {
    print,
    PrintPattern,
    resolveTarget,
    printTarget,
    printPrimitiveValue,
    printKey
} from './printer/csdl-to-cds.js';
export { indent } from './printer/index.js';
export { printEdmJson } from './printer/edm-json.js';
export type { Target } from './transforms/annotation-file.js';
export { TARGET_TYPE } from './transforms/annotation-file.js';
export { initI18n } from './i18n.js';
