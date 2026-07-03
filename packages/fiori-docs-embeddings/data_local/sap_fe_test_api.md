
--------------------------------

**TITLE**: sap.fe.test.api.DialogActions

**INTRODUCTION**: Constructs a new DialogActions instance.

**TAGS**: sap.fe.test, OPA5, testing, dialogactions, actions, sap.fe.test.api

**STEP**: iConfirm()

**DESCRIPTION**: Confirms the dialog by clicking the corresponding button (for example, 'OK').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCancel()

**DESCRIPTION**: Cancels the dialog by clicking the corresponding button (for example, 'Cancel').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClose()

**DESCRIPTION**: Closes the dialog by pressing the 'Escape' key.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeDialogField(vFieldIdentifier, [vValue], [bClearFirst])

**DESCRIPTION**: Changes the content of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string}` *(optional)* — The new target value.
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogAssertions

**INTRODUCTION**: Constructs a new DialogAssertions instance.

**TAGS**: sap.fe.test, OPA5, testing, dialogassertions, assertions, sap.fe.test.api

**STEP**: iCheckState([mDialogState])

**DESCRIPTION**: Checks the dialog.

Parameters:
- `mDialogState` `{object}` *(optional)* — Defines the expected state of the dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckConfirm([mButtonState])

**DESCRIPTION**: Checks the confirmation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCancel([mButtonState])

**DESCRIPTION**: Checks the cancellation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckActionParameterDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in an action parameter dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.ActionDialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckContactDialog([mState])

**DESCRIPTION**: Checks a Contact popup dialog.

Parameters:
- `mState` `{object}` *(optional)* — The expected state of dialog elements.
Pass <code>visible: false</code> to assert no matching element is shown — this also covers
controls that are not rendered (e.g. <code>UI.Hidden</code>).

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogCreateActions

**INTRODUCTION**: Constructs a new DialogCreateActions instance. Extends sap.fe.test.api.DialogActions.

**TAGS**: sap.fe.test, OPA5, testing, dialogcreateactions, actions, sap.fe.test.api

**STEP**: iExecuteCreate()

**DESCRIPTION**: Executes the <code>Create</code> action on the create dialog.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirm()

**DESCRIPTION**: Confirms the dialog by clicking the corresponding button (for example, 'OK').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCancel()

**DESCRIPTION**: Cancels the dialog by clicking the corresponding button (for example, 'Cancel').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClose()

**DESCRIPTION**: Closes the dialog by pressing the 'Escape' key.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeDialogField(vFieldIdentifier, [vValue], [bClearFirst])

**DESCRIPTION**: Changes the content of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string}` *(optional)* — The new target value.
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogCreateAssertions

**INTRODUCTION**: Constructs a new DialogCreateAssertions instance. Extends sap.fe.test.api.DialogAssertions.

**TAGS**: sap.fe.test, OPA5, testing, dialogcreateassertions, assertions, sap.fe.test.api

**STEP**: iCheckCreate([mState])

**DESCRIPTION**: Checks the <code>Create</code> action on the dialog.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckState([mDialogState])

**DESCRIPTION**: Checks the dialog.

Parameters:
- `mDialogState` `{object}` *(optional)* — Defines the expected state of the dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckConfirm([mButtonState])

**DESCRIPTION**: Checks the confirmation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCancel([mButtonState])

**DESCRIPTION**: Checks the cancellation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckActionParameterDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in an action parameter dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.ActionDialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckContactDialog([mState])

**DESCRIPTION**: Checks a Contact popup dialog.

Parameters:
- `mState` `{object}` *(optional)* — The expected state of dialog elements.
Pass <code>visible: false</code> to assert no matching element is shown — this also covers
controls that are not rendered (e.g. <code>UI.Hidden</code>).

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogMessageActions

**INTRODUCTION**: Constructs a new DialogMessageActions instance. Extends sap.fe.test.api.DialogActions.

**TAGS**: sap.fe.test, OPA5, testing, dialogmessageactions, actions, sap.fe.test.api

**STEP**: iExecuteBack()

**DESCRIPTION**: Executes the <code>Back</code> action on the message dialog.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteRefresh()

**DESCRIPTION**: Executes the <code>Refresh</code> action on the message dialog.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectDraftDataLossOption(optionKey)

**DESCRIPTION**: Selects the specified entry in the draft data loss popup.

Parameters:
- `optionKey` `{any}`

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirm()

**DESCRIPTION**: Confirms the dialog by clicking the corresponding button (for example, 'OK').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCancel()

**DESCRIPTION**: Cancels the dialog by clicking the corresponding button (for example, 'Cancel').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClose()

**DESCRIPTION**: Closes the dialog by pressing the 'Escape' key.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeDialogField(vFieldIdentifier, [vValue], [bClearFirst])

