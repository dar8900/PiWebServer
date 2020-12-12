const { user } = require('../../Server.js');

var username = require('../../Server.js').user;
function writeUsername()
{
    let Welcome = document.getElementById("welcome_title");
    Welcome.innerHTML += username;
    console.log("Script di index.html");
}