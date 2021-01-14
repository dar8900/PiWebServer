var express = require('express');
var file_exp_router = express.Router();
const OsInfo = require('os');
const FileSystem = require('fs');
const MainApp = require(`./Server`);
const MainFolder = `Downloads`;
var FileNames = {is_dir : [] , name : []};

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

function findFilenameIndex(IncomingReq)
{
	let FileFounded = false;
	let FileNameIndex = -1;
	for(FileNameIndex = 0; FileNameIndex < FileNames.name.length; FileNameIndex++)
	{
		if(IncomingReq.params.sub_item === `${FileNames.name[FileNameIndex]}`)
		{
			FileFounded = true;
			break;
		}
	}
	if(!FileFounded)
	{
		FileNameIndex = -1;
	}
	return FileNameIndex;
}

// file_exp_router.use((req, res, next) => {
//     next();
//   });

file_exp_router.use(`/${MainFolder}/:sub_item`, function(req, res, next) {
	next();
  });
  
file_exp_router.use(`/${MainFolder}/cancel/:sub_item`, function(req, res, next) {
	next();
  });

file_exp_router.get('/', async (req, res) => {
	res.redirect(`/files_exp/${MainFolder}`);
});

file_exp_router.get(`/${MainFolder}`, async (req, res) => {
	MainApp.setOldPage(`FileExp`);
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		let ActualFolder = MainFolder;
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
				FileNames.name = [];
				FileNames.is_dir = [];
				for(let i = 0; i < filesNames.length; i++)
				{
					FileSystem.stat(`${MainApp.paths.file_exp_dir}/${filesNames[i]}`, (err, file_stat) => {
						if(!file_stat.isDirectory())
						{
							FileNames.name.push(filesNames[i]);
							FileNames.is_dir.push(false);
							FilesDes.push({
										link_status : ``,
										name : filesNames[i], 
										dim : getSizeStr(file_stat.size),
										type: `file`,
										last_mod : file_stat.birthtime
									});
						}
						else
						{
							FileNames.name.push(filesNames[i]);
							FileNames.is_dir.push(true);
							FilesDes.push({
										link_status : `disabled`,
										name : filesNames[i], 
										dim : `-`,
										type: `cartella`,
										last_mod : file_stat.birthtime
									});
						}
					});
					
				}
				res.render('file_explorer', {
					dir_name : `Cartella: ${ActualFolder}`,
					file_name : FilesDes.sort()
				});
			}
		});



	}
	else
	{
		res.redirect('/login');
	}
});



file_exp_router.get(`/${MainFolder}/:sub_item`, async (req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		let FileNameIndex = findFilenameIndex(req);
		if(FileNameIndex >= 0)
		{
			if(!FileNames.is_dir[FileNameIndex])
			{
				FileSystem.readFile(`${MainApp.paths.file_exp_dir}/${FileNames.name[FileNameIndex]}`, (err, fileData) => {
					let options = {
						root: `${MainApp.paths.file_exp_dir}`,
						dotfiles: 'ignore',
						headers: {

							'Content-Disposition' : `attachment; filename=${FileNames.name[FileNameIndex]}`,
						}
					}
					
					res.sendFile(FileNames.name[FileNameIndex], options, function (err) {
							if(err) 
							{
								res.render(`info`, {
									info_page_msg : `File "${FileNames.name[FileNameIndex]}" non inviato`,
									back_button : true
								});
								console.log(`Errore invio file: ${err}`);
							} 
							else 
							{
								MainApp.logToFile(`Richiesta di scaricamento del file "${FileNames.name[FileNameIndex]}"`);
							}
						})
				});
			}
			else
			{
				res.render(`not_found`, {
					title: "404 file not found"
				});
			}
		}
		else
		{
			res.render(`not_found`, {
				title: "404 file not found"
			});
		}
	}
	else
	{
		res.redirect('/login');
	}
});

file_exp_router.get(`/${MainFolder}/cancel/:sub_item`, async (req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		let FileIndex = findFilenameIndex(req);
		if(FileIndex >= 0)
		{
			FileSystem.unlink(`${MainApp.paths.file_exp_dir}/${FileNames.name[FileIndex]}`, (err) => {
				if(err)
				{
					res.render(`info`, {
						info_page_msg : `File "${FileNames.name[FileIndex]}" non cancellato`,
						back_button : true
					});
				} 
				MainApp.logToFile(`Cancellato il file "${FileNames.name[FileIndex]}"`);
				res.redirect(`/files_exp`);
			});
		}
		else
		{
			res.render(`not_found`, {
				title: "404 cancel not found"
			});
		}
	}
	else
	{
		res.redirect(`/login`);
	}
});

exports.file_exp_router = file_exp_router;
exports.dir_name = MainFolder;