**DESCRIPTION**: Changes the content of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string}` *(optional)* — The new target value.
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogMessageAssertions

**INTRODUCTION**: Constructs a new DialogMessageActions instance. Extends sap.fe.test.api.DialogAssertions.

**TAGS**: sap.fe.test, OPA5, testing, dialogmessageassertions, assertions, sap.fe.test.api

**STEP**: iCheckBack([mState])

**DESCRIPTION**: Checks the <code>Back</code> action on the message dialog.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckRefresh([mState])

**DESCRIPTION**: Checks the <code>Refresh</code> action on the dialog.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckMessage([oMessage])

**DESCRIPTION**: Checks whether a certain message is shown in the dialog.

Parameters:
- `oMessage` `{object}` *(optional)* — Defines the expected state of the message, e.g. <code>{ title: "My message" }</code>

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckState([mDialogState])

**DESCRIPTION**: Checks the dialog.

Parameters:
- `mDialogState` `{object}` *(optional)* — Defines the expected state of the dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckConfirm([mButtonState])

**DESCRIPTION**: Checks the confirmation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCancel([mButtonState])

**DESCRIPTION**: Checks the cancellation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckActionParameterDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in an action parameter dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.ActionDialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckContactDialog([mState])

**DESCRIPTION**: Checks a Contact popup dialog.

Parameters:
- `mState` `{object}` *(optional)* — The expected state of dialog elements.
Pass <code>visible: false</code> to assert no matching element is shown — this also covers
controls that are not rendered (e.g. <code>UI.Hidden</code>).

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogValueHelpActions

**INTRODUCTION**: Constructs a new DialogValueHelpActions instance. Extends sap.fe.test.api.DialogActions.

**TAGS**: sap.fe.test, OPA5, testing, dialogvaluehelpactions, actions, sap.fe.test.api

**STEP**: iGoToSearchAndSelect()

**DESCRIPTION**: Navigates to the <code>Search and Select</code> tab.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iGoToDefineConditions()

**DESCRIPTION**: Navigates to the <code>Define Conditions</code> tab.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iExecuteShowHideFilters()

**DESCRIPTION**: Clicks the <code>Hide/Show Filters</code> button.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iChangeSearchField([sSearchText])

**DESCRIPTION**: Changes the value of the search field.

Parameters:
- `sSearchText` `{string}` *(optional)* — The new search value.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iExecuteSearch()

**DESCRIPTION**: Starts the search.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iResetSearchField()

**DESCRIPTION**: Resets the search field value.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iChangeFilterField(vFieldIdentifier, [vValue], [bClearFirst])

**DESCRIPTION**: Changes the value of a filter field.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field
- `vValue` `{string}` *(optional)* — The new target value.
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iSelectRows([vRowValues], [mState])

**DESCRIPTION**: Selects the specified rows.

Parameters:
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.
- `mState` `{object}` *(optional)* — Defines the expected state of the row

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iAddCondition(sOperator, vValues)

**DESCRIPTION**: Adds a new condition.

Parameters:
- `sOperator` `{string}` — The condition operator, like EQ, BT, LT, GT (see also {@link sap.ui.model.filter.FilterOperator})
- `vValues` `{string|Array.<string>}` — The values to be set. If the operator requires more than one value, like BT (between),
an array with the two entries is expected

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iChangeCondition(sOperator, vValues, [iConditionIndex])

**DESCRIPTION**: Changes an existing condition.

Parameters:
- `sOperator` `{string}` — The condition operator, like EQ, BT, LT, GT (see also {@link sap.ui.model.filter.FilterOperator})
- `vValues` `{string|Array.<string>}` — The values to be set. If the operator requires more than one value like BT (between)
an array with the two entries is expected
- `iConditionIndex` `{number}` *(optional)* — The index of the condition to be altered. If not set, the index 0 is used

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iRemoveCondition([iConditionIndex])

**DESCRIPTION**: Removes an existing condition.

Parameters:
- `iConditionIndex` `{number}` *(optional)* — The index of the condition to be removed. If not set, the index 0 is used

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iConfirm()

**DESCRIPTION**: Confirms the dialog by clicking the corresponding button (for example, 'OK').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCancel()

**DESCRIPTION**: Cancels the dialog by clicking the corresponding button (for example, 'Cancel').

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClose()

**DESCRIPTION**: Closes the dialog by pressing the 'Escape' key.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeDialogField(vFieldIdentifier, [vValue], [bClearFirst])

**DESCRIPTION**: Changes the content of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string}` *(optional)* — The new target value.
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

--------------------------------

**TITLE**: sap.fe.test.api.DialogValueHelpAssertions

**INTRODUCTION**: Constructs a new DialogValueHelpAssertions instance. Extends sap.fe.test.api.DialogAssertions.

**TAGS**: sap.fe.test, OPA5, testing, dialogvaluehelpassertions, assertions, sap.fe.test.api

**STEP**: iCheckFilterBar([mState])

**DESCRIPTION**: Checks the filter bar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the filter bar

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckFilterField(vFieldIdentifier, [vConditionValues], [sOperator], [mState])

**DESCRIPTION**: Checks a filter field.
If <code>vConditionValues</code> is <code>undefined</code>, the current condition values are ignored.

Parameters:
- `vFieldIdentifier` `{object|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field
- `vConditionValues` `{string|object|Array}` *(optional)* — The expected value(s) of the filter field
- `sOperator` `{string}` *(optional)* — The expected operator
- `mState` `{object}` *(optional)* — Defines the expected state of the filter field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckSearchField([sSearchText], [mState])

**DESCRIPTION**: Checks the search field in the filter bar. If the <code>sSearchText</code> parameter is <code>undefined</code>, the search text is not validated.

Parameters:
- `sSearchText` `{string}` *(optional)* — The expected text in the search field
- `mState` `{object}` *(optional)* — Defines the expected state of the search field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckTable([mState])

**DESCRIPTION**: Checks the table.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the search field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckRows([mRowValues], [iExpectedNumberOfRows], [mState])

**DESCRIPTION**: Checks the rows of a table.
If <code>mRowValues</code> is provided, only rows with the corresponding values are considered.
If <code>iNumberOfRows</code> is provided, the number of rows are checked with respect to the provided <code>mRowValues</code> (if set) or in total.
If <code>iNumberOfRows</code> is omitted, it checks for at least one matching row.
If <code>mState</code> is provided, the row must be in the given state.

Parameters:
- `mRowValues` `{object}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
- `iExpectedNumberOfRows` `{number}` *(optional)* — The expected number of rows considering <code>mRowValues</code> and <code>mRowState</code>
- `mState` `{object}` *(optional)* — Defines the expected state of the target row

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckDefineConditions([mState])

**DESCRIPTION**: Checks the <code>Define conditions</code> tab in a value help dialog.
Please be aware that the tab control of the toolbar is checked.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the filter bar

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckSearchAndSelect([mState])

**DESCRIPTION**: Checks the <code>Search and Select</code> tab in a value help dialog.
Please be aware that the tab control of the toolbar is checked.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the filter bar

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iCheckState([mDialogState])

**DESCRIPTION**: Checks the dialog.

Parameters:
- `mDialogState` `{object}` *(optional)* — Defines the expected state of the dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckConfirm([mButtonState])

**DESCRIPTION**: Checks the confirmation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCancel([mButtonState])

**DESCRIPTION**: Checks the cancellation button of the dialog.

Parameters:
- `mButtonState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in a dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.DialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckActionParameterDialogField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field in an action parameter dialog.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.ActionDialogFieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckContactDialog([mState])

**DESCRIPTION**: Checks a Contact popup dialog.

Parameters:
- `mState` `{object}` *(optional)* — The expected state of dialog elements.
Pass <code>visible: false</code> to assert no matching element is shown — this also covers
controls that are not rendered (e.g. <code>UI.Hidden</code>).

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FilterBarActions

**INTRODUCTION**: Constructs a new FilterBarActions instance. Extends sap.fe.test.api.FilterBarAPI.

**TAGS**: sap.fe.test, OPA5, testing, filterbaractions, actions, sap.fe.test.api

**STEP**: iChangeFilterField(vFieldIdentifier, [vValue], [bClearFirst])

**DESCRIPTION**: Changes the value of the defined filter field.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier for the filter field
- `vValue` `{string}` *(optional)* — The new target value
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectDropDownOption([vValue])

**DESCRIPTION**: Select a value from a filter field drop-down list.

Parameters:
- `vValue` `{string}` *(optional)* — The new value to be selected from the drop-down list

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenValueHelp(vFieldIdentifier)

**DESCRIPTION**: Opens the value help of the given field.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, that can be used for chaining statements

**STEP**: iChangeSearchField([sSearchText])

**DESCRIPTION**: Changes the search field.

Parameters:
- `sSearchText` `{string}` *(optional)* — The new search text

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iResetSearchField()

**DESCRIPTION**: Resets the search field.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeEditingStatus(sEditState)

**DESCRIPTION**: Changes the editing status filter field.

Parameters:
- `sEditState` `{sap.fe.test.api.EditState}` — Value of an edit state

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteSearch()

**DESCRIPTION**: Executes the search with the current filters.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iAddAdaptationFilterField(vFieldIdentifier)

**DESCRIPTION**: Adds a field as a filter field.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iRemoveAdaptationFilterField(vFieldIdentifier)

**DESCRIPTION**: Removes a field as a filter field.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iShowAdaptationFilterField(vFieldIdentifier)

**DESCRIPTION**: Shows a field in the filter bar using the filter adaptation dialog.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iHideAdaptationFilterField(vFieldIdentifier)

**DESCRIPTION**: Hides a field in the filter bar using the filter adaptation dialog.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteKeyboardShortcut(sShortcut, [vFieldIdentifier])

**DESCRIPTION**: Executes a keyboard shortcut.

Parameters:
- `sShortcut` `{string}` — Pattern for the shortcut
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` *(optional)* — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSaveVariant([sVariantName], [bSetAsDefault], [bApplyAutomatically])

