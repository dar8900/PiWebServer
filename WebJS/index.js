

function getPiInfo()
{
    let IndexIds = {
        uptime : "pi_uptime",
        temp_id : "pi_temp",
        cpu_id : "pi_cpu",
        ram_id : "pi_ram",
        user_id : "user_name",
        user_time_id : "user_time",
        ssh_conn : "pi_ssh_n_conn"
    };

    let UpTime = document.getElementById(IndexIds.uptime);
    let Temp = document.getElementById(IndexIds.temp_id);
    let Cpu = document.getElementById(IndexIds.cpu_id);
    let Ram = document.getElementById(IndexIds.ram_id);
    let Username = document.getElementById(IndexIds.user_id);
    let UserTime = document.getElementById(IndexIds.user_time_id);
    let SshNConn = document.getElementById(IndexIds.ssh_conn);
    let xhr = new XMLHttpRequest();
    xhr.onload = function () {
        if(this.status == 200)
        {
            let response = JSON.parse(xhr.response);
            UpTime.innerHTML = response.uptime;
            Temp.innerHTML = response.temp;
            Cpu.innerHTML = `${response.cpu} %`;
            Ram.innerHTML = `${response.ram} %`;
            Username.innerHTML = `Utente connesso: ${response.username}`;
            if(response.userTime == 'N.A.')
            {
                UserTime.innerHTML = `${response.userTime}`;

            }
            else
            {
                UserTime.innerHTML = `La sessione scadrà tra ${response.userTime}`;

            }
            SshNConn.innerHTML = response.sshConn;
        }
    }
    xhr.open('GET', '/pi_info', true);
    
    xhr.send();
}
window.onload = getPiInfo();
setInterval(getPiInfo, 1000);