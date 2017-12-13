
var util = require('util')
var tesla = require('./tesla')


var all = exports.createTesla = function ({ Service, Characteristic }) {
  const CurrentTemperature = Characteristic.CurrentTemperature
  
  const LockCurrentState =  Characteristic.LockCurrentState  
  const LockTargetState =  Characteristic.LockTargetState //����״̬
  
  const ChargeLockCurrentState =  Characteristic.LockCurrentState  
  const ChargeLockTargetState =   Characteristic.LockTargetState //����״̬
  
  const SwitchOn = Characteristic.On

  return class TeslaInterface {
    constructor(log, config) {
      this.log = log
      this.name = config.name
      this.token = config.token
      this.vin = config.vin
      
      this.temperature = 0
      this.climateOn = false

      this.temperatureService = new Service.TemperatureSensor(this.name)
      this.temperatureService.getCharacteristic(CurrentTemperature)
        .on('get', this.getClimateState.bind(this, 'temperature'))

      this.climateService = new Service.Switch(this.name)
      this.climateService.getCharacteristic(Characteristic.On)
        .on('get', this.getClimateState.bind(this, 'climate'))
        .on('set', this.setClimateOn.bind(this))

      this.lockService = new Service.LockMechanism('car lock','000000A6-0000-1000-8000-00C6BB765292','carlock')
      this.lockService.getCharacteristic(LockCurrentState)
        .on('get', this.getLockState.bind(this))

      this.lockService.getCharacteristic(LockTargetState)
        .on('get', this.getLockState.bind(this))
        .on('set', this.setLockState.bind(this))
        
      //-----------------------���ӳ���״̬
      this.chargeLockService = new Service.LockMechanism('charge lock','000000A6-0000-1000-8000-00C6BB765291','chargelock')
      this.chargeLockService.getCharacteristic(ChargeLockCurrentState)
        .on('get', this.getChargeLockState.bind(this))

      this.chargeLockService.getCharacteristic(ChargeLockTargetState)
        .on('get', this.getChargeLockState.bind(this))
        .on('set', this.setChargeLockState.bind(this))   
    //----------------------�촰״̬    
       
        
      
    }
    

    

    getClimateState(what, callback) {
      this.log("Getting current climate state...")

      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.get_climate_state(id, (state) => {
          if (state && state.inside_temp) {
            this.temperature = state.inside_temp
            this.climateOn = state.is_climate_on
          }

          switch (what) {
            case 'temperature': return callback(null, this.temperature)
            case 'climate': return callback(null, this.climateOn)
            default: return callback(null, { temperature: this.temperature, climateOn: this.climateOn })
          }
        })
      })
    }

    setClimateOn(on, callback) {
      this.log("Setting climate to on = " + on)
      this.getID((err, id) => {
        if (err) return callback(err)

        const climateState = on ? 'start' : 'stop';

        tesla.auto_conditioning({id:id, climate: climateState}, (response) => {
          if (response.result == true) {
            this.log("Car climate control is now on = " + on)
            callback(null) // success
          } else {
            this.log("Error setting climate state: " + util.inspect(arguments))
            callback(err || new Error("Error setting climate state."))
          }
        })
      })
    }

    getLockState(callback) {
      this.log("Getting current lock state...")

      this.getID(function(err, id) {
        if (err) return callback(err)

        tesla.get_vehicle_state(id, function(state) {
          callback(null, state.locked)
        })
      })
    }
    
    getChargeLockState(callback) {
      this.log("Getting current chargeLock state...")
      this.getID(function(err, id) {
        if (err) return callback(err)
        tesla.get_charge_state(id, function(state) {
          callback(null, !state.charge_port_door_open)
        })
      })
    }    

    setLockState(state, callback) {
      var locked = (state == LockTargetState.SECURED)
      this.log("Setting car to locked = " + locked)
      this.getID((err, id) => {
        if (err) return callback(err)

        tesla.door_lock({id: id, lock: locked}, (response) => {
          if (response.result == true) {
            this.log("Car is now locked = " + locked)

            // we succeeded, so update the "current" state as well
            var currentState = (state == LockTargetState.SECURED) ?
              LockCurrentState.SECURED : LockCurrentState.UNSECURED

            // We need to update the current state "later" because Siri can't
            // handle receiving the change event inside the same "set target state"
            // response.
            setTimeout(function() {
              this.lockService.setCharacteristic(LockCurrentState, currentState)
            }.bind(this), 1)

            callback(null) // success
          } else {
            this.log("Error setting lock state: " + util.inspect(arguments))
            callback(err || new Error("Error setting lock state."))
          }
        })
      })
    }
    
    setChargeLockState(state, callback) {
      var locked = (state == ChargeLockTargetState.SECURED)
      this.log("Setting charge lock to locked = " + !locked)
      this.getID((err, id) => {
        if (err) return callback(err)
		if(locked){
	        tesla.close_charge_port(id, (response) => {
	          if (response.result == true) {
	            this.log("Car is now unlocked = " + locked)
	            // we succeeded, so update the "current" state as well
	            var currentState = (state == ChargeLockTargetState.SECURED) ?
	              ChargeLockCurrentState.SECURED : ChargeLockCurrentState.UNSECURED
	
	            // We need to update the current state "later" because Siri can't
	            // handle receiving the change event inside the same "set target state"
	            // response.
	            setTimeout(function() {
	              this.chargeLockService.setCharacteristic(ChargeLockCurrentState, currentState)
	            }.bind(this), 1)
	
	            callback(null) // success
	          } else {
	            this.log("Error setting charge lock state: " + util.inspect(arguments))
	            callback(err || new Error("Error setting lock state."))
	          }
	        })		
		
		}else{
	        tesla.open_charge_port(id, (response) => {
	          if (response.result == true) {
	            this.log("Car is now locked = " + locked)
	            // we succeeded, so update the "current" state as well
	            var currentState = (state == ChargeLockTargetState.SECURED) ?
	              ChargeLockCurrentState.SECURED : ChargeLockCurrentState.UNSECURED
	
	            // We need to update the current state "later" because Siri can't
	            // handle receiving the change event inside the same "set target state"
	            // response.
	            setTimeout(function() {
	              this.chargeLockService.setCharacteristic(ChargeLockCurrentState, currentState)
	            }.bind(this), 1)
	
	            callback(null) // success
	          } else {
	            this.log("Error setting charge lock state: " + util.inspect(arguments))
	            callback(err || new Error("Error setting lock state."))
	          }
	        })
        };
        
        
        
      })
    }    

    // Get the ID of the vehicle in your account with the desired VIN.
    getID(callback) {
      this.log("Logging into Tesla...")

      tesla.all({token: this.token}, (err, response, body) => {
        if (err) {
          this.log("Error logging into Tesla: " + err)
          return callback(err)
        }

        const vehicles = JSON.parse(body).response;

        for (let vehicle of vehicles) {
          if (vehicle.vin == this.vin) {
            return callback(null, vehicle.id_s)
          }
        }

        this.log("No vehicles were found matching the VIN '"+this.vin+"' entered in your config.json. Available vehicles:")
        for (let vehicle of vehicles) {
          this.log("VIN: " + vehicle.vin + " Name: " + vehicle.display_name)
        }
        callback(new Error("Vehicle with VIN " + this.vin + " not found."))
      })
    }

    getServices() {
      return [this.temperatureService, this.climateService, this.lockService,this.chargeLockService]
    }
  }
}
