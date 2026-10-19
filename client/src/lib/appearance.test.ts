import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAura, initAura, setAura } from "./appearance";

const root = () => document.documentElement.dataset.aura;

describe("aura preference", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.aura;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is on without a stored choice or config", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("no config")));
    await initAura();
    expect(root()).toBe("on");
    expect(getAura()).toBe(true);
  });

  it("follows the server default when nothing is stored", async () => {
    vi.stubGlobal("fetch", async () => ({
      json: async () => ({ aura: "off" }),
    }));
    await initAura();
    expect(root()).toBe("off");
    expect(getAura()).toBe(false);
  });

  it("lets the stored choice win over the server default", async () => {
    vi.stubGlobal("fetch", async () => ({
      json: async () => ({ aura: "off" }),
    }));
    setAura(true);
    await initAura();
    expect(root()).toBe("on");
  });
});
