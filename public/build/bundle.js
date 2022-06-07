
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

    const wordsLengthFive = [
        "cigar",
        "rebut",
        "sissy",
        "humph",
        "awake",
        "blush",
        "focal",
        "evade",
        "naval",
        "serve",
        "heath",
        "dwarf",
        "model",
        "karma",
        "stink",
        "grade",
        "quiet",
        "bench",
        "abate",
        "feign",
        "major",
        "death",
        "fresh",
        "crust",
        "stool",
        "colon",
        "abase",
        "marry",
        "react",
        "batty",
        "pride",
        "floss",
        "helix",
        "croak",
        "staff",
        "paper",
        "unfed",
        "whelp",
        "trawl",
        "outdo",
        "adobe",
        "crazy",
        "sower",
        "repay",
        "digit",
        "crate",
        "cluck",
        "spike",
        "mimic",
        "pound",
        "maxim",
        "linen",
        "unmet",
        "flesh",
        "booby",
        "forth",
        "first",
        "stand",
        "belly",
        "ivory",
        "seedy",
        "print",
        "yearn",
        "drain",
        "bribe",
        "stout",
        "panel",
        "crass",
        "flume",
        "offal",
        "agree",
        "error",
        "swirl",
        "argue",
        "bleed",
        "delta",
        "flick",
        "totem",
        "wooer",
        "front",
        "shrub",
        "parry",
        "biome",
        "lapel",
        "start",
        "greet",
        "goner",
        "golem",
        "lusty",
        "loopy",
        "round",
        "audit",
        "lying",
        "gamma",
        "labor",
        "islet",
        "civic",
        "forge",
        "corny",
        "moult",
        "basic",
        "salad",
        "agate",
        "spicy",
        "spray",
        "essay",
        "fjord",
        "spend",
        "kebab",
        "guild",
        "aback",
        "motor",
        "alone",
        "hatch",
        "hyper",
        "thumb",
        "dowry",
        "ought",
        "belch",
        "dutch",
        "pilot",
        "tweed",
        "comet",
        "jaunt",
        "enema",
        "steed",
        "abyss",
        "growl",
        "fling",
        "dozen",
        "boozy",
        "erode",
        "world",
        "gouge",
        "click",
        "briar",
        "great",
        "altar",
        "pulpy",
        "blurt",
        "coast",
        "duchy",
        "groin",
        "fixer",
        "group",
        "rogue",
        "badly",
        "smart",
        "pithy",
        "gaudy",
        "chill",
        "heron",
        "vodka",
        "finer",
        "surer",
        "radio",
        "rouge",
        "perch",
        "retch",
        "wrote",
        "clock",
        "tilde",
        "store",
        "prove",
        "bring",
        "solve",
        "cheat",
        "grime",
        "exult",
        "usher",
        "epoch",
        "triad",
        "break",
        "rhino",
        "viral",
        "conic",
        "masse",
        "sonic",
        "vital",
        "trace",
        "using",
        "peach",
        "champ",
        "baton",
        "brake",
        "pluck",
        "craze",
        "gripe",
        "weary",
        "picky",
        "acute",
        "ferry",
        "aside",
        "tapir",
        "troll",
        "unify",
        "rebus",
        "boost",
        "truss",
        "siege",
        "tiger",
        "banal",
        "slump",
        "crank",
        "gorge",
        "query",
        "drink",
        "favor",
        "abbey",
        "tangy",
        "panic",
        "solar",
        "shire",
        "proxy",
        "point",
        "robot",
        "prick",
        "wince",
        "crimp",
        "knoll",
        "sugar",
        "whack",
        "mount",
        "perky",
        "could",
        "wrung",
        "light",
        "those",
        "moist",
        "shard",
        "pleat",
        "aloft",
        "skill",
        "elder",
        "frame",
        "humor",
        "pause",
        "ulcer",
        "ultra",
        "robin",
        "cynic",
        "aroma",
        "caulk",
        "shake",
        "dodge",
        "swill",
        "tacit",
        "other",
        "thorn",
        "trove",
        "bloke",
        "vivid",
        "spill",
        "chant",
        "choke",
        "rupee",
        "nasty",
        "mourn",
        "ahead",
        "brine",
        "cloth",
        "hoard",
        "sweet",
        "month",
        "lapse",
        "watch",
        "today",
        "focus",
        "smelt",
        "tease",
        "cater",
        "movie",
        "saute",
        "allow",
        "renew",
        "their",
        "slosh",
        "purge",
        "chest",
        "depot",
        "epoxy",
        "nymph",
        "found",
        "shall",
        "harry",
        "stove",
        "lowly",
        "snout",
        "trope",
        "fewer",
        "shawl",
        "natal",
        "comma",
        "foray",
        "scare",
        "stair",
        "black",
        "squad",
        "royal",
        "chunk",
        "mince",
        "shame",
        "cheek",
        "ample",
        "flair",
        "foyer",
        "cargo",
        "oxide",
        "plant",
        "olive",
        "inert",
        "askew",
        "heist",
        "shown",
        "zesty",
        "hasty",
        "trash",
        "fella",
        "larva",
        "forgo",
        "story",
        "hairy",
        "train",
        "homer",
        "badge",
        "midst",
        "canny",
        "fetus",
        "butch",
        "farce",
        "slung",
        "tipsy",
        "metal",
        "yield",
        "delve",
        "being",
        "scour",
        "glass",
        "gamer",
        "scrap",
        "money",
        "hinge",
        "album",
        "vouch",
        "asset",
        "tiara",
        "crept",
        "bayou",
        "atoll",
        "manor",
        "creak",
        "showy",
        "phase",
        "froth",
        "depth",
        "gloom",
        "flood",
        "trait",
        "girth",
        "piety",
        "payer",
        "goose",
        "float",
        "donor",
        "atone",
        "primo",
        "apron",
        "blown",
        "cacao",
        "loser",
        "input",
        "gloat",
        "awful",
        "brink",
        "smite",
        "beady",
        "rusty",
        "retro",
        "droll",
        "gawky",
        "hutch",
        "pinto",
        "gaily",
        "egret",
        "lilac",
        "sever",
        "field",
        "fluff",
        "hydro",
        "flack",
        "agape",
        "voice",
        "stead",
        "stalk",
        "berth",
        "madam",
        "night",
        "bland",
        "liver",
        "wedge",
        "augur",
        "roomy",
        "wacky",
        "flock",
        "angry",
        "bobby",
        "trite",
        "aphid",
        "tryst",
        "midge",
        "power",
        "elope",
        "cinch",
        "motto",
        "stomp",
        "upset",
        "bluff",
        "cramp",
        "quart",
        "coyly",
        "youth",
        "rhyme",
        "buggy",
        "alien",
        "smear",
        "unfit",
        "patty",
        "cling",
        "glean",
        "label",
        "hunky",
        "khaki",
        "poker",
        "gruel",
        "twice",
        "twang",
        "shrug",
        "treat",
        "unlit",
        "waste",
        "merit",
        "woven",
        "octal",
        "needy",
        "clown",
        "widow",
        "irony",
        "ruder",
        "gauze",
        "chief",
        "onset",
        "prize",
        "fungi",
        "charm",
        "gully",
        "inter",
        "whoop",
        "taunt",
        "leery",
        "class",
        "theme",
        "lofty",
        "tibia",
        "booze",
        "alpha",
        "thyme",
        "eclat",
        "doubt",
        "parer",
        "chute",
        "stick",
        "trice",
        "alike",
        "sooth",
        "recap",
        "saint",
        "liege",
        "glory",
        "grate",
        "admit",
        "brisk",
        "soggy",
        "usurp",
        "scald",
        "scorn",
        "leave",
        "twine",
        "sting",
        "bough",
        "marsh",
        "sloth",
        "dandy",
        "vigor",
        "howdy",
        "enjoy",
        "valid",
        "ionic",
        "equal",
        "unset",
        "floor",
        "catch",
        "spade",
        "stein",
        "exist",
        "quirk",
        "denim",
        "grove",
        "spiel",
        "mummy",
        "fault",
        "foggy",
        "flout",
        "carry",
        "sneak",
        "libel",
        "waltz",
        "aptly",
        "piney",
        "inept",
        "aloud",
        "photo",
        "dream",
        "stale",
        "vomit",
        "ombre",
        "fanny",
        "unite",
        "snarl",
        "baker",
        "there",
        "glyph",
        "pooch",
        "hippy",
        "spell",
        "folly",
        "louse",
        "gulch",
        "vault",
        "godly",
        "threw",
        "fleet",
        "grave",
        "inane",
        "shock",
        "crave",
        "spite",
        "valve",
        "skimp",
        "claim",
        "rainy",
        "musty",
        "pique",
        "daddy",
        "quasi",
        "arise",
        "aging",
        "valet",
        "opium",
        "avert",
        "stuck",
        "recut",
        "mulch",
        "genre",
        "plume",
        "rifle",
        "count",
        "incur",
        "total",
        "wrest",
        "mocha",
        "deter",
        "study",
        "lover",
        "safer",
        "rivet",
        "funny",
        "smoke",
        "mound",
        "undue",
        "sedan",
        "pagan",
        "swine",
        "guile",
        "gusty",
        "equip",
        "tough",
        "canoe",
        "chaos",
        "covet",
        "human",
        "udder",
        "lunch",
        "blast",
        "stray",
        "manga",
        "melee",
        "lefty",
        "quick",
        "paste",
        "given",
        "octet",
        "risen",
        "groan",
        "leaky",
        "grind",
        "carve",
        "loose",
        "sadly",
        "spilt",
        "apple",
        "slack",
        "honey",
        "final",
        "sheen",
        "eerie",
        "minty",
        "slick",
        "derby",
        "wharf",
        "spelt",
        "coach",
        "erupt",
        "singe",
        "price",
        "spawn",
        "fairy",
        "jiffy",
        "filmy",
        "stack",
        "chose",
        "sleep",
        "ardor",
        "nanny",
        "niece",
        "woozy",
        "handy",
        "grace",
        "ditto",
        "stank",
        "cream",
        "usual",
        "diode",
        "valor",
        "angle",
        "ninja",
        "muddy",
        "chase",
        "reply",
        "prone",
        "spoil",
        "heart",
        "shade",
        "diner",
        "arson",
        "onion",
        "sleet",
        "dowel",
        "couch",
        "palsy",
        "bowel",
        "smile",
        "evoke",
        "creek",
        "lance",
        "eagle",
        "idiot",
        "siren",
        "built",
        "embed",
        "award",
        "dross",
        "annul",
        "goody",
        "frown",
        "patio",
        "laden",
        "humid",
        "elite",
        "lymph",
        "edify",
        "might",
        "reset",
        "visit",
        "gusto",
        "purse",
        "vapor",
        "crock",
        "write",
        "sunny",
        "loath",
        "chaff",
        "slide",
        "queer",
        "venom",
        "stamp",
        "sorry",
        "still",
        "acorn",
        "aping",
        "pushy",
        "tamer",
        "hater",
        "mania",
        "awoke",
        "brawn",
        "swift",
        "exile",
        "birch",
        "lucky",
        "freer",
        "risky",
        "ghost",
        "plier",
        "lunar",
        "winch",
        "snare",
        "nurse",
        "house",
        "borax",
        "nicer",
        "lurch",
        "exalt",
        "about",
        "savvy",
        "toxin",
        "tunic",
        "pried",
        "inlay",
        "chump",
        "lanky",
        "cress",
        "eater",
        "elude",
        "cycle",
        "kitty",
        "boule",
        "moron",
        "tenet",
        "place",
        "lobby",
        "plush",
        "vigil",
        "index",
        "blink",
        "clung",
        "qualm",
        "croup",
        "clink",
        "juicy",
        "stage",
        "decay",
        "nerve",
        "flier",
        "shaft",
        "crook",
        "clean",
        "china",
        "ridge",
        "vowel",
        "gnome",
        "snuck",
        "icing",
        "spiny",
        "rigor",
        "snail",
        "flown",
        "rabid",
        "prose",
        "thank",
        "poppy",
        "budge",
        "fiber",
        "moldy",
        "dowdy",
        "kneel",
        "track",
        "caddy",
        "quell",
        "dumpy",
        "paler",
        "swore",
        "rebar",
        "scuba",
        "splat",
        "flyer",
        "horny",
        "mason",
        "doing",
        "ozone",
        "amply",
        "molar",
        "ovary",
        "beset",
        "queue",
        "cliff",
        "magic",
        "truce",
        "sport",
        "fritz",
        "edict",
        "twirl",
        "verse",
        "llama",
        "eaten",
        "range",
        "whisk",
        "hovel",
        "rehab",
        "macaw",
        "sigma",
        "spout",
        "verve",
        "sushi",
        "dying",
        "fetid",
        "brain",
        "buddy",
        "thump",
        "scion",
        "candy",
        "chord",
        "basin",
        "march",
        "crowd",
        "arbor",
        "gayly",
        "musky",
        "stain",
        "dally",
        "bless",
        "bravo",
        "stung",
        "title",
        "ruler",
        "kiosk",
        "blond",
        "ennui",
        "layer",
        "fluid",
        "tatty",
        "score",
        "cutie",
        "zebra",
        "barge",
        "matey",
        "bluer",
        "aider",
        "shook",
        "river",
        "privy",
        "betel",
        "frisk",
        "bongo",
        "begun",
        "azure",
        "weave",
        "genie",
        "sound",
        "glove",
        "braid",
        "scope",
        "wryly",
        "rover",
        "assay",
        "ocean",
        "bloom",
        "irate",
        "later",
        "woken",
        "silky",
        "wreck",
        "dwelt",
        "slate",
        "smack",
        "solid",
        "amaze",
        "hazel",
        "wrist",
        "jolly",
        "globe",
        "flint",
        "rouse",
        "civil",
        "vista",
        "relax",
        "cover",
        "alive",
        "beech",
        "jetty",
        "bliss",
        "vocal",
        "often",
        "dolly",
        "eight",
        "joker",
        "since",
        "event",
        "ensue",
        "shunt",
        "diver",
        "poser",
        "worst",
        "sweep",
        "alley",
        "creed",
        "anime",
        "leafy",
        "bosom",
        "dunce",
        "stare",
        "pudgy",
        "waive",
        "choir",
        "stood",
        "spoke",
        "outgo",
        "delay",
        "bilge",
        "ideal",
        "clasp",
        "seize",
        "hotly",
        "laugh",
        "sieve",
        "block",
        "meant",
        "grape",
        "noose",
        "hardy",
        "shied",
        "drawl",
        "daisy",
        "putty",
        "strut",
        "burnt",
        "tulip",
        "crick",
        "idyll",
        "vixen",
        "furor",
        "geeky",
        "cough",
        "naive",
        "shoal",
        "stork",
        "bathe",
        "aunty",
        "check",
        "prime",
        "brass",
        "outer",
        "furry",
        "razor",
        "elect",
        "evict",
        "imply",
        "demur",
        "quota",
        "haven",
        "cavil",
        "swear",
        "crump",
        "dough",
        "gavel",
        "wagon",
        "salon",
        "nudge",
        "harem",
        "pitch",
        "sworn",
        "pupil",
        "excel",
        "stony",
        "cabin",
        "unzip",
        "queen",
        "trout",
        "polyp",
        "earth",
        "storm",
        "until",
        "taper",
        "enter",
        "child",
        "adopt",
        "minor",
        "fatty",
        "husky",
        "brave",
        "filet",
        "slime",
        "glint",
        "tread",
        "steal",
        "regal",
        "guest",
        "every",
        "murky",
        "share",
        "spore",
        "hoist",
        "buxom",
        "inner",
        "otter",
        "dimly",
        "level",
        "sumac",
        "donut",
        "stilt",
        "arena",
        "sheet",
        "scrub",
        "fancy",
        "slimy",
        "pearl",
        "silly",
        "porch",
        "dingo",
        "sepia",
        "amble",
        "shady",
        "bread",
        "friar",
        "reign",
        "dairy",
        "quill",
        "cross",
        "brood",
        "tuber",
        "shear",
        "posit",
        "blank",
        "villa",
        "shank",
        "piggy",
        "freak",
        "which",
        "among",
        "fecal",
        "shell",
        "would",
        "algae",
        "large",
        "rabbi",
        "agony",
        "amuse",
        "bushy",
        "copse",
        "swoon",
        "knife",
        "pouch",
        "ascot",
        "plane",
        "crown",
        "urban",
        "snide",
        "relay",
        "abide",
        "viola",
        "rajah",
        "straw",
        "dilly",
        "crash",
        "amass",
        "third",
        "trick",
        "tutor",
        "woody",
        "blurb",
        "grief",
        "disco",
        "where",
        "sassy",
        "beach",
        "sauna",
        "comic",
        "clued",
        "creep",
        "caste",
        "graze",
        "snuff",
        "frock",
        "gonad",
        "drunk",
        "prong",
        "lurid",
        "steel",
        "halve",
        "buyer",
        "vinyl",
        "utile",
        "smell",
        "adage",
        "worry",
        "tasty",
        "local",
        "trade",
        "finch",
        "ashen",
        "modal",
        "gaunt",
        "clove",
        "enact",
        "adorn",
        "roast",
        "speck",
        "sheik",
        "missy",
        "grunt",
        "snoop",
        "party",
        "touch",
        "mafia",
        "emcee",
        "array",
        "south",
        "vapid",
        "jelly",
        "skulk",
        "angst",
        "tubal",
        "lower",
        "crest",
        "sweat",
        "cyber",
        "adore",
        "tardy",
        "swami",
        "notch",
        "groom",
        "roach",
        "hitch",
        "young",
        "align",
        "ready",
        "frond",
        "strap",
        "puree",
        "realm",
        "venue",
        "swarm",
        "offer",
        "seven",
        "dryer",
        "diary",
        "dryly",
        "drank",
        "acrid",
        "heady",
        "theta",
        "junto",
        "pixie",
        "quoth",
        "bonus",
        "shalt",
        "penne",
        "amend",
        "datum",
        "build",
        "piano",
        "shelf",
        "lodge",
        "suing",
        "rearm",
        "coral",
        "ramen",
        "worth",
        "psalm",
        "infer",
        "overt",
        "mayor",
        "ovoid",
        "glide",
        "usage",
        "poise",
        "randy",
        "chuck",
        "prank",
        "fishy",
        "tooth",
        "ether",
        "drove",
        "idler",
        "swath",
        "stint",
        "while",
        "begat",
        "apply",
        "slang",
        "tarot",
        "radar",
        "credo",
        "aware",
        "canon",
        "shift",
        "timer",
        "bylaw",
        "serum",
        "three",
        "steak",
        "iliac",
        "shirk",
        "blunt",
        "puppy",
        "penal",
        "joist",
        "bunny",
        "shape",
        "beget",
        "wheel",
        "adept",
        "stunt",
        "stole",
        "topaz",
        "chore",
        "fluke",
        "afoot",
        "bloat",
        "bully",
        "dense",
        "caper",
        "sneer",
        "boxer",
        "jumbo",
        "lunge",
        "space",
        "avail",
        "short",
        "slurp",
        "loyal",
        "flirt",
        "pizza",
        "conch",
        "tempo",
        "droop",
        "plate",
        "bible",
        "plunk",
        "afoul",
        "savoy",
        "steep",
        "agile",
        "stake",
        "dwell",
        "knave",
        "beard",
        "arose",
        "motif",
        "smash",
        "broil",
        "glare",
        "shove",
        "baggy",
        "mammy",
        "swamp",
        "along",
        "rugby",
        "wager",
        "quack",
        "squat",
        "snaky",
        "debit",
        "mange",
        "skate",
        "ninth",
        "joust",
        "tramp",
        "spurn",
        "medal",
        "micro",
        "rebel",
        "flank",
        "learn",
        "nadir",
        "maple",
        "comfy",
        "remit",
        "gruff",
        "ester",
        "least",
        "mogul",
        "fetch",
        "cause",
        "oaken",
        "aglow",
        "meaty",
        "gaffe",
        "shyly",
        "racer",
        "prowl",
        "thief",
        "stern",
        "poesy",
        "rocky",
        "tweet",
        "waist",
        "spire",
        "grope",
        "havoc",
        "patsy",
        "truly",
        "forty",
        "deity",
        "uncle",
        "swish",
        "giver",
        "preen",
        "bevel",
        "lemur",
        "draft",
        "slope",
        "annoy",
        "lingo",
        "bleak",
        "ditty",
        "curly",
        "cedar",
        "dirge",
        "grown",
        "horde",
        "drool",
        "shuck",
        "crypt",
        "cumin",
        "stock",
        "gravy",
        "locus",
        "wider",
        "breed",
        "quite",
        "chafe",
        "cache",
        "blimp",
        "deign",
        "fiend",
        "logic",
        "cheap",
        "elide",
        "rigid",
        "false",
        "renal",
        "pence",
        "rowdy",
        "shoot",
        "blaze",
        "envoy",
        "posse",
        "brief",
        "never",
        "abort",
        "mouse",
        "mucky",
        "sulky",
        "fiery",
        "media",
        "trunk",
        "yeast",
        "clear",
        "skunk",
        "scalp",
        "bitty",
        "cider",
        "koala",
        "duvet",
        "segue",
        "creme",
        "super",
        "grill",
        "after",
        "owner",
        "ember",
        "reach",
        "nobly",
        "empty",
        "speed",
        "gipsy",
        "recur",
        "smock",
        "dread",
        "merge",
        "burst",
        "kappa",
        "amity",
        "shaky",
        "hover",
        "carol",
        "snort",
        "synod",
        "faint",
        "haunt",
        "flour",
        "chair",
        "detox",
        "shrew",
        "tense",
        "plied",
        "quark",
        "burly",
        "novel",
        "waxen",
        "stoic",
        "jerky",
        "blitz",
        "beefy",
        "lyric",
        "hussy",
        "towel",
        "quilt",
        "below",
        "bingo",
        "wispy",
        "brash",
        "scone",
        "toast",
        "easel",
        "saucy",
        "value",
        "spice",
        "honor",
        "route",
        "sharp",
        "bawdy",
        "radii",
        "skull",
        "phony",
        "issue",
        "lager",
        "swell",
        "urine",
        "gassy",
        "trial",
        "flora",
        "upper",
        "latch",
        "wight",
        "brick",
        "retry",
        "holly",
        "decal",
        "grass",
        "shack",
        "dogma",
        "mover",
        "defer",
        "sober",
        "optic",
        "crier",
        "vying",
        "nomad",
        "flute",
        "hippo",
        "shark",
        "drier",
        "obese",
        "bugle",
        "tawny",
        "chalk",
        "feast",
        "ruddy",
        "pedal",
        "scarf",
        "cruel",
        "bleat",
        "tidal",
        "slush",
        "semen",
        "windy",
        "dusty",
        "sally",
        "igloo",
        "nerdy",
        "jewel",
        "shone",
        "whale",
        "hymen",
        "abuse",
        "fugue",
        "elbow",
        "crumb",
        "pansy",
        "welsh",
        "syrup",
        "terse",
        "suave",
        "gamut",
        "swung",
        "drake",
        "freed",
        "afire",
        "shirt",
        "grout",
        "oddly",
        "tithe",
        "plaid",
        "dummy",
        "broom",
        "blind",
        "torch",
        "enemy",
        "again",
        "tying",
        "pesky",
        "alter",
        "gazer",
        "noble",
        "ethos",
        "bride",
        "extol",
        "decor",
        "hobby",
        "beast",
        "idiom",
        "utter",
        "these",
        "sixth",
        "alarm",
        "erase",
        "elegy",
        "spunk",
        "piper",
        "scaly",
        "scold",
        "hefty",
        "chick",
        "sooty",
        "canal",
        "whiny",
        "slash",
        "quake",
        "joint",
        "swept",
        "prude",
        "heavy",
        "wield",
        "femme",
        "lasso",
        "maize",
        "shale",
        "screw",
        "spree",
        "smoky",
        "whiff",
        "scent",
        "glade",
        "spent",
        "prism",
        "stoke",
        "riper",
        "orbit",
        "cocoa",
        "guilt",
        "humus",
        "shush",
        "table",
        "smirk",
        "wrong",
        "noisy",
        "alert",
        "shiny",
        "elate",
        "resin",
        "whole",
        "hunch",
        "pixel",
        "polar",
        "hotel",
        "sword",
        "cleat",
        "mango",
        "rumba",
        "puffy",
        "filly",
        "billy",
        "leash",
        "clout",
        "dance",
        "ovate",
        "facet",
        "chili",
        "paint",
        "liner",
        "curio",
        "salty",
        "audio",
        "snake",
        "fable",
        "cloak",
        "navel",
        "spurt",
        "pesto",
        "balmy",
        "flash",
        "unwed",
        "early",
        "churn",
        "weedy",
        "stump",
        "lease",
        "witty",
        "wimpy",
        "spoof",
        "saner",
        "blend",
        "salsa",
        "thick",
        "warty",
        "manic",
        "blare",
        "squib",
        "spoon",
        "probe",
        "crepe",
        "knack",
        "force",
        "debut",
        "order",
        "haste",
        "teeth",
        "agent",
        "widen",
        "icily",
        "slice",
        "ingot",
        "clash",
        "juror",
        "blood",
        "abode",
        "throw",
        "unity",
        "pivot",
        "slept",
        "troop",
        "spare",
        "sewer",
        "parse",
        "morph",
        "cacti",
        "tacky",
        "spool",
        "demon",
        "moody",
        "annex",
        "begin",
        "fuzzy",
        "patch",
        "water",
        "lumpy",
        "admin",
        "omega",
        "limit",
        "tabby",
        "macho",
        "aisle",
        "skiff",
        "basis",
        "plank",
        "verge",
        "botch",
        "crawl",
        "lousy",
        "slain",
        "cubic",
        "raise",
        "wrack",
        "guide",
        "foist",
        "cameo",
        "under",
        "actor",
        "revue",
        "fraud",
        "harpy",
        "scoop",
        "climb",
        "refer",
        "olden",
        "clerk",
        "debar",
        "tally",
        "ethic",
        "cairn",
        "tulle",
        "ghoul",
        "hilly",
        "crude",
        "apart",
        "scale",
        "older",
        "plain",
        "sperm",
        "briny",
        "abbot",
        "rerun",
        "quest",
        "crisp",
        "bound",
        "befit",
        "drawn",
        "suite",
        "itchy",
        "cheer",
        "bagel",
        "guess",
        "broad",
        "axiom",
        "chard",
        "caput",
        "leant",
        "harsh",
        "curse",
        "proud",
        "swing",
        "opine",
        "taste",
        "lupus",
        "gumbo",
        "miner",
        "green",
        "chasm",
        "lipid",
        "topic",
        "armor",
        "brush",
        "crane",
        "mural",
        "abled",
        "habit",
        "bossy",
        "maker",
        "dusky",
        "dizzy",
        "lithe",
        "brook",
        "jazzy",
        "fifty",
        "sense",
        "giant",
        "surly",
        "legal",
        "fatal",
        "flunk",
        "began",
        "prune",
        "small",
        "slant",
        "scoff",
        "torus",
        "ninny",
        "covey",
        "viper",
        "taken",
        "moral",
        "vogue",
        "owing",
        "token",
        "entry",
        "booth",
        "voter",
        "chide",
        "elfin",
        "ebony",
        "neigh",
        "minim",
        "melon",
        "kneed",
        "decoy",
        "voila",
        "ankle",
        "arrow",
        "mushy",
        "tribe",
        "cease",
        "eager",
        "birth",
        "graph",
        "odder",
        "terra",
        "weird",
        "tried",
        "clack",
        "color",
        "rough",
        "weigh",
        "uncut",
        "ladle",
        "strip",
        "craft",
        "minus",
        "dicey",
        "titan",
        "lucid",
        "vicar",
        "dress",
        "ditch",
        "gypsy",
        "pasta",
        "taffy",
        "flame",
        "swoop",
        "aloof",
        "sight",
        "broke",
        "teary",
        "chart",
        "sixty",
        "wordy",
        "sheer",
        "leper",
        "nosey",
        "bulge",
        "savor",
        "clamp",
        "funky",
        "foamy",
        "toxic",
        "brand",
        "plumb",
        "dingy",
        "butte",
        "drill",
        "tripe",
        "bicep",
        "tenor",
        "krill",
        "worse",
        "drama",
        "hyena",
        "think",
        "ratio",
        "cobra",
        "basil",
        "scrum",
        "bused",
        "phone",
        "court",
        "camel",
        "proof",
        "heard",
        "angel",
        "petal",
        "pouty",
        "throb",
        "maybe",
        "fetal",
        "sprig",
        "spine",
        "shout",
        "cadet",
        "macro",
        "dodgy",
        "satyr",
        "rarer",
        "binge",
        "trend",
        "nutty",
        "leapt",
        "amiss",
        "split",
        "myrrh",
        "width",
        "sonar",
        "tower",
        "baron",
        "fever",
        "waver",
        "spark",
        "belie",
        "sloop",
        "expel",
        "smote",
        "baler",
        "above",
        "north",
        "wafer",
        "scant",
        "frill",
        "awash",
        "snack",
        "scowl",
        "frail",
        "drift",
        "limbo",
        "fence",
        "motel",
        "ounce",
        "wreak",
        "revel",
        "talon",
        "prior",
        "knelt",
        "cello",
        "flake",
        "debug",
        "anode",
        "crime",
        "salve",
        "scout",
        "imbue",
        "pinky",
        "stave",
        "vague",
        "chock",
        "fight",
        "video",
        "stone",
        "teach",
        "cleft",
        "frost",
        "prawn",
        "booty",
        "twist",
        "apnea",
        "stiff",
        "plaza",
        "ledge",
        "tweak",
        "board",
        "grant",
        "medic",
        "bacon",
        "cable",
        "brawl",
        "slunk",
        "raspy",
        "forum",
        "drone",
        "women",
        "mucus",
        "boast",
        "toddy",
        "coven",
        "tumor",
        "truer",
        "wrath",
        "stall",
        "steam",
        "axial",
        "purer",
        "daily",
        "trail",
        "niche",
        "mealy",
        "juice",
        "nylon",
        "plump",
        "merry",
        "flail",
        "papal",
        "wheat",
        "berry",
        "cower",
        "erect",
        "brute",
        "leggy",
        "snipe",
        "sinew",
        "skier",
        "penny",
        "jumpy",
        "rally",
        "umbra",
        "scary",
        "modem",
        "gross",
        "avian",
        "greed",
        "satin",
        "tonic",
        "parka",
        "sniff",
        "livid",
        "stark",
        "trump",
        "giddy",
        "reuse",
        "taboo",
        "avoid",
        "quote",
        "devil",
        "liken",
        "gloss",
        "gayer",
        "beret",
        "noise",
        "gland",
        "dealt",
        "sling",
        "rumor",
        "opera",
        "thigh",
        "tonga",
        "flare",
        "wound",
        "white",
        "bulky",
        "etude",
        "horse",
        "circa",
        "paddy",
        "inbox",
        "fizzy",
        "grain",
        "exert",
        "surge",
        "gleam",
        "belle",
        "salvo",
        "crush",
        "fruit",
        "sappy",
        "taker",
        "tract",
        "ovine",
        "spiky",
        "frank",
        "reedy",
        "filth",
        "spasm",
        "heave",
        "mambo",
        "right",
        "clank",
        "trust",
        "lumen",
        "borne",
        "spook",
        "sauce",
        "amber",
        "lathe",
        "carat",
        "corer",
        "dirty",
        "slyly",
        "affix",
        "alloy",
        "taint",
        "sheep",
        "kinky",
        "wooly",
        "mauve",
        "flung",
        "yacht",
        "fried",
        "quail",
        "brunt",
        "grimy",
        "curvy",
        "cagey",
        "rinse",
        "deuce",
        "state",
        "grasp",
        "milky",
        "bison",
        "graft",
        "sandy",
        "baste",
        "flask",
        "hedge",
        "girly",
        "swash",
        "boney",
        "coupe",
        "endow",
        "abhor",
        "welch",
        "blade",
        "tight",
        "geese",
        "miser",
        "mirth",
        "cloud",
        "cabal",
        "leech",
        "close",
        "tenth",
        "pecan",
        "droit",
        "grail",
        "clone",
        "guise",
        "ralph",
        "tango",
        "biddy",
        "smith",
        "mower",
        "payee",
        "serif",
        "drape",
        "fifth",
        "spank",
        "glaze",
        "allot",
        "truck",
        "kayak",
        "virus",
        "testy",
        "tepee",
        "fully",
        "zonal",
        "metro",
        "curry",
        "grand",
        "banjo",
        "axion",
        "bezel",
        "occur",
        "chain",
        "nasal",
        "gooey",
        "filer",
        "brace",
        "allay",
        "pubic",
        "raven",
        "plead",
        "gnash",
        "flaky",
        "munch",
        "dully",
        "eking",
        "thing",
        "slink",
        "hurry",
        "theft",
        "shorn",
        "pygmy",
        "ranch",
        "wring",
        "lemon",
        "shore",
        "mamma",
        "froze",
        "newer",
        "style",
        "moose",
        "antic",
        "drown",
        "vegan",
        "chess",
        "guppy",
        "union",
        "lever",
        "lorry",
        "image",
        "cabby",
        "druid",
        "exact",
        "truth",
        "dopey",
        "spear",
        "cried",
        "chime",
        "crony",
        "stunk",
        "timid",
        "batch",
        "gauge",
        "rotor",
        "crack",
        "curve",
        "latte",
        "witch",
        "bunch",
        "repel",
        "anvil",
        "soapy",
        "meter",
        "broth",
        "madly",
        "dried",
        "scene",
        "known",
        "magma",
        "roost",
        "woman",
        "thong",
        "punch",
        "pasty",
        "downy",
        "knead",
        "whirl",
        "rapid",
        "clang",
        "anger",
        "drive",
        "goofy",
        "email",
        "music",
        "stuff",
        "bleep",
        "rider",
        "mecca",
        "folio",
        "setup",
        "verso",
        "quash",
        "fauna",
        "gummy",
        "happy",
        "newly",
        "fussy",
        "relic",
        "guava",
        "ratty",
        "fudge",
        "femur",
        "chirp",
        "forte",
        "alibi",
        "whine",
        "petty",
        "golly",
        "plait",
        "fleck",
        "felon",
        "gourd",
        "brown",
        "thrum",
        "ficus",
        "stash",
        "decry",
        "wiser",
        "junta",
        "visor",
        "daunt",
        "scree",
        "impel",
        "await",
        "press",
        "whose",
        "turbo",
        "stoop",
        "speak",
        "mangy",
        "eying",
        "inlet",
        "crone",
        "pulse",
        "mossy",
        "staid",
        "hence",
        "pinch",
        "teddy",
        "sully",
        "snore",
        "ripen",
        "snowy",
        "attic",
        "going",
        "leach",
        "mouth",
        "hound",
        "clump",
        "tonal",
        "bigot",
        "peril",
        "piece",
        "blame",
        "haute",
        "spied",
        "undid",
        "intro",
        "basal",
        "shine",
        "gecko",
        "rodeo",
        "guard",
        "steer",
        "loamy",
        "scamp",
        "scram",
        "manly",
        "hello",
        "vaunt",
        "organ",
        "feral",
        "knock",
        "extra",
        "condo",
        "adapt",
        "willy",
        "polka",
        "rayon",
        "skirt",
        "faith",
        "torso",
        "match",
        "mercy",
        "tepid",
        "sleek",
        "riser",
        "twixt",
        "peace",
        "flush",
        "catty",
        "login",
        "eject",
        "roger",
        "rival",
        "untie",
        "refit",
        "aorta",
        "adult",
        "judge",
        "rower",
        "artsy",
        "rural",
        "shave"
    ];

    /* src\App.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[27] = list;
    	child_ctx[28] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[29] = list;
    	child_ctx[30] = i;
    	return child_ctx;
    }

    // (270:3) {#each row as letter, j}
    function create_each_block_3(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[6].call(input, /*i*/ ctx[28], /*j*/ ctx[30]);
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*i*/ ctx[28], /*j*/ ctx[30]);
    	}

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[8](/*i*/ ctx[28], /*j*/ ctx[30], ...args);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "id", /*i*/ ctx[28].toString().concat(/*j*/ ctx[30].toString()));
    			attr_dev(input, "maxlength", "1");
    			attr_dev(input, "class", "letterbox svelte-kxi75n");
    			add_location(input, file, 270, 4, 13030);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*letters*/ ctx[1][/*i*/ ctx[28]][/*j*/ ctx[30]]);

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

    			if (dirty & /*letters*/ 2 && input.value !== /*letters*/ ctx[1][/*i*/ ctx[28]][/*j*/ ctx[30]]) {
    				set_input_value(input, /*letters*/ ctx[1][/*i*/ ctx[28]][/*j*/ ctx[30]]);
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
    		source: "(270:3) {#each row as letter, j}",
    		ctx
    	});

    	return block;
    }

    // (268:1) {#each letters as row, i}
    function create_each_block_2(ctx) {
    	let div;
    	let t;
    	let br;
    	let each_value_3 = /*row*/ ctx[26];
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
    			add_location(div, file, 268, 2, 12978);
    			add_location(br, file, 279, 2, 13284);
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
    				each_value_3 = /*row*/ ctx[26];
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
    		source: "(268:1) {#each letters as row, i}",
    		ctx
    	});

    	return block;
    }

    // (285:1) {#if filteredWords && filteredWords.length > 0}
    function create_if_block(ctx) {
    	let span;
    	let t0_1_value = /*filteredWords*/ ctx[0].length + "";
    	let t0_1;
    	let br;
    	let t1_1;
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
    			t0_1 = text(t0_1_value);
    			br = element("br");
    			t1_1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(span, file, 285, 2, 13457);
    			add_location(br, file, 285, 37, 13492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0_1);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t1_1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredWords*/ 1 && t0_1_value !== (t0_1_value = /*filteredWords*/ ctx[0].length + "")) set_data_dev(t0_1, t0_1_value);

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
    			if (detaching) detach_dev(t1_1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(285:1) {#if filteredWords && filteredWords.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (290:3) {#each word as letter}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*letter*/ ctx[23] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "letterbox svelte-kxi75n");
    			add_location(div, file, 290, 4, 13594);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*displayedWords*/ 4 && t_value !== (t_value = /*letter*/ ctx[23] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(290:3) {#each word as letter}",
    		ctx
    	});

    	return block;
    }

    // (287:2) {#each displayedWords as word}
    function create_each_block(ctx) {
    	let br;
    	let t0_1;
    	let div;
    	let t1_1;
    	let each_value_1 = /*word*/ ctx[20];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			br = element("br");
    			t0_1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1_1 = space();
    			add_location(br, file, 287, 3, 13535);
    			attr_dev(div, "class", "row svelte-kxi75n");
    			add_location(div, file, 288, 3, 13544);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, t0_1, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t1_1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*displayedWords*/ 4) {
    				each_value_1 = /*word*/ ctx[20];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t1_1);
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
    			if (detaching) detach_dev(t0_1);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(287:2) {#each displayedWords as word}",
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
    			add_location(main, file, 266, 0, 12940);
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

    function average(numbers) {
    	let sum = 0;
    	numbers.forEach(n => sum += n);
    	return sum / numbers.length;
    }

    function pickRandomWord(words) {
    	return words[Math.floor(Math.random() * words.length)];
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

    	// console.log(rateAlphabet(words))
    	let t0 = performance.now();

    	let benchmarkResult = benchmark(words);
    	console.log(benchmarkResult);
    	console.log(average(benchmarkResult));
    	let t1 = performance.now();
    	console.log(t1 - t0);

    	function benchmark(words) {
    		let filteredWords;
    		let randomWord;
    		let guess;
    		let attemts = [];

    		for (let i = 0; i < 1000; i++) {
    			filteredWords = words;
    			randomWord = pickRandomWord(words);

    			for (let attemt = 1; attemt <= 6; attemt++) {
    				// console.log(filteredWords.length)
    				if (filteredWords.length > 0 && filteredWords.length <= 4) {
    					// guess = [...ratedWords(filteredWords, filteredWords).keys()][0];
    					guess = [...ratedWords3(filteredWords, filteredWords).keys()][0];
    				} else if (filteredWords.length > 2000) {
    					guess = "raise";
    				} else if (filteredWords.length > 4) {
    					// guess = [...ratedWords(words, filteredWords).keys()][0];
    					guess = [...ratedWords3(words, filteredWords).keys()][0];
    				}

    				if (guess == randomWord) {
    					attemts.push(attemt);
    					break;
    				}

    				let filters = new Array(words[0].length);

    				guess.split("").forEach((letter, i) => {
    					if (randomWord.charAt(i) == letter) {
    						filters[i] = Filters.rightPosition;
    					}

    					if (!randomWord.includes(letter)) {
    						filters[i] = Filters.notInWord;
    					}

    					if (randomWord.includes(letter) && randomWord.charAt(i) != letter) {
    						filters[i] = Filters.wrongPosition;
    					}
    				});

    				filteredWords = filteredWords.filter(w => {
    					for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
    						if (!filters[letterIndex](w, guess.charAt(letterIndex).toLocaleLowerCase(), letterIndex)) {
    							return false;
    						}
    					}

    					return true;
    				});
    			}

    			console.log(i);
    		}

    		return attemts;
    	}

    	// function rateAlphabet(words: string[]): Map<string, number[]> {
    	// 	const alphabet: string[] = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
    	// 	const wordLength = words[0].length;
    	// 	const totalNrOfWords = words.length;
    	// 	let ratedAlphabet: Map<string, number[]> = new Map();
    	// 	for (const letter of alphabet) {
    	// 		// let used: boolean = letters[0].includes(letter);
    	// 		let rating: number[] = new Array(wordLength + 1);
    	// 		rating[wordLength] = words.filter((w) => w.includes(letter)).length;
    	// 		for (let i = 0; i < wordLength; i++) {
    	// 			rating[i] = Math.pow(words.filter((w) => Filters.rightPosition(w, letter, i)).length, 2);
    	// 			rating[i] += Math.pow(words.filter((w) => Filters.wrongPosition(w, letter, i)).length, 2);
    	// 			rating[i] += Math.pow(words.filter((w) => Filters.notInWord(w, letter, i)).length, 2);
    	// 			rating[i] /= totalNrOfWords;
    	// 			// if (used) {
    	// 			// 	rating[i] *= 2;
    	// 			// }
    	// 		}
    	// 		// if (letters[0].find((l) => l == letter)) {
    	// 		// }
    	// 		ratedAlphabet.set(letter, rating);
    	// 	}
    	// 	return ratedAlphabet;
    	// }
    	// function ratedWords(words: string[], filteredWords: string[]): Map<string, number> {
    	// 	let ratedWords: Map<string, number> = new Map();
    	// 	let sum: number;
    	// 	let ratedAlphabet = rateAlphabet(filteredWords)
    	// 	words.forEach((word) => {
    	// 		sum = 0;
    	// 		word.toLocaleLowerCase().split("").forEach((letter, i) => {
    	// 			sum += ratedAlphabet.get(letter)[i];
    	// 			if (word.split(letter).length > 2) {
    	// 				sum += 5000;
    	// 			}
    	// 		})
    	// 		ratedWords.set(word, sum)
    	// 	})
    	// 	return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]))
    	// }
    	function ratedWords3(words, filteredWords) {
    		let sortedWords = words.sort();
    		let ratedWords = new Map();
    		let ratedLetter = [null, null, null, null];
    		ratedLetter[0] = rateLetterAtPosition(filteredWords, sortedWords[0].charAt(0), 0);
    		ratedLetter[1] = rateLetterAtPosition(ratedLetter[0].notInWord.filteredWords, sortedWords[0].charAt(1), 1);
    		ratedLetter[2] = rateLetterAtPosition(ratedLetter[0].rightPosition.filteredWords, sortedWords[0].charAt(1), 1);
    		ratedLetter[3] = rateLetterAtPosition(ratedLetter[0].wrongPosition.filteredWords, sortedWords[0].charAt(1), 1);

    		for (let i = 0; i < sortedWords.length; i++) {
    			const word = sortedWords[i];

    			if (i > 0 && sortedWords[i - 1].charAt(0) != sortedWords[i].charAt(0)) {
    				ratedLetter[0] = rateLetterAtPosition(filteredWords, sortedWords[i].charAt(0), 0);
    				ratedLetter[1] = rateLetterAtPosition(ratedLetter[0].notInWord.filteredWords, sortedWords[i].charAt(1), 1);
    				ratedLetter[2] = rateLetterAtPosition(ratedLetter[0].rightPosition.filteredWords, sortedWords[i].charAt(1), 1);
    				ratedLetter[3] = rateLetterAtPosition(ratedLetter[0].wrongPosition.filteredWords, sortedWords[i].charAt(1), 1);
    			} else if (i > 0 && sortedWords[i - 1].charAt(1) != sortedWords[i].charAt(1)) {
    				ratedLetter[1] = rateLetterAtPosition(ratedLetter[0].notInWord.filteredWords, sortedWords[i].charAt(1), 1);
    				ratedLetter[2] = rateLetterAtPosition(ratedLetter[0].rightPosition.filteredWords, sortedWords[i].charAt(1), 1);
    				ratedLetter[3] = rateLetterAtPosition(ratedLetter[0].wrongPosition.filteredWords, sortedWords[i].charAt(1), 1);
    			}

    			ratedWords.set(sortedWords[i], rateWordRecursive(word, filteredWords, 0, 1, ratedLetter));
    		}

    		return new Map([...ratedWords.entries()].sort((a, b) => a[1] - b[1]));
    	}

    	// function rateWordsRecursive(words: string[], index: number, position: number, probability: number, ratedLetter?: RatedLetterAtPosition): number {
    	// 	let sum = 0;
    	// 	let ratedLetterAtPosition: RatedLetterAtPosition = ratedLetter ?? rateLetterAtPosition(words, words[index].charAt(position), position);
    	// 	if (position == words[index].length - 1) {
    	// 		sum += ratedLetterAtPosition.notInWord.filteredWords.length * ratedLetterAtPosition.notInWord.probability * probability;
    	// 		sum += ratedLetterAtPosition.rightPosition.filteredWords.length * ratedLetterAtPosition.rightPosition.probability * probability;
    	// 		sum += ratedLetterAtPosition.wrongPosition.filteredWords.length * ratedLetterAtPosition.wrongPosition.probability * probability;
    	// 	}
    	// 	if (position < words[index].length - 1) {
    	// 		sum += rateWordsRecursive(ratedLetterAtPosition.notInWord.filteredWords, 0, position + 1, ratedLetterAtPosition.notInWord.probability * probability);
    	// 		sum += rateWordsRecursive(ratedLetterAtPosition.rightPosition.filteredWords, 0, position + 1, ratedLetterAtPosition.rightPosition.probability * probability);
    	// 		sum += rateWordsRecursive(ratedLetterAtPosition.wrongPosition.filteredWords, 0, position + 1, ratedLetterAtPosition.wrongPosition.probability * probability);
    	// 	}
    	// 	return sum;
    	// }
    	function rateWordRecursive(word, words, position, probability, ratedLetter) {
    		var _a;

    		if (probability == 0) {
    			return 0;
    		}

    		let sum = 0;

    		let ratedLetterAtPosition = (_a = ratedLetter[0]) !== null && _a !== void 0
    		? _a
    		: rateLetterAtPosition(words, word.charAt(position), position);

    		if (position == word.length - 1) {
    			sum += ratedLetterAtPosition.notInWord.filteredWords.length * ratedLetterAtPosition.notInWord.probability * probability;
    			sum += ratedLetterAtPosition.rightPosition.filteredWords.length * ratedLetterAtPosition.rightPosition.probability * probability;
    			sum += ratedLetterAtPosition.wrongPosition.filteredWords.length * ratedLetterAtPosition.wrongPosition.probability * probability;
    		}

    		if (position < word.length - 1) {
    			sum += rateWordRecursive(word, ratedLetterAtPosition.notInWord.filteredWords, position + 1, ratedLetterAtPosition.notInWord.probability * probability, [ratedLetter[1]]);
    			sum += rateWordRecursive(word, ratedLetterAtPosition.rightPosition.filteredWords, position + 1, ratedLetterAtPosition.rightPosition.probability * probability, [ratedLetter[2]]);
    			sum += rateWordRecursive(word, ratedLetterAtPosition.wrongPosition.filteredWords, position + 1, ratedLetterAtPosition.wrongPosition.probability * probability, [ratedLetter[3]]);
    		}

    		return sum;
    	}

    	function rateLetterAtPosition(words, letter, position) {
    		const unfilteredNrOfWords = words.length;

    		let ratedLetter = {
    			letter,
    			notInWord: {
    				probability: 0,
    				filteredWords: words.filter(w => Filters.notInWord(w, letter, position))
    			},
    			rightPosition: {
    				probability: 0,
    				filteredWords: words.filter(w => Filters.rightPosition(w, letter, position))
    			},
    			wrongPosition: {
    				probability: 0,
    				filteredWords: words.filter(w => Filters.wrongPosition(w, letter, position))
    			}
    		};

    		if (unfilteredNrOfWords) {
    			ratedLetter.notInWord.probability = ratedLetter.notInWord.filteredWords.length / unfilteredNrOfWords;
    			ratedLetter.rightPosition.probability = ratedLetter.rightPosition.filteredWords.length / unfilteredNrOfWords;
    			ratedLetter.wrongPosition.probability = ratedLetter.wrongPosition.filteredWords.length / unfilteredNrOfWords;
    		}

    		return ratedLetter;
    	}

    	// View stuffs
    	function handleInput(e, i, j) {
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
    		wordsLengthFive,
    		words,
    		filteredWords,
    		displayedWords,
    		wordLength,
    		nrOfRows,
    		letters,
    		filters,
    		t0,
    		benchmarkResult,
    		t1,
    		average,
    		benchmark,
    		pickRandomWord,
    		ratedWords3,
    		rateWordRecursive,
    		rateLetterAtPosition,
    		handleInput,
    		focusNext,
    		toggleFilter
    	});

    	$$self.$inject_state = $$props => {
    		if ('words' in $$props) $$invalidate(9, words = $$props.words);
    		if ('filteredWords' in $$props) $$invalidate(0, filteredWords = $$props.filteredWords);
    		if ('displayedWords' in $$props) $$invalidate(2, displayedWords = $$props.displayedWords);
    		if ('wordLength' in $$props) $$invalidate(10, wordLength = $$props.wordLength);
    		if ('nrOfRows' in $$props) $$invalidate(11, nrOfRows = $$props.nrOfRows);
    		if ('letters' in $$props) $$invalidate(1, letters = $$props.letters);
    		if ('filters' in $$props) $$invalidate(5, filters = $$props.filters);
    		if ('t0' in $$props) t0 = $$props.t0;
    		if ('benchmarkResult' in $$props) benchmarkResult = $$props.benchmarkResult;
    		if ('t1' in $$props) t1 = $$props.t1;
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
    				if (filteredWords.length > 0) {
    					// && filteredWords.length <= 4) {
    					$$invalidate(2, displayedWords = [...ratedWords3(filteredWords, filteredWords).keys()].slice(0, 10));
    				} else // displayedWords = words.sort();
    				if (filteredWords.length > 4) {
    					$$invalidate(2, displayedWords = [...ratedWords3(words, filteredWords).keys()].slice(0, 10)); // displayedWords = [...ratedWords(filteredWords, rateAlphabet(filteredWords)).keys()].slice(0, 10)
    				} // displayedWords = [...ratedWords(words, rateAlphabet(filteredWords)).keys()].slice(0, 10)
    				// displayedWords = words.sort();
    			}
    		}
    	};

    	return [
    		filteredWords,
    		letters,
    		displayedWords,
    		handleInput,
    		toggleFilter,
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
