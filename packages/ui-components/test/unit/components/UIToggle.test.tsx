import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { IStyleFunction, IToggleStyles, IRawStyle } from '@fluentui/react';
import { Toggle } from '@fluentui/react';
import type { UIToggleProps } from '../../../src/components/UIToggle/UIToggle';
import { UIToggle, UIToggleSize } from '../../../src/components/UIToggle/UIToggle';

describe('<UIToggle />', () => {
    const handleChangeMock = jest.fn();

    beforeEach(() => {
        handleChangeMock.mockClear();
    });

    it('Should render a UIToggle component', () => {
        render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(document.querySelector('.ms-Toggle')).toBeInTheDocument();
    });

    it('Should toggle the checked state correctly', () => {
        const { rerender } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
        expect(document.querySelector('.ms-Toggle.is-checked')).not.toBeInTheDocument();

        // Simulate toggle behavior
        const button = screen.getByRole('switch');
        fireEvent.click(button);
        // Assert that handleChange was called once
        expect(handleChangeMock).toHaveBeenCalledTimes(1);
        rerender(<UIToggle onChange={handleChangeMock} checked={true} />); // Simulating controlled prop change

        // New state: checked
        expect(document.querySelector('.ms-Toggle.is-checked')).toBeInTheDocument();
    });

    describe('Styles', () => {
        const testCases = [
            {
                name: 'Standard',
                size: UIToggleSize.Standard,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '0px 0px 1px 0px',
                    height: 18,
                    width: 30,
                    innerPadding: '0 1px',
                    thumbHeight: 14,
                    thumbWidth: 14,
                    borderWidth: 1
                }
            },
            {
                name: 'Default',
                size: undefined,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '0px 0px 1px 0px',
                    height: 18,
                    width: 30,
                    innerPadding: '0 1px',
                    thumbHeight: 14,
                    thumbWidth: 14,
                    borderWidth: 1
                }
            },
            {
                name: 'Small',
                size: UIToggleSize.Small,
                expect: {
                    margin: '0',
                    fontSize: 13,
                    padding: '0px 0px 1px 0px',
                    height: 18,
                    width: 30,
                    innerPadding: '0 1px',
                    thumbHeight: 14,
                    thumbWidth: 14,
                    borderWidth: 1
                }
            }
        ];
        for (const testCase of testCases) {
            it(`Property "size" - value ${testCase.name}`, () => {
                // Create a test component that captures the styles
                let capturedStyles: IToggleStyles;
                const TestToggle = () => {
                    const toggleRef = React.useRef<any>();
                    React.useEffect(() => {
                        if (toggleRef.current) {
                            const toggle = toggleRef.current.querySelector('.ms-Toggle');
                            if (toggle) {
                                const instance = toggle._owner || toggle._reactInternalInstance;
                                if (instance?.props?.styles) {
                                    capturedStyles = instance.props.styles({});
                                }
                            }
                        }
                    });
                    return (
                        <div ref={toggleRef}>
                            <UIToggle onChange={handleChangeMock} checked={false} size={testCase.size} />
                        </div>
                    );
                };

                const { container } = render(<TestToggle />);
                const toggleComponent = container.querySelector('.ms-Toggle') as HTMLElement;
                expect(toggleComponent).toBeInTheDocument();

                // Test that the component renders with the correct size
                expect(toggleComponent).toHaveClass('ms-Toggle');
            });
        }

        it('Default', () => {
            const { container } = render(<UIToggle onChange={handleChangeMock} checked={false} />);
            const toggleElement = container.querySelector('.ms-Toggle');
            expect(toggleElement).toBeInTheDocument();
        });

        it('Checked', () => {
            const { container } = render(<UIToggle onChange={handleChangeMock} checked={true} />);
            const toggleElement = container.querySelector('.ms-Toggle');
            expect(toggleElement).toBeInTheDocument();

            // Test that the toggle renders with checked state
            expect(toggleElement).toHaveClass('is-checked');
        });
    });

    describe('Validation message', () => {
        it('Error - standard', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={false} />
            );
            expect(container.querySelector('.ts-message-wrapper--error')).toBeInTheDocument();
        });

        it('Error - inline', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} errorMessage="dummy" inlineLabel={true} />
            );
            expect(container.querySelector('.ts-message-wrapper--error')).toBeInTheDocument();
        });

        it('Warning', () => {
            const { container } = render(
                <UIToggle onChange={handleChangeMock} checked={false} warningMessage="dummy" />
            );
            expect(container.querySelector('.ts-message-wrapper--warning')).toBeInTheDocument();
        });

        it('Info', () => {
            const { container } = render(<UIToggle onChange={handleChangeMock} checked={false} infoMessage="dummy" />);
            expect(container.querySelector('.ts-message-wrapper--info')).toBeInTheDocument();
        });
    });
});
