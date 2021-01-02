class PiUser
{
	constructor(Userinfo)
	{
		this.userinfo = Userinfo;
		this.userinfo.userID = '';
		this.userinfo.IP = '';
	}
	async sessionUserValidation(UserIp)
	{
		let ValidateLogin = false;
		for(let i = 0; i < Users.length; i++)
		{
			if(Users[i].username == this.userinfo.username && Users[i].passwd == this.userinfo.passwd)
			{
				ValidateLogin = true;
				this.userinfo.userID = uuid.v4();
				this.userinfo.IP = UserIp;
				break;
			}
		}
		return Promise.resolve(ValidateLogin);
	}
}

class PiSessions
{
	constructor()
	{
		this.sessions = [];
		this.timeout = SESSION_TIMEOUT;
		this.sessionSecondCounter = []; //SESSION_TIMEOUT / 1000;
		this.sessionTimeoutDesc = [];
		this.sessionIntervalDesc = [];
	}
	sessionTimeout(callback)
	{
		setTimeout(callback, this.timeout);

	}
	findSessionIndex(SessionUser, UserIp)
	{
		let SessionIndex = undefined;
		for(let i = 0; i < this.sessions.length; i++)
		{
			if(UserIp)
			{
				if(UserIp == this.sessions[i].userinfo.IP)
				{
					SessionIndex = i;
					break;
				}
			}
			else
			{
				if(SessionUser.username.toString() == this.sessions[i].userinfo.username)
				{
					SessionIndex = i;
					break;
				}
			}
		}
		return SessionIndex;
	}
	findSessionUsername(SessionUser, UserIp)
	{
		let Index = this.findSessionIndex(SessionUser, UserIp);
		let Username = '';
		if(Index != undefined)
		{
			Username = this.sessions[this.findSessionIndex(SessionUser, UserIp)].userinfo.username;
		}
		else
		{
			Username = '';
		}
		return Username;
	}
	async addSession(NewSessionUser, NewUserIP)
	{
		let Log = '';
		if(NewUserIP)
		{
			Log = "Sessione per l'utente \"" + NewSessionUser.username.toString() + "\" non aggiunta";
		}
		let UserAdded = true;
		let NewSession = new PiUser(NewSessionUser, NewUserIP);
		let GoOn = false, DeleteOldSession = false;

		if(this.sessions.length != 0)
		{
			for(let i = 0; i < this.sessions.length; i++)
			{
				if(NewSession.userinfo.username == this.sessions[i].userinfo.username)
				{
					if(this.sessions[i].userinfo.userID != '')
					{
						GoOn = true;
						break;
					}
					else
					{
						DeleteOldSession = true;
						break;
					}
				}
			}
		}
		if(!GoOn)
		{
			let RightCredentials = false;
			if(DeleteOldSession)
			{
				this.delSession(NewSessionUser);
			}
			else
			{
				RightCredentials = await NewSession.sessionUserValidation(NewUserIP);
			}
			if(RightCredentials)
			{
				this.sessions.push(NewSession);
				this.sessionSecondCounter.push(SESSION_TIMEOUT / 1000);
				let Index = this.findSessionIndex(NewSessionUser);
				this.sessionIntervalDesc.push(setInterval(() => {
					if(this.sessionSecondCounter[Index] > 0)
					{
						this.sessionSecondCounter[Index]--;
					}
					DbgLog(this.sessionSecondCounter[Index]);
				}, 1000));
				
				
				this.sessionTimeoutDesc.push(setTimeout(() => {
					if(Index != undefined)
					{
						DbgLog("Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" scaduta");
						this.sessions[Index].userinfo.userID = '';
						clearInterval(this.sessionIntervalDesc[Index]);
					}
				}, this.timeout));

				Log = "Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" aggiunta e login validato\n ";
				Log += "Il nuovo ID vale : " + this.sessions[Index].userinfo.userID;

				UserAdded = true;
			}
			else
			{
				UserAdded = false;
				if(DeleteOldSession)
				{
					Log = "Sessione per l'utente \"" + NewSessionUser.username + "\" è da aggiornare";
				}
				else
				{
					Log = "Sessione per l'utente \"" + NewSessionUser.username + "\" non aggiunta e login non validato";
				}
			}
		}
		else
		{
			UserAdded = true;
			let Index = this.findSessionIndex(NewSessionUser);
			this.sessionSecondCounter[Index] = SESSION_TIMEOUT / 1000;
			clearInterval(this.sessionIntervalDesc[Index]);
			clearTimeout(this.sessionTimeoutDesc[Index]);

			this.sessionTimeoutDesc[Index] = setTimeout(() => {
				// let Index = this.findSessionIndex(NewSessionUser);
				if(Index != undefined)
				{
					DbgLog("Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" scaduta");
					this.sessions[Index].userinfo.userID = '';
					clearInterval(this.sessionIntervalDesc[Index]);
				}
			}, this.timeout);

			this.sessionIntervalDesc[Index] = setInterval(() => {
				if(this.sessionSecondCounter[Index] > 0)
				{
					this.sessionSecondCounter[Index]--;
				}
				DbgLog(this.sessionSecondCounter[Index]);
			}, 1000);
			
			Log = "Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" aggiornata";
		}
		DbgLog(Log);
		return Promise.resolve(UserAdded);
	}
	delSession(OldSessionUser)
	{
		
		let Ret = false;
		let Index = this.findSessionIndex(OldSessionUser);
		if(Index != undefined)
		{
			DbgLog(`Indice da cancellare ${Index}`);
			clearInterval(this.sessionIntervalDesc[Index]);
			clearTimeout(this.sessionTimeoutDesc[Index]);
			if(this.sessions.length == 1)
			{
				this.sessions.pop();
				this.sessionSecondCounter.pop();
				this.sessionIntervalDesc.pop();
				this.sessionTimeoutDesc.pop();
			}
			else
			{
				this.sessions.splice(Index, 1);
				this.sessionSecondCounter.splice(Index, 1);
				this.sessionIntervalDesc.splice(Index, 1);
				this.sessionTimeoutDesc.splice(Index, 1);
			}
			// let Log = "Sessione per l'utente \"" + OldSessionUser.username.toString() + "\" non cancellata";
			Log = "Sessione per l'utente \"" + OldSessionUser.username.toString() + "\" cancellata";
			Ret = true;
		}
		DbgLog(Log);
		return Ret;
	}
	delAllSessions()
	{
		if(this.sessions.length > 0)
		{
			this.sessions = [];
			this.sessionSecondCounter = [];
			this.sessionIntervalDesc = [];
			this.sessionTimeoutDesc = [];
		}
	}

	isSessionLegit(UserIp)
	{
		let UserLegit = false;
		let SessionIndex = this.findSessionIndex('', UserIp);
		if(SessionIndex != undefined && this.sessions[SessionIndex].userinfo.userID != '')
		{
			UserLegit = true;
		}
		return UserLegit;
	}
	logoutSession(UserIp)
	{
		let SessionIndex = this.findSessionIndex('', UserIp);
		if(SessionIndex != undefined)
		{
			DbgLog(`Indice da cancellare ${SessionIndex}`);
			clearInterval(this.sessionIntervalDesc[SessionIndex]);
			clearTimeout(this.sessionTimeoutDesc[SessionIndex]);
			if(this.sessions.length == 1)
			{
				this.sessions.pop();
				this.sessionSecondCounter.pop();
				this.sessionIntervalDesc.pop();
				this.sessionTimeoutDesc.pop();
			}
			else
			{
				this.sessions.splice(SessionIndex, 1);
				this.sessionSecondCounter.splice(SessionIndex, 1);
				this.sessionIntervalDesc.splice(SessionIndex, 1);
				this.sessionTimeoutDesc.splice(SessionIndex, 1);
			}
		}
	}

}



const express = require('express');
const path = require('path');
const uuid = require('uuid');
const exphbs = require('express-handlebars');
const SysCall = require(__dirname + '/SystemCall');
const Users = require(__dirname + '/Res/loginTable');
var os_utils = require('node-os-utils');
const FileSystem = require('fs');
// const { resolve } = require('path');


const EnableLog = false;

const Paths = {
	log_file : '/home/deo/Logs/Webserver.log',
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

// const SERVER_PORT = process.env.PORT || 1989;
const PORT = require(__dirname + '/Definitions');
const SESSION_TIMEOUT = (15 * 60 * 1000);

const UsersSessions = new PiSessions();

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
	FileSystem.appendFile(Paths.log_file, `${ActualTime} - ${LogMessage} \n`, (err) => {
		if (err) throw err; });
}

// Handlebars Middleware
piApp.engine('handlebars', exphbs());
piApp.set('view engine', 'handlebars');

// Body Parser Middleware
piApp.use(express.json());
piApp.use(express.urlencoded({ extended: false }));


// Homepage Route
piApp.get('/', (req, res) => {
	res.redirect('/login');
});

// Ritorno il file per l'icona
piApp.get('/favicon.ico', (req, res) => {
	res.sendFile(Paths.favicon);
});

// Pagina di login
piApp.get('/login', (req, res) =>
  res.render('login', {
    title: 'Pi Server Login'
  })
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

piApp.get('/system', (req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		res.render('system', {
			sys_message : ''
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
		// let ActualTime = getTime();
		// FileSystem.appendFile(Paths.log_file, `${ActualTime} - Richiesta di riavvio \n`, (err) => {
		// 	if (err) throw err; });
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


piApp.get('/shutdown', (req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		console.log("Spegnimento in corso");
		logToFile('Richiesta di spegnimento');
		// let ActualTime = getTime();
		// FileSystem.appendFile(Paths.log_file, `${ActualTime} - Richiesta di spegnimento \n`, (err) => {
		// 	if (err) throw err; });
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

piApp.get('/network', (req, res) => {
	if(UsersSessions.isSessionLegit(req.ip))
	{
		res.render('network');
	}
	else
	{
		res.redirect('/login');
	}
	
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
	logToFile(`Server in ascolto sulla porta ${PORT.SERVER_PORT}`);
});