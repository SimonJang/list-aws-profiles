import listAWSProfiles from '..';

jest.mock('path');
jest.mock('fs');
jest.requireActual('readline');

describe('should list the profiles', () => {
	it('should read AWS profiles', async () => {
		const result = await listAWSProfiles();

		expect(result).toStrictEqual(['test', 'test-01']);
	});
});
