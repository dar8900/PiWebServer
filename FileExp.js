var express = require('express');
var file_exp_router = express.Router();
const OsInfo = require('os');
const FileSystem = require('fs');
const MainApp = require(`./Server`);
const MainFolder = `Downloads`;
var FileNames = [];

function getSizeStr(Dim)
{
	let NewDim = 0;
	let Udm = ``;
	let DimStr = ``;
	if(Dim < 1000)
	{
		NewDim = Dim;
	}
	else if(Dim < 1000000)
	{
		NewDim = Dim / 1000;
		Udm = `k`;
	}
	else if(Dim < 1000000000)
	{
		NewDim = Dim / 1000000;
		Udm = `M`;
	}
	else
	{
		NewDim = Dim / 1000000000;
		Udm = `G`;
	}
	DimStr = `${NewDim.toFixed(1).toString()}${Udm}`;
	return DimStr;
}


file_exp_router.use((req, res, next) => {
    // console.log(`Dentro la route del modulo File exp`);
    next();
  });

file_exp_router.get('/', async (req, res) => {
	MainApp.setOldPage(`FileExp`);
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		FileSystem.readdir(MainApp.paths.file_exp_dir, (err, filesNames) => {
			if(err)
			{
				MainApp.setOldPage(`Index`);
				res.render(`info`, {
					info_page_msg : `Directory ${MainFolder} non trovata`,
					back_button : true
				});
			}
			else
			{
				let FilesDes = []; 
				FileNames = [];
				for(let i = 0; i < filesNames.length; i++)
				{
					FileSystem.stat(`${MainApp.paths.file_exp_dir}/${filesNames[i]}`, (err, stat) => {
						FileNames.push(filesNames[i]);
						FilesDes.push({name : filesNames[i], 
									dim : getSizeStr(stat.size),
									last_mod : stat.birthtime,
									creation_time: stat.mtime
								});
					});
					
				}
				res.render('file_explorer', {
					file_name : FilesDes
				});
			}
		});



	}
	else
	{
		res.redirect('/login');
	}
});

file_exp_router.get('/*', async (req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		let FileFounded = false;
		let FileNameIndex = 0
		for(FileNameIndex = 0; FileNameIndex < FileNames.length; FileNameIndex++)
		{
			if(req.path === `/${FileNames[FileNameIndex]}`)
			{
				FileFounded = true;
				break;
			}
		}
		if(FileFounded)
		{
			FileSystem.readFile(`${MainApp.paths.file_exp_dir}/${FileNames[FileNameIndex]}`, (err, fileData) => {
				let FileSize = FileSystem.statSync(`${MainApp.paths.file_exp_dir}/${FileNames[FileNameIndex]}`).size;
				res.setHeader('Content-Length', FileSize);
				// res.setHeader('Content-Type', 'text/plain');
				res.setHeader('Content-Disposition', `attachment; filename=${FileNames[FileNameIndex]}`);
				res.write(fileData);
				res.end();
			});
			// res.render(`info`, {
			// 	info_page_msg : `File ${FileNames[FileNameIndex]} trovato`,
			// 	back_button : true
			// });
		}
		else
		{
			res.render(`not_found`, {
				title: "404 not found"
			});
		}
	}
	else
	{
		res.redirect('/login');
	}
});

exports.file_exp_router = file_exp_router;
exports.dir_name = MainFolder;