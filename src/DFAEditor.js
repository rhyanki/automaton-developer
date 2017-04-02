import React, { Component } from 'react';
import StateList from './StateList/StateList.js';
import VisualEditor from './VisualEditor/VisualEditor.js';
import './DFAEditor.css';

class DFAEditor extends Component {
	constructor(props) {
		super(props);
		this.state = {
			dfa: this.props.dfa
		}

		// Bind all methods to this
		for (const methodName of Object.getOwnPropertyNames(this.constructor.prototype)) {
			if (this[methodName] instanceof Function) {
				this[methodName] = this[methodName].bind(this);
			}
		}
	}

	handle(methodName, args) {
		return (prevState, props) => {
			if (!(prevState.dfa[methodName] instanceof Function)) {
				console.log(methodName + " is not a valid DFA method!");
				throw new Error(methodName + " is not a valid DFA method!");
			}
			return {
				dfa: prevState.dfa[methodName](...([...arguments].slice(1)))
			};
		};
	}

	handleToggleAccept(state, accept) {
		this.setState(this.handle('toggleAccept', state));
	}

	handleUpdateStart(state) {
		this.setState(this.handle('setStart', state));
	}

	handleUpdateStateName(state, name) {
		this.setState(this.handle('setName', state, name));
	}

	handleUpdateTransitionTarget(origin, oldTarget, newTarget) {
		this.setState((prevState, props) => {
			if (prevState.dfa.hasTransition(origin, newTarget)) {
				if (!window.confirm("There is already a transition to that state, so this will merge the two transitions. Do you wish to continue?")) {
					return;
				}
			}
			return {
				dfa: prevState.dfa.setTransitionTarget(origin, oldTarget, newTarget)
			};
		});
	}

	promptDeleteTransition(origin, target) {
		this.setState((prevState, props) => {
			if (!window.confirm("Are you sure you want to delete this transition?")) {
				return;
			}
			return {
				dfa: prevState.dfa.deleteTransition(origin, target)
			};
		});
	}

	promptUpdateTransitionSymbols(origin, target) {
		this.setState((prevState, props) => {
			let symbols = window.prompt("Enter a new symbol or symbols.", prevState.dfa.symbols(origin, target));
			if (symbols === null) {
				return;
			}
			try {
				return {
					dfa: prevState.dfa.setTransitionSymbols(origin, target, symbols)
				};
			} catch (e) {
				window.alert(e.message);
				return;
			}
		});
	}

	render() {
		return (<div className="row">
			<div className="col-md-6">
				<StateList dfa={this.state.dfa}
				handleToggleAccept={this.handleToggleAccept}
				handleUpdateStart={this.handleUpdateStart}
				handleUpdateStateName={this.handleUpdateStateName}
				handleUpdateTransitionTarget={this.handleUpdateTransitionTarget}
				promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
				/>
			</div>
			<div className="col-md-6">
				<VisualEditor dfa={this.state.dfa}
				handleToggleAccept={this.handleToggleAccept}
				handleUpdateStateName={this.handleUpdateStateName}
				promptDeleteTransition={this.promptDeleteTransition}
				promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
				/>
			</div>
		</div>);
	}
}

export default DFAEditor;
