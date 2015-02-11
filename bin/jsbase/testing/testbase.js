var paths = %r;
var testname = %r;

// redirect normal prints
var global = this;
global.real_print = global.print;
global.print = function(l) {
    global.real_print('PRINTED: ' + l);
};

// import paths
for (var i=0; i < paths.length; i++) {
    var path = paths[i];
    load(path);
};

global.jstest = new function() {
    var jstest = this;

    var Runner = this.Runner = function(module, testname) {
        if (module !== undefined) {
            this.module = module;
            this.testname = testname;
        };
    };

    Runner.prototype.run = function() {
        var module = this.module;
        var ns = {};
        var test = module[testname];
        real_print('running test ' + testname);
        try {
            if (module.setup) {
                module.setup(ns);
            };
            test.call(ns);
            if (module.teardown) {
                module.teardown(ns);
            };
            real_print('success');
        } catch(e) {
            real_print('failure: ' + (e.toString ? e.toString() : e));
            if (e.stack) {
                real_print('traceback');
                real_print(e.stack);
                real_print('end traceback');
            };
        };
        real_print('end test');
    };

    this.initialize = function() {
        var runner = new Runner(global, testname);
        runner.run();
    };
}();

if ('%s' == '__main__') {
    jstest.initialize();
};
