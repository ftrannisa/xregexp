beforeEach(function() {
    global.disableOptInFeatures();
    global.addToEqualMatchMatcher();
});

describe('XRegExp.addToken()', function() {

    it('should throw an exception if provided a non-RegExp object as the regex argument', function() {
        var values = ['/str/', 1, null];

        values.forEach(function(value) {
            expect(function() {
                XRegExp.addToken(value, function() {return '';});
            }).toThrowError(TypeError);
        });
    });

    it('should handle native multicharacter tokens correctly when they are partially overriden', function() {
        XRegExp.addToken(/00\$\$/, function() {return 'BOOM';});

        expect(XRegExp('^x\\x00$$$').test('x\x00')).toBe(true);
    });

    it('should give more recently added tokens precedence, and cause any pattern caching to be updated', function() {
        XRegExp.addToken(/\x00/, function() {return 'overridden';});
        expect(XRegExp('\x00').test('overridden')).toBe(true);

        XRegExp.addToken(/\x00/, function() {return '0';});
        expect(XRegExp('\x00').test('0')).toBe(true);
    });

    // This token is deferred to by later token tests
    XRegExp.addToken(/\x01/, function() {return '1';});

    it('should match implicit "default" scope outside of character classes', function() {
        expect(XRegExp('\x01').test('1')).toBe(true);
    });

    it('should not match implicit "default" scope match inside of character classes', function() {
        expect(XRegExp('[\x01]').test('1')).toBe(false);
    });

    // This token is deferred to by later token tests
    XRegExp.addToken(/\x02/, function() {return '2';}, {scope: 'class'});

    it('should not match "class" scope outside of character classes', function() {
        expect(XRegExp('\x02').test('2')).toBe(false);
    });

    it('should match "class" scope inside of character classes', function() {
        expect(XRegExp('[\x02]').test('2')).toBe(true);
    });

    (function() {
        XRegExp.addToken(/\x03/, function() {return '3';}, {scope: 'default'});

        it('should match explicit "default" scope outside of character classes', function() {
            expect(XRegExp('\x03').test('3')).toBe(true);
        });

        it('should not match explicit "default" scope inside of character classes', function() {
            expect(XRegExp('[\x03]').test('3')).toBe(false);
        });
    }());

    (function() {
        XRegExp.addToken(/\x04/, function() {return '4';}, {scope: 'all'});

        it('should match "all" scope outside of character classes', function() {
            expect(XRegExp('\x04').test('4')).toBe(true);
        });

        it('should match "all" scope inside of character classes', function() {
            expect(XRegExp('[\x04]').test('4')).toBe(true);
        });
    }());

    (function() {
        XRegExp.addToken(/\x05/, function() {return '5';}, {flag: '5'});

        it('should skip a token that uses a flag trigger when the flag is not included', function() {
            expect(XRegExp('\x05').test('5')).toBe(false);
        });

        it('should match a token that uses a flag trigger when the flag is included', function() {
            expect(XRegExp('\x05', '5').test('5')).toBe(true);
        });
    }());

    it('should throw an exception if given a flag with more than one character', function() {
        var values = ['12', '123', '55'];

        values.forEach(function(value) {
            expect(function() {
                XRegExp.addToken(/\b\B/, function() {return '';}, {flag: value});
            }).toThrow();
        });
    });

    it('should throw an exception if given a truthy flag other than A-Za-z0-9_$', function() {
        var values = ['!', '?', true, []];

        values.forEach(function(value) {
            expect(function() {
                XRegExp.addToken(/\b\B/, function() {return '';}, {flag: value});
            }).toThrow();
        });
    });

    (function() {
        XRegExp.addToken(/\$/, function(match, scope, flags) {
            if (flags.indexOf('$') > -1) {
                return '\\$';
            }
            return '$';
        }, {optionalFlags: '$'});

        it('should not throw an exception for flags registered via the optionalFlags option', function() {
            expect(function() {XRegExp('', '$');}).not.toThrow();
        });

        it('should provide flags used to build the regex as the third token handler argument', function() {
            expect(XRegExp('$').test('')).toBe(true);
            expect(XRegExp('$', '$').test('')).toBe(false);
            expect(XRegExp('(?$)$').test('')).toBe(false);
        });
    }());

    it('should throw an exception if a flag other than A-Za-z0-9_$ is given via the optionalFlags option', function() {
        var values = ['!', '?'];

        values.forEach(function(value) {
            expect(function() {
                XRegExp.addToken(/\b\B/, function() {return '';}, {optionalFlags: value});
            }).toThrow();
        });
    });

    (function() {
        XRegExp.addToken(/^\x06/, function() {return '6';});

        it('should match an anchored token when found at the start of the pattern', function() {
            expect(XRegExp('\x06').test('6')).toBe(true);
        });

        it('should not match an anchored token when not found at the start of the pattern', function() {
            expect(XRegExp('a\x06').test('6')).toBe(false);
        });
    }());

    it('should not chain tokens when the reparse option is not set', function() {
        XRegExp.addToken(/\x07/, function() {return '\x01';});

        expect(XRegExp('\x07').test('\x01')).toBe(true);
    });

    it('should chain tokens when the reparse option is true', function() {
        XRegExp.addToken(/\x07/, function() {return '\x01';}, {reparse: true});

        expect(XRegExp('\x07').test('1')).toBe(true);
    });

    it('should not chain tokens when the reparse option is false', function() {
        XRegExp.addToken(/\x07/, function() {return '\x01';}, {reparse: false});

        expect(XRegExp('\x07').test('\x01')).toBe(true);
    });

    it('should be able to defer to multiple tokens when the reparse option is true', function() {
        XRegExp.addToken(/\u2000/, function() {return '\x01.[\x02]';}, {reparse: true});

        expect(XRegExp('^\u2000$').test('1x2')).toBe(true);
    });

    it('should support a two-step token reparsing chain', function() {
        XRegExp.addToken(/\u2001/, function() {return '\u2000';}, {reparse: true});

        expect(XRegExp('^\u2001$').test('1x2')).toBe(true);
    });

    it('should support a three-step token reparsing chain', function() {
        XRegExp.addToken(/\u2002/, function() {return '\u2001';}, {reparse: true});

        expect(XRegExp('^\u2002$').test('1x2')).toBe(true);
    });

    it('should allow XRegExp regexes to be used as the token search pattern', function() {
        expect(function() {XRegExp.addToken(XRegExp('(?<n>\\u2003)'), function() {return '2003';});}).not.toThrow();
        expect(XRegExp('^\u2003$').test('2003')).toBe(true);
    });
});

describe('XRegExp.cache()', function() {

    it('should return a RegExp object', function() {
        expect(XRegExp.cache('')).toEqual(jasmine.any(RegExp));
    });

    it('should return references to the same object for separately cached patterns', function() {
        expect(XRegExp.cache('')).toBe(XRegExp.cache(''));
    });

    it('should handle native and nonnative flags', function() {
        expect(XRegExp.cache('. +()\\1 1', 'gimsx')).toEqual(XRegExp('. +()\\1 1', 'gimsx'));
    });

    it('should allow flushing the regex object cache via XRegExp.cache.flush()', function() {
        var regex = XRegExp.cache('');
        XRegExp.cache.flush();

        expect(regex).not.toBe(XRegExp.cache(''));
    });

    // NOTE: The handling used when given nonstring pattern and flags is intentionally not defined.
    // The XRegExp.cache method is performance sensitive, so XRegExp doesn't include any error
    // handling or type checking for such situations

});

describe('XRegExp.escape()', function() {

    it('should escape metacharacters', function() {
        expect(XRegExp.escape('[()*+?.\\^$|')).toBe('\\[\\(\\)\\*\\+\\?\\.\\\\\\^\\$\\|');
    });

    it('should escape context-aware metacharacters', function() {
        expect(XRegExp.escape(']{}-, \n#')).toBe('\\]\\{\\}\\-\\,\\ \\\n\\#');
    });

    it('should not escape nonmetacharacters', function() {
        expect(XRegExp.escape('abc_<123>!\0\uFFFF')).toBe('abc_<123>!\0\uFFFF');
    });

    it('should escape a nonstring pattern after type converting to a string', function() {
        expect(XRegExp.escape({})).toBe('\\[object\\ Object\\]');
    });

    it('should throw an exception when given a null or undefined pattern', function() {
        expect(function() {XRegExp.escape();}).toThrowError(TypeError);
        expect(function() {XRegExp.escape(undefined);}).toThrowError(TypeError);
        expect(function() {XRegExp.escape(null);}).toThrowError(TypeError);
    });

});

