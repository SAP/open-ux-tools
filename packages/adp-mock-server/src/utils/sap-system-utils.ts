import { DEFAULT_SAP_SYSTEM_PORT } from '../server-constants';

export function getSapSystemPort(): number {
    return parseInt(process.env.SAP_SYSTEM_PORT ?? DEFAULT_SAP_SYSTEM_PORT.toString(), 10);
}
