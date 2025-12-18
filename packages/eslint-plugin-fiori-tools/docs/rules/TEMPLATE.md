# Describe the rule in one sentence as 1st-level-header here please (IMPORTANT: enter ID of the rule in this brackets please)

_**// In General: please use single backtick marks (" ` " or so called gravis) to emphasize code inside normal text**_

_**// describe in 3-4 words what the rule does**_

_**// describe why the rule was introduced**_

## Rule Details

_**// Give details how the rule works (if applicable)**_

_**// Only if the rules has sub-rules with different message enter a sub-rule (4th level and warning message)**_

#### Enter critical action as 4th-level-header here please (e.g. Direct DOM insertion)

##### Warning Message: Enter the warning message of the rule here please.

The following patterns are considered warnings:
_**// mandatory, always give enough code example to understand the rule**_

```js

_**// Enter example coding here please**_

```

The following patterns are not considered warnings:
_**// This is optional, only if it makes sense**_

```js

_**// Enter example coding here please**_

```

How to Fix
_** // OPTIONAL: only if it can't be described by a code example or if is not obvious from message below**_

## False Positives

_**// OPTIONAL: only if the check produces false positives**_
There might be cases where the check produces a false positive, i.e. you receive a warning but your code is correct and complies to the UI5 guidelines.
In such a case, you can deactivate the rule by placing the following pseudo-comment block around your code.
**Please make sure to have your code reviewed by a colleague before you enter such a pseudo-comment.**

You can disable and enable back warnings of this rule _**// replace with your check ID**_:

```js

/*eslint-disable rule-check_ID_XY*/
   <your code>
/*eslint-enable rule-check_ID_XY*/

```

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

_**//If there are other links (e.g. to the UI5 API reference) describe the issue this rule addresses, please include them here in a bulleted list.**_


## Release Information


