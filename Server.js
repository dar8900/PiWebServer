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


const RootPath = "/home/deo/Homeshare/PiserverJS/";
const LoginPage = new PiFile("LoginPage", RootPath + "HtmlPages/loginPage.html");
const NotFoundPage = new PiFile("NotFound", RootPath + "HtmlPages/notFound.html");
const LoginTable = new PiFile("Logintable", RootPath + "HtmlPages/res/login_table.txt")

const SERVER_PORT = 1989	

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
	console.log(LogInFile.toString().split(':'));
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
		if(PageSelected == '/')
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
		if(PageSelected == '/login')
		{
			let PostReq = await CollectPostReq(req);
			ValidateLogin_async("wqewq", "adasd");
			HttpPage = "Welcome";
		}
	}
	res.writeHead(200);
	res.write(HttpPage);
    res.end();
}
const NewServer = http.createServer();
NewServer.listen(SERVER_PORT);
NewServer.on('request', SendResponse);

// setInterval(callback, delay[, ...args])
// Os.uptime(); in sec