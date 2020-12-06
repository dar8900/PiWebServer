const TEMP_SCRIPT = './TempScript.sh'
const SERVER_PORT = 1989

var http = require('http');

http.createServer(function (req, res) {
    const exec = require('child_process').exec;
    const myShellScript = exec(TEMP_SCRIPT);
    myShellScript.stdout.on('data', (data)=>{ 
        let newdata = (parseFloat(data)/1000.0).toFixed(1).toString();
        console.log(newdata);
    });
    myShellScript.stderr.on('data', (data)=>{
        console.error(data);
    });
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World!');
}).listen(SERVER_PORT);