const numbersGrid = document.getElementById("numbers");
const generateButton = document.getElementById("generate");
const shareButton = document.getElementById("share");
const statusText = document.getElementById("status");
const modeToggle = document.querySelector(".mode-toggle");
const chartCanvas = document.getElementById("frequencyChart");
const confettiLayer = document.querySelector(".confetti-layer");

const SET_COUNT = 5;
const COUNT = 6;
const MAX_NUMBER = 45;
const TOTAL_DRAWS = 1212;
const FREQUENCIES = [
  0, 168, 151, 171, 160, 152, 163, 168, 155, 133, 157, 163, 178, 174, 169, 162,
  168, 168, 173, 165, 166, 165, 140, 146, 163, 148, 164, 176, 152, 153, 155,
  165, 141, 173, 181, 161, 161, 171, 164, 165, 172, 147, 153, 162, 160, 170,
];

let currentSets = [];

const getNumberColor = (value) => {
  const hue = (value * 137.508) % 360;
  const isDark = document.documentElement.dataset.theme === "dark";
  const saturation = isDark ? 72 : 68;
  const lightness = isDark ? 58 : 52;
  const highlight = Math.min(92, lightness + 20);
  const base = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const glow = `hsl(${hue}, ${saturation}%, ${highlight}%)`;
  const text = lightness > 55 ? "#2b1c12" : "#f3ede6";
  return { base, glow, text };
};

const applyBallStyle = (element, value) => {
  const { base, glow, text } = getNumberColor(value);
  element.style.background = `radial-gradient(circle at 30% 30%, ${glow}, ${base})`;
  element.style.color = text;
};

const buildBall = (value) => {
  const ball = document.createElement("div");
  ball.className = "ball";
  ball.textContent = value;
  applyBallStyle(ball, value);
  return ball;
};

const pickWeightedNumber = (available) => {
  const totalWeight = available.reduce((sum, n) => sum + FREQUENCIES[n], 0);
  let roll = Math.random() * totalWeight;
  for (const n of available) {
    roll -= FREQUENCIES[n];
    if (roll <= 0) return n;
  }
  return available[available.length - 1];
};

const createWeightedSet = () => {
  const available = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
  const selected = [];
  while (selected.length < COUNT) {
    const picked = pickWeightedNumber(available);
    selected.push(picked);
    available.splice(available.indexOf(picked), 1);
  }
  return selected.sort((a, b) => a - b);
};

const renderSets = (sets) => {
  numbersGrid.innerHTML = "";
  sets.forEach((setValues, setIndex) => {
    const wrap = document.createElement("div");
    wrap.className = "numbers__set";
    const row = document.createElement("div");
    row.className = "set-row";

    setValues.forEach((value, index) => {
      const ball = buildBall(value);
      ball.style.animationDelay = `${(setIndex * COUNT + index) * 60}ms`;
      ball.dataset.animate = "true";
      row.appendChild(ball);
    });

    wrap.appendChild(row);
    numbersGrid.appendChild(wrap);
  });
};

const updateStatus = (message) => {
  statusText.textContent = message;
};

const refreshBallColors = () => {
  document.querySelectorAll(".ball").forEach((ball) => {
    const value = Number(ball.textContent);
    if (!Number.isNaN(value)) {
      applyBallStyle(ball, value);
    }
  });
  document.querySelectorAll(".hero-title__ball").forEach((ball) => {
    const value = Number(ball.dataset.number || 1);
    applyBallStyle(ball, value);
  });
};

const renderChart = () => {
  if (!chartCanvas) return;
  const parent = chartCanvas.parentElement;
  const width = Math.floor(parent.clientWidth);
  const height = Math.floor(chartCanvas.getBoundingClientRect().height || 260);
  if (width === 0 || height === 0) return;

  chartCanvas.width = width;
  chartCanvas.height = height;

  const ctx = chartCanvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  const padding = 32;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const values = FREQUENCIES.slice(1);
  const maxValue = Math.max(...values);

  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue("--text").trim() ||
    "#261d16";
  ctx.strokeStyle =
    textColor === "#f3ede6" ? "rgba(243,237,230,0.4)" : "rgba(38,29,22,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  const barGap = 4;
  const barWidth = Math.max(
    4,
    Math.floor((chartWidth - barGap * (values.length - 1)) / values.length)
  );
  const baseY = height - padding;

  values.forEach((count, index) => {
    const ratio = count / maxValue;
    const barHeight = Math.max(2, Math.round(chartHeight * ratio));
    const x = padding + index * (barWidth + barGap);
    const y = baseY - barHeight;

    ctx.fillStyle = getNumberColor(index + 1).base;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = textColor;
    ctx.font = "9px \"Noto Sans KR\", sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(index + 1, x + barWidth / 2, height - padding + 6);
  });
};

