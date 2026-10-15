# Avoid the use of unescaped write (sap-unescaped-write)

This happens when you create custom controls and define their renderers.
Inside the renderer you are calling the method RenderManager.write/writeAttribute with dynamically retrieves values (e.g properties).
This should be replaced with calls to RenderManager.writeEscaped/writeAttributeEscaped

_Warning Message: When creating custom controls you have to make sure that all operations that are going to write in the DOM using non static value are escaped properly (potential XSS issue)_

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

In case you detect an issue with the check please open a GitHub issue [here](https://github.tools.sap/FIORI-PIPELINE/fioriPipelinesGo/issues).

## Further Reading