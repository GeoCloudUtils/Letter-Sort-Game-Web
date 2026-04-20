import { useEffect, useMemo, useState } from "react";

type Tube = string[];
type View = "menu" | "levels" | "settings" | "game";
type ReadDirection = "bottom-up" | "top-down";
type ThemeMode = "night" | "light";

type Settings = {
  sound: boolean;
  soundFx: boolean;
  vibration: boolean;
  showTargets: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  theme: ThemeMode;
  readDirection: ReadDirection;
};

type ProgressData = {
  unlockedLevel: number;
  completed: Record<number, { bestMoves: number | null }>;
  currentLevel: number;
};

type LevelDef = {
  id: number;
  capacity: number;
  words: string[];
  seed: number;
  scrambleMoves: number;
  par: number;
  title: string;
};

type InProgressData = {
  levelId: number;
  tubes: Tube[];
  history: Tube[][];
  moveCount: number;
  startedAt: number;
};

type AnimatingMove = {
  tubeIndex: number;
  letter: string;
};

const STORAGE_SETTINGS = "word-sort-settings-v2";
const STORAGE_PROGRESS = "word-sort-progress-v2";
const STORAGE_IN_PROGRESS = "word-sort-in-progress-v3";
const TOTAL_LEVELS = 100;
const EMPTY_TUBES = 2;

const DEFAULT_SETTINGS: Settings = {
  sound: true,
  soundFx: true,
  vibration: true,
  showTargets: true,
  reducedMotion: false,
  largeText: false,
  theme: "night",
  readDirection: "bottom-up",
};

const DEFAULT_PROGRESS: ProgressData = {
  unlockedLevel: 1,
  completed: {},
  currentLevel: 1,
};

const WORD_BANK: Record<number, string[]> = {
  3: [
    "ANT", "ARM", "BAG", "BAT", "BAY", "BED", "BEE", "BOX", "BUS", "CAP",
    "CAR", "CAT", "COW", "CUP", "DAY", "DOG", "DOT", "EAR", "EGG", "EYE",
    "FAN", "FIG", "FIN", "FOX", "GEM", "HAT", "HEN", "ICE", "INK", "JAM",
    "JAR", "JET", "KEY", "KID", "LEG", "LOG", "MAP", "MUG", "NET", "NUT",
    "OWL", "PAN", "PEN", "PIG", "PIN", "POT", "RAT", "RUG", "SEA", "SEW",
    "SKY", "SUN", "TAG", "TEN", "TIN", "TOY", "VAN", "WEB", "WIN", "ZIP",
    "BOW", "CAN", "COP", "COT", "DIG", "ELK", "FOG", "GAP", "HOP", "JOY",
    "LID", "MOP", "NAP", "OAK", "PEA", "ROD", "RUN", "SAD", "TOP", "YAK"
  ],
  4: [
    "BOOK", "BOOT", "BIRD", "BEAR", "BELL", "BLUE", "BOAT", "BARN", "CAKE", "CAMP",
    "CARD", "CART", "CORN", "CAVE", "COAT", "COIN", "COLD", "DEER", "DOOR", "DUCK",
    "DUST", "FARM", "FISH", "FIRE", "FORK", "FROG", "GAME", "GATE", "GOLD", "GRAB",
    "HAND", "HARP", "HEAT", "HILL", "HOME", "JUMP", "KING", "KITE", "LAMP", "LAKE",
    "LEAF", "LION", "LOCK", "MAIL", "MARK", "MILK", "MINT", "MOON", "MOSS", "NEST",
    "NOTE", "PARK", "PATH", "PLAY", "PINK", "POND", "RAIN", "RING", "ROAD", "ROCK",
    "ROSE", "SALT", "SAND", "SEED", "SHIP", "SHOP", "SILK", "SNOW", "SOAP", "STAR",
    "SWAN", "TEAM", "TENT", "TREE", "WALL", "WAVE", "WIND", "WOLF", "WOOD", "YARD",
    "MASK", "VASE", "DRUM", "LILY", "FLAG", "WIRE", "PINE", "MATH", "FOOT", "DARK"
  ],
  5: [
    "APPLE", "BEACH", "BRAIN", "BREAD", "BRICK", "BRUSH", "CANDY", "CHAIR", "CHESS", "CLOUD",
    "COAST", "CORAL", "CROWN", "DANCE", "DREAM", "DRINK", "EARTH", "EAGLE", "FIELD", "FLAME",
    "FLOOD", "FLOUR", "FRAME", "FRUIT", "GLASS", "GRAPE", "GRASS", "GREEN", "HEART", "HONEY",
    "HORSE", "HOUSE", "JUICE", "KNIFE", "LAUGH", "LEMON", "LIGHT", "MAGIC", "MANGO", "MOUSE",
    "MUSIC", "OCEAN", "OLIVE", "ONION", "PANDA", "PEACH", "PEARL", "PHONE", "PIZZA", "PLANE",
    "PLANT", "PLATE", "QUEEN", "RIVER", "ROBOT", "SALAD", "SHEEP", "SHINE", "SHIRT", "SMILE",
    "SNAKE", "SPACE", "SPOON", "SPORT", "STONE", "STORM", "STORY", "SUGAR", "SWEET", "TABLE",
    "TIGER", "TOAST", "TRAIN", "TRUCK", "WATER", "WHALE", "WHEAT", "WORLD", "ZEBRA", "SHELL"
  ],
  6: [
    "ANCHOR", "ANIMAL", "AUTUMN", "BAKERY", "BANANA", "BASKET", "BOTTLE", "BRIDGE", "BUTTON", "CANDLE",
    "CANYON", "CARROT", "CASTLE", "CEREAL", "CHERRY", "CIRCLE", "COOKIE", "CORNER", "COTTON", "DRAGON",
    "FAMILY", "FARMER", "FLOWER", "FOREST", "FRIEND", "GARDEN", "GOLDEN", "GUITAR", "ISLAND", "JUNGLE",
    "KITTEN", "MARKET", "MEADOW", "MEMORY", "MONKEY", "ORANGE", "POCKET", "PLANET", "POETRY", "POTATO",
    "PUZZLE", "RABBIT", "ROCKET", "SCHOOL", "SILVER", "SPIRIT", "SPRING", "STREAM", "SUMMER", "THRONE",
    "TOMATO", "TUNNEL", "VELVET", "VISION", "WINTER", "BUTTER", "CHEESE", "FATHER", "MOTHER", "BREEZE",
    "BRIGHT", "BROKEN", "CAMPER", "DINNER", "FINGER", "GALAXY", "HAMMER", "KETTLE", "LETTER", "MELODY",
    "MIRROR", "PIRATE", "SHADOW", "SILENT", "SPIDER", "SPONGE", "MARBLE", "WALNUT", "GENTLE", "POWDER"
  ]
};

