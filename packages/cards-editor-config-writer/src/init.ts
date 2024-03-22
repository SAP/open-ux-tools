#!/usr/bin/env node

import { enableCardsEditor } from '.';
import { ToolsLogger } from '@sap-ux/logger';

const logger = new ToolsLogger();
enableCardsEditor(process.cwd())
    .then((fs) => {
        fs.commit(() => logger.info('Done'));
    })
    .catch((err) => {
        logger.error(err);
    });
