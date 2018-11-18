<!DOCTYPE html>
<html>
<head>
  <title>Documents Collections Search</title>
  <link rel="stylesheet" href="{{{base}}}/css/style.css">
</head>
<body>
    <h1>Documents Collection Search</h1>

<form action ="{{{base}}}/search.html" method = "GET">
<p>
Please fill in one or more search terms in the field below:
</p>
    <label>
        <span class = "label">Search Terms:</span>
        <input id = "query" name = "q" value = "{{q}}">
    </label>
    <br/>
    <input id = "submit" name = "submit" type = "submit" value = "search" class = "control">
</form>

        <h2>Search Results </h2>
    {{#results}}
        <p class = "result">
            <a class = "doc-name" href= "{{href}}">{{name}}</a><br>
            {{#lines}}{{{.}}}<br>{{/lines}}
        </p>
    {{/results}}
    {{#links}}
    <a id="next" href="{{next}}">Next</a>
    {{/links}}
{{>footer}}
</body>
</html>
