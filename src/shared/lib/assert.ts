export const assert: (
  condition: boolean,
  message: string,
) => asserts condition = (condition, message) => {
  if (condition) {
    return
  }

  throw new Error(`assertion failed: ${message}`)
}
