import { init } from './main';
import { UI5AdaptationOptions } from './types';

/**
 * Constructor for a new <code>com.sap.ux.cpe.ControlPropertyEditorAdapter</code> control.
 *
 * Some class description goes here.
 
 *
 * @author OpenUI5 Team
 * @version ${version}
 *
 * @constructor
 * @public
 * @name com.sap.ux.cpe.ControlPropertyEditorAdapter
 */
export class ControlPropertyEditorAdapter {
    public init(options: UI5AdaptationOptions): void {
        init(options);
    }
}
