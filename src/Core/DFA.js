import {copy, freeze} from '../util.js';
import SymbolGroup from './SymbolGroup.js';

/**
	{
		_mutable: Boolean,
		alphabet: SymbolGroup,
		_start: Number,

		// Map of states to their names
		_states: Map([
			[id: Number, name: String]
		]),

		// Set of accept states
		_accept: Set({}),

		// Set of current states, if stepping through the machine
		_current: Set({}),

		_transitions: Map([
			[origin: Number, transition: Map([
				[target: Number, symbols: SymbolGroup]
			])
		])

		// A single object shared by the DFA and all its copies
		_shared: {
			nextID: 1,
		}

		// Automatically generated
		_generating: Set([id]),
		_reachable: Set([id])
	}
 * 
 * If mutable = true, update functions will directly modify the DFA and its elements (and theirs)
 * on which they are called, and return it.
 * Otherwise, they will create a minimal copy (maintaining as many references as possible) and return
 * the copy.
 */
class DFA {
	constructor(template) {
		// If this is a copy of an existing DFA ...
		if (template instanceof DFA) {
			for (var k in template) {
				this[k] = template[k];
			}
			this._frozen = undefined;
			return this;
		}

		this._shared = {
			nextID: 1,
		};

		this._start = 0;
		this._states = new Map();
		this._accept = new Set();
		this._transitions = new Map();

		// Parse input states
		if (template.states instanceof Array) {
			for (let i = 0; i < template.states.length; i++) {
				let state = this._shared.nextID;
				this._states.set(state, template.states[i].name);
				if (template.states[i].accept) {
					this._accept.add(state);
				}
				this._transitions.set(state, new Map(template.states[i].transitions));
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

		this.calculateReachable();
		this.calculateGenerating();

		// Mutable by default
		if (template.mutable === undefined || template.mutable) {
			this._mutable = true;
		} else {
			this.immutable();
		}
	}

	/**
	 * Return a shallow copy of this DFA.
	 * It will be (shallowly) mutable, so it can have elements replaced if need be (any previously immutable elements will remain so).
	 * Afterwards it must be frozen again.
	 */
	copy() {
		return new DFA(this);
	}

	/**
	 * Make this DFA (deeply) immutable, preventing any further changes from ever being made to it or its constituents.
	 */
	immutable() {
		this._mutable = false;
		for (const transitions of this._transitions.values()) {
			freeze(transitions);
		}
		freeze(this._accept);
		freeze(this._states);
		freeze(this._transitions);
		freeze(this);
	}

	/**
	 * Return the number of states in the DFA.
	 */
	get numStates() {
		return this._states.size;
	}

	/**
	 * Return the accept states, or whether a given state is an accept state.
	 * @param {Number} [state] The state to check.
	 * @returns {Set|Boolean} The set of accept states if no arg, or whether the arg is an accept state.
	 */
	accept(state) {
		if (state === undefined) {
			return this._accept;
		}
		return this._accept.has(this.state(state));
	}

	/**
	 * Return the set of generating states (states which have paths to an accept state), or whether the given state is generating.
	 * @param {Number} [state] The state to check.
	 * @returns {Set|Boolean} The set of generating states if no arg, or whether the arg is generating.
	 */
	generating(state) {
		if (state === undefined) {
			return this._generating;
		}
		return this._generating.has(this.state(state));
	}

	/**
	 * Return the name of a state.
	 * @param {Number} state The state ID.
	 * @returns {String|undefined} The state's name, or undefined if not a state.
	 */
	name(state) {
		return this._states.get(state);
	}

	/**
	 * Return the set of reachable states (states which have paths from the start state), or whether the given state is reachable.
	 * @param {Number} [state] The state to check.
	 * @returns {Set|Boolean} The set of reachable states if no arg, or whether the arg is reachable.
	 */
	reachable(state) {
		if (state === undefined) {
			return this._reachable;
		}
		return this._reachable.has(this.state(state));
	}

	/**
	 * Return the start state, or whether a state is the start state.
	 * @param {Number} [state] The state to check.
	 * @returns {Number|Boolean} Whether the arg is the start state, or the start state ID if no arg.
	 */
	start(state) {
		if (state === undefined) {
			return this._start;
		} else {
			state = this.state(state);
			return state && this._start === state;
		}
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
	 * @returns {Iterator} Iterator for the DFA's state IDs.
	 */
	states() {
		return this._states.keys();
	}

	stateData(state) {
		state = this.state(state);
		if (!state) {
			return null;
		}
		return {
			id: state,
			accept: this.accept(state),
			generating: this.generating(state),
			name: this.name(state),
			reachable: this.reachable(state),
			transitions: this.transitions(state),
		}
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
		if (!origin || !target) {
			return;
		}
		return this._transitions.get(origin).get(target);
	}

	/**
	 * Return the potential target states of a transition from a given state.
	 * @param {Number} origin The origin state ID.
	 * @param {String} [symbol] The symbol on which to transition. If not given, all potential targets will be returned.
	 * @returns {Set} Set of potential targets.
	 */
	targets(origin, symbol) {
		origin = this.state(origin);
		if (!origin) {
			return new Set();
		}
		if (symbol === undefined) {
			return new Set(...this._transitions.get(origin).keys());
		}
		// TODO
		throw new Error("targets() incomplete");
	}

	/**
	 * Return whether there is a transition from one state to another.
	 */
	transition(origin, target) {
		return this.symbols(origin, target);
	}

	/**
	 * Return a map of transitions from a state, or all transitions.
	 * @param {Number} [origin] The origin state ID.
	 * @returns {Map} A map from target : Number to symbols : SymbolGroup, or from origin to such a map.
	 */
	transitions(origin) {
		if (origin === undefined) {
			return this._transitions;
		}
		origin = this.state(origin);
		if (!origin) {
			return;
		}
		return this._transitions.get(origin);
	}

	/**
	 * Determine the generating states (those with a path from the start state to them)
	 * and add them to this._generating
	*/
	calculateGenerating() {
		this._generating = new Set();

		for (const state of this.accept()) {
			this.explore(state, this._generating, true);
		}

		// This should never be mutated
		freeze(this._generating);
	}

	/**
	 * Determine the reachable states (those with a path from the start state to them)
	 * and add them to this._reachable
	 */
	calculateReachable() {
		this._reachable = new Set();
		if (!this._start) {
			return;
		}
		this.explore(this._start, this._reachable);

		// This should never be mutated
		freeze(this._reachable);
	}

	explore(state, visited, backwards) {
		backwards = backwards || false;
		if (visited.has(state)) {
			return visited;
		}
		console.log("Visited " + state);
		visited.add(state);
		if (backwards) {
			for (const origin of this.states()) {
				if (this.transition(origin, state)) {
					this.explore(origin, visited, backwards);
				}
			}
		} else {
			for (const [target, ] of this.transitions(state)) {
				this.explore(target, visited, backwards);
			}
		}
		return visited;
	}

	/**
	 * Set a new start state.
	 */
	setStart(state) {
		state = this.state(state);
		if (this.start(state)) {
			return this;
		}
		let dfa = this;
		if (!this._mutable) {
			dfa = dfa.copy();
		}
		dfa._start = state;
		dfa.calculateReachable();

		if (!this._mutable) {
			freeze(dfa);
		}
		return dfa;
	}

	/**
	 * Update whether a state is an accept state or not.
	 */
	setAccept(state, accept) {
		state = this.state(state);
		accept = Boolean(accept);

		if (!state || this.accept(state) === accept) {
			return this;
		}

		let dfa = this;
		if (!this._mutable) {
			dfa = dfa.copy();
			dfa._accept = copy(dfa._accept);
		}
		
		if (accept) {
			dfa._accept.add(state);
		} else {
			dfa._accept.delete(state);
		}

		dfa.calculateGenerating();

		if (!this._mutable) {
			freeze(dfa._accept);
			freeze(dfa);
		}

		return dfa;
	}

	/**
	 * Update the name of a state.
	 */
	setName(state, name) {
		state = this.state(state);
		if (!state || this.name(state) === name) {
			return this;
		}

		var dfa = this;
		if (!this._mutable) {
			dfa = dfa.copy();
			dfa._states = copy(dfa._states);
		}

		dfa._states.set(state, name);

		if (!this._mutable) {
			freeze(dfa._states);
			freeze(dfa);
		}

		return dfa;
	}

	/**
	 * Update the symbols of a transition.
	 * @param {Number} id ID of the origin state.
	 * @param {Number} target ID of the target state.
	 * @param {String|SymbolGroup} symbols The new symbol group.
	 * @returns {DFA} The new DFA.
	 */
	setTransitionSymbols(origin, target, symbols) {
		// Note that the graph structure itself is unchanged, so no need to recalculate anything.
		origin = this.state(origin);
		target = this.state(target);

		if (!origin || !target) {
			return this;
		}

		symbols = new SymbolGroup(symbols);
		if (symbols.equals(this.transition(origin, target))) {
			return this;
		}

		let dfa = this;
		let transitions = dfa._transitions.get(origin);
		if (!this._mutable) {
			dfa = dfa.copy();
			dfa._transitions = copy(dfa._transitions);
			transitions = copy(transitions);
			dfa._transitions.set(origin, transitions);
		}

		// Update the transition
		transitions.set(target, symbols);

		if (!this._mutable) {
			freeze(transitions);
			freeze(dfa._transitions);
			freeze(dfa);
		}
		return dfa;
	}

	/**
	 * Update the target of a transition. If the new target already has a transition set, merge them.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} oldTarget The old target state ID.
	 * @param {Number} newTarget The new target state ID.
	 * @returns {DFA} The new DFA.
	 */
	setTransitionTarget(origin, oldTarget, newTarget) {
		origin = this.state(origin);
		oldTarget = this.state(oldTarget);
		newTarget = this.state(newTarget);

		if (!origin || !oldTarget || !newTarget || oldTarget === newTarget || !this.transition(origin, oldTarget)) {
			return this;
		}
		let dfa = this;
		let transitions = dfa._transitions.get(origin);
		if (!this._mutable) {
			dfa = dfa.copy();
			dfa._transitions = copy(dfa._transitions);
			transitions = copy(transitions);
			dfa._transitions.set(origin, transitions);
		}

		let newSymbols = transitions.get(oldTarget).merge(transitions.get(newTarget));
		transitions.delete(oldTarget);
		transitions.set(newTarget, newSymbols);

		dfa.calculateReachable();
		dfa.calculateGenerating();

		if (!this._mutable) {
			freeze(transitions);
			freeze(dfa._transitions);
			freeze(dfa);
		}
		return dfa;
	}

	/**
	 * Toggle whether a state is an accept state or not.
	 */
	toggleAccept(state) {
		return this.setAccept(state, !this.accept(state));
	}
}

export default DFA;
