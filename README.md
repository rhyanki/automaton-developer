# Automaton Developer

Automaton Developer allows [automata](https://en.wikipedia.org/wiki/Automata_theory) to be edited, simulated, bulk-tested and transformed in the browser.

Currently it supports only finite-state automata (both deterministic and nondeterministic) - i.e., DFAs and NFAs.

## Features

- Full support for creating, editing and deleting states and transitions
- Run the automaton step-by-step on any input
- Bulk test the automaton on a list of inputs
- Enter symbols as character ranges to save space
- Transformations: trim, complete
- Set an alphabet or use an implicit (minimal) one
- Export/import to/from JSON
- Try various presets

## Future

- List editor as alternative to visual editor
- Convert NFA to DFA
- More transformations: complement, union, intersection
- Save and reload workspace
- Export to SVG
- Convert finite-state automata to and from regular expressions
- Support for pushdown automata, Turing machines

## Development

This project is written in TypeScript and uses React for its UI.

It was bootstrapped with [Create React App (Typescript)](https://github.com/wmonk/create-react-app-typescript).

See [here](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md) for a comprehensive guide on using, building and modifying Create React App projects.
