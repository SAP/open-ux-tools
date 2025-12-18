# Detect global event handling override (sap-no-global-event)

The UI5 guidelines do not allow overriding global event handling.

## Rule Details

This rule detects override of the following global events:
`onload`, `onunload`, `onabort`, `onbeforeunload`, `onerror`, `onhashchange`, `onpageshow`, `onpagehide`, `onscroll`, `onblur`, `onchange`, `onfocus`, `onfocusin`, `onfocusout`, `oninput`, `oninvalid`, `onreset`, `onsearch`, `onselect`, `onsubmit`.

#### Global event handling override

Warning message: _Global event handling override is not permitted, please modify only single events._

The following patterns are considered warnings:

```js
window.event.returnValue = false;
window.onload = function () {
  return Hammer;
};
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

