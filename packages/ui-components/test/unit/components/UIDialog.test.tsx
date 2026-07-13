import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type {
    IDialogProps,
    IDialogFooterProps,
    IDialogStyles,
    IDialogContentStyles,
    IDialogFooterStyles
} from '@fluentui/react';
import type { DOMEventListenerMock } from '../../utils/utils';
import { mockDomEventListener } from '../../utils/utils';

// ---------------------------------------------------------------------------
// Capture props passed to FluentUI Dialog and DialogFooter
// jest.unstable_mockModule must be registered BEFORE any dynamic import of
// modules that transitively import @fluentui/react (i.e. UIDialog).
// ---------------------------------------------------------------------------
let capturedDialogProps: IDialogProps | undefined;
let capturedFooterProps: IDialogFooterProps | undefined;

const actual = await import('@fluentui/react');
const OriginalDialog = actual.Dialog;
const OriginalDialogFooter = actual.DialogFooter;

jest.unstable_mockModule('@fluentui/react', () => ({
    ...actual,
    Dialog: (props: IDialogProps) => {
        capturedDialogProps = props;
        return React.createElement(OriginalDialog as React.ComponentType<IDialogProps>, props);
    },
    DialogFooter: (props: IDialogFooterProps) => {
        capturedFooterProps = props;
        return React.createElement(OriginalDialogFooter as React.ComponentType<IDialogFooterProps>, props);
    }
}));

// Dynamic imports AFTER mock registration so UIDialog picks up the mocked @fluentui/react
const { UIDialog, UIDialogScrollArea, DIALOG_MAX_HEIGHT_OFFSET } = await import('../../../src/components/UIDialog');
const { UIDefaultButton } = await import('../../../src/components/UIButton');
const { ContextualMenu } = actual;

import type { DialogProps, DialogState } from '../../../src/components/UIDialog';

