# Avoid the Use of Unescaped Write (`sap-unescaped-write`)

This happens when you create custom controls and define their renderers.
Inside the renderer, you call the method RenderManager.write/writeAttribute with dynamically retrieves values, for example properties.
This must be replaced with calls to `RenderManager.writeEscaped/writeAttributeEscaped`.

**Warning message**: When creating custom controls, you must ensure that all operations that are going to write in the DOM using non-static values are escaped properly. Otherwise, cross-site scripting may occur.

The following patterns are considered warnings:

```js
oRm.write('><span class="sapcrmMsliHandleInner"></span></span>');
oRm.write('>' + oSlider._fValue2 + '</div>');
oRm.writeAttribute('title', oSlider._valueText);
oRm.write('</div>');
```

The following patterns are not considered warnings:

```js
oRm.write('><span class="sapcrmMsliHandleInner"></span></span>');
oRm.write('>');
oRm.writeEscaped(oSlider._fValue2);
oRm.writeAttributeEscaped('title', oSlider._valueText);
oRm.write('</div>');
```

## Bug Report

If you detect an issue with the check, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading