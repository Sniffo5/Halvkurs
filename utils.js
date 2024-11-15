const fs = require("fs");


function render(content){

    let html = fs.readFileSync("templates/template.html").toString();

    html = html.replace("**content**", content);

    return html;
};

function div(content, c=""){
    return `<div class="${c}">
    ${content}
    </div>`;
}

module.exports = {render, div};