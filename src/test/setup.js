import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

Object.defineProperty(window, "scrollTo", { value: () => {}, writable: true });
Object.defineProperty(window, "confirm", { value: () => true, writable: true });
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: async () => {} },
  configurable: true,
});
