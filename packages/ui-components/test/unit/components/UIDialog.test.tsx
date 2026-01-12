import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UIDialog, UIDialogScrollArea, DIALOG_MAX_HEIGHT_OFFSET } from '../../../src/components/UIDialog';
import { ContextualMenu } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton';
import type { DOMEventListenerMock } from '../../utils/utils';
import { mockDomEventListener } from '../../utils/utils';
import { compareStylesBySelector, findStyleFromStyleSheets } from '../../utils/styles';
import * as DeepMerge from '../../../src/utilities/DeepMerge';

describe('<UIDialog />', () => {
    const windowHeight = 300;
    const onAcceptSpy = jest.fn();
    const onRejectSpy = jest.fn();
    let windowEventMock: DOMEventListenerMock;
    const changeSize = (property: 'innerHeight', value: number): void => {
        Object.defineProperty(window, property, { writable: true, configurable: true, value: value });
    };
    const commonDialogProps = {
        acceptButtonText: 'Yes',
        cancelButtonText: 'No',
        onAccept: onAcceptSpy,
        onCancel: onRejectSpy,
        isOpen: true,
        children: <div className="dummy"></div>
    };

    beforeAll(() => {
        changeSize('innerHeight', windowHeight);
    });

    beforeEach(() => {
        windowEventMock = mockDomEventListener(window);
        onAcceptSpy.mockClear();
        onRejectSpy.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render dialog content', () => {
        render(<UIDialog {...commonDialogProps} />);
        expect(document.querySelector('.dummy')).toBeInTheDocument();
    });

    it('On Accept', () => {
        render(<UIDialog {...commonDialogProps} />);
        const acceptButton = screen.getByText('Yes');
        fireEvent.click(acceptButton);
        expect(onAcceptSpy).toHaveBeenCalledTimes(1);
    });

    it('On Cancel', () => {
        render(<UIDialog {...commonDialogProps} />);
        const cancelButton = screen.getByText('No');
        fireEvent.click(cancelButton);
        expect(onRejectSpy).toHaveBeenCalledTimes(1);
    });

    describe('Footer', () => {
        it('Accept and reject buttons', () => {
            render(<UIDialog {...commonDialogProps} />);
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });

        it('Accept button', () => {
            render(<UIDialog {...commonDialogProps} onCancel={undefined} />);
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.queryByText('No')).not.toBeInTheDocument();
        });

        it('Reject button', () => {
            render(<UIDialog {...commonDialogProps} onAccept={undefined} />);
            expect(screen.queryByText('Yes')).not.toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });

        it('Empty footer', () => {
            render(<UIDialog acceptButtonText="Yes" cancelButtonText="No" isOpen={true} />);
            expect(screen.queryByText('Yes')).not.toBeInTheDocument();
            expect(screen.queryByText('No')).not.toBeInTheDocument();
        });

        it('Custom footer', () => {
            render(<UIDialog {...commonDialogProps} footer={<div className="dummyFooter"></div>} />);
            expect(document.querySelector('.dummyFooter')).toBeInTheDocument();
        });

        it('Custom footer with multiple elements', () => {
            render(
                <UIDialog
                    {...commonDialogProps}
                    footer={[
                        <UIDefaultButton key="accept" className="dummyButton" />,
                        <UIDefaultButton key="decline" className="dummyButton" />,
                        <UIDefaultButton key="cancel" className="dummyButton" />
                    ]}
                />
            );
            const buttons = document.querySelectorAll('.dummyButton');
            expect(buttons.length).toEqual(3);
        });
    });

    describe('onResize', () => {
        it('Resize attachment and detachment', async () => {
            const initialCount = windowEventMock.domEventListeners['resize']?.length ?? 0;

            const { rerender } = render(<UIDialog {...commonDialogProps} />);

            const openCount = windowEventMock.domEventListeners['resize']?.length ?? 0;
            expect(openCount).toBeGreaterThan(initialCount);

            // Close dialog
            rerender(<UIDialog {...commonDialogProps} isOpen={false} />);
            // Resize detached - test with close timeout
            await new Promise((resolve) => setTimeout(resolve, 500));
            const finalCount = windowEventMock.domEventListeners['resize']?.length ?? 0;
            expect(finalCount).toBeLessThan(openCount);
        });

        it('No resize handling when scrollArea is Dialog', () => {
            // Resize attached
            const { rerender } = render(<UIDialog {...commonDialogProps} />);
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
            // Set scrollArea to Dialog
            rerender(<UIDialog {...commonDialogProps} scrollArea={UIDialogScrollArea.Dialog} />);
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(3);
            // Set scrollArea to Content
            rerender(<UIDialog {...commonDialogProps} scrollArea={UIDialogScrollArea.Content} />);
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
        });

        it('Handle resize - check state', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            const expectSize = 1000;
            render(<UIDialog {...commonDialogProps} />);

            // Simulate resize with new value
            changeSize('innerHeight', expectSize);
            windowEventMock.simulateEvent('resize', {});

            // Check applied style
            const scrollableContent = document.querySelector('.ms-Modal-scrollableContent');
            const maxWidth = findStyleFromStyleSheets('max-height', scrollableContent.firstChild as HTMLElement);
            expect(maxWidth).toEqual(`${expectSize - offset}px`);
            changeSize('innerHeight', windowHeight);
        });

        it('Handle resize when scrollArea is Dialog', () => {
            render(<UIDialog {...commonDialogProps} scrollArea={UIDialogScrollArea.Dialog} />);

            // Simulate resize with new value
            changeSize('innerHeight', 1000);
            windowEventMock.simulateEvent('resize', {});

            // Check applied style
            const scrollableContent = document.querySelector('.ms-Modal-scrollableContent');
            const maxWidth = findStyleFromStyleSheets('max-height', scrollableContent.firstChild as HTMLElement);
            expect(maxWidth).toEqual(undefined);
            changeSize('innerHeight', windowHeight);
        });
    });

    describe('closeButtonVisible', () => {
        const testCases = [
            {
                value: true,
                expect: 'inline-block'
            },
            {
                value: false,
                expect: 'none'
            },
            {
                value: undefined,
                expect: 'none'
            }
        ];
        for (const testCase of testCases) {
            it(`Value - ${testCase.value}`, () => {
                render(<UIDialog {...commonDialogProps} isBlocking={true} closeButtonVisible={testCase.value} />);
                compareStylesBySelector('button[aria-label="Close"]', {
                    display: testCase.expect
                });
            });
        }
    });

    describe('Styles', () => {
        it('Basic style - overlay', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );

            // Comprehensive overlay style validation
            compareStylesBySelector('.ms-Overlay', {
                position: 'absolute',
                top: '0px',
                left: '0px',
                right: '0px',
                bottom: '0px',
                opacity: '0.8',
                background: 'var(--vscode-editor-background)'
            });
            // Comprehensive dialog main style validation
            compareStylesBySelector('.ms-Dialog-main', {
                borderRadius: '4px',
                boxShadow: 'var(--ui-box-shadow-medium)',
                position: 'relative',
                backgroundColor: 'var(--vscode-editorWidget-background)',
                border: '1px solid var(--vscode-editorWidget-border)',
                minHeight: '100px',
                overflow: 'hidden'
            });
            // Comprehensive inner container style validation
            compareStylesBySelector('.ms-Dialog-inner', {
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '0px 0px 0px 0px'
            });
            compareStylesBySelector('.ms-Modal-scrollableContent', {
                height: '100%',
                overflow: 'hidden'
            });
        });

        it('Title - single line', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            // Comprehensive title style validation
            compareStylesBySelector('.ms-Dialog-title', {
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: '20px 45px 5px'
            });
        });

        it('Title - multi line', () => {
            render(
                <UIDialog isOpen={true} multiLineTitle={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            // Comprehensive title style validation
            compareStylesBySelector('.ms-Dialog-title', {
                textAlign: 'center',
                overflow: '',
                textOverflow: '',
                whiteSpace: '',
                padding: '20px 0px 5px'
            });
        });

        it('Footer - with buttons', () => {
            render(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );

            // Comprehensive footer style validation
            compareStylesBySelector('.ms-Dialog-actionsRight', {
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center'
            });
            compareStylesBySelector('.ms-Dialog-actions', {
                lineHeight: 'auto',
                position: 'relative'
            });

            // Verify buttons are rendered
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });

        it('Footer - empty', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const footer =
                document.querySelector('.ms-Dialog-actions') || document.querySelector('[data-testid="dialog-footer"]');
            expect(footer).toBeNull();
        });

        it('Whole dialog scrollable', () => {
            render(
                <UIDialog isOpen={true} scrollArea={UIDialogScrollArea.Dialog}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const dialog = document.querySelector('.ms-Dialog-main');
            expect(dialog).toBeInTheDocument();

            const content = document.querySelector('.ms-Dialog-content');
            expect(content).toBeInTheDocument();

            // Comprehensive style validation for dialog scroll mode
            if (dialog) {
                const styles = window.getComputedStyle(dialog);
                expect(styles.maxHeight).toBeDefined();
                expect(styles.overflow).toBeDefined();
            }
            // Comprehensive dialog main style validation
            compareStylesBySelector('.ms-Dialog-main', {
                borderRadius: '4px',
                boxShadow: 'var(--ui-box-shadow-medium)',
                position: 'relative',
                backgroundColor: 'var(--vscode-editorWidget-background)',
                border: '1px solid var(--vscode-editorWidget-border)',
                minHeight: '100px',
                overflow: ''
            });
            // Comprehensive inner container style validation
            compareStylesBySelector('.ms-Dialog-inner', {
                display: 'block',
                flexDirection: '',
                overflow: '',
                padding: '0px 0px 0px 0px'
            });
            compareStylesBySelector('.ms-Modal-scrollableContent', {
                height: '',
                overflow: ''
            });
        });
    });

    describe('Draggable dialog - handle header mousedown', () => {
        const modalProps = {
            dragOptions: {
                moveMenuItemText: 'Move',
                closeMenuItemText: 'Close',
                menu: ContextualMenu,
                keepInBounds: true
            }
        };
        it('Draggable - focus focuszone placeholder', async () => {
            const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            render(<UIDialog {...commonDialogProps} isOpen={true} modalProps={modalProps} />);
            const title = document.querySelector('.ms-Dialog-title');
            fireEvent.mouseDown(title);
            expect(focusSpy).toHaveBeenCalledTimes(1);
        });
        it('Undraggable', async () => {
            const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            render(<UIDialog {...commonDialogProps} isOpen={true} />);
            const title = document.querySelector('.ms-Dialog-title');
            fireEvent.mouseDown(title);
            expect(focusSpy).toHaveBeenCalledTimes(0);
        });
    });

    describe('Complex Dialog Structure', () => {
        it('Should render fully-featured dialog with all elements', () => {
            render(
                <UIDialog
                    isOpen={true}
                    acceptButtonText="Accept"
                    cancelButtonText="Cancel"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    multiLineTitle={false}
                    scrollArea={UIDialogScrollArea.Content}>
                    <div className="test-content">
                        <p>This is a complex dialog with multiple features</p>
                        <ul>
                            <li>Item 1</li>
                            <li>Item 2</li>
                            <li>Item 3</li>
                        </ul>
                    </div>
                </UIDialog>
            );

            // Verify all dialog elements are rendered
            expect(document.querySelector('.ms-Dialog-main')).toBeInTheDocument();
            expect(screen.getByText('This is a complex dialog with multiple features')).toBeInTheDocument();
            expect(screen.getByText('Item 1')).toBeInTheDocument();
            expect(screen.getByText('Item 2')).toBeInTheDocument();
            expect(screen.getByText('Item 3')).toBeInTheDocument();
            expect(screen.getByText('Accept')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });
    });

    describe('Property "isOpenAnimated"', () => {
        const deepMergeSpy = jest.spyOn(DeepMerge, 'deepMerge');
        beforeEach(() => {
            deepMergeSpy.mockClear();
        });
        const testCases = [
            {
                value: true,
                expectOpacity: 0
            },
            {
                value: undefined,
                expectOpacity: 0
            },
            {
                value: false,
                expectOpacity: undefined
            }
        ];
        for (const testCase of testCases) {
            it(`Open with "isOpenAnimated=${testCase.value}"`, () => {
                render(
                    <UIDialog
                        acceptButtonText="Yes"
                        cancelButtonText="No"
                        onAccept={onAcceptSpy}
                        onCancel={onRejectSpy}
                        isOpen={true}
                        isOpenAnimated={testCase.value}>
                        <div className="dummy"></div>
                    </UIDialog>
                );

                // Simulation of initial call before dialog rendered
                expect(deepMergeSpy.mock.calls[0][0].styles.root.opacity).toEqual(testCase.expectOpacity);

                // Verify dialog is accessible
                compareStylesBySelector('.ms-Dialog', {
                    opacity: '1'
                });
            });
        }
    });
});
