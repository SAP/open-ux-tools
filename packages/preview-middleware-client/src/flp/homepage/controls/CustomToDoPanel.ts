import ToDoPanel from 'sap/cux/home/ToDoPanel';
import GenericTile from 'sap/m/GenericTile';
import TileContent from 'sap/m/TileContent';
import Text from 'sap/m/Text';
import Log from 'sap/base/Log';
import Context from 'sap/ui/model/Context';
import { LoadState } from 'sap/m/library';

/**
 * @namespace open.ux.preview.client.flp.homepage.controls.CustomToDoPanel
 */
export default class CustomToDoPanel extends ToDoPanel {
    public init(): void {
        this.setProperty('key', 'customPanel');
        this.setProperty('title', 'Custom Panel');
        this.setProperty('useBatch', false);

        super.init();
    }

    public generateCardTemplate(id: string, context: Context): GenericTile {
        return new GenericTile(`${id}-tile`, {
            mode: 'ActionMode',
            frameType: 'TwoByOne',
            pressEnabled: true,
            headerImage: 'sap-icon://alert',
            valueColor: 'Critical',
            header: context.getProperty('TaskTitle') as string,
            width: context.getProperty('/cardWidth') as string,
            state: context.getProperty('loadState') as LoadState,
            press: (): void => {
                // Custom action on tile press
                Log.info(`Tile ${id} pressed`);
            },
            tileContent: [
                new TileContent(`${id}-actionTileContent`, {
                    content: new Text(`${id}-text`, {
                        text: context.getProperty('TaskDescription') as string
                    })
                })
            ]
        });
    }
}