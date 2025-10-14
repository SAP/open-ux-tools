# @sap-ux/ui-components

## 1.26.12

### Patch Changes

-   4c448a7: UIDialog: updated interface to support multiple elements within the footer

## 1.26.11

### Patch Changes

-   7f652f3: Update Icons for Page and Building Block

## 1.26.10

### Patch Changes

-   904f8e3: Change Help Action icon to blue.

## 1.26.9

### Patch Changes

-   e660064: add an alert red color uidefaultbutton

## 1.26.8

### Patch Changes

-   282f30e: feat(ui-components) add icon check

## 1.26.7

### Patch Changes

-   a4e81fc: UIDialog: Override FluentUI overlay background with VSCode theme variable

## 1.26.6

### Patch Changes

-   12faf8b: feat(ui-components) add icon pdf and word

## 1.26.5

### Patch Changes

-   5b4af69: UIComboBox: Add support for external (backend) search with example in Storybook

## 1.26.4

### Patch Changes

-   739045a: feat(ui-components) export pivot

## 1.26.3

### Patch Changes

-   46c775f: Icons update. Update icons "SwitchOff" and "SwitchOn"

## 1.26.2

### Patch Changes

-   077eae5: feat(ui-components): UIIcons. Add new icon "Shift"

## 1.26.1

### Patch Changes

-   698b7e3: Fixes space between empty table and Add button.

## 1.26.0

### Minor Changes

-   e21805c: The icons <i>SwitchOff</i> and <i>SwitchOn</i> were standardized to 16×16 size. The UIToggle component was adjusted to use these icons.

## 1.25.0

### Minor Changes

-   1c276ac: Remove font-family definitions from individual components and apply it globally.

## 1.24.12

### Patch Changes

-   3a01535: UISections. Issue with window resize hiding section on fullscreen toggle event

## 1.24.11

### Patch Changes

-   21292ad: Feat(UI components): issue #32314 - UITranslationInput inverted theme

## 1.24.10

### Patch Changes

-   17847f9: UISections. Error `Cannot read properties of undefined (reading 'size')` is throws for section on initial rendering

## 1.24.9

### Patch Changes

-   3190a55: UISections. Fixed incorrect position calculations when hiding sections with three or more sections present.

## 1.24.8

### Patch Changes

-   8568e6b: feat: Info Center for different type of messages

## 1.24.7

### Patch Changes

-   8b27155: UIToggle: Avoid triggering change when click happens on whitespace between label and toggle switch button

## 1.24.6

### Patch Changes

-   689f1b8: UIIcons. Add new icon "DataSparkle"

## 1.24.5

### Patch Changes

-   b410041: fix(ui-components): UIButtonAction set margin left icon to zero

## 1.24.4

### Patch Changes

-   1215e5b: fix(ui-components): UIButtonAction underline in normal mode

## 1.24.3

### Patch Changes

-   ec30d25: Update Icons.tsx

    Shrunken down info icon

## 1.24.2

### Patch Changes

-   dd34d62: UI accessability improvements for disabled elements and in quick action list

## 1.24.1

### Patch Changes

-   7b5e3b9: UISections: Recalculate section sizes when external prop sizes change.

## 1.24.0

### Minor Changes

-   f48bfa0: This update introduces hover styles for the UIToggle component's thumb when in a checked state. It improves the visual feedback for users interacting with the toggle.

## 1.23.0

### Minor Changes

-   c570683: Unified the size-property in the UIToggle component. Fixed padding issues throughout the component. Fixed icon display issues during component mounting.

## 1.22.3

### Patch Changes

-   81a5351: Add export for `setIconOptions` method from `@fluentui/react`

## 1.22.2

### Patch Changes

-   318477a: Add missing exports:
    -   `UIChoiceGroup` - export interface `IChoiceGroup`
    -   `UIList` - export interfaces `UIGroup`, `UIGroupedListProps`, `UIGroupHeaderProps`, `UIGroupRenderProps`
    -   `UILoader` - export enum `UISpinnerSize `
    -   `UIStack` - export component `UIStack`
    -   focus utility functions - export method `isElementTabbable`

## 1.22.1

### Patch Changes

-   0fd924b: Adding a workaround for FluentUI not setting aria-invalid correctly for ComboBoxes

## 1.22.0

