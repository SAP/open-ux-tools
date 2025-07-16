import * as React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import type { IMessageBarProps, IMessageBarStyles } from '@fluentui/react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { UIMessageBar } from '../../../src/components/UIMessageBar';
import { UiIcons } from '../../../src/components/Icons';

describe('<UIMessageBar />', () => {
    let container: HTMLElement;
    let rerender: (ui: React.ReactElement) => void;

    beforeEach(() => {
        const result = render(<UIMessageBar />);
        container = result.container;
        rerender = result.rerender;
    });

    afterEach(() => {
        cleanup();
    });

    it('Should render a UIMessageBar component - default state', () => {
        expect(container.querySelectorAll('.ms-MessageBar').length).toEqual(1);
        const messageBar = container.querySelector('.ms-MessageBar');
        expect(messageBar).toBeInTheDocument();
        
        // Check for success icon in default state
        const successIcon = container.querySelector(`i[data-icon-name="${UiIcons.Success}"]`);
        expect(successIcon).toBeInTheDocument();
    });

    it('Test property "messageBarType" - error', () => {
        rerender(<UIMessageBar messageBarType={MessageBarType.error} />);
        const messageBar = container.querySelector('.ms-MessageBar');
        expect(messageBar).toBeInTheDocument();
        
        // Check for error icon
        const errorIcon = container.querySelector(`i[data-icon-name="${UiIcons.Error}"]`);
        expect(errorIcon).toBeInTheDocument();
    });

    it('Test property "messageBarType" - success', () => {
        rerender(<UIMessageBar messageBarType={MessageBarType.success} />);
        const messageBar = container.querySelector('.ms-MessageBar');
        expect(messageBar).toBeInTheDocument();
        
        // Check for success icon
        const successIcon = container.querySelector(`i[data-icon-name="${UiIcons.Success}"]`);
        expect(successIcon).toBeInTheDocument();
    });

    it('Test property "messageBarType" - info', () => {
        rerender(<UIMessageBar messageBarType={MessageBarType.info} />);
        const messageBar = container.querySelector('.ms-MessageBar');
        expect(messageBar).toBeInTheDocument();
        
        // Check for info icon
        const infoIcon = container.querySelector(`i[data-icon-name="${UiIcons.Info}"]`);
        expect(infoIcon).toBeInTheDocument();
    });

    it('Test property "messageBarType" - warning', () => {
        rerender(<UIMessageBar messageBarType={MessageBarType.warning} />);
        const messageBar = container.querySelector('.ms-MessageBar');
        expect(messageBar).toBeInTheDocument();
        
        // Check for warning icon
        const warningIcon = container.querySelector(`i[data-icon-name="${UiIcons.Warning}"]`);
        expect(warningIcon).toBeInTheDocument();
    });
});
