import React from 'react';

import { UITooltip, UITooltipUtils } from '../src/components/UITooltip';
import { UIDefaultButton } from '../src/components/UIButton';
import { initIcons } from '../src/components/Icons';

export default { title: 'Dropdowns/Tooltip' };

initIcons();

const value = {
    name: 'Hello, world!',
    html: '<span><strong>Tag:</strong> name</span>'
};

export const Tooltips = () => (
    <>
        <div style={{ margin: 20 }}>
            <UITooltip tooltipProps={UITooltipUtils.renderContent(value.name)}>{value.name}</UITooltip>
        </div>
        <div style={{ margin: 20 }}>
            <UITooltip tooltipProps={UITooltipUtils.renderHTMLContent(value.html)}>render HTML content</UITooltip>
        </div>
        <div>
            <UITooltip content="This is the tooltip">
                <UIDefaultButton>Show tooltip on hover and ignore focus</UIDefaultButton>
            </UITooltip>
        </div>
        <div>
            <UITooltip content="This is the tooltip" showOnFocus={true}>
                <UIDefaultButton>Show tooltip on hover and on focus</UIDefaultButton>
            </UITooltip>
        </div>
    </>
);
