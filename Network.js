var express = require('express');
var net_router = express.Router();

const OsInfo = require('os');
const net_stat = require('net-stat');

var MainApp = require(`./Server`);

net_router.use((req, res, next) => {
    // console.log(`Dentro la route del modulo Network`);
    next();
  });

  net_router.get('/', async (req, res) => {
    MainApp.setOldPage(`Network`);
	if(MainApp.userSessions.isSessionLegit(req.ip))
	{
		let NetInfo = OsInfo.networkInterfaces();
		let NetStat = {
			total_rx : net_stat.totalRx({ iface: 'eth0', units: 'MiB' }), 
			total_tx : net_stat.totalTx({ iface: 'eth0', units: 'MiB' })
		};
		res.render('network', {
			ip_address : NetInfo.eth0[0].address,
			netmask : NetInfo.eth0[0].netmask,
			gateway : '192.168.2.254',
			mac_address : NetInfo.eth0[0].mac,
			tot_rx : NetStat.total_rx.toFixed(1) + "MB",
			tot_tx : NetStat.total_tx.toFixed(1) + "MB"
		});
	}
	else
	{
		res.redirect('/login');
	}
	
});

exports.network_router = net_router;