import {Map, Set, isImmutable} from 'immutable';
import SymbolGroup from './SymbolGroup';

/**
 * If mutable = true, update functions will directly modify the NFA and its elements (and theirs)
 * on which they are called, and return it.
 * Otherwise, they will create a minimal copy (maintaining as many references as possible) and return
 * the copy.
 * If not mutable, it is possible to do things like compare oldNFA.states === newNFA.states to see if
 * any states have been added or removed.
 * 
 * There are a few ways to run the machine:
 * 1. nfa.accepts(input);
 * 2. nfa.reset(input); nfa.step(); nfa.step();
 * 3. nfa.reset(); nfa.read(input); nfa.run();
 * 3. nfa.reset(); nfa.run(inputChunk); nfa.run(inputChunk);
 * nfa.result can be used to examine the result at any time.
 */

export type State = number;
export type NFATemplate = {
	states: Iterable<{
		name: string,
		accept?: boolean,
		transitions: Iterable<[State, string]>,
	}>,
	start: State,
	mutable?: boolean,
};
export type TransitionGroup = Map<State, SymbolGroup>;
export type TransitionMap = Map<State, TransitionGroup>;

export default class NFA {
	protected _states: Set<State>;
	protected _start: State;
	protected _names: Map<State, string>;
	protected _accept: Set<State>;
	protected _transitions: TransitionMap;
	protected _mutable: boolean;

	// Automatically generated
	protected _cache: {
		generatingStates?: Set<State>,
		isDFA?: boolean,
		reachableStates?: Set<State>,
		willAccept?: boolean,
	};

	// A single object shared by the NFA and all its copies
	protected _shared: {
		nextID: number,
	};
	
	constructor(template: NFA | NFATemplate, mutable?: boolean) {
		console.log("constructing");
		this._init(template, mutable);
	}

	protected _init(template: NFA | NFATemplate, mutable?: boolean): this {
		this._mutable = true;
		this._start = 0;
		this._states = Set<State>().asMutable();
		this._names = Map<State, string>().asMutable();
		this._accept = Set<State>().asMutable();
		this._transitions = <TransitionMap> Map().asMutable();
		this._cache = {};

		// If this is a copy of an existing NFA ...
		if (template instanceof NFA) {
			for (var k in template) {
				if (template.hasOwnProperty(k)) {
					this[k] = template[k];
				}
			}
			this._cache = {}; // All new NFAs get a new cache
			this._mutable = true;
			if (mutable === undefined) {
				mutable = template._mutable;
			}
			if (!mutable) {
				if (template._mutable) {
					// If the new DFA is immutable but the old one was not, we must explicitly make the new one immutable.
					this.immutable();
				} else {
					// The one exception to each NFA having its own cache is if they are both immutable
					// (and thus will be exactly the same forever).
					this._mutable = false;
					this._cache = template._cache;
				}
			}
			return this;
		}

		// Otherwise, build a new NFA from a template.
		this._shared = {
			nextID: 1,
		};

		// Parse input states
		for (const stateData of template.states) {
			const state = this._shared.nextID;
			this._states.add(state);
			this._names.set(state, stateData.name);
			if (stateData.accept) {
				this._accept.add(state);
			}
			// Parse transitions
			const transitions = <TransitionGroup> Map().asMutable();
			for (const [target, symbolsStr] of stateData.transitions) {
				transitions.set(target, new SymbolGroup(symbolsStr));
			}

			this._transitions.set(state, transitions);
			this._shared.nextID++;
		}

		this._start = this.state(template.start);

		// If mutable param is given, that will be used; otherwise, template.mutable is used; otherwise, immutable by default.
		if (mutable === undefined) {
			mutable = template.mutable || false;
		}
		if (!mutable) {
			this.immutable();
		}

		return this;
	}

	/**
	 * Perform a DFS from (and including) the given state on its transitions.
	 * @param state  The state to start from. If it has been visited already, _explore() will do nothing.
	 * @param visited  The set of visited states. Must be mutable (and will be modified).
	 * @param backwards  Whether to go backwards (so states that transition TO the given state will be explored instead).
	 */
	protected _explore(state: State, visited: Set<State>, backwards?: boolean): Set<State> {
		backwards = backwards || false;
		if (visited.has(state)) {
			return visited;
		}
		visited.add(state);
		if (backwards) {
			for (const origin of this._states) {
				if (this.hasTransition(origin, state)) {
					this._explore(origin, visited, backwards);
				}
			}
		} else {
			for (const [target, ] of this.transitionsFrom(state)) {
				this._explore(target, visited, backwards);
			}
		}
		return visited;
	}

