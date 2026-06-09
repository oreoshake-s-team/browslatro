vi.unmock("./sounds");

const isMutedMock = vi.fn(() => false);
type PreferencesState = { muted: boolean; highVisibility: boolean };
type Subscriber = (state: PreferencesState, prev: PreferencesState) => void;
const subscribers = new Set<Subscriber>();

vi.mock("./preferences", () => ({
  isMuted: () => isMutedMock(),
  usePreferences: {
    subscribe: (cb: Subscriber) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  },
}));

function emitPrefsChange(
  state: PreferencesState,
  prev: PreferencesState,
): void {
  for (const cb of subscribers) cb(state, prev);
}

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
  subscribers.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  subscribers.clear();
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

describe("sample preloading", () => {
  test("no <audio> elements are constructed at module-load time when unmuted (deferred)", async () => {
    const audioCtor = vi.fn(function () {
      return { volume: 0, cloneNode: () => null };
    });
    vi.stubGlobal("Audio", audioCtor);
    vi.resetModules();
    await import("./sounds");
    expect(audioCtor).not.toHaveBeenCalled();
  });

  test("does not schedule a preload when muted at module load", async () => {
    isMutedMock.mockReturnValue(true);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    vi.resetModules();
    await import("./sounds");
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  test("preloads the three samples after unmuting", async () => {
    isMutedMock.mockReturnValue(true);
    const audioCtor = vi.fn(function () {
      return { volume: 0, cloneNode: () => null };
    });
    vi.stubGlobal("Audio", audioCtor);
    vi.resetModules();
    await import("./sounds");
    expect(audioCtor).not.toHaveBeenCalled();
    vi.useFakeTimers();
    emitPrefsChange(
      { muted: false, highVisibility: false },
      { muted: true, highVisibility: false },
    );
    vi.runAllTimers();
    expect(audioCtor).toHaveBeenCalledTimes(3);
  });
});
