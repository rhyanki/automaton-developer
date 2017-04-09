//import {freeze} from '../Util/immutability.js';
import {Map, Set} from 'immutable';
import SymbolGroup from './SymbolGroup.js';
import {shareAny} from '../Util/sets.js';

/**
	{
		_mutable: Boolean,
		alphabet: SymbolGroup,
		_start: Number,

		// Set of all states.
		_states: Set<state: Number>,

		// Map of states to their names
		_names: Map<state: Number, name: String>,

		// Set of accept states
		_accept: Set<state: Number>,

		_transitions: Map<
			origin: Number,
			transition: Map<
				target: Number,
				symbols: SymbolGroup,
			>,
		>,

		// A single object shared by the NFA and all its copies
		_shared: {
			nextID: 1,
		},

		// Automatically generated
		_cache.generatingStates: Set<state: Number>,
		_cache.reachableStates: Set<state: Number>,
		_cache.isDFA: Boolean,

		// // Extra variables for if stepping through the machine

		// The current input buffer (string of symbols still left to step through)
		_remaining: String,

		// Set of current possible states (if DFA, this always contains at most one state)
		_current: Set<state: Number>,

		// Current result (-1, 0, 1) (automatically calculated)
		_cache.result: Number,
	}
 *
 * If mutable = true, update functions will directly modify the NFA and its elements (and theirs)
 * on which they are called, and return it.
 * Otherwise, they will create a minimal copy (maintaining as many references as possible) and return
 * the copy.
 * If not mutable, it is possible to do things like compare oldNFA.states === newNFA.states to see if any states have been added or removed.
 * 
 * There are a few ways to run the machine:
 * 1. nfa.accepts(input);
 * 2. nfa.reset(input); nfa.step(); nfa.step();
 * 3. nfa.reset(); nfa.read(input); nfa.run();
 * 3. nfa.reset(); nfa.run(inputChunk); nfa.run(inputChunk);
 * nfa.result can be used to examine the result at any time.
 */
class NFA {
	/**
	 * 
	 * @param {NFA|Object} template 
	 * @param {Boolean} [mutable]
	 */
	constructor(template, mutable) {
		// If this is a copy of an existing NFA ...
		if (template instanceof NFA) {
			for (var k in template) {
				this[k] = template[k];
			}
			if (mutable === undefined) {
				this._mutable = template._mutable;
			} else {
				this._mutable = mutable;
			}
			this._cache = {}; // All new NFAs get a new cache
			if (!this._mutable) {
				if (template._mutable) {
					// If the new DFA is immutable but the old one was not, we must explicitly make the new one immutable.
					this._mutable = true;
					this.immutable();
				} else {
					// The one exception to each NFA having its own cache is if they are both immutable
					// (and thus will be exactly the same forever).
					this._cache = template._cache;
				}
			}
			return this;
		}

		this._shared = {
			nextID: 1,
		};

		this._start = 0;
		this._states = Set().asMutable();
		this._names = Map().asMutable();
		this._accept = Set().asMutable();
		this._transitions = Map().asMutable();
		this._cache = {};

		// Parse input states
		if (template.states instanceof Array) {
			for (let i = 0; i < template.states.length; i++) {
				const state = this._shared.nextID;
				this._states.add(state);
				this._names.set(state, template.states[i].name);
				if (template.states[i].accept) {
					this._accept.add(state);
				}
				this._transitions.set(state, Map().asMutable().merge(template.states[i].transitions));
				this._shared.nextID++;
			}
		}

		for (const transitions of this._transitions.values()) {
			// Convert raw input strings to symbol groups
			for (const [target, symbols] of transitions) {
				transitions.set(target, new SymbolGroup(symbols));
			}
		}

		this._start = this.state(template.start);

		// If mutable param is given, that will be used; otherwise, template.mutable is used; otherwise, immutable by default.
		this._mutable = true;
		if (mutable === undefined) {
			mutable = template.mutable;
		}
		if (!mutable) {
			this.immutable();
		}
	}

