'use strict';

var AddonNodeConfig = require('addonNodeConfig');

var url = window.contextVars.node.urls.api + 'figshare/config/';
new AddonNodeConfig('FigShare', '#figshareScope', url, '#figshareGrid', {
    onPickFolder: function (evt, item) {
        evt.preventDefault();
        this.selected({name: item.data.name, type: item.data.type, id: item.data.id});
        return false; // Prevent event propagation
    }
});
