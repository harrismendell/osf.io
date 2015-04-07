# -*- coding: utf-8 -*-

from flask import request

from framework.auth.decorators import must_be_logged_in

from website.project.decorators import (
    must_be_contributor_or_public,
    must_have_permission,
    must_not_be_registration,
    must_have_addon,
)

from .provider import GithubProvider

@must_be_logged_in
def github_list_accounts_user(auth):
    """Return the list of all of the current user's authorized Github accounts."""

    provider = GithubProvider()
    return provider.user_accounts(auth.user)


@must_have_permission('write')
@must_have_addon('github', 'node')
def github_get_config(auth, node_addon, **kwargs):
    """Serialize node addon settings and relevant urls
    (see serialize_settings/serialize_urls)
    """
    provider = GithubProvider()
    return {
        'result': provider.serializer(
            node_settings=node_addon,
            user_settings=auth.user.get_addon('github'),
        ).serialized_node_settings
    }

@must_have_permission('write')
@must_have_addon('github', 'node')
@must_not_be_registration
def github_set_config(auth, node_addon, **kwargs):
    """Update GithubNodeSettings based on submitted account and folder information."""

    provider = GithubProvider()
    args = request.get_json()
    external_list_id = args.get('external_list_id')
    external_list_name = args.get('external_list_name')
    provider.set_config(
        node_addon,
        auth.user,
        external_list_id,
        external_list_name,
        auth,
    )
    return {
        'result': provider.serializer(
            node_settings=node_addon,
            user_settings=auth.user.get_addon('github'),
        ).serialized_node_settings
    }

@must_have_permission('write')
@must_have_addon('github', 'node')
@must_not_be_registration
def github_add_user_auth(auth, node_addon, **kwargs):
    """Allows for importing existing auth to GithubNodeSettings """

    provider = GithubProvider()
    import ipdb; ipdb.set_trace()
    external_account_id = request.get_json().get('external_account_id')
    return provider.add_user_auth(node_addon, auth.user, external_account_id)


@must_have_permission('write')
@must_have_addon('github', 'node')
@must_not_be_registration
def github_remove_user_auth(auth, node_addon, **kwargs):
    """Removes auth from GithubNodeSettings """

    provider = GithubProvider()
    return provider.remove_user_auth(node_addon, auth.user)


@must_be_contributor_or_public
@must_have_addon('github', 'node')
def github_widget(node_addon, **kwargs):
    """Collects and serializes settting needed to build the widget."""

    provider = GithubProvider()
    return provider.widget(node_addon)


@must_be_contributor_or_public
@must_have_addon('github', 'node')
def github_citation_list(auth, node_addon, github_list_id=None, **kwargs):
    """Collects a listing of folders and citations based on the
    passed github_list_id. If github_list_id is `None`, then all of the
    authorizer's folders and citations are listed.
    """

    provider = GithubProvider()
    show = request.args.get('view', 'all')
    return provider.citation_list(node_addon, auth.user, github_list_id, show)
