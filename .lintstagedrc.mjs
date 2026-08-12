export default {
	"*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc,css}": [
		"biome check --files-ignore-unknown=true --no-errors-on-unmatched",
	],
	"services/data-plane/**/*.go": () =>
		'sh -c "cd services/data-plane && go build ./... && golangci-lint run --new-from-rev=HEAD"',
};
