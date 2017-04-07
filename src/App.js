import React, { Component } from 'react';
import NFAEditor from './NFAEditor/NFAEditor.js';
import NFA from './Core/NFA.js';
//import logo from './logo.svg';
import './App.css';

const D1 = new NFA({
	mutable: false,
	alphabet: "abc",
	states: [
		{name: "Start", transitions: [ // 1
			[2, 'a'],
		]},
		{name: "First a", transitions: [ // 2
			[3, 'b'],
		]},
		{name: "Any b", transitions: [ // 3
			[3, 'b'],
			[4, 'a'],
		]},
		{name: "a after b", accept: true, transitions: [ // 4
			[3, 'b'],
			[5, 'a'],
		]},
		{name: "Anything else", transitions: [ // 5
			[3, 'b'],
			[5, 'a'],
		]},
		{name: "Unreachable", transitions: [ // 6
			[6, 'ab\\n\\\\'],
		]},
	],
});

class App extends Component {
	render() {
		return (
			<NFAEditor nfa={D1} />
		);
	}
}

export default App;
