const fs = jest.requireActual('fs') as {
	existsSync: () => boolean;
};

function existsSync(): boolean {
	return true;
}

fs.existsSync = existsSync;

module.exports = fs;
