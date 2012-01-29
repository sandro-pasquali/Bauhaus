"use strict";

(function() {

//	Array methods to be "normalized" -- See below for how methods using these names are
//	added to Object should they not exist for Arrays in the current interpreter.
//
var METHODS = [
    "each", 
    "forEach", 
    "map", 
    "filter",
    "every", 
    "some", 
    "reduce", 
    "reduceRight", 
    "indexOf", 
    "lastIndexOf"
];

var KIT = {};
var M;

//  A library of common methods
//  
var $$ = {
    isArray     : function(a) {
        return Object.prototype.toString.call(a) === '[object Array]';
    },
    argsToArray : function(a, offset, end) {
        return Array.prototype.slice.call(a, offset || 0, end);
    },
    objToArray  : function(o, vals) {
        var p;
        var r = [];
    
        for(p in o) {
            if(vals) {
                r[o[p]] = p;
            } else {
                r.push(p);
            }
        }
    
        return r;
    },
    arrayToObj  : function(a) {
        var len = a.length;
        var ob 	= {};
    
        while(len--) {
            ob[a[len]] = len;
        }
    
        return ob;
    },
    copy        : function(s) {
        return this.isArray(s) ? s.slice(0) : s;
    }
};

//	##ITERATOR
//
//	Returns accumulator as modified by passed selective function.
//	Note that no checking of target is done, expecting that you send either an
//	array or an object. Error, otherwise.
//
//	@param		{Function}		fn		The selective function.
//	@param		{Object}		[targ]	The object to work against. If not sent
//										the default becomes Subject.
//	@param		{Mixed}			[acc]	An accumulator, which is set to result of selective
//										function on each interation through target.
//	@see	#arrayMethod
//
var	ITERATOR	= function(fn, targ, acc) {
	var c	= targ.length;
	var n	= 0;

	if($$.isArray(targ)) {
		while(n < c) {
			if(n in targ) {
				acc = fn.call(this, targ[n], n, targ, acc);
			}
			n++;
		}
	} else {
		for(n in targ) {
			if(targ.hasOwnProperty(n)) {
				acc = fn.call(this, targ[n], n, targ, acc);
			}
		}
	}

	return acc;
};

//	##arrayMethod
//
//	Terrace has several array manipulation methods, such as #each and #map. As they all share
//	some common functionality, and may be superseded by native array methods, this method is
//	provided to "normalize" the various Terrace array method calls. It is called by the
//	appropriate method, defined in the init section at the bottom of this file.
//
//	@param		{String}		meth	The array method.
//	@param		{Function}		fn		The selective function.
//	@param		{Object}		[targ]	The object to work against. If not sent
//										the default becomes Subject.
//	@param		{Mixed}			[arg2]	Usually the scope in which to execute the method, but
//										in the case of #reduce this is an [initialValue].
//
//	@see		#reduce
//	@see		#reduceRight
//	@see		#filter
//	@see		#every
//	@see		#some
//	@see		#map
//	@see		#each
//
var ARRAY_METHOD = function(meth, fn, targ, arg2) {

    var scope	= arg2 || this;
    var nat		= targ[meth];

    switch(meth) {
        case "each":
        case "forEach":
            return 	nat ? targ.forEach(fn, scope)
                    : ITERATOR.call(this, function(elem, idx, targ) {
                        fn.call(scope, elem, idx, targ);
                    }, targ);
        break;

        case "map":
            return	nat ? targ.map(fn, scope)
                    : ITERATOR.call(this, function(elem, idx, targ, acc) {
                        acc[idx] = fn.call(scope, elem, idx, targ);
                        return acc;
                    }, targ, []);
        break;

        case "filter":
            return	nat ? targ.filter(fn, scope)
                    : ITERATOR.call(this, function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(elem);
                        return acc;
                    }, targ, []);
        break;

        case "every":
            return 	nat ? targ.every(fn, scope)
                    : ITERATOR.call(this, function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(1);
                        return acc;
                    }, targ, []).length === targ.length;
        break;

        case "some":
            return	nat ? targ.some(fn, scope)
                    : ITERATOR.call(this, function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(1);
                        return acc;
                    }, targ, []).length > 0;
        break;

        case "indexOf":
            return 1
        break;

        case "lastIndexOf":
            return 1;
        break;

        //	Note how the #reduce methods change the argument order passed to the
        //	selective function.
        //
        //	All others	: (element, index, target)
        //	#reduce		: (accumulator, element, index, target)
        //	(or)		: (initial or previous value, current value, index, target)
        //
        //	@see	https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Reduce
        //
        case "reduce":
            var offset 	= !arg2 ? 1 : 0;
            return	nat ? targ.reduce(fn, arg2 === void 0 ? false : arg2)
                    : ITERATOR.call(this, function(elem, idx, targ, acc) {
                        return targ[idx + offset]
                                ? fn.call(scope, acc, targ[idx + offset], idx + offset, targ)
                                : acc;
                    }, targ, arg2 || targ[0]);
        break;

        case "reduceRight":
            targ 	= $$.copy(targ).reverse();
            return 	ARRAY_METHOD("reduce", fn, targ, arg2);
        break;
    }
};

//	We want to support a number of functional methods.  These operate on Subject -- to access
//	the result you should read Object.$.  NOTE that it is normal to use these methods against
//	arrays, but if using the NON-native methods, you can use objects.
//
while(M = METHODS.pop()) {
    KIT[M] = function(fn, targ, scope) {
        return ARRAY_METHOD(M, fn, targ, scope);
    };
}

if(typeof exports == 'object' && exports) {
    exports.bauhaus = KIT;
} else {
    window.bauhaus = KIT;
}

})();