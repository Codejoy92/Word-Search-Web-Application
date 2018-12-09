//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Content extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   *  name:Name of document to be displayed.
   */
  constructor(props) {
    super(props);
    this.state = {name : [], content : []};
    this.name;
    
    
  }

 async componentDidMount(prevProps){
  if(this.props.name ){
    this.name = this.props.name;
    let content = await this.props.app.ws.getContent(this.name);
    this.setState({name :this.name, content : content.content});
  }
 }

 async componentDidUpdate(prevProps, prevState){
  console.log("loop check");
  if(this.props.name && this.props.name !== prevState.name){
    let name = this.props.name;
    let content = await this.props.app.ws.getContent(name);
    this.setState({name :name, content : content.content});
    
  }
 }
  

  render() {
      
    return  <div >
              <section>
                <h1>{this.state.name}</h1>
                <pre>
                {this.state.content}
                </pre>
              </section>
            </div>
      
  }

}

module.exports = Content;
