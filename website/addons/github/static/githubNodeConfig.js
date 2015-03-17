'use strict';

var ko = require('knockout');
require('knockout-punches');
require('knockout-mapping');
var $ = require('jquery');
var bootbox = require('bootbox');
var Raven = require('raven-js');

var $osf = require('osfHelpers');

ko.punches.enableAll();

var ViewModel = function(url, selector) {
    var self = this;

    self.url = url;
    self.selector = selector;

    self.nodeHasAuth = ko.observable(false);
    self.userHasAuth = ko.observable(false);
    self.userIsOwner = ko.observable(false);
    self.ownerName = ko.observable('');

    self.urls = ko.observable({});
    self.loadedSettings = ko.observable(false);
    self.repoList = ko.observable([]);
    self.loadedRepoList = ko.observable(false);
    self.currentRepo = ko.observable('');
    self.selectedRepo = ko.observable('');

    self.accessKey = ko.observable('');
    self.password = ko.observable('');

    self.loading = ko.observable(false);
    self.creating = ko.observable(false);

    self.message = ko.observable('');
    self.messageClass = ko.observable('text-info');

    self.showSelect = ko.observable(false);

    self.showSettings = ko.pureComputed(function() {
        return self.nodeHasAuth();
    });
    self.disableSettings = ko.pureComputed(function() {
        return !(self.userHasAuth() && self.userIsOwner());
    });
    self.showNewRepo = ko.pureComputed(function() {
        return self.userHasAuth() && self.userIsOwner();
    });
    self.showImport = ko.pureComputed(function() {
        return self.userHasAuth() && !self.nodeHasAuth();
    });
    self.showCreateCredentials = ko.pureComputed(function(){
        return !self.nodeHasAuth() && !self.userHasAuth();
    });
    self.canChange = ko.pureComputed(function(){
        return self.userIsOwner() && self.nodeHasAuth();
    });
    self.allowSelectRepo = ko.pureComputed(function() {
        return (self.bucketList().length > 0 || self.loadedRepoList()) && (!self.loading());
    });

    self.fetchFromServer();
};

ViewModel.prototype.toggleSelect = function() {
    this.showSelect(!this.showSelect());
    if (!this.loadedRepoList()) {
        return this.fetchRepoList();
    }
    return new $.Deferred().promise();
};

ViewModel.prototype.selectRepo = function() {
    var self = this;
    self.loading(true);
    return $osf.postJSON(
            self.urls().set_repo, {
                's3_bucket': self.selectedBucket()
            }
        )
        .done(function(response) {
            self.updateFromData(response);
            var filesUrl = window.contextVars.node.urls.web + 'files/';
            self.changeMessage('Successfully linked S3 bucket \'' + self.currentBucket() + '\'. Go to the <a href="' +
                filesUrl + '">Files page</a> to view your content.', 'text-success');
            self.loading(false);
        })
        .fail(function(xhr, status, error) {
            self.loading(false);
            var message = 'Could not change S3 bucket at this time. ' +
                'Please refresh the page. If the problem persists, email ' +
                '<a href="mailto:support@osf.io">support@osf.io</a>.';
            self.changeMessage(message, 'text-warning');
            Raven.captureMessage('Could not set S3 bucket', {
                url: self.urls().setRepo,
                textStatus: status,
                error: error
            });
        });
};



ViewModel.prototype._deauthorizeNodeConfirm = function() {
    var self = this;
    return $.ajax({
        type: 'DELETE',
        url: self.urls().deauthorize,
        contentType: 'application/json',
        dataType: 'json'
    }).done(function(response) {
        self.updateFromData(response);
    }).fail(function(xhr, status, error) {
        var message = 'Could not deauthorize Github at ' +
            'this time. Please refresh the page. If the problem persists, email ' +
            '<a href="mailto:support@osf.io">support@osf.io</a>.';
        self.changeMessage(message, 'text-warning');
        Raven.captureMessage('Could not remove Github authorization.', {
            url: self.urls().deauthorize,
            textStatus: status,
            error: error
        });
    });
};

ViewModel.prototype.deauthorizeNode = function() {
    var self = this;
    bootbox.confirm({
        title: 'Deauthorize Github?',
        message: 'Are you sure you want to remove this Github authorization?',
        callback: function(confirm) {
            if (confirm) {
                self._deauthorizeNodeConfirm();
            }
        }
    });
};

ViewModel.prototype._importAuthConfirm = function() {
    var self = this;
    return $osf.postJSON(
        self.urls().importAuth, {}
    ).done(function(response) {
        self.changeMessage('Successfully imported Github credentials.', 'text-success');
        self.updateFromData(response);
    }).fail(function(xhr, status, error) {
        var message = 'Could not import Github credentials at ' +
            'this time. Please refresh the page. If the problem persists, email ' +
            '<a href="mailto:support@osf.io">support@osf.io</a>.';
        self.changeMessage(message, 'text-warning');
        Raven.captureMessage('Could not import Github credentials', {
            url: self.urls().importAuth,
            textStatus: status,
            error: error
        });
    });

};

ViewModel.prototype.importAuth = function() {
    var self = this;
    bootbox.confirm({
        title: 'Import Github credentials?',
        message: 'Are you sure you want to authorize this project with your Github credentials?',
        callback: function(confirmed) {
            if (confirmed) {
                return self._importAuthConfirm();
            }
        }
    });
};



ViewModel.prototype.updateFromData = function(settings){
    var self = this;
    self.nodeHasAuth(settings.node_has_auth);
    self.userHasAuth(settings.user_has_auth);
    self.userIsOwner(settings.user_is_owner);
    self.ownerName(settings.owner);
    self.currentRepo(settings.has_repo ? settings.repo : 'None');
    self.repoList(settings.repo_list);
    self.loadedSettings(true);
    if (settings.urls){
        self.urls(settings.urls);
    }
};

ViewModel.prototype.fetchFromServer = function() {
    var self = this;
    var request = $.ajax({
            url: self.url,
            type: 'GET',
            dataType: 'json'
        })
        .done(function(response) {
            var settings = response.result;
            self.updateFromData(settings);
            debugger;
        })
        .fail(function(xhr, status, error) {
            var message = 'Could not retrieve github settings at ' +
                'this time. Please refresh the page. If the problem persists, email ' +
                '<a href="mailto:support@osf.io">support@osf.io</a>.';
            self.changeMessage(message, 'text-warning');
            Raven.captureMessage('Could not GET github settings', {
                url: self.url,
                textStatus: status,
                error: error
            });
        });
};

/** Change the flashed message. */
ViewModel.prototype.changeMessage = function(text, css, timeout) {
    var self = this;
    self.message(text);
    var cssClass = css || 'text-info';
    self.messageClass(cssClass);
    if (timeout) {
        // Reset message after timeout period
        setTimeout(function() {
            self.message('');
            self.messageClass('text-info');
        }, timeout);
    }
};


var githubConfig = function(selector, url){   
    var viewModel = new ViewModel(url, selector);
    $osf.applyBindings(viewModel, selector);
};

module.exports = {
    githubNodeConfig: githubConfig,
    _githubNodeConfigViewModel: ViewModel
};