'use strict';

// Null verification for the database values;
function isDBNull(val) {
    return val === undefined || val === null;
}

// Wraps the text in single quotes;
function wrapText(text) {
    return "'" + text + "'";
}

// Translates a javascript value into its text presentation,
// according to the type, compatible with PostgreSQL format.
// Returns null, if the value cannot be translated, such as:
// function, array or object that's not Date.
function wrapValue(val) {
    if (isDBNull(val)) {
        return 'null';
    }
    switch (typeof(val)) {
        case 'string':
            return $wrap.text(val);
        case 'boolean':
            return $wrap.bool(val);
        case 'function':
            return null; // error: functions are not supported;
        default:
            if (val instanceof Date) {
                return $wrap.date(val);
            } else {
                // it is either unknown object or a number;
                return typeof(val) === 'object' ? null : val.toString();
            }
    }
}

// Formats array of javascript-type parameters into a csv list,
// so it can be passed into a function. It can understand both
// a simple value and an array of simple values.
function formatCSV(values) {
    var s = "";
    if (Array.isArray(values)) {
        for (var i = 0; i < values.length; i++) {
            if (i > 0) {
                s += ',';
            }
            // expect a simple value;
            var v = wrapValue(values[i]);
            if (v === null) {
                // error: not a simple value;
                throw new Error("Cannot convert parameter with index " + i);
            } else {
                s += v;
            }
        }
    } else {
        if (values !== undefined) {
            // expect a simple value;
            s = wrapValue(values);
            if (s === null) {
                // error: not a simple value;
                throw new Error("Cannot convert a value of type '" + typeof(values) + "'");
            }
        }
    }
    return s;
}

/////////////////////////////////////////////////////////////
// Returns array of unique variable names in a text string;
//
// Variables are defined using syntax "${varName}", following
// the javascript variable naming convention:
// - a valid variable starts with a letter, underscore or '$' symbol,
//   followed by any combination of letters, digits, underscores and '$'.
// - leading and trailing spaces around variable names are ignored.
function enumVars(txt) {
    var v, names = [];
    var reg = /\$\{\s*[a-z\$_][a-z0-9\$_]*\s*}/gi;
    while (v = reg.exec(txt)) {
        var svn = v[0].replace(/^\$\{\s*|\s*}$/g, ''); // stripped variable name;
        if (names.indexOf(svn) === -1) {
            names.push(svn);
        }
    }
    return names;
}

///////////////////////////////////////////////////////
// Global functions and properties - all start with $
///////////////////////////////////////////////////////

// Formats a proper function call query;
// Example: 'select * from funcName(p1,p2,p3)'
function $funcQuery(funcName, values) {
    return 'select * from ' + funcName + '(' + formatCSV(values) + ')';
}

// Value wrapper to be exposed through 'pgp.as' namespace;
var $wrap = {
    text: function (txt) {
        if (isDBNull(txt)) {
            return 'null';
        }
        if (typeof(txt) !== 'string') {
            txt = txt.toString();
        }
        // replacing each single-quote symbol with two, and then
        // wrapping in quotes, for compatibility with PostgreSQL;
        return wrapText(txt.replace(/'/g, "''"));
    },
    bool: function (val) {
        if (isDBNull(val)) {
            return 'null';
        }
        return val ? 'TRUE' : 'FALSE';
    },
    date: function (d) {
        if (isDBNull(d)) {
            return 'null';
        }
        if (d instanceof Date) {
            // UTC date string is what PostgreSQL understands automatically;
            return wrapText(d.toUTCString());
        } else {
            throw new Error(wrapText(d) + " doesn't represent a valid Date object.");
        }
    },
    // Creates a comma-separated list of values formatted for use with PostgreSQL;
    // 'values' can be either an array of simple values, or just one simple value.
    csv: function (values) {
        return formatCSV(values);
    },
    // Formats query - parameter using the values passed;
    // The query can contain variables $1, $2, etc, and 'values' is either one simple value or
    // an array of simple values, such as: text, boolean, date, number or null.
    // Return result depends on parameter 'se' - see $formatQuery documentation.
    format: function (query, values) {
        return $formatQuery(query, values);
    }
};

// 'pg-promise' own query formatting solution;
//
// It implements two types of formatting, depending on the 'values' passed:
//
// 1. format "$1, $2, etc", when 'values' is simple (text, boolean, number, date or null)
//    or an array of such simple values;
// 2. format ${propName}, when 'values' is an object (not null and not Date)
//
// When fails, the function throws an error.
function $formatQuery(query, values) {
    if (typeof(query) !== 'string') {
        throw new Error("Parameter 'query' must be a text string.");
    }
    if (Array.isArray(values)) {
        // "$1, $2,.." formatting to be applied;
        for (var i = 0; i < values.length; i++) {
            // a valid variable name cannot be followed by a digit:
            var pattern = '\\$' + (i + 1) + '(?!\\d)';
            if (query.search(pattern) === -1) {
                throw new Error("More values passed in array than variables in the query.");
            }
            var value = wrapValue(values[i]); // expect a simple value;
            if (value === null) {
                // error: not a simple value;
                throw new Error("Cannot convert type '" + typeof(values[i]) + "' of parameter with index " + i);
            }
            query = query.replace(new RegExp(pattern, 'g'), value);
        }
    } else {
        if (values && typeof(values) === 'object' && !(values instanceof Date)) {
            // "${propName}" formatting to be applied;
            var names = enumVars(query); // extract all variable names;
            for (var i = 0; i < names.length; i++) {
                var name = names[i]; // variable/property name;
                if (!(name in values)) {
                    // property must exist as the object's own or inherited;
                    throw new Error("Property '" + name + "' doesn't exist.");
                }
                var prop = values[name]; // property value;
                var value = wrapValue(prop); // expect a simple value;
                if (value === null) {
                    // error: not a simple value;
                    throw new Error("Cannot convert type '" + typeof(prop) + "' of property '" + name + "'");
                }
                // Replacing all occurrences of the 'name' variable with the 'value',
                // while changing any '$' in 'name' to '\$', for reg-ex compliance:
                query = query.replace(new RegExp("\\$\\{\\s*" + name.replace(/\$/g, '\\$') + "\\s*}", 'g'), value);
            }
        } else {
            if (values !== undefined) {
                // "$1" formatting to be applied;
                if (query.search(/\$1(?!\d)/) === -1) {
                    throw new Error("No variable found in the query to replace with the passed value.");
                } else {
                    var value = wrapValue(values); // expect a simple value;
                    if (value === null) {
                        // error: not a simple value;
                        throw new Error("Cannot convert type '" + typeof(values) + "' of the parameter.");
                    }
                    query = query.replace(/\$1(?!\d)/g, value);
                }
            }
        }
    }
    return query;
}

module.exports = {
    formatQuery: $formatQuery,
    funcQuery: $funcQuery,
    wrap: $wrap
};