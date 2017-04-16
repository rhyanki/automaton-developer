import {Set} from 'immutable';

/**
 * Check whether any number of sets share any element.
 */
export function shareAny(sets: Iterable<Iterable<any>>) {
	const union = Set().asMutable();
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
