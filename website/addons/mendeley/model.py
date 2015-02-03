import time

import mendeley
from modularodm import fields
from modularodm import Q


from website import settings
from website.addons.base import AddonNodeSettingsBase
from website.addons.base import AddonUserSettingsBase
from website.citations.models import Citation
from website.citations.models import CitationList
from website.oauth.models import ExternalAccount
from website.oauth.models import ExternalProvider

from .api import APISession


class AddonMendeleyUserSettings(AddonUserSettingsBase):

    def _get_connected_accounts(self):
        return [x for x in self.owner.external_accounts if x.provider == 'mendeley']

    def to_json(self, user):
        rv = super(AddonMendeleyUserSettings, self).to_json(user)
        rv['accounts'] = [
            {
                'id': account._id,
                'provider_id': account.provider_id,
                'display_name': account.display_name,
            } for account in self._get_connected_accounts()
        ]
        return rv


class AddonMendeleyNodeSettings(AddonNodeSettingsBase):
    external_account = fields.ForeignField('externalaccount',
                                           backref='connected')

    def to_json(self, user):
        accounts = {
            account for account
            in user.external_accounts
            if account.provider == 'mendeley'
        }
        if self.external_account:
            accounts.add(self.external_account)

        rv = super(AddonMendeleyNodeSettings, self).to_json(user)
        rv['accounts'] = [
            {
                'id': account._id,
                'provider_id': account.provider_id,
                'display_name': account.display_name,
            } for account in accounts
        ]

        return rv



class Mendeley(ExternalProvider):
    name = "Mendeley"
    short_name = "mendeley"

    client_id = settings.MENDELEY_CLIENT_ID
    client_secret = settings.MENDELEY_CLIENT_SECRET

    auth_url_base = 'https://api.mendeley.com/oauth/authorize'
    callback_url = 'https://api.mendeley.com/oauth/token'
    default_scopes = ['all']

    _client = None

    def handle_callback(self, response):
        client = self._get_client(response)

        profile = client.profiles.me

        return {
            'provider_id': profile.id,
            'display_name': profile.display_name
        }

    def _get_client(self, credentials):
        if not self._client:
            partial = mendeley.Mendeley(
                client_id=self.client_id,
                client_secret=self.client_secret,
                redirect_uri='http://cos.ngrok.com/oauth/callback/mendeley/',
            )
            self._client = APISession(partial, credentials)

        return self._client

    @property
    def client(self):
        if not self._client:
            self._client = self._get_client({
                'access_token': self.account.oauth_key,
                'refresh_token': self.account.refresh_token,
                'expires_at': time.mktime(self.account.expires_at.timetuple()),
                'token_type': 'bearer',
            })
        return self._client

    @property
    def citation_lists(self):
        client = self.client

        folders = client.folders.list().items

        return (
            self._mendeley_folder_to_citation_list(folder)
            for folder in folders
        )

    def _mendeley_folder_to_citation_list(self, folder):
        return CitationList(
            name=folder.name,
            provider_account_id=self.account.provider_id,
            provider_list_id=folder.json['id'],
        )