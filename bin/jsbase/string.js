define([], function() {
    /*****************************************************************************
     *
     * Copyright (c) 2004-2007 Guido Wesdorp. All rights reserved.
     *
     * This software is distributed under the terms of the JSBase
     * License. See LICENSE.txt for license text.
     *
     *****************************************************************************/

    /* Additions to the core String API */
    var global = this;
    global.string = new function() {
        var string = this;

        this.strip = function strip(s) {
            /* returns a string with all leading and trailing whitespace removed */
            var stripspace = /^\s*([\s\S]*?)\s*$/;
            return stripspace.exec(s)[1];
        };

        this.reduceWhitespace = function reduceWhitespace(s) {
            /* returns a string in which all whitespace is reduced
                to a single, plain space */
            s = s.replace(/\r/g, ' ');
            s = s.replace(/\t/g, ' ');
            s = s.replace(/\n/g, ' ');
            while (s.indexOf('  ') > -1) {
                s = s.replace('  ', ' ');
            };
            return s;
        };

        this.entitize = function entitize(s, external, quoteapos) {
            /* replace all standard XML entities */
            var ret = s.replace(/&/g, '&amp;');
            ret = ret.replace(/"/g, '&quot;');
            ret = ret.replace(/</g, '&lt;');
            ret = ret.replace(/>/g, '&gt;');
            if (quoteapos) {
                ret = ret.replace(/'/g, '&apos;');
            };
            // XXX we don't replace non-ascii chars with numbered entities, but
            // instead assume clients can deal with them properly
            for (var entity in external) {
                ret = ret.replace(new RegExp(external[entity], 'g'),
                    '&' + entity + ';');
            };
            return ret;
        };

        this.deentitize = function deentitize(s, external) {
            /* convert all standard XML entities to the corresponding characters */
            // first numbered entities
            var numberedreg = /&#(x?)([a-f0-9]{2,});/ig;
            while (true) {
                var match = numberedreg.exec(s);
                if (!match) {
                    break;
                };
                var value = match[2];
                var base = 10;
                if (match[1]) {
                    base = 16;
                };
                value = String.fromCharCode(parseInt(value, base));
                s = s.replace(new RegExp(match[0], 'g'), value);
            };
            // external entities (use for e.g. nbsp)
            for (var entity in external) {
                s = s.replace(new RegExp('&' + entity + ';', 'g'),
                    external[entity]);
            };
            // and standard ones
            s = s.replace(/&gt;/g, '>');
            s = s.replace(/&lt;/g, '<');
            s = s.replace(/&apos;/g, "'");
            s = s.replace(/&quot;/g, '"');
            s = s.replace(/&amp;/g, '&');
            return s;
        };

        this.urldecode = function urldecode(s) {
            /* decode an URL-encoded string

                reverts the effect of calling 'escape' on a string (see
                'string.urlencode' below)
            */
            var reg = /%([a-fA-F0-9]{2})/g;
            var str = s;
            while (true) {
                var match = reg.exec(str);
                if (!match || !match.length) {
                    break;
                };
                var repl = new RegExp(match[0], 'g');
                str = str.replace(repl,
                    String.fromCharCode(parseInt(match[1], 16)));
            };
            // XXX should we indeed replace these?
            str = str.replace(/\+/g, ' ');
            return str;
        };

        this.urlencode = function urlencode(s) {
            /* wrapper around the 'escape' core function

                provided for consistency, since I also have a string.urldecode()
                defined
            */
            if (global.encodeURI) {
                return encodeURI(s);
            } else {
                return escape(s);
            };
        };

        this.escape = function escape(s) {
            /* escapes quotes and special chars (\n, \a, \r, \t, etc.)

                adds double slashes
            */
            // XXX any more that need escaping?
            s = s.replace(/\\/g, '\\\\');
            s = s.replace(/\n/g, '\\\n');
            s = s.replace(/\r/g, '\\\r');
            s = s.replace(/\t/g, '\\\t');
            s = s.replace(/'/g, "\\'");
            s = s.replace(/"/g, '\\"');
            return s;
        };

        this.unescape = function unescape(s) {
            /* remove double slashes */
            s = s.replace(/\\\n/g, '\n');
            s = s.replace(/\\\r/g, '\r');
            s = s.replace(/\\\t/g, '\t');
            s = s.replace(/\\'/g, '\'');
            s = s.replace(/\\"/g, '"');
            s = s.replace(/\\\\/g, '\\');
            return s;
        };

        this.centerTruncate = function centerTruncate(s, maxlength) {
            if (s.length <= maxlength) {
                return s;
            };
            var chunklength = maxlength / 2 - 3;
            var start = s.substr(0, chunklength);
            var end = s.substr(s.length - chunklength);
            return start + ' ... ' + end;
        };

        this.startsWith = function startsWith(s, start) {
            return s.substr(0, start.length) == start;
        };

        this.endsWith = function endsWith(s, end) {
            return s.substr(s.length - end.length) == end;
        };

        this.format = function format(s, indent, maxwidth) {
            /* perform simple formatting on the string */
            if (indent.length > maxwidth) {
                throw ('Size of indent must be smaller than maxwidth');
            };
            s = string.reduceWhitespace(s);
            var words = s.split(' ');
            var lines = [];
            while (words.length) {
                var currline = indent;
                while (1) {
                    var word = words.shift();
                    if (!word ||
                        (currline.length > indent.length &&
                            currline.length + word.length > maxwidth)) {
                        break;
                    };
                    currline += word + ' ';
                };
                lines.push(currline);
            };
            return lines.join('\r\n');
        };

        this.parseQuery = function parseQuery(q) {
            if (q.charAt(0) == '?') {
                q = q.substr(1);
            };
            var pairs = q.split('&');
            var ret = {};
            for (var i = 0; i < pairs.length; i++) {
                var namevalue = pairs[i].split('=');
                var name = string.urldecode(namevalue[0]);
                var value = string.urldecode(namevalue[1]);
                var currvalue = pairs[name];
                if (currvalue) {
                    if (typeof currvalue == 'string') {
                        ret[name] = [currvalue, value];
                    } else {
                        ret[name].push(value);
                    };
                } else {
                    ret[name] = value;
                };
            };
            return ret;
        };

        this.makeQuery = function makeQuery(d) {
            /* convert an object ('associative array') to a GET/POST string
             */
            if (!d instanceof Object) {
                var msg = 'not an associative array';
                if (global.misclib) {
                    msg += ' ' + misclib.repr(d);
                };
                if (global.exception) {
                    throw (exception.ValueError(msg));
                } else {
                    throw (msg);
                };
            };
            var ret = [];
            for (var attr in d) {
                var value = d[attr];
                if (!(value instanceof Array)) {
                    value = [value];
                };
                for (var i = 0; i < value.length; i++) {
                    ret.push(string.urlencode(attr) + '=' +
                        string.urlencode(value[i]));
                };
            };
            return ret.join('&');
        };
    }();
    return this.string
})