const createConfetti = () => {
  if (!confettiLayer) return;
  confettiLayer.innerHTML = "";
  const colors = [
    "#ff6b6b",
    "#ffd93d",
    "#6bcbef",
    "#a66bff",
    "#6bff95",
    "#ff9f68",
    "#5fe1ff",
    "#ff7bdc",
    "#ffc857",
  ];
  const baseCount = Math.floor(window.innerWidth / 6);
  const count = Math.min(220, Math.max(120, baseCount));

  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const width = 4 + Math.random() * 10;
    const height = 4 + Math.random() * 16;
    const drift = (Math.random() - 0.5) * 120;
    const rotation = Math.random() * 360;
    const duration = 8 + Math.random() * 10;
    const delay = -Math.random() * duration;
    const opacity = 0.55 + Math.random() * 0.35;
    const left = Math.random() * 100;
    const top = -30 + Math.random() * 20;
    const color = colors[Math.floor(Math.random() * colors.length)];

    piece.style.left = `${left}%`;
    piece.style.top = `${top}vh`;
    piece.style.setProperty("--w", `${width}px`);
    piece.style.setProperty("--h", `${height}px`);
    piece.style.setProperty("--drift", `${drift}px`);
    piece.style.setProperty("--r", `${rotation}deg`);
    piece.style.setProperty("--d", `${duration}s`);
    piece.style.setProperty("--delay", `${delay}s`);
    piece.style.setProperty("--o", opacity.toFixed(2));
    piece.style.setProperty("--c", color);

    confettiLayer.appendChild(piece);
  }
};

const generateNumbers = () => {
  currentSets = Array.from({ length: SET_COUNT }, () => createWeightedSet());
  renderSets(currentSets);
  updateStatus(`최근 ${TOTAL_DRAWS}회차 기준으로 6세트를 생성했습니다.`);
  return currentSets;
};

const getShareText = () => {
  if (!currentSets.length) {
    return "로또 6/45 번호가 아직 없습니다.";
  }
  const lines = currentSets.map((setValues) => setValues.join(", "));
  return `과거 빈도를 기반한 강심장이 추천하는 인생로또\n\n${lines.join("\n")}`;
};

const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
};

const showSharePrompt = (text) => {
  window.prompt("공유할 번호를 복사하세요.", text);
};

const handleShare = async () => {
  const text = getShareText();
  try {
    if (navigator.share) {
      await navigator.share({
        title: "로또 번호",
        text,
      });
      updateStatus("공유가 완료되었습니다.");
      return;
    }
    let copied = false;
    try {
      copied = await copyToClipboard(text);
    } catch (error) {
      copied = false;
    }
    if (copied) {
      updateStatus("복사했습니다. 공유해 주세요.");
    } else {
      showSharePrompt(text);
      updateStatus("복사가 차단되어 텍스트를 표시했습니다.");
    }
  } catch (error) {
    updateStatus("공유를 취소했습니다.");
  }
};

const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  modeToggle.setAttribute("aria-pressed", theme === "dark");
  modeToggle.querySelector(".mode-toggle__icon").textContent = theme === "dark" ? "D" : "W";
  modeToggle.querySelector(".mode-toggle__label").textContent = theme === "dark" ? "다크" : "화이트";
  refreshBallColors();
  renderChart();
};

const toggleTheme = () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  localStorage.setItem("lotte-theme", next);
};

const init = () => {
  const saved = localStorage.getItem("lotte-theme") || "dark";
  setTheme(saved);
  createConfetti();
  generateNumbers();
  refreshBallColors();
  renderChart();
};

generateButton.addEventListener("click", generateNumbers);
shareButton.addEventListener("click", handleShare);
modeToggle.addEventListener("click", toggleTheme);
window.addEventListener("resize", () => {
  window.requestAnimationFrame(renderChart);
  window.requestAnimationFrame(createConfetti);
});

init();