**DESCRIPTION**: Saves a variant under the given name, or overwrites the current variant.

Parameters:
- `sVariantName` `{string}` *(optional)* — The name of the new variant. If no new variant name is defined, the current variant will be overwritten.
- `bSetAsDefault` `{string}` *(optional)* — Saves the new variant with option "Set as Default".
- `bApplyAutomatically` `{string}` *(optional)* — Saves the new variant with option "Apply Automatically".

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectVariant(sVariantName)

**DESCRIPTION**: Selects the chosen variant.

Parameters:
- `sVariantName` `{string}` — The name of the variant to be selected

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenFilterAdaptation()

**DESCRIPTION**: Opens the filter bar adaptation. It can be used in an action chain as well as in an assertion chain.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterAdaptation()

**DESCRIPTION**: Confirms the filter bar adaptation. It can be used in an action chain as well as in an assertion chain.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FilterBarAPI

**INTRODUCTION**: Constructs a new FilterBarAPI instance.

**TAGS**: sap.fe.test, OPA5, testing, filterbarapi, api, sap.fe.test.api

**STEP**: iOpenFilterAdaptation()

**DESCRIPTION**: Opens the filter bar adaptation. It can be used in an action chain as well as in an assertion chain.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterAdaptation()

**DESCRIPTION**: Confirms the filter bar adaptation. It can be used in an action chain as well as in an assertion chain.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FilterBarAssertions

**INTRODUCTION**: Constructs a new FilterBarAssertions instance. Extends sap.fe.test.api.FilterBarAPI.

**TAGS**: sap.fe.test, OPA5, testing, filterbarassertions, assertions, sap.fe.test.api

**STEP**: iCheckState([mFilterBarState])

**DESCRIPTION**: Checks the filter bar.

Parameters:
- `mFilterBarState` `{object}` *(optional)* — Defines the expected state of the filter bar

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckFilterField(vFieldIdentifier, [vConditionValues], [sOperator], [mState])

**DESCRIPTION**: Checks a filter field.
If <code>vConditionValues</code> is <code>undefined</code>, the current condition values are ignored.
Only the value of the field itself is considered, i.e. text arrangements are not part of the check.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field, or its label
- `vConditionValues` `{string|object|Array}` *(optional)* — The expected value(s) of the filter field
- `sOperator` `{string}` *(optional)* — The expected operator
- `mState` `{object}` *(optional)* — Defines the expected state of the filter field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSeeFocusOnSearchField()

**DESCRIPTION**: Checks if the focus is on the search field.

Returns: `{object}` The result of the {@link sa p.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSeeFocusOnFilterField([sFilterFieldLabel])

**DESCRIPTION**: Checks if the focus is on the filter field.

Parameters:
- `sFilterFieldLabel` `{string}` *(optional)* — The field label

Returns: `{object}` The result of the {@link sa p.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSeeFocusOnGoButton()

**DESCRIPTION**: Checks if the focus is on the Go Button of the filter bar.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSearchField([sSearchText], [mState])

**DESCRIPTION**: Checks the search field in the filter bar. If the <code>sSearchText</code> parameter is <code>undefined</code>, the search text is not validated.

Parameters:
- `sSearchText` `{string}` *(optional)* — The expected text in the search field
- `mState` `{object}` *(optional)* — Defines the expected state of the search field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckEditingStatus([sEditState], [mFieldState])

**DESCRIPTION**: Check the filter field for the editing status.

Parameters:
- `sEditState` `{sap.fe.test.api.EditState}` *(optional)* — The expected edit state value
- `mFieldState` `{object}` *(optional)* — Defines the expected state of the filter field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSearch([mState])

**DESCRIPTION**: Checks the search button.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the Go button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckFilterAdaptation()

**DESCRIPTION**: Checks whether the filter adaptation dialog is open.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAdaptationFilterField(vFieldIdentifier, [mState])

**DESCRIPTION**: Checks a field in the adaptation dialog.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field, or its label
- `mState` `{object}` *(optional)* — Defines the expected state of the filter field in the adaptation dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAdaptationFilterFieldIsVisible(vFieldIdentifier)

**DESCRIPTION**: Checks a field in the filter adaptation dialog to be visible.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field, or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAdaptationFilterFieldIsHidden(vFieldIdentifier)

**DESCRIPTION**: Checks a field in the filter adaptation dialog to be hidden.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FilterFieldIdentifier}` — The identifier of the filter field, or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenFilterAdaptation()

**DESCRIPTION**: Opens the filter bar adaptation. It can be used in an action chain as well as in an assertion chain.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterAdaptation()

**DESCRIPTION**: Confirms the filter bar adaptation. It can be used in an action chain as well as in an assertion chain.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FooterActionsBase

**INTRODUCTION**: Constructs a new FooterActionsBase instance.

**TAGS**: sap.fe.test, OPA5, testing, footeractionsbase, api, sap.fe.test.api

**STEP**: iExecuteAction([vActionIdentifier])

**DESCRIPTION**: Executes a footer action.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` *(optional)* — The identifier of the action or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FooterActionsOP

**INTRODUCTION**: Constructs a new FooterActionsOP instance. Extends sap.fe.test.api.FooterActionsBase.

**TAGS**: sap.fe.test, OPA5, testing, footeractionsop, api, sap.fe.test.api

**STEP**: iExecuteSave()

**DESCRIPTION**: Executes the Save or Create action in the footer bar of the object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteApply()

**DESCRIPTION**: Executes the Apply action in the footer bar of a sub-object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteCancel()

**DESCRIPTION**: Executes the Cancel action in the footer bar of the object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmCancel()

**DESCRIPTION**: Confirms the Cancel action when user clicks <code>Cancel</code> in draft mode.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteAction([vActionIdentifier])

**DESCRIPTION**: Executes a footer action.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` *(optional)* — The identifier of the action or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FooterAssertionsBase

**INTRODUCTION**: Constructs a new FooterAssertionsBase instance.

**TAGS**: sap.fe.test, OPA5, testing, footerassertionsbase, api, sap.fe.test.api

**STEP**: iCheckAction(vActionIdentifier, [mState])

**DESCRIPTION**: Checks the state of an action in the footer bar.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of an action
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckState([mState])

**DESCRIPTION**: Checks the state of the footer bar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the footer bar

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FooterAssertionsOP

**INTRODUCTION**: Constructs a new FooterAssertionsOP instance. Extends sap.fe.test.api.FooterAssertionsBase.

**TAGS**: sap.fe.test, OPA5, testing, footerassertionsop, api, sap.fe.test.api

**STEP**: iCheckSave([mState])

**DESCRIPTION**: Checks the state of the Save or Create action in the footer bar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckApply([mState])

**DESCRIPTION**: Checks the state of the Apply action in the footer bar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCancel([mState])

**DESCRIPTION**: Checks the state of the Cancel action in the footer bar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDraftStateClear()

**DESCRIPTION**: Checks for draft state 'Clear' in the footer bar.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDraftStateSaved()

**DESCRIPTION**: Checks for draft state 'Saved' in the footer bar.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAction(vActionIdentifier, [mState])

**DESCRIPTION**: Checks the state of an action in the footer bar.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of an action
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckState([mState])

**DESCRIPTION**: Checks the state of the footer bar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the footer bar

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.FormActions

**INTRODUCTION**: Constructs a new FormActions instance. Extends sap.fe.test.api.FormAPI.

**TAGS**: sap.fe.test, OPA5, testing, formactions, actions, sap.fe.test.api

**STEP**: iExecuteAction(vActionIdentifier)

**DESCRIPTION**: Executes an action assigned to a form in a subsection.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of the action or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteShowMore()

**DESCRIPTION**: Executes the Show More action of a form in a subsection.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteShowLess()

**DESCRIPTION**: Executes the Show Less action of a form in a subsection.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickLink(vFieldIdentifier, [bWaitForPopover])

**DESCRIPTION**: Clicks a link within a form.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.FieldIdentifier|string}` — The identifier of the field
- `bWaitForPopover` `{boolean}` *(optional)* — Whether to wait for a popover to open after clicking. The default value is false. If the link opens a popover, set this to true.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickContactLink(linkContent)

**DESCRIPTION**: Clicks a link for a contact-field within a form.

Parameters:
- `linkContent` `{string}` — The content of the link to be clicked

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickCheckBox(vFieldIdentifier)

**DESCRIPTION**: Toggles the value of a checkbox within a form.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.FieldIdentifier}` — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeField(vFieldIdentifier, [sValue])

**DESCRIPTION**: Changes the value of a field within a form.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.FieldIdentifier|string}` — The identifier of the field
- `sValue` `{string}` *(optional)* — The value to be set for the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenValueHelp(vFieldIdentifier)