describe('XRegExp.exec()', function() {

    /*
     * NOTE: These specs should mirror those for XRegExp.test, RegExp.prototype.exec, and
     * RegExp.prototype.test as closely as possible.
     */

    /*
     * The following specs:
     * - Are mirrored by XRegExp.test, RegExp.prototype.exec, RegExp.prototype.test, and nonglobal
     *   String.prototype.match.
     */

    it('should return null if no match is found', function() {
        expect(XRegExp.exec('abcxdef', /z/)).toBeNull();
    });

    it('should return a match array with backreferences if a match is found', function() {
        expect(XRegExp.exec('abcxdef', /a/)).toEqualMatch(['a']);
        expect(XRegExp.exec('abcxdef', /(a)/)).toEqualMatch(['a', 'a']);
    });

    it('should not modify the lastIndex of a nonglobal regex', function() {
        var regexX = /x/;
        var str = 'abcxdef';
        XRegExp.exec(str, regexX);

        expect(regexX.lastIndex).toBe(0);

        regexX.lastIndex = 5;
        XRegExp.exec(str, regexX);

        expect(regexX.lastIndex).toBe(5);

        var regexZ = /z/;
        regexZ.lastIndex = 5;
        XRegExp.exec(str, regexZ);

        expect(regexZ.lastIndex).toBe(5);
    });

    it('should set the lastIndex of a global regex to the end position of a successful match', function() {
        var regex = /x/g;
        XRegExp.exec('abcxdef', regex);

        expect(regex.lastIndex).toBe(4);
    });

    it('should set the lastIndex of a global regex to 0 after a failed match', function() {
        var regexZ = /z/g;
        regexZ.lastIndex = 1;
        XRegExp.exec('abcxdef', regexZ);

        expect(regexZ.lastIndex).toBe(0);

        var regexX = /x/g;
        regexX.lastIndex = 1;
        XRegExp.exec('abcxdef', regexX, 2, 'sticky');

        expect(regexX.lastIndex).toBe(0);
    });

    it('should not increment the lastIndex of a global regex after a zero-length match', function() {
        var regex = /^/g;
        XRegExp.exec('abc', regex);

        expect(regex.lastIndex).toBe(0);
    });

    it('should convert any nonstring subject to a string', function() {
        var values = [
            undefined,
            null,
            {},
            123
        ];

        values.forEach(function(value) {
            expect(XRegExp.exec(value, new RegExp(XRegExp.escape(String(value))))).toBeTruthy();
        });
    });

    it('should throw an exception when using a non RegExp object to search', function() {
        var values = [
            undefined,
            null,
            {},
            false,
            true,
            new String('/str/'),
            '\\d'
        ];

        values.forEach(function(value) {
            expect(function() {XRegExp.exec('str', value);}).toThrowError(TypeError);
        });
    });

    /*
     * The following specs:
     * - Have no corresponding specs for RegExp.prototype.exec, RegExp.prototype.test, and
     *   nonglobal String.prototype.match.
     * - Are mirrored by XRegExp.test.
     */

    it('should use the specified search start position', function() {
        expect(XRegExp.exec('abcxdef', /x/, 2)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', /x/g, 2)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', /x/, 5)).toBeNull();
        expect(XRegExp.exec('abcxdef', /x/g, 5)).toBeNull();
    });

    it('should fail to match if the start position is greater than the string length', function() {
        expect(XRegExp.exec('abc', /a/, 5)).toBeNull();
    });

    it('should ignore lastIndex when setting the search start position', function() {
        var regex = /x/;
        var regexG = /x/g;

        regex.lastIndex = regexG.lastIndex = 5;

        expect(XRegExp.exec('abcxdef', regex)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', regexG)).toBeTruthy();

        regex.lastIndex = regexG.lastIndex = 5;

        expect(XRegExp.exec('abcxdef', regex, 2)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', regexG, 2)).toBeTruthy();

        regex.lastIndex = regexG.lastIndex = 0;

        expect(XRegExp.exec('abcxdef', regex, 5)).toBeNull();
        expect(XRegExp.exec('abcxdef', regexG, 5)).toBeNull();
    });

    it('should allow matching at or after the specified position when not using sticky mode', function() {
        expect(XRegExp.exec('abcxdef', /a/, 0, false)).toBeTruthy();

        expect(XRegExp.exec('abcxdef', /x/, 0, false)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', /x/, 0)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', /x/, 0, undefined)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', /x/, 0, null)).toBeTruthy();
    });

    it('should allow matching at the specified position when using sticky mode', function() {
        expect(XRegExp.exec('abcxdef', /x/, 3, true)).toBeTruthy();
        expect(XRegExp.exec('abcxdef', /x/, 3, 'sticky')).toBeTruthy();
    });

    it('should not allow matching after the specified position when using sticky mode', function() {
        expect(XRegExp.exec('abcxdef', /x/, 0, true)).toBeNull();
        expect(XRegExp.exec('abcxdef', /x/, 0, 'sticky')).toBeNull();
    });

    (function() {
        // Cannot guard /x/y with an `if` block, because that errors during compilation in IE 9
        var regex = hasNativeY ? new RegExp('x', 'y') : /x/;

        it('should override flag /y when the sticky argument is explicitly false', function() {
            expect(XRegExp.exec('abcxdef', regex, 0, false)).toBeTruthy();
        });

        it('should follow flag /y when the sticky argument is not explicitly set', function() {
            expect(!!XRegExp.exec('abcxdef', regex)).not.toBe(hasNativeY);
        });
    }());

    /*
     * The following specs:
     * - Have no corresponding specs for XRegExp.test and RegExp.prototype.test.
     * - Are mirrored by RegExp.prototype.exec and nonglobal String.prototype.match.
     */

    it('should return backreferences to nonparticipating capturing groups as undefined', function() {
        expect(XRegExp.exec('a', /()??/)).toEqualMatch(['', undefined]);
        expect(XRegExp.exec('a', /()/)).toEqualMatch(['', '']);
    });

    it('should avoid regression on edge cases', function() {

        /*
         * From the XRegExp 1.5.1 changelog:
         * Fix: RegExp.prototype.exec no longer throws an error in IE when it is simultaneously
         * provided a nonstring argument and called on a regex with a capturing group that matches
         * an empty string.
         */
        expect(XRegExp.exec(1, /1()/)).toEqualMatch(['1', '']);
    });

    it('should include the index property on the match array, with the match start position', function() {
        expect(XRegExp.exec('12a', /a/).index).toBe(2);
    });

    it('should include the input property on the match array, with the subject string', function() {
        expect(XRegExp.exec('12a', /a/).input).toBe('12a');
    });

    // NOTE: The remaining specs are for named capture. They are listed separately (as extensions)
    // for the RegExp.prototype.exec and nonglobal String.prototype.match specs...

    it('should include named capture properties on the match array if namespacing is not installed', function() {
        var match = XRegExp.exec('a', XRegExp('(?<name>a)'));

        expect(match.name).toBe('a');
        expect(match[1]).toBe('a');
    });

    it('should not include named capture properties on the match array if namespacing is installed', function() {
        XRegExp.install('namespacing');
        var match = XRegExp.exec('a', XRegExp('(?<name>a)'));

        expect(match.name).toBeUndefined();
    });

    it('should not include named capture properties on a groups object if namespacing is not installed', function() {
        var match = XRegExp.exec('a', XRegExp('(?<name>a)'));

        expect(match.groups).toBeUndefined();
    });

    it('should include named capture properties on a groups object if namespacing is installed', function() {
        XRegExp.install('namespacing');
        var match = XRegExp.exec('a', XRegExp('(?<name>a)'));

        expect(match.groups.name).toBe('a');
        expect(match[1]).toBe('a');
    });

    it('should shaddow array prototype properties with named capture properties', function() {
        expect(XRegExp.exec('a', XRegExp('(?<concat>a)')).concat).toBe('a');
        expect(XRegExp.exec('a', XRegExp('(?<index>a)')).index).toBe('a');
    });

});

describe('XRegExp.forEach()', function() {

    it('should match all, for both global and nonglobal regexes', function() {
        [/\w+/, /\w+/g].forEach(function(regex) {
            var result = [];
            XRegExp.forEach('abc 123 def', regex, function(m) {
                result.push(m[0]);
            });

            expect(result).toEqual(['abc', '123', 'def']);
        });
    });

    it('should provide named backreferences on the match array', function() {
        var result = [];
        XRegExp.forEach('abc 123 def', XRegExp('(?<first>\\w)\\w*'), function(m) {
            result.push(m.first);
        });

        expect(result).toEqual(['a', '1', 'd']);
    });

    it('should provide match start indexes on the match array', function() {
        var result = [];
        XRegExp.forEach('abc 123 def', /\w+/, function(m) {
            result.push(m.index);
        });

        expect(result).toEqual([0, 4, 8]);
    });

    it('should provide match numbers to callback functions', function() {
        var result = [];
        XRegExp.forEach('abc 123 def', /\w+/, function(m, i) {
            result.push(i);
        });

        expect(result).toEqual([0, 1, 2]);
    });

    it('should provide source strings to callback functions', function() {
        var str = 'abc 123 def';
        var result = [];
        XRegExp.forEach(str, /\w+/, function(m, i, s) {
            result.push(s);
        });

        expect(result).toEqual([str, str, str]);
    });

    it('should provide source regexes to callback functions', function() {
        var regex = /\w+/;
        var result = [];
        XRegExp.forEach('abc 123 def', regex, function(m, i, s, r) {
            result.push(r);
        });

        expect(result).toEqual([regex, regex, regex]);
    });

    it('should include precompilation source and flags props on source regexes in callback functions', function() {
        var regex = XRegExp('(?<a>\\w+)', 'x');
        var result = [];
        XRegExp.forEach('abc', regex, function(m, i, s, r) {
            result.push(r[REGEX_DATA].source, r[REGEX_DATA].flags);
        });

        expect(result).toEqual([regex[REGEX_DATA].source, regex[REGEX_DATA].flags]);
    });

    it('should not let iteration be affected by source string manipulation in the callback function', function() {
        var str1 = 'abc 123 def';
        var str2 = 'abc 123 def';
        var result = [];
        XRegExp.forEach(str2, /\w+/, function(m, i, s) {
            result.push(s);
            s += s;
            str2 += str2;
        });

        expect(result).toEqual([str1, str1, str1]);
    });

    it('should not let iteration be affected by regex manipulation in the callback function', function() {
        var result = [];
        XRegExp.forEach('abc 123 def', /\w+/, function(m, i, s, r) {
            result.push(m[0]);
            r.compile('x'); // Mutates the regex in place
        });

        expect(result).toEqual(['abc', '123', 'def']);

        // NOTE: `compile` in Opera 11 has a bug which makes `r.compile('.').source === '/./'`
    });

    it('should start iteration at position 0, ignoring lastIndex', function() {
        var regex = /\w+/g;
        var result = [];
        regex.lastIndex = 4;
        XRegExp.forEach('abc 123 def', regex, function(m) {
            result.push(m[0]);
        });

        expect(result).toEqual(['abc', '123', 'def']);
    });

    it('should reset the lastIndex of a global regex to 0, upon completion', function() {
        var regex = /\w+/g;
        regex.lastIndex = 4;
        XRegExp.forEach('abc 123 def', regex, function() {});

        expect(regex.lastIndex).toBe(0);
    });

    it('should not modify the lastIndex of a nonglobal regex', function() {
        var regex = /\w+/;
        regex.lastIndex = 4;
        XRegExp.forEach('abc 123 def', regex, function() {});

        expect(regex.lastIndex).toBe(4);
    });

    it('should update the lastIndex of a global regex during iterations', function() {
        var regex = /\d+/g;
        var interimLastIndex1;
        var interimLastIndex2;
        XRegExp.forEach('abc 123 def', regex, function(m, i, s, r) {
            interimLastIndex1 = regex.lastIndex;
            interimLastIndex2 = r.lastIndex;
        });

        expect(interimLastIndex1).toBe(7);
        expect(interimLastIndex2).toBe(7);
    });

    it('should not modify the lastIndex of a nonglobal regex during iterations', function() {
        var regex = /\d+/;
        regex.lastIndex = 1;
        var interimLastIndex1;
        var interimLastIndex2;
        XRegExp.forEach('abc 123 def', regex, function(m, i, s, r) {
            interimLastIndex1 = regex.lastIndex;
            interimLastIndex2 = r.lastIndex;
        });

        expect(interimLastIndex1).toBe(1);
        expect(interimLastIndex2).toBe(1);
    });

    it('should not return a value', function() {
        expect(XRegExp.forEach('', /x/, function() {})).toBeUndefined();
    });

});

describe('XRegExp.globalize()', function() {

    it('should always return a new instance', function() {
        var regex = /x/;
        var regexG = /x/g;
        var regexG2 = XRegExp.globalize(regexG);

        expect(XRegExp.globalize(regex)).not.toBe(regex);
        expect(XRegExp.globalize(regexG)).not.toBe(regexG);
        expect(XRegExp.globalize(regexG2)).not.toBe(regexG2);
    });

    it('should add the global property', function() {
        expect(XRegExp.globalize(/x/).global).toBe(true);
        expect(XRegExp.globalize(/x/g).global).toBe(true);
    });

    it('should retain the original source and flags (except /g)', function() {
        var regexes = [
            XRegExp('(?i)(?<n>x)', 'm' + (hasNativeU ? 'u' : '') + (hasNativeY ? 'y' : '')),
            XRegExp('(?<n>x)', 'im' + (hasNativeU ? 'u' : '') + (hasNativeY ? 'y' : '')),
            /(x)/im
        ];

        regexes.forEach(function(regex) {
            var globalCopy = XRegExp.globalize(regex);

            expect(globalCopy.source).toBe(regex.source);
            expect(globalCopy.ignoreCase).toBe(regex.ignoreCase);
            expect(globalCopy.multiline).toBe(regex.multiline);
            expect(globalCopy.sticky).toBe(regex.sticky);
        });
    });

    it('should retain the original precompilation source and flags with added /g', function() {
        var regexes = [
            XRegExp('(?i)(?<n>x)', 'mx'),
            XRegExp('(?<n>x)', 'imx'),
            XRegExp('', 'g')
        ];

        regexes.forEach(function(regex) {
            var regexXSource = regex[REGEX_DATA].source;
            var regexXFlags = regex[REGEX_DATA].flags;
            var globalCopy = XRegExp.globalize(regex);
            var globalCopyXSource = globalCopy[REGEX_DATA].source;
            var globalCopyXFlags = globalCopy[REGEX_DATA].flags;

            expect(globalCopyXSource).toBe(regexXSource);
            expect(globalCopyXFlags.indexOf('g')).toBeGreaterThan(-1);
            if (regex.global) {
                expect(globalCopyXFlags).toBe(regexXFlags);
            } else {
                expect(globalCopyXFlags.replace('g', '')).toBe(regexXFlags);
            }
        });
    });

    it('should set null precompilation source and flags for non-XRegExp regexes', function() {
        expect(XRegExp.globalize(/./im)[REGEX_DATA]).toEqual(jasmine.any(Object));
        expect(XRegExp.globalize(/./im)[REGEX_DATA].source).toBeNull();
        expect(XRegExp.globalize(/./im)[REGEX_DATA].flags).toBeNull();

        expect(XRegExp.globalize(XRegExp(/./im))[REGEX_DATA]).toEqual(jasmine.any(Object));
        expect(XRegExp.globalize(XRegExp(/./im))[REGEX_DATA].source).toBeNull();
        expect(XRegExp.globalize(XRegExp(/./im))[REGEX_DATA].flags).toBeNull();
    });

    it('should add /g to precompilation flags in alphabetical order', function() {
        expect(XRegExp.globalize(XRegExp('', 'ix'))[REGEX_DATA].flags).toBe('gix');
        // Flag A is registered by the Unicode Base addon
        expect(XRegExp.globalize(XRegExp('', 'Aix'))[REGEX_DATA].flags).toBe('Agix');
    });

    it('should retain named capture capabilities', function() {
        var regex = XRegExp('(?<name>x)\\k<name>');

        expect(XRegExp.exec('xx', XRegExp.globalize(regex)).name).toBe('x');
    });

    it('should throw an exception if not given a RegExp object', function() {
        expect(function() {XRegExp.globalize();}).toThrowError(TypeError);
        expect(function() {XRegExp.globalize(undefined);}).toThrowError(TypeError);
        expect(function() {XRegExp.globalize(null);}).toThrowError(TypeError);
        expect(function() {XRegExp.globalize('/str/');}).toThrowError(TypeError);
    });

    it('should reset lastIndex for the global copy', function() {
        var regex = /x/g;
        regex.lastIndex = 2;

        expect(XRegExp.globalize(regex).lastIndex).toBe(0);
    });

    it('should not use XRegExp syntax when copying a regex originally built by RegExp', function() {
        expect(function() {XRegExp.globalize(/\00/);}).not.toThrow();
    });

});

describe('XRegExp.install()', function() {

    // NOTE: All optional features are uninstalled before each spec runs

    var features = ['namespacing', 'astral'];

    it('should install all features set as true on an options object', function() {
        XRegExp.install({
            namespacing: true,
            astral: true
        });

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(true);
        });
    });

    it('should not install features set as false on an options object', function() {
        XRegExp.install({
            namespacing: false,
            astral: false
        });

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(false);
        });
    });

    it('should install all features in a space-delimited options string', function() {
        XRegExp.install('namespacing astral');

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(true);
        });
    });

    it('should install all features in a comma-delimited options string', function() {
        XRegExp.install('namespacing,astral');

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(true);
        });
    });

    it('should install all features in a comma+space-delimited options string', function() {
        XRegExp.install('namespacing, astral');

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(true);
        });
    });

    // TODO: Add basic specs that verify whether actual functionality of installed features is
    // present. Deeper testing of optional features is done in other specs

});

