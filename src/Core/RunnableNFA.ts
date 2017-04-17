import NFA, {Definition, State, SymbolGroup, TransitionGroup, TransitionMap} from './NFA';
import {Map, Set} from 'immutable';
import {shareAny} from '../Util/sets';

export type Definition = Definition;
export type Result = -1 | 0 | 1;
export type State = State;
export type TransitionGroup = TransitionGroup;
export type TransitionMap = TransitionMap;

export {SymbolGroup};

export default class RunnableNFA extends NFA {
	// Set of current possible states while running (if DFA, this always contains at most one state).
	protected _current: Set<State>;

	// The remaining input to consume this run
	protected _remainingInput: string;

	// The number of symbols which have been consumed already this run
	// -1 if not running
	protected _numRead: number;

	// The transitions which have been followed this run.
	// The key is the transition in the form "1-2" (for transition between 1 and 2).
	// The value is the step on which it was last followed.
	protected _followedTransitions: Map<string, number>;

	protected _init(definition: NFA | Definition, mutable?: boolean): this {
		this._current = Set().asMutable();
		this._remainingInput = "";
		this._numRead = -1;
		this._followedTransitions = Map().asMutable() as Map<string, number>;
		return super._init(definition, mutable);
	}

	/**
	 * Add any states reachable via empty transitions from the current states.
	 * NFA must be mutable.
	 */
	protected _followEmptyTransitions(onlyFrom?: State): void {
		if (!this.isRunning || !this._mutable) {
			return;
		}
		let origins;
		if (!onlyFrom) {
			origins = this._current;
		} else {
			origins = [onlyFrom];
		}
		for (const origin of origins) {
			for (const [target, symbols] of this.transitionsFrom(origin)) {
				if (symbols.has("")) {
					this._current.add(target);
					this._followedTransitions.set(origin + "-" + target, this._numRead);
					this._followEmptyTransitions(target);
				}
			}
		}
	}

	/**
	 * Get the current potential states (empty set if not running).
	 */
	get currentStates(): Set<State> {
		return this._current;
	}

	/**
	 * Get whether the NFA is running.
	 */
	get isRunning(): boolean {
		return this._numRead !== -1;
	}

	/**
	 * Get the number of symbols already read this run.
	 */
	get numRead(): number {
		return this._numRead;
	}

	/**
	 * Get the remaining input (empty string if not running).
	 */
	get remainingInput(): string {
		return this._remainingInput;
	}

	/**
	 * Get the result of the current run.
	 * 0 if inconclusive (future input could result in accept), -1 if definite reject, 1 if accept.
	 * 0 if not running.
	 */
	get result(): Result {
		if (!this.isRunning) {
			return 0;
		}
		if (shareAny([this._current, this._accept])) {
			return 1;
		} else if (shareAny([this._current, this.generatingStates])) {
			return 0;
		} else {
			return -1;
		}
	}

	/**
	 * Whether the DFA will accept its remaining input.
	 */
	get willAccept(): boolean {
		if (!this.isRunning || this.result === -1) {
			return false;
		}
		return this.mutableCopy().run().result === 1;
	}

	/**
	 * Return whether the NFA accepts the given input or not.
	 * Does not mutate the NFA, even if it is mutable.
	 */
	accepts(input: string): boolean {
		return this.mutableCopy().reset(input).run().result === 1;
	}

	/**
	 * Add the given input to the NFA's remaining input buffer.
	 */
	addInput(input: string): this {
		return this.setInput(this._remainingInput + input);
	}

	/**
	 * Return whether the NFA has followed a given transition this run.
	 */
	hasFollowed(origin: State, target: State): boolean {
		return this._followedTransitions.has(origin + "-" + target);
	}

	immutable(): this {
		if (!this._mutable) {
			return this;
		}
		this._current = this._current.asImmutable();
		this._followedTransitions = this._followedTransitions.asImmutable();
		return super.immutable();
	}

	/**
	 * Check whether a given state is one of the current possible states (while running).
	 */
	isCurrentState(state: State): boolean {
		return this._current.has(this.state(state));
	}

