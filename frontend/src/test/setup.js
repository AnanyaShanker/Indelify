import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement object URLs; components that preview uploaded
// files (e.g. EnvironmentTab) call these directly.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url'
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {}
}
