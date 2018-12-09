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
    this.state = {name : [], content : [],error : []};
    this.name;
    this.content;
    
  }

 async componentDidMount(){
  if(this.props.name ){
    this.name = this.props.name;
   // console.log(this.name);
    this.content = await this.props.app.ws.getContent(this.name);
  //  console.log(this.content);
    this.setState({name :this.name, content : this.content.content});
  }
 }

 async componentDidUpdate(prevProps){
  //console.log(prevProps);
  if(this.props.name /*&& prevProps.name !== this.props.name*/){
    this.name = this.props.name;
    //console.log("sdas");
    this.content = await this.props.app.ws.getContent(this.name);
    this.setState({name :this.name, content : this.content.content});
    //console.log(this.content);
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
            </div>;
      
  }

}

module.exports = Content;
