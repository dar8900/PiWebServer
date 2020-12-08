
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

function Response(req, res)
{
    let ReqMethod, Host, HttpPage;
    ReqMethod = req.method;
    Host = req.headers.host;
    HttpPage = "Ciao mondo, ho ricevuto una richiesta di tipo " + ReqMethod + " da " + Host;
    res.writeHead(200);
    if(res.write(HttpPage))
    {
        res.end(()=>{console.log("Scrittura finita");});
    }
    else
    {
        res.end(()=>{console.log("Scrittura errata");});
    }
}
const NewServer = http.createServer(Response);
NewServer.listen(SERVER_PORT);