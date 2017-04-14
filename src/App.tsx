import * as React from 'react';
import NFAEditor from './NFAEditor/NFAEditor';
import RunnableNFA from './Core/RunnableNFA';
// import logo from './logo.svg';
import './App.css';

const D1 = new RunnableNFA({
	mutable: false,
	start: 1,
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

export default class App extends React.Component<null, null> {
	render() {
		return (
			<NFAEditor nfa={D1} />
		);
	}
}