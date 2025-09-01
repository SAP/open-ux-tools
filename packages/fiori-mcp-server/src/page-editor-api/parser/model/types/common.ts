import type { ArtifactType } from '@sap/ux-specification/dist/types/src';
import type { Range } from '@sap-ux/text-document-utils';

export interface Location {
    fileUri: string;
    range: Range;
    // Relative path which does not include path to sub application
    relative?: boolean;
    // Location type - consider default as annotation
    type?: ArtifactType;
}

export interface AllowedMoveRange {
    from: number;
    to: number;
}
