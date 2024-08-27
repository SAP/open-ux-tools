import { Deferred } from './utils';
import { ExtensionPointInfo } from './extension-point';

export type DeferredExtPointData = {
    fragmentPath: string;
    extensionPointName: string | undefined;
};

export interface ExtensionPointData {
    name: string;
    deferred: Deferred<DeferredExtPointData>;
    info: ExtensionPointInfo[];
}