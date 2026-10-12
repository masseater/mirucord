CREATE VIRTUAL TABLE `message_search` USING fts5(`tokens`, content='', contentless_delete=1, detail=none, tokenize='ascii');
