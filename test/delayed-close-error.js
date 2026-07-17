'use strict';

var assert = require('assert');
var fs = require('fs');
var Readable = require('stream').Readable;
var util = require('util');

var lateCloseError = new Error('late close failure');

function DelayedCloseReadable() {
	Readable.call(this);
	this.sent = false;
	this.once('end', function() {
		this.destroy();
	});
}

util.inherits(DelayedCloseReadable, Readable);

DelayedCloseReadable.prototype._read = function() {
	if (this.sent) {
		return;
	}

	this.sent = true;
	this.push('[profile parsed-before-close]\n');
	this.push(null);
};

DelayedCloseReadable.prototype._destroy = function(error, callback) {
	setImmediate(function() {
		verify(function() {
			assert.strictEqual(outcome, 'pending');
		});
		callback(lateCloseError);
	});
};

fs.createReadStream = function() {
	return new DelayedCloseReadable();
};

delete require.cache[require.resolve('../lib')];
var listAwsProfiles = require('../lib').default;
var mode = process.env.LIST_AWS_PROFILES_FIXTURE_MODE;
var outcome = 'pending';
var result = mode === 'fulfill'
	? Promise.resolve([])
	: mode === 'wrong-error'
		? Promise.reject(new Error('wrong close failure'))
		: listAwsProfiles();

function reportFailure(error) {
	process.exitCode = 1;
	console.error(error && error.stack ? error.stack : error);
}

function verify(assertion) {
	try {
		assertion();
	} catch (error) {
		reportFailure(error);
	}
}

result.then(
	function() {
		outcome = 'fulfilled';
		reportFailure(new Error('close failure resolved successfully'));
	},
	function(error) {
		outcome = 'rejected';
		verify(function() {
			assert.strictEqual(error, lateCloseError);
		});
	}
).catch(reportFailure);

process.on('beforeExit', function() {
	verify(function() {
		assert.strictEqual(outcome, 'rejected');
	});
});
