
var tesla = require("./createTesla.js");


//TEST
module.exports = function register(homebridge) {
  const Service = homebridge.hap.Service
  const Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-tesla-janver', 'Tesla-janver',tesla.createTesla({
    Service,
    Characteristic,
  }));
}



