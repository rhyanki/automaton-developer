import {List, OrderedMap} from 'immutable';
import * as React from 'react';

import RunnableNFA, {State} from '../Core/RunnableNFA';
import SymbolGroup, {allowedRanges} from '../Core/SymbolGroup';

import ControlPanel from './ControlPanel/ControlPanel';
// import ListEditor from './ListEditor/ListEditor';
import TestInputEditor from './TestInputEditor/TestInputEditor';
import VisualEditor from './VisualEditor/VisualEditor';

import presets from './presets';

import './NFAEditor.css';

/*const _editors = OrderedMap([
	['visual', "Visual Editor"],
	['list', "List Editor"],
] as [EditorType, string][]);*/

const _tabs = OrderedMap([
	['instructions', "Instructions"],
	['test', "Test Inputs"],
	['presets', "Presets"],
	['transform', "Transform"],
	['port', "Import/Export"],
] as Array<[Tab, string]>);

const EDIT_SYMBOLS_DELIMITER = " ";

interface IState {
	nfa: RunnableNFA,
	editor: EditorType,
	importing: string,
	tab: Tab,
	testInputs: List<string>,
};
type EditorType = 'visual' | 'list';
type Tab = 'test' | 'presets' | 'instructions' | 'transform' | 'port';

export default class NFAEditor extends React.PureComponent<{}, IState> {
	private history: RunnableNFA[];

	constructor(props: {}) {
		super(props);

		this.history = [];

		this.state = {
			editor: 'visual',
			importing: "",
			nfa: new RunnableNFA((presets as any)[0].definition),
			tab: 'instructions',
			testInputs: List([""]),
		};

		(window as any).nfa = this.state.nfa; // For debugging
	}

	componentDidUpdate(prevProps: {}, prevState: IState) {
		// (window as any).nfa = this.state.nfa; // For debugging
	}

	render() {
		const nfa = this.state.nfa;
		const editor = this.state.editor;
		return ((
			<div className="row">
				<div className="col-md-3">
					{/*<select
						className="form-control"
						value={editor}
						onChange={(e) => this.switchEditor(e.target.value as EditorType)}
					>
						{_editors.map((name, key) => (
							<option key={key} value={key}>{name}</option>
						))}
					</select>
					<br/>*/}
					<ul className="nav nav-pills">
						{[..._tabs.map((name, key) => (
							<li
								key={key}
								role="presentation"
								onClick={() => this.switchTab(key)}
								className={this.state.tab === key ? "active" : ""}
							>
								<a href="#">{name}</a>
							</li>
						)).values()]}
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
							Enter a list of characters (symbols) to transition on, separated by spaces.
						</p>
						<p>
							Common backslash sequences are recognized (\n, \\, etc.).
							You can also use a backslash before a space or a comma.
						</p>
						<p>
							Subsets of the following character ranges are allowed: {allowedRanges.join(", ")}.
						</p>
						<label>Editing transitions in the visual editor</label>
						<p>
							To create a new transition, right-click on a state and drag the mouse to another state.
						</p>
						<p>
							To delete a transition, just click on its arrow shaft.
						</p>
					</div>
					<div style={this.displayIf(this.state.tab === 'presets')}>
						<table className="table">
							<tbody>
							{presets.map((preset, index) => (
								<tr key={index}>
									<td>
										<p>{preset.description}</p>
										<p>E.g. {preset.examples.join(", ")}</p>
										<p>Regex: {preset.regex}</p>
									</td>
									<td>
										<button className="btn btn-default" onClick={() => this.loadPreset(index)}>Load</button>
									</td>
								</tr>
							))}
							</tbody>
						</table>
					</div>
					<div style={this.displayIf(this.state.tab === 'transform')}>
						<button className="btn btn-default" disabled={nfa.isDFA} title={nfa.isDFA ? "Your NFA is already a DFA." : ""}>
							Convert to DFA
						</button>
						<br/>
						<br/>
						<button
							className="btn btn-default"
							disabled={nfa.isTrimmed}
							title="Remove nongenerating and unreachable states."
							onClick={() => this.trim()}
						>
							Trim
						</button>
						<br/>
						<br/>
						<button
							className="btn btn-default"
							title="Make all states transition on all symbols."
							onClick={() => this.complete()}
						>
							Complete
						</button>
					</div>
					<div style={this.displayIf(this.state.tab === 'port')}>
						<form className="form-inline">
							<button
								className="btn btn-default"
								onClick={() => this.setImporting("")}
								disabled={!this.state.importing}
								title={!this.state.importing ? "The exported NFA is already displayed below." : undefined}
							>
								Export
							</button>
							<br/>
							<br/>
							<textarea
								className="form-control"
								onChange={(e) => this.setImporting(e.target.value)}
								rows={10}
								value={this.state.importing ? this.state.importing : this.exportValue()}
							/>
							<br/>
							<br/>
							<button className="btn btn-default" disabled={!this.state.importing} onClick={() => this.import()}>
								Import
							</button>
						</form>
					</div>
				</div>
				<div className="col-md-9">
					<div>
						<ControlPanel
							nfa={nfa}
							addState={this.addState}
							back={this.back}
							clear={this.clear}
							editAlphabet={this.editAlphabet}
							reset={this.reset}
							run={this.run}
							setInput={this.setInput}
							step={this.step}
							stop={this.stop}
						/>
					</div>
					<br/>
					{/*<div className="editor" style={this.displayIf(editor === 'list')}>
						<ListEditor
							nfa={nfa}
							promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
							setStart={this.setStart}
							setName={this.setName}
							toggleAccept={this.toggleAccept}
							updateTransitionTarget={this.updateTransitionTarget}
						/>
					</div>*/}
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

	addState = (name?: string) => {
		this.onNFA('addState', name);
	}

	back = () => {
		this.undo();
	}

	/**
	 * Clear the editor, replacing the NFA with a blank one.
	 */
	clear = () => {
		this.setState({
			nfa: new RunnableNFA({
				n: 1,
				names: ["Start"],
			})
		});
	}

	complete = () => {
		this.onNFA('complete');
	}

	confirmRemoveState = (state: State) => {
		if (!window.confirm("Are you sure you want to delete this state?")) {
			return;
		}
		this.onNFA('removeState', state);
	}

	confirmRemoveTransition = (origin: State, target: State) => {
		if (!window.confirm("Are you sure you want to delete this transition?")) {
			return;
		}
		this.onNFA('removeTransition', origin, target);
	}

	/**
	 * Simple wrapper to set the style of a react element as display: block or display: none.
	 */
	displayIf = (condition: boolean): React.CSSProperties => {
		return {
			display: (condition ? 'block' : 'none'),
		};
	}

	editAlphabet = () => {
		const input = window.prompt(
			"Enter a new alphabet (leave blank for implicit).",
			this.state.nfa.hasSetAlphabet ? this.state.nfa.alphabet.toString(EDIT_SYMBOLS_DELIMITER, false) : ""
		);
		if (input === null) {
			return;
		}
		if (input === "") {
			return this.onNFA('unsetAlphabet');
		}
		return this.onNFA('setAlphabet', new SymbolGroup(input, EDIT_SYMBOLS_DELIMITER));
	}

	exportValue = (): string => {
		return JSON.stringify({
			nfa: this.state.nfa.toDefinition(),
		});
	}

	import = () => {
		this.setState((prevState) => {
			try {
				return {
					importing: "",
					nfa: new RunnableNFA(JSON.parse(prevState.importing).nfa),
				};
			} catch (e) {
				window.alert("Invalid input.");
				return null;
			}
		});
	}

	loadPreset = (index: number) => {
		this.setState({
			nfa: new RunnableNFA(presets[index].definition),
		});
	}

	/**
	 * Update the NFAEditor's state with a new NFA, based on the result of calling one of the NFA's methods.
	 * @param methodName The name of the NFA method to call.
	 * @param args The args to pass to the NFA method call.
	 */
	onNFA = (methodName: string, ...args: any[]): void => {
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
				return null;
			}
		});
	}

