const { ENOENT } = require('constants');
const FileSystem = require('fs');
const Path = require('path');
const ScriptRun = require('child_process');

class Error 
{
    constructor(CodeNumber, Motivation) 
    {
        this.CodeNumber = CodeNumber;
        this.Motivation = Motivation;
    }
    getErrorObject() 
    {
        var error = {err_num: this.CodeNumber, why: this.Motivation};
        return error;
    }
}

class PiScript
{
    constructor(ScriptName, ScriptFile, ScriptFunc)
    {
        this.scriptName = ScriptName;
        this.scriptFile = ScriptFile;
        this.scriptFunction = ScriptFunc;
    }
}

const DATE_SCRIPT = Path.join(__dirname, 'Scripts', 'TimeDateScript.sh');// '/home/deo/Homeshare/PiserverJS/Scripts/TimeDateScript.sh'
const TEMP_SCRIPT = Path.join(__dirname, 'Scripts', 'TempScript.sh'); //'/home/deo/Homeshare/PiserverJS/Scripts/TempScript.sh'
const TempScript = new PiScript("pi-temp", TEMP_SCRIPT, (data)=>{return ((parseFloat(data)/1000.0).toFixed(1).toString('utf8') + "°C");});
const DateScript = new PiScript("pi-date", DATE_SCRIPT, (data)=>{return data.toString()});

function DbgLog(enable, dbgMsg)
{
    if(enable)
    {
        DbgLog(dbgMsg);
    }
}



exports.TempScript = TempScript;
exports.DateScript = DateScript;

exports.launchSystemScript = function(WichScript)
{
    DbgLog(false, `Funzione per l'esecuzione dello script ${WichScript.scriptName}`);
    return new Promise((resolve, reject) =>{
        if(WichScript.scriptName)
        {
            FileSystem.access(WichScript.scriptFile, FileSystem.constants.F_OK, (err) => 
            {
                if(err)
                {
                    DbgLog(true, new Error(404, "Script non esistente").getErrorObject());
                    throw err;
                }
                else
                {
                    const TempOut = ScriptRun.spawn(WichScript.scriptFile);
                    TempOut.stdout.on("data", (data) => {
                        resolve(WichScript.scriptFunction(data));
                    });
                }
            });
        }
        else
        {
            DbgLog(true, new Error(404, `Script ${WichScript} non esistente`).getErrorObject());
        }
    });
};