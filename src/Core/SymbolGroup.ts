import {Map, OrderedSet, Set} from 'immutable';

type Symbol = string;

class CharRange {
	_start: number; // Codepoint of first character in range
	_end: number; // Codepoint of last character in range

	/**
	 * @param range The range as a single character, or string of the form "a-z".
	 * @param end The last character in the range. If provided, the range param is taken to be the first character.
	 */
	constructor(range: string | Symbol | CharRange, end?: string) {
		if (range instanceof CharRange) {
			return range;
		}
		this._start = range.charCodeAt(0);
		if (!end) {
			if (range.length === 3) {
				end = range[2];
			} else {
				end = range;
			}
		}
		this._end = end.charCodeAt(0);
		if (this._end < this._start) {
			const start = this._start;
			this._start = this._end;
			this._end = start;
		}
	}

	get size(): number {
		return this._end - this._start;
	}

	/**
	 * Whether the range contains a symbol or another range within it.
	 */
	contains(range: Symbol | CharRange | string): boolean {
		const r = new CharRange(range);
		return this._start <= r._start && r._end <= this._end;
	}

	toString() {
		return String.fromCharCode(this._start) + "-" + String.fromCharCode(this._end);
	}

	/**
	 * Iterate over all the characters in the range.
	 */
	*[Symbol.iterator](): IterableIterator<Symbol> {
		let current = this._start;
		while (current <= this._end) {
			yield String.fromCharCode(current);
			current++;
		}
	}
}

// The symbols which MUST be specially represented in the symbol group's input and output.
const _fromSpecial = Map<string, Symbol>([
	["ε", ""],
	["~", ""],
	["␣", " "],
	["\\\\", "\\"],
	["\\n", "\n"],
	["\\r", "\r"],
	["\\t", "\t"],
	["\\f", "\f"],
	["\\v", "\v"],
]);
const _toSpecial = _fromSpecial.flip();

// Character ranges which are allowed.
const _allowedRanges = [] as CharRange[];

for (const range of ["A-Z", "a-z", "0-9", "А-Я", "а-я", "Α-Ω", "α-ω"]) {
	_allowedRanges.push(new CharRange(range));
}

// All parameters which ask for a symbol group should also be able to accept an input string
// which can be converted to one.
export type SymbolGroupInput = SymbolGroup | string | undefined;

/**
 * Immutable class for storing a symbol group, which is used in transitions.
 * The following special codes are allowed:
 *     ~: represents ε (no symbol)
 *     a-z, A-Z, 0-9: character ranges (smaller ones allowed too)
 */
class SymbolGroup {
	_symbols: OrderedSet<Symbol>; // Ordered set of all symbols (as strings) in the group, sorted by Unicode code point
	_normalized: string;

	/**
	 * Merge any number of symbol groups.
	 */
	static merge(symbolGroups: Iterable<SymbolGroupInput>): SymbolGroup {
		let input = "";
		for (const group of symbolGroups) {
			if (group instanceof SymbolGroup) {
				input += " " + group._normalized;
			} else if (group) {
				input += " " + group;
			}
		}
		return new SymbolGroup(input);
	}

