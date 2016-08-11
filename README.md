# mm-services-devices

Device Manager for [MicroMinion platform](https://github.com/MicroMinion/mm-platform)

[![CircleCI](https://circleci.com/gh/MicroMinion/mm-services-devices.svg?style=svg)](https://circleci.com/gh/MicroMinion/mm-services-devices)

## Initialization

```js
var MicroMinionPlatform = require('mm-platform')
var DeviceManager = require('mm-services-devices')
var MemStore = require('kad-memstore')

var platform = new MicroMinionPlatform()

var devices = new DeviceManager({
  platform: platform,
  storage: new MemStore(),
  logger: platform._log
})
```

## Function calls

#### devices.addKey(publicKey, dontSave) 

Adds a third-party key that is trusted to database. dontSave is boolean to determine whether or not to save devices list to storage.

#### devices.createTenant(publicKey, secret)

Calls the tenant service on publicKey and provides secret in order to create a new tenant

#### devices.getDevices()

Returns an array with all trusted publicKeys

## Messaging API

### Data structures

The data structure maintained is an array of trusted public keys

### Published messages

#### tenant.create

See [Tenant Service README](https://github.com/MicroMinion/mm-services-tenant/blob/master/README.md)

#### devices.update

Published locally. Contains list of trusted devices.

### Subscribed messages

#### public.tenant.createReply

See [Tenant Service README](https://github.com/MicroMinion/mm-services-tenant/blob/master/README.md)