describe('XRegExp.isInstalled()', function() {

    it('should not check multiple space-delimited features simultaneously', function() {
        XRegExp.install('namespacing astral');

        expect(XRegExp.isInstalled('namespacing astral')).toBe(false);
    });

    it('should not check multiple comma-delimited features simultaneously', function() {
        XRegExp.install('namespacing astral');

        expect(XRegExp.isInstalled('namespacing,astral')).toBe(false);
    });

    it('should not check multiple comma+space-delimited features simultaneously', function() {
        XRegExp.install('namespacing astral');

        expect(XRegExp.isInstalled('namespacing, astral')).toBe(false);
    });

    it('should not check features using an options object', function() {
        XRegExp.install('astral');

        expect(XRegExp.isInstalled({astral: true})).toBe(false);
    });

    it('should report unknown features as not installed', function() {
        expect(XRegExp.isInstalled('bogus')).toBe(false);
    });

    it('should be case sensitive for feature names', function() {
        XRegExp.install('astral');

        expect(XRegExp.isInstalled('Astral')).toBe(false);
    });

});

describe('XRegExp.isRegExp()', function() {

    it('should be true for regex literals', function() {
        expect(XRegExp.isRegExp(/x/)).toBe(true);
    });

    it('should be true for regexes built by RegExp', function() {
        expect(XRegExp.isRegExp(new RegExp(''))).toBe(true);
        expect(XRegExp.isRegExp(RegExp(''))).toBe(true);
    });

    it('should be true for regexes built by XRegExp', function() {
        expect(XRegExp.isRegExp(new XRegExp(''))).toBe(true);
        expect(XRegExp.isRegExp(XRegExp(''))).toBe(true);
    });

    it('should be true for regexes copied by XRegExp', function() {
        expect(XRegExp.isRegExp(XRegExp(/x/))).toBe(true);
        expect(XRegExp.isRegExp(XRegExp.globalize(/x/))).toBe(true);
    });

    it('should not be true for non RegExp objects', function() {
        expect(XRegExp.isRegExp()).toBe(false);

        var values = [
            undefined,
            null,
            NaN,
            true,
            {},
            '/str/',
            function() {}
        ];

        values.forEach(function(value) {
            expect(XRegExp.isRegExp(value)).toBe(false);
        });
    });

    it('should not be true for an object tampered with to appear as a RegExp', function() {
        var fakeRegex = {
            source: 'x',
            constructor: RegExp,
            __proto__: new RegExp()
        };

        expect(XRegExp.isRegExp(fakeRegex)).toBe(false);
    });

    it('should be true for a RegExp object tampered with to appear as something else', function() {
        var tamperedRegex = /x/;
        tamperedRegex.constructor = String;
        tamperedRegex.__proto__ = new String();

        expect(XRegExp.isRegExp(tamperedRegex)).toBe(true);
    });

    it('should be true for a RegExp object constructed in another frame', function() {
        // Check whether `document` exists and only run the frame test if so. This ensures the test
        // is run only in browsers and not in server-side environments without a DOM
        if (typeof document === 'object') {
            var iframe = document.createElement('iframe');
            iframe.width = iframe.height = iframe.border = 0; //iframe.style.display = 'none';
            document.body.appendChild(iframe);
            frames[frames.length - 1].document.write('<script>var regex = /x/;<\/script>');

            expect(XRegExp.isRegExp(iframe.contentWindow.regex)).toBe(true);

            // Cleanup
            iframe.parentNode.removeChild(iframe);
        } else {
            // Keep the assertion count consistent cross-environment
            expect(typeof document).toBe('undefined');
        }
    });

});