	promptAddTransition = (origin: State, target: State) => {
		this.promptUpdateTransitionSymbols(origin, target);
	}

	promptEditState = (state: State) => {
		const newName = window.prompt("Enter a state name.", this.state.nfa.name(state));
		if (newName) {
			this.setName(state, newName);
		}
	}

	promptUpdateTransitionSymbols = (origin: State, target: State) => {
		const symbols = window.prompt(
			"Enter a new symbol or symbols.",
			this.state.nfa.symbols(origin, target).toString(EDIT_SYMBOLS_DELIMITER)
		);
		if (symbols === null) {
			return;
		}
		this.onNFA('setTransition', origin, target, new SymbolGroup(symbols, EDIT_SYMBOLS_DELIMITER));
	}

	reset = (input?: string) => {
		this.onNFA('reset', input);
	}

	run = () => {
		this.onNFA('run');
	}

	setImporting = (contents: string) => {
		console.log("Updated importing");
		this.setState({
			importing: contents,
		});
	}

	setInput = (input: string) => {
		this.onNFA('setInput', input);
	}

	setName = (state: State, name: string) => {
		this.onNFA('setName', state, name);
	}

	setStart = (state: State) => {
		this.onNFA('setStart', state);
	}

	step = () => {
		this.onNFA('step');
	}

	stop = () => {
		this.onNFA('stop');
	}

	switchEditor = (editor: EditorType) => {
		this.setState({editor});
	}

	switchTab = (tab: Tab) => {
		this.setState({tab});
	}

	toggleAccept = (state: State) => {
		this.onNFA('toggleAccept', state);
	}

	trim = () => {
		this.onNFA('trim');
	}

	undo = () => {
		if (this.history.length > 0) {
			this.setState({
				nfa: this.history.pop() as RunnableNFA,
			});
		}
	}

	updateTransitionTarget = (origin: State, oldTarget: State, newTarget: State) => {
		if (this.state.nfa.hasTransition(origin, newTarget)) {
			if (!window.confirm("There is already a transition to that state, so this will merge the two transitions.\
				Do you wish to continue?")) {
				return;
			}
		}
		this.onNFA('setTransitionTarget', origin, oldTarget, newTarget);
	}
}
