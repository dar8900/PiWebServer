const express = require('express');
const path = require('path');
const uuid = require('uuid');
const exphbs = require('express-handlebars');
const SysCall = require('./SystemCall');
const Users = require('./Res/loginTable');

const EnableLog = false;

function DbgLog(DbgMsg)
{
	if(EnableLog)
	{
		console.log(DbgMsg);
	}
}

class PiUser
{
	constructor(Userinfo)
	{
		this.userinfo = Userinfo;
		this.userinfo.userID = '';
	}
	async sessionUserValidation()
	{
		let ValidateLogin = false;
		for(let i = 0; i < Users.length; i++)
		{
			if(Users[i].username == this.userinfo.username && Users[i].passwd == this.userinfo.passwd)
			{
				ValidateLogin = true;
				this.userinfo.userID = uuid.v4();
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
		// this.sessionID = [];
		this.timeout = 5000;
		// this.logged = [];
	}
	sessionTimeout(callback)
	{
		setTimeout(callback, this.timeout);
	}
	findSessionIndex(SessionUser)
	{
		let SessionIndex = undefined;
		for(let i = 0; i < this.sessions.length; i++)
		{
			if(SessionUser.username.toString() == this.sessions[i].userinfo.username)
			{
				SessionIndex = i;
				break;
			}
		}
		return SessionIndex;
	}
	async addSession(NewSessionUser)
	{
		let Log = "Sessione per l'utente " + NewSessionUser.username.toString() + " non aggiunta";
		let Ret = true;
		let OldUser = false;
		let NewSession = new PiUser(NewSessionUser);
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
				let RightCredentials = await NewSession.sessionUserValidation();
				if(!InsertNewSession)
				{
					this.sessions[this.findSessionIndex(NewSessionUser)].userinfo.userID = NewSession.userinfo.userID;
				}
				if(RightCredentials)
				{
					if(InsertNewSession)
					{
						DbgLog("Sessione inserita nella lista");
						this.sessions.push(NewSession);
					}
					// this.logged.push(true);
					this.sessionTimeout(() => {
						let Index = this.findSessionIndex(NewSessionUser);
						if(Index != undefined)
						{
							// this.logged[Index] = false;
							DbgLog("Sessione per l'utente " + this.sessions[Index].userinfo.username + " scaduta");
							this.sessions[Index].userinfo.userID = '';
						}
					});
					let Index = this.findSessionIndex(NewSessionUser);
					if(InsertNewSession)
					{
						Log = "Sessione per l'utente " + this.sessions[Index].userinfo.username + " aggiunta e login validato\n ";
						Log += "Il nuovo ID vale : " + this.sessions[Index].userinfo.userID;
					}
					else
					{
						Log = "Sessione per l'utente " + this.sessions[Index].userinfo.username + " aggiornata";
					}
					Ret = true;
				}
				else
				{
					Ret = false;
					Log = "Sessione per l'utente " + NewSessionUser.username + " non aggiunta e login non validato";
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


}

const SERVER_PORT = process.env.PORT || 1989;

const UsersSessions = new PiSessions();

const piApp = express();

// Handlebars Middleware
piApp.engine('handlebars', exphbs());
piApp.set('view engine', 'handlebars');

// Body Parser Middleware
piApp.use(express.json());
piApp.use(express.urlencoded({ extended: false }));

// Homepage Route
piApp.get('/*', (req, res) =>
  res.render('login', {
    title: 'Pi Server Login'
  })
);



piApp.post('/index', async(req, res) =>{
	let LoginReq = req.body;
	let UserAdmitted = await UsersSessions.addSession(LoginReq);
	DbgLog(UsersSessions.sessions);
	if(UserAdmitted)
	{
		let Temp = await SysCall.launchSystemScript(SysCall.TempScript);
		let Date = await SysCall.launchSystemScript(SysCall.DateScript);
		
		res.render('index', {
			title: "Welcome to PiServer!",
			temperatura: Temp,
			data:Date
		})
	}
	else
	{
		res.redirect('/');
	}
});
	
piApp.listen(SERVER_PORT, () => console.log(`Server started on port ${SERVER_PORT}`));