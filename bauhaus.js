"use strict";

(function() {

//	#indexOf and #lastIndexOf are attached to #LIST_M collection.
//
var ARRAY_M = [
    "all",          //  alias #every
    "any",          //  alias #some
    "collect",      //  alias #map
    "each",         //  alias #forEach
    "every",   
    "filter",     
    "foldl",        //  alias #reduce
    "foldr",        //  alias #reduceRight
    "forEach",
    "indexOf",
    "lastIndexOf",
    "map",
    "reduce",       
    "reduceRight",
    "select",       //  alias #filter
    "some"
];

var LIST_M = [
    "bump",
    "commit",
    "compact",
    "compose",
    "contains",
    "diff",
    "size",
    "find",
    "findLast",
    "first",
    "firstx",
    "flatten",
    "get",
    "insert",
    "intersect",
    "invoke",
    "iterator",
    "last",
    "lastx",
    "max",
    "min",
    "page",
    "paginate",
    "pluck",
    "range",
    "reject",
    "remove",
    "reset",
    "sequence",
    "set",
    "shuffle",
    "totalPages",
    "union",
    "unique",
    "unset"
];

var ORIGINAL 	= [];
var ACTIVE		= [];

var PAGINATION	= 0;
var CUR_PAGE	= 1;

var	OP_TO_STRING	= Object.prototype.toString;
var AP_SLICE		= Array.prototype.slice;

var UNIQUE_ID	= 1;

//	Object representing the public interface, assigned to #bauhaus bound to either
//	`module` or `window` context, extended with methods in #ARRAY_M and #LIST_M.
//
var $$ = {
	// 	##is
	//
	//	Whether #val is of #type. For most objects the constructor is
	//	matched.
	//
	//	@param		{Mixed}		type		An object type.
	// 	@param		{Mixed}		val			The value to check.
	//	@type		{Boolean}
	//
	//	@example	var inst = new SomeFunc();
	//				$$.is(SomeFunc, inst) // true
	//
	is 	: function(type, val) {

		if(!type || val === void 0) {
			return false;
		}

		var p;

		switch(type) {
			case Array:
				return OP_TO_STRING.call(val) === '[object Array]';
			break;

			case Object:
				return OP_TO_STRING.call(val) === '[object Object]';
			break;

			case "numeric":
				return !isNaN(parseFloat(val)) && isFinite(val);
			break;

			case "element":
				return val.nodeType === 1;
			break;

			case "empty":
				for(p in val) {
					return false;
				}
				return true;
			break;

			default:
				return val.constructor === type;
			break;
		}
	},

	//	##uniqueId
	//
	//	Simply an incremented number + a prefix. You're safe until about +/- 9007199254740992.
	//
	//	@param	{String}	[pref]		A prefix for unique id. Defaults to "_"(underscore)
	//
	uniqueId	: function(pref) {
		++UNIQUE_ID;
		return (pref || "_") + UNIQUE_ID;
	},

	//	##escape
	//
	//	Escapes HTML text, making it suitable for insertion into page flow.
	//
	//	@param	{String}	text	The text to escape.
	//
	//	@see 	http://davidchambersdesign.com/escaping-html-in-javascript/
	//
	escape	: function(text) {
		return text.replace(/[&<>"'`]/g, function(chr) {
    		return '&#' + chr.charCodeAt(0) + ';';
  		});
	},

	//	##boundFunction
	//
	//	Returns a function F which will execute #fbody within the context F is called.
	//
	//	@param	{String}	fbody	The body of the function to be created.
	//
	//	@example:	var f = scopedFunction("console.log(foo)");
	//				f.apply/call({ foo: "bar" }); // `bar`
	//
	boundFunction 	: function(fbody) {
		return Function(
			"with(this) { return (function(){" + fbody + "})(); };"
		)
	},

	//	##argsToArray
	//
	//	Converts an arguments object to an array.
	//
	//	@param	{Arguments}		a
	//	@param	{Number}		[offset]	Index to begin plucking arguments. Default 0.
	//	@param	{Number}		[end]		Index to stop plucking arguments. Default to end.
	//
    argsToArray : function(a, offset, end) {
        return AP_SLICE.call(a, offset || 0, end);
    },

    //	##objectToArray
    //
    //	Converts an object to an array.
    //
    //	@param	{Object}	o		The object to convert.
    //	@param	{Boolean}	[vals]	Whether to use object value as its index in new array.
    //
    //	@example	: 	var obj = {a:1,b:2,c:3}
    //					Without #vals	: ["a","b","c"]
    //					With #vals		: [undefined,"a","b","c"]
    //
    objectToArray  	: function(o, vals) {
        var p;
        var r = [];

        for(p in o) {
            if(vals) {
                r[o[p]] = p;
            } else {
                r[r.length] = p;
            }
        }

        return r;
    },

    //	##arrayToObject
    //
    //	Converts an array to an object
    //
    //	@param	{Array}		a	The array to convert.
    //
    //	@example	["a","b","c"]	->	{a: 0, b: 1, c: 2}
    //
    arrayToObject  	: function(a) {
        var len = a.length;
        var ob 	= {};

        while(len--) {
            ob[a[len]] = len;
        }

        return ob;
    },

    //	##copy
    //
    //	Copies an object.
    //
    //	@param	{Mixed}		o		The copy candidate.
    //	@param	{Boolean}	[deep]	Whether do a deep copy.
    //
    copy  	: function(o, deep) {
        var cp = function(ob) {
            var fin;
            var p;

            if(typeof ob !== "object" || ob === null || ob.$n) {
                return ob;
            }

			if(!deep) {
				return ob.slice(0);
			}

            try {
                fin = new ob.constructor;
            } catch(e) {
                return ob;
            }

            for(p in ob) {
                fin[p] = cp(ob[p], deep);
            }

            return fin;
        }

        return cp(o);
    },

	//	##memoize
	//
	//	@param		{Function}		f		The function to memoize.
	//	@param		{Object}		[scp]	The scope to execute the function within.
	//
	memoize	: function(f, scp) {

		scp		= scp || $$;

		var m 	= {};
		var aj	= Array.prototype.join;

		return function() {
			//	Key joins arguments on escape character as delimiter which should be safe.
			//
			var k = aj.call(arguments, "\x1B");
			return m.hasOwnProperty(k) || (m[k] = f.apply(scp, arguments));
		};
	}
};

//	##ITERATOR
//
//	Returns accumulator as modified by passed selective function.
//	Note that no checking of target is done, expecting that you send either an
//	array or an object. Error otherwise. Also see notes on @acc, below.
//
//	@param		{Function}		fn		The selective function.
//	@param		{Object}		[targ]	The object to work against.
//	@param		{Mixed}			[acc]	An accumulator, which is set to result of selective
//										function on each interation through target.  If this
//                                      is undefined (void 0) this method returns the last
//                                      index reached.
//  @param      {Object}        [ctxt]  A context to run the iterator in.
//
//	@see	#ARRAY_METHOD
//
var	ITERATOR	= function(fn, targ, acc, ctxt) {
	var c	= targ.length;
	var n	= 0;
	var idx = acc === void 0 ? true : false;

	if($$.is(Array, targ)) {
		while(n < c) {
			acc = ctxt ? fn.call(ctxt, targ[n], n, targ, acc) : fn(targ[n], n, targ, acc);
			if(acc === true) {
			    break;
			}
			n++;
		}
	} else {
		for(n in targ) {
			acc = ctxt ? fn.call(ctxt, targ[n], n, targ, acc) : fn(targ[n], n, targ, acc);
			if(acc === true) {
			    break;
			}
		}
	}

	return idx ? n : acc;
};

//	##ARRAY_METHOD
//
//	"Normalize" several array manipulation methods, such as #each and #map.
//
//	@param		{String}		meth	The array method.
//	@param		{Function}		fn		The selective function.
//	@param		{Object}		[targ]	The object to work against. If a string is sent,
//                                      try to fetch a list by that name.
//	@param		{Mixed}			[arg2]	Usually the scope in which to execute the method, but
//										in the case of #reduce this is an [initialValue].
//  @param      {Mixed}         [arg3]  If #reduce, scope in which to execute the method.
//
var ARRAY_METHOD = function(meth, targ, fn, arg2, arg3) {

    //  If the target is a string, assume a list being requested by name. 
    //
    targ = typeof targ === "string" ? $$.range(targ, 0) : targ;
    
    //  Can only operate on objects.
    //
    if(typeof targ !== "object") { 
        return null;
    }

    var scope	= arg3 || (arg2 || $$);

    //  Will use native method if we're working with an array, and the method exists on
    //  that array. Passing an object, IOW, uses custom method.
    //
    var nat		= $$.is(Array, targ) && targ[meth];
nat = false;
    switch(meth) {
        case "each":
        case "forEach":
            return 	nat ? targ.forEach(fn, scope)
                    : ITERATOR(function(elem, idx, targ) {
                        fn.call(scope, elem, idx, targ);
                    }, targ);
        break;

        case "collect":
        case "map":
            return	nat ? targ.map(fn, scope)
                    : ITERATOR(function(elem, idx, targ, acc) {
                        acc[idx] = fn.call(scope, elem, idx, targ);
                        return acc;
                    }, targ, []);
        break;

        case "select":
        case "filter":
            return	nat ? targ.filter(fn, scope)
                    : ITERATOR(function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(elem);
                        return acc;
                    }, targ, []);
        break;

        case "all":
        case "every":
            return 	nat ? targ.every(fn, scope)
                    : ITERATOR(function(elem, idx, targ) {
                        return fn.call(scope, elem, idx, targ) === false ? true : false;
                    }, targ, []) === false;
        break;

        case "any":
        case "some":
            return	nat ? targ.some(fn, scope)
                    : ITERATOR(function(elem, idx, targ) {
                        return fn.call(scope, elem, idx, targ) === true ? true : false;
                    }, targ, []) === true;
        break;
        
        case "indexOf":        
            if(nat) {
                return targ.indexOf(fn, arg2 === void 0 ? 0 : arg2);
            };

            var off	= arg2 || 0;
            var len = targ.length;
            while(off < len) {
                if(targ[off] === fn) {
                    return off;
                }
                ++off;
            }
            return -1;

        break;
        
        case "lastIndexOf":       
            return  nat ? targ.lastIndexOf(fn, arg2 === void 0 ? targ.length : arg2)
                        : ARRAY_METHOD("indexOf", $$.copy(targ), fn, arg2);
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
        case "foldl":
        case "reduce":
            var offset 	= !arg2 ? 1 : 0;
            return	nat ? targ.reduce(fn, arg2 === void 0 ? false : arg2)
                    : ITERATOR(function(elem, idx, targ, acc) {
                        return targ[idx + offset]
                                ? fn.call(scope, acc, targ[idx + offset], idx + offset, targ)
                                : acc;
                    }, targ, arg2 || targ[0]);
        break;

        case "foldr":
        case "reduceRight":
            targ 	= $$.copy(targ).reverse();
            return 	ARRAY_METHOD("reduce", targ, fn, arg2);
        break;
    }
};

//	##PROC_ARR_ARGS
//
//	Ensures that sent array members are each arrays. Note that the sent array
//	reference is modified, so there is no return value.
//
//	@see	#union
//	@see	#intersect
//	@see	#diff
//
var PROC_ARR_ARGS = function(a) {
	var len = a.length;
	var c;
	while(len--) {
		c = a[len];
		a[len] = 	$$.is(Array, c)
					? c
					: typeof c === "string" && ACTIVE[c]
						? ACTIVE[c]
						: [];
	}
};

//  ##M_M
//  
//  Common handler for #min and #max methods.
//
//  @see    #min
//  @see    #max
//
var M_M = function(cur, a, d) {
    return a[0] ? ITERATOR(a[0], cur, Infinity * d, a[1]) 
                : Math[d === -1 ? "max" : "min"].apply(Math, cur);
};

//  ##LIST_METHOD
//
//	These list methods only return a value if their operation is non-destructive.
//	The current operating list is passed by reference, and as such does not need
//	to be returned.
//
var LIST_METHOD = {

    //  ##bump
    //
    //  Replace #original at #key with a new list.
    //  Returns bumped #original.
    //
    bump    : function(cur, a, len, key) {
        var o = ORIGINAL[key];
        if(ORIGINAL[key] && $$.is(Array, cur)) {
            ORIGINAL[key] = cur;
        }
        return o;
    },

    //  ##compact
    //
    compact : function(cur, a, len) {
        var r = [];
        while(len--) {
            if(!cur[len]) {
                cur.splice(len, 1);
            }
        }
        
        return cur;
    },
    
    //  ##commit
    //
    //	Will replace the #original list with the current #active list.  
    //  Returns previous #original.
    //
    commit	: function(cur, a, len, key) {
        var o = ORIGINAL[key];
    	ORIGINAL[key] = $$.copy(ACTIVE[key]);
    	return a;
    },
    
    //  ##compose
    //
    //  Returns the composed result of a list of functions processed tail to head.
    //  Expects a single argument, which is the value to pass to the tail function.
    //  NOTE that no checking is done of list member types. If any member is not a
    //  function this will error.
    //
    compose		: function(cur, a, len) {
    	var last = a;
    	while(len--) {
    		last = cur[len].apply(this, last);
    	}

    	return last;
    },
    
    //  ##contains
    //
    //  Whether sent value exists in list
    //
    contains    : function(cur, a, len) {
        var v = a[0];
        while(len--) {
            if(cur[len] === v) {
                return true;
            }
        }
        
        return false;
    },
    
	//	##diff
	//
	//	Difference between first list (#prime) and subsequent lists (members of #prime
	//	list which do not exist in any other list). NOTE: all duplicate entries in the
	//  #prime array are reduced to single entries, regardless of differences.
	//
	//	@see	#LIST_ACCESSOR
	//	@return	{Array}
	//
    diff   : function(cur, a, len) {

        var prime 	= $$.arrayToObject(cur);
        var si;
        var m;

        PROC_ARR_ARGS(a);

        while(m = a.shift()) {
            si	= m.length;
            while(si--) {
                if(prime[m[si]] !== void 0) {
                	delete prime[m[si]];
                }
            }
        }

        return $$.objectToArray(prime);
    },
    
    //  ##find
    //
    //  Returns the first value matching iterator.
    //
    find    : function(cur, a) {
        return cur[ITERATOR(a[0], cur)];
    },
    
    //  ##findLast
    //
    //  Returns the last value matching iterator.
    //
    findLast    : function(cur, a) {
        var c = $$.copy(cur).reverse();
        return c[ITERATOR(a[0], c)];
    },
    
    //  ##first
    //
    //  Regarding the first item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value. If the list does not
    //  exist, a new list will be created.
    //
    first   : function(cur, a) {
    	var c = a.length;
        if(c) {
        	while(c--) {
        		cur.unshift(a[c]);
        	}
        } else {
        	return cur.slice(0,1);
        }

        return cur;
    },
    
    //  ##firstx
    //
    //  Regarding the first item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value.
    //
    //  Unlike #first, #firstx will *not* create a list if one does not exist.
    //
    firstx  : function(cur, a) {
        return cur ? this.first(cur, a) : null;
    },
    
    //  ##flatten
    //
    //  Reduces an array of nested arrays to a single depth.
    //
    //  @example    : #flatten(['frank', ['bob', 'lisa'], ['jill', ['tom', 'sally']]])
    //              : ["sally", "tom", "jill", "lisa", "bob", "frank"]
    //
    flatten     : function(cur) {
        var r = [];
        var f = function(a) {
            var i = a.length;
            while(i--) {
                if(typeof a[i] === "object") {
                    f(a[i])
                } else {
                    r[r.length] = a[i];
                }
            }
            return r;
        }
  
        return f(cur);
    },
    
    //  ##get
    //
    //  Return item at sent index.
    //
    //  Indexes can be positive or negative, and are zero based.
    //  `0` is first item, `1` is second, `-1` is last, `-2` is penultimate.
    //  @argumentList
    //      0: {Number}     The index.
    //
    get     : function(cur, a, len) {
        return cur[a[0] >= 0 ? a[0] : len + a[0]];
    },
    
    //  ##insert
    //
    //  Insert item before or after another item value.
    //
    //  @argumentList
    //      0:  {String}    One of "before" or "after".
    //      1:  {Mixed}     The pivot value.
    //      n:  {Mixed}     Any number of arguments (items) to be inserted
    //                      before or after given pivot value.
    //
    insert  : function(cur, a, len) {
        var ins = a.slice(2);
        var piv = 1;

        while(len--) {
            if(cur[len] === a[1]) {

                if(a[0] == "before") {
                    piv = -piv;
                }

                [].splice.apply(cur, [len + piv, 0].concat(ins));
                break;
            }
        }

        return cur;
    },
    
	//	##intersect
	//
	//	Intersection of all lists (members which exist in all lists).
	//
	//	@see	#LIST_ACCESSOR
	//	@return	{Array}
	//
    intersect   : function(cur, a, len) {

        var aL 	= a.push(cur);
        var map = {};
        var res = [];
        var m;
        var si;
        var c;

		PROC_ARR_ARGS(a);

        while(m = a.shift()) {
            si 	= m.length;
            while(si--) {
            	c = map[m[si]];
                ((map[m[si]] = c ? c += 1 : 1) === aL) && res.push(m[si]);
            }
        }

        return res;
    },
    
    //  ##invoke
    //
    //  Executes named method on list, passing named method any additional arguments
    //  passed to #invoke.
    //
    invoke  : function(cur, a, len) {
        var m = $$[a.shift()];
        while(len--) {
            cur[len] = m.apply($$, [cur[len]].concat(a));
        }
        return cur;
    },
    
    //  ##iterator
    //
    //	Create a basic iterator for a list.
    //
    //	To fetch iterator for #ACTIVE list, send no arguments.
    //	To fetch iterator for #ORIGINAL list, send argument {String} "original".
    //	To fetch iterator for any given array, send nothing, not even a key.
    //
    iterator	: function(cur, a, len, key) {

    	return new function() {
    		var list = 	$$.copy(	$$.is(Array, key)
							? key
							: a[0] === "original"
								? ORIGINAL[key]
								: ACTIVE[key], 1);

    		this.idx		= -1;
    		this.moveIdx	= function(d, circ) {
    			var i	= this.idx + d;
    			var len = list.length -1;

				// 	If the operation exceeds list bound and the #circ(ular) directive
				//	was not sent, the result of the operation is `undefined`.
				//
    			if(!circ && (d === -1 ? i < 0 : i > len)) {
    				return void 0;
    			}

    			this.idx =	i < 0
							? len
							: i > len
								? 0
								: i;
				return this.idx;
    		};
    		this.next	= function(circ) {
    			return list[this.moveIdx(1, circ)];
    		};
    		this.prev	= function(circ) {
    			return list[this.moveIdx(-1, circ)];
    		};
    		this.nextIndex	= function() {
    			return this.moveIdx(1);
    		};
    		this.prevIndex	= function() {
    			return this.moveIdx(-1);
    		};
    		this.hasNext	= function() {
    			return !((this.idx + 1) === list.length)
    		};
    		this.hasPrev	= function() {
    			return !((this.idx - 1) === 0)
    		};
    		this.remove		= function() {
    			var s = list.splice(this.idx, 1);
    			if(list.length === this.idx) {
    				this.prev();
    			}
    			return s;
    		};
    		this.set	= function() {
    			list[this.idx] = key;
    			return a[0];
    		}
    	};
    },
    
    //  ##last
    //
    //  Regarding the last item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value. If the list does not
    //  exist, a new list will be created.
    //
    last     : function(cur, a, len) {
    	var c 	= a.length;
    	var i	= 0;
        if(c) {
        	for(; i < c; i++) {
        		cur[cur.length] = a[i];
        	}
        } else {
        	return cur.slice(len -2, 1);
        }

        return cur;
    },

    //  ##lastx
    //
    //  Regarding the last item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value. If the list does not
    //  exist, a new list will be created.
    //
    //  Unlike #last, #lastx will *not* create a list if one does not exist.
    //
    lastx   : function(cur, a) {
        return cur ? this.last(cur, a) : null;
    },
    
    //  ##max
    //
    //  Returns the maximum value in list. 
    //
    //  Arguments:
    //      0:  {Function}      [it]     An iterator
    //      1:  {Object}        [scp]    Scope to run iterator in.
    //(fn, targ, acc, ctxt)
    max : function(cur, a) {
        return a[0] ? ITERATOR(a[0], cur, -Infinity, a[1]) 
                    : Math.max.apply(Math, cur);
    },
    
    //  ##min
    //
    //  Returns the minimum value in list. 
    //
    //  Arguments:
    //      0:  {Function}      [it]     An iterator
    //      1:  {Object}        [scp]    Scope to run iterator in.
    //
    min : function(cur, a) {
        return a[0] ? ITERATOR(a[0], cur, Infinity, a[1]) 
                    : Math.min.apply(Math, cur);
    },

    //  ##paginate
    //
    paginate	: function(cur, a, len) {
    	PAGINATION = Math.max(0, a[0]);
    },

	//	##page
	//
	//	Returns the requested page array if #a is set, or the current page # if not.
	//
	//	@example	Terrace.lists.page(3) // [
    page	: function(cur, a, len) {

    	var p 		= a[0];
    	var pages 	= Math.ceil((len -1) / PAGINATION);
    	var start;
    	var end;

		//	If #p is positive or negative the request is for a page array so run block.
		//	If undefined, requesting #CUR_PAGE. Skip.
		//	If 0(zero), treat like undefined.
		//
    	if(p) {
			if(p < 0) {
				p = Math.max(pages + p +1, 1);
			} else {
				p = Math.min(p, pages);
			}

			start 	= Math.min((p-1) * PAGINATION, len);
			end		= Math.min(start + PAGINATION, len);

			CUR_PAGE = p;
			return cur.slice(start, end);
    	}
    	return CUR_PAGE;
    },
    
    //  ##pluck
    //
    //  Given a list of objects, will return a list of the values at given
    //  index in each object.
    //
    //  @example    .pluck([    {user: 'tom', state: 'NY'}, 
    //                          {user: 'dick', state: 'NJ'},
    //                          {user: 'harry', state: 'ND'}], "state");
    //              // ['NY','NJ','ND']
    //
    pluck   : function(cur, a, len) {
        var c;
        var p = a[0];
        var r = [];
        while(len--) {
            c = cur[len];
            if(typeof c === "object" && c === p) {
                r[r.length] = p;
            }
        }
        
        return r;
    },
    
    //  ##range
    //
    //  Returns a range of elements.
    //
    //  Indexes can be positive or negative, and are zero based.
    //  `0` is first item, `1` is second, `-1` is last, `-2` is penultimate.
    //  NOTE: There is no range checking done.
    //
    //  @argumentList
    //      0:      {Number} Start index.
    //      [1]:    {Number} End index. If none sent, range is start->list end.
    //
    range   : function(cur, a, len) {
    	var v 	= [	a[0] >= 0
    				? a[0]
    				: len + a[0] ,
    				a[1]
    				? a[1] >= 0
    					? a[1]
    					: len + a[1]
    				: len].sort();

        return cur.slice(v[0], v[1]);
    },
    
    //  ##reject
    //
    //  Return array of values which do *not* match iterator. Opposite of #filter.
    //
    reject  : function(cur, a, len) {
        var fn  = a[0];
        return  ITERATOR(function(elem, idx, targ, acc) {
                    !fn.call(this, elem, idx, targ) && acc.push(elem);
                    return acc;
                }, cur, [], a[1]);
    },

    //  ##remove
    //
    //  Removes #c(ount) members of list === #v(alue).  
    //  #c > 0: moving from head to tail.
    //  #c < 0: moving from tail to head.
    //  #c = 0: Remove all.
    //
    //  Arguments
    //      0:  {Number}    #c  The number of instances of #v to remove
    //      1:  {Mixed}     #v  The value to remove
    //
    remove  : function(cur, a, len) {
        var max     = a[0] === 0 ? len : Math.abs(a[0]);
        var pos     = a[0] > 0;
        var hits    = [];
        var hLen    = 0;
        var cLen    = len;

        while(cLen--) {
            if(cur[cLen] === a[1]) {
                hLen = hits.push(cLen);
                if(!pos && hLen === max) {
                    break;
                }
            }
        }

        //  Sort and truncate. If negative (from right), there will be no effect,
        //  as the length of hits is controlled in above loop. If positive (or zero)
        //  will be sorted smaller->larger, and truncated to #max length.
        //
        hits.sort();
        hLen 		= Math.min(hits.length, max);
        hits.length = hLen;

        while(hLen--) {
            cur.splice(hits[hLen], 1);
        }

        return cur;
    },
    
    //  ##reset
    //
    //	Will replace the #active list with the #original list.
    //  Returns last #active.
    //
    reset	: function(cur, a, len, key) {
        var a = ACTIVE[key];
    	ACTIVE[key] = $$.copy(ORIGINAL[key]);
    	return a;
    },

    //  ##set
    //
    //  Fetch item at sent index.
    //
    //  Indexes can be positive or negative, and are zero based.
    //  `0` is first item, `1` is second, `-1` is last, `-2` is penultimate.
    //  NOTE: There is no range checking done.
    //
    //  @argumentList
    //      0: {Number}     The index.
    //      1: {Mixed}      The value to set
    //
    set     : function(cur, a, len) {
        return (cur[a[0] >= 0 ? a[0] : len + a[0]] = a[1]);
    },

    //  ##size
    //
    //  Returns the length of the list
    //
    size   	: function(cur, a, len) {
        return len;
    },

    //  ##shuffle
    //
    //	Shuffle a list randomly.
    //
    //	Implements Fisher-Yates algorithm.
    //	@see	http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    //
    shuffle		: function(cur, a, len) {
		var s;
		var r;

		while(len) {
			// Select one of the remaining and swap with current.
			//
			r = Math.floor(Math.random() * (len - 1));
			s = cur[--len];
			cur[len] = cur[r];
			cur[r] = s;
		}

		return cur;
    },

    //  ##sequence
    //
    //  Returns the composed result of a list of functions processed head to tail.
    //  Expects a single argument, which is the value to pass to the head function.
    //  NOTE that no checking is done of list member types. If any member is not a
    //  function this will error.
    //
    sequence	: function(cur, a, len) {
    	var last    = a;
    	var i       = 0
    	while(i < len) {
    		last = cur[len].apply(this, last);
    		i++;
    	}

    	return last;
    },

    //  ##totalPages
    //
    totalPages	: function(cur, a, len) {
    	return Math.ceil(len / PAGINATION);
    },
    
    //  ##unique
    //
    //	Unique-ifys the #active list.
    //
    unique  	: function(cur, a, len) {
		var map = {};
		var c;
		while(len--) {
			c = map[cur[len]];
			((map[cur[len]] = c ? c += 1 : 1) > 1) && cur.splice(len, 1);
		}

		return cur;
    },

	//	##union
	//
	//	Union of all lists (add unique members of all lists).
	//
	//	@see	#LIST_ACCESSOR
	//	@return	{Array}
	//
    union  : function(cur, a, len) {

        var map	= {};
        var s;
        var si;
        var m;

		a[a.length] = cur;
		PROC_ARR_ARGS(a);

        while(m = a.shift()) {
            si	= m.length;
            while(si--) {
            	map[m[si]] = 1;
            }
        }

		return $$.objectToArray(map);
    },

    //  ##unset
    //
    //	Will remove a key (a list) entirely, returning an object containing
    //  list's last #active and last #original
    //
    unset	: function(cur, a, len, key) {
        var r = {
            active      : ACTIVE[key],
            original    : ORIGINAL[key]
        }
        
        delete ACTIVE[key];
    	delete ORIGINAL[key];
    	
    	return r;
    }
}

//  Prefilter for list calls, mainly to validate arguments and set up boilerplate for
//  the list accessors to use.
//
//  Ensures that execution terminates if requested method cannot work with the
//  current list, determines current list values, filters argument list, and calls method.
//
var LIST_ACCESSOR = function(m, key) {
    var a   	= $$.argsToArray(arguments, 2);
	var cur 	= ACTIVE[key];
	var initial	= false;
	var result;

    //  There is no value set.
    //
    if(!cur) {
        if($$.is(Array, key)) {
            cur = key;
        } else if(a[0] !== void 0 && (m == "first" || m == "last")) {
        	cur = ACTIVE[key] = [];
            initial = true;
		} else if(m === "iterator") {
			cur = [];
        }  else {
            return null;
        }
    }

	//	Run transformation on #active list.
	//
    result = LIST_METHOD[m](cur, a, cur.length, key);

	//	If first list operation on this key, store *copy* of #active.  NOTE that the
	//	copy is shallow, which means that objects are not copied. Being in a list
	//	doesn't insulate list members from external access which may, or may not, be
	//	what you want.
	//
	if(initial) {
		ORIGINAL[key] = $$.copy(cur,1);
	}

    //  Return any truthy values. Return `false`, as that is a valid result. We return #cur
    //  if any other falsy result is received.
    //
    return result === false ? false : result || cur;
};

//	Core array methods.
//
while(ARRAY_M.length) {
	(function(m) {
        $$[m] = function(targ, fn, scope, a3) {
            return ARRAY_METHOD(m, targ, fn, scope, a3);
        }
    })(ARRAY_M.pop());
}

//  List methods
//
while(LIST_M.length) {
	(function(m) {
        $$[m] = function() {

            //	Methods have varying functional signatures.
            //
            var a = $$.argsToArray(arguments);

            //	#LIST_ACCESSOR expects method name as first argument.
            //
            a.unshift(m);

            return LIST_ACCESSOR.apply($$, a);
        };
    })(LIST_M.pop());
}

if(typeof exports == 'object' && exports) {
    exports.bauhaus = $$;
} else {
    window.bauhaus = $$;
}

console.log($$)

})();