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
const FileSystem = require('fs');

const DATE_SCRIPT = '/home/deo/Homeshare/PiserverJS/Scripts/TimeDateScript.sh'
const TEMP_SCRIPT = '/home/deo/Homeshare/PiserverJS/Scripts/TempScript.sh'

function DbgLog(enable, dbgMsg)
{
    if(enable)
    {
        console.log(dbgMsg);
    }
}

exports.getPiDate = function()
{
    DbgLog(false, "Funzione get date");
    return new Promise((resolve, reject) =>{
		FileSystem.access(DATE_SCRIPT, FileSystem.constants.F_OK, (err) => 
		{
			if(err)
			{
				DbgLog(true, new Error(404, "Script per la temp non esistente").getErrorObject());
			}
			else
			{
				const ScriptRun = require('child_process');
				const TempOut = ScriptRun.spawn(DATE_SCRIPT);
				TempOut.stdout.on("data", (data) => {
					resolve(data.toString());
				});
			}
		});
});
};

exports.getTemp = function()
{
    DbgLog(false, "Funzione get temp");
    return new Promise((resolve, reject) =>{
			FileSystem.access(TEMP_SCRIPT, FileSystem.constants.F_OK, (err) => 
			{
				if(err)
				{
					DbgLog(true, new Error(404, "Script per la temp non esistente").getErrorObject());
				}
				else
				{
					const ScriptRun = require('child_process');
					const TempOut = ScriptRun.spawn(TEMP_SCRIPT);
					TempOut.stdout.on("data", (data) => {
						resolve((parseFloat(data)/1000.0).toFixed(1).toString('utf8') + "C");
					});
				}
			});
    });
};



exports.getFileContent = function (FilePath)
{
    return new Promise((resolve, reject) =>{
        FileSystem.access(TEMP_SCRIPT, FileSystem.constants.F_OK, (err) => 
        {
            if(err)
            {
                DbgLog(true, new Error(404, "File non esistente").getErrorObject());
            }
            else
            {
                FileSystem.readFile(FilePath, (err, fileData) =>{
                    resolve(fileData.toString());
                })
            }
        });
    });
}

