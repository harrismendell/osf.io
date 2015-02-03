import datetime
from collections import Iterable

from modularodm import fields

from framework.mongo import StoredObject


class Citation(dict):
    pass


class CitationList(list):

    def __init__(self, *args, **kwargs):
        self.name = kwargs.pop('name', '')
        self.provider_list_id = kwargs.pop('provider_list_id', None)
        self.provider_account_id = kwargs.pop('provider_account_id', None)
        self._citations = None
        super(CitationList, self).__init__(*args, **kwargs)

    def __repr__(self):
        return '<CitationList: {}>'.format(self.name or '[anonymous]')


    @property
    def _get_citations(self):
        """Unbound callable that returns a list of Citation instances

        This property must be assigned with a CitationList is instantiated IF
        self._citations is not assigned. If self._citations is assigned, this
        need not be assigned because it will not be accessed.

        :return: iterable(Citation)
        """
        raise NotImplementedError()

    @property
    def citations(self):
        """Iterable of citations belonging to this CitationList

        :return: iterable(Citation)
        """
        if self._citations is None:
            self._citations = self._get_citations()

        return self._citations

    @citations.setter
    def citations(self, val):
        if callable(val):
            self._get_citations = val
        elif isinstance(val, Iterable):
            self._citations = val
        else:
            raise ValueError("must be iterable or callable")

    @property
    def json(self):
        """JSON-formatted string for instance and all children"""
        return {
            'name': self.name,
            'provider_list_id': self.provider_list_id,
            'provider_account_id': self.provider_account_id,
        }


class CitationStyle(StoredObject):

    # The name of the citation file, sans extension
    _id = fields.StringField(primary=True)

    # The full title of the style
    title = fields.StringField(required=True)

    # Datetime the file was last parsed
    date_parsed = fields.DateTimeField(default=datetime.datetime.utcnow,
                                       required=True)

    short_title = fields.StringField()
    summary = fields.StringField()

    def to_json(self):
        return {
            'id': self._id,
            'title': self.title,
            'short_title': self.short_title,
            'summary': self.summary,
        }