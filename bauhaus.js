"use strict";

(function() {

//	#indexOf and #lastIndexOf are attached to #LIST_M collection.
//
var ARRAY_M = [
    "each",
    "forEach",
    "map",
    "filter",
    "every",
    "some",
    "reduce",
    "reduceRight"
];

var LIST_M = [
    "insert",
    "size",
    "first",
    "firstx",
    "last",
    "lastx",
    "range",
    "remove",
    "unique",
    "shuffle",
    "compose",
    "sequence",
    "get",
    "set",
    "indexOf",
    "lastIndexOf",
    "intersect",
    "diff",
    "union",
    "commit",
    "reset",
    "unset",
    "iterator",
    "paginate",
    "page",
    "totalPages"
];

var ORIGINAL 	= [];
var ACTIVE		= [];

var PAGINATION	= 0;
var CUR_PAGE	= 1;

var	OP_TO_STRING	= Object.prototype.toString;

//	Object representing the public interface, assigned to #bauhaus bound to either
//	`module` or `window` context, extended with methods in #ARRAY_M and #LIST_M.
//
var $$ = {
	// 	##is
	//
	//	Whether #val is of #type. For most objects the constructor is
	//	matched, which allows:
	//		var inst = new SomeFunc();
	//		$$.is(SomeFunc, inst) // true
	//
	//	@param		{Mixed}		type		An object type.
	// 	@param		{Mixed}		val			The value to check.
	//	@type		{Boolean}
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
    argsToArray : function(a, offset, end) {
        return Array.prototype.slice.call(a, offset || 0, end);
    },
    objectToArray  	: function(o, vals) {
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
    arrayToObject  	: function(a) {
        var len = a.length;
        var ob 	= {};

        while(len--) {
            ob[a[len]] = len;
        }

        return ob;
    },
    copy  	: function(s) {
        return $$.is(Array, s) ? s.slice(0) : s;
    }
};

//	##ARRAY_M_ITERATOR
//
//	Returns accumulator as modified by passed selective function.
//	Note that no checking of target is done, expecting that you send either an
//	array or an object. Error, otherwise.
//
//	@param		{Function}		fn		The selective function.
//	@param		{Object}		[targ]	The object to work against.
//	@param		{Mixed}			[acc]	An accumulator, which is set to result of selective
//										function on each interation through target.
//	@see	#ARRAY_METHOD
//
var	ARRAY_M_ITERATOR	= function(fn, targ, acc) {
	var c	= targ.length;
	var n	= 0;

	if($$.is(Array, targ)) {
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
//
var ARRAY_METHOD = function(meth, fn, targ, arg2) {

    targ = typeof targ === "string" ? $$.range(targ, 0) : targ;

    var scope	= arg2 || this;
    var nat		= $$.is(Array, targ) && targ[meth];

    switch(meth) {
        case "each":
        case "forEach":
            return 	nat ? targ.forEach(fn, scope)
                    : ARRAY_M_ITERATOR.call(this, function(elem, idx, targ) {
                        fn.call(scope, elem, idx, targ);
                    }, targ);
        break;

        case "map":
            return	nat ? targ.map(fn, scope)
                    : ARRAY_M_ITERATOR.call(this, function(elem, idx, targ, acc) {
                        acc[idx] = fn.call(scope, elem, idx, targ);
                        return acc;
                    }, targ, []);
        break;

        case "filter":
            return	nat ? targ.filter(fn, scope)
                    : ARRAY_M_ITERATOR.call(this, function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(elem);
                        return acc;
                    }, targ, []);
        break;

        case "every":
            return 	nat ? targ.every(fn, scope)
                    : ARRAY_M_ITERATOR.call(this, function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(1);
                        return acc;
                    }, targ, []).length === targ.length;
        break;

        case "some":
            return	nat ? targ.some(fn, scope)
                    : ARRAY_M_ITERATOR.call(this, function(elem, idx, targ, acc) {
                        fn.call(scope, elem, idx, targ) && acc.push(1);
                        return acc;
                    }, targ, []).length > 0;
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
                    : ARRAY_M_ITERATOR.call(this, function(elem, idx, targ, acc) {
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

//	These list methods only return a value if their operation is non-destructive.
//	The current operating list is passed by reference, and as such does not need
//	to be returned.
//
var LIST_METHOD = {

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

    //  ##size
    //
    //  Returns the length of the list
    //
    size   	: function(cur, a, len) {
        return len;
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
        		cur.push(a[i]);
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

    //	##indexOf
    //
    indexOf		: function(cur, a, len, key) {

    	var off	= a[1] || 0;

    	while(off < len) {
    		if(cur[off] === a[0]) {
    			return off;
    		}
    		++off;
    	}

    	return -1;
    },

    //	##lastIndexOf
    //
    lastIndexOf		: function(cur, a, len, key) {

        var off	= a[1] || 0;

    	while(--len >= off) {
    		if(cur[len] === a[0]) {
    			return len;
    		}
    	}

    	return -1;
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

    //  ##remove
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

    //  ##unique
    //
    //	Unique-ifys the #active list.
    //
    unique  	: function(cur, a, len) {
		var board = {};
		var r = [];

		while(len--) {
			if(!board[cur[len]]) {
				r.unshift(cur[len]);
				board[cur[len]] = true;
			}
		}

		cur = r;

		return cur;
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

	//	##union
	//
	//	Union of all lists (add unique members of all lists).
	//
	//	@see	#LIST_ACCESSOR
	//	@return	{Array}
	//
    union  : function(cur, a, len) {

		a.push(cur);
		PROC_ARR_ARGS(a);

        var map		= {};
        var s;
        var si;
        var m;

        while(m = a.shift()) {
            si	= m.length;
            while(si--) {
            	map[m[si]] = 1;
            }
        }

		return $$.objectToArray(map);
    },

	//	##diff
	//
	//	Difference between first list (#prime) and subsequent lists (members of #prime
	//	list which do not exist in any other list).
	//
	//	@see	#LIST_ACCESSOR
	//	@return	{Array}
	//
    diff   : function(cur, a, len) {

    	PROC_ARR_ARGS(a);

        var prime 	= $$.arrayToObject(cur);
        var si;
        var m;

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

	//	##intersect
	//
	//	Intersection of all lists (members which exist in all lists).
	//
	//	@see	#LIST_ACCESSOR
	//	@return	{Array}
	//
    intersect   : function(cur, a, len) {

        a.push(cur);
        PROC_ARR_ARGS(a);

        var aL  = a.length;
        var map = {};
        var res = [];
        var m;
        var si;

        while(m = a.shift()) {
            si 	= m.length;
            while(si--) {
                if((map[m[si]] = map[m[si]] ? map[m[si]] += 1 : 1) === aL) {
                    res.push(m[si]);
                }
            }
        }

        return res;
    },

    //  ##commit
    //
    //	Will replace the #original list with the current #active list.
    //
    commit	: function(cur, a, len, key) {
    	ORIGINAL[key] = $$.copy(ACTIVE[key]);
    },

    //  ##reset
    //
    //	Will replace the #active list with the #original list.
    //
    reset	: function(cur, a, len, key) {
    	ACTIVE[key] = $$.copy(ORIGINAL[key]);
    },

    //  ##unset
    //
    //	Will remove a key (a list) entirely.
    //
    unset	: function(cur, a, len, key) {
        delete ACTIVE[key];
    	delete ORIGINAL[key];
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
    		this.moveIdx	= function(d) {
    			var i	= this.idx + d;
    			var len = list.length -1;
    			this.idx =	i < 0
							? len
							: i > len
								? 0
								: i;
				return this.idx;
    		};
    		this.next	= function() {
    			return list[this.moveIdx(1)];
    		};
    		this.prev	= function() {
    			return list[this.moveIdx(-1)];
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

    //  ##totalPages
    //
    totalPages	: function(cur, a, len) {
    	return Math.ceil(len / PAGINATION);
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

   	return result || cur;
};

//	Core array methods.
//
while(ARRAY_M.length) {
	(function(m) {
        $$[m] = function(targ, fn, scope) {
            return ARRAY_METHOD(m, fn, targ, scope);
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