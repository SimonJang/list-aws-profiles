import listAwsProfiles from '../lib';

const profiles: Promise<string[]> = listAwsProfiles();

void profiles;
