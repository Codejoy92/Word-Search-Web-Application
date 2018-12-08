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
	this.clickHandler = this.clickHandler.bind(this);
	this.value;
	this.searchTerm = undefined;
	this.results = [];
	this.state = {results : [], error : []};

  }

 async clickHandler(e){
 	e.preventDefault();
 	this.props.app.setContentName(e.target.name);
 }

 async handleKeyPress(e){
		e.preventDefault();
		if(e.target.value === undefined){
			this.searchTerms = e.target.searchname.value;
		//	console.log(this.searchTerms);
			this.value = await this.props.app.ws.searchDocs(e.target.searchname.value, 0);
			
		}else{
			this.searchTerms = e.target.value;
			this.value = await this.props.app.ws.searchDocs(e.target.value, 0);
		
		}
				
		this.setState({results :this.value.results, error : ""});
		//console.log(this.state);
		
		
  }

  render() {
  	let Terms = new Set();
  	if(this.searchTerms !== undefined){
  	Terms = new Set(this.searchTerms.toLowerCase().split(/\W+/));
  	 let valueCounter = 0;
  	 for (let value of this.state.results) {
  	 	let lineArray = [];
  	 	let lineLength = value.lines.length;
                              for (let i = 0; i < lineLength; i++) {
                              	  let singleLine = this.state.results[valueCounter]['lines'][i];
                                  let variable = singleLine.split(/\s+/);
                                  
                                  let indexlength = variable.length;
                                  
                                  for (let j = 0; j < indexlength; j++) {
                                  	  let myString = variable[j];
                                  	  if(myString[myString.length - 1] === ("," || ";" || "?" || "." || "#" || "!" || ":" || "-" || "_" || "`" || "\"") || 
                                  	  	myString[myString.length - 2] === "'"){
                                  	  	 if (Terms.has(myString.slice(0,myString.length - 1).toLowerCase())|| Terms.has(myString.slice(0,myString.length - 2).toLowerCase())) {
                                  	  	// 	console.log("after trim"+myString.slice(0,myString.length - 2).toLowerCase());
                                          lineArray.push(<span className="search-term">{variable[j]}</span>);
                                          lineArray.push(" ");
                                      	}
                                  	  }else{
                                      if (Terms.has(variable[j].toLowerCase())) {
                                          lineArray.push(<span className="search-term">{variable[j]}</span>);
                                          lineArray.push(" ");
                                      }else{
                                      lineArray.push(variable[j] + " ");
                                      }
                                  }
                                  }
								lineArray.push(<br></br>);
                              }value["array"] = lineArray;
                              
                              valueCounter = valueCounter + 1;

  		 }
  		 if(this.state.results.length === 0){
  		 		if(this.searchTerms.trim() !== "" ){
  		 				this.state.error = "No results for "+this.searchTerms;
  		 		}
  		 		
  		 }
  	}
  	
  	let output = this.state.results.map(obj =>  (<div className="result">
													<a className="result-name" onClick = {this.clickHandler} name={obj.name} href={obj.name}>{obj.name}</a>
													<br></br>
													
                                 					<p>{obj.array}</p>
													
												</div>));
  	let error = this.state.error;
  	
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
				<span className = "error">{error}</span>
		</div>
		
		);
	}
}
module.exports = Search;

