import {homedir} from 'os';
import {join} from 'path';
import {existsSync, createReadStream} from 'fs';
import {createInterface} from 'readline';

export default async function(): Promise<string[]> {
	const awsConfigurationProfilesPath = join(homedir(), '.aws', 'config');
	const profiles: string[] = [];

	return new Promise((resolve, reject) => {
		if (!existsSync(awsConfigurationProfilesPath)) {
			reject(Error('No local AWS configuration found'));
		}

		const lineReader = createInterface(
			createReadStream(awsConfigurationProfilesPath)
		);

		lineReader.on('line', line => {
			const [profile] =
				line.match(/(?<=\[profile )([a-zA-Z0-9-]+)/) ??
				([] as string[]);

			if (profile) {
				profiles.push(profile);
			}
		});

		lineReader.on('close', () => resolve(profiles));
	});
}