	/**
	 * Perform a DFS from (and including) the given state on its transitions.
	 * @param {Number} state The state to start from. If it has been visited already, _explore() will do nothing.
	 * @param {Set<Number>} visited The set of visited states. Must be mutable (and will be modified).
	 * @param {Boolean} [backwards = false] Whether to go backwards (so states that transition TO the given state will be explored instead).
	 * @param {String} [symbol] If provided, only transitions on this symbol will be followed.
	 * @returns {Set<Number>} The (modified) set of visited states.
	 */
	_explore(state, visited, backwards, symbol) {
		backwards = backwards || false;
		if (visited.has(state)) {
			return visited;
		}
		visited.add(state);
		if (backwards) {
			for (const origin of this._states) {
				if (this.hasTransition(origin, state, symbol)) {
					this._explore(origin, visited, backwards, symbol);
				}
			}
		} else {
			for (const [target, symbols] of this.transitionsFrom(state)) {
				if (symbol !== undefined && !symbols.matches(symbol)) {
					continue;
				}
				this._explore(target, visited, backwards, symbol);
			}
		}
		return visited;
	}

	/**
	 * Given a set of states, add any states reachable via empty transitions.
	 * @param {Set<Number>} states The set of current states. Must be mutable.
	 * @param {Set<Number>} [statesToCheck] Which states to actually check (i.e., follow their empty transitions). Defaults to all of them.
	 * @returns {Set<Number>} The new set of states.
	 */
	_followEmptyTransitions(states) {
		for (const state of states) {
			states.remove(state); // So that explore() doesn't end immediately
			this._explore(state, states, false, "");
		}
		return states;
	}

	/**
	 * Get the accept states.
	 * @returns {Set<Number>} The set of accept states.
	 */
	get acceptStates() {
		return this._accept.asImmutable();
	}

	/**
	 * Get the current potential states.
	 * @returns {Set<Number>} The set of potential states.
	 */
	get currentStates() {
		return this._current.asImmutable();
	}

	/**
	 * Get the generating states (those with a path to an accept state).
	 * @returns {Set<Number>} The set of generating states.
	 */
	get generatingStates() {
		if (!this._cache.generatingStates) {
			this._cache.generatingStates = Set().asMutable();

			for (const state of this._accept) {
				this._explore(state, this._cache.generatingStates, true);
			}

			// This should never be mutated
			this._cache.generatingStates.asImmutable();
		}
		return this._cache.generatingStates;
	}

	/**
	 * Get whether the NFA is also a DFA (i.e., each state has only one possible target state to which it can transition on a given symbol).
	 * @returns {Boolean}
	 */
	get isDFA() {
		if (this._cache.isDFA === undefined || this._cache.isDFA === null) {
			for (const origin of this._states) {
				const transitions = this.transitionsFrom(origin);
				// First check whether there are any empty transitions
				for (const symbols of transitions.values()) {
					if (symbols.matches("")) {
						return this._cache.isDFA = false;
					}
				}

				// Then check whether any of its transition symbol groups intersect
				if (SymbolGroup.shareAny(transitions.values())) {
					return this._cache.isDFA = false;
				}
			}
			this._cache.isDFA = true;
		}
		return this._cache.isDFA;
	}

	/**
	 * Get the number of states in the NFA.
	 * @returns {Number}
	 */
	get numStates() {
		return this._states.size;
	}

	/**
	 * Get the reachable states (those with a path from the start state to them).
	 * @returns {Set<Number>} The set of reachable states.
	 */
	get reachableStates() {
		if (!this._cache.reachableStates) {
			this._cache.reachableStates = Set().asMutable();
			if (this._start) {
				this._explore(this._start, this._cache.reachableStates);
			}
			// This should never be mutated
			this._cache.reachableStates.asImmutable();
		}
		return this._cache.reachableStates;
	}

	/**
	 * Get the remaining input.
	 * @returns {String}
	 */
	get remainingInput() {
		return this._remaining;
	}

	/**
	 * Get the result of the current run.
	 * 0 if inconclusive (future input could result in accept), -1 if definite reject, 1 if accept.
	 * @returns {Number}
	 */
	get result() {
		if (this._cache.result === undefined || this._cache.result === null) {
			if (shareAny([this._current, this._accept])) {
				this._cache.result = 1;
			} else if (shareAny([this._current, this.generatingStates])) {
				this._cache.result = 0;
			} else {
				this._cache.result = -1;
			}
		}
		return this._cache.result;
	}

	/**
	 * Get the NFA's start state.
	 * @returns {Number}
	 */
	get start() {
		return this._start;
	}

	/**
	 * @returns {Set<Number>} Set of the NFA's states.
	 */
	get states() {
		return this._states.asImmutable();
	}

	/**
	 * @returns {Map<Number, Map>} Map of the NFA's transitions, of the form Map<origin: Number, Map<target: Number, symbols: SymbolGroup>.
	 */
	get transitions() {
		return this._transitions.asImmutable();
	}

