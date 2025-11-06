import { ConsoleTransport, ToolsLogger } from '@sap-ux/logger';
import { ADP_MOCK_SERVER_LOG_PREFIX } from '../constants';

export const logger = new ToolsLogger({ logPrefix: ADP_MOCK_SERVER_LOG_PREFIX, transports: [new ConsoleTransport()] });
