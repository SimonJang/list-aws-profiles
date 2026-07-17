'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const readline = require('readline');

const pairs = [];
const readers = new Map();

const createPair = destroyError => {
	const input = new EventEmitter();
	const reader = new EventEmitter();
	input.destroyCount = 0;
	input.destroy = function() {
		this.destroyCount++;
		if (destroyError) {
			this.emit('error', destroyError);
		}
		this.emit('close');
	};
	reader.close = function() {
		this.emit('close');
	};
	readers.set(input, reader);
	pairs.push({input, reader});
	return {input, reader};
};

fs.createReadStream = function() {
	return pairs.shift().input;
};
readline.createInterface = function(input) {
	const reader = readers.get(input);
	if (reader) {
		return reader;
	}

	throw new Error('missing reader pair');
};

const libraryPath = require.resolve('../lib');
delete require.cache[libraryPath];
const listAwsProfiles = require('../lib').default;
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

const run = async () => {
	const success = createPair();
	let resolved = false;
	const successResult = listAwsProfiles().then(value => {
		resolved = true;
		return value;
	});
	success.reader.emit('line', '[profile before-close]');
	success.reader.emit('close');
	await nextTurn();
	assert.equal(resolved, false);
	success.input.emit('close');
	assert.deepEqual(await successResult, ['before-close']);

	const premature = createPair();
	const prematureResult = listAwsProfiles();
	premature.input.emit('close');
	await assert.rejects(prematureResult, /closed before reading completed/i);

	const destroyError = new Error('destroy-time input error');
	const readerError = new Error('reader failed');
	const failed = createPair(destroyError);
	const failedResult = listAwsProfiles();
	failed.reader.emit('line', '[profile ignored-after-error]');
	failed.reader.emit('error', readerError);
	failed.reader.emit('line', '[profile should-not-be-seen]');
	await assert.rejects(failedResult, error => error === readerError);
	assert.equal(failed.input.destroyCount, 1);
	assert.equal(failed.input.listenerCount('error'), 0);
	assert.equal(failed.input.listenerCount('close'), 0);
	assert.equal(failed.reader.listenerCount('line'), 0);
	assert.equal(failed.reader.listenerCount('close'), 0);
	assert.equal(failed.reader.listenerCount('error'), 1);
};

run().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
