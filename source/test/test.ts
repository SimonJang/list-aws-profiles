import * as fs from 'fs';
import * as path from 'path';
import test from 'ava';
import * as sinon from 'sinon';
import lib from '..';

const sandbox = sinon.createSandbox();
const fsStub = sandbox.stub(fs, 'existsSync');

test.before(() => {
	const pathStub = sandbox.stub(path, 'join');
	pathStub
		.withArgs(sinon.match.string, '.aws', 'config')
		.returns(`${__dirname}/config`);
});

test('should fail when no config files locally exists with AWS profiles', async t => {
	fsStub.withArgs(sinon.match.string).returns(false);

	await t.throwsAsync(lib(), 'No local AWS configuration found');
});

test('should return local AWS profiles', async t => {
	fsStub.withArgs(sinon.match.string).returns(true);

	const result = await lib();

	t.deepEqual(result, ['test', 'test-01']);
});
