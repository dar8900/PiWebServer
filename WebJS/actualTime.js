function getTime()
{
    const LocaleDate = new Date();
    let TimeDate= document.getElementById("orario");
    TimeDate.innerHTML = LocaleDate.toLocaleTimeString() + "    " + LocaleDate.toLocaleDateString();
}
setInterval(getTime, 1000);