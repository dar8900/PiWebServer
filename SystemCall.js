const { ENOENT } = require('constants');
const FileSystem = require('fs');
const Path = require('path');
const ScriptRun = require('child_process');
const { transcode } = require('buffer');
const { pathToFileURL } = require('url');
const Passwd = require(`./Definitions`);

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
    constructor(ScriptName, ScriptFile, IsAFile, ScriptFunc)
    {
        this.scriptName = ScriptName;
        this.scriptFile = ScriptFile;
        this.isFile = IsAFile;
        this.scriptFunction = ScriptFunc;
    }
}

const EnableDbg = false;

const UPTIME_SCRIPT = Path.join(__dirname, "Scripts", "GetUptime.sh");
const TEMP_SCRIPT = Path.join(__dirname, 'Scripts', 'TempScript.sh'); 
// const CPU_USAGE_FILE = Path.join(__dirname, 'Scripts', 'GetCpuUsage.sh');
// const RAM_USAGE_FILE = '/proc/meminfo';
// const HDD_USAGE_FILE = Path.join(__dirname, 'Scripts', 'GetDiskUsage.sh');;
const SSH_N_CONN_SCRIPT = Path.join(__dirname, "Scripts", "GetNSshConn.sh");

const REBOOT_SCRIPTS = Path.join(__dirname, "Scripts", "PiReboot.sh");

const UptimeScript = new PiScript("pi-uptime", UPTIME_SCRIPT, false, (data) => {
    let Days, Hours, Minutes, Seconds;
    let TotSeconds = parseInt(data);
    Seconds = TotSeconds % 60;
    Minutes = parseInt((TotSeconds / 60) % 60);
    Hours = parseInt((TotSeconds / 3600));
    Days = parseInt(TotSeconds / 86400);
    return `${Days}g ${Hours}h ${Minutes}m ${Seconds}s`;
});
const TempScript = new PiScript("pi-temp", TEMP_SCRIPT, false, (data)=>{return ((parseFloat(data)/1000.0).toFixed(1).toString('utf8') + "°C");});


const SshConnScript = new PiScript("pi-ssh-conn", SSH_N_CONN_SCRIPT, false, (data) => {
    let NConn = data.toString();
    return (parseInt(NConn)).toString();
});

const Reboot = new PiScript("pi-reboot", SSH_N_CONN_SCRIPT, false, (data) => {
    return;
});


function DbgLog(dbgMsg)
{
    if(EnableDbg)
    {
        console.log(dbgMsg);
    }
}

function ExecCommand(Command, NeedPasswd)
{
    const { exec } = require("child_process");
    let PasswdCommand = ``;
    if(NeedPasswd)
    {
        PasswdCommand = `/usr/bin/echo ${Passwd.DEO_PASSWD} | /usr/bin/sudo -S `;
    }
    else
    {
        PasswdCommand = ``;
    }
    exec(`${PasswdCommand}${Command}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}


// up_time : "Tempo di accensione", check
// utilizzo_cpu : "Utilizzo CPU (%)",
// utilizzo_ram : "Utilizzo RAM (%)",
// ssh_n_conn : "Numero connessionni SSH"

exports.UptimeScript = UptimeScript;
exports.TempScript = TempScript;
// exports.CpuUsageScript = CpuUsageScript;
// exports.RamUsageScript = RamUsageScript;
// exports.HddUsageScript = HddUsageScript;
exports.SshConnScript = SshConnScript;
exports.Reboot = Reboot;

exports.execCommand = ExecCommand;

exports.launchSystemScript = function(WichScript)
{
    DbgLog(`Funzione per l'esecuzione dello script ${WichScript.scriptName}`);
    if(WichScript.isFile)
    {
        return new Promise((resolve, rej) => {
            FileSystem.readFile(WichScript.scriptFile, (err, data) => {
                if(err)
                {
                    DbgLog(new Error(404, `File ${WichScript} non esistente`).getErrorObject())
                    throw err;
                }
                else
                {
                    resolve(WichScript.scriptFunction(data));
                }
            });
        });

        
    }
    else
    {
        return new Promise((resolve, reject) =>{
            if(WichScript.scriptName)
            {
                FileSystem.access(WichScript.scriptFile, FileSystem.constants.F_OK, (err) => 
                {
                    if(err)
                    {
                        DbgLog(new Error(404, `Script ${WichScript} non esistente`).getErrorObject());
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
                DbgLog(new Error(404, `Script ${WichScript} non esistente`).getErrorObject());
            }
        });   
    }

};