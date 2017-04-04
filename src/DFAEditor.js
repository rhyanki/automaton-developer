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

	componentDidUpdate() {
		console.log("DFAEditor updated.");
	}

	shouldComponentUpdate(nextProps, nextState) {
		// Component only needs to update if the DFA changed
		if (this.state.dfa !== nextState.dfa) {
			return true;
		}
		return false;
	}

	/**
	 * Update the DFAEditor's state with a new DFA, based on the result of calling one of the DFA's methods.
	 * @param {String} methodName The name of the DFA method to call.
	 * @param {*} args The args to pass to the DFA method call.
	 */
	handle(methodName, args) {
		this.setState((prevState, props) => {
			if (!(prevState.dfa[methodName] instanceof Function)) {
				console.log(methodName + " is not a valid DFA method!");
				throw new Error(methodName + " is not a valid DFA method!");
			}
			try {
				return {
					dfa: prevState.dfa[methodName](...([...arguments].slice(1)))
				};
			} catch (e) {
				window.alert(e.message);
				return;
			}
		});
	}

	handleAddState(name) {
		this.handle('addState', name);
	}

	handleToggleAccept(state) {
		this.handle('toggleAccept', ...arguments);
	}

	handleUpdateStart(state) {
		this.handle('setStart', ...arguments);
	}

	handleUpdateStateName(state, name) {
		this.handle('setName', ...arguments);
	}

	handleUpdateTransitionTarget(origin, oldTarget, newTarget) {
		if (this.state.dfa.hasTransition(origin, newTarget)) {
			if (!window.confirm("There is already a transition to that state, so this will merge the two transitions. Do you wish to continue?")) {
				return;
			}
		}
		this.handle('setTransitionTarget', ...arguments)
	}

	promptRemoveTransition(origin, target) {
		if (!window.confirm("Are you sure you want to delete this transition?")) {
			return;
		}
		this.handle('removeTransition', ...arguments);
	}

	promptUpdateTransitionSymbols(origin, target) {
		const symbols = window.prompt("Enter a new symbol or symbols.", this.state.dfa.symbols(origin, target));
		if (symbols === null) {
			return;
		}
		this.handle('setTransitionSymbols', origin, target, symbols);
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
				handleAddState={this.handleAddState}
				handleToggleAccept={this.handleToggleAccept}
				handleUpdateStateName={this.handleUpdateStateName}
				promptRemoveTransition={this.promptRemoveTransition}
				promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
				/>
			</div>
		</div>);
	}
}

export default DFAEditor;
