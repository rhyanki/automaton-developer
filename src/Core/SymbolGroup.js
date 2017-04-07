import {intersect} from '../Util/sets.js';

/**
 * Immutable class for storing a symbol group, which is used in transitions.
 * The following special codes are allowed:
 *		~: represents ε (no symbol)
 *		a-z, A-Z, 0-9: character ranges (smaller ones allowed too)
 */
class SymbolGroup {

	_allowedCharsRegex = /^[\x00-\x7Fε␣]*$/;
	_backslashSymbols = new Map([
		["n", "\n"],
		["r", "\r"],
		["t", "\t"],
		["f", "\f"],
		["v", "\v"],
	]);
	_toBackslash = new Map([
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
	 * Check whether a set of SymbolGroups share any symbols between them.
	 * @param {Iterable<SymbolGroup>} symbolGroups 
	 * @returns {Boolean}
	 */
	static intersect(symbolGroups) {
		// Symbol sets
		const sets = [];
		for (const group of symbolGroups) {
			sets.push(group._symbols);
		}
		return intersect(sets);
	}

	/**
	 * @param {String} input The input string, containing any ASCII characters or ε. Backslash codes (such as \n) and ranges (such as a-z) are allowed. ~ is an alias for ε (no symbol). All whitespace is stripped unless following a backslash.
	 */
	constructor(input) {
		this._symbols = new Set();

		if (!this._allowedCharsRegex.test(input)) {
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
				const rangeStart = this._parseSymbol(matches[1]);
				const rangeEnd = this._parseSymbol(matches[2]);
				for (let p = rangeStart.codePointAt(0); p <= rangeEnd.codePointAt(0); p++) {
					this._symbols.add(String.fromCodePoint(p));
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
			if (this._toBackslash.has(symbol)) {
				symbolsList[i] = "\\" + this._toBackslash.get(symbol);
			} else if (symbol === "") {
				symbolsList[i] = "ε";
			} else if (symbol === " ") {
				symbolsList[i] = "␣";
			}
		}

		this._normalized = symbolsList.join(", ");
	}

	/**
	 * Parse a raw input symbol (in the form of a backslash sequence, ~, or a normal character).
	 * @param {String} input
	 */
	_parseSymbol(input) {
		if (input[0] === "\\") {
			const afterBackslash = input.substr(1);
			const backslashSymbol = this._backslashSymbols.get(afterBackslash);
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
	 * @param {SymbolGroup} symbolGroup The symbol group.
	 */
	equals(symbolGroup) {
		return this._normalized === symbolGroup._normalized;
	}

	/**
	 * Return whether or not the symbol group matches a given single symbol.
	 * @param {String} symbol The symbol.
	 */
	matches(symbol) {
		return this._symbols.has(symbol);
	}

	/**
	 * Merge the symbol group with another.
	 * @param {SymbolGroup} other The other symbol group.
	 * @returns {SymbolGroup} The new merged symbol group, or the current one if there was no change or the merge couldn't be done.
	 */
	merge(other) {
		if (!(other instanceof SymbolGroup)) {
			return this;
		}
		let newSymbols = new SymbolGroup(this._normalized + other._normalized);
		if (newSymbols.equals(this)) {
			return this;
		}
		return newSymbols;
	}

	toString() {
		return this._normalized;
	}
}

export default SymbolGroup;
