# list-aws-profiles

![CI](https://github.com/SimonJang/list-aws-profiles/workflows/CI/badge.svg) ![Format](https://github.com/SimonJang/list-aws-profiles/workflows/Format/badge.svg)

> Lists local AWS profiles

## Requirements

-   Have atleast one [local AWS profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

## Install

```
$ npm install list-aws-profiles
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

Asynchronous method that returns the local AWS profiles
