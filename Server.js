const http = require('http');
const url = require('url');
const Os = require('os');
const QueryStr = require('querystring');
const SysCall = require('./SystemCall');


class PiFile
{
	constructor(FileName, FilePath)
	{
		this.fileName = FileName;
		this.filePath = FilePath;
	}
	get path()
	{
		return this.filePath;
	}

}

class PiSession
{
	constructor(UserInfo, Timeout)
	{
		this.userinfo = UserInfo;
		this.timeout = Timeout;
		this.logged = false;
	}
	set logging(IsLogging)
	{
		this.logged = IsLogging;
	}
	get isLogged()
	{
		return this.logged;
	}
	set newTimeout(NewTimeout)
	{
		this.timeout = NewTimeout;
	}

}


const RootPath = "/home/deo/Homeshare/PiserverJS/";
const LoginPage = new PiFile("LoginPage", RootPath + "HtmlPages/loginPage.html");
const NotFoundPage = new PiFile("NotFound", RootPath + "HtmlPages/notFound.html");
const IndexPage = new PiFile("Index", RootPath + "HtmlPages/index.html")




const LoginTable = new PiFile("Logintable", RootPath + "HtmlPages/res/login_table.txt")

const SERVER_PORT = 1989	

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

async function ValidateLogin_async(Username, Passwd)
{
	let LogInFile = await SysCall.getFileContent(LoginTable.path);
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
		if(NamePasswd[i].username == Username && NamePasswd[i].passwd == Passwd)
		{
			ValidateLogin = true;
			ActualLoggedUser = NamePasswd[i];
			break;
		}
	}
	return Promise.resolve(ValidateLogin);
}

async function SendResponse(req, res)
{
	let HttpPage;
	// let temp = await SysCall.getTemp();
	// let date = await SysCall.getPiDate();
	let PageSelected = url.parse(req.url).pathname;
	let Query = url.parse(req.url, true).query;
	console.log("Page sel:");
	console.log(PageSelected);
	if(req.method == 'GET')
	{
		if(PageSelected == '/' || PageSelected == '/goto_index')
		{
			HttpPage = await SysCall.getFileContent(LoginPage.path);
		}
		else if(PageSelected == '/favicon.ico')
		{
			res.writeHead(200, {'Content-Type': 'image/x-icon'} );
			res.end();
			return;
		}
		else
		{
			res.writeHead(404)
			HttpPage = await SysCall.getFileContent(NotFoundPage.path);
			res.end(HttpPage);
			return;
		}
	}
	else if(req.method == 'POST')
	{
		if(PageSelected == '/goto_index')
		{
			let PostReq = await CollectPostReq(req);
			let Validation = await ValidateLogin_async(PostReq.username, PostReq.passwd);
			if(Validation)
			{
				console.log("Login validato");
				HttpPage = await SysCall.getFileContent(IndexPage.path);
			}
			else
			{
				console.log("Login invalido");
				HttpPage = await SysCall.getFileContent(LoginPage.path);
			}
		}
	}
	else
	{
		console.log("Unknown request type");
		res.writeHead(500);
		res.end("Req unknown");
		return;
	}
	res.writeHead(200);
	res.write(HttpPage);
	res.end();
	return;
}
const NewServer = http.createServer();
NewServer.listen(SERVER_PORT);
NewServer.on('request', SendResponse);

// setInterval(callback, delay[, ...args])
// Os.uptime(); in sec