**DESCRIPTION**: Opens the value help of the given field.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FieldIdentifier}` — The identifier of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function that can be used for chaining statements

--------------------------------

**TITLE**: sap.fe.test.api.FormAssertions

**INTRODUCTION**: Constructs a new FormAssertions instance. Extends sap.fe.test.api.FormAPI.

**TAGS**: sap.fe.test, OPA5, testing, formassertions, assertions, sap.fe.test.api

**STEP**: iCheckState(mState)

**DESCRIPTION**: Checks the state of the form.

Parameters:
- `mState` `{object}` — Defines the expected state of the form

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAction(vActionIdentifier, [mState])

**DESCRIPTION**: Checks the state of an action in a subsection.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of an action
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckShowMore([mState])

**DESCRIPTION**: Checks the Show More action of a form in a subsection.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckShowLess([mState])

**DESCRIPTION**: Checks the Show Less action of a form in a subsection.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckField(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks the content and state of a field within a form.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FieldIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — Expected value(s) of the field.
if passed as an object, the following pattern will be considered:
<code><pre>
{
    value: <string>, 		// optional
    description: <string> 	// optional
}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckLink(vFieldIdentifier, [sText], [mState])

**DESCRIPTION**: Checks the field is a link with the given text and state.

Parameters:
- `vFieldIdentifier` `{string|sap.fe.test.api.FieldIdentifier}` — The identifier of the field
- `sText` `{string}` *(optional)* — The link text
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.HeaderActions

**INTRODUCTION**: Constructs a new HeaderActions instance.

**TAGS**: sap.fe.test, OPA5, testing, headeractions, actions, sap.fe.test.api

**STEP**: iExecuteAction(vActionIdentifier)

**DESCRIPTION**: Executes an action in the header toolbar of an object page.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of the action

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteEdit()

**DESCRIPTION**: Executes the Edit action in the header toolbar of an object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteDraftAndSavedVersionSwitch()

**DESCRIPTION**: Executes the Draft/Saved Version action in the header toolbar of an object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteDelete()

**DESCRIPTION**: Executes the Delete action in the header toolbar of an object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteRelatedApps()

**DESCRIPTION**: Executes the Related Apps action in the header toolbar of an object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteMenuAction(vAction)

**DESCRIPTION**: Executes an action in the drop-down menu that is currently open.

Parameters:
- `vAction` `{string|object}` — The label of the action or its state

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteSelectListAction(vAction)

**DESCRIPTION**: Executes an action in the selection list that is currently open.

Parameters:
- `vAction` `{string|object}` — The label of the action or its state

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecutePaginatorDown()

**DESCRIPTION**: Navigates to the next sub-object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecutePaginatorUp()

**DESCRIPTION**: Navigates to the previous sub-object page.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iNavigateByBreadcrumb(sLink)

**DESCRIPTION**: Navigates by using a breadcrumb link on an object page.

Parameters:
- `sLink` `{string}` — The label of the link to be navigated to

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteSaveAsTile(sBookmarkTitle)

**DESCRIPTION**: Executes the <code>Save as Tile</code> action.

Parameters:
- `sBookmarkTitle` `{string}` — The title of the new tile

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteSendEmail()

**DESCRIPTION**: Executes the <code>Send E-Mail</code> action.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickLink(vLinkIdentifier)

**DESCRIPTION**: Clicks a link within the object page header.

Parameters:
- `vLinkIdentifier` `{sap.fe.test.api.HeaderFieldGroupIdentifier|string}` — The identifier of the field or the content of the link to be clicked

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.HeaderActionsLR

**INTRODUCTION**: Constructs a new HeaderActionsLR instance.

**TAGS**: sap.fe.test, OPA5, testing, headeractionslr, api, sap.fe.test.api

**STEP**: iExecuteAction([vActionIdentifier])

**DESCRIPTION**: Executes an action in the header toolbar of a list report.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` *(optional)* — The identifier of the action

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.HeaderAssertions

**INTRODUCTION**: Constructs a new HeaderAssertions instance.

**TAGS**: sap.fe.test, OPA5, testing, headerassertions, assertions, sap.fe.test.api

**STEP**: iCheckAction(vActionIdentifier, [mState])

**DESCRIPTION**: Checks an action in the header toolbar.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of the action
- `mState` `{object}` *(optional)* — Defines the expected state of the button. Checking for visible=false means to check a hidden action.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckEdit([mState])

**DESCRIPTION**: Checks the <code>Edit</code> action in the header toolbar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDelete([mState])

