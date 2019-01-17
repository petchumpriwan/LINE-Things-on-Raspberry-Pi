// Device Name
const DEVICE_NAME = 'LINE Things Pi'

// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID = '91E4E176-D0B9-464D-9FE4-52EE3E9F1552' // LED, Button
// User service characteristics
const WRITE_CHARACTERISTIC_UUID = 'E9062E71-9E62-4BC6-B0D3-35CDCD9B027B'
const NOTIFY_CHARACTERISTIC_UUID = '62FBD229-6EDD-4D1A-B554-5C4E1BB29169'

// PSDI Service UUID: Fixed value for Developer Trial
const PSDI_SERVICE_UUID = 'E625601E-9E55-4597-A598-76018A0D293D' // Device ID
const PSDI_CHARACTERISTIC_UUID = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E'

// Import Libraries
const bleno = require('bleno')
const onoff = require('onoff')
const debugIO = require('debug')('io')
const debugBLE = require('debug')('ble')

// GPIO Configuration
const Gpio = onoff.Gpio
const led = new Gpio(17, 'out')
const button = new Gpio(22, 'in', 'both', { debounceTimeout: 10 })

// State Implementation
let buttonStatus = 0

// BLE Initialization
const PrimaryService = bleno.PrimaryService
const Characteristic = bleno.Characteristic

// User Service's Characteristics
const writeCharacteristic = new Characteristic({
  uuid: WRITE_CHARACTERISTIC_UUID,
  properties: ['write'],
  onWriteRequest: (data, offset, withoutResponse, callback) => {
    debugBLE('User Wrote LED Status = ' + data[0])
    debugIO('LED ' + (data[0] ? 'On' : 'Off'))
    led.writeSync(data[0])
    callback(Characteristic.RESULT_SUCCESS)
  }
})

const notifyCharacteristic = new Characteristic({
  uuid: NOTIFY_CHARACTERISTIC_UUID,
  properties: ['notify'],
  onSubscribe: (maxValueSize, updateValueCallback) => {
    button.watch((err, value) => {
      debugIO('Button Error = ' + err)
      debugIO('Button ' + (value ? 'Pressed' : 'Released'))
      buttonStatus = value
      debugBLE('Notify : Button Status = ' + value)
      updateValueCallback(new Buffer([buttonStatus]))
    })
  }
})

// Setup User Service
const userService = new PrimaryService({
  uuid: USER_SERVICE_UUID,
  characteristics: [writeCharacteristic, notifyCharacteristic]
})

// PSDI Service's Characteristics
const psdiCharacteristic = new Characteristic({
  uuid: PSDI_CHARACTERISTIC_UUID,
  properties: ['read'],
  onReadRequest: (offset, callback) => {
    const result = Characteristic.RESULT_SUCCESS
    const data = new Buffer.from(bleno.address)
    debugBLE('User Read : psdiCharacteristic = ' + data)
    callback(result, data)
  }
})

// Setup PSDI Service
const psdiService = new PrimaryService({
  uuid: PSDI_SERVICE_UUID,
  characteristics: [psdiCharacteristic]
})

console.log('LINE Things with Raspberry Pi')

bleno.on('stateChange', state => {
  console.log('on -> stateChange: ' + state)
  if (state === 'poweredOn') {
    bleno.startAdvertising(DEVICE_NAME, [USER_SERVICE_UUID])
  } else {
    bleno.stopAdvertising()
  }
})

bleno.on('advertisingStart', error => {
  console.log(
    'on -> advertisingStart: ' + (error ? 'error ' + error : 'success')
  )
  if (!error) {
    bleno.setServices([userService, psdiService])
  } else {
    console.log(error)
  }
})