describe('XRegExp.match()', function() {

    it('should match one and return a string for scope "one" or with a nonglobal regex when scope is unspecified', function() {
        expect(XRegExp.match('a bc', /(\w)/)).toBe('a');
        expect(XRegExp.match('a bc', /(\w)/, 'one')).toBe('a');
        expect(XRegExp.match('a bc', /(\w)/g, 'one')).toBe('a');
    });

    it('should return null upon failure for scope "one" or with a nonglobal regex when scope is unspecified', function() {
        expect(XRegExp.match('a bc', /x/)).toBeNull();
        expect(XRegExp.match('a bc', /x/, 'one')).toBeNull();
        expect(XRegExp.match('a bc', /x/g, 'one')).toBeNull();
    });

    it('should match all and return an array for scope "all" or with a global regex when scope is unspecified', function() {
        // NOTE: Old IE adds input, index, and lastIndex properties to global match arrays,
        // preventing toEqual from working as desired

        expect(XRegExp.match('a bc', /(\w)/g)).toEqualMatch(['a', 'b', 'c']);
        expect(XRegExp.match('a bc', /(\w)/g, 'all')).toEqualMatch(['a', 'b', 'c']);
        expect(XRegExp.match('a bc', /(\w)/, 'all')).toEqualMatch(['a', 'b', 'c']);
    });

    it('should return an empty array upon failure for scope "all" or with a global regex when scope is unspecified', function() {
        expect(XRegExp.match('a bc', /x/g)).toEqual([]);
        expect(XRegExp.match('a bc', /x/g, 'all')).toEqual([]);
        expect(XRegExp.match('a bc', /x/, 'all')).toEqual([]);
    });

    it('should start the search at the beginning of the string, ignoring lastIndex', function() {
        var str = '1 2 a 3';
        var nonglobal = /\d/;
        var global = /\d/g;

        nonglobal.lastIndex = 2;
        expect(XRegExp.match(str, nonglobal)).toBe('1');

        global.lastIndex = 2;
        expect(XRegExp.match(str, global)).toEqualMatch(['1', '2', '3']);

        [nonglobal, global].forEach(function(regex) {
            regex.lastIndex = 2;
            expect(XRegExp.match(str, regex, 'one')).toBe('1');

            regex.lastIndex = 2;
            expect(XRegExp.match(str, regex, 'all')).toEqualMatch(['1', '2', '3']);
        });
    });

    it('should not modify the lastIndex of a nonglobal regex upon success or failure', function() {
        var str = '1 2 3';
        var matcher = /\d/;
        var nonmatcher = /x/;
        matcher.lastIndex = nonmatcher.lastIndex = 2;

        [matcher, nonmatcher].forEach(function(regex) {
            XRegExp.match(str, regex);
            expect(regex.lastIndex).toBe(2);

            XRegExp.match(str, regex, 'one');
            expect(regex.lastIndex).toBe(2);

            XRegExp.match(str, regex, 'all');
            expect(regex.lastIndex).toBe(2);
        });
    });

    it('should update the lastIndex of a global regex to the end of the match upon success, if scope is "one"', function() {
        var str = '1 2 3';
        var regex = /\d/g;

        XRegExp.match(str, regex, 'one');
        expect(regex.lastIndex).toBe(1);
    });

    it('should reset the lastIndex of a global regex to 0 upon success, if scope is "all" or unspecified', function() {
        var str = '1 2 3';
        var regex = /\d/g;

        regex.lastIndex = 2;
        XRegExp.match(str, regex);
        expect(regex.lastIndex).toBe(0);

        regex.lastIndex = 2;
        XRegExp.match(str, regex, 'all');
        expect(regex.lastIndex).toBe(0);
    });

    it('should reset the lastIndex of a global regex to 0 upon failure', function() {
        var str = '1 2 3';
        var regex = /x/g;

        regex.lastIndex = 2;
        XRegExp.match(str, regex);
        expect(regex.lastIndex).toBe(0);

        regex.lastIndex = 2;
        XRegExp.match(str, regex, 'one');
        expect(regex.lastIndex).toBe(0);

        regex.lastIndex = 2;
        XRegExp.match(str, regex, 'all');
        expect(regex.lastIndex).toBe(0);
    });

    it('should convert any nonstring subject to a string (except null and undefined)', function() {
        var values = [
            {},
            NaN,
            123
        ];

        values.forEach(function(value) {
            expect(XRegExp.match(value, new RegExp(XRegExp.escape(String(value))))).toBeTruthy();
        });
    });

    it('should throw an exception when given null or undefined as the subject', function() {
        [null, undefined].forEach(function(value) {
            expect(function() {XRegExp.match(value, /x/);}).toThrowError(TypeError);
        });

        expect(function() {XRegExp.match();}).toThrowError(TypeError);
    });

    it('should throw an exception when given a non RegExp object as the regex argument', function() {
        var values = [
            undefined,
            null,
            {},
            false,
            true,
            '/str/',
            new String('str')
        ];

        values.forEach(function(value) {
            expect(function() {XRegExp.match('str', value);}).toThrowError(TypeError);
        });
    });

});