const PALETTES = [
  ["from-pink-500 to-rose-400", "from-fuchsia-500 to-purple-500", "from-sky-500 to-cyan-400", "from-emerald-500 to-teal-400", "from-amber-400 to-orange-400", "from-indigo-500 to-violet-500", "from-red-500 to-pink-500", "from-lime-500 to-green-400"],
  ["from-cyan-500 to-blue-500", "from-violet-500 to-fuchsia-500", "from-orange-400 to-red-500", "from-emerald-400 to-green-500", "from-yellow-400 to-amber-500", "from-blue-500 to-indigo-500", "from-rose-500 to-pink-500", "from-teal-500 to-cyan-500"],
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickUniqueWords(length: number, count: number, seed: number) {
  const rng = mulberry32(seed);
  const bank = [...WORD_BANK[length]];
  const chosen: string[] = [];
  while (bank.length > 0 && chosen.length < count) {
    const index = Math.floor(rng() * bank.length);
    const [word] = bank.splice(index, 1);
    chosen.push(word);
  }
  return chosen;
}

function getWordCount(id: number) {
  if (id <= 15) return 2;
  if (id <= 35) return 3;
  if (id <= 60) return 4;
  if (id <= 80) return 5;
  return 6;
}

function getCapacity() {
  return 4;
}

function estimatePar(wordCount: number, capacity: number, scrambleMoves: number) {
  const base = Math.ceil(scrambleMoves * 0.72);
  const structure = Math.ceil(wordCount * 1.35) + Math.ceil(capacity * 0.85);
  return Math.max(base, structure);
}

function makeLevel(index: number): LevelDef {
  const id = index + 1;
  const capacity = getCapacity();
  const wordCount = getWordCount(id);
  const seed = 1000 + id * 97;
  const words = pickUniqueWords(capacity, wordCount, seed + 17);
  const scrambleMoves = 18 + id * 2 + (wordCount - 2) * 4 + (capacity - 4) * 5;
  const par = estimatePar(wordCount, capacity, scrambleMoves);
  return { id, capacity, words, seed, scrambleMoves, par, title: `Level ${id}` };
}

const LEVELS: LevelDef[] = Array.from({ length: TOTAL_LEVELS }, (_, i) => makeLevel(i));

function saveJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function deepCopyTubes(tubes: Tube[]) {
  return tubes.map((tube) => [...tube]);
}

function createSolvedTubes(level: LevelDef, direction: ReadDirection): Tube[] {
  const solved = level.words.map((word) => {
    const letters = word.split("");
    return direction === "bottom-up" ? letters : [...letters].reverse();
  });
  return [...solved, ...Array.from({ length: EMPTY_TUBES }, () => [])];
}

function scrambleLevel(level: LevelDef, direction: ReadDirection): Tube[] {
  const rng = mulberry32(level.seed);
  let tubes = createSolvedTubes(level, direction);
  const reference = createSolvedTubes(level, direction);

  for (let step = 0; step < level.scrambleMoves; step++) {
    const possibleMoves: Array<[number, number]> = [];
    for (let from = 0; from < tubes.length; from++) {
      if (tubes[from].length === 0) continue;
      for (let to = 0; to < tubes.length; to++) {
        if (from === to) continue;
        if (tubes[to].length >= level.capacity) continue;
        if (tubes[from].length === 1 && tubes[to].length === 0) continue;
        possibleMoves.push([from, to]);
      }
    }
    if (possibleMoves.length === 0) break;
    const [from, to] = possibleMoves[Math.floor(rng() * possibleMoves.length)];
    const moving = tubes[from][tubes[from].length - 1];
    tubes = tubes.map((tube, idx) => {
      if (idx === from) return tube.slice(0, -1);
      if (idx === to) return [...tube, moving];
      return [...tube];
    });
  }

  const mixed = tubes.some((tube, index) => tube.join("") !== reference[index].join(""));
  return mixed ? tubes : scrambleLevel({ ...level, seed: level.seed + 1 }, direction);
}

function getTubeWord(tube: Tube, direction: ReadDirection) {
  return direction === "bottom-up" ? tube.join("") : [...tube].reverse().join("");
}

function isTubeSolved(tube: Tube, level: LevelDef, direction: ReadDirection) {
  if (tube.length === 0) return false;
  return level.words.includes(getTubeWord(tube, direction));
}

function isLevelSolved(tubes: Tube[], level: LevelDef, direction: ReadDirection) {
  const nonEmpty = tubes.filter((tube) => tube.length > 0);
  if (nonEmpty.length !== level.words.length) return false;
  const builtWords = nonEmpty.map((tube) => getTubeWord(tube, direction)).sort();
  const targetWords = [...level.words].sort();
  return JSON.stringify(builtWords) === JSON.stringify(targetWords);
}

function getStars(moves: number, par: number) {
  if (moves <= par) return 3;
  if (moves <= par + 8) return 2;
  return 1;
}

function playSfx(type: "move" | "win", enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const tone = (frequency: number, start: number, duration: number, gainValue: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };
    if (type === "move") {
      tone(460, now, 0.07, 0.018);
      tone(630, now + 0.045, 0.08, 0.015);
    } else {
      tone(520, now, 0.10, 0.03);
      tone(680, now + 0.09, 0.12, 0.028);
      tone(880, now + 0.19, 0.16, 0.026);
    }
  } catch {}
}

