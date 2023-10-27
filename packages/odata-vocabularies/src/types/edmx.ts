/* eslint-disable @typescript-eslint/no-namespace */
import type { Edm } from './edm';

export namespace Edmx {
    export namespace Json {
        export interface Document {
            $Version: string;
            $Refrence?: any;
            [namespace: string]: Edm.Schema | string | any;
        }
    }
}
