// const express = require('express');
const path = require('path');
const uuid = require('uuid');
// const exphbs = require('express-handlebars');
const SysCall = require(__dirname + '/SystemCall');
const Users = require(__dirname + '/Res/loginTable');
// var os_utils = require('node-os-utils');
const FileSystem = require('fs');
// const { default: Os } = require('node-os-utils/lib/os');
// const OsInfo = require('os');
// const net_stat = require('net-stat');
const { __esModule } = require('uuid/dist/v1');

const SESSION_TIMEOUT = (15 * 60 * 1000);
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
		this.userinfo.IP = '';
	}
	async sessionUserValidation(UserIp)
	{
		let ValidateLogin = false;
		for(let i = 0; i < Users.users.length; i++)
		{
			if(Users.users[i].username == this.userinfo.username && Users.users[i].passwd == this.userinfo.passwd)
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


exports.piUser = PiUser;
exports.piSessions = PiSessions;