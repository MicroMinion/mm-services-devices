'use strict'

var _ = require('lodash')
var assert = require('assert')

var DevicesManager = function (options) {
  assert(_.isObject(options))
  assert(_.isObject(options.platform))
  assert(_.isObject(options.storage))
  assert(_.isObject(options.logger))
  this.platform = options.platform
  this._log = options.logger
  this._storage = options.storage
  this._devices = []
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
}

DevicesManager.prototype.addKey = function (publicKey, dontSave) {
  if (!this.inScope(publicKey)) {
    this._devices.push(publicKey)
  }
  if (dontSave) {} else {
    this._save()
  }
}

DevicesManager.prototype.inScope = function (publicKey) {
  return _.has(this._devices, publicKey)
}

module.exports = DevicesManager
