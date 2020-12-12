const http = require('http');
const url = require('url');
const Os = require('os');
const Path = require('path');

const QueryStr = require('querystring');
const SysCall = require('./SystemCall');


class PiUser
{
	constructor(Userinfo)
	{
		this.userinfo = Userinfo;
	}
	async sessionUserValidation()
	{
		let LogInFile = await SysCall.getFileContent(LoginTable);
		let NamePasswd = [];
		let SingleElements = [];
		let UsersAndPassw = {username:"", passwd:""};
		let ReloadObj = false;
		let ValidateLogin = false;
		LogInFile = LogInFile.replace('\r', '');
		NamePasswd = LogInFile.split('\n');
		for(let i = 0; i < NamePasswd.length; i++)
		{
			let TempArray = NamePasswd[i].split(':');
			for(let j = 0; j < TempArray.length; j++)
			{
				SingleElements.push(TempArray[j]);
			}
		}
		SingleElements = SingleElements.map((item) => item = item.replace('\r', ''));
		// console.log(SingleElements);
		NamePasswd = [];
		for(let i = 0; i < SingleElements.length; i++)
		{
			if(ReloadObj)
				UsersAndPassw = {username:"", passwd:""};
			if(i % 2 == 0)
			{
				UsersAndPassw.username = SingleElements[i];
				ReloadObj = false;
			}
			else
			{
				UsersAndPassw.passwd = SingleElements[i];
				NamePasswd.push(UsersAndPassw);
				ReloadObj = true;
			}
		}
		for(let i = 0; i < NamePasswd.length; i++)
		{
			if(NamePasswd[i].username == this.userinfo.username && NamePasswd[i].passwd == this.userinfo.passwd)
			{
				ValidateLogin = true;
				ActualLoggedUser = NamePasswd[i];
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
		this.sessionsQueue = [];
		this.timeout = 30000;
		this.logged = [];
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
			if(SessionUser.username.toString() == this.sessionsQueue[i].toString())
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
		for(let i = 0; i < this.sessions.length; i++)
		{
			if(NewSessionUser.username.toString() == this.sessionsQueue[i] && this.logged[i] == true)
			{
				Ret = true;
				break;
			}
			else if(NewSessionUser.username.toString() == this.sessionsQueue[i] && this.logged[i] == false)
			{
				OldUser = true;
				break;
			}
		}
		if(Ret)
		{
			let RightCredentials = await NewSession.sessionUserValidation();
			if(RightCredentials && !OldUser)
			{
				this.sessions.push(NewSession);
				this.sessionsQueue.push(NewSessionUser.username.toString());
				this.logged.push(true);
				this.sessionTimeout(() => {
					let Index = this.findSessionIndex(NewSessionUser);
					if(Index != undefined)
					{
						this.logged[Index] = false;
						console.log("Sessione per l'utente " + this.sessionsQueue[Index].toString() + " scaduta");
					}
				});
				Log = "Sessione per l'utente " + NewSessionUser.username.toString() + " aggiunta e login validato";
				Ret = true;
			}
			else if(RightCredentials && OldUser)
			{
				this.sessionTimeout(() => {
					let Index = this.findSessionIndex(NewSessionUser);
					if(Index != undefined)
					{
						this.logged[Index] = false;
						console.log("Sessione per l'utente " + this.sessionsQueue[Index].toString() + " scaduta");
					}
				});
				let Index = this.findSessionIndex(NewSessionUser)
				this.logged[Index] = true;
				Log = "Sessione per l'utente " + NewSessionUser.username.toString() + " validata e aggiornata";
				Ret = true;
			}
			else
			{
				Ret = false;
				Log = "Sessione per l'utente " + NewSessionUser.username.toString() + " non aggiunta e login non validato";
			}
		}
		console.log(Log);
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
				this.sessionsQueue.pop();
				this.logged.pop();
			}
			else
			{
				this.sessions = this.sessions.splice(Index, 1);
				this.sessionsQueue = this.sessionsQueue.splice(Index ,1);
				this.logged = this.logged.splice(Index, 1);
			}
			Log = "Sessione per l'utente " + OldSessionUser.username.toString() + " cancellata";
			Ret = true;
		}
		console.log(Log);
		return Ret;
	}


}

const SERVER_PORT = 1989
const LoginPage = Path.join(__dirname, 'HtmlPages', 'loginPage.html');
const NotFoundPage = Path.join(__dirname, 'HtmlPages', 'notFound.html');
const NotImplementedPage = Path.join(__dirname, 'HtmlPages', 'reqUnknown.hmtl');
const IndexPage = Path.join(__dirname, 'HtmlPages', 'index.html');
const LoginTable = Path.join(__dirname, 'HtmlPages/res', 'login_table.txt');

const UsersSessions = new PiSessions();


// const LoginTable = new PiFile("Logintable", RootPath + "HtmlPages/res/login_table.txt")

	

var ActualLoggedUser = {username:"", passwd:""};
module.exports.user = ActualLoggedUser.username;

function CollectPostReq(Request)
{
	return new Promise((resolve, reject) => {
		let body = '';
		let PostQueryParsed;
		Request.on('data', chunk => {
			body += chunk.toString();
		});
		Request.on('end', () => {
			resolve(QueryStr.parse(body));
		});
	});
}


async function SendResponse(req, res)
{
	let HttpPage;
	// let temp = await SysCall.getTemp();
	// let date = await SysCall.getPiDate();
	let PageSelected = url.parse(req.url).pathname;
	let Query = url.parse(req.url, true).query;

	console.log("Page sel:");
	console.log(req.url);
	console.log("Req method:");
	console.log(req.method);
	// console.log(UsersSessions);
	if(req.method == 'GET')
	{
		if(PageSelected != '/favicon.ico')
		{
			HttpPage = await SysCall.getFileContent(LoginPage);
		}
		else
		{
			res.writeHead(200, {'Content-Type': 'image/x-icon'} );
			res.end();
			return;
		}

	}
	else if(req.method == 'POST')
	{
		if(PageSelected != '/favicon.ico')
		{
			let PostReq = await CollectPostReq(req);
			let IncomingUserSession = new PiUser(PostReq);
			let UserAmmited = await UsersSessions.addSession(IncomingUserSession.userinfo);
			if(UserAmmited)
			{
				if(PageSelected === '/index.html')
				{
					console.log(IndexPage);
					HttpPage = await SysCall.getFileContent(IndexPage);
				}
				else
				{
					HttpPage = await SysCall.getFileContent(NotFoundPage);
					res.writeHead(404, {'Content-Type': 'image/x-icon'} );
					res.end(HttpPage);
					return;
				}
			}
			else
			{
				HttpPage = await SysCall.getFileContent(LoginPage);
			}
		}
		else
		{
			res.writeHead(200, {'Content-Type': 'image/x-icon'} );
			res.end();
			return;
		}
	}
	else
	{
		HttpPage = await SysCall.getFileContent(NotImplementedPage);
		res.writeHead(501, {'Content-Type': 'text/html'});
		res.end(HttpPage);
		return;
	}
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write(HttpPage);
	res.end();
	return;
}
const NewServer = http.createServer();
NewServer.listen(SERVER_PORT);
NewServer.on('request', SendResponse);

// setInterval(callback, delay[, ...args])
// Os.uptime(); in sec