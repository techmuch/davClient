/*
    tests.js - unit tests for minisax.js
    Copyright (C) 2004-2008 Guido Wesdorp. All rights reserved.
    This software is distributed under the terms of the minisax.js
    license. See LICENSE.txt for license text.
    email johnny@debris.demon.nl

    $Id: minisax.js,v 1.5 2004/07/31 00:10:15 johnny Exp $

*/

load('../jsbase/string.js');
load('../jsbase/array.js');
load('minisax.js');

minisax.expose_globals();

var global = this;
global.parser = undefined;
global.handler = undefined;
function setup() {
    global.parser = new SAXParser();
    global.handler = new TestHandler(); // see below
};

function test_regs() {
    global.parser.initialize('<foo/>', global.handler);
    var reg = global.parser.starttagreg;
    var xml = '<foo>';
    testing.assertEquals(xml.match(reg).slice(1).toString(), 
                        ['', 'foo', '', ''].toString());
    var xml = ' <foo/> ';
    testing.assertEquals(xml.match(reg).slice(1).toString(), 
                        ['', 'foo', '', '/'].toString());
    var xml = 'foo:bar foo="bar"/>sdhfsjkhf<tal:block define="foobar" />fsjk';
    testing.assertEquals(xml.match(reg).slice(1).toString(),
                        ['tal:', 'block', ' define="foobar" ', '/'].toString());
};

function test_events() {
    var handler = new TestHandler();
    var xml = '<foo><bar>baz</bar></foo>';
    global.parser.initialize(xml, handler);
    global.parser.parse();
    
    testing.assert(handler.document_started);
    testing.assert(handler.document_ended);
    
    var starttuples = handler.start_elements;
    array.map(starttuples, function(t) {return t[1];}, true);
    endtuples = handler.end_elements;
    array.map(endtuples, function(t) {return t[1];}, true);
    testing.assertEquals(starttuples.toString(), 
                        ['foo', 'bar'].toString());
    testing.assertEquals(array.reversed(starttuples).toString(),
                        endtuples.toString());
    testing.assertEquals(handler.characterstrings.toString(),
                        ['baz'].toString());
};

function test_namespaces() {
    var handler = new TestHandler();
    var xml = '<?xml version="1.0" ?>\n' +
                '<foo xmlns="foo" xml:lang="en" foo="bar" xmlns:bar="bar" ' +
                ' xmlns:qux="qux" bar:quux="quux">\n' +
                '<bar:baz qux:foo="bar">\n' + 
                '<qux bar:qux="qux" quux="quux"/>\n' + 
                'baz\n' +
                '</bar:baz>\n' +
                '</foo>';
    global.parser.initialize(xml, handler);
    global.parser.parse();

    testing.assertEquals(handler.start_elements[0][0], 'foo');
    testing.assertEquals(handler.start_elements[1][0], 'bar');
    testing.assertEquals(handler.start_elements[2][0], 'foo');
    testing.assertEquals(handler.end_elements[0][0], 'foo');
    testing.assertEquals(handler.end_elements[1][0], 'bar');
    testing.assertEquals(handler.end_elements[2][0], 'foo');
    testing.assertEquals(handler.start_elements[0][2]['']['foo'], 'bar');
    testing.assertEquals(handler.start_elements[0][2][
                        'http://www.w3.org/XML/1998/namespace']['lang'], 'en');
    testing.assertEquals(handler.start_elements[0][2]['bar']['quux'], 'quux');
    testing.assertEquals(handler.start_elements[1][2]['qux']['foo'], 'bar');
    testing.assertEquals(handler.start_elements[2][2]['']['quux'], 'quux');
    testing.assertEquals(handler.start_elements[2][2]['bar']['qux'], 'qux');

    testing.assertEquals(handler.characterstrings.toString(),
                        ['\n', '\n', '\n', '\nbaz\n', '\n'].toString());
};

function test_retain_prefixes() {
    var handler = new TestHandler();
    var xml = '<?xml version="1.0" ?>\n' +
                '<foo xmlns:bar="bar" />';
    global.parser.initialize(xml, handler);
    global.parser.parse();
    
    testing.assertEquals(handler.start_elements[0][2],
        {'http://www.w3.org/2000/xmlns/': {'bar': 'bar'}});
};

function test_comments() {
    var handler = new TestHandler();
    var xml = '<foo><!-- <bar>baz</bar> --></foo>';
    global.parser.initialize(xml, handler);
    global.parser.parse();

    testing.assertEquals(handler.start_elements.length, 1);
    testing.assertEquals(handler.start_elements[0][1], 'foo');
    testing.assertEquals(handler.comments.length, 1);
    testing.assertEquals(handler.comments[0], ' <bar>baz</bar> ');
};

function TestHandler() {
    this.document_started = false;
    this.document_ended = false;
    this.start_elements = []; // tuples [ns, name, attrs]
    this.end_elements = []; // tuples [ns, name]
    this.characterstrings = [];
    this.comments = [];
};

TestHandler.prototype = new SAXHandler;

TestHandler.prototype.startDocument = function() {
    this.document_started = true;
};

TestHandler.prototype.endDocument = function() {
    this.document_ended = true;
};

TestHandler.prototype.startElement = function(namespace, nodename, attrs) {
    this.start_elements.push([namespace, nodename, attrs]);
};

TestHandler.prototype.endElement = function(namespace, nodename) {
    this.end_elements.push([namespace, nodename]);
};

TestHandler.prototype.characters = function(chars) {
    this.characterstrings.push(chars);
};

TestHandler.prototype.comment = function(comment) {
    this.comments.push(comment);
};
