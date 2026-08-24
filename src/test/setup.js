import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", { value: () => {}, writable: true });
Object.defineProperty(window, "confirm", { value: () => true, writable: true });
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: async () => {} },
  configurable: true,
});
