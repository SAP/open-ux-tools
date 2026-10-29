/**
 * @fileoverview Avoid the use of unescaped write (sap-unescaped-write)
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import rule from '../../src/rules/sap-unescaped-write.js';
import { RuleTester } from 'eslint';

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const MSG = 'Avoid the use of unescaped write (potential XSS issue)';
const ruleTester: RuleTester = new RuleTester();

ruleTester.run('sap-unescaped-write', rule, {
    valid: [
        `oRm.write('><span class="sapcrmMsliHandleInner"></span></span>');`,
        `oRm.writeAttribute("title", "my title");`,
        // External renderer function reference (should not crash)
        `sap.ui.core.Control.extend("ZoomSliderTooltip", {
          metadata: {
            properties: {
              zoomValue: { type: "int", defaultValue: 0 }
            }
          },
          renderer: ZoomSliderTooltipRenderer,
          sliderValueChanged: function(iValue) {
            return this.setZoomValue(iValue);
          }
        });`,
        // Assignment with external renderer function reference
        `var MyControl = {};
        MyControl.renderer = ExternalRenderer;`,
        // render property with external function reference
        `var MyControl = {
          render: ExternalRenderFunction
        };`
    ],
    invalid: [
        {
            code: `
    EAMSmartTableRenderer.render = function (oRm, oControl) {
      if (!oControl.getVisible()) {
        return;
      }
      oRm.write('><span class="sapcrmMsliHandleInner"></span></span>');
      oRm.write("div>" + oSlider._fValue2 + "</div>");
      oRm.write("</div>");

      VBoxRenderer.render(oRm, oControl);
    };
      `,
            errors: [
                {
                    message: MSG,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `
    var MyControl = sap.ui.core.Control.extend("MyControl", {
      renderer: function (oRm, oControl) {
        oRm.write("<div>");
        oRm.write("Unsafe content: " + userInput);
        oRm.write("</div>");
      }
    });
      `,
            errors: [
                {
                    message: MSG,
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: `
    var component = {
      render: function (rm, control) {
        rm.writeAttribute("class", "unsafe-" + userInput);
        rm.write("<span>" + content + "</span>");
      }
    };
      `,
            errors: [
                {
                    message: MSG,
                    type: 'CallExpression'
                },
                {
                    message: MSG,
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