**DESCRIPTION**: Checks the <code>Delete</code> action in the header toolbar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckRelatedApps([mState])

**DESCRIPTION**: Checks the <code>Related Apps</code> action in the header toolbar.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckMenuAction(vAction)

**DESCRIPTION**: Checks an action in the popover that is currently open.

Parameters:
- `vAction` `{object|string}` — The state map or label of the action

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckFieldInFieldGroup(vFieldIdentifier, [vValue], [mState])

**DESCRIPTION**: Checks a field within a field group in the object page header.

Parameters:
- `vFieldIdentifier` `{sap.fe.test.api.HeaderFieldGroupIdentifier}` — The identifier of the field
- `vValue` `{string|Array|object}` *(optional)* — The value to check. If it is an array, the first entry is considered as
the value and the second as the description. If it is an object it must follow this pattern:
<code><pre>
	{
		value: <string>, 		// optional
		description: <string> 	// optional
	}
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckProgressIndicator(Title, PercentValue)

**DESCRIPTION**: Checks a progress indicator data point in the object page header.

Parameters:
- `Title` `{string}` — The title of the progress indicator
- `PercentValue` `{number}` — The expected value of the progress indicator

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckRatingIndicator(Title, Value, MaxValue)

**DESCRIPTION**: Checks a rating indicator data point in the object page header.

Parameters:
- `Title` `{string}` — The title of the rating indicator
- `Value` `{number}` — The expected value of the rating indicator
- `MaxValue` `{number}` — The expected maximum value of the rating indicator

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckTitle([sTitle], [sDescription])

**DESCRIPTION**: Checks the title and description of the object page.

If either title or description is <code>undefined</code>, it will not be checked.

Parameters:
- `sTitle` `{string}` *(optional)* — Title of the object page header
- `sDescription` `{string}` *(optional)* — Description of the object page header

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckTitlePath([sTitlePath], [sDescriptionPath])

**DESCRIPTION**: Checks the binding path of the title and description of the object page.

Use this method when the title or description is bound to a model path rather than a static value.
If either path is <code>undefined</code>, it is not checked.

Parameters:
- `sTitlePath` `{string}` *(optional)* — The binding path of the object page header title
- `sDescriptionPath` `{string}` *(optional)* — The binding path of the object page header description

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckPaginatorDown(mState)

**DESCRIPTION**: Checks the paginator down button.

Parameters:
- `mState` `{object}` — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckPaginatorUp(mState)

**DESCRIPTION**: Checks the paginator up button.

Parameters:
- `mState` `{object}` — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckMicroChart(vMicroChartIdentifier, [sUoMLabel])

**DESCRIPTION**: Checks a MicroChart shown in the header of an object page.

Parameters:
- `vMicroChartIdentifier` `{object|string}` — Id/Type or Title of MicroChart
- `sUoMLabel` `{string}` *(optional)* — UoM label of the MicroChart. When omitted, the UoM label is not asserted.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckHeaderFacet(vFacetIdentifier, [mState])

**DESCRIPTION**: Checks the custom facet in the object page header.

Parameters:
- `vFacetIdentifier` `{sap.fe.test.api.HeaderFacetIdentifier}` — The Identifier of the header facet
- `mState` `{object}` *(optional)* — Defines the expected state

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSaveAsTile([mState])

**DESCRIPTION**: Checks the <code>Save as Tile</code> action.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSendEmail([mState])

**DESCRIPTION**: Checks <code>Send Email</code> action.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckLink(vLinkIdentifier, [mState])

**DESCRIPTION**: Checks the state of a link located in the Object Page header.

Parameters:
- `vLinkIdentifier` `{sap.fe.test.api.HeaderFieldGroupIdentifier|string}` — The identifier of the field or the link text
- `mState` `{object}` *(optional)* — Defines the expected state of the link

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.HeaderAssertionsLR

**INTRODUCTION**: Constructs a new HeaderAssertionsLR instance.

**TAGS**: sap.fe.test, OPA5, testing, headerassertionslr, api, sap.fe.test.api

**STEP**: iCheckAction([vActionIdentifier], [mState])

**DESCRIPTION**: Checks an action of the header toolbar.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` *(optional)* — The identifier of the action, or its label
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSaveAsTile([mState])

**DESCRIPTION**: Checks the <code>Save as Tile</code> action.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSendEmail([mState])

**DESCRIPTION**: Checks the <code>Send Email</code> action.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.TableActions

**INTRODUCTION**: Constructs a new TableActions instance. Extends sap.fe.test.api.TableAPI.

**TAGS**: sap.fe.test, OPA5, testing, tableactions, actions, sap.fe.test.api

**STEP**: iPressCell([mRowValues], vColumn)

**DESCRIPTION**: Presses the control in the table cell.

Parameters:
- `mRowValues` `{object}` *(optional)* — Specifies the target row by column-value map, e.g.
<code><pre>
{
    0: "Max",
    "Last Name": "Mustermann"
}
</pre></code>
- `vColumn` `{string|number}` — The column name, label or index

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickLink([mRowValues], vColumn)

**DESCRIPTION**: Clicks a link in a table cell.

Parameters:
- `mRowValues` `{object|number}` *(optional)* — Specifies the target row by column-value map or 0-based index
- `vColumn` `{string|number}` — The column name, label, or index

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickContactLink(linkContent)

**DESCRIPTION**: Clicks a Contact Card link within the table using its link text.

Parameters:
- `linkContent` `{string}` — The text of the contact link to click

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectRows([vRowValues], [mState])

**DESCRIPTION**: Selects the specified rows.

Parameters:
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.
- `mState` `{object}` *(optional)* — Defines the expected state of the row

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectAllRows()

**DESCRIPTION**: Selects all rows in a table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iPressRow([vRowValues])

**DESCRIPTION**: Clicks the specified row.

Parameters:
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExpandGroupRow(iLevel, sTitle)

**DESCRIPTION**: Expands a row corresponding to a visual group.

Parameters:
- `iLevel` `{number}` — The level of the group row to be expanded (1-based)
- `sTitle` `{string}` — The title of the group row to be expanded

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCollapseGroupRow(iLevel, sTitle)

**DESCRIPTION**: Collapses a row corresponding to a visual group.

Parameters:
- `iLevel` `{number}` — The level of the group row to be collapsed (1-based)
- `sTitle` `{string}` — The title of the group row to be collapsed

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeRow([vRowValues], mTargetValues, bInputNotFinalized)

**DESCRIPTION**: Changes the specified row. The given value map must match exactly one row.

If only one parameter is provided, it must be the <code>mTargetValues</code> and <code>mRowValues</code> is considered undefined.
If <code>vRowValues</code> are not defined, then the targetValues are inserted in the creationRow.

Parameters:
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.
- `mTargetValues` `{object}` — A map of columns (either name or index) to its new value. The columns do not need to match the ones defined in <code>vRowValues</code>.
- `bInputNotFinalized` `{boolean}` — If true, we keep the focus on the modified cell and don't press enter to validate the input

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteAction([vActionIdentifier])

**DESCRIPTION**: Executes an action on the table.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` *(optional)* — The identifier of the action, or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteMenuAction(vAction)

