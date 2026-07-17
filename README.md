# list-aws-profiles

![CI](https://github.com/SimonJang/list-aws-profiles/actions/workflows/ci.yml/badge.svg)

> Lists local AWS profiles

## Requirements

- Node.js 8 or later
- An AWS shared `config` file (it may contain zero profiles)

## Install

```sh
npm install list-aws-profiles
```

## Usage

```js
import listAwsProfiles from 'list-aws-profiles';

export async function listProfiles() {
	const profiles = await listAwsProfiles();

	console.log(profiles); // ["profile1", "profile2"]

	return profiles;
}
```

## API

### listAwsProfiles()

Returns a promise for the profile names in the AWS shared `config` file, in file order. The `default` profile and named `[profile name]` sections are included; named profiles follow AWS's letters, digits, hyphens, and underscores grammar. Settings, service sections, SSO-session sections, and malformed profile sections are ignored. Duplicate profile sections are returned once.

The file is read from `AWS_CONFIG_FILE` when that environment variable is set, otherwise from `~/.aws/config`. A missing file rejects with `No local AWS configuration found`; other read failures are forwarded unchanged. A valid file without profile sections resolves to an empty array.
