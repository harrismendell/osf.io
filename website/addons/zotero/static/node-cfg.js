var CitationsNodeConfig = require('/Users/sunnyharris/osf/osf.io/website/static/js/citationsNodeConfig.js');
require('./node-cfg.css');

var url = window.contextVars.node.urls.api + 'zotero/settings/';
new CitationsNodeConfig('Zotero', '#zoteroScope', url, '#zoteroGrid');
