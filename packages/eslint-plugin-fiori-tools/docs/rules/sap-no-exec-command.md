# Detect direct DOM manipulation (sap-no-exec-command)

## Rule Details

The rule detects usage of the `execCommand` method

Warning message: _Direct DOM Manipulation, better to use `jQuery.appendTo` if really needed_

The following patterns are considered warnings:

```js
document.execCommand(cmd, false, args);
```

```js
document['execCommand'](cmd, false, args);
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