describe('XRegExp.matchChain()', function() {

    it('should return all matches regardless of whether provided regexes are global', function() {
        expect(XRegExp.matchChain('a b c', [/\w/])).toEqual(['a', 'b', 'c']);
        expect(XRegExp.matchChain('a b c', [/\w/g])).toEqual(['a', 'b', 'c']);
        expect(XRegExp.matchChain('a b c', [/\w+/, /\w/])).toEqual(['a', 'b', 'c']);
        expect(XRegExp.matchChain('a b c', [/\w+/g, /\w/])).toEqual(['a', 'b', 'c']);
        expect(XRegExp.matchChain('a b c', [/\w+/, /\w/g])).toEqual(['a', 'b', 'c']);
        expect(XRegExp.matchChain('a b c', [/\w+/g, /\w/g])).toEqual(['a', 'b', 'c']);
    });

    it('should return an empty array if no matches are found', function() {
        expect(XRegExp.matchChain('x', [/y/])).toEqual([]);
        expect(XRegExp.matchChain('x', [/x/, /y/])).toEqual([]);
    });

    it('should throw an exception when given an empty chain', function() {
        expect(function() {XRegExp.matchChain('', []);}).toThrow();
    });

    it('should throw an exception when given a nonarray chain', function() {
        var values = [
            undefined,
            null,
            'str',
            /x/
        ];

        values.forEach(function(value) {
            expect(function() {XRegExp.matchChain('', value);}).toThrow();
        });
    });

    it('should throw an exception when accessing an undefined backreference', function() {
        expect(function() {XRegExp.matchChain('', [
            {regex: /^/, backref: 'bogus'}
        ]);}).toThrowError(ReferenceError);

        expect(function() {XRegExp.matchChain('', [
            {regex: /^/, backref: 1}
        ]);}).toThrowError(ReferenceError);
    });

    it('should not throw when referencing an undefined backreference if there are no matches upon which to access the backreference', function() {
        expect(function() {XRegExp.matchChain('', [
            {regex: /x/, backref: 1}
        ]);}).not.toThrow();
    });

    it('should handle named and numbered backrefs when namespacing is not installed', function() {
        expect(XRegExp.matchChain('test', [
            {regex: /.(..)/, backref: 1},
            {regex: XRegExp('.(?<n>.)'), backref: 'n'}
        ])).toEqual(['s']);
    });

    it('should handle named and numbered backrefs when namespacing is installed', function() {
        XRegExp.install('namespacing');
        expect(XRegExp.matchChain('test', [
            {regex: /.(..)/, backref: 1},
            {regex: XRegExp('.(?<n>.)'), backref: 'n'}
        ])).toEqual(['s']);
    });

    it('should handle a multi-link chain with plain regexes and regex/backref objects, using named and numbered backrefs', function() {
        var str = '<html><img src="http://x.com/pic.png">' +
            '<script src="http://xregexp.com/path/file.ext">' +
            '<img src="http://xregexp.com/path/to/img.jpg?x">' +
            '<img src="http://xregexp.com/img2.gif"/></html>';

        expect(XRegExp.matchChain(str, [
            {regex: /<img\b([^>]+)>/i, backref: 1},
            {regex: XRegExp('(?ix) \\s src=" (?<src> [^"]+ )'), backref: 'src'},
            {regex: XRegExp('^http://xregexp\\.com(/[^#?]+)', 'i'), backref: 1},
            /[^\/]+$/
        ])).toEqual(['img.jpg', 'img2.gif']);
    });

    it('should pass forward and return nonparticipating capturing groups as empty strings', function() {

        /* Converting nonparticipating capturing groups that are passed forward in the chain
         * (rather than returned) from undefineds to empty strings, rather than rejecting any match
         * (even if zero-length) within them, is questionable behavior. However, this probably best
         * matches user expectations.
         */
        expect(XRegExp.matchChain('str', [
            {regex: /.|()/, backref: 1},
            /./
        ])).toEqual([]);

        /* Converting nonparticipating capturing groups that are returned (rather than passed
         * forward in the chain) from undefineds to empty strings is questionable behavior.
         * However, this provides consistency with the way such backreferences are passed forward.
         */
        expect(XRegExp.matchChain('str', [
            {regex: /|()/, backref: 1}
        ])).toEqual(['', '', '', '']);
    });

    // TODO: Add complete specs, including lastIndex tests

});

describe('XRegExp.replace()', function() {

    /*
     * NOTE: These specs should mirror those for String.prototype.replace as closely as possible.
     */

    /*
     * The following specs:
     * - Have no corresponding specs for String.prototype.replace.
     */

    it('should perform replace-all for string search with scope "all"', function() {
        expect(XRegExp.replace('test', 't', 'x', 'all')).toBe('xesx');
    });

    it('should perform replace-first for string search with scope "one" or unspecified scope', function() {
        expect(XRegExp.replace('test', 't', 'x', 'one')).toBe('xest');
        expect(XRegExp.replace('test', 't', 'x')).toBe('xest');
    });

    it('should perform replace-all for regex search with scope "all" or unspecified scope with a global regex', function() {
        expect(XRegExp.replace('test', /t/, 'x', 'all')).toBe('xesx');
        expect(XRegExp.replace('test', /t/g, 'x', 'all')).toBe('xesx');
        expect(XRegExp.replace('test', /t/g, 'x')).toBe('xesx');
    });

    it('should perform replace-first for regex search with scope "one" or unspecified scope with a nonglobal regex', function() {
        expect(XRegExp.replace('test', /t/, 'x', 'one')).toBe('xest');
        expect(XRegExp.replace('test', /t/, 'x')).toBe('xest');
        expect(XRegExp.replace('test', /t/g, 'x', 'one')).toBe('xest');
    });

    it('should not pass the groups argument to callbacks when namespacing is not installed', function() {
        var regex = XRegExp('(?s)(?<groupName>.)');
        XRegExp.replace('test', regex, function(match, capture1, pos, str, groups) {
            expect(groups).toBeUndefined();
        });
    });

    it('should pass the groups argument to callbacks when namespacing is installed', function() {
        XRegExp.install('namespacing');
        var regex = XRegExp('(?s)(?<groupName>.)');
        var groupsObject = Object.create(null);
        groupsObject.groupName = 't';
        XRegExp.replace('test', regex, function(match, capture1, pos, str, groups) {
            expect(groups).toEqual(groupsObject);
        });
    });

    it('should allow accessing named backreferences in callbacks as properties of the first argument when namespacing is not installed', function() {
        expect(XRegExp.replace('abc', XRegExp('(?<name>.).'), function(match) {
            return ':' + match.name + ':';
        })).toBe(':a:c');
    });

    it('should not allow accessing named backreferences in callbacks as properties of the first argument when namespacing is installed', function() {
        XRegExp.install('namespacing');
        expect(XRegExp.replace('abc', XRegExp('(?<name>.).'), function(match) {
            return ':' + match.name + ':';
        })).toBe(':undefined:c');
    });

    describe('supports new replacement text syntax:', function() {

        describe('backreference $0', function() {

            it('should work like $&', function() {
                expect(XRegExp.replace('xaaa', /aa/, '$0b')).toBe('xaaba');
                expect(XRegExp.replace('xaaa', 'aa', '$0b')).toBe('xaaba');
            });

            it('should be allowed as $00', function() {
                expect(XRegExp.replace('xaaa', /aa/, '$00b')).toBe('xaaba');
            });

            it('should end after two zeros', function() {
                expect(XRegExp.replace('xaaa', /aa/, '$000b')).toBe('xaa0ba');
                expect(XRegExp.replace('xaaa', /aa/, '$001b')).toBe('xaa1ba');
            });

        });

        describe('named backreferences', function() {

            it('should return the named backreference', function() {
                expect(XRegExp.replace('test', XRegExp('(?<test>t)', 'g'), ':${test}:')).toBe(':t:es:t:');
                expect(XRegExp.replace('test', XRegExp('(?<test>t)', 'g'), ':$<test>:')).toBe(':t:es:t:');

                // Backreference to a nonparticipating capturing group
                expect(XRegExp.replace('test', XRegExp('t|(?<test>t)', 'g'), ':${test}:')).toBe('::es::');
                expect(XRegExp.replace('test', XRegExp('t|(?<test>t)', 'g'), ':$<test>:')).toBe('::es::');
            });

            it('should throw an exception for backreferences to unknown group names', function() {
                expect(function() {XRegExp.replace('test', XRegExp('(?<test>t)', 'g'), ':${x}:');}).toThrowError(SyntaxError);
                expect(function() {XRegExp.replace('test', XRegExp('(?<test>t)', 'g'), ':$<x>:');}).toThrowError(SyntaxError);
            });

        });

        describe('explicit numbered backreferences', function() {

            it('should return the numbered backreference', function() {
                expect(XRegExp.replace('test', /(.)./g, '${1}')).toBe('ts');
                expect(XRegExp.replace('test', /(.)./g, '$<1>')).toBe('ts');

                // Backreference to a nonparticipating capturing group
                expect(XRegExp.replace('test', /t|(e)/g, '${1}')).toBe('es');
                expect(XRegExp.replace('test', /t|(e)/g, '$<1>')).toBe('es');
            });

            it('should allow leading zeros', function() {
                expect(XRegExp.replace('test', /(.)./g, '${01}')).toBe('ts');
                expect(XRegExp.replace('test', /(.)./g, '$<01>')).toBe('ts');

                expect(XRegExp.replace('test', /(.)./g, '${001}')).toBe('ts');
                expect(XRegExp.replace('test', /(.)./g, '$<001>')).toBe('ts');
            });

            it('should return named backreferences by number', function() {
                expect(XRegExp.replace('test', XRegExp('(?<name>.).', 'g'), '${1}')).toBe('ts');
                expect(XRegExp.replace('test', XRegExp('(?<name>.).', 'g'), '$<1>')).toBe('ts');
            });

            it('should separate numbered backreferences from following literal digits', function() {
                expect(XRegExp.replace('test', new RegExp('(.).', 'g'), '${1}0')).toBe('t0s0');
                expect(XRegExp.replace('test', new RegExp('(.).', 'g'), '$<1>0')).toBe('t0s0');

                expect(XRegExp.replace('test', new RegExp('(.).' + '()'.repeat(9), 'g'), '${1}0')).toBe('t0s0');
                expect(XRegExp.replace('test', new RegExp('(.).' + '()'.repeat(9), 'g'), '$<1>0')).toBe('t0s0');
            });

            it('should throw an exception for backreferences to unknown group numbers', function() {
                expect(function() {XRegExp.replace('test', /t/, '${1}');}).toThrowError(SyntaxError);
                expect(function() {XRegExp.replace('test', /t/, '$<1>');}).toThrowError(SyntaxError);

                expect(function() {XRegExp.replace('test', /(t)/, '${2}');}).toThrowError(SyntaxError);
                expect(function() {XRegExp.replace('test', /(t)/, '$<2>');}).toThrowError(SyntaxError);
            });

            it('should allow ${0} to refer to the entire match', function() {
                expect(XRegExp.replace('test', /../g, '${0}:')).toBe('te:st:');
                expect(XRegExp.replace('test', /../g, '$<0>:')).toBe('te:st:');

                expect(XRegExp.replace('test', /../g, '${00}:')).toBe('te:st:');
                expect(XRegExp.replace('test', /../g, '$<00>:')).toBe('te:st:');

                expect(XRegExp.replace('test', /../g, '${000}:')).toBe('te:st:');
                expect(XRegExp.replace('test', /../g, '$<000>:')).toBe('te:st:');
            });

            it('should support backreferences 100 and greater, if the browser does natively', function() {
                // IE < 9 doesn't allow backreferences greater than \99 *within* a regex, but
                // XRegExp still allows backreferences to groups 100+ within replacement text
                try {
                    // Regex with 1,000 capturing groups. This fails in Firefox 4-6 (but not v3.6
                    // or v7+) with `InternalError: regular expression too complex`
                    var lottaGroups = new RegExp([
                        '^(a)\\1', '()'.repeat(8),
                        '(b)\\10', '()'.repeat(89),
                        '(c)', '()'.repeat(899),
                        '(d)$'
                    ].join(''));

                    expect(XRegExp.replace('aabbcd', lottaGroups, '${0} ${01} ${001} ${0001} ${1} ${10} ${100} ${1000}')).toBe('aabbcd a a a a b c d');
                    expect(XRegExp.replace('aabbcd', lottaGroups, '$<0> $<01> $<001> $<0001> $<1> $<10> $<100> $<1000>')).toBe('aabbcd a a a a b c d');
                    expect(XRegExp.replace('aabbcd', lottaGroups, '$<0> ${01} $<001> ${0001} $<1> ${10} $<100> ${1000}')).toBe('aabbcd a a a a b c d');
                    // For comparison...
                    expect(XRegExp.replace('aabbcd', lottaGroups, '$0 $01 $001 $0001 $1 $10 $100 $1000')).toBe('aabbcd a aabbcd1 aabbcd01 a b b0 b00');
                } catch (err) {
                    // Keep the assertion count consistent cross-browser
                    expect(true).toBe(true);
                    expect(true).toBe(true);
                    expect(true).toBe(true);
                    expect(true).toBe(true);
                }
            });

        });

        describe('strict error handling', function() {

            it('should throw an exception for backreferences to unknown group numbers', function() {
                expect(function() {XRegExp.replace('xaaa', /aa/, '$1b');}).toThrowError(SyntaxError);
                expect(function() {XRegExp.replace('xaaa', /aa/, '$01b');}).toThrowError(SyntaxError);
                expect(function() {XRegExp.replace('xaaa', /a(a)/, '$2b');}).toThrowError(SyntaxError);
                expect(function() {XRegExp.replace('xa(a)a', 'a(a)', '$1b');}).toThrowError(SyntaxError);
            });

        });

    });

    /*
     * The following specs:
     * - Are mirrored by String.prototype.replace.
     */

    // TODO: Copy/update specs from String.prototype.replace here

    // NOTE: The following two specs have already been copied and adapted from
    // String.prototype.replace, so don't copy them again

    it('should convert any nonstring subject to a string (except null and undefined)', function() {
        var values = [
            100,
            {},
            true,
            false,
            NaN,
            ['a']
        ];

        values.forEach(function(value) {
            expect(XRegExp.replace(value, /^/, 'x')).toBe('x' + value);
        });
    });

    it('should throw an exception when given null or undefined as the subject', function() {
        [null, undefined].forEach(function(value) {
            expect(function() {XRegExp.replace(value, /^/, '');}).toThrowError(TypeError);
        });

        expect(function() {XRegExp.replace();}).toThrowError(TypeError);
    });

});

