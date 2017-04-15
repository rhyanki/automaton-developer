import * as React from 'react';
import RunnableNFA, {State} from '../Core/RunnableNFA';
import {List, OrderedMap} from 'immutable';
import ListEditor from './ListEditor/ListEditor';
import VisualEditor from './VisualEditor/VisualEditor';
import TestInputEditor from './TestInputEditor/TestInputEditor';
import ControlPanel from './ControlPanel/ControlPanel';
import './NFAEditor.css';

const _editors = OrderedMap([
	['visual', "Visual Editor"],
	['list', "List Editor"]],
) as OrderedMap<EditorType, string>;

const _tabs = OrderedMap([
	['instructions', "Instructions"],
	['test', "Test Inputs"],
	['presets', "Presets"],
	['convert', "Convert"],
]) as OrderedMap<Tab, string>;

type CProps = {
	nfa: RunnableNFA
};
type CState = {
	nfa: RunnableNFA,
	editor: EditorType,
	tab: Tab,
	testInputs: List<string>,
};
type EditorType = 'visual' | 'list';
type Tab = 'test' | 'presets' | 'instructions' | 'convert';

export default class NFAEditor extends React.PureComponent<CProps, CState> {
	history: RunnableNFA[];

	constructor(props: CProps) {
		super(props);

		this.history = [];

		this.state = {
			nfa: this.props.nfa,
			editor: 'visual',
			tab: 'instructions',
			testInputs: List([""]),
		};

		(window as any).nfa = this.state.nfa; // For debugging

		// Bind all methods to this
		for (const methodName of Object.getOwnPropertyNames(this.constructor.prototype)) {
			if (this[methodName] instanceof Function) {
				this[methodName] = this[methodName].bind(this);
			}
		}
	}

	componentDidUpdate(prevProps: CProps, prevState: CState) {
		console.log("NFAEditor updated.");
		(window as any).nfa = this.state.nfa; // For debugging
	}

	/**
	 * Update the NFAEditor's state with a new NFA, based on the result of calling one of the NFA's methods.
	 * @param methodName The name of the NFA method to call.
	 * @param args The args to pass to the NFA method call.
	 */
	handle(methodName: string, ...args: any[]): void {
		this.setState((prevState, props) => {
			if (!(prevState.nfa[methodName] instanceof Function)) {
				console.log(methodName + " is not a valid NFA method!");
				throw new Error(methodName + " is not a valid NFA method!");
			}
			try {
				const newNFA = prevState.nfa[methodName](...args);
				if (newNFA !== prevState.nfa) {
					this.history.push(prevState.nfa);
				}
				return {
					nfa: newNFA,
				};
			} catch (e) {
				window.alert(e.message);
				return;
			}
		});
	}

	addState(name?: string) {
		this.handle('addState', name);
	}

	back() {
		this.undo();
	}

	/**
	 * Clear the editor, replacing the NFA with a blank one.
	 */
	clear() {
		this.setState({
			nfa: new RunnableNFA({
				start: 0,
				states: [{
					name: "Start",
					transitions: [],
				}],
			})
		});
	}

	confirmRemoveState(state: State) {
		if (!window.confirm("Are you sure you want to delete this state?")) {
			return;
		}
		this.handle('removeState', ...arguments);
	}

	confirmRemoveTransition(origin: State, target: State) {
		if (!window.confirm("Are you sure you want to delete this transition?")) {
			return;
		}
		this.handle('removeTransition', ...arguments);
	}

	/**
	 * Simple wrapper to set the style of a react element as display: block or display: none.
	 */
	displayIf(condition: boolean): React.CSSProperties {
		return {
			display: (condition ? 'block' : 'none'),
		};
	}

	promptAddTransition(origin: State, target: State) {
		this.promptUpdateTransitionSymbols(origin, target);
	}

	promptEditState(state: State) {
		const newName = window.prompt("Enter a state name.", this.props.nfa.name(state));
		if (newName) {
			this.setName(state, newName);
		}
	}

	promptUpdateTransitionSymbols(origin: State, target: State) {
		const symbols = window.prompt("Enter a new symbol or symbols.", this.state.nfa.symbols(origin, target).toString());
		if (symbols === null) {
			return;
		}
		this.handle('setTransition', origin, target, symbols);
	}

