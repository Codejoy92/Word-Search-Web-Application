<!DOCTYPE html>
<html>
<head>
  <title>Documents Collections Search</title>
  <link rel="stylesheet" href="{{{base}}}/css/style.css">
</head>
<body>
    <h1>Documents Collection Search</h1>
<ul>
    {{#errors}}
        <li class = "error">{{.}}</li>
    {{/errors}}
</ul>
<form action ="{{{base}}}/search.html" method = "GET">
    <p>
        Please fill in one or more search terms in the field below:
    </p>
    <label>
        <span class = "label">Search Terms:</span>
            <input id = "query" name = "q" value = "{{{s}}}">
    </label>
    <br/>
    {{#errorMsg}}
        <span class="error">{{errorMsg}}</span><br/>
    {{/errorMsg}}
    <input id = "submit" name = "submit" type = "submit" value = "search" class = "control">
</form>

  <h2>{{{heading}}} </h2>
    {{#results}}
        <p class = "result">
            <a class = "doc-name" href="{{href}}">{{name}}</a><br>
            {{#lines}}{{{.}}}<br>{{/lines}}
        </p>
    {{/results}}

    {{#links}}
	{{#Next}}
    	<a id={{Next}} href="{{href}}">{{Next}}</a>
	{{/Next}}

        {{#Previous}}
        <a id={{Previous}} href="{{href}}">{{Previous}}</a>
        {{/Previous}}
    {{/links}}
{{>footer}}
</body>
</html>
