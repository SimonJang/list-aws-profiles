import {homedir} from 'os';
import {join} from 'path';
import {createReadStream} from 'fs';
import {createInterface} from 'readline';

const absorbLateError = () => undefined;

function releaseLateInputError(this: ReturnType<typeof createReadStream>) {
	this.removeListener('error', absorbLateError);
	this.removeListener('close', releaseLateInputError);
}

export default function(): Promise<string[]> {
	const awsConfigurationProfilesPath =
		process.env.AWS_CONFIG_FILE || join(homedir(), '.aws', 'config');
	const profiles: string[] = [];
	const seenProfiles = new Set<string>();

	return new Promise((resolve, reject) => {
		const input = createReadStream(awsConfigurationProfilesPath);
		let lineReader: ReturnType<typeof createInterface> | undefined;
		let inputClosed = false;
		let readerCompleted = false;
		let terminal = false;

		const onLine = (line: string) => {
			if (terminal) {
				return;
			}

			const sectionMatch = line.trim().match(/^\[([^\]]+)\]$/);

			if (!sectionMatch) {
				return;
			}

			const section = sectionMatch[1].trim();
			const namedProfile = section.match(/^profile ([A-Za-z0-9_-]+)$/);
			const profile =
				section === 'default'
					? 'default'
					: namedProfile
						? namedProfile[1]
						: '';

			if (profile && !seenProfiles.has(profile)) {
				seenProfiles.add(profile);
				profiles.push(profile);
			}
		};

		const removeStatefulListeners = () => {
			input.removeListener('error', onInputError);
			input.removeListener('close', onInputClose);

			if (lineReader) {
				lineReader.removeListener('line', onLine);
				lineReader.removeListener('close', onReaderClose);
				lineReader.removeListener('error', onReaderError);
			}
		};

		const guardLateErrors = () => {
			if (lineReader) {
				lineReader.on('error', absorbLateError);
			}

			if (!inputClosed) {
				input.on('error', absorbLateError);
				input.once('close', releaseLateInputError);
			}
		};

		const maybeSucceed = () => {
			if (terminal || !readerCompleted || !inputClosed) {
				return;
			}

			terminal = true;
			removeStatefulListeners();
			lineReader = undefined;
			resolve(profiles);
		};

		const fail = (error: Error, mapMissingFile: boolean) => {
			if (terminal) {
				return;
			}

			terminal = true;
			removeStatefulListeners();
			guardLateErrors();

			if (lineReader) {
				lineReader.close();
			}

			input.destroy();
			lineReader = undefined;
			reject(
				mapMissingFile && (error as NodeJS.ErrnoException).code === 'ENOENT'
					? new Error('No local AWS configuration found')
					: error
			);
		};

		const onInputError = (error: Error) => fail(error, true);
		const onReaderError = (error: Error) => fail(error, false);
		const onReaderClose = () => {
			if (terminal) {
				return;
			}

			readerCompleted = true;
			if (lineReader) {
				lineReader.removeListener('line', onLine);
			}
			maybeSucceed();
		};
		const onInputClose = () => {
			if (terminal) {
				return;
			}

			inputClosed = true;
			if (!readerCompleted) {
				fail(new Error('AWS configuration closed before reading completed'), false);
				return;
			}

			maybeSucceed();
		};

		input.on('error', onInputError);
		input.once('close', onInputClose);

		try {
			lineReader = createInterface(input);
			lineReader.on('line', onLine);
			lineReader.once('close', onReaderClose);
			lineReader.on('error', onReaderError);
		} catch (error) {
			fail(error as Error, false);
		}
	});
}
