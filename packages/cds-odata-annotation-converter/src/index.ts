export {
    toAnnotationFile,
    toTargetMap,
    adjustCdsTermNames,
    CdsAnnotationFile,
    toAbsoluteUriString
} from './transforms';
export { print, PrintPattern, resolveTarget, printTarget, printPrimitiveValue, printKey } from './printer/csdl-to-cds';
export { indent } from './printer';
export { printEdmJson } from './printer/edm-json';
export type { Target } from './transforms/annotation-file';
export { TARGET_TYPE } from './transforms/annotation-file';
export { initI18n } from './i18n';
