
class Error 
{
    constructor(CodeNumber, Motivation) 
    {
        this.CodeNumber = CodeNumber;
        this.Motivation = Motivation;
    }
    getErrorObject() 
    {
        var error = {en: this.CodeNumber, why: this.Motivation};
        return error;
    }
}
const TEMP_SCRIPT = './TempScript.sh'
const SERVER_PORT = 1989

var http = require('http');

function getTemp()
{
    console.log("GetTemp Started");
    return new Promise((resolve, reject) =>{
        const ScriptRun = require('child_process');
        const TempOut = ScriptRun.spawn(TEMP_SCRIPT);
        TempOut.stdout.on("data", (data) => {
            resolve((parseFloat(data)/1000.0).toFixed(1).toString() + "°C");
        });
        TempOut.on("error", (err) => {
            let newError = new Error(1, "Script Error")
            resolve(newError.getErrorObject());
        });
    });
}

async function readTemp()
{
    console.log("ReadTemp Started");
    let tempReaded = await getTemp();
    return new Promise((resolve, reject) =>{
        resolve(tempReaded);
    });
}


http.createServer((req, res) => {
    
    async function showTemp()
    {
        let temp;
        temp = await readTemp();            
        console.log(temp);
        return temp;
    }
    
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("Cpu temp: " + showTemp() + "°C");

}).listen(SERVER_PORT);