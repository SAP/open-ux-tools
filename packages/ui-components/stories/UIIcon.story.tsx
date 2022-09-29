import React from 'react';
import type { IColumn } from '@fluentui/react';
import { DetailsList, SelectionMode } from '@fluentui/react';
import { UIIcon } from '../src/components/UIIcon';
import { initIcons, UiIcons } from '../src/components/Icons';

export default { title: 'Utilities/Icons' };

initIcons();

const items: any = [];
for (const icon in UiIcons) {
    items.push(icon);
}
items.sort();
const columns: IColumn[] = [
    {
        key: 'column1',
        name: 'Icon',
        minWidth: 50,
        maxWidth: 50,
        onRender: (item: string) => {
            return (
                <UIIcon
                    style={{
                        width: '16px',
                        height: '16px'
                    }}
                    iconName={item}
                />
            );
        }
    },
    {
        key: 'column2',
        name: 'Name',
        minWidth: 50,
        onRender: (item: string) => {
            return <span>{item}</span>;
        }
    }
];

export const SvgIcon = (): JSX.Element => {
    return (
        <div>
            <DetailsList
                selectionMode={SelectionMode.none}
                items={items}
                columns={columns}
                isHeaderVisible={true}
                selectionPreservedOnEmptyClick={true}
            />
        </div>
    );
};