	/**
	 * Return whether the NFA accepts the given input or not.
	 * Does not mutate the NFA, even if it is mutable.
	 * @param {String} input The input string.
	 */
	accepts(input) {
		const nfa = this.mutable(true);
		nfa.reset();
		nfa.run(input);
		return nfa.result === 1;
	}

	/**
	 * Add a new blank state.
	 * @param {String} [name] The name of the new state (default "New state").
	 * @returns {NFA}
	 */
	addState(name) {
		if (name === undefined) {
			name = "New state";
		}

		// Use a unique ID for the new state which has never been used by this NFA or its family of clones.
		const id = this._shared.nextID;
		this._shared.nextID++;

		const nfa = this.mutable(true); // Note that the entire cache can be copied

		nfa._states = nfa._states.asMutable().add(id);
		nfa._names = nfa._names.asMutable().set(id, name);
		nfa._transitions = nfa._transitions.asMutable().set(id, Map());

		if (!this._mutable) {
			nfa.immutable();
		}

		return nfa;
	}

	/**
	 * Return a shallow copy of the NFA.
	 * @returns {NFA}
	 */
	copy() {
		return new NFA(this);
	}

	/**
	 * Check whether the given state is generating (has a path to an accept state).
	 * @param {Number} state The state to check.
	 * @returns {Boolean}
	 */
	generating(state) {
		return this.generatingStates.has(this.state(state));
	}

	/**
	 * Return whether there is a transition from one state to another.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} target The origin state ID.
	 * @param {String} [symbol] If provided, will only return true if the transition is on this symbol.
	 * @returns {Boolean}
	 */
	hasTransition(origin, target, symbol) {
		origin = this.state(origin);
		target = this.state(target);
		if (!origin || !target || !this._transitions.has(origin)) {
			return false;
		}
		if (!this._transitions.get(origin).has(target)) {
			return false;
		}
		if (symbol !== undefined && !this.symbols(origin, target).matches(symbol)) {
			return false;
		}
		return true;
	}

	/**
	 * Make this NFA (deeply) immutable, preventing any further changes from ever being made to it or its constituents.
	 * @returns {NFA}
	 */
	immutable() {
		if (!this._mutable) {
			return this;
		}
		this._mutable = false;
		for (const transitions of this._transitions.values()) {
			transitions.asImmutable();
		}
		this._accept.asImmutable();
		this._states.asImmutable();
		this._names.asImmutable();
		this._transitions.asImmutable();
		if (this._current) {
			this._current.asImmutable();
		}
		Object.freeze(this);
		return this;
	}

	/**
	 * Check whether a given state is an accept state.
	 * @param {Number} state The state to check.
	 * @returns {Boolean}
	 */
	isAccept(state) {
		return this._accept.has(this.state(state));
	}

	/**
	 * Check whether a state is the start state.
	 * @param {Number} [state] The state to check.
	 * @returns {Number} Whether the arg is the start state.
	 */
	isStart(state) {
		state = this.state(state);
		return state && this._start === state;
	}

	/**
	 * Return a shallow, mutable copy of this NFA (or itself it is already mutable). Also empties the cache, thus fully preparing it for modification.
	 * It will be mutable, so it can have elements replaced if need be (but any previously immutable elements will remain so).
	 * @param {Boolean} [copyCache = false] Whether to copy/keep the cache from the old object.
	 * @returns {NFA}
	 */
	mutable(copyCache) {
		if (this._mutable) {
			if (!copyCache) {
				this._cache = {};
			}
			return this;
		}
		const nfa = new NFA(this, true);
		nfa._cache = {};
		if (copyCache) {
			for (const key in this._cache) {
				nfa._cache[key] = this._cache[key];
			}
		}
		return nfa;
	}

	/**
	 * Return the name of a state.
	 * @param {Number} state The state ID.
	 * @returns {String|undefined} The state's name, or undefined if not a state.
	 */
	name(state) {
		return this._names.get(state);
	}

	/**
	 * Check whether the given state is reachable (has a path from the start state).
	 * @param {Number} [state] The state to check.
	 * @returns {Boolean}
	 */
	reachable(state) {
		return this.reachableStates.has(this.state(state));
	}

