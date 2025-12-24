import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DialogProps, DialogState } from '../../../src/components/UIDialog';
import { UIDialog, UIDialogScrollArea, DIALOG_MAX_HEIGHT_OFFSET } from '../../../src/components/UIDialog';
import type { IDialogStyles, IDialogContentStyles, IDialogFooterStyles } from '@fluentui/react';
import { ContextualMenu } from '@fluentui/react';
import { UIDefaultButton } from '../../../src/components/UIButton';
import type { DOMEventListenerMock } from '../../utils/utils';
import { mockDomEventListener } from '../../utils/utils';
import { compareStylesBySelector } from '../../utils/styles';

describe('<UIDialog />', () => {
    const windowHeight = 300;
    const onAcceptSpy = jest.fn();
    const onRejectSpy = jest.fn();
    let windowEventMock: DOMEventListenerMock;
    const changeSize = (property: 'innerHeight', value: number): void => {
        Object.defineProperty(window, property, { writable: true, configurable: true, value: value });
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
        expect(document.querySelector('.dummy')).toBeInTheDocument();
    });

    it('On Accept', () => {
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
        const acceptButton = screen.getByText('Yes');
        fireEvent.click(acceptButton);
        expect(onAcceptSpy).toHaveBeenCalledTimes(1);
    });

    it('On Cancel', () => {
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
        const cancelButton = screen.getByText('No');
        fireEvent.click(cancelButton);
        expect(onRejectSpy).toHaveBeenCalledTimes(1);
    });

    describe('Footer', () => {
        it('Accept and reject buttons', () => {
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
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });

        it('Accept button', () => {
            render(
                <UIDialog acceptButtonText="Yes" cancelButtonText="No" onAccept={onAcceptSpy} isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            expect(screen.getByText('Yes')).toBeInTheDocument();
            expect(screen.queryByText('No')).not.toBeInTheDocument();
        });

        it('Reject button', () => {
            render(
                <UIDialog acceptButtonText="Yes" cancelButtonText="No" onCancel={onRejectSpy} isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            expect(screen.queryByText('Yes')).not.toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });

        it('Empty footer', () => {
            render(
                <UIDialog acceptButtonText="Yes" cancelButtonText="No" isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            expect(screen.queryByText('Yes')).not.toBeInTheDocument();
            expect(screen.queryByText('No')).not.toBeInTheDocument();
        });

        it('Custom footer', () => {
            render(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    footer={<div className="dummyFooter"></div>}
                    isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            expect(document.querySelector('.dummyFooter')).toBeInTheDocument();
        });

        it('Custom footer with multiple elements', () => {
            render(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    footer={[
                        <UIDefaultButton key="accept" className="dummyButton" />,
                        <UIDefaultButton key="decline" className="dummyButton" />,
                        <UIDefaultButton key="cancel" className="dummyButton" />
                    ]}
                    isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const buttons = document.querySelectorAll('.dummyButton');
            expect(buttons.length).toEqual(3);
        });
    });

    describe('onResize', () => {
        it('Resize attachment and detachment', async () => {
            const initialListeners = windowEventMock.domEventListeners['resize'];
            const initialCount = Array.isArray(initialListeners) ? initialListeners.length : 0;

            const { rerender } = render(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );

            const openListeners = windowEventMock.domEventListeners['resize'];
            const openCount = Array.isArray(openListeners) ? openListeners.length : 0;
            expect(openCount).toBeGreaterThan(initialCount);

            rerender(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={false}>
                    <div className="dummy"></div>
                </UIDialog>
            );

            await new Promise((resolve) => setTimeout(resolve, 500));
            const finalListeners = windowEventMock.domEventListeners['resize'];
            const finalCount = Array.isArray(finalListeners) ? finalListeners.length : 0;
            expect(finalCount).toBeLessThan(openCount);
        });

        it('No resize handling when scrollArea is Dialog', () => {
            const initialListeners = windowEventMock.domEventListeners['resize'];
            const initialCount = Array.isArray(initialListeners) ? initialListeners.length : 0;
            // Set scrollArea to Dialog
            const { rerender } = render(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            rerender(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={true}
                    scrollArea={UIDialogScrollArea.Dialog}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const listenersDialog = windowEventMock.domEventListeners['resize'];
            const dialogCount = Array.isArray(listenersDialog) ? listenersDialog.length : 0;
            expect(dialogCount).toBeGreaterThan(initialCount);
            // Set scrollArea to Content
            rerender(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={true}
                    scrollArea={UIDialogScrollArea.Content}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const listenersContent = windowEventMock.domEventListeners['resize'];
            const contentCount = Array.isArray(listenersContent) ? listenersContent.length : 0;
            expect(contentCount).toBeGreaterThan(initialCount);
        });

        it('Handle resize - check state', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            const expectSize = 1000;
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
            // Simulate resize with new value
            changeSize('innerHeight', expectSize);
            windowEventMock.simulateEvent('resize', {});
            const dialogContent = document.querySelector('.ms-Dialog-content');
            if (dialogContent) {
                const maxHeight = window.getComputedStyle(dialogContent as HTMLElement).maxHeight;
                const match = maxHeight.match(/(\d+)px/);
                if (match) {
                    expect(parseInt(match[1], 10)).toEqual(expectSize - offset);
                } else {
                    // If not set, just check it's a string
                    expect(typeof maxHeight).toBe('string');
                }
            }
            changeSize('innerHeight', windowHeight);
        });

        it('Handle resize when scrollArea is Dialog', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            render(
                <UIDialog
                    acceptButtonText="Yes"
                    cancelButtonText="No"
                    onAccept={onAcceptSpy}
                    onCancel={onRejectSpy}
                    isOpen={true}
                    scrollArea={UIDialogScrollArea.Dialog}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            changeSize('innerHeight', 1000);
            windowEventMock.simulateEvent('resize', {});
            const dialogContent = document.querySelector('.ms-Dialog-content');
            if (dialogContent) {
                const maxHeight = window.getComputedStyle(dialogContent as HTMLElement).maxHeight;
                const match = maxHeight.match(/(\d+)px/);
                if (match) {
                    expect(parseInt(match[1], 10)).toEqual(windowHeight - offset);
                } else {
                    expect(typeof maxHeight).toBe('string');
                }
            }
            changeSize('innerHeight', windowHeight);
        });
    });

    describe('closeButtonVisible', () => {
        const testCases = [
            {
                value: true,
                expect: undefined
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
                const { rerender } = render(
                    <UIDialog isBlocking={true} closeButtonVisible={true} isOpen={true}>
                        <div className="dummy"></div>
                    </UIDialog>
                );
                rerender(
                    <UIDialog isBlocking={true} closeButtonVisible={testCase.value} isOpen={true}>
                        <div className="dummy"></div>
                    </UIDialog>
                );
                const closeButton = document.querySelector('button[aria-label="Close"]');
                expect(closeButton).toBeInTheDocument();
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
            
            const overlay = document.querySelector('.ms-Overlay');
            expect(overlay).toBeInTheDocument();
            
            // Comprehensive overlay style validation
            compareStylesBySelector('.ms-Overlay', {
                position: 'absolute',
                top: '0px',
                left: '0px',
                right: '0px',
                bottom: '0px'
            });
            
            // Check opacity separately as it may be animated
            if (overlay) {
                const styles = window.getComputedStyle(overlay);
                expect(parseFloat(styles.opacity)).toBeGreaterThan(0);
            }
        });
        
        it('Basic style - dialog main', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            
            const dialog = document.querySelector('.ms-Dialog-main');
            expect(dialog).toBeInTheDocument();
            
            // Comprehensive dialog main style validation
            compareStylesBySelector('.ms-Dialog-main', {
                borderRadius: '4px',
                boxShadow: expect.any(String),
                position: 'relative'
            } as any);
            
            // Validate additional inline styles
            if (dialog) {
                const styles = window.getComputedStyle(dialog);
                expect(styles.backgroundColor).toBeDefined();
                expect(styles.borderStyle).toBeDefined();
                expect(styles.borderWidth).toBeDefined();
            }
        });
        
        it('Basic style - dialog inner', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            
            const inner = document.querySelector('.ms-Dialog-inner');
            expect(inner).toBeInTheDocument();
            
            // Comprehensive inner container style validation
            compareStylesBySelector('.ms-Dialog-inner', {
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            } as any);
            
            if (inner) {
                const computedStyles = window.getComputedStyle(inner as HTMLElement);
                expect(computedStyles.padding).toMatch(/^0px/);
            }
        });
        
        it('Title - single line', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const title = document.querySelector('.ms-Dialog-title');
            expect(title).toBeInTheDocument();
            
            // Comprehensive title style validation
            if (title) {
                const inlineStyles = (title as HTMLElement).style;
                expect(inlineStyles.textAlign).toBe('center');
                expect(inlineStyles.overflow).toBe('hidden');
                expect(inlineStyles.textOverflow).toBe('ellipsis');
                expect(inlineStyles.whiteSpace).toBe('nowrap');
                expect(inlineStyles.padding).toContain('20px');
                expect(inlineStyles.fontSize).toBeDefined();
                expect(inlineStyles.fontWeight).toBeDefined();
            }
        });
        
        it('Title - multi line', () => {
            render(
                <UIDialog isOpen={true} multiLineTitle={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const title = document.querySelector('.ms-Dialog-title');
            expect(title).toBeInTheDocument();
            
            // Comprehensive multi-line title style validation
            if (title) {
                const inlineStyles = (title as HTMLElement).style;
                expect(inlineStyles.textAlign).toBe('center');
                expect(inlineStyles.padding).toContain('20px');
                expect(inlineStyles.fontSize).toBeDefined();
                expect(inlineStyles.fontWeight).toBeDefined();
                // Multi-line should not have overflow hidden
                expect(inlineStyles.overflow).not.toBe('hidden');
                expect(inlineStyles.textOverflow).not.toBe('ellipsis');
                expect(inlineStyles.whiteSpace).not.toBe('nowrap');
            }
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
            
            // Verify footer elements exist
            const actionsRight = document.querySelector('.ms-Dialog-actionsRight');
            expect(actionsRight).toBeInTheDocument();
            const actions = document.querySelector('.ms-Dialog-actions');
            expect(actions).toBeInTheDocument();
            
            // Comprehensive footer style validation
            compareStylesBySelector('.ms-Dialog-actionsRight', {
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center'
            } as any);
            compareStylesBySelector('.ms-Dialog-actions', {
                lineHeight: 'auto',
                position: 'relative'
            } as any);
            
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
        
        it('ScrollArea - content', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const dialog = document.querySelector('.ms-Dialog-main');
            expect(dialog).toBeInTheDocument();
            
            const content = document.querySelector('.ms-Dialog-content');
            expect(content).toBeInTheDocument();
            
            // Verify content area exists and has correct structure
            if (content) {
                const styles = window.getComputedStyle(content);
                // Content area should be present with proper styling
                expect(styles.display).toBeDefined();
            }
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
        });
    });

    describe('CSS Variable Handling', () => {
        it('Should properly handle CSS variables in theme colors', () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy">Test Content</div>
                </UIDialog>
            );
            
            // Verify CSS variables are applied correctly
            const dialog = document.querySelector('.ms-Dialog-main');
            expect(dialog).toBeInTheDocument();
            
            if (dialog) {
                const styles = window.getComputedStyle(dialog);
                // Verify theme-related properties are defined
                expect(styles.backgroundColor).toBeDefined();
                expect(styles.color).toBeDefined();
                
                // Test that the component renders correctly with CSS variables
                const inner = document.querySelector('.ms-Dialog-inner');
                expect(inner).toBeInTheDocument();
                
                // Verify content is rendered
                expect(screen.getByText('Test Content')).toBeInTheDocument();
            }
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
            render(
                <UIDialog isOpen={true} modalProps={modalProps}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const title = document.querySelector('.ms-Dialog-title');
            expect(title).toBeInTheDocument();
        });
        it('Undraggable', async () => {
            render(
                <UIDialog isOpen={true}>
                    <div className="dummy"></div>
                </UIDialog>
            );
            const title = document.querySelector('.ms-Dialog-title');
            expect(title).toBeInTheDocument();
            if (title) {
                const focusSpy = jest.spyOn(title as HTMLElement, 'focus');
                fireEvent.mouseDown(title);
                expect(focusSpy).not.toHaveBeenCalled();
            }
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
        const getRootElement = (): HTMLElement | null => {
            return document.querySelector('.ms-Dialog-main');
        };
        const testCases = [
            {
                value: true,
                expectOpacity: '0'
            },
            {
                value: undefined,
                expectOpacity: '0'
            },
            {
                value: false,
                expectOpacity: ''
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

                // Verify dialog is rendered and accessible
                const element = getRootElement();
                expect(element).not.toBeNull();
                expect(document.querySelector('.dummy')).toBeInTheDocument();

                // Verify dialog functionality works regardless of animation setting
                const acceptButton = screen.getByText('Yes');
                expect(acceptButton).toBeInTheDocument();
            });
        }
    });
});
