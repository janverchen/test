import createTesla from './tesla'

module.exports = function register(homebridge) {
  const Service = homebridge.hap.Service
  const Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-tesla-janver', 'Tesla-janver', createTesla({
    Service,
    Characteristic,
  }));
}