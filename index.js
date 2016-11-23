'use strict'

var _ = require('lodash')
var assert = require('assert')
var uuid = require('uuid')
var winstonWrapper = require('winston-meta-wrapper')

var CREATE_TIMEOUT = 1000 * 30

var DevicesManager = function (options) {
  assert(_.isObject(options))
  assert(_.isObject(options.platform))
  assert(_.isObject(options.storage))
  assert(_.isObject(options.logger))
  this.platform = options.platform
  this._log = winstonWrapper(options.logger)
  this._log.addMeta({
    module: 'mm:services:devices'
  })
  this._storage = options.storage
  this._ongoingCreateRequests = {}
  this.platform.messaging.on('public.tenant.createReply', this._onCreateReply.bind(this))
  this.platform.messaging.on('self.devices.updateRequest', this._update.bind(this))
  this._update()
  this._setupSync()
}

// MEMBERSHIP MANAGEMENT

DevicesManager.prototype._update = function () {
  var self = this
  this._storage.allDocs().then(function (result) {
    var devices = _.map(result.rows, function (document) {
      return document.id
    })
    self.platform.messaging.send('devices.update', 'local', devices)
  })
}

DevicesManager.prototype.addKey = function (publicKey, dontSave) {
  var self = this
  var doc = {
    '_id': publicKey
  }
  this._storage.put(doc)
    .then(function (response) {
      self._update()
    })
    .catch(function (err) {
      self._log.warn('error while adding key ' + publicKey + ' ' + err)
      self._update()
    })
}

// TENANT CREATION ON REMOTE NODE

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
  if (_.has(this._ongoingCreateRequests, publicKey) &&
    this._ongoingCreateRequests[publicKey].id === data.id) {
    this.addKey(data.publicKey)
  }
}

// SYNC LOGIC
var STATUS_INTERVAL = 60 * 1000

DevicesManager.prototype._setupSync = function () {
  this._devices = {}
  this.platform.messaging.on('self.devices.update', this._updateSyncHosts.bind(this))
  this.platform.messaging.send('devices.updateRequest', 'local', {})
  setInterval(this._checkStatus.bind(this), STATUS_INTERVAL)
  this.platform.messaging.on('self.status.online', this._updateStatus.bind(this))
  this.platform.messaging.on('self.status.offline', this._updateStatus.bind(this))
}

DevicesManager.prototype._updateSyncHosts = function (topic, publicKey, data) {
  var self = this
  var devices = {}
  _.forEach(data, function (publicKey) {
    devices[publicKey] = {}
    if (_.has(self._devices, publicKey)) {
      devices[publicKey] = self._devices[publicKey]
    }
  })
  this._devices = devices
}

DevicesManager.prototype._checkStatus = function () {
  var self = this
  _.forEach(_.keys(this._devices), function (publicKey) {
    self.platform.messaging.send('status.requestStatus', 'local', publicKey)
  })
}

DevicesManager.prototype._updateStatus = function (topic, publicKey, data) {
  if (topic === 'self.status.online') {
    this._devices[data].online = true
    this._sync(data)
  } else if (topic === 'self.status.offline') {
    this._devices[data].online = false
  }
}

DevicesManager.prototype._sync = function (publicKey) {
  // TODO: Sync PouchDB database with remote publicKey
}

module.exports = DevicesManager
