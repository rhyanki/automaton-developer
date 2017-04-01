/**
 * Immutable class for storing a symbol group, which is used in transitions.
 * The following special codes are allowed:
 *		~: represents ε (no symbol)
 *		a-z, A-Z, 0-9: character ranges (smaller ones allowed too)
 */
class SymbolGroup {

	_asciiRegex = /^[\x00-\x7F]*$/;
	_backslashSymbols = new Map([
		["~", "~"],
		["\\", "\\"],
		["-", "-"],
		["n", "\n"],
		["r", "\r"],
		["t", "\t"],
		["f", "\f"],
		["v", "\v"],
	]);
	_toBackslash = new Map([
		["~", "~"],
		["\\", "\\"],
		["-", "-"],
		["\n", "n"],
		["\r", "r"],
		["\t", "t"],
		["\f", "f"],
		["\v", "v"],
	]);

	constructor(input) {
		this._symbols = new Set();

		if (!this._asciiRegex.test(input)) {
			throw new Error("Only ASCII characters are allowed for now.");
		}

		// Special case: empty input is allowed, and interpreted as ε
		if (input === "") {
			this._symbols.add("");
		}

		// Parse the input
		let backslash = false; // Backslash was just read
		let hyphen = false; // Hyphen was just read
		let lastSymbol = null; // Last full symbol read

		for (let i = 0; i < input.length; i++) {
			let c = input[i];
			let symbol = null;
			if (backslash) {
				if (this._backslashSymbols.has(c)) {
					symbol = this._backslashSymbols.get(c);
				} else {
					symbol = c;
				}
				backslash = false;
			}
			if (hyphen) {
				if (lastSymbol) {
					for (let p = lastSymbol.codePointAt(0); p < c.codePointAt(0); p++) {
						this._symbols.add(String.fromCodePoint(p));
					}
				}
				lastSymbol = null;
				hyphen = false;
			}
			if (backslash || hyphen) {
				continue;
			}
			if (!symbol) {
				if (c === '~') {
					this._symbols.add('');
				} else if (c === '-') {
					hyphen = true;
				} else if (c === '\\') {
					backslash = true;
				} else {
					symbol = c;
				}
			}
			if (symbol) {
				this._symbols.add(symbol);
				lastSymbol = symbol;
			}
		}

		// Now create the normalized string
		let symbolsList = Array.from(this._symbols.keys());
		symbolsList.sort();

		for (let i = 0; i < symbolsList.length; i++) {
			if (this._toBackslash.has(symbolsList[i])) {
				symbolsList[i] = "\\" + this._toBackslash.get(symbolsList[i]);
			} else if (symbolsList[i] === "") {
				symbolsList[i] = "~";
			}
		}

		this._normalized = symbolsList.join("");
	}

	/**
	 * Return whether this symbol group is equivalent to another symbol group (i.e. they match the same symbols).
	 * @param {String} symbolGroup The symbol group.
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