**DESCRIPTION**: Executes an action form the drop-down menu that is currently open.

Parameters:
- `vAction` `{string|object}` — The label of the action or its state

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteShowHideDetails([bShowDetails])

**DESCRIPTION**: Executes the <code>Show/Hide details</code> action on the table.

Parameters:
- `bShowDetails` `{boolean}` *(optional)* — Optional parameter to enforce a certain state (showing details yes/no corresponds to true/false); if not set, state is toggled

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteDelete()

**DESCRIPTION**: Executes the <code>Delete</code> action on the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectQuickFilterItem([vItemIdentifier])

**DESCRIPTION**: Selects a quick-filter item on the table.

Parameters:
- `vItemIdentifier` `{object|string}` *(optional)* — If passed as an object, the following pattern will be considered:
<code><pre>
	{
		<annotationPath>: <name of the key>
 }
</pre></code>
If using a plain string as the identifier, it is considered the item label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteCreate()

**DESCRIPTION**: Executes the <code>Create</code> action on the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteFullScreen()

**DESCRIPTION**: Executes the <code>Fullscreen</code> action on the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteInlineCreate()

**DESCRIPTION**: Executes the action to create a row in the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteInlineAction([vRowValues], vColumn)

**DESCRIPTION**: Executes an action that is available in a certain column within a table row.

Parameters:
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.
- `vColumn` `{string|number}` — The column name, label or index

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iExecuteKeyboardShortcut(sShortcut, [vRowValues], vColumn)

**DESCRIPTION**: Executes a keyboard shortcut on the table or a cell control.
If only <code>sShortcut</code> is defined, the shortcut is executed on the table directly.
If additionally <code>vRowValues</code> and <code>vColumn</code> are defined, the shortcut is executed on table cell level.

Parameters:
- `sShortcut` `{string}` — The shortcut pattern
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.
- `vColumn` `{string|number}` — The column name, label or index

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSaveVariant([sVariantName])

**DESCRIPTION**: Saves a variant under the given name, or overwrites the current one.

Parameters:
- `sVariantName` `{string}` *(optional)* — The name of the new variant. If omitted, the current variant will be overwritten

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iRemoveVariant(sVariantName)

**DESCRIPTION**: Removes the variant of the given name.

Parameters:
- `sVariantName` `{string}` — The name of the variant to be removed

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSelectVariant(sVariantName)

**DESCRIPTION**: Selects the chosen variant.

Parameters:
- `sVariantName` `{string}` — The name of the variant to be selected

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSetDefaultVariant(sVariantName)

**DESCRIPTION**: Sets the variant as the default.

Parameters:
- `sVariantName` `{string}` — The name of the variant to be set as the default variant. If omitted, the Standard variant is set as the default

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iAddAdaptationColumn(vColumnIdentifier)

**DESCRIPTION**: Adds a field as a column to the table.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the column field, or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iRemoveAdaptationColumn(vColumnIdentifier)

**DESCRIPTION**: Removes a field as a column from the table.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the column field, or its label

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeSortOrder(vColumnIdentifier, [sSortOrder])

**DESCRIPTION**: Adds a field to the sorting of the table via the sort dialog.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the column field, or its label
- `sSortOrder` `{sap.ui.core.SortOrder}` *(optional)* — The sort order, default is {@link sap.ui.core.SortOrder.Ascending}

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSortByColumn(vColumnIdentifier, [sFieldLabel], [bDescending])

**DESCRIPTION**: Sorts the table entries by the specified column.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier|number}` — The identifier of the column field, its label or index
- `sFieldLabel` `{string}` *(optional)* — The target field for sorting in case the field label differs from the column label or in case of a complex property
- `bDescending` `{boolean}` *(optional)* — Sorting (true=descending, false=ascending (default))

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iGroupByColumn(vColumnIdentifier, [sFieldLabel])

**DESCRIPTION**: Groups the table entries by the specified column.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier|number}` — The identifier of the column field, its label or index
- `sFieldLabel` `{string}` *(optional)* — The target field for grouping. If undefined, parameter vColumnIdentifier is used as label to identify the toggle button.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iAggregateByColumn(vColumnIdentifier, [sFieldLabel])

**DESCRIPTION**: Aggregates the table entries by the specified column.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier|number}` — The identifier of the column field, its label or index
- `sFieldLabel` `{string}` *(optional)* — The target field to group on. If undefined, parameter vColumnIdentifier is used as label to identify the toggle button.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeSearchField([sSearchText])

**DESCRIPTION**: Changes the search field.

Parameters:
- `sSearchText` `{string}` *(optional)* — The new search text

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iResetSearchField()

**DESCRIPTION**: Resets the search field.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iChangeFilterField(vColumnIdentifier, vValue, [bClearFirst])

**DESCRIPTION**: Adds a filter condition to the filter field.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the column
- `vValue` `{string|object}` — Defines the value of the filter field condition
- `bClearFirst` `{boolean}` *(optional)* — Set to <code>true</code> to clear previously set filters, otherwise all previously set values will be kept

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iPasteData(aData)

**DESCRIPTION**: Pastes data into the table.

Parameters:
- `aData` `{Array.<Array.<string>>}` — The data to be pasted

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iClickOnMessageStripFilter()

**DESCRIPTION**: Presses the messageStrip filter in case of issues, warnings or error message on the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenColumnAdaptation()

**DESCRIPTION**: Opens the column adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnAdaptation()

**DESCRIPTION**: Confirms and closes the adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenColumnSorting()

**DESCRIPTION**: Opens the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnSorting()

**DESCRIPTION**: Confirms and closes the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenFilterDialog()

**DESCRIPTION**: Opens the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterDialog()

**DESCRIPTION**: Confirms and closes the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.TableAPI

**INTRODUCTION**: Constructs a new KPICardAPI instance.

**TAGS**: sap.fe.test, OPA5, testing, tableapi, api, sap.fe.test.api

**STEP**: iOpenColumnAdaptation()

**DESCRIPTION**: Opens the column adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnAdaptation()

**DESCRIPTION**: Confirms and closes the adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenColumnSorting()

**DESCRIPTION**: Opens the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnSorting()

**DESCRIPTION**: Confirms and closes the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenFilterDialog()

**DESCRIPTION**: Opens the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterDialog()

**DESCRIPTION**: Confirms and closes the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.TableAPI

**INTRODUCTION**: Constructs a new TableAPI instance.

**TAGS**: sap.fe.test, OPA5, testing, tableapi, api, sap.fe.test.api

**STEP**: iOpenColumnAdaptation()

**DESCRIPTION**: Opens the column adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnAdaptation()

**DESCRIPTION**: Confirms and closes the adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenColumnSorting()

**DESCRIPTION**: Opens the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnSorting()

**DESCRIPTION**: Confirms and closes the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenFilterDialog()

**DESCRIPTION**: Opens the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterDialog()

**DESCRIPTION**: Confirms and closes the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api.TableAssertions

**INTRODUCTION**: Constructs a new TableAssertions instance. Extends sap.fe.test.api.TableAPI.

**TAGS**: sap.fe.test, OPA5, testing, tableassertions, assertions, sap.fe.test.api

**STEP**: iCheckState([mState])

**DESCRIPTION**: Checks the state of the table.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the table

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckRows([mRowValues], [iExpectedNumberOfRows], [mState], [vHiddenCells])

**DESCRIPTION**: Checks the rows of a table.
If <code>mRowValues</code> is provided, only rows with the corresponding values are considered.
If <code>iNumberOfRows</code> is provided, the number of rows are checked with respect to the provided <code>mRowValues</code> (if set) or in total.
If <code>iNumberOfRows</code> is omitted, it checks for at least one matching row.
If <code>mState</code> is provided, the row must be in the given state.

Parameters:
- `mRowValues` `{object}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
- `iExpectedNumberOfRows` `{number}` *(optional)* — The expected number of rows considering <code>mRowValues</code> and <code>mRowState</code>
- `mState` `{object}` *(optional)* — Defines the expected state of the target row
- `vHiddenCells` `{Array}` *(optional)* — Defines the cells of the identified rows which are expected to the hidden (visible=false). You can also use test function iCheckCells to
explicitly check a specific cell of a row.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCreationRow([mRowValues], [mState])

