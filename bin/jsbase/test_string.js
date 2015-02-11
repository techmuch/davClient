load('string.js');

function test_strip() {
    testing.assertEquals(string.strip(' foo '), 'foo');
    testing.assertEquals(string.strip('\tfoo'), 'foo');
    testing.assertEquals(string.strip('foo\r\n'), 'foo');
    testing.assertEquals(string.strip('\t\r\n \nfoo \t bar\r\n\t'), 'foo \t bar');
};

function test_reduceWhitespace() {
    testing.assertEquals(string.reduceWhitespace('foo  bar'), 'foo bar');
    testing.assertEquals(string.reduceWhitespace('foo\r\nbar'), 'foo bar');
    testing.assertEquals(string.reduceWhitespace('foo\t\r\n \tbar'), 'foo bar');
};

function test_entitize() {
    testing.assertEquals(string.entitize('foo>bar'), 'foo&gt;bar');
    testing.assertEquals(string.entitize('foo<&>bar'), 'foo&lt;&amp;&gt;bar');
    testing.assertEquals(string.entitize('foo"\'bar'), 'foo&quot;\'bar');
    testing.assertEquals(string.entitize('foo"\'bar', null, true),
                         'foo&quot;&apos;bar');
    testing.assertEquals(string.entitize(' \t\n'), ' \t\n');

    // test external entities
    testing.assertEquals(string.entitize('foo', {'lowero': 'o'}),
                         'f&lowero;&lowero;');
};

function test_deentitize() {
    testing.assertEquals(string.deentitize('foo&amp;bar'), 'foo&bar');
    testing.assertEquals(string.deentitize('foo&amp;gtbar'), 'foo&gtbar');
    testing.assertEquals(string.deentitize('foo&quot;&apos;bar'),
                         'foo"\'bar');

    // external entities
    testing.assertEquals(string.deentitize('f&lowero;&lowero;',
                                           {'lowero': 'o'}), 'foo');

    // numbered entities
    testing.assertEquals(string.deentitize('foo&#xa0;bar'), 'foo\xa0bar');
    testing.assertEquals(string.deentitize('foo&#42;bar'), 'foo*bar');
};

function test_urldecode() {
    testing.assertEquals(string.urldecode('foo%20bar'), 'foo bar');
    testing.assertEquals(string.urldecode('foo+bar%40baz'), 'foo bar@baz');
};

function test_urlencode() {
    testing.assertEquals(string.urlencode('foo bar+baz'), escape('foo bar+baz'));
};

function test_escape() {
    testing.assertEquals(string.escape('foo\nbar\\baz'), 'foo\\\nbar\\\\baz');
};

function test_unescape() {
    testing.assertEquals(string.unescape('foo\\\nbar\\\\baz'), 'foo\nbar\\baz');
};

function test_centerTruncate() {
    testing.assertEquals(string.centerTruncate('foo', 10), 'foo');
    testing.assertEquals(string.centerTruncate('foo bar baz', 10), 'fo ... az');
};

function test_startsWith() {
    testing.assert(string.startsWith('foo', 'f'));
    testing.assert(string.startsWith('foobarbaz', 'foo'));
    testing.assertFalse(string.startsWith('foo', 'b'));
};

function test_endsWith() {
    testing.assert(string.endsWith('foo', 'o'));
    testing.assert(string.endsWith('foo bar baz', 'baz'));
    testing.assertFalse(string.endsWith('foo', 'z'));
};

function test_parseQuery() {
    testing.assertEquals(string.parseQuery('foo=bar').toString(),
                         {foo: 'bar'}.toString());
    testing.assertEquals(string.parseQuery('foo=bar+baz').toString(),
                         {foo: 'bar baz'}.toString());
    testing.assertEquals(string.parseQuery('foo=bar%20baz').toString(),
                         {foo: 'bar baz'}.toString());
    testing.assertEquals(string.parseQuery('foo=bar&baz=qux').toString(),
                         {foo: 'bar', baz: 'qux'}.toString());
};

function _sort(a) {
    a.sort();
    return a;
};

function test_makeQuery() {
    testing.assertEquals(string.makeQuery({}), '');
    testing.assertEquals(string.makeQuery({foo: 'bar'}), 'foo=bar');
    testing.assertEquals(string.makeQuery({foo: 'bar baz'}), 'foo=bar%20baz');
    testing.assertEquals(
        _sort(string.makeQuery({foo: 'bar', baz: 'qux'}).split('&')),
        ['baz=qux', 'foo=bar']);
    testing.assertEquals(string.makeQuery({'foo bar': 'baz qux'}),
                         'foo%20bar=baz%20qux');
    testing.assertEquals(string.makeQuery({'foo': ['bar', 'baz']}).split('&'),
                         ['foo=bar', 'foo=baz']);
};