describe('XRegExp.replaceEach()', function() {

    it('should handle a test with all basic search/replacement types and scopes', function() {
        expect(XRegExp.replaceEach('aabBccddeeffgghh', [
            [XRegExp('(?<name>a)'), 'z${name}'],
            [/b/gi, 'y'],
            [/c/g, 'x', 'one'],
            [/d/, 'w', 'all'],
            ['e', 'v', 'all'],
            [/f/g, function($0) {return $0.toUpperCase();}],
            ['g', function($0) {return $0.toUpperCase();}],
            ['h', function($0) {return $0.toUpperCase();}, 'all']
        ])).toBe('zaayyxcwwvvFFGgHH');
    });

    it('should search within the output of prior replacements', function() {
        expect(XRegExp.replaceEach('<&>', [
            [/&/g, '&amp;'],
            [/</g, '&lt;'],
            [/a/g, 'b'],
            [/b/g, 'c']
        ])).toBe('&lt;&cmp;>');
    });

    // TODO: Add complete specs

});

describe('XRegExp.split()', function() {

    /*
     * NOTE: These specs should mirror those for String.prototype.split as closely as possible.
     */

    it('should pass tests with a variety of subjects, separators, and limits', function() {
        // Some of these tests are not known to fail (when using the native split) in any browser,
        // but many fail in at least one version of one browser
        var tests = [
            // Regex separator...
            /* There are several cross-browser inconsistencies when using a regular expression as
             * the delimiter with the native String.prototype.split method. Divergences from the
             * ES3/5 standard are listed below.
             * - IE < 9 excludes almost all empty values from the resulting array (e.g., when two
             *   delimiters appear next to each other in the data, or when a delimiter appears at
             *   the start or end of the data). This behavior differs when using a string as the
             *   delimiter.
             * - IE < 9 and older versions of Safari do not splice the values of capturing groups
             *   into the returned array.
             * - Older versions of Firefox splice empty strings instead of undefined into the
             *   returned array as the result of nonparticipating capturing groups.
             * - Many versions of IE, Firefox, Chrome, Safari, and Opera have various edge-case
             *   bugs that prevent them from following the split specification in some cases.
             * XRegExp.split provides a uniform cross-browser implementation that should precisely
             * follow the ES3/5 split specification.
             */
            {str: 'abc',       separator: /(?:)/,           expected: ['a', 'b', 'c']},
            {str: 'abc',       separator: /()/,             expected: ['a', '', 'b', '', 'c']},
            // IE < 9 considers this a participating group, but other browsers treat it as
            // nonparticipating (which seems wrong since the * is greedy).
            //{str: 'abc',       separator: /()*/,            expected: ['a', undefined, 'b', undefined, 'c']},
            {str: 'abc',       separator: /()*?/,           expected: ['a', undefined, 'b', undefined, 'c']},
            {str: 'abc',       separator: /^/,              expected: ['abc']},
            {str: 'abc',       separator: /(^)/,            expected: ['abc']},
            {str: 'abc',       separator: /a/,              expected: ['', 'bc']},
            {str: 'abc',       separator: /a?/,             expected: ['', 'b', 'c']},
            {str: 'abc',       separator: /a??/,            expected: ['a', 'b', 'c']},
            {str: 'abc',       separator: /(a)/,            expected: ['', 'a', 'bc']},
            {str: 'abc',       separator: /b/,              expected: ['a', 'c']},
            {str: 'abc',       separator: /(b)/,            expected: ['a', 'b', 'c']},
            {str: '',          separator: /./,              expected: ['']},
            {str: '',          separator: /.?/,             expected: []},
            {str: '',          separator: /.??/,            expected: []},
            {str: 'ab',        separator: /a*/,             expected: ['', 'b']},
            {str: 'ab',        separator: /a*?/,            expected: ['a', 'b']},
            {str: 'ab',        separator: /(?:ab)/,         expected: ['', '']},
            {str: 'ab',        separator: /(?:ab)*/,        expected: ['', '']},
            {str: 'ab',        separator: /(?:ab)*?/,       expected: ['a', 'b']},
            {str: 'a',         separator: /-/,              expected: ['a']},
            {str: 'a',         separator: /-?/,             expected: ['a']},
            {str: 'a',         separator: /-??/,            expected: ['a']},
            {str: 'a',         separator: /a/,              expected: ['', '']},
            {str: 'a',         separator: /a?/,             expected: ['', '']},
            {str: 'a',         separator: /a??/,            expected: ['a']},
            {str: 'ab',        separator: /-/,              expected: ['ab']},
            {str: 'ab',        separator: /-?/,             expected: ['a', 'b']},
            {str: 'ab',        separator: /-??/,            expected: ['a', 'b']},
            {str: 'a-b',       separator: /-/,              expected: ['a', 'b']},
            {str: 'a-b',       separator: /-?/,             expected: ['a', 'b']},
            {str: 'a-b',       separator: /-??/,            expected: ['a', '-', 'b']},
            {str: 'a--b',      separator: /-/,              expected: ['a', '', 'b']},
            {str: 'a--b',      separator: /-?/,             expected: ['a', '', 'b']},
            {str: 'a--b',      separator: /-??/,            expected: ['a', '-', '-', 'b']},
            {str: '',          separator: /()()/,           expected: []},
            {str: '.',         separator: /()()/,           expected: ['.']},
            {str: '.',         separator: /(.?)(.?)/,       expected: ['', '.', '', '']},
            {str: '.',         separator: /(.??)(.??)/,     expected: ['.']},
            {str: '.',         separator: /(.)?(.)?/,       expected: ['', '.', undefined, '']},
            {str: 'test',      separator: /(.?)/,           expected: ['', 't', '', 'e', '', 's', '', 't', '']},
            {str: 'tesst',     separator: /(s)*/,           expected: ['t', undefined, 'e', 's', 't']},
            {str: 'tesst',     separator: /(s)*?/,          expected: ['t', undefined, 'e', undefined, 's', undefined, 's', undefined, 't']},
            {str: 'tesst',     separator: /(s*)/,           expected: ['t', '', 'e', 'ss', 't']},
            {str: 'tesst',     separator: /(s*?)/,          expected: ['t', '', 'e', '', 's', '', 's', '', 't']},
            {str: 'tesst',     separator: /(?:s)*/,         expected: ['t', 'e', 't']},
            {str: 'tesst',     separator: /(?=s+)/,         expected: ['te', 's', 'st']},
            {str: 'test',      separator: /t/,              expected: ['', 'es', '']},
            {str: 'test',      separator: /es/,             expected: ['t', 't']},
            {str: 'test',      separator: /(t)/,            expected: ['', 't', 'es', 't', '']},
            {str: 'test',      separator: /(es)/,           expected: ['t', 'es', 't']},
            {str: 'test',      separator: /(t)(e)(s)(t)/,   expected: ['', 't', 'e', 's', 't', '']},
            {str: '.',         separator: /(((.((.??)))))/, expected: ['', '.', '.', '.', '', '', '']},
            {str: '.',         separator: /(((((.??)))))/,  expected: ['.']},

            // String separator...
            {str: '',          separator: '',               expected: []},
            {str: '',          separator: 'x',              expected: ['']},
            {str: 'abc',       separator: '',               expected: ['a', 'b', 'c']},
            {str: 'abc',       separator: 'a',              expected: ['', 'bc']},
            {str: 'abc',       separator: 'b',              expected: ['a', 'c']},
            {str: 'test',      separator: 't',              expected: ['', 'es', '']},
            {str: 'test',      separator: 'es',             expected: ['t', 't']},

            // Other separator (type-converted to string)...
            {str: '111',       separator: 1,                expected: ['', '', '', '']},
            {str: 'null',      separator: null,             expected: ['', '']}
        ];

        tests.forEach(function(test) {
            var result = XRegExp.split(test.str, test.separator);

            expect(result).toEqual(test.expected);

            // Test with limit from -1 to the length of each result plus 1. I.e., for result
            // ['', ''], it will test limits -1, 0, 1, 2, and 3
            for (var i = -1; i <= (result.length + 1); ++i) {
                expect(XRegExp.split(test.str, test.separator, i)).toEqual(
                    i >= 0 ? result.slice(0, i) : result
                );
            }
        });

        /* Special case: undefined separator...
         * Browsers handle this inconsistently, and the ES3/5 spec is a bit ambiguous about correct
         * behavior. See <https://bugs.ecmascript.org/show_bug.cgi?id=594>. Since this is not a
         * fault of XRegExp, don't test this unless XRegExp fixes this cross-browser in future
         * versions.
         */
        //expect(XRegExp.split('undefined')).toEqual(['undefined']);
        //expect(XRegExp.split('undefined', undefined)).toEqual(['undefined']);
        //expect(XRegExp.split('undefined', undefined, 0)).toEqual([]);
    });

    it('should pass tests with unusual limit values', function() {
        var tests = [
            // Very large negative number test by Brian O
            {str: 'a b c d', separator: / /,    limit: -(Math.pow(2, 32) - 1), expected: ['a']},
            {str: 'a b c d', separator: / /,    limit: Math.pow(2, 32) + 1,    expected: ['a']},
            {str: 'a b c d', separator: / /,    limit: Infinity,               expected: []},
            {str: 'test',    separator: /(?:)/, limit: undefined,              expected: ['t', 'e', 's', 't']},
            {str: 'test',    separator: /(?:)/, limit: null,                   expected: []},
            {str: 'test',    separator: /(?:)/, limit: NaN,                    expected: []},
            {str: 'test',    separator: /(?:)/, limit: true,                   expected: ['t']},
            {str: 'test',    separator: /(?:)/, limit: '2',                    expected: ['t', 'e']},
            {str: 'test',    separator: /(?:)/, limit: 'two',                  expected: []}
        ];

        tests.forEach(function(test) {
            expect(XRegExp.split(test.str, test.separator, test.limit)).toEqual(test.expected);
        });
    });

    it('should ignore lastIndex and start the search at the beginning of the string', function() {
        [/t/, /t/g].forEach(function(regex) {
            regex.lastIndex = 2;

            expect(XRegExp.split('test', regex)).toEqual(['', 'es', '']);
        });
    });

    it('should not modify lastIndex for regex separators', function() {
        [/t/, /t/g].forEach(function(regex) {
            regex.lastIndex = 2;
            XRegExp.split('test', regex);

            expect(regex.lastIndex).toBe(2);
        });
    });

    it('should convert any nonstring subject to a string (except null and undefined)', function() {
        var values = [
            {},
            NaN,
            123
        ];

        values.forEach(function(value) {
            expect(XRegExp.split(value, new RegExp(XRegExp.escape(String(value))))).toEqual(['', '']);
        });
    });

    it('should throw an exception when given null or undefined as the subject', function() {
        [null, undefined].forEach(function(value) {
            expect(function() {XRegExp.split(value, /x/);}).toThrowError(TypeError);
        });

        expect(function() {XRegExp.split();}).toThrowError(TypeError);
    });

});