### Minor Changes

-   0f9d186: Added new SVG icons: SwitchOff and SwitchOn.
    Enhanced the UIToggle component by adding visual indicators to display the switch status.

## 1.21.4

### Patch Changes

-   d167a73: Enhancements to UISections: Supports resizing with three or more sections.

## 1.21.3

### Patch Changes

-   bb0531d: Introduce a new 'Manage' icon to the UIIcons component. This enhancement expands the icon library, allowing for more diversified icon usage in UI components.

## 1.21.2

### Patch Changes

-   2a72ad2: chore - Fix audit issues

## 1.21.1

### Patch Changes

-   32191dd: UITranslationInput. Screen readers read the resolved translation tooltip/title of UITranslationInput as part of the screen reader speech, displaying it as 'Value: ... Translation: ...'.

## 1.21.0

### Minor Changes

-   25b90b5: UIComboBox: New property "customSearchFilter" allows passing a custom filter function to apply additional filtering logic on top of the default search.

## 1.20.4

### Patch Changes

-   1c8b59f: Fix UITreeDropdown change callback being triggered twice on first selection:
    1. First call with empty value
    2. Second call with selected value

## 1.20.3

### Patch Changes

-   e9e1e4d: Add aria-label for UIFlexibleTable Add Row Button

## 1.20.2

### Patch Changes

-   9d06579: UITextInput, UIComboBox, UIDropdown, and UIChoiceGroup: Do not announce 'asterisk' on screen readers for required labels

## 1.20.1

### Patch Changes

-   f7c606c: UIComboBox/UIDropdown:
    Fixed an issue where `calloutCollisionTransformation` gets overwritten when external listeners are passed for the following props:
    -   calloutProps.preventDismissOnEvent
    -   calloutProps.layerProps.onLayerDidMount
    -   calloutProps.layerProps.onLayerWillUnmount

## 1.20.0

### Minor Changes

-   ae2a993: UICombobox: Added new property 'searchByKeyEnabled' to allow searching by the option's "key" in addition to "text".

## 1.19.0

### Minor Changes

-   ea18bcb: Added new API method `initTheme` to override default Fluent UI styles, removing `-webkit-font-smoothing: antialiased`.

## 1.18.11

### Patch Changes

-   b403459: fix(ui-components): #2140 - fix dropdown vertical align input field

## 1.18.10

### Patch Changes

-   9e9daa4: UIComboBox, UIDropdown: Allow extending 'calloutProps' instead of overwriting.

## 1.18.9

### Patch Changes

-   4c6f92c: feat(ui-c): add UIsetIconOptions and UIunregisterIcons

## 1.18.8

### Patch Changes

-   b669796: UIComboBox and UIDropdown support custom renderers for dropdown items via the `onRenderOption` and `onRenderItem` properties

## 1.18.7

### Patch Changes

-   e65bb7f: Update style for UICallout

## 1.18.6

### Patch Changes

-   64aacf2: Sass warning about deprecate usage of '/' for division outside of calc

## 1.18.5

### Patch Changes

-   93f8a83: chore - upgrade typescript 5.6.2

## 1.18.4

### Patch Changes

-   195d758: Applied missing styles for the disabled state of UILink.

## 1.18.3

### Patch Changes

-   89ec1c3: Uitable a11y fix: The `:focus` style should have been added to the column header cells (not to the header row).

## 1.18.2

### Patch Changes

-   1fdac94: UITable. Fix for react warning 'Each child in a list should have a unique "key" prop'

## 1.18.1

### Patch Changes

-   15c57bc: fix(ui-c): accessibility updates for uitable

## 1.18.0

### Minor Changes

-   a492b41: Provide the ability to pass any props to UITreeDropdown input.

## 1.17.9

### Patch Changes

-   ea0674c: UIContextualMenu.getUIcontextualMenuCalloutStyles - change parameter from `props?: IContextualMenuProps` to `styles?: IStyleFunctionOrObject<IContextualMenuStyleProps, IContextualMenuStyles>` and make parameter as optional

## 1.17.8

### Patch Changes

-   b124873: UIContextualMenu.getUIContextualMenuItemStyles - make `props` param optional

## 1.17.7

### Patch Changes

-   73f905f: Added optional `tabIndex` property for UISplitter component.

## 1.17.6

