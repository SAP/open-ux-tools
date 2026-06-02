import type { AnnotationNode } from '@sap-ux/cds-annotation-parser';

import type { NodeHandler } from '../handler.js';
import { annotationHandler } from './annotation.js';
import { collectionHandler } from './collection.js';
import { recordHandler } from './record.js';
import { recordPropertyHandler } from './record-property.js';
import { booleanHandler } from './boolean.js';
import { enumHandler } from './enum.js';
import {
    correctExpressionHandler,
    unknownOperatorExpressionHandler,
    incorrectExpressionHandler
} from './expression.js';
import { numberHandler } from './number.js';
import { stringHandler, multiLineStringHandler } from './string.js';
import { quotedLiteralHandler } from './quoted-literal.js';
import { pathHandler } from './path.js';
import { tokenHandler } from './token.js';

export type NodeHandlerConfig = {
    [Node in AnnotationNode as Node['type']]?: NodeHandler<Node>;
};

export const nodeHandlerConfig: NodeHandlerConfig = {
    [annotationHandler.type]: annotationHandler,
    [recordHandler.type]: recordHandler,
    [recordPropertyHandler.type]: recordPropertyHandler,
    [collectionHandler.type]: collectionHandler,
    [booleanHandler.type]: booleanHandler,
    [stringHandler.type]: stringHandler,
    [multiLineStringHandler.type]: multiLineStringHandler,
    [enumHandler.type]: enumHandler,
    [correctExpressionHandler.type]: correctExpressionHandler,
    [unknownOperatorExpressionHandler.type]: unknownOperatorExpressionHandler,
    [incorrectExpressionHandler.type]: incorrectExpressionHandler,
    [numberHandler.type]: numberHandler,
    [quotedLiteralHandler.type]: quotedLiteralHandler,
    [pathHandler.type]: pathHandler,
    [tokenHandler.type]: tokenHandler
};