describe('XRegExp.test()', function() {

    /*
     * NOTE: These specs should mirror those for XRegExp.exec, RegExp.prototype.test,
     * RegExp.prototype.exec, and nonglobal String.prototype.match as closely as possible.
     */

    /*
     * The following specs:
     * - Are mirrored by XRegExp.exec, RegExp.prototype.test, RegExp.prototype.exec, and nonglobal
     *   String.prototype.match.
     */

    it('should return false if no match is found', function() {
        expect(XRegExp.test('abcxdef', /z/)).toBe(false);
    });

    it('should return true if a match is found', function() {
        expect(XRegExp.test('abcxdef', /a/)).toBe(true);
    });

    it('should not modify the lastIndex of a nonglobal regex', function() {
        var regexX = /x/;
        var str = 'abcxdef';
        XRegExp.test(str, regexX);

        expect(regexX.lastIndex).toBe(0);

        regexX.lastIndex = 5;
        XRegExp.test(str, regexX);

        expect(regexX.lastIndex).toBe(5);

        var regexZ = /z/;
        regexZ.lastIndex = 5;
        XRegExp.test(str, regexZ);

        expect(regexZ.lastIndex).toBe(5);
    });

    it('should set the lastIndex of a global regex to the end position of a successful match', function() {
        var regex = /x/g;
        XRegExp.test('abcxdef', regex);

        expect(regex.lastIndex).toBe(4);
    });

    it('should set the lastIndex of a global regex to 0 after a failed match', function() {
        var regexZ = /z/g;
        regexZ.lastIndex = 1;
        XRegExp.test('abcxdef', regexZ);

        expect(regexZ.lastIndex).toBe(0);

        var regexX = /x/g;
        regexX.lastIndex = 1;
        XRegExp.test('abcxdef', regexX, 2, 'sticky');

        expect(regexX.lastIndex).toBe(0);
    });

    it('should not increment the lastIndex of a global regex after a zero-length match', function() {
        var regex = /^/g;
        XRegExp.test('abc', regex);

        expect(regex.lastIndex).toBe(0);
    });

    it('should convert any nonstring subject to a string', function() {
        var values = [
            undefined,
            null,
            {},
            123
        ];

        values.forEach(function(value) {
            expect(XRegExp.test(value, new RegExp(XRegExp.escape(String(value))))).toBe(true);
        });
    });

    it('should throw an exception when using a non RegExp object to search', function() {
        var values = [
            undefined,
            null,
            {},
            false,
            true,
            new String('/str/'),
            '\\d'
        ];

        values.forEach(function(value) {
            expect(function() {XRegExp.test('str', value);}).toThrowError(TypeError);
        });
    });

    /*
     * The following specs:
     * - Have no corresponding specs for RegExp.prototype.test, RegExp.prototype.exec, and
     *   nonglobal String.prototype.match.
     * - Are mirrored by XRegExp.exec.
     */

    it('should use the specified search start position', function() {
        expect(XRegExp.test('abcxdef', /x/, 2)).toBe(true);
        expect(XRegExp.test('abcxdef', /x/g, 2)).toBe(true);
        expect(XRegExp.test('abcxdef', /x/, 5)).toBe(false);
        expect(XRegExp.test('abcxdef', /x/g, 5)).toBe(false);
    });

    it('should fail to match if the start position is greater than the string length', function() {
        expect(XRegExp.test('abc', /a/, 5)).toBe(false);
    });

    it('should ignore lastIndex when setting the search start position', function() {
        var regex = /x/;
        var regexG = /x/g;

        regex.lastIndex = regexG.lastIndex = 5;

        expect(XRegExp.test('abcxdef', regex)).toBe(true);
        expect(XRegExp.test('abcxdef', regexG)).toBe(true);

        regex.lastIndex = regexG.lastIndex = 5;

        expect(XRegExp.test('abcxdef', regex, 2)).toBe(true);
        expect(XRegExp.test('abcxdef', regexG, 2)).toBe(true);

        regex.lastIndex = regexG.lastIndex = 0;

        expect(XRegExp.test('abcxdef', regex, 5)).toBe(false);
        expect(XRegExp.test('abcxdef', regexG, 5)).toBe(false);
    });

    it('should allow matching at or after the specified position when not using sticky mode', function() {
        expect(XRegExp.test('abcxdef', /a/, 0, false)).toBe(true);

        expect(XRegExp.test('abcxdef', /x/, 0, false)).toBe(true);
        expect(XRegExp.test('abcxdef', /x/, 0)).toBe(true);
        expect(XRegExp.test('abcxdef', /x/, 0, undefined)).toBe(true);
        expect(XRegExp.test('abcxdef', /x/, 0, null)).toBe(true);
    });

    it('should allow matching at the specified position when using sticky mode', function() {
        expect(XRegExp.test('abcxdef', /x/, 3, true)).toBe(true);
        expect(XRegExp.test('abcxdef', /x/, 3, 'sticky')).toBe(true);
    });

    it('should not allow matching after the specified position when using sticky mode', function() {
        expect(XRegExp.test('abcxdef', /x/, 0, true)).toBe(false);
        expect(XRegExp.test('abcxdef', /x/, 0, 'sticky')).toBe(false);
    });

    (function() {
        // Cannot guard /x/y with an `if` block, because that errors during compilation in IE 9
        var regex = hasNativeY ? new RegExp('x', 'y') : /x/;

        it('should override flag /y when the sticky argument is explicitly false', function() {
            expect(XRegExp.test('abcxdef', regex, 0, false)).toBe(true);
        });

        it('should follow flag /y when the sticky argument is not explicitly set', function() {
            expect(XRegExp.test('abcxdef', regex)).not.toBe(hasNativeY);
        });
    }());

});