describe('<UIDialog />', () => {
    const windowHeight = 300;
    const onAcceptSpy = jest.fn();
    const onRejectSpy = jest.fn();
    let windowEventMock: DOMEventListenerMock;

    /** Current props used by the shared render; updated by rerenderWith. */
    let currentProps: DialogProps;
    /** RTL rerender function from the shared beforeEach render. */
    let rerenderFn: (ui: React.ReactElement) => void;
    /** Ref to the UIDialog class instance. */
    let dialogRef: React.RefObject<UIDialog>;

    const changeSize = (property: 'innerHeight', value: number): void => {
        Object.defineProperty(window, property, { writable: true, configurable: true, value: value });
    };

    /** Rerender with a partial prop override, merging into currentProps. */
    const rerenderWith = (overrides: Partial<DialogProps>): void => {
        currentProps = { ...currentProps, ...overrides };
        rerenderFn(
            <UIDialog ref={dialogRef} {...currentProps}>
                <div className="dummy"></div>
            </UIDialog>
        );
    };

    /** Return the state of the current UIDialog class instance. */
    const getState = (): DialogState => (dialogRef.current as unknown as { state: DialogState }).state;

    beforeAll(() => {
        changeSize('innerHeight', windowHeight);
    });

    beforeEach(() => {
        capturedDialogProps = undefined;
        capturedFooterProps = undefined;
        windowEventMock = mockDomEventListener(window);
        dialogRef = React.createRef<UIDialog>();
        currentProps = {
            acceptButtonText: 'Yes',
            cancelButtonText: 'No',
            onAccept: onAcceptSpy,
            onCancel: onRejectSpy,
            isOpen: true
        };
        const result = render(
            <UIDialog ref={dialogRef} {...currentProps}>
                <div className="dummy"></div>
            </UIDialog>
        );
        rerenderFn = result.rerender;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render dialog content', () => {
        expect(document.body.querySelectorAll('.dummy').length).toEqual(1);
    });

    it('On Accept', () => {
        const buttons = document.body.querySelectorAll('button');
        expect(buttons.length).toEqual(2);
        fireEvent.click(buttons[0]);
        expect(onAcceptSpy).toHaveBeenCalledTimes(1);
    });

    it('On Cancel', () => {
        const buttons = document.body.querySelectorAll('button');
        expect(buttons.length).toEqual(2);
        fireEvent.click(buttons[1]);
        expect(onRejectSpy).toHaveBeenCalledTimes(1);
    });

    describe('Footer', () => {
        it('Accept and reject buttons', () => {
            const buttons = document.body.querySelectorAll('button');
            expect(capturedFooterProps).toBeDefined();
            expect(buttons.length).toEqual(2);
        });

        it('Accept button', () => {
            capturedFooterProps = undefined;
            rerenderWith({ onCancel: undefined });
            const buttons = document.body.querySelectorAll('button');
            expect(capturedFooterProps).toBeDefined();
            expect(buttons.length).toEqual(1);
        });

        it('Reject button', () => {
            capturedFooterProps = undefined;
            rerenderWith({ onAccept: undefined });
            const buttons = document.body.querySelectorAll('button');
            expect(capturedFooterProps).toBeDefined();
            expect(buttons.length).toEqual(1);
        });

        it('Empty footer', () => {
            capturedFooterProps = undefined;
            rerenderWith({ onAccept: undefined, onCancel: undefined });
            const buttons = document.body.querySelectorAll('button');
            expect(capturedFooterProps).toBeUndefined();
            expect(buttons.length).toEqual(0);
        });

        it('Custom footer', () => {
            capturedFooterProps = undefined;
            rerenderWith({ footer: <div className="dummyFooter"></div> });
            expect(capturedFooterProps).toBeDefined();
            expect(document.body.querySelectorAll('.dummyFooter').length).toEqual(1);
        });

        it('Custom footer with multiple elements', () => {
            capturedFooterProps = undefined;
            rerenderWith({
                footer: [
                    <UIDefaultButton key="accept" className="dummyButton" />,
                    <UIDefaultButton key="decline" className="dummyButton" />,
                    <UIDefaultButton key="cancel" className="dummyButton" />
                ]
            });
            expect(capturedFooterProps).toBeDefined();
            expect(document.body.querySelectorAll('button.dummyButton').length).toEqual(3);
        });
    });

    describe('onResize', () => {
        it('Resize attachment and detachment', async () => {
            // Resize attached
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
            rerenderWith({ isOpen: false });
            // Resize detached - test with close timeout
            await new Promise((resolve) => setTimeout(resolve, 500));
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(2);
        });

        it('No resize handling when scrollArea is Dialog', () => {
            // Resize attached
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
            // Set scrollArea to Dialog
            rerenderWith({ scrollArea: UIDialogScrollArea.Dialog });
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(3);
            // Set scrollArea to Content
            rerenderWith({ scrollArea: UIDialogScrollArea.Content });
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
        });

        it('Handle resize - check state', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            const expectSize = 1000;
            let state = getState();
            expect(state.resizeMaxHeight).toEqual(windowHeight - offset);

            // Simulate resize with new value
            changeSize('innerHeight', expectSize);
            act(() => {
                windowEventMock.simulateEvent('resize', {});
            });

            // Check new state
            state = getState();
            expect(state.resizeMaxHeight).toEqual(expectSize - offset);

            changeSize('innerHeight', windowHeight);
        });

        it('Handle resize when scrollArea is Dialog', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            // Set scrollArea to Dialog
            rerenderWith({ scrollArea: UIDialogScrollArea.Dialog });
            let state = getState();
            expect(state.resizeMaxHeight).toEqual(windowHeight - offset);

            // Simulate resize with new value
            changeSize('innerHeight', 1000);
            act(() => {
                windowEventMock.simulateEvent('resize', {});
            });

            // Check new state - it should not be changed
            state = getState();
            expect(state.resizeMaxHeight).toEqual(windowHeight - offset);

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
                rerenderWith({
                    isBlocking: true,
                    closeButtonVisible: testCase.value
                });

                // Dialog Content Styles
                const dialogContentStyles = capturedDialogProps!.dialogContentProps!.styles as IDialogContentStyles;
                // Display undefined - visible by fluent ui styles
                expect(dialogContentStyles.button['display']).toEqual(testCase.expect);
            });
        }
    });

    describe('Styles', () => {
        it('Basic style', () => {
            expect(capturedDialogProps!.modalProps?.overlay?.styles).toEqual({
                root: {
                    background: 'var(--vscode-editor-background)',
                    opacity: 0.8
                }
            });
        });
        it('Title - single line', () => {
            const styles = capturedDialogProps!.dialogContentProps!.titleProps!.style;
            expect(styles).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "color": "var(--vscode-panelTitle-activeForeground)",
                  "overflow": "hidden",
                  "padding": "20px 45px 5px",
                  "textAlign": "center",
                  "textOverflow": "ellipsis",
                  "whiteSpace": "nowrap",
                }
            `
            );
        });

        it('Title - multi line', () => {
            rerenderWith({ multiLineTitle: true });
            const styles = capturedDialogProps!.dialogContentProps!.titleProps!.style;
            expect(styles).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "color": "var(--vscode-panelTitle-activeForeground)",
                  "padding": "20px 0  5px",
                  "textAlign": "center",
                }
            `
            );
        });

        it('Footer', () => {
            const styles = capturedFooterProps!.styles as IDialogFooterStyles;
            expect(styles).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "action": Object {
                    "margin": "0px 5px",
                  },
                  "actions": Object {
                    "lineHeight": "auto",
                    "margin": "10px 0 20px",
                  },
                  "actionsRight": Object {
                    "justifyContent": "center",
                    "margin": "0px",
                    "textAlign": "center",
                    "width": "100%",
                  },
                }
            `
            );
        });

        it('ScrollArea - content', () => {
            const dialogStyles = capturedDialogProps!.styles as IDialogStyles;
            // Dialog styles
            expect(dialogStyles.main).toMatchInlineSnapshot(
                {},
                `
                Object {
                  ".ms-Modal-scrollableContent": Object {
                    "height": "100%",
                    "overflow": "hidden",
                  },
                  "backgroundColor": "var(--vscode-editorWidget-background)",
                  "border": "1px solid var(--vscode-editorWidget-border)",
                  "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
                  "boxShadow": "var(--ui-box-shadow-medium)",
                  "minHeight": 100,
                  "overflow": "hidden",
                }
            `
            );

            // Dialog Content Styles
            const dialogContentStyles = capturedDialogProps!.dialogContentProps!.styles as IDialogContentStyles;
            expect(dialogContentStyles.header).toMatchInlineSnapshot(`undefined`);
            expect(dialogContentStyles.button).toMatchInlineSnapshot(`
                Object {
                  "display": "none",
                }
            `);
            expect(dialogContentStyles.inner).toMatchInlineSnapshot(`
                Object {
                  "display": "flex",
                  "flexDirection": "column",
                  "height": "100%",
                  "overflow": "hidden",
                  "padding": "0",
                }
            `);
            expect(dialogContentStyles.subText).toMatchInlineSnapshot(`
                Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "lineHeight": 18,
                  "margin": "0",
                }
            `);
            expect(dialogContentStyles.content).toMatchInlineSnapshot(`
                Object {
                  "color": "var(--vscode-foreground)",
                  "display": "flex",
                  "flexDirection": "column",
                  "fontSize": 13,
                  "height": "100%",
                  "maxHeight": 268,
                }
            `);
            expect(dialogContentStyles.innerContent).toMatchInlineSnapshot(`
                Object {
                  "boxSizing": "border-box",
                  "height": "100%",
                  "overflow": "auto",
                  "padding": "10px 45px",
                }
            `);
        });

        it('Whole dialog scrollable', () => {
            rerenderWith({ scrollArea: UIDialogScrollArea.Dialog });
            const dialogStyles = capturedDialogProps!.styles as IDialogStyles;
            // Dialog styles
            expect(dialogStyles.main).toMatchInlineSnapshot(`
                Object {
                  "backgroundColor": "var(--vscode-editorWidget-background)",
                  "border": "1px solid var(--vscode-editorWidget-border)",
                  "borderRadius": "var(--vscode-cornerRadius-small, 4px)",
                  "boxShadow": "var(--ui-box-shadow-medium)",
                  "minHeight": 100,
                }
            `);

            // Dialog Content Styles
            const dialogContentStyles = capturedDialogProps!.dialogContentProps!.styles as IDialogContentStyles;
            expect(dialogContentStyles.header).toMatchInlineSnapshot(`undefined`);
            expect(dialogContentStyles.button).toMatchInlineSnapshot(`
                Object {
                  "display": "none",
                }
            `);
            expect(dialogContentStyles.inner).toMatchInlineSnapshot(`
                Object {
                  "padding": "0",
                }
            `);
            expect(dialogContentStyles.subText).toMatchInlineSnapshot(`
                Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "lineHeight": 18,
                  "margin": "0",
                }
            `);
            expect(dialogContentStyles.content).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                }
            `
            );
            expect(dialogContentStyles.innerContent).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "boxSizing": "border-box",
                  "padding": "10px 45px",
                }
            `
            );
        });
    });

    describe('Draggable dialog - handle header mousedown', () => {
        const dialogSelectors = {
            main: 'div.ms-Dialog-main',
            title: 'div.ms-Dialog-title'
        };
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
            rerenderWith({ modalProps });
            const mainEl = document.body.querySelector(dialogSelectors.main);
            expect(mainEl).toBeTruthy();
            const titleElement = document.body.querySelector(dialogSelectors.title);
            expect(titleElement).toBeTruthy();
            expect(focusSpy).toHaveBeenCalledTimes(0);
            fireEvent.mouseDown(titleElement!);
            expect(document.body.querySelector(dialogSelectors.title)).toBeTruthy();
            expect(focusSpy).toHaveBeenCalledTimes(1);
        });

        it('Undraggable', async () => {
            const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            const mainEl = document.body.querySelector(dialogSelectors.main);
            expect(mainEl).toBeTruthy();
            const titleElement = document.body.querySelector(dialogSelectors.title);
            expect(titleElement).toBeTruthy();
            expect(focusSpy).toHaveBeenCalledTimes(0);
            fireEvent.mouseDown(titleElement!);
            expect(document.body.querySelector(dialogSelectors.title)).toBeTruthy();
            expect(focusSpy).toHaveBeenCalledTimes(0);
        });
    });

    describe('Property "isOpenAnimated"', () => {
        const getRootStyles = (): React.CSSProperties => {
            return (capturedDialogProps!.styles as IDialogStyles).root as React.CSSProperties;
        };
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
                capturedDialogProps = undefined;
                const localRef = React.createRef<UIDialog>();
                const { rerender: localRerender } = render(
                    <UIDialog
                        ref={localRef}
                        acceptButtonText="Yes"
                        cancelButtonText="No"
                        onAccept={onAcceptSpy}
                        onCancel={onRejectSpy}
                        isOpen={false}
                        isOpenAnimated={testCase.value}>
                        <div className="dummy"></div>
                    </UIDialog>
                );
                let styles = getRootStyles();
                // Opacity before opened
                expect(styles.opacity).toEqual(testCase.expectOpacity);
                // Open dialog to simulate opacity update
                act(() => {
                    localRerender(
                        <UIDialog
                            ref={localRef}
                            acceptButtonText="Yes"
                            cancelButtonText="No"
                            onAccept={onAcceptSpy}
                            onCancel={onRejectSpy}
                            isOpen={true}
                            isOpenAnimated={testCase.value}>
                            <div className="dummy"></div>
                        </UIDialog>
                    );
                });
                styles = getRootStyles();
                expect(styles.opacity).toEqual(undefined);
            });
        }
    });
});
