'use strict';

var AddonNodeConfig = require('/Users/sunnyharris/osf/osf.io/website/static/js/addonNodeConfig.js');

var url = window.contextVars.node.urls.api + 'figshare/config/';
new AddonNodeConfig('FigShare', '#figshareScope', url, '#figshareGrid', {
    onPickFolder: function (evt, item) {
        evt.preventDefault();
        this.selected({name: item.data.name, type: item.data.type, id: item.data.id});
        return false; // Prevent event propagation
    }
});
