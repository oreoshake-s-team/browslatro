const isMutedMock = vi.fn(() => false);

vi.mock("./preferences", () => ({
  isMuted: () => isMutedMock(),
}));

const audioContextCtor = vi.fn();

function buildFakeContext() {
  return {
    currentTime: 0,
    destination: {},
    createOscillator: () => ({
      type: "",
      frequency: { value: 0 },
      connect() {
        return this;
      },
      start() {},
      stop() {},
    }),
    createGain: () => ({
      gain: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect() {
        return this;
      },
    }),
  };
}

beforeEach(() => {
  isMutedMock.mockReset();
  isMutedMock.mockReturnValue(false);
  audioContextCtor.mockReset();
  audioContextCtor.mockImplementation(buildFakeContext);
  vi.stubGlobal("AudioContext", audioContextCtor);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("play(\"gold\") synth", () => {
  test("constructs an AudioContext when invoked", async () => {
    const { play } = await import("./sounds");
    play("gold");
    expect(audioContextCtor).toHaveBeenCalledTimes(1);
  });

  test("does not construct an AudioContext when muted (negative)", async () => {
    isMutedMock.mockReturnValue(true);
    const { play } = await import("./sounds");
    play("gold");
    expect(audioContextCtor).not.toHaveBeenCalled();
  });
});

describe("play(\"pop\") sample path", () => {
  test("does not construct an AudioContext (pop is a sample, not a synth)", async () => {
    const { play } = await import("./sounds");
    play("pop");
    expect(audioContextCtor).not.toHaveBeenCalled();
  });
});