### Patch Changes

-   7710aa5: chore upgrade @fluentui/react@8.120.5

## 1.17.5

### Patch Changes

-   128a3dc: UIDefaultButton. Regression after context menu enhancements - ArrowDown icon always rendered for button

## 1.17.4

### Patch Changes

-   ee7aeb8: Layout types for UIContextualMenu and consider underline prop for UILink

## 1.17.3

### Patch Changes

-   0084205: chore: update sanitize-html and transitive dependencies

## 1.17.2

### Patch Changes

-   88c8bf6: export interface for UISelectableOption(ISelectableOption from fluent-ui) which support generic type for "data" property

## 1.17.1

### Patch Changes

-   9b7f144: adjust storybook after stroybook update from "7.6.18" to "8.1.11"

## 1.17.0

### Minor Changes

-   c2359077: [BREAKING CHANGE] Change TypeScript transpile target to ES2021 to align with NodeJS 18+

## 1.16.3

### Patch Changes

-   ccd9256d: Update Icons.tsx
    Icon16/ThumbsUp Icon16/ThumbsDown

## 1.16.2

### Patch Changes

-   915e7d0c: UIContextualMenu. Wrong visualisation of menu item without text when menu contains at least one menu item with icon

## 1.16.1

### Patch Changes

-   33f1df85: Update build in themes(`dark`, `light`, `hcb`) by syncing from latest VSCode 1.89.1

## 1.16.0

### Minor Changes

-   43b0ebdd: Buttons. New property 'transparent' for UIDefaultButton and minor coloring styles correction

## 1.15.15

### Patch Changes

-   fcc980f9: Save icon update
    Icon was in wrong position for some reason, so I've recentered it.

## 1.15.14

### Patch Changes

-   833718a0: Update Icons.tsx
    New icons for dev efforts

## 1.15.13

### Patch Changes

-   494fd0f1: fix: UISections splitter resize issue after window resize

## 1.15.12

### Patch Changes

-   8b0e0418: Fixed styling for disabled UICheckbox.

## 1.15.11

### Patch Changes

-   f3acc1c6: Security upgrade fixes - `webpack-dev-middleware` from `6.1.1` to `6.1.3`

## 1.15.10

### Patch Changes

-   edc3a166: UIComboBox. Extender 'isLoading' property with option to set loading within combobox input.

## 1.15.9

### Patch Changes

-   d188f765: Upgrading version of `sanitize-html` due to medium priority security issue

## 1.15.8

### Patch Changes

-   75653b31: UIIconButton. Some icons(which are not 16x16) are not centered within UIIconButton

## 1.15.7

### Patch Changes

-   942b8f2f: Fixes for SonarQube issues:
    1. Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
    1. Refactor this code to not use nested template literals.
    1. Remove this property or method or refactor "Class", as "method" is not used inside component body
    1. Move this component definition out of the parent component and pass data as props.
    1. The signature '(from: number, length?: number | undefined): string' of 'text.substr' is deprecated.
    1. Mark the props of the component as read-only.
    1. Make this public static property readonly.
    1. Prefer using an optional chain expression instead, as it's more concise and easier to read.
    1. '{property}' is deprecated.
    1. Unnecessary use of boolean literals in conditional expression.
    1. useState call is not destructured into value + setter pair
    1. Remove this commented out code.

## 1.15.6

### Patch Changes

-   f6f7111c: UIIconButton. Apply vscode theme variables for UIIconButton when 'checked' property is set as 'true'

## 1.15.5

### Patch Changes

-   80fae216: Addition of Icon for App Info Page. Needed for new dev efforts

## 1.15.4

### Patch Changes

-   eb0b7b37: Chore - TypeScript 5 upgrade

## 1.15.3

### Patch Changes

-   13dcde74: Update Icons.tsx to fix typo

## 1.15.2

### Patch Changes

-   ccf2767a: Update Icons - Expand/Collapse Groups & 3 Layout options (Layout Centre, Left. & Right)

## 1.15.1

### Patch Changes

-   601f6389: fix: Allow to pass custom `data-*` attributes for `UISections`, `UISection`, `UIToolbar` and `UIToolbarColumn` components.

## 1.15.0

### Minor Changes

-   ea1ed433: feat: New component UIQuickNavigation to allow focus through groups using keyboard shortcuts

