require("dotenv").config();
const fs = require("fs");
const path = require("path");
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const axios = require("axios");
const to = process.env.TWILIO_TO;
const from = process.env.TWILIO_FROM;
const weatherApi = process.env.WEATHER_API;
let timer;
let data;
let parsedData;
let sent;
let body;
let city;
let triggerTemp;
let intervalTime;

const getData = () => {
  data = fs.readFileSync(path.join(__dirname, "data.json"));
  parsedData = JSON.parse(data);
  const weather = parsedData.weather;
  const sms = parsedData.sms;
  const message = parsedData.message;
  const config = parsedData.config;
  city = weather.city;
  body = sms.body;
  sent = message.sent;
  triggerTemp = config.triggerTemp;
  intervalTime = config.intervalTime;
};

const updateData = (sent = false) => {
  parsedData.message.sent = sent;
  fs.writeFileSync(
    path.join(__dirname, "data.json"),
    JSON.stringify(parsedData)
  );
};

const init = () => {
  getData();
  updateData(false);
};

init();

const weather = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApi}`;

const convertToC = (temp) => {
  return temp - 273.15;
};

const smsSent = () => {
  parsedData.message.sent = true;
  fs.writeFileSync(
    path.join(__dirname, "data.json"),
    JSON.stringify(parsedData)
  );
};

const startSmsResetTimer = () => {
  console.log("starting timer");
  timer = setTimeout(() => {
    console.log("reseting sent");
    updateData();
    stopSmsResetTimer();
  }, 43200 * 1000);
};

const stopSmsResetTimer = () => {
  console.log("stopping timer");
  clearTimeout(timer);
};

const sendSms = (tempInC) => {
  client.messages
    .create({
      body,
      from,
      to,
    })
    .then((message) => {
      smsSent();
      console.log(message);
    });
  smsSent();
  startSmsResetTimer();
};

const main = async () => {
  getData();
  const weatherUpdate = await axios.get(weather);
  const tempInK = weatherUpdate.data.main.temp;
  const tempInC = convertToC(tempInK);
  if (tempInC <= triggerTemp) {
    console.log("Temperature seems a little cold, going to send you an SMS.");
    if (!sent) {
      sendSms(tempInC);
      console.log("sms sent");
    }
  } else {
    console.log("Temperature looks ok, I'll check again in 15 minutes.");
  }
};

main();

setInterval(() => {
  main();
}, intervalTime * 1000 || 800 * 1000);
