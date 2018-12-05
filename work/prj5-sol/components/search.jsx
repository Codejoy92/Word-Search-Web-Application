//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Search extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
	super(props);
	this.handleKeyPress = this.handleKeyPress.bind(this);
	this.value;
	this.searchTerm;
	this.results = [];
	this.state = {results : []};
  }

 async handleKeyPress(e){
		e.preventDefault();
		if(e.target.value === undefined){
			this.searchTerms = e.target.searchname.value;
			this.value = await this.props.app.ws.searchDocs(e.target.searchname.value, 0);
		}else{
			this.searchTerms = e.target.value;
			this.value = await this.props.app.ws.searchDocs(e.target.value, 0);
		}
		
		this.setState({results :this.value.results});
		console.log(this.state);
		
  }

  render() {
  	
  	let output = this.state.results.map(obj =>  (<div className="result">
													<a className="result-name" href={obj.name}>{obj.name}</a>
													<br></br>
													{obj.lines.map(line => (<p>{line}</p>))}
													<br></br>
												</div>));
  	
     return (
     	<div>
			<form onSubmit = {this.handleKeyPress}>
				<label>
					<span className="label">Search Terms:</span>
				</label>
				<span className="control">
					<input name ="searchname" type="text"  onBlur = {this.handleKeyPress}/>
				</span>
		
			</form>
			
				{output}
		
		</div>
		
		);
	}
}
module.exports = Search;