## 1.14.2

### Patch Changes

-   be152c6f: Add lightning icon

## 1.14.1

### Patch Changes

-   17cd1c21: fix: UIDefaultButton. Apply VSCode border color(`--vscode-button-border`) to UIDefaultButton

## 1.14.0

### Minor Changes

-   3ec4de4b: Fix: UIComboBox. Prevent caret jump on input value change and on autocomplete value click

## 1.13.5

### Patch Changes

-   4f792c88: - add `ValidateInfo` icon
    -   add `ValidateError` icon
    -   add `ValidateWarning` icon

## 1.13.4

### Patch Changes

-   e47492f0: Reusable css variables and classes for common box shadows.
    Variables - `--ui-box-shadow-small`, `--ui-box-shadow-medium`, `--ui-box-shadow-large`.
    Classes - `ui-box-shadow-small `, `ui-box-shadow-medium`, `ui-box-shadow-large`.

## 1.13.3

### Patch Changes

-   3473d4b0: UIFlexibleTable. New property "isTouchDragDisabled" which allows to disable drag/reordering of table rows where drag is initalized by touch events

## 1.13.2

### Patch Changes

-   f1221f2b: fix: UIContextualMenu. Border bottom is cut for UIContextualMenu in some zoom levels

## 1.13.1

### Patch Changes

-   cbae7aba: fix: UICallout. New property "focusTargetSiblingOnTabPress", which allows to focus next/previous element relative to target when Tab key is pressed using keyboard

## 1.13.0

### Minor Changes

-   c7d5b85c: UIDropdown, UIComboBox - new property "calloutCollisionTransformation" to improve interaction between multi-select dropdown and dialog action buttons(transformation makes dialog action buttons if its overlapped by dropdown menu)

## 1.12.5

### Patch Changes

-   ade42a17: add `bookbookmark` icon

## 1.12.4

### Patch Changes

-   f2b5e735: update `header` and `layout` icons

## 1.12.3

### Patch Changes

-   c53c31e3: Update Icons.tsx

## 1.12.2

### Patch Changes

-   37f4e176: Parameterise UI Action Aallout border colour

## 1.12.1

### Patch Changes

-   9896d6f4: add `footer` icon

## 1.12.0

### Minor Changes

-   22a21267: UISplitButton update state on props change

## 1.11.21

### Patch Changes

-   95f951f9: styling changes for UIActionCallout

## 1.11.20

### Patch Changes

-   767e1c36: UIDialog, UICallout, UIContextualMenu, dropdown menus - apply border radius. 4px for UIDialog and UICallout. 2px for contextual and dropdown menus

## 1.11.19

### Patch Changes

-   a6de5157: Fixed SonarQube issue: "setState" should use a callback when referencing the previous state

## 1.11.18

### Patch Changes

-   80b95469: fix(ui-components): fix focus state for the split button

## 1.11.17

### Patch Changes

-   38d70e31: UIList. Fix - ListProps interface is extended from fluent-ui IGroupedListProps

## 1.11.16

### Patch Changes

-   2039c789: UIFlexibleTable. Fix - impossible to scroll with touch when user touches disabled row.

## 1.11.15

### Patch Changes

-   a1c0d41f: UITextField. Fix - apply font family using vscode variable to UITextField input.

## 1.11.14

### Patch Changes

-   67179f36: chore(deps): update storybook monorepo to v7.4.3

## 1.11.13

### Patch Changes

-   63c698a8: chore - fix publishing of modules missed in failed release build

## 1.11.12

### Patch Changes

-   a77300c4: chore(uic): re-fix the sleep function tests

## 1.11.11

### Patch Changes

-   0dbad1b8: chore(deps): update dependency typescript to v4.9.5

## 1.11.10

### Patch Changes

-   777d9d9d: chore(deps): update babel dependencies

## 1.11.9

### Patch Changes

-   de3bc3d5: chore(deps): update storybook monorepo to v7.4.2

## 1.11.8

### Patch Changes

-   6ab0976e: fix(uitable): fix waitFor function

## 1.11.7

### Patch Changes

-   93f711c7: 2px border radius is applied for input, dropdown, button components.

## 1.11.6

### Patch Changes

-   50bf49ac: chore(deps): update storybook to v7.4.1

## 1.11.5

