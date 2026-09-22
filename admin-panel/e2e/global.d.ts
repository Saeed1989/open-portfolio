/* The mock control surface the app exposes on window in a mock build. */
declare global {
  interface Window {
    __mocks?: {
      state: () => unknown;
      set: (next: { tenant?: string; fault?: string }) => unknown;
    };
  }
}
export {};
