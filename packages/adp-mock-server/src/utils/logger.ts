import { ConsoleTransport, ToolsLogger } from '@sap-ux/logger';

const ADP_MOCK_SERVER_LOG_PREFIX = '[ADP][Mock server]';

export const logger = new ToolsLogger({ logPrefix: ADP_MOCK_SERVER_LOG_PREFIX, transports: [new ConsoleTransport()] });
