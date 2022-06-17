<%if (typeof prependComma !== 'undefined' && prependComma) {%>,
        <% } %><%- (typeof eventHandlerFnName !== 'undefined' && eventHandlerFnName) || 'onPress' %>: function() {
            MessageToast.show("Custom handler invoked.");
        }