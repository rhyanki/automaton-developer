import {Map, Set} from 'immutable';

const _allowedCharsRegex = /^[\x00-\x7Fε␣]*$/;
const _backslashSymbols = Map([
	["n", "\n"],
	["r", "\r"],
	["t", "\t"],
	["f", "\f"],
	["v", "\v"],
]);
const _toBackslash = Map([
	["~", "~"],
	[",", ","],
	["\\", "\\"],
	["\n", "n"],
	["\r", "r"],
	["\t", "t"],
	["\f", "f"],
	["\v", "v"],
]);

/**
 * Immutable class for storing a symbol group, which is used in transitions.
 * The following special codes are allowed:
 *		~: represents ε (no symbol)
 *		a-z, A-Z, 0-9: character ranges (smaller ones allowed too)
 */
class SymbolGroup {
	_symbols: Set<string>;
	_normalized: string;

	/**
	 * Check whether a set of SymbolGroups share any symbols between them.
	 */
	static shareAny(symbolGroups: Iterable<SymbolGroup>): boolean {
		const allSymbols = Set().asMutable();
		for (const group of symbolGroups) {
			for (const symbol of group._symbols) {
				if (allSymbols.has(symbol)) {
					return true;
				}
				allSymbols.add(symbol);
			}
		}
		return false;
	}

	/**
	 * Whether the SymbolGroup is empty (matches no symbols at all).
	 */
	get empty(): boolean {
		return this._symbols.size === 0;
	}

	/**
	 * Get the number of symbols in the group (including ε).
	 */
	get size(): number {
		return this._symbols.size;
	}

	/**
	 * Construct a new SymbolGroup based on an input string. If no input string, creates an empty SymbolGroup (matches nothing).
	 * @param input  The input string, containing any ASCII characters or ε. Backslash codes (such as \n) and ranges (such as a-z) are allowed. ~ is an alias for ε (no symbol). All whitespace is stripped unless following a backslash.
	 */
	constructor(input?: string | SymbolGroup) {
		if (!input) {
			this._symbols = Set();
			this._normalized = "";
			return;
		}

		if (input instanceof SymbolGroup) {
			return input;
		}

		this._symbols = Set().asMutable();

		if (!_allowedCharsRegex.test(input)) {
			throw new Error("Only ASCII characters are allowed for now.");
		}

		// Special case: empty input or a single character are interpreted literally
		if (input === "" || input === "~" || input === "ε") {
			this._symbols.add("");
			input = "";
		} else if (input.length === 1) {
			this._symbols.add(input[0]);
			input = "";
		}

		// Remove all whitespace not following a backslash
		input = input.replace(/([^\\])\s/g, "$1");

		while (input.length > 0) {
			let matches;

			// Try to match a comma
			if (input[0] === ',') {
				input = input.substr(1);
				continue;
			}

			// Try to match a character range
			matches = input.match(/^(\\?[^,])-(\\?[^,])/);
			if (matches) {
				const rangeStart = this._parseSymbol(matches[1]).codePointAt(0);
				const rangeEnd = this._parseSymbol(matches[2]).codePointAt(0);
				if (rangeStart && rangeEnd) {
					for (let p = rangeStart; p <= rangeEnd; p++) {
						this._symbols.add(String.fromCodePoint(p));
					}
				}
				input = input.substr(matches[0].length);
				continue;
			}

			// Try to match a character
			matches = input.match(/^\\?./);
			if (matches) {
				this._symbols.add(this._parseSymbol(matches[0]));
				input = input.substr(matches[0].length);
				continue;
			}
		}

		// Now create the normalized string
		const symbolsList = Array.from(this._symbols.keys());
		symbolsList.sort();

		for (let i = 0; i < symbolsList.length; i++) {
			const symbol = symbolsList[i];
			if (_toBackslash.has(symbol)) {
				symbolsList[i] = "\\" + _toBackslash.get(symbol);
			} else if (symbol === "") {
				symbolsList[i] = "ε";
			} else if (symbol === " ") {
				symbolsList[i] = "␣";
			}
		}

		this._normalized = symbolsList.join(", ");
		this._symbols.asImmutable();
	}

	/**
	 * Parse a raw input symbol (in the form of a backslash sequence, ~, or a normal character).
	 */
	_parseSymbol(input: string): string {
		if (input[0] === "\\") {
			const afterBackslash = input.substr(1);
			const backslashSymbol = _backslashSymbols.get(afterBackslash);
			if (backslashSymbol) {
				return backslashSymbol;
			} else {
				return afterBackslash;
			}
		}
		if (input === "ε" || input === "~") {
			return "";
		}
		if (input === "␣") {
			return " ";
		}
		return input;
	}

	/**
	 * Return whether this symbol group is equivalent to another symbol group (i.e. they match the same symbols).
	 */
	equals(symbolGroup: SymbolGroup | void): boolean {
		if (!symbolGroup) {
			return this._normalized === "";
		}
		return this._normalized === symbolGroup._normalized;
	}

	/**
	 * Return whether or not the symbol group matches a given single symbol.
	 */
	matches(symbol: string): boolean {
		return this._symbols.has(symbol);
	}

	/**
	 * Merge the symbol group with another.
	 * @param {SymbolGroup} other The other symbol group.
	 * @returns {SymbolGroup} The new merged symbol group, or the current one if there was no change or the merge couldn't be done.
	 */
	merge(other: SymbolGroup): SymbolGroup {
		if (!(other instanceof SymbolGroup)) {
			return this;
		}
		let newSymbols = new SymbolGroup(this._normalized + other._normalized);
		if (newSymbols.equals(this)) {
			return this;
		}
		return newSymbols;
	}

	toString(): string {
		return this._normalized;
	}
}

export default SymbolGroup;
