
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false }) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    class Filters {
        static noFilter(word, letter, position) {
            return true;
        }
        static notInWord(word, letter, position) {
            return !word.includes(letter.charAt(0));
        }
        static wrongPosition(word, letter, position) {
            return word.includes(letter.charAt(0)) && word.charAt(position) != letter.charAt(0);
        }
        static rightPosition(word, letter, position) {
            return word.charAt(position) == letter.charAt(0);
        }
    }

    /* src\App.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[22] = list;
    	child_ctx[23] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[24] = list;
    	child_ctx[25] = i;
    	return child_ctx;
    }

    // (130:3) {#each row as letter, j}
    function create_each_block_3(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[7].call(input, /*i*/ ctx[23], /*j*/ ctx[25]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*i*/ ctx[23], /*j*/ ctx[25]);
    	}

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[9](/*i*/ ctx[23], /*j*/ ctx[25], ...args);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "id", /*i*/ ctx[23].toString().concat(/*j*/ ctx[25].toString()));
    			attr_dev(input, "maxlength", "1");
    			attr_dev(input, "class", "letterbox svelte-1npfsq9");
    			add_location(input, file, 130, 4, 4810);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*letters*/ ctx[1][/*i*/ ctx[23]][/*j*/ ctx[25]]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", input_input_handler),
    					listen_dev(input, "click", click_handler, false, false, false),
    					listen_dev(input, "input", input_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*letters*/ 2 && input.value !== /*letters*/ ctx[1][/*i*/ ctx[23]][/*j*/ ctx[25]]) {
    				set_input_value(input, /*letters*/ ctx[1][/*i*/ ctx[23]][/*j*/ ctx[25]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(130:3) {#each row as letter, j}",
    		ctx
    	});

    	return block;
    }

    // (128:1) {#each letters as row, i}
    function create_each_block_2(ctx) {
    	let div;
    	let t;
    	let br;
    	let each_value_3 = /*row*/ ctx[21];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			br = element("br");
    			attr_dev(div, "class", "row svelte-1npfsq9");
    			add_location(div, file, 128, 2, 4760);
    			add_location(br, file, 139, 2, 5055);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert_dev(target, t, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*letters, toggleFilter, handleInput*/ 26) {
    				each_value_3 = /*row*/ ctx[21];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(128:1) {#each letters as row, i}",
    		ctx
    	});

    	return block;
    }

    // (143:1) {#if filteredWords && filteredWords.length > 0}
    function create_if_block(ctx) {
    	let span;
    	let t0_value = /*filteredWords*/ ctx[0].length + "";
    	let t0;
    	let br;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*displayedWords*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(t0_value);
    			br = element("br");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(span, file, 143, 2, 5121);
    			add_location(br, file, 143, 37, 5156);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredWords*/ 1 && t0_value !== (t0_value = /*filteredWords*/ ctx[0].length + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*displayedWords*/ 4) {
    				each_value = /*displayedWords*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(143:1) {#if filteredWords && filteredWords.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (148:3) {#each word as letter}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*letter*/ ctx[18] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "letterbox svelte-1npfsq9");
    			add_location(div, file, 148, 4, 5253);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*displayedWords*/ 4 && t_value !== (t_value = /*letter*/ ctx[18] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(148:3) {#each word as letter}",
    		ctx
    	});

    	return block;
    }

    // (145:2) {#each displayedWords as word}
    function create_each_block(ctx) {
    	let br;
    	let t0;
    	let div;
    	let t1;
    	let each_value_1 = /*word*/ ctx[15];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			br = element("br");
    			t0 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			add_location(br, file, 145, 3, 5197);
    			attr_dev(div, "class", "row svelte-1npfsq9");
    			add_location(div, file, 146, 3, 5205);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*displayedWords*/ 4) {
    				each_value_1 = /*word*/ ctx[15];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t1);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(145:2) {#each displayedWords as word}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let t;
    	let each_value_2 = /*letters*/ ctx[1];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block = /*filteredWords*/ ctx[0] && /*filteredWords*/ ctx[0].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			add_location(main, file, 126, 0, 4724);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			append_dev(main, t);
    			if (if_block) if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*letters, toggleFilter, handleInput*/ 26) {
    				each_value_2 = /*letters*/ ctx[1];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(main, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (/*filteredWords*/ ctx[0] && /*filteredWords*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function ratedWords(words, ratedAlphabet) {
    	let ratedWords = new Map();
    	let sum;

    	words.forEach(word => {
    		sum = 0;

    		word.split("").forEach((letter, i) => {
    			sum += ratedAlphabet.get(letter)[i];

    			if (word.split(letter).length > 2) {
    				sum += 5000;
    			}
    		});

    		ratedWords.set(word, sum);
    	});

    	return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]));
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let words = [];
    	let filteredWords;
    	let displayedWords;
    	let wordLength = 5;
    	let nrOfRows = 6;
    	let letters = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(""));
    	let filters = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(Filters.noFilter));

    	onMount(async () => {
    		const response = await fetch("words.json");
    		$$invalidate(5, words = await response.json());
    		$$invalidate(0, filteredWords = words);
    	});

    	function toggleFilter(row, column) {
    		let backgroundColor = "";

    		if (filters[row][column] == Filters.noFilter) {
    			$$invalidate(6, filters[row][column] = Filters.notInWord, filters);
    			backgroundColor = "lightgray";
    		} else if (filters[row][column] == Filters.notInWord) {
    			$$invalidate(6, filters[row][column] = Filters.wrongPosition, filters);
    			backgroundColor = "orange";
    		} else if (filters[row][column] == Filters.wrongPosition) {
    			$$invalidate(6, filters[row][column] = Filters.rightPosition, filters);
    			backgroundColor = "lightgreen";
    		} else {
    			$$invalidate(6, filters[row][column] = Filters.noFilter, filters);
    		}

    		document.getElementById(row.toString().concat(column)).style.backgroundColor = backgroundColor;
    	}

    	// function findMostFilteringWord(fromWords: string[], inWords:string[]) {
    	// 	let filterScore: number = fromWords.length;
    	// 	let indexOfMostFilteringWord: number = 0;
    	// 	let wordLength = fromWords[0].length;
    	// 	fromWords.forEach((word, i) => {
    	// 		let filteredInWordsSize = inWords.filter((w) => {
    	// 			for (let column = 0; column < wordLength; column++) {
    	// 				if (w.includes(word.charAt(column))) {
    	// 					return false;
    	// 				}
    	// 			} 
    	// 			return true
    	// 		}).length;
    	// 		if (filteredInWordsSize > 0 && filterScore > filteredInWordsSize) {
    	// 			console.log(filteredInWordsSize)
    	// 			filterScore = filteredInWordsSize;
    	// 			indexOfMostFilteringWord = i;
    	// 		}
    	// 	})
    	// 	return fromWords[indexOfMostFilteringWord];
    	// }
    	const alphabet = [
    		"a",
    		"b",
    		"c",
    		"d",
    		"e",
    		"f",
    		"g",
    		"h",
    		"i",
    		"j",
    		"k",
    		"l",
    		"m",
    		"n",
    		"o",
    		"p",
    		"q",
    		"r",
    		"s",
    		"t",
    		"u",
    		"v",
    		"w",
    		"x",
    		"y",
    		"z"
    	];

    	function rateAlphabet(words) {
    		// const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
    		const wordLength = words[0].length;

    		const totalNrOfWords = words.length;
    		let ratedAlphabet = new Map();

    		for (const letter of alphabet) {
    			let rating = new Array(wordLength + 1);
    			rating[wordLength] = words.filter(w => w.includes(letter)).length;

    			for (let i = 0; i < wordLength; i++) {
    				rating[i] = Math.pow(words.filter(w => Filters.rightPosition(w, letter, i)).length, 2);
    				rating[i] += Math.pow(words.filter(w => Filters.wrongPosition(w, letter, i)).length, 2);
    				rating[i] += Math.pow(words.filter(w => Filters.notInWord(w, letter, i)).length, 2);
    				rating[i] /= totalNrOfWords;
    			}

    			ratedAlphabet.set(letter, rating);
    		}

    		return ratedAlphabet;
    	}

    	function handleInput(e, i, j) {
    		let inputEvent = e;
    		console.log(inputEvent.data);

    		if (alphabet.includes(inputEvent.data)) {
    			focusNext(i, j);
    		}
    	}

    	function focusNext(i, j) {
    		if (j < wordLength - 1) {
    			document.getElementById(i.toString().concat((j + 1).toString())).focus();
    		} else {
    			document.getElementById((i + 1).toString().concat((0).toString())).focus();
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler(i, j) {
    		letters[i][j] = this.value;
    		$$invalidate(1, letters);
    	}

    	const click_handler = (i, j) => toggleFilter(i, j);
    	const input_handler = (i, j, e) => handleInput(e, i, j);

    	$$self.$capture_state = () => ({
    		Filters,
    		onMount,
    		words,
    		filteredWords,
    		displayedWords,
    		wordLength,
    		nrOfRows,
    		letters,
    		filters,
    		toggleFilter,
    		alphabet,
    		rateAlphabet,
    		ratedWords,
    		handleInput,
    		focusNext
    	});

    	$$self.$inject_state = $$props => {
    		if ('words' in $$props) $$invalidate(5, words = $$props.words);
    		if ('filteredWords' in $$props) $$invalidate(0, filteredWords = $$props.filteredWords);
    		if ('displayedWords' in $$props) $$invalidate(2, displayedWords = $$props.displayedWords);
    		if ('wordLength' in $$props) $$invalidate(10, wordLength = $$props.wordLength);
    		if ('nrOfRows' in $$props) $$invalidate(11, nrOfRows = $$props.nrOfRows);
    		if ('letters' in $$props) $$invalidate(1, letters = $$props.letters);
    		if ('filters' in $$props) $$invalidate(6, filters = $$props.filters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*words, letters, filters*/ 98) {
    			{
    				$$invalidate(0, filteredWords = words.filter(w => {
    					for (let row = 0; row < nrOfRows; row++) {
    						for (let column = 0; column < wordLength; column++) {
    							if (letters[row][column] != "" && !filters[row][column](w, letters[row][column], column)) {
    								return false;
    							}
    						}
    					}

    					return true;
    				}));
    			}
    		}

    		if ($$self.$$.dirty & /*filteredWords, words*/ 33) {
    			{
    				if (filteredWords.length > 0 && filteredWords.length <= 5) {
    					$$invalidate(2, displayedWords = [...ratedWords(filteredWords, rateAlphabet(filteredWords)).keys()].slice(0, 10));
    				} else if (filteredWords.length > 5) {
    					$$invalidate(2, displayedWords = [...ratedWords(words, rateAlphabet(filteredWords)).keys()].slice(0, 10));
    				}
    			}
    		}
    	};

    	return [
    		filteredWords,
    		letters,
    		displayedWords,
    		toggleFilter,
    		handleInput,
    		words,
    		filters,
    		input_input_handler,
    		click_handler,
    		input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
