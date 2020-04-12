const path = jest.genMockFromModule('path') as {join: () => string};

function join(): string {
	return `${__dirname}/config`;
}

path.join = join;

module.exports = path;