### Patch Changes

-   30fc4a11: feat(ui-components) add createref as props to UICreateSelect

## 1.11.4

### Patch Changes

-   27f9cdf9: feat(ui-components) add the noOptionsMessage to UICreateSelect

## 1.11.3

### Patch Changes

-   540c38c2: feat(ui-components) add UICreateSelect component

## 1.11.2

### Patch Changes

-   4c2eef88: UIFlexibleTable. Text of column title is not fully visible

## 1.11.1

### Patch Changes

-   b9320dbf: update devDependencies

## 1.11.0

### Minor Changes

-   cb80467e: feat: add GoLeft and GoRight icons

## 1.10.0

### Minor Changes

-   c908acf2: feat(562): update star icon and add history icon

## 1.9.0

### Minor Changes

-   8577ffa4: Enhancements for DropdownMenues. UICombobox, UIDropdown and UIContextualMenu - support headers and separators. UIContextualMenu - support item text with icons(rendered on right).

## 1.8.5

### Patch Changes

-   d3e7d06b: Fixes for 'promises should not be misused' sonar bugs

## 1.8.4

### Patch Changes

-   deb06c73: `terminal` icon added

## 1.8.3

### Patch Changes

-   4ba13898: Chore - update devDeps, fix lint issues, adjust rimraf.

## 1.8.2

### Patch Changes

-   25911701: Fix for 'promises must be awaited' sonar issues

## 1.8.1

### Patch Changes

-   e315fd8a: fix: make icon positioning consistent in searchbox inputs

## 1.8.0

### Minor Changes

-   5c34522c: fix on click logic

## 1.7.0

### Minor Changes

-   8c3aecc6: update to ui action callout component

## 1.6.0

### Minor Changes

-   14c4c34f: feat: update clipboard icons

## 1.5.1

### Patch Changes

-   6b26d421: UITranslationInput. Generic type for "entries" property("I18nBundle" type) - generic type is used as parameter when "onShowExistingEntry" is called.

## 1.5.0

### Minor Changes

-   faa2fac3: feat(ui-components) add uiseparator to index

## 1.4.0

### Minor Changes

-   3771a579: feat(ui-components) icons - separator - small btn

## 1.3.9

### Patch Changes

-   28c472e: Addition of new icons- refresh, refreshsmall, expandnodes, contractnodes, contractnodessmall

## 1.3.8

### Patch Changes

-   3a61b8d: Column ids added to the flexible table header row cells

## 1.3.7

### Patch Changes

-   3d9e5ef: chore: upgrade webpack to version 5.76.0

## 1.3.6

### Patch Changes

-   925a52c: UITranslationInput. Fix - allow to pass custom "title" when i18n entry resolved

## 1.3.5

### Patch Changes

-   d350038: chore - TypeScript 4.9.4 upgrade

## 1.3.4

### Patch Changes

-   f8c3fe5: Updated filter icon, as it was totally buggy

## 1.3.3

### Patch Changes

-   ed04f6f: chore(open-ux-tools) Upgrade Dev Dependencies and fix Audit issues

## 1.3.2

### Patch Changes

-   59fc7a9: message sent icon added

## 1.3.1

### Patch Changes

-   4418744: UITranslationInput. Rename accept button default text, add title to input with information about resolved i18n value

## 1.3.0

### Minor Changes

-   e007958: feat(21552): add generic combobox column type to UITable (ColumnControlType.UICombobox)

## 1.2.0

### Minor Changes

-   92184eb: New component - UITranslationInput which provide UI to generate i18n key for entered text value

## 1.1.10

### Patch Changes

-   2bac3c4: New icon Id tag

## 1.1.9

### Patch Changes

-   ce13abe: UITextInput. Background color issue for read only input field

## 1.1.8

### Patch Changes

-   b9b66e9: UIFlexibleTable. Fixed "undefined" error when "No data." row was clicked and dragged.

## 1.1.7

### Patch Changes

-   2942309: fix(uic): fixes jumping cursor in editable table input

## 1.1.6

### Patch Changes

-   2014255: Added warning icon with smiley style.

## 1.1.5

### Patch Changes

-   e415208: UIActionButton. Remove forced color for inner icon - icon will be taken from individual icon styles

## 1.1.4

### Patch Changes

