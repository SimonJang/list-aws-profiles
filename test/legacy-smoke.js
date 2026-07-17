'use strict';

var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var listAwsProfiles = require('../lib').default;
var directory = fs.mkdtempSync(path.join(os.tmpdir(), 'list-aws-profiles-'));
var configPath = path.join(directory, 'config');
var original = process.env.AWS_CONFIG_FILE;

fs.writeFileSync(configPath, '[default]\n[profile legacy-node-8]\n');
process.env.AWS_CONFIG_FILE = configPath;

listAwsProfiles()
	.then(function(profiles) {
		assert.deepEqual(profiles, ['default', 'legacy-node-8']);
	})
	.then(function() {
		fs.unlinkSync(configPath);
		fs.rmdirSync(directory);
		if (original === undefined) {
			delete process.env.AWS_CONFIG_FILE;
		} else {
			process.env.AWS_CONFIG_FILE = original;
		}
	}, function(error) {
		console.error(error);
		process.exitCode = 1;
	});