	/**
	 * Check whether a set of SymbolGroups share any symbols between them.
	 */
	static shareAny(symbolGroups: Iterable<SymbolGroupInput>): boolean {
		const allSymbols = Set().asMutable();
		for (let group of symbolGroups) {
			group = new SymbolGroup(group);
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
	 * Construct a new SymbolGroup based on an input string.
	 * If no input string, creates an empty SymbolGroup (matches nothing).
	 * @param input The input string.
	 * - Backslash codes (such as \n) and ranges (such as a-z) are allowed.
	 * - ~ is an alias for ε (no symbol).
	 * @param delimiter The delimiter to recognize. Will be parsed as a regex.
	 */
	constructor(input?: string | SymbolGroup, delimiter: string = " ") {
		if (input === undefined) {
			this._symbols = OrderedSet();
			this._normalized = "";
			return;
		}

		if (input instanceof SymbolGroup) {
			return input;
		}

		// Unicode normalize the string, combining as many characters as possible
		input = input.normalize();

		const symbols = Set<Symbol>().asMutable();

		// Special case: empty input is interpreted as ε
		if (input === "" || input === "~" || input === "ε") {
			input = "";
		} else if (input.length === 1) {
			symbols.add(input[0]);
			input = "";
		}

		// Compile a regex for the delimiter
		const delimiterRegex = new RegExp("^" + delimiter);

		while (input.length > 0) {
			let matches;

			// First try to match the delimiter
			matches = input.match(delimiterRegex);
			if (matches && matches[0].length !== 0) {
				input = input.substr(matches[0].length);
				continue;
			}

			// Try to match a character range
			matches = input.match(/^.-./);
			if (matches) {
				const range = new CharRange(matches[0]);
				for (const allowedRange of _allowedRanges) {
					if (allowedRange.contains(range)) {
						for (const symbol of range) {
							symbols.add(symbol);
						}
						break;
					}
				}
				input = input.substr(matches[0].length);
				continue;
			}

			// Try to match a character or backslash sequence
			matches = input.match(/^\\?./);
			if (matches) {
				let match = matches[0];
				const special = _fromSpecial.get(match);
				if (special) {
					symbols.add(special);
				} else {
					// If there is still a backslash, remove it and use the raw character
					if (match.length > 1 && match[0] === "\\") {
						match = match[1];
					}
					symbols.add(match);
				}
				input = input.substr(match.length);
				continue;
			}
		}

		this._symbols = symbols.sort() as OrderedSet<Symbol>;
		this._normalized = this.toString(" ");
	}

	/**
	 * Whether this symbol group contains a symbol group.
	 */
	contains(symbols: SymbolGroupInput): boolean {
		symbols = new SymbolGroup(symbols);
		for (const symbol of symbols) {
			if (!this.has(symbol)) {
				return false;
			}
		}
		return true;
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
	 * Whether this symbol group contains a symbol.
	 */
	has(symbol: Symbol) {
		return this._symbols.has(symbol);
	}

	/**
	 * Merge the symbol group with another.
	 * @param {SymbolGroup} other The other symbol group.
	 * @returns {SymbolGroup} The new merged symbol group, or the current one if no change.
	 */
	merge(other: SymbolGroupInput): SymbolGroup {
		const merged = SymbolGroup.merge([this, other]);
		if (this.equals(merged)) {
			return this;
		}
		return merged;
	}

	/**
	 * @param delimiter
	 * @param includeEmpty Whether to include ε in the output.
	 */
	toString(delimiter: string = " ", includeEmpty: boolean = false): string {
		const outputForm = (symbol: Symbol): string => {
			const special = _toSpecial.get(symbol);
			if (special) {
				// Convert it to a special symbol if possible
				return special;
			} else if (symbol === delimiter || _fromSpecial.has(symbol)) {
				// If the symbol is the delimiter, or has special meaning (like ε), it has to be escaped.
				return "\\" + symbol;
			} else {
				return symbol;
			}
		};

		const blocks = [] as string[];
		let allowedRange;
		let rangeStart = "";
		let rangeEnd = "";

		const finishRange = () => {
			if (!rangeStart) {
				return;
			}
			const finalRange = new CharRange(rangeStart, rangeEnd);
			const rangeLen = finalRange.toString().length;
			const otherwiseLen = finalRange.size + (finalRange.size - 1) * delimiter.length;
			if (rangeLen < otherwiseLen) {
				// Only output the character range if it would actually save space
				blocks.push(finalRange.toString());
			} else {
				for (const s of finalRange) {
					blocks.push(outputForm(s));
				}
			}
			rangeStart = "";
		};

		for (const symbol of this._symbols) {
			if (!includeEmpty && symbol === "") {
				continue;
			}
			// If we're in a range, either continue or finish it
			if (rangeStart) {
				if (symbol.charCodeAt(0) - rangeEnd.charCodeAt(0) === 1 && (allowedRange as CharRange).contains(symbol)) {
					rangeEnd = symbol;
					continue;
				} else {
					finishRange();
				}
			}
			// Otherwise, see if it can be made into a character range
			for (allowedRange of _allowedRanges) {
				if (allowedRange.contains(symbol)) {
					rangeStart = symbol;
					rangeEnd = symbol;
					break;
				}
			}
			if (rangeStart) {
				continue;
			}
			// If not, just output the symbol
			blocks.push(outputForm(symbol));
		}
		// Finish the current range if we're in one
		finishRange();

		return blocks.join(delimiter);
	}

	/**
	 * Iterate over all the symbols in the group.
	 */
	*[Symbol.iterator](): IterableIterator<Symbol> {
		yield *this._symbols;
	}
}

(window as any).SymbolGroup = SymbolGroup; // Debugging
(window as any).CharRange = CharRange; // Debugging

export default SymbolGroup;
