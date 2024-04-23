# Catalyst Javascript Libraries

This is the monorepo for the Javascript libraries in [Catalyst](https://www.catalystmonitor.com).

In order to not duplicate documentation, please find the most up-to-date documentation for our Javascript libraries [here](https://www.catalystmonitor.com/docs/category/javascripttypescript).

## Development

### Yarn

The monorepo uses [Yarn 4](https://yarnpkg.com) and [Yarn Workspaces](https://yarnpkg.com/features/workspaces). From the root directory, you can run the following Yarn scripts to run operations for every package.

`yarn build` - Build everything, ready to upload.
`yarn lint` - Runs ESLint for every package.
`yarn test` - Runs unit tests for every package.