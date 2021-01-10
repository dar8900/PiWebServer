const express = require('express');
const path = require('path');
const uuid = require('uuid');
const exphbs = require('express-handlebars');
const SysCall = require(__dirname + '/SystemCall');
const Users = require(__dirname + '/Res/loginTable');
var os_utils = require('node-os-utils');
const FileSystem = require('fs');
const { default: Os } = require('node-os-utils/lib/os');
const OsInfo = require('os');
const net_stat = require('net-stat');
const { __esModule } = require('uuid/dist/v1');

const PiSessions = require(`./UsersClass`)

const networkModule = require(`./Network`);

const EnableLog = false;

const LogFileName = 'Webserver.log';

const Paths = {
	log_file :  `/home/deo/Logs/${LogFileName}`,
	favicon: path.join(__dirname, 'Res/server_icon.png'),
	actual_time_js : path.join(__dirname, 'WebJS/actualTime.js'),
	index_js : path.join(__dirname, 'WebJS/index.js')
};

const IndexHandlebarsObj = {
	title: "Welcome to PiServer!",
	up_time : "Tempo di accensione",
	temperatura : "Temperatura CPU",
	utilizzo_cpu : "Utilizzo CPU (%)",
	utilizzo_ram : "Utilizzo RAM (%)",
	utilizzo_disco : "Utilizzo disco (%)",
	ssh_n_conn : "Numero connessionni SSH"
};


const PORT = require(__dirname + '/Definitions');
var OldPage = '';

const UsersSessions = new PiSessions.piSessions();

const piApp = express();


function DbgLog(DbgMsg)
{
	if(EnableLog)
	{
		console.log(DbgMsg);
	}
}

function getTime()
{
    const LocaleDate = new Date();
	let TimeDate= LocaleDate.toLocaleDateString() + ' ' + LocaleDate.toLocaleTimeString();
	return TimeDate;
}

function logToFile(LogMessage)
{
	let ActualTime = getTime();
	FileSystem.access(Paths.log_file, (err) => {
		if(err)
		{
			FileSystem.appendFile(Paths.log_file, `${ActualTime} - Creato file di log \n`, (err) => {
				if (err) throw err; });
			FileSystem.appendFile(Paths.log_file, `${ActualTime} - ${LogMessage} \n`, (err) => {
					if (err) throw err; });
		}
		else
		{
			FileSystem.appendFile(Paths.log_file, `${ActualTime} - ${LogMessage} \n`, (err) => {
				if (err) throw err; });
		}
	});

}

function BackPage()
{
	let RetPage = '';
	switch (OldPage) {
		case `Index`:
			RetPage = '/index';
			break;
		case `System`:
			RetPage = '/system';
			break;
		case `Network`:
			RetPage = '/network';
			break;
		// case `FileExp`:
		// 	RetPage = 'files_exp';
		// 	break;
		default:
			RetPage = '/index';
			break;
	}
	return RetPage;
}

// Handlebars Middleware
piApp.engine('handlebars', exphbs());
piApp.set('view engine', 'handlebars');

// Body Parser Middleware
piApp.use(express.json());
piApp.use(express.urlencoded({ extended: false }));
piApp.use(`/network`, networkModule);


// Homepage Route
piApp.get('/', (req, res) => {
	res.redirect('/login');
});

// Ritorno il file per l'icona
piApp.get('/favicon.ico', (req, res) => {
	res.sendFile(Paths.favicon);
});

// Pagina di login
piApp.get('/login', (req, res) =>{
	res.render('login', {
		title: 'Pi Server Login'
	})}
);

// Richiesta del javascript per la get time
piApp.get('/actualTime.js', (req, res) =>{
	res.sendFile(Paths.actual_time_js);
});

// Richiesta del javascript per la home page
piApp.get('/index.js', (req, res) =>{
	res.sendFile(Paths.index_js);
});

// Richiesta info per homepage dal javascript annesso
// Il JS modifica la pagina di home
piApp.get('/pi_info', async (req, res) => {
	let UpTime = await SysCall.launchSystemScript(SysCall.UptimeScript);
	let Temp = await SysCall.launchSystemScript(SysCall.TempScript);
	let CpuUsage = await os_utils.cpu.usage();
	let RamUsage = await os_utils.mem.info();
	RamUsage = (100 - RamUsage.freeMemPercentage).toFixed(2);
	let HddUsage = await os_utils.drive.info();
	let Username = UsersSessions.findSessionUsername('', req.ip);
	let UserTime = UsersSessions.sessionSecondCounter[UsersSessions.findSessionIndex('', req.ip)]; 
	let SshConn = await SysCall.launchSystemScript(SysCall.SshConnScript);
	if(UserTime == undefined)
	{
		UserTime = 'N.A.';
	}
	else
	{
		if(UserTime > 60)
		{
			let Minute, Second;
			Minute = parseInt(UserTime / 60);
			Second = parseInt(UserTime % 60);
			UserTime = `${Minute.toString()}m ${Second.toString()}s`;
		}
		else
		{
			UserTime = `${UserTime.toString()}s`;
		}
	}
	let PiInfoObj = {
		uptime : UpTime,
		temp: Temp,
		cpu : CpuUsage,
		ram : RamUsage,
		hdd : HddUsage.usedPercentage,
		username : Username,
		userTime : UserTime,
		sshConn : SshConn
	};
	res.send(PiInfoObj);
});

