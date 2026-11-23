import * as React from 'react';
import { render } from '@testing-library/react';
import { MessageBarType } from '@fluentui/react';
import { UIMessageBar } from '../../../src/components/UIMessageBar';
import { UiIcons } from '../../../src/components/Icons';
import { findStyleFromStyleSheets } from '../../utils/styles';

describe('<UIMessageBar />', () => {
    it('Should render a UIMessageBar component', () => {
        const { container } = render(<UIMessageBar />);
        expect(container.querySelectorAll('.ms-MessageBar')).toHaveLength(1);
    });

    describe('Icon', () => {
        it('default uses Success icon', () => {
            const { container } = render(<UIMessageBar />);
            const icon = container.querySelector('i[data-icon-name]');
            expect(icon?.getAttribute('data-icon-name')).toEqual(UiIcons.Success);
        });

        it('error uses Error icon', () => {
            const { container } = render(<UIMessageBar messageBarType={MessageBarType.error} />);
            const icon = container.querySelector('i[data-icon-name]');
            expect(icon?.getAttribute('data-icon-name')).toEqual(UiIcons.Error);
        });

        it('info uses Info icon', () => {
            const { container } = render(<UIMessageBar messageBarType={MessageBarType.info} />);
            const icon = container.querySelector('i[data-icon-name]');
            expect(icon?.getAttribute('data-icon-name')).toEqual(UiIcons.Info);
        });

        it('warning uses Warning icon', () => {
            const { container } = render(<UIMessageBar messageBarType={MessageBarType.warning} />);
            const icon = container.querySelector('i[data-icon-name]');
            expect(icon?.getAttribute('data-icon-name')).toEqual(UiIcons.Warning);
        });
    });

    describe('Background color', () => {
        it('default has no explicit backgroundColor', () => {
            render(<UIMessageBar />);
            const el = document.body.querySelector('.ms-MessageBar') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toBeUndefined();
        });

        it.each([
            [MessageBarType.error, 'error'],
            [MessageBarType.success, 'success'],
            [MessageBarType.info, 'info'],
            [MessageBarType.warning, 'warning']
        ])('%s has transparent backgroundColor', (type) => {
            render(<UIMessageBar messageBarType={type} />);
            const el = document.body.querySelector('.ms-MessageBar') as HTMLElement;
            expect(findStyleFromStyleSheets('backgroundColor', el)).toEqual('transparent');
        });
    });
});