	reset(input?: string) {
		this.handle('reset', input);
	}

	run() {
		this.handle('run');
	}

	setInput(input: string) {
		this.handle('setInput', ...arguments);
	}

	setName(state: State, name: string) {
		this.handle('setName', ...arguments);
	}

	setStart(state: State) {
		this.handle('setStart', ...arguments);
	}

	step() {
		this.handle('step');
	}

	stop() {
		this.handle('stop');
	}

	switchEditor(editor: EditorType) {
		this.setState({editor: editor});
	}

	switchTab(tab: Tab) {
		this.setState({tab: tab});
	}

	toggleAccept(state: State) {
		this.handle('toggleAccept', ...arguments);
	}

	undo() {
		if (this.history.length > 0) {
			this.setState({
				nfa: this.history.pop() as RunnableNFA,
			});
		}
	}

	updateTransitionTarget(origin: State, oldTarget: State, newTarget: State) {
		if (this.state.nfa.hasTransition(origin, newTarget)) {
			if (!window.confirm("There is already a transition to that state, so this will merge the two transitions.\
				Do you wish to continue?")) {
				return;
			}
		}
		this.handle('setTransitionTarget', ...arguments);
	}

	render() {
		const nfa = this.state.nfa;
		const editor = this.state.editor;
		return ((
			<div className="row">
				<div className="col-md-3">
					<select
						className="form-control"
						value={editor}
						onChange={(e) => this.switchEditor(e.target.value as EditorType)}
					>
						{_editors.map((name, key) => (
							<option key={key} value={key}>{name}</option>
						))}
					</select>
					<br/>
					<ul className="nav nav-pills">
						{_tabs.map((name, key) => (
							<li
								key={key}
								role="presentation"
								onClick={() => this.switchTab(key)}
								className={this.state.tab === key ? "active" : ""}
							>
								<a href="#">{name}</a>
							</li>
						))}
					</ul>
					<br/>
					<div style={this.displayIf(this.state.tab === 'test')}>
						<TestInputEditor
							nfa={nfa}
							runOnInput={(input) => this.reset(input)}
						/>
					</div>
					<div style={this.displayIf(this.state.tab === 'instructions')}>
						<label>Editing symbols</label>
						<p>Click the symbols of a transition to edit them.</p>
						<p>
							Enter a comma-separated list of characters (symbols) to transition on.
							Currently, only ASCII symbols are supported.
						</p>
						<p>
							Common backslash sequences are recognized (\n, \\, etc.).
							You can also use a backslash before a space or a comma.
						</p>
						<p>
							Character ranges (e.g. a-z) are supported.
						</p>
						<label>Editing transitions in the visual editor</label>
						<p>
							To create a new transition, right-click on a state and drag the mouse to another state.
						</p>
						<p>
							To delete a transition, just click on its arrow shaft.
						</p>
					</div>
					<div style={this.displayIf(this.state.tab === 'convert')}>
						<button className="btn btn-default" disabled={nfa.isDFA} title={nfa.isDFA ? "Your NFA is already a DFA." : ""}>
							Convert to DFA
						</button>
					</div>
				</div>
				<div className="col-md-9">
					<div>
						<ControlPanel
							nfa={nfa}
							addState={this.addState}
							back={this.back}
							clear={this.clear}
							reset={this.reset}
							run={this.run}
							setInput={this.setInput}
							step={this.step}
							stop={this.stop}
						/>
					</div>
					<br/>
					<div className="editor" style={this.displayIf(editor === 'list')}>
						<ListEditor
							nfa={nfa}
							promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
							setStart={this.setStart}
							setName={this.setName}
							toggleAccept={this.toggleAccept}
							updateTransitionTarget={this.updateTransitionTarget}
						/>
					</div>
					<div className="editor" style={this.displayIf(editor === 'visual')}>
						<VisualEditor
							nfa={nfa}
							confirmRemoveState={this.confirmRemoveState}
							confirmRemoveTransition={this.confirmRemoveTransition}
							promptAddTransition={this.promptAddTransition}
							promptEditState={this.promptEditState}
							promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
							setStart={this.setStart}
							toggleAccept={this.toggleAccept}
						/>
					</div>
				</div>
			</div>
		));
	}
}
