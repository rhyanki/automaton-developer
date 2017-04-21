import * as React from 'react';
import NFAEditor from './NFAEditor/NFAEditor';
import './App.css';

export default class App extends React.Component<null, null> {
	render() {
		return (
			<NFAEditor/>
		);
	}
}