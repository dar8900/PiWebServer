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
		let Ret = true;
		let OldUser = false;
		let NewSession = new PiUser(NewSessionUser, NewUserIP);
		let GoOn = false, InsertNewSession = true;
		if(Ret)
		{
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
							InsertNewSession = false;
							break;
						}
					}
				}
			}
			if(!GoOn)
			{
				let RightCredentials = await NewSession.sessionUserValidation(NewUserIP);
				if(!InsertNewSession)
				{
					this.sessions[this.findSessionIndex(NewSessionUser)].userinfo.userID = NewSession.userinfo.userID;
					this.sessionSecondCounter[this.findSessionIndex(NewSessionUser)] = SESSION_TIMEOUT / 1000;
				}
				if(RightCredentials)
				{
					if(InsertNewSession)
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
						DbgLog(`Sessione per l'utente \"${NewSessionUser.username}\" inserita nella lista`);
					}
					this.sessionTimeout(() => {
						let Index = this.findSessionIndex(NewSessionUser);
						if(Index != undefined)
						{
							DbgLog("Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" scaduta");
							this.sessions[Index].userinfo.userID = '';
							clearInterval(this.sessionIntervalDesc[Index]);
						}
					});
					
					let Index = this.findSessionIndex(NewSessionUser);
					if(InsertNewSession)
					{
						Log = "Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" aggiunta e login validato\n ";
						Log += "Il nuovo ID vale : " + this.sessions[Index].userinfo.userID;
					}
					else
					{
						let Index = this.findSessionIndex(NewSessionUser);
						this.sessionSecondCounter[Index] = SESSION_TIMEOUT / 1000;
						this.sessionIntervalDesc[Index] = setInterval(() => {
							if(this.sessionSecondCounter[Index] > 0)
							{
								this.sessionSecondCounter[Index]--;
							}
							DbgLog(this.sessionSecondCounter[Index]);
						}, 1000);
						
						Log = "Sessione per l'utente \"" + this.sessions[Index].userinfo.username + "\" aggiornata";
					}
					Ret = true;
				}
				else
				{
					Ret = false;
					Log = "Sessione per l'utente \"" + NewSessionUser.username + "\" non aggiunta e login non validato";
				}
			}
		}
		DbgLog(Log);
		return Promise.resolve(Ret);
	}
	delSession(OldSessionUser)
	{
		let Log = "Sessione per l'utente " + OldSessionUser.username.toString() + " non cancellata";
		let Ret = false;
		let Index = this.findSessionIndex(OldSessionUser);
		if(Index != undefined)
		{
			if(Index == 0)
			{
				this.sessions.pop();
			}
			else
			{
				this.sessions = this.sessions.splice(Index, 1);
			}
			Log = "Sessione per l'utente " + OldSessionUser.username.toString() + " cancellata";
			Ret = true;
		}
		DbgLog(Log);
		return Ret;
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

}

const express = require('express');
const path = require('path');
const uuid = require('uuid');
const exphbs = require('express-handlebars');
const SysCall = require('./SystemCall');
const Users = require('./Res/loginTable');

const EnableLog = true;

const Paths = {
	favicon: path.join(__dirname, 'Res/server_icon.png'),
	index_js : path.join(__dirname, 'WebJS/index.js')
};

const SERVER_PORT = process.env.PORT || 1989;
const SESSION_TIMEOUT = (5 * 1000);

const UsersSessions = new PiSessions();

const piApp = express();

function DbgLog(DbgMsg)
{
	if(EnableLog)
	{
		console.log(DbgMsg);
	}
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
// Richiesta del javascript per la home page
piApp.get('/index.js', (req, res) =>{
	res.sendFile(Paths.index_js);
});

// Richiesta info per homepage dal javascript annesso
// Il JS modifica la pagina di home
piApp.get('/pi_info', async (req, res) => {
	let Temp = await SysCall.launchSystemScript(SysCall.TempScript);
	let PiDate = await SysCall.launchSystemScript(SysCall.DateScript);
	let Username = UsersSessions.findSessionUsername('', req.ip);
	let UserTime = UsersSessions.sessionSecondCounter[UsersSessions.findSessionIndex('', req.ip)];
	let PiInfoObj = {
		temp: Temp,
		date : PiDate,
		username : Username,
		userTime : UserTime.toString() + "s"
	};
	res.send(PiInfoObj);
});

// Routing per la home page, può avvenire sia tramite get o post
piApp.route('/index')
	.get(async (req, res) => {
		if(UsersSessions.isSessionLegit(req.ip))
		{
			let Temp = await SysCall.launchSystemScript(SysCall.TempScript);
			let PiDate = await SysCall.launchSystemScript(SysCall.DateScript);
			res.render('index', {
				title: "Welcome to PiServer!",
				temperatura: Temp,
				data: PiDate,
				// session_time : (SESSION_TIMEOUT / 1000).toString() + "s"
			})
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
			let Temp = await SysCall.launchSystemScript(SysCall.TempScript);
			let PiDate = await SysCall.launchSystemScript(SysCall.DateScript);
			res.render('index', {
				title: "Welcome to PiServer!",
				temperatura: Temp,
				data: PiDate,
				// session_time : (SESSION_TIMEOUT / 1000).toString() + "s"
			})	
		}
		else
		{
			res.redirect('/login');
		}
	})


piApp.get('/*', (req, res) => {
	res.render('not_found', {
		title: "404 not found"
	})
});
	
piApp.listen(SERVER_PORT, () => console.log(`Server started on port ${SERVER_PORT}`));