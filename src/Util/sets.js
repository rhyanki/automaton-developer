/**
 * Check whether any number of sets intersect at all.
 * @param {Iterable<Set>} sets
 * @returns {Boolean}
 */
function intersect(sets) {
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

export {intersect};