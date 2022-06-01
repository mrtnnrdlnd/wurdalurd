
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

    const wordsLengthFive = [
        "aback",
        "abase",
        "abate",
        "abbey",
        "abbot",
        "abhor",
        "abide",
        "abled",
        "abode",
        "abort",
        "about",
        "above",
        "abuse",
        "abyss",
        "acorn",
        "acrid",
        "actor",
        "acute",
        "adage",
        "adapt",
        "adept",
        "admin",
        "admit",
        "adobe",
        "adopt",
        "adore",
        "adorn",
        "adult",
        "affix",
        "afire",
        "afoot",
        "afoul",
        "after",
        "again",
        "agape",
        "agate",
        "agent",
        "agile",
        "aging",
        "aglow",
        "agony",
        "agree",
        "ahead",
        "aider",
        "aisle",
        "alarm",
        "album",
        "alert",
        "algae",
        "alibi",
        "alien",
        "align",
        "alike",
        "alive",
        "allay",
        "alley",
        "allot",
        "allow",
        "alloy",
        "aloft",
        "alone",
        "along",
        "aloof",
        "aloud",
        "alpha",
        "altar",
        "alter",
        "amass",
        "amaze",
        "amber",
        "amble",
        "amend",
        "amiss",
        "amity",
        "among",
        "ample",
        "amply",
        "amuse",
        "angel",
        "anger",
        "angle",
        "angry",
        "angst",
        "anime",
        "ankle",
        "annex",
        "annoy",
        "annul",
        "anode",
        "antic",
        "anvil",
        "aorta",
        "apart",
        "aphid",
        "aping",
        "apnea",
        "apple",
        "apply",
        "apron",
        "aptly",
        "arbor",
        "ardor",
        "arena",
        "argue",
        "arise",
        "armor",
        "aroma",
        "arose",
        "array",
        "arrow",
        "arson",
        "artsy",
        "ascot",
        "ashen",
        "aside",
        "askew",
        "assay",
        "asset",
        "atoll",
        "atone",
        "attic",
        "audio",
        "audit",
        "augur",
        "aunty",
        "avail",
        "avert",
        "avian",
        "avoid",
        "await",
        "awake",
        "award",
        "aware",
        "awash",
        "awful",
        "awoke",
        "axial",
        "axiom",
        "axion",
        "azure",
        "bacon",
        "badge",
        "badly",
        "bagel",
        "baggy",
        "baker",
        "baler",
        "balmy",
        "banal",
        "banjo",
        "barge",
        "baron",
        "basal",
        "basic",
        "basil",
        "basin",
        "basis",
        "baste",
        "batch",
        "bathe",
        "baton",
        "batty",
        "bawdy",
        "bayou",
        "beach",
        "beady",
        "beard",
        "beast",
        "beech",
        "beefy",
        "befit",
        "began",
        "begat",
        "beget",
        "begin",
        "begun",
        "being",
        "belch",
        "belie",
        "belle",
        "belly",
        "below",
        "bench",
        "beret",
        "berry",
        "berth",
        "beset",
        "betel",
        "bevel",
        "bezel",
        "bible",
        "bicep",
        "biddy",
        "bigot",
        "bilge",
        "billy",
        "binge",
        "bingo",
        "biome",
        "birch",
        "birth",
        "bison",
        "bitty",
        "black",
        "blade",
        "blame",
        "bland",
        "blank",
        "blare",
        "blast",
        "blaze",
        "bleak",
        "bleat",
        "bleed",
        "bleep",
        "blend",
        "bless",
        "blimp",
        "blind",
        "blink",
        "bliss",
        "blitz",
        "bloat",
        "block",
        "bloke",
        "blond",
        "blood",
        "bloom",
        "blown",
        "bluer",
        "bluff",
        "blunt",
        "blurb",
        "blurt",
        "blush",
        "board",
        "boast",
        "bobby",
        "boney",
        "bongo",
        "bonus",
        "booby",
        "boost",
        "booth",
        "booty",
        "booze",
        "boozy",
        "borax",
        "borne",
        "bosom",
        "bossy",
        "botch",
        "bough",
        "boule",
        "bound",
        "bowel",
        "boxer",
        "brace",
        "braid",
        "brain",
        "brake",
        "brand",
        "brash",
        "brass",
        "brave",
        "bravo",
        "brawl",
        "brawn",
        "bread",
        "break",
        "breed",
        "briar",
        "bribe",
        "brick",
        "bride",
        "brief",
        "brine",
        "bring",
        "brink",
        "briny",
        "brisk",
        "broad",
        "broil",
        "broke",
        "brood",
        "brook",
        "broom",
        "broth",
        "brown",
        "brunt",
        "brush",
        "brute",
        "buddy",
        "budge",
        "buggy",
        "bugle",
        "build",
        "built",
        "bulge",
        "bulky",
        "bully",
        "bunch",
        "bunny",
        "burly",
        "burnt",
        "burst",
        "bused",
        "bushy",
        "butch",
        "butte",
        "buxom",
        "buyer",
        "bylaw",
        "cabal",
        "cabby",
        "cabin",
        "cable",
        "cacao",
        "cache",
        "cacti",
        "caddy",
        "cadet",
        "cagey",
        "cairn",
        "camel",
        "cameo",
        "canal",
        "candy",
        "canny",
        "canoe",
        "canon",
        "caper",
        "caput",
        "carat",
        "cargo",
        "carol",
        "carry",
        "carve",
        "caste",
        "catch",
        "cater",
        "catty",
        "caulk",
        "cause",
        "cavil",
        "cease",
        "cedar",
        "cello",
        "chafe",
        "chaff",
        "chain",
        "chair",
        "chalk",
        "champ",
        "chant",
        "chaos",
        "chard",
        "charm",
        "chart",
        "chase",
        "chasm",
        "cheap",
        "cheat",
        "check",
        "cheek",
        "cheer",
        "chess",
        "chest",
        "chick",
        "chide",
        "chief",
        "child",
        "chili",
        "chill",
        "chime",
        "china",
        "chirp",
        "chock",
        "choir",
        "choke",
        "chord",
        "chore",
        "chose",
        "chuck",
        "chump",
        "chunk",
        "churn",
        "chute",
        "cider",
        "cigar",
        "cinch",
        "circa",
        "civic",
        "civil",
        "clack",
        "claim",
        "clamp",
        "clang",
        "clank",
        "clash",
        "clasp",
        "class",
        "clean",
        "clear",
        "cleat",
        "cleft",
        "clerk",
        "click",
        "cliff",
        "climb",
        "cling",
        "clink",
        "cloak",
        "clock",
        "clone",
        "close",
        "cloth",
        "cloud",
        "clout",
        "clove",
        "clown",
        "cluck",
        "clued",
        "clump",
        "clung",
        "coach",
        "coast",
        "cobra",
        "cocoa",
        "colon",
        "color",
        "comet",
        "comfy",
        "comic",
        "comma",
        "conch",
        "condo",
        "conic",
        "copse",
        "coral",
        "corer",
        "corny",
        "couch",
        "cough",
        "could",
        "count",
        "coupe",
        "court",
        "coven",
        "cover",
        "covet",
        "covey",
        "cower",
        "coyly",
        "crack",
        "craft",
        "cramp",
        "crane",
        "crank",
        "crash",
        "crass",
        "crate",
        "crave",
        "crawl",
        "craze",
        "crazy",
        "creak",
        "cream",
        "credo",
        "creed",
        "creek",
        "creep",
        "creme",
        "crepe",
        "crept",
        "cress",
        "crest",
        "crick",
        "cried",
        "crier",
        "crime",
        "crimp",
        "crisp",
        "croak",
        "crock",
        "crone",
        "crony",
        "crook",
        "cross",
        "croup",
        "crowd",
        "crown",
        "crude",
        "cruel",
        "crumb",
        "crump",
        "crush",
        "crust",
        "crypt",
        "cubic",
        "cumin",
        "curio",
        "curly",
        "curry",
        "curse",
        "curve",
        "curvy",
        "cutie",
        "cyber",
        "cycle",
        "cynic",
        "daddy",
        "daily",
        "dairy",
        "daisy",
        "dally",
        "dance",
        "dandy",
        "datum",
        "daunt",
        "dealt",
        "death",
        "debar",
        "debit",
        "debug",
        "debut",
        "decal",
        "decay",
        "decor",
        "decoy",
        "decry",
        "defer",
        "deign",
        "deity",
        "delay",
        "delta",
        "delve",
        "demon",
        "demur",
        "denim",
        "dense",
        "depot",
        "depth",
        "derby",
        "deter",
        "detox",
        "deuce",
        "devil",
        "diary",
        "dicey",
        "digit",
        "dilly",
        "dimly",
        "diner",
        "dingo",
        "dingy",
        "diode",
        "dirge",
        "dirty",
        "disco",
        "ditch",
        "ditto",
        "ditty",
        "diver",
        "dizzy",
        "dodge",
        "dodgy",
        "dogma",
        "doing",
        "dolly",
        "donor",
        "donut",
        "dopey",
        "doubt",
        "dough",
        "dowdy",
        "dowel",
        "downy",
        "dowry",
        "dozen",
        "draft",
        "drain",
        "drake",
        "drama",
        "drank",
        "drape",
        "drawl",
        "drawn",
        "dread",
        "dream",
        "dress",
        "dried",
        "drier",
        "drift",
        "drill",
        "drink",
        "drive",
        "droit",
        "droll",
        "drone",
        "drool",
        "droop",
        "dross",
        "drove",
        "drown",
        "druid",
        "drunk",
        "dryer",
        "dryly",
        "duchy",
        "dully",
        "dummy",
        "dumpy",
        "dunce",
        "dusky",
        "dusty",
        "dutch",
        "duvet",
        "dwarf",
        "dwell",
        "dwelt",
        "dying",
        "eager",
        "eagle",
        "early",
        "earth",
        "easel",
        "eaten",
        "eater",
        "ebony",
        "eclat",
        "edict",
        "edify",
        "eerie",
        "egret",
        "eight",
        "eject",
        "eking",
        "elate",
        "elbow",
        "elder",
        "elect",
        "elegy",
        "elfin",
        "elide",
        "elite",
        "elope",
        "elude",
        "email",
        "embed",
        "ember",
        "emcee",
        "empty",
        "enact",
        "endow",
        "enema",
        "enemy",
        "enjoy",
        "ennui",
        "ensue",
        "enter",
        "entry",
        "envoy",
        "epoch",
        "epoxy",
        "equal",
        "equip",
        "erase",
        "erect",
        "erode",
        "error",
        "erupt",
        "essay",
        "ester",
        "ether",
        "ethic",
        "ethos",
        "etude",
        "evade",
        "event",
        "every",
        "evict",
        "evoke",
        "exact",
        "exalt",
        "excel",
        "exert",
        "exile",
        "exist",
        "expel",
        "extol",
        "extra",
        "exult",
        "eying",
        "fable",
        "facet",
        "faint",
        "fairy",
        "faith",
        "false",
        "fancy",
        "fanny",
        "farce",
        "fatal",
        "fatty",
        "fault",
        "fauna",
        "favor",
        "feast",
        "fecal",
        "feign",
        "fella",
        "felon",
        "femme",
        "femur",
        "fence",
        "feral",
        "ferry",
        "fetal",
        "fetch",
        "fetid",
        "fetus",
        "fever",
        "fewer",
        "fiber",
        "ficus",
        "field",
        "fiend",
        "fiery",
        "fifth",
        "fifty",
        "fight",
        "filer",
        "filet",
        "filly",
        "filmy",
        "filth",
        "final",
        "finch",
        "finer",
        "first",
        "fishy",
        "fixer",
        "fizzy",
        "fjord",
        "flack",
        "flail",
        "flair",
        "flake",
        "flaky",
        "flame",
        "flank",
        "flare",
        "flash",
        "flask",
        "fleck",
        "fleet",
        "flesh",
        "flick",
        "flier",
        "fling",
        "flint",
        "flirt",
        "float",
        "flock",
        "flood",
        "floor",
        "flora",
        "floss",
        "flour",
        "flout",
        "flown",
        "fluff",
        "fluid",
        "fluke",
        "flume",
        "flung",
        "flunk",
        "flush",
        "flute",
        "flyer",
        "foamy",
        "focal",
        "focus",
        "foggy",
        "foist",
        "folio",
        "folly",
        "foray",
        "force",
        "forge",
        "forgo",
        "forte",
        "forth",
        "forty",
        "forum",
        "found",
        "foyer",
        "frail",
        "frame",
        "frank",
        "fraud",
        "freak",
        "freed",
        "freer",
        "fresh",
        "friar",
        "fried",
        "frill",
        "frisk",
        "fritz",
        "frock",
        "frond",
        "front",
        "frost",
        "froth",
        "frown",
        "froze",
        "fruit",
        "fudge",
        "fugue",
        "fully",
        "fungi",
        "funky",
        "funny",
        "furor",
        "furry",
        "fussy",
        "fuzzy",
        "gaffe",
        "gaily",
        "gamer",
        "gamma",
        "gamut",
        "gassy",
        "gaudy",
        "gauge",
        "gaunt",
        "gauze",
        "gavel",
        "gawky",
        "gayer",
        "gayly",
        "gazer",
        "gecko",
        "geeky",
        "geese",
        "genie",
        "genre",
        "ghost",
        "ghoul",
        "giant",
        "giddy",
        "gipsy",
        "girly",
        "girth",
        "given",
        "giver",
        "glade",
        "gland",
        "glare",
        "glass",
        "glaze",
        "gleam",
        "glean",
        "glide",
        "glint",
        "gloat",
        "globe",
        "gloom",
        "glory",
        "gloss",
        "glove",
        "glyph",
        "gnash",
        "gnome",
        "godly",
        "going",
        "golem",
        "golly",
        "gonad",
        "goner",
        "goody",
        "gooey",
        "goofy",
        "goose",
        "gorge",
        "gouge",
        "gourd",
        "grace",
        "grade",
        "graft",
        "grail",
        "grain",
        "grand",
        "grant",
        "grape",
        "graph",
        "grasp",
        "grass",
        "grate",
        "grave",
        "gravy",
        "graze",
        "great",
        "greed",
        "green",
        "greet",
        "grief",
        "grill",
        "grime",
        "grimy",
        "grind",
        "gripe",
        "groan",
        "groin",
        "groom",
        "grope",
        "gross",
        "group",
        "grout",
        "grove",
        "growl",
        "grown",
        "gruel",
        "gruff",
        "grunt",
        "guard",
        "guava",
        "guess",
        "guest",
        "guide",
        "guild",
        "guile",
        "guilt",
        "guise",
        "gulch",
        "gully",
        "gumbo",
        "gummy",
        "guppy",
        "gusto",
        "gusty",
        "gypsy",
        "habit",
        "hairy",
        "halve",
        "handy",
        "happy",
        "hardy",
        "harem",
        "harpy",
        "harry",
        "harsh",
        "haste",
        "hasty",
        "hatch",
        "hater",
        "haunt",
        "haute",
        "haven",
        "havoc",
        "hazel",
        "heady",
        "heard",
        "heart",
        "heath",
        "heave",
        "heavy",
        "hedge",
        "hefty",
        "heist",
        "helix",
        "hello",
        "hence",
        "heron",
        "hilly",
        "hinge",
        "hippo",
        "hippy",
        "hitch",
        "hoard",
        "hobby",
        "hoist",
        "holly",
        "homer",
        "honey",
        "honor",
        "horde",
        "horny",
        "horse",
        "hotel",
        "hotly",
        "hound",
        "house",
        "hovel",
        "hover",
        "howdy",
        "human",
        "humid",
        "humor",
        "humph",
        "humus",
        "hunch",
        "hunky",
        "hurry",
        "husky",
        "hussy",
        "hutch",
        "hydro",
        "hyena",
        "hymen",
        "hyper",
        "icily",
        "icing",
        "ideal",
        "idiom",
        "idiot",
        "idler",
        "idyll",
        "igloo",
        "iliac",
        "image",
        "imbue",
        "impel",
        "imply",
        "inane",
        "inbox",
        "incur",
        "index",
        "inept",
        "inert",
        "infer",
        "ingot",
        "inlay",
        "inlet",
        "inner",
        "input",
        "inter",
        "intro",
        "ionic",
        "irate",
        "irony",
        "islet",
        "issue",
        "itchy",
        "ivory",
        "jaunt",
        "jazzy",
        "jelly",
        "jerky",
        "jetty",
        "jewel",
        "jiffy",
        "joint",
        "joist",
        "joker",
        "jolly",
        "joust",
        "judge",
        "juice",
        "juicy",
        "jumbo",
        "jumpy",
        "junta",
        "junto",
        "juror",
        "kappa",
        "karma",
        "kayak",
        "kebab",
        "khaki",
        "kinky",
        "kiosk",
        "kitty",
        "knack",
        "knave",
        "knead",
        "kneed",
        "kneel",
        "knelt",
        "knife",
        "knock",
        "knoll",
        "known",
        "koala",
        "krill",
        "label",
        "labor",
        "laden",
        "ladle",
        "lager",
        "lance",
        "lanky",
        "lapel",
        "lapse",
        "large",
        "larva",
        "lasso",
        "latch",
        "later",
        "lathe",
        "latte",
        "laugh",
        "layer",
        "leach",
        "leafy",
        "leaky",
        "leant",
        "leapt",
        "learn",
        "lease",
        "leash",
        "least",
        "leave",
        "ledge",
        "leech",
        "leery",
        "lefty",
        "legal",
        "leggy",
        "lemon",
        "lemur",
        "leper",
        "level",
        "lever",
        "libel",
        "liege",
        "light",
        "liken",
        "lilac",
        "limbo",
        "limit",
        "linen",
        "liner",
        "lingo",
        "lipid",
        "lithe",
        "liver",
        "livid",
        "llama",
        "loamy",
        "loath",
        "lobby",
        "local",
        "locus",
        "lodge",
        "lofty",
        "logic",
        "login",
        "loopy",
        "loose",
        "lorry",
        "loser",
        "louse",
        "lousy",
        "lover",
        "lower",
        "lowly",
        "loyal",
        "lucid",
        "lucky",
        "lumen",
        "lumpy",
        "lunar",
        "lunch",
        "lunge",
        "lupus",
        "lurch",
        "lurid",
        "lusty",
        "lying",
        "lymph",
        "lyric",
        "macaw",
        "macho",
        "macro",
        "madam",
        "madly",
        "mafia",
        "magic",
        "magma",
        "maize",
        "major",
        "maker",
        "mambo",
        "mamma",
        "mammy",
        "manga",
        "mange",
        "mango",
        "mangy",
        "mania",
        "manic",
        "manly",
        "manor",
        "maple",
        "march",
        "marry",
        "marsh",
        "mason",
        "masse",
        "match",
        "matey",
        "mauve",
        "maxim",
        "maybe",
        "mayor",
        "mealy",
        "meant",
        "meaty",
        "mecca",
        "medal",
        "media",
        "medic",
        "melee",
        "melon",
        "mercy",
        "merge",
        "merit",
        "merry",
        "metal",
        "meter",
        "metro",
        "micro",
        "midge",
        "midst",
        "might",
        "milky",
        "mimic",
        "mince",
        "miner",
        "minim",
        "minor",
        "minty",
        "minus",
        "mirth",
        "miser",
        "missy",
        "mocha",
        "modal",
        "model",
        "modem",
        "mogul",
        "moist",
        "molar",
        "moldy",
        "money",
        "month",
        "moody",
        "moose",
        "moral",
        "moron",
        "morph",
        "mossy",
        "motel",
        "motif",
        "motor",
        "motto",
        "moult",
        "mound",
        "mount",
        "mourn",
        "mouse",
        "mouth",
        "mover",
        "movie",
        "mower",
        "mucky",
        "mucus",
        "muddy",
        "mulch",
        "mummy",
        "munch",
        "mural",
        "murky",
        "mushy",
        "music",
        "musky",
        "musty",
        "myrrh",
        "nadir",
        "naive",
        "nanny",
        "nasal",
        "nasty",
        "natal",
        "naval",
        "navel",
        "needy",
        "neigh",
        "nerdy",
        "nerve",
        "never",
        "newer",
        "newly",
        "nicer",
        "niche",
        "niece",
        "night",
        "ninja",
        "ninny",
        "ninth",
        "noble",
        "nobly",
        "noise",
        "noisy",
        "nomad",
        "noose",
        "north",
        "nosey",
        "notch",
        "novel",
        "nudge",
        "nurse",
        "nutty",
        "nylon",
        "nymph",
        "oaken",
        "obese",
        "occur",
        "ocean",
        "octal",
        "octet",
        "odder",
        "oddly",
        "offal",
        "offer",
        "often",
        "olden",
        "older",
        "olive",
        "ombre",
        "omega",
        "onion",
        "onset",
        "opera",
        "opine",
        "opium",
        "optic",
        "orbit",
        "order",
        "organ",
        "other",
        "otter",
        "ought",
        "ounce",
        "outdo",
        "outer",
        "outgo",
        "ovary",
        "ovate",
        "overt",
        "ovine",
        "ovoid",
        "owing",
        "owner",
        "oxide",
        "ozone",
        "paddy",
        "pagan",
        "paint",
        "paler",
        "palsy",
        "panel",
        "panic",
        "pansy",
        "papal",
        "paper",
        "parer",
        "parka",
        "parry",
        "parse",
        "party",
        "pasta",
        "paste",
        "pasty",
        "patch",
        "patio",
        "patsy",
        "patty",
        "pause",
        "payee",
        "payer",
        "peace",
        "peach",
        "pearl",
        "pecan",
        "pedal",
        "penal",
        "pence",
        "penne",
        "penny",
        "perch",
        "peril",
        "perky",
        "pesky",
        "pesto",
        "petal",
        "petty",
        "phase",
        "phone",
        "phony",
        "photo",
        "piano",
        "picky",
        "piece",
        "piety",
        "piggy",
        "pilot",
        "pinch",
        "piney",
        "pinky",
        "pinto",
        "piper",
        "pique",
        "pitch",
        "pithy",
        "pivot",
        "pixel",
        "pixie",
        "pizza",
        "place",
        "plaid",
        "plain",
        "plait",
        "plane",
        "plank",
        "plant",
        "plate",
        "plaza",
        "plead",
        "pleat",
        "plied",
        "plier",
        "pluck",
        "plumb",
        "plume",
        "plump",
        "plunk",
        "plush",
        "poesy",
        "point",
        "poise",
        "poker",
        "polar",
        "polka",
        "polyp",
        "pooch",
        "poppy",
        "porch",
        "poser",
        "posit",
        "posse",
        "pouch",
        "pound",
        "pouty",
        "power",
        "prank",
        "prawn",
        "preen",
        "press",
        "price",
        "prick",
        "pride",
        "pried",
        "prime",
        "primo",
        "print",
        "prior",
        "prism",
        "privy",
        "prize",
        "probe",
        "prone",
        "prong",
        "proof",
        "prose",
        "proud",
        "prove",
        "prowl",
        "proxy",
        "prude",
        "prune",
        "psalm",
        "pubic",
        "pudgy",
        "puffy",
        "pulpy",
        "pulse",
        "punch",
        "pupil",
        "puppy",
        "puree",
        "purer",
        "purge",
        "purse",
        "pushy",
        "putty",
        "pygmy",
        "quack",
        "quail",
        "quake",
        "qualm",
        "quark",
        "quart",
        "quash",
        "quasi",
        "queen",
        "queer",
        "quell",
        "query",
        "quest",
        "queue",
        "quick",
        "quiet",
        "quill",
        "quilt",
        "quirk",
        "quite",
        "quota",
        "quote",
        "quoth",
        "rabbi",
        "rabid",
        "racer",
        "radar",
        "radii",
        "radio",
        "rainy",
        "raise",
        "rajah",
        "rally",
        "ralph",
        "ramen",
        "ranch",
        "randy",
        "range",
        "rapid",
        "rarer",
        "raspy",
        "ratio",
        "ratty",
        "raven",
        "rayon",
        "razor",
        "reach",
        "react",
        "ready",
        "realm",
        "rearm",
        "rebar",
        "rebel",
        "rebus",
        "rebut",
        "recap",
        "recur",
        "recut",
        "reedy",
        "refer",
        "refit",
        "regal",
        "rehab",
        "reign",
        "relax",
        "relay",
        "relic",
        "remit",
        "renal",
        "renew",
        "repay",
        "repel",
        "reply",
        "rerun",
        "reset",
        "resin",
        "retch",
        "retro",
        "retry",
        "reuse",
        "revel",
        "revue",
        "rhino",
        "rhyme",
        "rider",
        "ridge",
        "rifle",
        "right",
        "rigid",
        "rigor",
        "rinse",
        "ripen",
        "riper",
        "risen",
        "riser",
        "risky",
        "rival",
        "river",
        "rivet",
        "roach",
        "roast",
        "robin",
        "robot",
        "rocky",
        "rodeo",
        "roger",
        "rogue",
        "roomy",
        "roost",
        "rotor",
        "rouge",
        "rough",
        "round",
        "rouse",
        "route",
        "rover",
        "rowdy",
        "rower",
        "royal",
        "ruddy",
        "ruder",
        "rugby",
        "ruler",
        "rumba",
        "rumor",
        "rupee",
        "rural",
        "rusty",
        "sadly",
        "safer",
        "saint",
        "salad",
        "sally",
        "salon",
        "salsa",
        "salty",
        "salve",
        "salvo",
        "sandy",
        "saner",
        "sappy",
        "sassy",
        "satin",
        "satyr",
        "sauce",
        "saucy",
        "sauna",
        "saute",
        "savor",
        "savoy",
        "savvy",
        "scald",
        "scale",
        "scalp",
        "scaly",
        "scamp",
        "scant",
        "scare",
        "scarf",
        "scary",
        "scene",
        "scent",
        "scion",
        "scoff",
        "scold",
        "scone",
        "scoop",
        "scope",
        "score",
        "scorn",
        "scour",
        "scout",
        "scowl",
        "scram",
        "scrap",
        "scree",
        "screw",
        "scrub",
        "scrum",
        "scuba",
        "sedan",
        "seedy",
        "segue",
        "seize",
        "semen",
        "sense",
        "sepia",
        "serif",
        "serum",
        "serve",
        "setup",
        "seven",
        "sever",
        "sewer",
        "shack",
        "shade",
        "shady",
        "shaft",
        "shake",
        "shaky",
        "shale",
        "shall",
        "shalt",
        "shame",
        "shank",
        "shape",
        "shard",
        "share",
        "shark",
        "sharp",
        "shave",
        "shawl",
        "shear",
        "sheen",
        "sheep",
        "sheer",
        "sheet",
        "sheik",
        "shelf",
        "shell",
        "shied",
        "shift",
        "shine",
        "shiny",
        "shire",
        "shirk",
        "shirt",
        "shoal",
        "shock",
        "shone",
        "shook",
        "shoot",
        "shore",
        "shorn",
        "short",
        "shout",
        "shove",
        "shown",
        "showy",
        "shrew",
        "shrub",
        "shrug",
        "shuck",
        "shunt",
        "shush",
        "shyly",
        "siege",
        "sieve",
        "sight",
        "sigma",
        "silky",
        "silly",
        "since",
        "sinew",
        "singe",
        "siren",
        "sissy",
        "sixth",
        "sixty",
        "skate",
        "skier",
        "skiff",
        "skill",
        "skimp",
        "skirt",
        "skulk",
        "skull",
        "skunk",
        "slack",
        "slain",
        "slang",
        "slant",
        "slash",
        "slate",
        "sleek",
        "sleep",
        "sleet",
        "slept",
        "slice",
        "slick",
        "slide",
        "slime",
        "slimy",
        "sling",
        "slink",
        "sloop",
        "slope",
        "slosh",
        "sloth",
        "slump",
        "slung",
        "slunk",
        "slurp",
        "slush",
        "slyly",
        "smack",
        "small",
        "smart",
        "smash",
        "smear",
        "smell",
        "smelt",
        "smile",
        "smirk",
        "smite",
        "smith",
        "smock",
        "smoke",
        "smoky",
        "smote",
        "snack",
        "snail",
        "snake",
        "snaky",
        "snare",
        "snarl",
        "sneak",
        "sneer",
        "snide",
        "sniff",
        "snipe",
        "snoop",
        "snore",
        "snort",
        "snout",
        "snowy",
        "snuck",
        "snuff",
        "soapy",
        "sober",
        "soggy",
        "solar",
        "solid",
        "solve",
        "sonar",
        "sonic",
        "sooth",
        "sooty",
        "sorry",
        "sound",
        "south",
        "sower",
        "space",
        "spade",
        "spank",
        "spare",
        "spark",
        "spasm",
        "spawn",
        "speak",
        "spear",
        "speck",
        "speed",
        "spell",
        "spelt",
        "spend",
        "spent",
        "sperm",
        "spice",
        "spicy",
        "spied",
        "spiel",
        "spike",
        "spiky",
        "spill",
        "spilt",
        "spine",
        "spiny",
        "spire",
        "spite",
        "splat",
        "split",
        "spoil",
        "spoke",
        "spoof",
        "spook",
        "spool",
        "spoon",
        "spore",
        "sport",
        "spout",
        "spray",
        "spree",
        "sprig",
        "spunk",
        "spurn",
        "spurt",
        "squad",
        "squat",
        "squib",
        "stack",
        "staff",
        "stage",
        "staid",
        "stain",
        "stair",
        "stake",
        "stale",
        "stalk",
        "stall",
        "stamp",
        "stand",
        "stank",
        "stare",
        "stark",
        "start",
        "stash",
        "state",
        "stave",
        "stead",
        "steak",
        "steal",
        "steam",
        "steed",
        "steel",
        "steep",
        "steer",
        "stein",
        "stern",
        "stick",
        "stiff",
        "still",
        "stilt",
        "sting",
        "stink",
        "stint",
        "stock",
        "stoic",
        "stoke",
        "stole",
        "stomp",
        "stone",
        "stony",
        "stood",
        "stool",
        "stoop",
        "store",
        "stork",
        "storm",
        "story",
        "stout",
        "stove",
        "strap",
        "straw",
        "stray",
        "strip",
        "strut",
        "stuck",
        "study",
        "stuff",
        "stump",
        "stung",
        "stunk",
        "stunt",
        "style",
        "suave",
        "sugar",
        "suing",
        "suite",
        "sulky",
        "sully",
        "sumac",
        "sunny",
        "super",
        "surer",
        "surge",
        "surly",
        "sushi",
        "swami",
        "swamp",
        "swarm",
        "swash",
        "swath",
        "swear",
        "sweat",
        "sweep",
        "sweet",
        "swell",
        "swept",
        "swift",
        "swill",
        "swine",
        "swing",
        "swirl",
        "swish",
        "swoon",
        "swoop",
        "sword",
        "swore",
        "sworn",
        "swung",
        "synod",
        "syrup",
        "tabby",
        "table",
        "taboo",
        "tacit",
        "tacky",
        "taffy",
        "taint",
        "taken",
        "taker",
        "tally",
        "talon",
        "tamer",
        "tango",
        "tangy",
        "taper",
        "tapir",
        "tardy",
        "tarot",
        "taste",
        "tasty",
        "tatty",
        "taunt",
        "tawny",
        "teach",
        "teary",
        "tease",
        "teddy",
        "teeth",
        "tempo",
        "tenet",
        "tenor",
        "tense",
        "tenth",
        "tepee",
        "tepid",
        "terra",
        "terse",
        "testy",
        "thank",
        "theft",
        "their",
        "theme",
        "there",
        "these",
        "theta",
        "thick",
        "thief",
        "thigh",
        "thing",
        "think",
        "third",
        "thong",
        "thorn",
        "those",
        "three",
        "threw",
        "throb",
        "throw",
        "thrum",
        "thumb",
        "thump",
        "thyme",
        "tiara",
        "tibia",
        "tidal",
        "tiger",
        "tight",
        "tilde",
        "timer",
        "timid",
        "tipsy",
        "titan",
        "tithe",
        "title",
        "toast",
        "today",
        "toddy",
        "token",
        "tonal",
        "tonga",
        "tonic",
        "tooth",
        "topaz",
        "topic",
        "torch",
        "torso",
        "torus",
        "total",
        "totem",
        "touch",
        "tough",
        "towel",
        "tower",
        "toxic",
        "toxin",
        "trace",
        "track",
        "tract",
        "trade",
        "trail",
        "train",
        "trait",
        "tramp",
        "trash",
        "trawl",
        "tread",
        "treat",
        "trend",
        "triad",
        "trial",
        "tribe",
        "trice",
        "trick",
        "tried",
        "tripe",
        "trite",
        "troll",
        "troop",
        "trope",
        "trout",
        "trove",
        "truce",
        "truck",
        "truer",
        "truly",
        "trump",
        "trunk",
        "truss",
        "trust",
        "truth",
        "tryst",
        "tubal",
        "tuber",
        "tulip",
        "tulle",
        "tumor",
        "tunic",
        "turbo",
        "tutor",
        "twang",
        "tweak",
        "tweed",
        "tweet",
        "twice",
        "twine",
        "twirl",
        "twist",
        "twixt",
        "tying",
        "udder",
        "ulcer",
        "ultra",
        "umbra",
        "uncle",
        "uncut",
        "under",
        "undid",
        "undue",
        "unfed",
        "unfit",
        "unify",
        "union",
        "unite",
        "unity",
        "unlit",
        "unmet",
        "unset",
        "untie",
        "until",
        "unwed",
        "unzip",
        "upper",
        "upset",
        "urban",
        "urine",
        "usage",
        "usher",
        "using",
        "usual",
        "usurp",
        "utile",
        "utter",
        "vague",
        "valet",
        "valid",
        "valor",
        "value",
        "valve",
        "vapid",
        "vapor",
        "vault",
        "vaunt",
        "vegan",
        "venom",
        "venue",
        "verge",
        "verse",
        "verso",
        "verve",
        "vicar",
        "video",
        "vigil",
        "vigor",
        "villa",
        "vinyl",
        "viola",
        "viper",
        "viral",
        "virus",
        "visit",
        "visor",
        "vista",
        "vital",
        "vivid",
        "vixen",
        "vocal",
        "vodka",
        "vogue",
        "voice",
        "voila",
        "vomit",
        "voter",
        "vouch",
        "vowel",
        "vying",
        "wacky",
        "wafer",
        "wager",
        "wagon",
        "waist",
        "waive",
        "waltz",
        "warty",
        "waste",
        "watch",
        "water",
        "waver",
        "waxen",
        "weary",
        "weave",
        "wedge",
        "weedy",
        "weigh",
        "weird",
        "welch",
        "welsh",
        "whack",
        "whale",
        "wharf",
        "wheat",
        "wheel",
        "whelp",
        "where",
        "which",
        "whiff",
        "while",
        "whine",
        "whiny",
        "whirl",
        "whisk",
        "white",
        "whole",
        "whoop",
        "whose",
        "widen",
        "wider",
        "widow",
        "width",
        "wield",
        "wight",
        "willy",
        "wimpy",
        "wince",
        "winch",
        "windy",
        "wiser",
        "wispy",
        "witch",
        "witty",
        "woken",
        "woman",
        "women",
        "woody",
        "wooer",
        "wooly",
        "woozy",
        "wordy",
        "world",
        "worry",
        "worse",
        "worst",
        "worth",
        "would",
        "wound",
        "woven",
        "wrack",
        "wrath",
        "wreak",
        "wreck",
        "wrest",
        "wring",
        "wrist",
        "write",
        "wrong",
        "wrote",
        "wrung",
        "wryly",
        "yacht",
        "yearn",
        "yeast",
        "yield",
        "young",
        "youth",
        "zebra",
        "zesty",
        "zonal"
        
    ];

    /* src\App.svelte generated by Svelte v3.48.0 */
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

    // (135:3) {#each row as letter, j}
    function create_each_block_3(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[6].call(input, /*i*/ ctx[23], /*j*/ ctx[25]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*i*/ ctx[23], /*j*/ ctx[25]);
    	}

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[8](/*i*/ ctx[23], /*j*/ ctx[25], ...args);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "id", /*i*/ ctx[23].toString().concat(/*j*/ ctx[25].toString()));
    			attr_dev(input, "maxlength", "1");
    			attr_dev(input, "class", "letterbox svelte-kxi75n");
    			add_location(input, file, 135, 4, 5182);
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
    		source: "(135:3) {#each row as letter, j}",
    		ctx
    	});

    	return block;
    }

    // (133:1) {#each letters as row, i}
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
    			attr_dev(div, "class", "row svelte-kxi75n");
    			add_location(div, file, 133, 2, 5132);
    			add_location(br, file, 144, 2, 5427);
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
    		source: "(133:1) {#each letters as row, i}",
    		ctx
    	});

    	return block;
    }

    // (148:1) {#if filteredWords && filteredWords.length > 0}
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
    			add_location(span, file, 148, 2, 5493);
    			add_location(br, file, 148, 37, 5528);
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
    		source: "(148:1) {#if filteredWords && filteredWords.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (153:3) {#each word as letter}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*letter*/ ctx[18] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "letterbox svelte-kxi75n");
    			add_location(div, file, 153, 4, 5625);
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
    		source: "(153:3) {#each word as letter}",
    		ctx
    	});

    	return block;
    }

    // (150:2) {#each displayedWords as word}
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
    			add_location(br, file, 150, 3, 5569);
    			attr_dev(div, "class", "row svelte-kxi75n");
    			add_location(div, file, 151, 3, 5577);
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
    		source: "(150:2) {#each displayedWords as word}",
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
    			attr_dev(main, "class", "svelte-kxi75n");
    			add_location(main, file, 131, 0, 5096);
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
    	let words = wordsLengthFive;
    	let filteredWords = words;
    	let displayedWords;
    	let wordLength = 5;
    	let nrOfRows = 6;
    	let letters = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(""));
    	let filters = Array(nrOfRows).fill([]).map(() => Array(wordLength).fill(Filters.noFilter));

    	// onMount(async () => {
    	//     // const response = await fetch("https://github.com/mrtnnrdlnd/wurdalurd/blob/main/public/words.json");
    	// 	const response = await fetch("words.json");
    	//     words = await response.json() as string[];
    	// 	filteredWords = words;
    	// });
    	function toggleFilter(row, column) {
    		let backgroundColor = "";

    		if (filters[row][column] == Filters.noFilter) {
    			$$invalidate(5, filters[row][column] = Filters.notInWord, filters);
    			backgroundColor = "lightgray";
    		} else if (filters[row][column] == Filters.notInWord) {
    			$$invalidate(5, filters[row][column] = Filters.wrongPosition, filters);
    			backgroundColor = "orange";
    		} else if (filters[row][column] == Filters.wrongPosition) {
    			$$invalidate(5, filters[row][column] = Filters.rightPosition, filters);
    			backgroundColor = "lightgreen";
    		} else {
    			$$invalidate(5, filters[row][column] = Filters.noFilter, filters);
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

    		if (inputEvent.data == null) {
    			$$invalidate(5, filters[i][j] = Filters.noFilter, filters);
    			document.getElementById(i.toString().concat(j)).style.backgroundColor = "";
    		} else if (alphabet.includes(inputEvent.data.toLocaleLowerCase())) {
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler(i, j) {
    		letters[i][j] = this.value;
    		$$invalidate(1, letters);
    	}

    	const click_handler = (i, j) => toggleFilter(i, j);
    	const input_handler = (i, j, e) => handleInput(e, i, j);

    	$$self.$capture_state = () => ({
    		Filters,
    		wordsLengthFive,
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
    		if ('words' in $$props) $$invalidate(9, words = $$props.words);
    		if ('filteredWords' in $$props) $$invalidate(0, filteredWords = $$props.filteredWords);
    		if ('displayedWords' in $$props) $$invalidate(2, displayedWords = $$props.displayedWords);
    		if ('wordLength' in $$props) $$invalidate(10, wordLength = $$props.wordLength);
    		if ('nrOfRows' in $$props) $$invalidate(11, nrOfRows = $$props.nrOfRows);
    		if ('letters' in $$props) $$invalidate(1, letters = $$props.letters);
    		if ('filters' in $$props) $$invalidate(5, filters = $$props.filters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*letters, filters*/ 34) {
    			{
    				$$invalidate(0, filteredWords = words.filter(w => {
    					for (let row = 0; row < nrOfRows; row++) {
    						for (let column = 0; column < wordLength; column++) {
    							if (letters[row][column] != "" && !filters[row][column](w, letters[row][column].toLocaleLowerCase(), column)) {
    								return false;
    							}
    						}
    					}

    					return true;
    				}));
    			}
    		}

    		if ($$self.$$.dirty & /*filteredWords*/ 1) {
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
