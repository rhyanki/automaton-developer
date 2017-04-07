/**
 * Create a shallow, mutable copy of an array, plain object, Set or Map.
 */
function copy(item) {
	if (item instanceof Array) {
		return item.slice(0);
	}
	if (item instanceof Map) {
		return new Map(item);
	}
	if (item instanceof Set) {
		return new Set(item);
	}
	var newObj = {};
	for (const k in item) {
		newObj[k] = item[k];
	}
	newObj._frozen = undefined;
	return newObj;
}

/**
 * Make an array, plain object, Set or Map (shallowly) immutable. Return the same item.
 */
function freeze(item) {
	if (item instanceof Map) {
		item.set = item.clear = item.delete = function() {
			throw new Error("Cannot modify frozen Map.");
		}
	} else if (item instanceof Set) {
		item.add = item.clear = item.delete = function() {
			throw new Error("Cannot modify frozen Set.");
		}
	}
	// For debugging only
	item._frozen = true;
	return Object.freeze(item);
}

export {copy, freeze};
