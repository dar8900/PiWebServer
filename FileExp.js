var express = require('express');
var file_exp_router = express.Router();
const OsInfo = require('os');
const FileSystem = require('fs');
const MainApp = require(`./Server`);

file_exp_router.use((req, res, next) => {
    // console.log(`Dentro la route del modulo File exp`);
    next();
  });

file_exp_router.get('/', async (req, res) => {
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


module.exports = file_exp_router;