describe('XRegExp.uninstall()', function() {

    beforeEach(function() {
        XRegExp.install('namespacing astral');
    });

    var features = ['namespacing', 'astral'];

    it('should uninstall all features set as true on an options object', function() {
        XRegExp.uninstall({
            namespacing: true,
            astral: true
        });

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(false);
        });
    });

    it('should not uninstall features set as false on an options object', function() {
        XRegExp.uninstall({
            namespacing: false,
            astral: false
        });

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(true);
        });
    });

    it('should uninstall all features in a space-delimited options string', function() {
        XRegExp.uninstall('namespacing astral');

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(false);
        });
    });

    it('should uninstall all features in a comma-delimited options string', function() {
        XRegExp.uninstall('namespacing,astral');

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(false);
        });
    });

    it('should uninstall all features in a comma+space-delimited options string', function() {
        XRegExp.uninstall('namespacing, astral');

        features.forEach(function(feature) {
            expect(XRegExp.isInstalled(feature)).toBe(false);
        });
    });

    it('should undo repeated installations with a single uninstall', function() {
        XRegExp.install('astral');
        XRegExp.install('astral');
        XRegExp.uninstall('astral');

        expect(XRegExp.isInstalled('astral')).toBe(false);
    });

    // TODO: Add basic specs that verify whether actual functionality of uninstalled features is
    // absent. Deeper testing of optional features is done in other specs

});

describe('XRegExp.union()', function() {

    it('should escape regex metacharacters in strings', function() {
        expect(XRegExp.union(['a+b*c']).test('a+b*c')).toBe(true);

        expect('a+b*c (?!\\.)'.match(XRegExp.union(['a+b*c', '(?!\\.)'], 'g'))).
            toEqualMatch(['a+b*c', '(?!\\.)']);
    });

    it('should rewrite backreferences in regexes', function() {
        expect('fishfish dogsdogs catscats'.match(XRegExp.union([
            /(dogs)\1/,
            XRegExp('(?<pet>fish)\\k<pet>'),
            /(cats)\1/
        ], 'g'))).toEqualMatch([
            'fishfish',
            'dogsdogs',
            'catscats'
        ]);
    });

    it('should allow combining both strings and regexes', function() {
        expect('a+b*c dogsdogs catscats'.match(XRegExp.union([
            'a+b*c',
            /(dogs)\1/,
            /(cats)\1/
        ], 'g'))).toEqualMatch([
            'a+b*c',
            'dogsdogs',
            'catscats'
        ]);
    });

    it('should apply flags provided via the flags argument', function() {
        var regex = XRegExp.union([/ . /], 'gimsx');

        ['global', 'ignoreCase', 'multiline'].forEach(function(flag) {
            expect(regex[flag]).toBe(true);
        });

        // Confirm that flags s and x were applied
        expect(regex.test('\n')).toBe(true);
    });

    it('should ignore native flags provided for individual regexes', function() {
        expect(XRegExp.union([/x/g]).global).toBe(false);
    });

    it('should set default conjunction to "or"', function() {
        var regex = XRegExp.union([/man/, /bear/, /pig/], 'i');
        expect(regex.test('man')).toBe(true);
        expect(regex.test('bear')).toBe(true);
        expect(regex.test('pig')).toBe(true);
    });

    it('should allow setting conjunction to "or"', function() {
        var regex = XRegExp.union([/man/, /bear/, /pig/], 'i', {conjunction: 'or'});
        expect(regex.test('man')).toBe(true);
        expect(regex.test('bear')).toBe(true);
        expect(regex.test('pig')).toBe(true);
    });

    it('should allow setting conjunction to "none"', function() {
        var regex = XRegExp.union([/man/, /bear/, /pig/], 'i', {conjunction: 'none'});
        expect(regex.test('man')).toBe(false);
        expect(regex.test('bear')).toBe(false);
        expect(regex.test('pig')).toBe(false);
        expect(regex.test('manbearpig')).toBe(true);
    });

    it('should rewrite backreferences when using conjunction "none"', function() {
        var regex = XRegExp.union([/(dogs)\1/, /(cats)\1/], '', {conjunction: 'none'});
        expect(regex.exec('dogsdogscatscats')).toEqualMatch([
            'dogsdogscatscats',
            'dogs',
            'cats'
        ]);
    });

    it('should throw an exception when the same group name appears in separate regexes', function() {
        expect(function() {XRegExp.union([
            XRegExp('(?<pet>dogs)\\k<pet>'),
            XRegExp('(?<pet>cats)\\k<pet>')
        ]);}).toThrowError(SyntaxError);
    });

    it('should throw an exception when given a nonarray as the patterns argument', function() {
        var values = [
            undefined,
            null,
            'str',
            {}
        ];

        values.forEach(function(value) {
            expect(function() {XRegExp.union(value);}).toThrowError(TypeError);
        });

        // Implicit undefined
        expect(function() {XRegExp.union();}).toThrowError(TypeError);
    });

    it('should throw an exception when given an empty patterns array', function() {
        expect(function() {XRegExp.union([]);}).toThrowError(TypeError);

        // NOTE: Ruby's union method converts an empty array to /(?!)/. XRegExp intentionally
        // handles this differently
    });

    it('should convert non RegExp objects in the patterns array to strings, which are then escaped', function() {
        expect(XRegExp.union([{}]).test('[object Object]')).toBe(true);
    });

    it('should throw an exception if the array of patterns contains null or undefined', function() {
        expect(function() {XRegExp.union([null]);}).toThrowError(TypeError);
        expect(function() {XRegExp.union([undefined]);}).toThrowError(TypeError);
    });

    it('should apply flag n (explicit capture) to all regexes, when specified', function() {
        expect(XRegExp.union([
            XRegExp('(?<a>a)\\k<a>')
        ], 'n').test('aa')).toBe(true);

        expect(function() {XRegExp.union([
            /(b)\1/
        ], 'n');}).toThrowError(SyntaxError);

        expect(function() {XRegExp.union([
            XRegExp('(?<a>a)\\k<a>'),
            /(b)\1/,
            XRegExp('(?<x>)')
        ], 'n');}).toThrowError(SyntaxError);
    });

});
