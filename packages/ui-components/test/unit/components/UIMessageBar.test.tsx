import * as React from 'react';
import { render } from '@testing-library/react';
import type { IMessageBarProps, IMessageBarStyles } from '@fluentui/react';
import { MessageBarType } from '@fluentui/react';
import { UiIcons } from '../../../src/components/Icons';

// Capture props that UIMessageBar passes down to MessageBar
let capturedProps: IMessageBarProps | undefined;

const actual = await import('@fluentui/react');
const OriginalMessageBar = actual.MessageBar;
const mocked = {
    ...actual,
    MessageBar: (props: IMessageBarProps) => {
        capturedProps = props;
        return React.createElement(OriginalMessageBar as React.ComponentType<IMessageBarProps>, props);
    }
};
jest.unstable_mockModule('@fluentui/react', () => mocked);

const { UIMessageBar } = await import('../../../src/components/UIMessageBar');

describe('<UIMessageBar />', () => {
    beforeEach(() => {
        capturedProps = undefined;
    });

    it('Should render a UIMessageBar component - default state', () => {
        const { container } = render(<UIMessageBar />);
        expect(container.querySelectorAll('.ms-MessageBar').length).toEqual(1);
        expect(capturedProps?.messageBarIconProps?.iconName).toEqual(UiIcons.Success);
        const styles = capturedProps?.styles as IMessageBarStyles;
        expect(styles?.root?.['backgroundColor']).toEqual(undefined);
    });

    it('Test property "messageBarType" - error', () => {
        const { rerender } = render(<UIMessageBar />);
        rerender(<UIMessageBar messageBarType={MessageBarType.error} />);
        expect(capturedProps?.messageBarIconProps?.iconName).toEqual(UiIcons.Error);
        const styles = capturedProps?.styles as IMessageBarStyles;
        expect(styles?.root?.['backgroundColor']).toEqual('transparent');
    });

    it('Test property "messageBarType" - success', () => {
        const { rerender } = render(<UIMessageBar />);
        rerender(<UIMessageBar messageBarType={MessageBarType.success} />);
        expect(capturedProps?.messageBarIconProps?.iconName).toEqual(UiIcons.Success);
        const styles = capturedProps?.styles as IMessageBarStyles;
        expect(styles?.root?.['backgroundColor']).toEqual('transparent');
    });

    it('Test property "messageBarType" - info', () => {
        const { rerender } = render(<UIMessageBar />);
        rerender(<UIMessageBar messageBarType={MessageBarType.info} />);
        expect(capturedProps?.messageBarIconProps?.iconName).toEqual(UiIcons.Info);
        const styles = capturedProps?.styles as IMessageBarStyles;
        expect(styles?.root?.['backgroundColor']).toEqual('transparent');
    });

    it('Test property "messageBarType" - warning', () => {
        const { rerender } = render(<UIMessageBar />);
        rerender(<UIMessageBar messageBarType={MessageBarType.warning} />);
        expect(capturedProps?.messageBarIconProps?.iconName).toEqual(UiIcons.Warning);
        const styles = capturedProps?.styles as IMessageBarStyles;
        expect(styles?.root?.['backgroundColor']).toEqual('transparent');
    });
});