**DESCRIPTION**: Checks the state of the CreationRow button in the table.

Parameters:
- `mRowValues` `{object}` *(optional)* — Defines the expected row values. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
- `mState` `{object}` *(optional)* — Defines the expected state of the target row

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckQuickFilterItems(iExpectedNumberOfItems)

**DESCRIPTION**: Checks the number of items in the quick-filter menu.

Parameters:
- `iExpectedNumberOfItems` `{number}` — The expected number of quick-filter items

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckColumns([iExpectedNumberOfColumns], [mColumnStateMap])

**DESCRIPTION**: Checks the state of the columns of the table.

Parameters:
- `iExpectedNumberOfColumns` `{number}` *(optional)* — The expected number of columns
- `mColumnStateMap` `{object}` *(optional)* — A map of columns and their expected state. The map looks like
<code><pre>
	{
		&lt;columnName | columnLabel | columnIndex>: {
			header: "My header"
		}
	}
</pre></code>

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckCells([vRowValues], mColumnStateMap)

**DESCRIPTION**: Checks the state of the cells of a table.
This function can only be used for simple content within a table cell. Checking complex content like combined fields within a cell is not supported.

Parameters:
- `vRowValues` `{object|number}` *(optional)* — Defines the row values of the target row. The pattern is:
<code><pre>
	{
		&lt;column-name-or-index>: &lt;expected-value>
 }
</pre></code>
Alternatively, the 0-based row index can be used.
- `mColumnStateMap` `{object}` — A map of columns and their state. The map looks like
<code><pre>
	{
		&lt;column-name-or-index>: {
			header: "My header"
		}
	}
</pre></code>

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAction(vActionIdentifier, [mState])

**DESCRIPTION**: Checks the state of a table action.

Parameters:
- `vActionIdentifier` `{string|sap.fe.test.api.ActionIdentifier}` — The identifier of the action, or its label
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckMenuAction(vAction)

**DESCRIPTION**: Checks an action in the drop-down menu that is currently open.

Parameters:
- `vAction` `{object|string}` — The label of the action, or its state

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckDelete([mState])

**DESCRIPTION**: Checks the <code>Delete</code> action of the table.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSearchField([sSearchText], [mState])

**DESCRIPTION**: Checks the search field in the table toolbar. If the <code>sSearchText</code> parameter is <code>undefined</code>, the search text is not validated.

Parameters:
- `sSearchText` `{string}` *(optional)* — The expected text in the search field
- `mState` `{object}` *(optional)* — Defines the expected state of the search field

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function that can be used for chaining statements

**STEP**: iCheckCreate([mState])

**DESCRIPTION**: Checks the <code>Create</code> action of the table.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckPaste()

**DESCRIPTION**: Checks whether the paste button is available for the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckFullScreen([mState])

**DESCRIPTION**: Checks the <code>Fullscreen</code> action of the table.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the button

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckColumnAdaptation()

**DESCRIPTION**: Checks whether the adaptation button is available for the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckColumnSorting()

**DESCRIPTION**: Checks whether the sort button is available for the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckColumnFiltering()

**DESCRIPTION**: Checks whether the filter button is available for the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckExport()

**DESCRIPTION**: Checks whether the export button is available for the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckQuickFilter([mState])

**DESCRIPTION**: Checks the quick filter action of the table.

Parameters:
- `mState` `{object}` *(optional)* — Defines the expected state of the control

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckColumnAdaptationDialog()

**DESCRIPTION**: Checks whether the column adaptation dialog is open.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckAdaptationColumn(vColumnIdentifier, [mState])

**DESCRIPTION**: Checks a field in the adaptation dialog.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the column, or its label
- `mState` `{object}` *(optional)* — Defines the expected state of the field control in the adaptation dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckSortOrder(vColumnIdentifier, [sSortOrder], [bCheckPersonalization])

**DESCRIPTION**: Checks a field in the sorting dialog.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the column, or its label
- `sSortOrder` `{sap.ui.core.SortOrder}` *(optional)* — The sort order of the column, default is {@link sap.ui.core.SortOrder.Ascending}
- `bCheckPersonalization` `{boolean}` *(optional)* — Defines if the order is checked via sorting dialog, or via the column itself

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckFilterField(vColumnIdentifier, [mState])

**DESCRIPTION**: Checks, if a filter field is available in the filter dialog.

Parameters:
- `vColumnIdentifier` `{string|sap.fe.test.api.ColumnIdentifier}` — The identifier of the field, or its label
- `mState` `{object}` *(optional)* — Defines the expected state of the field control in the filter dialog

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iCheckMessageStrip([mProperty])

**DESCRIPTION**: Checks a messageStrip on a table.

Parameters:
- `mProperty` `{object}` *(optional)* — Defines the expected properties of the messageStrip in the table

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSeeFocusOnHeader()

**DESCRIPTION**: Checks if the focus is on a table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iSeeFocusOnRow(iRowIndex)

**DESCRIPTION**: Checks if the focus is on a table row.

Parameters:
- `iRowIndex` `{number}` — The expected focused row

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenColumnAdaptation()

**DESCRIPTION**: Opens the column adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnAdaptation()

**DESCRIPTION**: Confirms and closes the adaptation dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenColumnSorting()

**DESCRIPTION**: Opens the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmColumnSorting()

**DESCRIPTION**: Confirms and closes the sorting dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iOpenFilterDialog()

**DESCRIPTION**: Opens the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

**STEP**: iConfirmFilterDialog()

**DESCRIPTION**: Confirms and closes the filtering dialog of the table.

