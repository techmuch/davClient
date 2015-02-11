import py
here = py.magic.autopath().dirpath()

from jsbase.conftest import JSTest, JSChecker, Directory as _Directory

class Directory(_Directory):
    def run(self):
        if self.fspath == here:
            return [p.basename for p in self.fspath.listdir('test_*') if
                    p.ext == '.js']
        return super(Directory, self).run()

