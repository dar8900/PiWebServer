

function getPiInfo()
{
    let Temp = document.getElementById("pi_temp");
    let Date = document.getElementById("pi_date");
    let Username = document.getElementById("user_name");
    let UserTime = document.getElementById("user_time");
    let xhr = new XMLHttpRequest();
    xhr.onload = function () {
        if(this.status == 200)
        {
            let response = JSON.parse(xhr.response);
            Temp.innerHTML = response.temp;
            Date.innerHTML = response.date;
            Username.innerHTML = "Username: " + response.username;
            UserTime.innerHTML = response.userTime;
        }
    }
    xhr.open('GET', '/pi_info', true);
    
    xhr.send();
}
setInterval(getPiInfo, 1000);