	/**
	 * Get the accept states.
	 */
	get acceptStates(): Set<State> {
		return this._accept;
	}

	/**
	 * Get the generating states (those with a path to an accept state).
	 */
	get generatingStates(): Set<State> {
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
	 * Get whether the NFA is also a DFA (i.e., each state has only one possible target state
	 * to which it can transition on a given symbol).
	 */
	get isDFA(): boolean {
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
	 */
	get numStates(): number {
		return this._states.size;
	}

	/**
	 * Get the reachable states (those with a path from the start state to them).
	 */
	get reachableStates(): Set<State> {
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
	 * Get the NFA's start state.
	 */
	get start(): State {
		return this._start;
	}

	/**
	 * Get the NFA's states.
	 */
	get states(): Set<State> {
		return this._states.asImmutable();
	}

	/**
	 * Get a map of the NFA's transitions, of the form Map<origin, Map<target, symbols>>.
	 */
	get transitions(): TransitionMap {
		return this._transitions.asImmutable();
	}

	/**
	 * Add a new blank state.
	 * @param name  The name of the new state (default "New state").
	 */
	addState(name: string): this {
		if (name === undefined) {
			name = "New state";
		}

		// Use a unique ID for the new state which has never been used by this NFA or its family of clones.
		const id = this._shared.nextID;
		this._shared.nextID++;

		const nfa = this.mutable(true); // Note that the entire cache can be copied

		nfa._states = nfa._states.asMutable().add(id);
		nfa._names = nfa._names.asMutable().set(id, name);
		nfa._transitions = nfa._transitions.asMutable().set(id, <TransitionGroup> Map().asMutable());

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Check whether the given state is generating (has a path to an accept state).
	 * @param state  The state to check.
	 */
	generating(state: State): boolean {
		return this.generatingStates.has(this.state(state));
	}

	/**
	 * Return whether there is a transition from one state to another.
	 * @param origin  The origin state ID.
	 * @param target  The origin state ID.
	 * @param symbol  If provided, will only return true if the transition is on this symbol.
	 */
	hasTransition(origin: State, target: State, symbol?: string): boolean {
		origin = this.state(origin);
		target = this.state(target);
		if (!origin || !target) {
			return false;
		}
		const transitions = this._transitions.get(origin);
		if (!transitions) {
			return false;
		}
		const symbols = transitions.get(target);
		if (!symbols) {
			return false;
		}
		if (symbol !== undefined && !symbols.matches(symbol)) {
			return false;
		}
		return true;
	}

	/**
	 * Make this NFA (deeply) immutable, preventing any further changes from ever being made to it or its constituents.
	 */
	immutable(): this {
		console.log("immutable");
		if (!this._mutable) {
			return this;
		}
		this._mutable = false;

		// Note that there is currently a bug in immutable.js which seems to sometimes make asImmutable() return a new object
		// rather than the original, leaving the original mutable.

		if (!isImmutable(this._transitions)) {
			const allTransitions = this._transitions as TransitionMap;
			for (const [origin, transitions] of allTransitions) {
				allTransitions.set(origin, transitions.asImmutable());
			}
			this._transitions = allTransitions.asImmutable();
		}
		this._accept = this._accept.asImmutable();
		this._states = this._states.asImmutable();
		this._names = this._names.asImmutable();
		Object.freeze(this);
		return this;
	}

	/**
	 * Check whether a given state is an accept state.
	 */
	isAccept(state: State): boolean {
		return this._accept.has(this.state(state));
	}

	/**
	 * Check whether a state is the start state.
	 */
	isStart(state: State): boolean {
		state = this.state(state);
		return !!state && this._start === state;
	}

	/**
	 * Return a shallow, mutable copy of this NFA (or itself it is already mutable).
	 * Also empties the cache, thus fully preparing it for modification.
	 * It will be mutable, so it can have elements replaced if need be
	 * (but any previously immutable elements will remain so).
	 * @param keepCache  Whether to copy/keep the cache from the old object.
	 */
	mutable(keepCache: boolean = false): this {
		if (this._mutable) {
			if (!keepCache) {
				this._cache = {};
			}
			return this;
		}
		return this.mutableCopy(keepCache);
	}

	/**
	 * Return a shallow, mutable copy of the NFA.
	 */
	mutableCopy(copyCache: boolean = true): this {
		const nfa = new (this.constructor as any)(this, true);
		if (copyCache) {
			for (const key in this._cache) {
				if (this._cache.hasOwnProperty(key)) {
					nfa._cache[key] = this._cache[key];
				}
			}
		}
		return nfa;
	}

	/**
	 * Return the name of a state, or empty string if not a state.
	 */
	name(state: State): string {
		return this._names.get(state) || "";
	}

	/**
	 * Check whether the given state is reachable (has a path from the start state).
	 */
	reachable(state: State): boolean {
		return this.reachableStates.has(this.state(state));
	}

	/**
	 * Remove a state (and all associated transitions).
	 */
	removeState(state: State): this {
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
	 */
	removeTransition(origin: State, target: State): this {
		origin = this.state(origin);
		target = this.state(target);

		if (!this.hasTransition(origin, target)) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();
		const transitions = (<TransitionGroup> nfa._transitions.get(origin)).asMutable();
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
	 * Set whether a state is an accept state or not.
	 * @param state  The state to set.
	 * @param accept  Whether it should be an accept state.
	 */
	setAccept(state: State, accept: boolean): this {
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

		nfa._cache.reachableStates = cache.reachableStates;
		nfa._cache.isDFA = cache.isDFA;

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set the name of a state.
	 * @param state  The state to set.
	 * @param name  The new name.
	 * @returns The new NFA.
	 */
	setName(state: State, name: string): this {
		state = this.state(state);
		if (!state || this.name(state) === name) {
			return this;
		}

		const nfa = this.mutable(true);
		nfa._names = nfa._names.asMutable().set(state, name);

		if (!this._mutable) {
			nfa.immutable();
		}

		return nfa;
	}

	/**
	 * Set a new start state.
	 */
	setStart(state: State): this {
		state = this.state(state);
		if (this.isStart(state)) {
			return this;
		}

		const cache = this._cache;
		const nfa = this.mutable();
		nfa._start = state;

		nfa._cache.generatingStates = cache.generatingStates;
		nfa._cache.isDFA = cache.isDFA;

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set the symbols of a transition (creating the transition if it does not exist).
	 * @param id  ID of the origin state.
	 * @param target  ID of the target state.
	 * @param symbols  The new symbol group.
	 */
	setTransition(origin: State, target: State, symbols: SymbolGroup | string): this {
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

		// hasTransition() above guarantees that this is not undefined
		const transitions = (<TransitionGroup> nfa._transitions.get(origin)).asMutable();

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
	 */
	setTransitionTarget(origin: State, oldTarget: State, newTarget: State): this {
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
	state(state: State) {
		state = Number(state);
		if (!this._states.has(state)) {
			return 0;
		}
		return state;
	}

	/**
	 * Return the symbols of a transition from one state to another (empty group if none).
	 */
	symbols(origin: State, target: State): SymbolGroup {
		origin = this.state(origin);
		target = this.state(target);
		const transitions = this._transitions.get(origin);
		if (!transitions) {
			return new SymbolGroup();
		}
		return transitions.get(target) || new SymbolGroup();
	}

	/**
	 * Return the symbols of a transition from one state to another, as a string (empty string if no such transition).
	 */
	symbolsString(origin: State, target: State) {
		const symbols = this.symbols(origin, target);
		if (!symbols) {
			return "";
		} else {
			return symbols.toString();
		}
	}

	/**
	 * Toggle whether a state is an accept state or not.
	 */
	toggleAccept(state: State): this {
		return this.setAccept(state, !this.isAccept(state));
	}

	/**
	 * Get the potential transitions from a given state (empty map on fail).
	 */
	transitionsFrom(origin: State): TransitionGroup {
		origin = this.state(origin);
		return this._transitions.get(origin) || <TransitionGroup> Map();
	}
}