	/**
	 * Return whether the NFA just followed a given transition on the previous symbol.
	 */
	justFollowed(origin: State, target: State): boolean {
		return this._followedTransitions.get(origin + "-" + target) === this._numRead;
	}

	/**
	 * Set up the NFA to be run, resetting to the start state and erasing the input buffer.
	 * @param input The (initial) input to add to the input buffer. If empty, will keep the previous input.
	 */
	reset(input?: string): this {
		const nfa = this.mutable(true);

		nfa._numRead = 0;
		if (input !== undefined) {
			nfa._remainingInput = input;
		}
		nfa._followedTransitions = Map().asMutable() as Map<string, number>;
		nfa._current = Set().asMutable().add(this.start);
		nfa._followEmptyTransitions();

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Run the NFA on the remaining input, stopping early if a definite rejection is reached.
	 * Reset it first if it is not currently running.
	 * @param input Optional input to add to the remaining input before running.
	 */
	run(input: string = ""): this {
		if (this.result === -1) {
			return this;
		}
		const nfa = this.mutable(true);
		if (input) {
			nfa.addInput(input);
		}
		if (!nfa.isRunning) {
			nfa.reset();
		}
		while (nfa._remainingInput && nfa.result !== -1) {
			nfa.step();
		}
		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Run the NFA on the entire remaining input, continuing to run even if a definite rejection is reached.
	 * @param input The (initial) input to add to the input buffer.
	 */
	runComplete(input: string = ""): this {
		const nfa = this.mutable(true);
		if (input) {
			nfa.addInput(input);
		}
		while (nfa._remainingInput) {
			nfa.step();
		}
		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Set the NFA's remaining input.
	 */
	setInput(input: string): this {
		if (input === this._remainingInput) {
			return this;
		}
		const nfa = this.mutable(true);

		nfa._remainingInput = input;
		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * @override 
	 */
	setTransition(origin: State, target: State, symbols: SymbolGroup | string): this {
		if (this.isRunning && this.isCurrentState(origin) && new SymbolGroup(symbols).has("")) {
			const nfa = super.setTransition(origin, target, symbols).mutable(true);
			nfa._current = nfa._current.asMutable();
			nfa._current.add(target);
			nfa._followEmptyTransitions(target);
			if (!this._mutable) {
				nfa.immutable();
			}
			return nfa;
		} else {
			return super.setTransition(origin, target, symbols);
		}
	}

	/**
	 * Consume the next symbol from the remaining input, updating the NFA's current states accordingly.
	 * If the NFA is not running yet, reset and start it rather than stepping.
	 */
	step(): this {
		if (!this.isRunning) {
			return this.reset();
		}
		if (!this.remainingInput) {
			return this;
		}
		const nfa = this.mutable(true);

		nfa._followedTransitions = nfa._followedTransitions.asMutable();

		// Get the next symbol; for now, assume no combining characters
		const symbol = nfa._remainingInput[0];
		nfa._remainingInput = nfa._remainingInput.substr(1);
		nfa._numRead++;

		// Follow each applicable transition from each of the current states
		const newStates = Set().asMutable();
		for (const origin of nfa._current) {
			for (const [target, symbols] of nfa.transitionsFrom(origin)) {
				if (symbols.has(symbol)) {
					newStates.add(target);
					nfa._followedTransitions.set(origin + "-" + target, nfa._numRead);
				}
			}
		}
		nfa._current = newStates;

		// And follow all empty transitions from the resultant states
		nfa._followEmptyTransitions();

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}

	/**
	 * Stop running the NFA and erase the remaining input.
	 */
	stop(): this {
		if (!this.isRunning) {
			return this;
		}
		const nfa = this.mutable(true);

		nfa._current = Set().asMutable();
		nfa._followedTransitions = Map().asMutable() as Map<string, number>;
		nfa._numRead = -1;

		if (!this._mutable) {
			nfa.immutable();
		}
		return nfa;
	}
}
