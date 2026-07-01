import { describe, it, expect, vi } from "vitest";

// Need to reset env before import
const originalEnv = process.env.LOG_LEVEL;
delete process.env.LOG_LEVEL;

const { logger } = await import("./logger.js");

describe("logger", () => {
  afterAll(() => {
    if (originalEnv) process.env.LOG_LEVEL = originalEnv;
  });

  it("tiene los metodos debug, info, warn, error", () => {
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("info llama a console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("error llama a console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("test error");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
