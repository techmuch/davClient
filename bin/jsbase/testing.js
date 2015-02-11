/*****************************************************************************
 *
 * Copyright (c) 2004-2007 Guido Wesdorp. All rights reserved.
 *
 * This software is distributed under the terms of the JSBase
 * License. See LICENSE.txt for license text.
 *
 *****************************************************************************/

var global = this;
global.testing = new function() {
    var testing = this;

    this.DEBUG = true; // set to false to disable debug messages
    
    this.assert = this.assertTrue = function(expr, message) {
        /* raise an exception if expr resolves to false */
        if (!testing.DEBUG) {
            return;
        };
        if (!expr) {
            if (!message) {
                message = 'false assertion'
            } else {
                message = '' + message;
            };
            throw(new exception.AssertionError(message));
        };
    };

    this.assertFalse = function(s, message) {
        if (s) {
            if (!message) {
                message = '!! ' + misclib.repr(s);
            };
            throw(new exception.AssertionError(message));
        };
    };

    this.assertEquals = function(var1, var2, message) {
        /* assert whether 2 vars have the same value */
        if (var1 != var2 &&
                (!(var1 instanceof Object && var2 instanceof Object) ||
                    misclib.safe_repr(var1) != misclib.safe_repr(var2))) {
            if (!message) {
                message = misclib.repr(var1) + ' != ' + misclib.repr(var2);
            };
            throw(new exception.AssertionError(message));
        };
    };

    this.assertNotEquals = function assertNotEquals(var1, var2, message) {
        try {
            this.assertEquals(var1, var2);
        } catch(e) {
            if (e instanceof exception.AssertionError) {
                // this is the desired situation - vars are not equal
                return;
            };
            throw(e);
        };
        if (!message) {
            message = misclib.repr(var1) + ' == ' + misclib.repr(var2);
        };
        throw(new exception.AssertionError(message));
    };

    this.assertThrows = function(exctype, callable, context, message) {
        /* assert whether a certain exception is raised */
        // we changed the argument order here, so an explicit check is the
        // least we can do ;)
        if (typeof callable != 'function') {
            var msg = 'wrong argument type for callable';
            throw(new exception.ValueError(msg));
        };
        if (!context) {
            context = null;
        };
        var exception_thrown = false;
        // remove the first three args, they're the function's normal args
        var args = [];
        for (var i=3; i < arguments.length; i++) {
            args.push(arguments[i]);
        };
        try {
            callable.apply(context, args);
        } catch(e) {
            // allow catching undefined exceptions too
            if (exctype === undefined) {
            } else if (exctype) {
                var isinstance = false;
                try {
                    if (e instanceof exctype) {
                        isinstance = true;
                    };
                } catch(f) {
                };
                if (!isinstance) {
                    if (exctype.toSource && e.toSource) {
                        exctype = exctype.toSource();
                        e = e.toSource();
                    };
                    if (exctype.toString && e.toString) {
                        exctype = exctype.toString();
                        e = e.toString();
                    };
                    if (e != exctype) {
                        if (!message) {
                            message = 'exception ' + e + ', while expecting ' +
                                      exctype;
                        };
                        throw(new exception.AssertionError(message));
                    };
                };
            };
            exception_thrown = true;
        };
        if (!exception_thrown) {
            if (!message) {
                message = 'function didn\'t raise exception';
                if (exctype) {
                    message += ' ' + exctype.toString() + '"';
                };
            };
            throw(new exception.AssertionError(message));
        };
    };

    this.debug = function(str, show_stack) {
        /* append a message to the document with a string */
        if (!testing.DEBUG) {
            return;
        };
        var stack = '';
        if (show_stack && global.exception && exception._createStack) {
            stack = exception._createStack();
            if (stack) {
                stack = '\nstack:\n' + stack;
            };
        };
        if (global.console && global.console.log) {
            // let's assume this is Firebug...
            try {
                var msg = 'jsbase debug: ' + str;
                if (show_stack) {
                    msg += stack;
                };
                global.console.log(msg);
                return;
            } catch(e) {
                // so, perhaps it's not...
                alert('exception while logging: ' + e);
            };
        };
        var msg = '' + str;
        if (show_stack) {
            msg += stack;
        };
        try {
            var div = document.createElement('pre');
            div.appendChild(document.createTextNode(msg));
            div.style.color = 'red';
            div.style.borderWidth = '1px';
            div.style.borderStyle = 'solid';
            div.style.borderColor = 'black';
            document.getElementsByTagName('body')[0].appendChild(div);
        } catch(e) {
            try {
                alert(msg);
            } catch(e) {
                print(msg);
            };
        };
    };

    if (!global.exception) {
        testing.debug('exception module not imported - ' +
                      'defining exceptions ourself');
        global.exception = {
            AssertionError: function(msg) {
                this.name = 'AssertionError';
                this.message = msg;
            },
            ValueError: function(msg) {
                this.name = 'ValueError';
                this.message = msg;
            }
        };
    };
}();
