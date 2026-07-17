'use strict';

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const listAwsProfiles = require('../lib').default;

const assertProcessFixture = filename => {
	const result = spawnSync(process.execPath, [path.join(__dirname, filename)], {
		encoding: 'utf8'
	});

	assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'));
};

const withConfigPath = async (configPath, operation) => {
	const original = process.env.AWS_CONFIG_FILE;
	process.env.AWS_CONFIG_FILE = configPath;

	try {
		return await operation();
	} finally {
		if (original === undefined) {
			delete process.env.AWS_CONFIG_FILE;
		} else {
			process.env.AWS_CONFIG_FILE = original;
		}
	}
};

const withConfig = async (contents, operation) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'list-aws-profiles-'));
	const configPath = path.join(directory, 'config');
	fs.writeFileSync(configPath, contents);

	try {
		return await withConfigPath(configPath, operation);
	} finally {
		fs.rmSync(directory, {recursive: true, force: true});
	}
};

test('rejects with the established error when the config file is missing', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'list-aws-profiles-'));

	try {
		await withConfigPath(path.join(directory, 'missing'), async () => {
			await assert.rejects(listAwsProfiles(), {
				message: 'No local AWS configuration found'
			});
		});
	} finally {
		fs.rmSync(directory, {recursive: true, force: true});
	}
});

test('lists default and exact named profile sections in file order', async () => {
	await withConfig([
		'# shared AWS configuration',
		'[default]',
		'region = eu-west-1',
		'[profile team_dev]',
		'[profile ANALYTICS_2]',
		'[services local]',
		'[sso-session corporate]',
		'[profile test-01]',
		'[profile team_dev]',
		''
	].join('\r\n'), async () => {
		assert.deepEqual(await listAwsProfiles(), [
			'default',
			'team_dev',
			'ANALYTICS_2',
			'test-01'
		]);
	});
});

test('falls back to the config file in the current home directory', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'list-aws-profiles-home-'));
	const awsDirectory = path.join(directory, '.aws');
	const originalConfig = process.env.AWS_CONFIG_FILE;
	const originalHome = process.env.HOME;
	fs.mkdirSync(awsDirectory);
	fs.writeFileSync(path.join(awsDirectory, 'config'), '[profile from-home]\n');
	delete process.env.AWS_CONFIG_FILE;
	process.env.HOME = directory;

	try {
		assert.deepEqual(await listAwsProfiles(), ['from-home']);
	} finally {
		if (originalConfig === undefined) {
			delete process.env.AWS_CONFIG_FILE;
		} else {
			process.env.AWS_CONFIG_FILE = originalConfig;
		}

		if (originalHome === undefined) {
			delete process.env.HOME;
		} else {
			process.env.HOME = originalHome;
		}

		fs.rmSync(directory, {recursive: true, force: true});
	}
});

test('ignores settings and non-profile sections', async () => {
	await withConfig([
		'region = eu-west-1',
		'[s3]',
		'max_concurrent_requests = 10',
		'[services local-services]',
		'[sso-session company]',
		'[profile ]',
		'[profile bad.name]',
		'[profile Operations Team]',
		'[profile bad#name]',
		'[profile café]',
		'[profile extra[bracket]',
		'[profile-without-space]',
		''
	].join('\n'), async () => {
		assert.deepEqual(await listAwsProfiles(), []);
	});
});

test('returns an empty list for an empty config file', async () => {
	await withConfig('', async () => {
		assert.deepEqual(await listAwsProfiles(), []);
	});
});

test('rejects read failures instead of resolving or crashing the process', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'list-aws-profiles-'));

	try {
		await withConfigPath(directory, async () => {
			await assert.rejects(listAwsProfiles(), error => error && error.code === 'EISDIR');
		});
	} finally {
		fs.rmSync(directory, {recursive: true, force: true});
	}
});

test('waits for successful input close and tears down every failure path', () => {
	assertProcessFixture('adapter-lifecycle.js');
});

test('rejects a delayed close failure after readline reaches EOF', () => {
	assertProcessFixture('delayed-close-error.js');
});
