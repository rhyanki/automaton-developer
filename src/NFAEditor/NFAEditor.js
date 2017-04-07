import React, { Component } from 'react';
import ListEditor from './ListEditor/ListEditor.js';
import VisualEditor from './VisualEditor/VisualEditor.js';
import './NFAEditor.css';

class NFAEditor extends Component {
	constructor(props) {
		super(props);
		this.state = {
			editor: 'visual',
			nfa: this.props.nfa
		}

		// Bind all methods to this
		for (const methodName of Object.getOwnPropertyNames(this.constructor.prototype)) {
			if (this[methodName] instanceof Function) {
				this[methodName] = this[methodName].bind(this);
			}
		}
	}

	componentDidUpdate() {
		console.log("NFAEditor updated.");
	}

	shouldComponentUpdate(nextProps, nextState) {
		// Component only needs to update if the NFA changed
		if (this.state.nfa !== nextState.nfa) {
			return true;
		}
		return false;
	}

	/**
	 * Update the NFAEditor's state with a new NFA, based on the result of calling one of the NFA's methods.
	 * @param {String} methodName The name of the NFA method to call.
	 * @param {*} args The args to pass to the NFA method call.
	 */
	handle(methodName, args) {
		this.setState((prevState, props) => {
			if (!(prevState.nfa[methodName] instanceof Function)) {
				console.log(methodName + " is not a valid NFA method!");
				throw new Error(methodName + " is not a valid NFA method!");
			}
			try {
				return {
					nfa: prevState.nfa[methodName](...([...arguments].slice(1)))
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
		if (this.state.nfa.hasTransition(origin, newTarget)) {
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
		const symbols = window.prompt("Enter a new symbol or symbols.", this.state.nfa.symbols(origin, target));
		if (symbols === null) {
			return;
		}
		this.handle('setTransitionSymbols', origin, target, symbols);
	}

	render() {
		return (<div className="row">
			<div className="col-md-6">

			</div>
			<div className="col-md-6">
				<div style={{display: (this.state.editor === 'list') ? 'block' : 'none'}}>
					<ListEditor
						nfa={this.state.nfa}
						handleToggleAccept={this.handleToggleAccept}
						handleUpdateStart={this.handleUpdateStart}
						handleUpdateStateName={this.handleUpdateStateName}
						handleUpdateTransitionTarget={this.handleUpdateTransitionTarget}
						promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
					/>
				</div>
				<div style={{display: (this.state.editor === 'visual') ? 'block' : 'none'}}>
					<VisualEditor
						nfa={this.state.nfa}
						handleAddState={this.handleAddState}
						handleToggleAccept={this.handleToggleAccept}
						handleUpdateStateName={this.handleUpdateStateName}
						promptRemoveTransition={this.promptRemoveTransition}
						promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
					/>
				</div>
			</div>
		</div>);
	}
}

export default NFAEditor;
