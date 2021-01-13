var express = require('express');
var sys_router = express.Router();
const OsInfo = require('os');
const FileSystem = require('fs');

const MainApp = require(`./Server`);
const SysCall = require(`./SystemCall`);
const LogFileName = 'Webserver.log';

var OldPage = ``;


sys_router.use((req, res, next) => {
    // console.log(`Dentro la route del modulo System`);
    next();
  });

sys_router.get('/', async (req, res) => {
	MainApp.setOldPage(`System`);
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		
		res.render('system', {
			os_arch : OsInfo.arch(),
			os_platform : OsInfo.platform(),
			os_type : OsInfo.type(),
			os_release : OsInfo.release(),
			os_name : 'Ubuntu server 20.04',
			os_hostname : OsInfo.hostname(),
			sys_message : ''
		});
	}
	else
	{
		res.redirect('/login');
	}
	
});


sys_router.get('/show_log', async (req, res) => {

	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		FileSystem.access(MainApp.paths.log_file, (err) => {
			if(err)
			{
				res.render('info', {
					info_page_msg : `Il file ${LogFileName} non è presente`,
					back_button : true
				});
			}
			else
			{
				FileSystem.readFile(MainApp.paths.log_file, (err, data) => {
					if(err)
					{
						throw err;
					}
					let FileLines = data.toString().split('\n');
					res.render('showlog', {
						log_list : FileLines
					});
				});
			}
		});

	}
	else
	{
		res.redirect('/login');
	}
});

sys_router.get('/log_download', async(req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		FileSystem.access(MainApp.paths.log_file, (err) => {
			if(err)
			{
				res.render('info', {
					info_page_msg : `Il file ${LogFileName} non è presente`,
					back_button : true
				});
			}
			else
			{
				FileSystem.readFile(MainApp.paths.log_file, (err, fileData) => {
					let LogFileSize = FileSystem.statSync(MainApp.paths.log_file).size;
					res.setHeader('Content-Length', LogFileSize);
					res.setHeader('Content-Type', 'text/plain');
					res.setHeader('Content-Disposition', 'attachment; filename=Webserver.log');
					res.write(fileData);
					res.end();
				});
			}
		});


	}
	else
	{
		res.redirect('/login');
	}
});

sys_router.get('/rm_download', async(req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		FileSystem.access(MainApp.paths.log_file, (err) => {
			if(err)
			{
				res.render('info', {
					info_page_msg : `Il file ${LogFileName} non è presente`,
					back_button : true
				});
			}
			else
			{
				FileSystem.unlink(MainApp.paths.log_file, (err) => {
					if(err)
					{
						console.log(`Cancellazione del file ${LogFileName} non avvenuta`);
						res.render('info', {
							info_page_msg : `Non è stato possibile cancellare il file ${LogFileName}`,
							back_button : true
						});
					}
				});
				res.render('info', {
					info_page_msg : `File ${LogFileName} cancellato`,
					back_button : true
				});
			}
		});

	}
	else
	{
		res.redirect('/login');
	}
});



sys_router.get('/reboot', async (req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		console.log("Reboot in corso");
		MainApp.logToFile('Richiesta di riavvio');
		res.render('info', {
			info_page_msg : "Riavvio in corso...",
			back_button : false
		});
		MainApp.userSessions.delAllSessions();
		SysCall.execCommand(`/usr/sbin/reboot`, true);
	}
	else
	{
		res.redirect('/login');
	}
	
});

sys_router.get('/shutdown', async (req, res) => {
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		console.log("Spegnimento in corso");
		MainApp.logToFile('Richiesta di Spegnimento');
		res.render('info', {
			info_page_msg : "Spegnimento in corso...",
			back_button : false
		});
		MainApp.userSessions.delAllSessions();
		SysCall.execCommand(`/usr/sbin/poweroff`, true);
	}
	else
	{
		res.redirect('/login');
	}
	
});

// sys_router.get('/shutdown', async (req, res) => {
// 	if(MainApp.userSessions.isSessionLegit(req.ip))
// 	{
// 		console.log("Spegnimento in corso");
// 		MainApp.logToFile('Richiesta di spegnimento');
// 		res.render('system', {
// 			sys_message : "Spegnimento in corso..."
// 		});
// 		UsersSessions.delAllSessions();
// 		const Reboot = require('child_process').spawn('/home/deo/Homeshare/PiserverJS/Scripts/PiShutdown.sh');
// 	}
// 	else
// 	{
// 		res.redirect('/login');
// 	}
	
// });

// module.exports = sys_router;
exports.system_router = sys_router;
exports.sys_oldpage = OldPage;
exports.logFileName = LogFileName;