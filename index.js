'use strict'

var _ = require('lodash')
var assert = require('assert')
var uuid = require('node-uuid')

var CREATE_TIMEOUT = 1000 * 30

var DevicesManager = function (options) {
  assert(_.isObject(options))
  assert(_.isObject(options.platform))
  assert(_.isObject(options.storage))
  assert(_.isObject(options.logger))
  this.platform = options.platform
  this._log = options.logger
  this._storage = options.storage
  this._devices = []
  this._ongoingCreateRequests = {}
  this.platform.messaging.on('public.tenant.createReply', this._onCreateReply.bind(this))
}

DevicesManager.prototype._load = function () {
  var self = this
  this._storage.get('devices', function (err, result) {
    if (!err) {
      var devices = JSON.parse(result)
      _.forEach(devices, function (device) {
        self.addKey(device, true)
      })
      self._save()
    }
  })
}

DevicesManager.prototype._save = function () {
  this._storage.put('devices', JSON.stringify(this._devices))
  this.platform.messaging.send('devices.update', 'local', this._devices)
}

DevicesManager.prototype.addKey = function (publicKey, dontSave) {
  if (!this.inScope(publicKey)) {
    this._devices.push(publicKey)
  }
  if (dontSave) {} else {
    this._save()
  }
}

DevicesManager.prototype.createTenant = function (publicKey, secret) {
  var self = this
  this._ongoingCreateRequests[publicKey] = {
    secret: secret,
    id: uuid.v4(),
    timestamp: new Date()
  }
  this.platform.messaging.send('tenant.create', publicKey, this._ongoingCreateRequests[publicKey])
  setTimeout(function () {
    delete self._ongoingCreateRequests[publicKey]
  }, CREATE_TIMEOUT)
}

DevicesManager.prototype._onCreateReply = function (topic, publicKey, data) {
  if (_.has(this.ongoingCreateRequests, publicKey) &&
    this._ongoingCreateRequests[publicKey].id === data.id) {
    this.addKey(data.publicKey)
  }
}

DevicesManager.prototype.getDevices = function () {
  return this._devices
}

DevicesManager.prototype.inScope = function (publicKey) {
  return _.has(this._devices, publicKey)
}

module.exports = DevicesManager
