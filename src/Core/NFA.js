//import {freeze} from '../Util/immutability.js';
import {Map, Set} from 'immutable';
import SymbolGroup from './SymbolGroup.js';

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

		// Set of current states, if stepping through the machine
		_current: Set<state: Number>,

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
		_generating: Set<state: Number>,
		_reachable: Set<state: Number>,
		_dfa: Boolean,
	}
 *
 * If mutable = true, update functions will directly modify the NFA and its elements (and theirs)
 * on which they are called, and return it.
 * Otherwise, they will create a minimal copy (maintaining as many references as possible) and return
 * the copy.
 * If not mutable, it is possible to do things like compare oldNFA.states === newNFA.states to see if any states have been added or removed.
 */
class NFA {
	constructor(template) {
		this._mutable = true;

		// If this is a copy of an existing NFA ...
		if (template instanceof NFA) {
			for (var k in template) {
				this[k] = template[k];
			}
			this._mutable = true;
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

		this._calculateReachable();
		this._calculateGenerating();
		this._calculateWhetherDFA();

		// Immutable by default
		if (!template.mutable) {
			this.immutable();
		}
	}

	/**
	 * Determine the generating states (those with a path from the start state to them)
	 * and add them to this._generating
	*/
	_calculateGenerating() {
		this._generating = Set().asMutable();

		for (const state of this.acceptStates) {
			this._explore(state, this._generating, true);
		}

		// This should never be mutated
		this._generating.asImmutable();
	}

	/**
	 * Determine the reachable states (those with a path from the start state to them)
	 * and add them to this._reachable
	 */
	_calculateReachable() {
		this._reachable = Set().asMutable();
		if (this._start) {
			this._explore(this._start, this._reachable);
		}
		// This should never be mutated
		this._reachable.asImmutable();
	}

	/**
	 * Calculate whether the NFA is also a DFA, and store it in this._dfa.
	 * @returns {Boolean}
	 */
	_calculateWhetherDFA() {
		// For each state, check whether any of its transition symbol groups intersect
		for (const [, transitions] of this.transitions) {
			if (SymbolGroup.overlap(transitions.values())) {
				this._dfa = false;
				return;
			}
		}
		this._dfa = true;
	}

	/**
	 * Perform a DFS from (and including) the given state on its transitions.
	 * @param {Number} state The state to start from. If it has been visited already, _explore() will do nothing.
	 * @param {Set<Number>} visited The set of visited states. This will be modified by the function.
	 * @param {Boolean} [backwards = false] Whether to go backwards (so states that transition TO the given state will be explored instead).
	 * @returns {Set<Number>} The (modified) set of visited states.
	 */
	_explore(state, visited, backwards) {
		backwards = backwards || false;
		if (visited.has(state)) {
			return visited;
		}
		visited.add(state);
		if (backwards) {
			for (const origin of this.states) {
				if (this.hasTransition(origin, state)) {
					this._explore(origin, visited, backwards);
				}
			}
		} else {
			for (const target of this.targets(state)) {
				this._explore(target, visited, backwards);
			}
		}
		return visited;
	}

	/**
	 * Get the accept states.
	 * @returns {Set<Number>} The set of accept states.
	 */
	get acceptStates() {
		return this._accept;
	}

	/**
	 * Get the number of states in the NFA.
	 * @returns {Number}
	 */
	get numStates() {
		return this._states.size;
	}

	/**
	 * @returns {Set<Number>} Set of the NFA's states.
	 */
	get states() {
		return this._states;
	}

	/**
	 * @returns {Map<Number, Map>} Map of the NFA's transitions, of the form Map<origin: Number, Map<target: Number, symbols: SymbolGroup>.
	 */
	get transitions() {
		return this._transitions;
	}

	/**
	 * Check whether a given state is an accept state.
	 * @param {Number} state The state to check.
	 * @returns {Boolean}
	 */
	accept(state) {
		return this._accept.has(this.state(state));
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

		const nfa = this.mutable();

		nfa._states = nfa._states.asMutable().add(id);
		nfa._names = nfa._names.asMutable().set(id, name);
		nfa._transitions = nfa._transitions.asMutable().set(id, Map());

		// Note that the new state is trivially neither reachable nor generating, so no need to recalculate those.

		if (!this._mutable) {
			nfa.immutable();
		}

		return nfa;
	}

	/**
	 * Check whether the given state is generating (has a path to an accept state).
	 * @param {Number} state The state to check.
	 * @returns {Boolean}
	 */
	generating(state) {
		return this._generating.has(this.state(state));
	}

	/**
	 * Return whether there is a transition from one state to another.
	 * @param {Number} origin The origin state ID.
	 * @param {Number} target The origin state ID.
	 * @returns {Boolean}
	 */
	hasTransition(origin, target) {
		origin = this.state(origin);
		target = this.state(target);
		if (!origin || !target || !this._transitions.has(origin)) {
			return;
		}
		return this._transitions.get(origin).has(target);
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
		Object.freeze(this);
		return this;
	}

	/**
	 * Return whether the NFA is also a DFA (i.e., each state has only one possible target state to which it can transition on a given symbol).
	 * @returns {Boolean}
	 */
	isDFA() {
		return this._dfa;
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
	 * Return a shallow, mutable copy of this NFA (or itself it is already mutable).
	 * It will be mutable, so it can have elements replaced if need be (but any previously immutable elements will remain so).
	 * @returns {NFA}
	 */
	mutable() {
		if (this._mutable) {
			return this;
		}
		return new NFA(this);
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
		return this._reachable.has(this.state(state));
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

		const nfa = this.mutable();

		// Delete all transitions from the state
		nfa._transitions = nfa._transitions.asMutable().delete(state);

		// Delete all transitions to the state
		for (const origin of nfa._transitions.keys()) {
			console.log("Removing transition from " + origin + " to " + state);
			nfa.removeTransition(origin, state);
		}
		nfa._states = nfa._states.asMutable().delete(state);

		nfa._calculateGenerating();
		nfa._calculateReachable();
		if (!nfa.isDFA()) {
			// It might have become a DFA
			nfa._calculateWhetherDFA();
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

		const nfa = this.mutable();
		const transitions = nfa._transitions.get(origin).asMutable();
		nfa._transitions = nfa._transitions.asMutable().set(origin, transitions.delete(target));

		nfa._calculateGenerating();
		nfa._calculateReachable();
		if (!nfa.isDFA()) {
			// It might have become a DFA
			nfa._calculateWhetherDFA();
		}

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
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
	 * Set whether a state is an accept state or not.
	 * @param {Number} state The state to set.
	 * @param {Boolean} accept Whether it should be an accept state.
	 * @returns {NFA} The new NFA.
	 */
	setAccept(state, accept) {
		state = this.state(state);
		accept = Boolean(accept);

		if (!state || this.accept(state) === accept) {
			return this;
		}

		const nfa = this.mutable();

		nfa._accept = nfa._accept.asMutable();
		if (accept) {
			nfa._accept = nfa._accept.add(state);
		} else {
			nfa._accept = nfa._accept.delete(state);
		}

		nfa._calculateGenerating();

		if (!this._mutable) {
			console.log("Making immutable again");
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

		const nfa = this.mutable();
		nfa._start = state;
		nfa._calculateReachable();

		if (!this._mutable) {
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

		symbols = new SymbolGroup(symbols);
		console.log(symbols);
		if (symbols.equals(this.symbols(origin, target))) {
			return this;
		}

		const nfa = this.mutable();
		const transitions = nfa._transitions.get(origin).asMutable();
		// Update the transition
		nfa._transitions = nfa._transitions.asMutable().set(origin, transitions.set(target, symbols));

		// Note that the graph structure itself is unchanged, so no need to recalculate generating or reachable.
		nfa._calculateWhetherDFA();

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

		const nfa = this.mutable();

		const newSymbols = this.symbols(origin, oldTarget).merge(this.symbols(origin, newTarget));
		nfa.removeTransition(origin, oldTarget);
		nfa.setTransition(origin, newTarget, newSymbols);

		nfa._calculateReachable();
		nfa._calculateGenerating();
		if (!nfa.isDFA()) {
			// It might have become a DFA (if any targets were merged)
			nfa._calculateWhetherDFA();
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
	 * Toggle whether a state is an accept state or not.
	 * @param {Number} state The state.
	 * @returns {NFA} The new NFA.
	 */
	toggleAccept(state) {
		return this.setAccept(state, !this.accept(state));
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
