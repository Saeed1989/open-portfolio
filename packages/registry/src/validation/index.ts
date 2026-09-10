/**
 * The `@portfolio/registry/validation` entrypoint — for `api` and `admin`.
 *
 * Split from the `.` entrypoint so the public site never pulls validation
 * into its client bundle: `portfolio` reads descriptors and empty conditions
 * and nothing here.
 */

export * from './publish';
