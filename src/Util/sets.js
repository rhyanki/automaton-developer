/**
 * Check whether any number of sets share any element.
 * @param {Iterable<Set>} sets
 * @returns {Boolean}
 */
function shareAny(sets) {
	if (sets.length < 2 || sets.size < 2) {
		return false;
	}
	const union = new Set();
	for (const set of sets) {
		for (const x of set) {
			if (union.has(x)) {
				return true;
			}
			union.add(x);
		}
	}
	return false;
}

export {shareAny};