// Routing per la home page, può avvenire sia tramite get o post
piApp.route('/index')
	.get(async (req, res) => {
		OldPage = 'Index';
		if(UsersSessions.isSessionLegit(req.ip))
		{
			res.render('index', IndexHandlebarsObj)
		}
		else
		{
			res.redirect('/login');
		}
	})
	.post(async(req, res) => {
		OldPage = 'Index';
		let LoginReq = req.body;
		let LoginIP = req.ip;
		let UserAdmitted = await UsersSessions.addSession(LoginReq, LoginIP);
		DbgLog("POST index req");
		DbgLog(UsersSessions.sessions);
		if(UserAdmitted)
		{
			logToFile(`Login effettuato da: ${UsersSessions.findSessionUsername('', req.ip)}`);
			res.render('index', IndexHandlebarsObj)	
		}
		else
		{
			res.redirect('/login');
		}
	})



piApp.get('/system', async (req, res) => {
	OldPage = 'System';
	if(UsersSessions.isSessionLegit(req.ip))
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

piApp.get('/show_log', async (req, res) => {

	if(UsersSessions.isSessionLegit(req.ip))
	{
		FileSystem.access(Paths.log_file, (err) => {
			if(err)
			{
				res.render('info', {
					info_page_msg : `Il file ${LogFileName} non è presente`
				});
			}
			else
			{
				FileSystem.readFile(Paths.log_file, (err, data) => {
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

piApp.get('/log_download', async(req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		FileSystem.access(Paths.log_file, (err) => {
			if(err)
			{
				res.render('info', {
					info_page_msg : `Il file ${LogFileName} non è presente`
				});
			}
			else
			{
				FileSystem.readFile(Paths.log_file, (err, fileData) => {
					let LogFileSize = FileSystem.statSync(Paths.log_file).size;
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

piApp.get('/rm_download', async(req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		FileSystem.access(Paths.log_file, (err) => {
			if(err)
			{
				res.render('info', {
					info_page_msg : `Il file ${LogFileName} non è presente`
				});
			}
			else
			{
				FileSystem.unlink(Paths.log_file, (err) => {
					if(err)
					{
						console.log(`Cancellazione del file ${LogFileName} non avvenuta`);
						res.render('info', {
							info_page_msg : `Non è stato possibile cancellare il file ${LogFileName}`
						});
					}
				});
				res.render('info', {
					info_page_msg : `File ${LogFileName} cancellato`
				});
			}
		});

	}
	else
	{
		res.redirect('/login');
	}
});


piApp.get('/reboot', async (req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		console.log("Reboot in corso");
		logToFile('Richiesta di riavvio');
		res.render('system', {
			sys_message : "Riavvio in corso..."
		});
		UsersSessions.delAllSessions();
		const Reboot = require('child_process').spawn('/home/deo/Homeshare/PiserverJS/Scripts/PiReboot.sh');
	}
	else
	{
		res.redirect('/login');
	}
	
});


piApp.get('/shutdown', async (req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		console.log("Spegnimento in corso");
		logToFile('Richiesta di spegnimento');
		res.render('system', {
			sys_message : "Spegnimento in corso..."
		});
		UsersSessions.delAllSessions();
		const Reboot = require('child_process').spawn('/home/deo/Homeshare/PiserverJS/Scripts/PiShutdown.sh');
	}
	else
	{
		res.redirect('/login');
	}
	
});


piApp.get('/files_exp', async (req, res) => {
	// OldPage = 'FileExp';
	if(UsersSessions.isSessionLegit(req.ip))
	{
		res.render('under_construction');
		// res.render('file_explorer', {
		// 	file_name : ['lol1', 'lol2', 'lol3']
		// });
	}
	else
	{
		res.redirect('/login');
	}
});

piApp.get('/back', (req, res) => {
	res.redirect(BackPage(OldPage));
});


piApp.get('/logout', (req, res) => {
	logToFile(`Effettuato logout da: ${UsersSessions.findSessionUsername('', req.ip)}`);
	UsersSessions.logoutSession(req.ip);
	res.redirect('/login');

});


piApp.get('/*', (req, res) => {
	logToFile(`Richiesta pagina non esistente`);
	res.render('not_found', {
		title: "404 not found"
	})
});
	
piApp.listen(PORT.SERVER_PORT, () => {
	console.log(`Server started on port ${PORT.SERVER_PORT}`);
	logToFile(`Webserver avviato e in ascolto sulla porta ${PORT.SERVER_PORT}`);
});

exports.userSessions =  UsersSessions;
exports.oldPage = OldPage;