	/**
	 * Add the given input to the NFA's remaining input buffer.
	 * @param {String} input 
	 * @returns {NFA}
	 */
	read(input) {
		const nfa = this.mutable(true);
		nfa._remaining += input;
		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Remove a state (and all associated transitions).
	 * @param {Number} state
	 * @returns {NFA}
	 */
	removeState(state) {
		state = this.state(state);

		if (!state) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();

		// Delete all transitions from the state
		nfa._transitions = nfa._transitions.asMutable().delete(state);

		// Delete all transitions to the state
		for (const origin of nfa._transitions.keys()) {
			nfa.removeTransition(origin, state);
		}
		nfa._states = nfa._states.asMutable().delete(state);

		// If the NFA was a DFA, it definitely still is.
		if (cache.isDFA) {
			nfa._cache.isDFA = true;
		}

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Remove the transition between the origin and the target.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} target The target state ID.
	 * @returns {NFA}
	 */
	removeTransition(origin, target) {
		origin = this.state(origin);
		target = this.state(target);

		if (!this.hasTransition(origin, target)) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();
		const transitions = nfa._transitions.get(origin).asMutable();
		nfa._transitions = nfa._transitions.asMutable().set(origin, transitions.delete(target));

		// If the NFA was a DFA, it definitely still is.
		if (cache.isDFA) {
			nfa._cache.isDFA = true;
		}

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set up the NFA to be run, resetting to the start state and erasing the input buffer.
	 * @param {String} [input] The (initial) input to add to the input buffer.
	 */
	reset(input) {
		const nfa = this.mutable(true);
		delete nfa._cache.result;

		nfa._current = Set().asMutable();
		nfa._current = nfa._current.add(this.start);
		nfa._remaining = "";
		if (input) {
			nfa._remaining = input;
		}
		nfa._current = nfa._followEmptyTransitions(nfa._current);

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Run the NFA on the remaining input, stopping early if a definite rejection is reached.
	 * @param {String} [input] Optional input to add to the remaining input before running.
	 * @returns {NFA}
	 */
	run(input) {
		if (this.result === -1) {
			return this;
		}
		const nfa = this.mutable(true);
		if (input) {
			nfa.read(input);
		}
		while (nfa.remainingInput && nfa.result !== -1) {
			nfa.step();
		}
		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Run the NFA on the entire remaining input, continuing to run even if a definite rejection is reached.
	 * @param {String} [input] The (initial) input to add to the input buffer.
	 * @returns {NFA}
	 */
	runComplete(input) {
		const nfa = this.mutable(true);
		if (input) {
			nfa.read(input);
		}
		while (nfa.remainingInput) {
			nfa.step();
		}
		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set whether a state is an accept state or not.
	 * @param {Number} state The state to set.
	 * @param {Boolean} accept Whether it should be an accept state.
	 * @returns {NFA} The new NFA.
	 */
	setAccept(state, accept) {
		state = this.state(state);
		accept = Boolean(accept);

		if (!state || this.isAccept(state) === accept) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();

		nfa._accept = nfa._accept.asMutable();
		if (accept) {
			nfa._accept = nfa._accept.add(state);
		} else {
			nfa._accept = nfa._accept.delete(state);
		}

		nfa._cache.generatingStates = cache.generatingStates;
		nfa._cache.isDFA = cache.isDFA;

		if (!this._mutable) {
			console.log("Making immutable again");
			nfa.immutable();
		}

		return nfa;
	}

	/**
	 * Set the name of a state.
	 * @param {Number} state The state to set.
	 * @param {String} name The new name.
	 * @returns {NFA} The new NFA.
	 */
	setName(state, name) {
		state = this.state(state);
		if (!state || this.name(state) === name) {
			return this;
		}

		const nfa = this.mutable();
		nfa._names = nfa._names.asMutable().set(state, name);

		if (!this._mutable) {
			nfa.immutable();
		}

		return nfa;
	}

	/**
	 * Set a new start state.
	 * @param {Number} state The new start state.
	 * @returns {NFA} The new NFA.
	 */
	setStart(state) {
		state = this.state(state);
		if (this.isStart(state)) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();
		nfa._start = state;

		nfa._cache.generatingStates = cache.generatingStates;
		nfa._cache.isDFA = cache.isDFA;
		nfa._cache.result = cache.result;

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set the symbols of a transition (creating the transition if it does not exist).
	 * @param {Number} id ID of the origin state.
	 * @param {Number} target ID of the target state.
	 * @param {String|SymbolGroup} symbols The new symbol group.
	 * @returns {NFA} The new NFA.
	 */
	setTransition(origin, target, symbols) {
		origin = this.state(origin);
		target = this.state(target);

		if (!origin || !target) {
			return this;
		}

		let creatingNew = true;

		symbols = new SymbolGroup(symbols);
		if (this.hasTransition(origin, target)) {
			creatingNew = false;
			if (symbols.equals(this.symbols(origin, target))) {
				return this;
			}
		}

		const cache = this._cache;
		const nfa = this.mutable();

		const transitions = nfa._transitions.get(origin).asMutable();
		// Update the transition
		nfa._transitions = nfa._transitions.asMutable().set(origin, transitions.set(target, symbols));

		// Note that the graph structure itself is unchanged if a new transition is not being created
		if (!creatingNew) {
			nfa._cache.generatingStates = cache.generatingStates;
			nfa._cache.reachableStates = cache.reachableStates;
		}

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set the target of a transition. If the new target already has a transition set, merge them.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} oldTarget The old target state ID.
	 * @param {Number} newTarget The new target state ID.
	 * @returns {NFA} The new NFA.
	 */
	setTransitionTarget(origin, oldTarget, newTarget) {
		origin = this.state(origin);
		oldTarget = this.state(oldTarget);
		newTarget = this.state(newTarget);

		if (!origin || !oldTarget || !newTarget || oldTarget === newTarget || !this.hasTransition(origin, oldTarget)) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();

		const newSymbols = this.symbols(origin, oldTarget).merge(this.symbols(origin, newTarget));
		nfa.removeTransition(origin, oldTarget);
		nfa.setTransition(origin, newTarget, newSymbols);

		if (cache.isDFA) {
			// If it was a DFA before, it definitely still is now (and might have become one if transitions were merged)
			nfa._cache.isDFA = cache.isDFA;
		}

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Return a state ID as a number, or 0 if the state is invalid.
	 * @param {Number} state The state ID.
	 * @returns {Number} The state ID, or 0 if the state is invalid.
	 */
	state(state) {
		state = Number(state);
		if (!this._states.has(state)) {
			return 0;
		}
		return state;
	}

	/**
	 * Consume the next symbol from the remaining input, updating the NFA's current states accordingly.
	 * @returns {NFA}
	 */
	step() {
		if (!this.remainingInput) {
			return this;
		}
		const nfa = this.mutable(true);
		delete nfa._cache.result;

		// Get the next symbol; for now, assume no combining characters
		const symbol = this._remaining[0];
		this._remaining = this._remaining.substr(1);

		// Follow each applicable transition from each of the current states
		const newStates = Set().asMutable();
		for (const origin of nfa._current) {
			for (const [target, symbols] of nfa.transitionsFrom(origin)) {
				if (symbols.matches(symbol)) {
					newStates.add(target);
				}
			}
		}

		// And follow all empty transitions from the resultant states
		nfa._followEmptyTransitions(newStates);
		nfa._current = newStates;

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Return the symbols of a transition from one state to another.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} target The target state ID.
	 * @returns {SymbolGroup|undefined} The symbols if target was given, or undefined if there is no such transition.
	 */
	symbols(origin, target) {
		origin = this.state(origin);
		target = this.state(target);
		if (!this.hasTransition(origin, target)) {
			return;
		}
		return this._transitions.get(origin).get(target);
	}

	/**
	 * Return the symbols of a transition from one state to another, as a string.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} target The target state ID.
	 * @returns {String} The symbols as a string, or empty string if there is no such transition.
	 */
	symbolsString(origin, target) {
		const symbols = this.symbols(origin, target);
		if (!symbols) {
			return "";
		} else {
			return symbols.toString();
		}
	}

	/**
	 * Iterate over the potential target states of a transition from a given state.
	 * @param {Number} origin The origin state ID.
	 * @param {String} [symbol] The symbol on which to transition. If not given, all potential targets will be yielded.
	 * @returns {Iterator<Number>} An iterator over the potential targets.
	 */
	*targets(origin, symbol) {
		origin = this.state(origin);
		if (!origin) {
			return;
		}
		if (symbol === undefined) {
			yield* this._transitions.get(origin).keys();
			return;
		}
		// TODO
		throw new Error("targets() incomplete");
	}

	/**
	 * Toggle whether a state is an accept state or not.
	 * @param {Number} state The state.
	 * @returns {NFA} The new NFA.
	 */
	toggleAccept(state) {
		return this.setAccept(state, !this.isAccept(state));
	}

	/**
	 * Get the potential transitions from a given state.
	 * @param {Number} origin The origin state ID.
	 * @returns {Map<Number, SymbolGroup>|Map<Number, Map>} An map of the form [target : Number, symbols : SymbolGroup].
	 */
	transitionsFrom(origin) {
		origin = this.state(origin);
		if (!origin) {
			return Map();
		}
		return this._transitions.get(origin);
	}
}

export default NFA;