-   2447b96: New icons added for knowledge centre, Icon16/ Mission, Graduate, ClockShort, ClockMedium, ClockLong

## 1.1.3

### Patch Changes

-   dbfb2ae: UITextInput, UIComboBox, UIDropdown, UITreeDropdown. Support for "readonly" property

## 1.1.2

### Patch Changes

-   1777aff: UIFlexibleTable. Added "grab" icon for cursor when table reordering is enabled. Cursor icon changes to "default" when reordering is disabled, "grabbing" icon is displayed if reordering is started.

## 1.1.1

### Patch Changes

-   703989a: UIDialog. Enable animation for dialog open with new property "isOpenAnimated". Default value is "true".

## 1.1.0

### Minor Changes

-   69260c3: Adds UIActionCallout

## 1.0.28

### Patch Changes

-   d19e72e: New 16 px and 12px icons added. 16px Icons: Link, Highlighter. 12px Icons: Key, Hide, Main Entity, Foreighn Key, Complex Type

## 1.0.27

### Patch Changes

-   e7d10c9: Storybook update

## 1.0.26

### Patch Changes

-   cedf427: UICombobox. Default value for property "openMenuOnClick" changed to "true". Additionally, property "openMenuOnClick" is not considered during key press handling - dropdown menu is opened on first key press.

## 1.0.25

### Patch Changes

-   070d8dc: Upgrade Decode URI Component to fix potential Denial of Service vulnerability

## 1.0.24

### Patch Changes

-   cc04479: Upgrade loader-utils modules to fix known vulnerability

## 1.0.23

### Patch Changes

-   d6cb122: Changes to current icons and 2 new icons added. Expand and Collapse icons changed and CopyToClipboard and Warningsmall added

## 1.0.22

### Patch Changes

-   3a8e205: feat(ui-components) - ui-treedropdown add error message handling

## 1.0.21

### Patch Changes

-   a1ec78c: New icon for Foreign Key and 2 new icons added - Guided Answers and Chat Bubbles

## 1.0.20

### Patch Changes

-   d5431e7: Update to Info icon svg made larger

## 1.0.19

### Patch Changes

-   4ab13f2: UIFlexiblaTeble row reordering restricitions support, tooltips for cell and row headers and reordering actions

## 1.0.18

### Patch Changes

-   d893805: fix: transparent splitter issue, apply lost background color variable for splitter component

## 1.0.17

### Patch Changes

-   e4a9572: Update dependencies

## 1.0.16

### Patch Changes

-   1f3d134: chore(uie): replace vscuie prefix in css vars with vscode

## 1.0.15

### Patch Changes

-   57ed473: Add UIPersona

## 1.0.14

### Patch Changes

-   4bdcbdc: Fix peer dependencies

## 1.0.13

### Patch Changes

-   f3cbe4d: Remove dependency to i18n libraries in Yaml module

## 1.0.12

### Patch Changes

-   5becde5: New storybook story for UIMessageBar and cleanup in UIMessageBar component

## 1.0.11

### Patch Changes

-   7c0ae60: Added CustomFPMPage icon

## 1.0.10

### Patch Changes

-   b5c89da: feat - new property "secondary" for UILink component

## 1.0.9

### Patch Changes

-   41813bd: fix - Reversed logic for underline in plaintext links. It's now underlined by default, and on hover underline is removed.

## 1.0.8

### Patch Changes

-   117ba24: chore(UI-Components) Export fluentui types used in UITable

## 1.0.7

### Patch Changes

-   6f204c0: move devDependencies to dependencies

## 1.0.6

### Patch Changes

-   5b487ef: chore - Apply linting to test folders and linting fixes

## 1.0.5

### Patch Changes

-   0024d55: chore(ui-components) cherrypick UIDefaultButton fix tools-suite/pull/21665

## 1.0.4

### Patch Changes

-   a1a67b7: chore(ui-components) cherrypick UITable fix tools-suite/pull/21766

## 1.0.3

### Patch Changes

-   583a009: Fixing eslint issues

## 1.0.2

### Patch Changes

-   cf49b22: update package dependencies

## 1.0.1

### Patch Changes

-   c4fffe0: sync ui-components

## 1.0.0

### Major Changes

-   dd98509: New module @sap-ux/ui-components. Remove unused dependencies from @sap-ux/store.
