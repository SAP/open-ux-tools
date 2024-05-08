import type { AnnotationNode } from '@sap-ux/cds-annotation-parser';

import type { NodeHandler } from '../handler';
import { annotationHandler } from './annotation';
import { collectionHandler } from './collection';
import { recordHandler } from './record';
import { recordPropertyHandler } from './record-property';
import { booleanHandler } from './boolean';
import { enumHandler } from './enum';
import { correctExpressionHandler, unknownOperatorExpressionHandler, incorrectExpressionHandler } from './expression';
import { numberHandler } from './number';
import { stringHandler, multiLineStringHandler } from './string';
import { quotedLiteralHandler } from './quoted-literal';
import { pathHandler } from './path';
import { tokenHandler } from './token';

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