Returns: `{object}` The result of the {@link sap.ui.test.Opa5#waitFor} function, to be used for chained statements

--------------------------------

**TITLE**: sap.fe.test.api Type Definitions

**INTRODUCTION**: TypeScript/JSDoc type definitions used as identifiers and parameters across the sap.fe.test OPA5 API.

**TAGS**: sap.fe.test, OPA5, testing, types, identifiers, typescript

**STEP**: TableIdentifier (sap.fe.test.api.TableIdentifier)

**DESCRIPTION**: A table identifier

Properties:
- `property` `{string}` — The name of the navigation property used for the table
- `qualifier` `{string}` *(optional)* — The name of a qualifier for the table

**STEP**: DialogIdentifier (sap.fe.test.api.DialogIdentifier)

**DESCRIPTION**: A dialog identifier

Properties:
- `type` `{sap.fe.test.api.DialogType}` — The type of the dialog

**STEP**: ActionIdentifier (sap.fe.test.api.ActionIdentifier)

**DESCRIPTION**: An action identifier

Properties:
- `service` `{string}` — The name of the service
- `action` `{string}` — The name of the action
- `unbound` `{boolean}` *(optional)* — Defines whether the action is a bound action (default: false)

**STEP**: FieldIdentifier (sap.fe.test.api.FieldIdentifier)

**DESCRIPTION**: A field identifier

Properties:
- `fieldGroup` `{string}` *(optional)* — The name of the field group containing the field. Required when identifying a field inside a header facet form.
- `property` `{string}` — The name of the field
- `targetAnnotation` `{string}` *(optional)* — The name of the target annotation, such as a Chart or MicroChart annotation term.
  When set, a DataFieldForAnnotation is identified instead of a DataField, and the resolved control ID changes accordingly.
- `connectedFields` `{string}` *(optional)* — The name of the connected field containing the field

**STEP**: SectionIdentifier (sap.fe.test.api.SectionIdentifier)

**DESCRIPTION**: A section identifier

Properties:
- `section` `{string}` — The name of the section facet
- `subSection` `{string}` *(optional)* — The name of the sub-section facet

**STEP**: ActionDialogFieldIdentifier (sap.fe.test.api.ActionDialogFieldIdentifier)

**DESCRIPTION**: An action parameter dialog field identifier

Properties:
- `property` `{string}` — The name of the field

**STEP**: DialogFieldIdentifier (sap.fe.test.api.DialogFieldIdentifier)

**DESCRIPTION**: An dialog field identifier

Properties:
- `property` `{string}` — The name of the field
In case of an action parameter dialog, this is the fieldname only
<code><pre>
{
    property: <fieldname>
}
</pre></code>
In case of a create dialog, the concatenation of the entity and fieldname has to be provided
<code><pre>
{
    property: <entity>::<fieldname>
}
</pre></code>

**STEP**: ViewIdentifier (sap.fe.test.api.ViewIdentifier)

**DESCRIPTION**: A view identifier

Properties:
- `key` `{string}` — The name of the view as defined in the manifest file

**STEP**: MassEditFieldIdentifier (sap.fe.test.api.MassEditFieldIdentifier)

**DESCRIPTION**: A mass edit field identifier

Properties:
- `property` `{string}` — The name of the property

**STEP**: MassEditValue (sap.fe.test.api.MassEditValue)

**DESCRIPTION**: A mass edit field value

Properties:
- `dropDownText` `{string}` — The dropdown text for the selection
- `rawText` `{string}` — The raw text for the selection

**STEP**: MassEditFieldIdentifier (sap.fe.test.api.MassEditFieldIdentifier)

**DESCRIPTION**: A mass edit field identifier

Properties:
- `property` `{string}` — The name of the property

**STEP**: MassEditValue (sap.fe.test.api.MassEditValue)

**DESCRIPTION**: A mass edit field value

Properties:
- `dropDownText` `{string}` — The dropdown text for the selection
- `rawText` `{string}` — The raw text for the selection

**STEP**: FilterFieldIdentifier (sap.fe.test.api.FilterFieldIdentifier)

**DESCRIPTION**: A filter field identifier

Properties:
- `property` `{string}` — The name of the property

**STEP**: FormIdentifier (sap.fe.test.api.FormIdentifier)

**DESCRIPTION**: A form identifier

Properties:
- `section` `{string}` — The facet ID
- `fieldGroup` `{string}` *(optional)* — The fieldgroup ID
- `isHeaderFacet` `{boolean}` *(optional)* — Is it about the editable header facet

**STEP**: HeaderFacetIdentifier (sap.fe.test.api.HeaderFacetIdentifier)

**DESCRIPTION**: An identifier for the header facet

Properties:
- `facetId` `{string}` — The identifier of the facet
- `collection` `{boolean}` *(optional)* — Defines whether the facet is a collection facet (default: <code>false</code>)
- `custom` `{boolean}` *(optional)* — Defines whether the facet is a custom header facet (default: <code>false</code>)

**STEP**: HeaderFieldGroupIdentifier (sap.fe.test.api.HeaderFieldGroupIdentifier)

**DESCRIPTION**: An identifier for a field within a field group in the Object Page header.
Used by {@link sap.fe.test.api.HeaderAssertions#iCheckFieldInFieldGroup},
{@link sap.fe.test.api.HeaderAssertions#iCheckLink}, and
{@link sap.fe.test.api.HeaderActions#iClickLink}.

Properties:
- `fieldGroup` `{string}` — The name of the field group containing the field
- `field` `{string}` — The name of the field within the field group
- `targetAnnotation` `{string}` *(optional)* — The target annotation path for DataFieldForAnnotation lookups.
  When present, a DataFieldForAnnotation is identified instead of a DataField.

**STEP**: ColumnIdentifier (sap.fe.test.api.ColumnIdentifier)

**DESCRIPTION**: A column identifier

Properties:
- `name` `{string}` — The technical name of the column

--------------------------------

**TITLE**: sap.fe.test.api Enumerations

**INTRODUCTION**: Enumeration types used in the sap.fe.test OPA5 API, such as dialog types and edit states.

**TAGS**: sap.fe.test, OPA5, testing, enum, constants

**STEP**: DialogType (sap.fe.test.api.DialogType)

**DESCRIPTION**: Enum for supported dialog types.

Values:
- `Confirmation` — A simple dialog supporting base checks and actions such as 'Confirm' and 'Cancel'
- `ValueHelp` — A ValueHelp dialog that has a condition definition panel or a filterable selection table
- `Message` — A message dialog for showing back-end messages
- `Error` — A dialog used for showing an error message
- `Action` — A default dialog for action parameters
- `Create` — A dialog used for creating a new object
- `MassEdit` — A dialog used for mass edit

**STEP**: EditState (sap.fe.test.api.EditState)

**DESCRIPTION**: Enum for supported editing states.

Values:
- `All` — All
- `Unchanged` — Unchanged
- `AllHidingDrafts` — All (Hiding Drafts)
- `OwnDraft` — Own Draft
- `Locked` — Locked by Another User
- `UnsavedChanges` — Unsaved Changes by Another User

--------------------------------