function vibrate(pattern: number | number[], enabled: boolean) {
  if (!enabled || !("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
}

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60).toString().padStart(2, "0");
  const sec = (total % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function TubeBall({
  letter,
  largeText,
  selected,
  palette,
  dense,
}: {
  letter: string;
  largeText: boolean;
  selected: boolean;
  palette: string;
  dense: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-white/60 bg-gradient-to-br ${palette} text-white shadow-lg ${dense ? "h-9 w-9 text-base min-[380px]:h-10 min-[380px]:w-10 sm:h-11 sm:w-11" : `h-11 w-11 sm:h-12 sm:w-12 ${largeText ? "text-xl" : "text-lg"}`} ${dense && largeText ? "sm:text-lg" : ""} font-black tracking-wide transition-all duration-200 ${selected ? "scale-110 ring-4 ring-yellow-300/80" : "hover:scale-105"}`}
    >
      <span className="drop-shadow-sm">{letter}</span>
    </div>
  );
}

function TubeView({
  tube,
  index,
  capacity,
  onClick,
  selected,
  solved,
  largeText,
  bounce,
  paletteMap,
  denseLayout,
  isNight,
}: {
  tube: Tube;
  index: number;
  capacity: number;
  onClick: () => void;
  selected: boolean;
  solved: boolean;
  largeText: boolean;
  bounce?: boolean;
  paletteMap: Record<string, string>;
  denseLayout: boolean;
  isNight: boolean;
}) {
  const slots = Array.from({ length: capacity }, (_, i) => tube[i] ?? null);
  const topIndex = tube.length - 1;
  const tubeClasses = denseLayout
    ? "h-[208px] w-[58px] rounded-[24px] px-1 pb-2.5 pt-4 min-[380px]:h-[222px] min-[380px]:w-[62px] sm:h-[280px] sm:w-[76px] sm:rounded-[28px] sm:px-1.5 sm:pb-3 sm:pt-5"
    : "h-[240px] w-[68px] rounded-[30px] px-1.5 pb-3 pt-5 sm:h-[292px] sm:w-[82px]";
  const slotClasses = denseLayout ? "h-9 w-9 min-[380px]:h-10 min-[380px]:w-10 sm:h-11 sm:w-11" : "h-11 w-11 sm:h-12 sm:w-12";
  const stackGapClasses = denseLayout ? "gap-1 min-[380px]:gap-1.5 sm:gap-2" : "gap-1.5 sm:gap-2";

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col-reverse items-center border-2 transition-all duration-300 ${tubeClasses} ${bounce ? "animate-[tubeBounce_0.24s_ease-in-out]" : ""} ${selected ? "border-yellow-300 bg-yellow-200/15 shadow-[0_0_24px_rgba(253,224,71,0.45)]" : isNight ? "border-white/25 bg-white/10 hover:bg-white/15" : "border-slate-300 bg-white/70 hover:bg-white/90"} ${solved ? "outline outline-2 outline-emerald-400" : ""}`}
      aria-label={`Tube ${index + 1}`}
    >
      <div className={`absolute inset-x-3 bottom-1.5 h-1.5 rounded-full ${isNight ? "bg-white/70" : "bg-slate-400"}`} />
      <div className={`flex h-full flex-col-reverse items-center justify-start ${stackGapClasses}`}>
        {slots.map((letter, i) => (
          <div key={`${index}-${i}`} className={`flex items-center justify-center ${slotClasses}`}>
            {letter ? (
              <TubeBall
                letter={letter}
                largeText={largeText}
                selected={selected && i === topIndex}
                palette={paletteMap[letter] ?? "from-slate-500 to-slate-400"}
                dense={denseLayout}
              />
            ) : null}
          </div>
        ))}
      </div>
      {solved && (
        <div className="absolute -top-2 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md sm:text-xs">
          Solved
        </div>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  isNight,
}: {
  label: string;
  value: string | number | React.ReactNode;
  isNight: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${isNight ? "border-white/10 bg-white/8" : "border-slate-200 bg-white/90"}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-black ${isNight ? "text-white" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function StarRow({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 drop-shadow-sm">
      {"★".repeat(count)}
      <span className="text-slate-400">{"★".repeat(3 - count)}</span>
    </span>
  );
}

export default function WordSortPuzzleModern() {
  const [settings, setSettings] = useState<Settings>(() => loadJSON(STORAGE_SETTINGS, DEFAULT_SETTINGS));
  const [progress, setProgress] = useState<ProgressData>(() => loadJSON(STORAGE_PROGRESS, DEFAULT_PROGRESS));
  const [view, setView] = useState<View>("menu");
  const [levelId, setLevelId] = useState<number>(1);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [history, setHistory] = useState<Tube[][]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("Welcome to Word Sort Puzzle.");
  const [animatingMove, setAnimatingMove] = useState<AnimatingMove | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [transitionPulse, setTransitionPulse] = useState(0);

  const level = LEVELS[levelId - 1];
  const completedCount = useMemo(() => Object.keys(progress.completed).length, [progress.completed]);
  const solved = useMemo(() => (level ? isLevelSolved(tubes, level, settings.readDirection) : false), [tubes, level, settings.readDirection]);
  const isNight = settings.theme === "night";
  const tubeCount = level ? level.words.length + EMPTY_TUBES : 0;
  const denseBoard = !!level && (tubeCount >= 6 || level.capacity >= 6);
  const boardColumnsClass = !level
    ? ""
    : tubeCount <= 4
      ? "grid-cols-4"
      : tubeCount <= 6
        ? "grid-cols-3 min-[380px]:grid-cols-4 sm:grid-cols-6"
        : "grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7";
  const boardGapClass = denseBoard ? "gap-2 min-[380px]:gap-2.5 sm:gap-3" : "gap-3 sm:gap-4";
  const boardMaxWidthClass = denseBoard ? "max-w-[21.5rem] sm:max-w-[24rem] md:max-w-[29rem] lg:max-w-[42rem]" : "max-w-[22rem] sm:max-w-[38rem] lg:max-w-[44rem]";

  const paletteMap = useMemo(() => {
    if (!level) return {} as Record<string, string>;
    const letters = Array.from(new Set(level.words.join("").split("")));
    const paletteSet = PALETTES[level.id % PALETTES.length];
    const map: Record<string, string> = {};
    letters.forEach((letter, index) => {
      map[letter] = paletteSet[index % paletteSet.length];
    });
    return map;
  }, [level]);

  useEffect(() => { saveJSON(STORAGE_SETTINGS, settings); }, [settings]);
  useEffect(() => { saveJSON(STORAGE_PROGRESS, progress); }, [progress]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!level || tubes.length === 0) return;
    const inProgress: InProgressData = { levelId, tubes, history, moveCount, startedAt };
    saveJSON(STORAGE_IN_PROGRESS, inProgress);
  }, [levelId, tubes, history, moveCount, startedAt, level]);

  useEffect(() => {
    if (!solved || !level || showWinModal) return;
    playSfx("win", settings.sound && settings.soundFx);
    vibrate([90, 40, 130], settings.vibration);
    const previousBest = progress.completed[level.id]?.bestMoves ?? null;
    const bestMoves = previousBest === null ? moveCount : Math.min(previousBest, moveCount);
    setProgress((prev) => ({
      ...prev,
      unlockedLevel: Math.max(prev.unlockedLevel, clamp(level.id + 1, 1, TOTAL_LEVELS)),
      currentLevel: clamp(level.id + 1, 1, TOTAL_LEVELS),
      completed: { ...prev.completed, [level.id]: { bestMoves } },
    }));
    setMessage(`Level complete! You used ${moveCount} moves and earned ${getStars(moveCount, level.par)} stars.`);
    setShowWinModal(true);
    localStorage.removeItem(STORAGE_IN_PROGRESS);
  }, [solved, level, moveCount, progress.completed, settings.sound, settings.soundFx, settings.vibration, showWinModal]);

  function switchView(next: View) {
    setTransitionPulse((prev) => prev + 1);
    setView(next);
  }

  function startLevel(targetLevelId: number, restore?: InProgressData) {
    const chosenLevel = LEVELS[targetLevelId - 1];
    if (!chosenLevel) return;
    setLevelId(targetLevelId);
    setProgress((prev) => ({ ...prev, currentLevel: targetLevelId }));
    setTubes(restore ? deepCopyTubes(restore.tubes) : scrambleLevel(chosenLevel, settings.readDirection));
    setHistory(restore ? restore.history.map((h) => deepCopyTubes(h)) : []);
    setMoveCount(restore ? restore.moveCount : 0);
    setStartedAt(restore ? restore.startedAt : Date.now());
    setSelectedTube(null);
    setAnimatingMove(null);
    setShowWinModal(false);
    setMessage(`Level ${targetLevelId} started. Build all words.`);
    switchView("game");
  }

  function continueGame() {
    const inProgress = loadJSON<InProgressData | null>(STORAGE_IN_PROGRESS, null);
    if (inProgress && inProgress.levelId) {
      const restoreLevel = LEVELS[inProgress.levelId - 1];
      const validRestore =
        !!restoreLevel &&
        inProgress.tubes.length === restoreLevel.words.length + EMPTY_TUBES &&
        inProgress.tubes.every((tube) => tube.length <= restoreLevel.capacity) &&
        restoreLevel.words.every((word) => word.length === restoreLevel.capacity);

      if (validRestore) {
        startLevel(inProgress.levelId, inProgress);
        return;
      }
    }

    startLevel(progress.currentLevel || 1);
  }

  function newGame() { startLevel(1); }
  function restartLevel() { if (level) startLevel(level.id); }
  function nextLevel() {
    const next = clamp(levelId + 1, 1, progress.unlockedLevel);
    if (next !== levelId) startLevel(next);
  }
  function previousLevel() {
    const prev = clamp(levelId - 1, 1, TOTAL_LEVELS);
    if (prev <= progress.unlockedLevel) startLevel(prev);
  }

  function undoMove() {
    if (history.length === 0 || solved || animatingMove) return;
    const previous = history[history.length - 1];
    setTubes(deepCopyTubes(previous));
    setHistory((prev) => prev.slice(0, -1));
    setMoveCount((prev) => Math.max(0, prev - 1));
    setSelectedTube(null);
    setMessage("Last move undone.");
  }

  function handleTubeClick(index: number) {
    if (!level || solved || animatingMove || showWinModal) return;

    if (selectedTube === null) {
      if (tubes[index].length === 0) {
        setMessage("Choose a tube that has a top letter.");
        return;
      }
      setSelectedTube(index);
      setMessage(`You selected letter ${tubes[index][tubes[index].length - 1]}. Choose the destination tube.`);
      return;
    }

    if (selectedTube === index) {
      setSelectedTube(null);
      setMessage("Selection cleared.");
      return;
    }

    const fromIndex = selectedTube;
    const source = tubes[fromIndex];
    const destination = tubes[index];

    if (source.length === 0) {
      setSelectedTube(null);
      return;
    }

    if (destination.length >= level.capacity) {
      setSelectedTube(null);
      setMessage("Destination tube is full.");
      return;
    }

    const movingLetter = source[source.length - 1];
    const nextTubes = tubes.map((tube, tubeIndex) => {
      if (tubeIndex === fromIndex) return tube.slice(0, -1);
      if (tubeIndex === index) return [...tube, movingLetter];
      return [...tube];
    });

    setHistory((prev) => [...prev, deepCopyTubes(tubes)]);
    setTubes(nextTubes);
    setMoveCount((prev) => prev + 1);
    setSelectedTube(null);
    setAnimatingMove({ tubeIndex: index, letter: movingLetter });
    playSfx("move", settings.sound && settings.soundFx);
    vibrate(14, settings.vibration);

    if (settings.reducedMotion) setAnimatingMove(null);
    else window.setTimeout(() => setAnimatingMove(null), 240);

    const completedTube = isTubeSolved(nextTubes[index], level, settings.readDirection) || isTubeSolved(nextTubes[fromIndex], level, settings.readDirection);
    setMessage(completedTube ? "Great! You completed a word." : `You moved letter ${movingLetter}. Keep going.`);
  }

  function revealHint() {
    if (!level) return;
    const unfinished = level.words.filter((word) => !tubes.some((tube) => getTubeWord(tube, settings.readDirection) === word));
    const nextWord = unfinished[0] ?? level.words[0];
    setMessage(`Hint: try building ${nextWord}. Reading is ${settings.readDirection === "bottom-up" ? "bottom to top" : "top to bottom"}.`);
  }

  function resetAllProgress() {
    localStorage.removeItem(STORAGE_PROGRESS);
    localStorage.removeItem(STORAGE_IN_PROGRESS);
    setProgress(DEFAULT_PROGRESS);
    setShowWinModal(false);
    switchView("menu");
    setMessage("Progress reset.");
  }

  const themeClasses = isNight
    ? "bg-[radial-gradient(circle_at_top,_#1b1434_0%,_#0e1126_42%,_#070914_100%)] text-white"
    : "bg-[radial-gradient(circle_at_top,_#fef3ff_0%,_#eef5ff_42%,_#dde8ff_100%)] text-slate-900";
  const cardClasses = isNight ? "border-white/10 bg-white/8 shadow-[0_18px_60px_rgba(0,0,0,0.35)]" : "border-white/60 bg-white/85 shadow-[0_18px_60px_rgba(109,140,190,0.18)]";
  const textSoft = isNight ? "text-slate-300" : "text-slate-600";
  const chip = isNight ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-900";
  const inputClasses = isNight ? "rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-white" : "rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-900";
  const glass = isNight ? "bg-white/6 backdrop-blur-xl" : "bg-white/70 backdrop-blur-xl";

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${themeClasses} p-3 sm:p-4 md:p-6`}>
      <style>{`
        @keyframes tubeBounce {
          0% { transform: scale(1); }
          35% { transform: scale(1.09); }
          65% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(18px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.88); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <header className={`mb-4 rounded-[30px] border p-4 sm:p-5 ${cardClasses} ${glass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-md">
                Modern Word Puzzle
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Word Sort Puzzle</h1>
              <p className={`mt-2 max-w-2xl text-sm sm:text-base ${textSoft}`}>
                Colorful letters, smooth transitions, stronger mobile layout, polished buttons, richer sounds, and a solid finish modal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["Menu", "menu"],
                ["Levels", "levels"],
                ["Settings", "settings"],
              ].map(([label, target]) => (
                <button
                  key={label}
                  onClick={() => switchView(target as View)}
                  className={`rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${chip}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div key={`${view}-${transitionPulse}`} className="animate-[fadeSlideIn_0.32s_ease-out]">
          {view === "menu" && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <section className={`rounded-[34px] border p-5 sm:p-7 ${cardClasses} ${glass}`}>
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-md">
                    Fresh design
                  </div>
                  <h2 className="text-3xl font-black leading-tight sm:text-5xl">Sort letters. Build words. Unlock new challenges.</h2>
                  <p className={`mt-4 text-sm leading-7 sm:text-base ${textSoft}`}>
                    Starts with 2 words in 4 total tubes, then grows progressively. The board is tuned to stay cleaner on mobile, with colorful bubbles and stronger visual feedback.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl" onClick={continueGame}>Continue</button>
                    <button className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl" onClick={newGame}>New Game</button>
                    <button className={`rounded-2xl border px-5 py-3 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 ${chip}`} onClick={() => switchView("levels")}>Select Level</button>
                  </div>
                </div>
              </section>

              <aside className="grid gap-4">
                <div className={`rounded-[30px] border p-5 ${cardClasses} ${glass}`}>
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Overall progress</div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Unlocked" value={progress.unlockedLevel} isNight={isNight} />
                    <StatCard label="Completed" value={`${completedCount}/${TOTAL_LEVELS}`} isNight={isNight} />
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      <span>Progress</span>
                      <span>{Math.round((completedCount / TOTAL_LEVELS) * 100)}%</span>
                    </div>
                    <div className={`h-3 overflow-hidden rounded-full ${isNight ? "bg-white/10" : "bg-slate-200"}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500" style={{ width: `${(completedCount / TOTAL_LEVELS) * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className={`rounded-[30px] border p-5 ${cardClasses} ${glass}`}>
                  <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">How it feels</div>
                  <div className={`space-y-2 text-sm leading-7 ${textSoft}`}>
                    <p>• Bright colored letter bubbles.</p>
                    <p>• Smooth screen transitions.</p>
                    <p>• Compact first levels on mobile.</p>
                    <p>• Solid finish modal with stars and stats.</p>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {view === "levels" && (
            <section className={`rounded-[34px] border p-4 sm:p-6 ${cardClasses} ${glass}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black sm:text-3xl">Level Select</h2>
                  <p className={`mt-1 text-sm ${textSoft}`}>100 predefined levels. Total tubes grow progressively while capacity rises up to 6.</p>
                </div>
                <div className={`rounded-2xl border px-4 py-2 text-sm font-bold ${chip}`}>Unlocked through level {progress.unlockedLevel}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
                {LEVELS.map((item) => {
                  const unlocked = item.id <= progress.unlockedLevel;
                  const best = progress.completed[item.id]?.bestMoves ?? null;
                  return (
                    <button
                      key={item.id}
                      disabled={!unlocked}
                      onClick={() => unlocked && startLevel(item.id)}
                      className={`rounded-2xl border p-3 text-left transition-all duration-200 ${unlocked ? "hover:-translate-y-0.5 hover:shadow-lg" : "cursor-not-allowed opacity-40"} ${item.id === progress.currentLevel ? "border-transparent bg-gradient-to-br from-emerald-500/25 to-cyan-500/20 ring-2 ring-emerald-400/60" : chip}`}
                    >
                      <div className="text-sm font-black">{item.id}</div>
                      <div className={`mt-1 text-[11px] ${textSoft}`}>{item.words.length} words • cap {item.capacity}</div>
                      <div className="mt-2 text-[11px]">{best !== null ? <StarRow count={getStars(best, item.par)} /> : "—"}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {view === "settings" && (
            <section className={`rounded-[34px] border p-4 sm:p-6 ${cardClasses} ${glass}`}>
              <div className="mb-4">
                <h2 className="text-2xl font-black sm:text-3xl">Settings</h2>
                <p className={`mt-1 text-sm ${textSoft}`}>Preferences are saved automatically.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-[28px] border p-4 ${chip}`}>
                  <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Gameplay</div>
                  <div className="space-y-3 text-sm">
                    {[
                      ["Show target words", "showTargets"],
                      ["Sound", "sound"],
                      ["Sound effects", "soundFx"],
                      ["Vibration", "vibration"],
                      ["Reduced motion", "reducedMotion"],
                      ["Larger text", "largeText"],
                    ].map(([label, key]) => (
                      <label key={key} className="flex items-center justify-between gap-3 rounded-2xl px-1 py-1">
                        <span>{label}</span>
                        <input type="checkbox" checked={(settings as any)[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked } as Settings)} />
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`rounded-[28px] border p-4 ${chip}`}>
                  <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Interface</div>
                  <div className="space-y-3 text-sm">
                    <label className="flex items-center justify-between gap-3">
                      <span>Theme</span>
                      <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as ThemeMode })} className={inputClasses}>
                        <option value="night">Night</option>
                        <option value="light">Light</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span>Word direction</span>
                      <select value={settings.readDirection} onChange={(e) => setSettings({ ...settings, readDirection: e.target.value as ReadDirection })} className={inputClasses}>
                        <option value="bottom-up">Bottom → Top</option>
                        <option value="top-down">Top → Bottom</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={resetAllProgress}>Reset Progress</button>
                    <button className={`rounded-2xl border px-4 py-3 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 ${chip}`} onClick={() => switchView("menu")}>Back to Menu</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === "game" && level && (
            <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <div className={`rounded-[34px] border p-3 sm:p-5 ${cardClasses} ${glass}`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">{level.title}</div>
                    <h2 className="mt-1 text-xl font-black leading-tight sm:text-3xl">{level.words.length} words • {level.words.length + EMPTY_TUBES} tubes • capacity {level.capacity}</h2>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:w-auto">
                    <div className={`rounded-2xl border px-3 py-2 text-sm font-bold ${chip}`}>Moves: {moveCount}</div>
                    <div className={`rounded-2xl border px-3 py-2 text-sm font-bold ${chip}`}>Time: {formatElapsed(now - startedAt)}</div>
                    <div className={`rounded-2xl border px-3 py-2 text-sm font-bold ${chip}`}>Par: {level.par}</div>
                  </div>
                </div>

                {settings.showTargets && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {level.words.map((word) => {
                      const done = tubes.some((tube) => getTubeWord(tube, settings.readDirection) === word);
                      return (
                        <span key={word} className={`rounded-full border px-3 py-1 text-xs font-black tracking-wide ${done ? "border-emerald-400 bg-emerald-500/20 text-emerald-500" : chip}`}>
                          {word}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className={`rounded-[30px] border p-3 sm:p-5 ${isNight ? "border-white/10 bg-black/15" : "border-slate-200 bg-white/65"}`}>
                  <div className={`mx-auto grid w-fit max-w-full place-content-center ${boardColumnsClass} ${boardGapClass} ${boardMaxWidthClass}`}>
                    {tubes.map((tube, index) => (
                      <TubeView
                        key={`${level.id}-${index}`}
                        tube={tube}
                        index={index}
                        capacity={level.capacity}
                        onClick={() => handleTubeClick(index)}
                        selected={selectedTube === index}
                        solved={isTubeSolved(tube, level, settings.readDirection)}
                        largeText={settings.largeText}
                        bounce={animatingMove?.tubeIndex === index}
                        paletteMap={paletteMap}
                        denseLayout={denseBoard}
                        isNight={isNight}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <aside className="grid gap-4">
                <div className={`rounded-[30px] border p-4 ${cardClasses} ${glass}`}>
                  <div className="mb-3 text-lg font-black">Controls</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={undoMove}>Undo</button>
                    <button className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={restartLevel}>Restart</button>
                    <button className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={revealHint}>Hint</button>
                    <button className={`rounded-2xl border px-4 py-3 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 ${chip}`} onClick={() => switchView("levels")}>Levels</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 ${chip}`} onClick={previousLevel} disabled={levelId <= 1}>◀ Prev</button>
                    <button className={`rounded-2xl border px-4 py-2.5 text-sm font-black transition-all duration-200 hover:-translate-y-0.5 ${chip}`} onClick={nextLevel} disabled={levelId >= progress.unlockedLevel}>Next ▶</button>
                  </div>
                </div>

                <div className={`rounded-[30px] border p-4 ${cardClasses} ${glass}`}>
                  <div className="mb-3 text-lg font-black">Status</div>
                  <div className={`rounded-[22px] border p-4 text-sm leading-7 ${chip}`}>{message}</div>
                  <div className={`mt-3 space-y-2 text-sm ${textSoft}`}>
                    <p>Direction: {settings.readDirection === "bottom-up" ? "bottom to top" : "top to bottom"}</p>
                    <p>Words: {level.words.length} • Total tubes: {level.words.length + EMPTY_TUBES}</p>
                    <p>Save system: automatic</p>
                  </div>
                </div>
              </aside>
            </section>
          )}
        </div>
      </div>

      {showWinModal && level && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4">
          <div className={`w-full max-w-md animate-[popIn_0.22s_ease-out] rounded-[34px] border p-6 ${isNight ? "border-white/10 bg-[#101629] text-white" : "border-slate-200 bg-white text-slate-900"} shadow-[0_24px_80px_rgba(0,0,0,0.35)]`}>
            <div className="text-center">
              <div className="inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white">Level Complete</div>
              <h3 className="mt-3 text-3xl font-black">Great job!</h3>
              <p className={`mt-2 text-sm ${isNight ? "text-slate-300" : "text-slate-600"}`}>You finished level {level.id} in {moveCount} moves.</p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard label="Moves" value={moveCount} isNight={isNight} />
              <StatCard label="Par" value={level.par} isNight={isNight} />
              <StatCard label="Stars" value={<StarRow count={getStars(moveCount, level.par)} />} isNight={isNight} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={() => startLevel(clamp(levelId + 1, 1, progress.unlockedLevel))}>Next Level</button>
              <button className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5" onClick={() => { setShowWinModal(false); switchView("levels"); }}>Choose Level</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
