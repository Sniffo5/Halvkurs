const express = require('express');
const { execArgv } = require('process');
const bcrypt = require("bcryptjs");
const session = require('express-session');
const app = express();
app.use(express.urlencoded({ extended: true }));
const fs = require("fs");
const { render, div } = require("./utils.js");
const { v4: uuidv4 } = require('uuid');
const escape = require('escape-html')
const validator = require('validator');

let iconC = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Zm400 360H600v80H360v-80H160v160h640v-160Zm-360 0h80v-80h-80v80Zm-280-80h200v-80h240v80h200v-200H160v200Zm320 40Z"/></svg>'
let iconP = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>'

app.use(express.static("public"));
app.listen(3000, () => console.log("http://localhost:3000/"));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }

}));

app.get("/", home);
app.post("/login", login);
app.get("/login", showLogin);
app.post("/registrera", register);
app.get("/registrera", showRegister)
app.get("/tjanster", tjanster);
app.get("/skapaTjanst", showCreateTjanst);
app.post("/skapaTjanst", createTjanst);
app.get("/logout", logOut);
app.delete("/deleteTjanst/:id", deleteTjanst);




function home(req, res) {
    res.send(render("<h2>Dagens bästa tjänst:</h2><br>" + showTop(), req.session));
}







function tjanster(req, res) {
    let services = JSON.parse(fs.readFileSync("services.json").toString());

    let servicesHtml = services.map(service => {
        let deleteButton = "";

        if (req.session.loggedIn && (service.userId === req.session.id || req.session.isAdmin == true)) {
            deleteButton = `<form action="/deleteTjanst/${service.id}" method="DELETE">
                                <button type="submit">Ta bort</button>
                            </form>`;
        }

        return `
            <div id="${service.id}" class="service">
                <h2>${service.serviceName}</h2>
                <p>${service.bio}</p>
                <p>Pris: ${service.price}</p>
                <p>Plats: ${service.location}</p>
                <p> i${service.type} ${(service.type)}</p>
                ${deleteButton}
            </div>
        `;
    }).join("\n");

    servicesHtml = servicesHtml.replaceAll("iföretag", iconC);
    servicesHtml = servicesHtml.replaceAll("iperson", iconP);

    res.send(render(servicesHtml, req.session));
}



function showTop() {
    let services = JSON.parse(fs.readFileSync("services.json").toString());

    let service = services[0];
    let servicesHtml = `
            <div id = "${(service.id)}" class="service">
            <h2>${(service.serviceName)}</h2>
            <p>${(service.bio)}</p>
            <p>Pris: ${(service.price)}</p>
            <p>Plats: ${(service.location)}</p>
            <p> i${service.type} ${(service.type)}</p>
            </div>
        `

    servicesHtml = servicesHtml.replaceAll("iföretag", iconC)
    servicesHtml = servicesHtml.replaceAll("iperson", iconP)

    return servicesHtml
}


async function login(req, res) {
    let data = req.body;
    let users = JSON.parse(fs.readFileSync("users.json").toString());
    let userExist = users.find(u => u.email == data.email);

    if (!userExist) {
        return res.redirect("/login");
    }

    let check = await bcrypt.compare(data.password, userExist.password);
    if (!check) return res.redirect("/login?wrong_credentials");

    req.session.email = userExist.email;
    req.session.loggedIn = true;
    req.session.isAdmin = userExist.isAdmin;
    req.session.userId = userExist.id;

    res.send(render("Välkommen tillbaka " + escape(userExist.email), req.session));
    console.log(req.session);
}




function showLogin(req, res) {

    if (!req.session.loggedIn) {
        let logForm = fs.readFileSync("templates/logForm.html").toString();
        res.send(render(logForm, req.session));
    } else {
        res.redirect("/");
    }
}


function logOut(req, res) {
    req.session.destroy(() => {
        res.send(render("Utloggad"));
    });
}


async function register(req, res) {
    let data = req.body;

    if (!validator.isEmail(data.email) || data.password == "") {
        return res.redirect("/registrera");
    }

    data.password = await bcrypt.hash(data.password, 12);
    data.id = generateId();

    let users = JSON.parse(fs.readFileSync("users.json").toString());
    let userExist = users.find(u => u.email == data.email);
    if (userExist) {
        return res.send(render("User exists", req.session));
    }

    data.isAdmin = false;

    users.push(data);
    fs.writeFileSync("users.json", JSON.stringify(users, null, 3));

    req.session.email = data.email;
    req.session.loggedIn = true;
    req.session.userId = data.id;
    req.session.isAdmin = data.isAdmin;

    console.log(req.session.userId)
    console.log(data.id)

    res.send(render(`Välkommen, ${data.email}! Du är nu registrerad och inloggad.`, req.session));
}


function showRegister(req, res) {
    let regForm = fs.readFileSync("templates/regForm.html").toString();
    res.send(render(regForm, req.session));
}

function showCreateTjanst(req, res) {
    if (req.session.loggedIn == true) {
        res.send(render(fs.readFileSync("templates/createTjanst.html").toString(), req.session));
    } else {
        res.redirect("/login");
    }
}


function createTjanst(req, res) {
    if (req.session.loggedIn) {
        let data = req.body;

        if (data.serviceName && data.bio && data.price && data.location && data.type) {
            data.id = generateId();
            data.userId = req.session.userId;
            let services = JSON.parse(fs.readFileSync("services.json").toString());
            services.push(data);

            fs.writeFileSync("services.json", JSON.stringify(services, null, 3));

            res.redirect("/");
        } else {
            res.redirect("/skapaTjanst");
        }
    } else {
        res.redirect("/login");
    }
}

function deleteTjanst(req, res) {
    let serviceId = req.params.id;
    let services = JSON.parse(fs.readFileSync("services.json").toString());
    
    let serviceToDelete = services.find(service => service.id == serviceId);
    
    if (serviceToDelete && (serviceToDelete.userId == req.session.userId || req.session.isAdmin)) {
        let filteredServices = services.filter(service => service.id !== serviceId);
        fs.writeFileSync("services.json", JSON.stringify(filteredServices, null, 3));
        res.redirect("/tjanster");
    } else {
        res.redirect("/tjanster");
    }
}



function generateId() {

    return uuidv4();

}

