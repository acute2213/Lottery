const numbersGrid = document.getElementById("numbers");
const generateButton = document.getElementById("generate");
const shareButton = document.getElementById("share");
const statusText = document.getElementById("status");
const modeToggle = document.querySelector(".mode-toggle");
const chartCanvas = document.getElementById("frequencyChart");
const confettiLayer = document.querySelector(".confetti-layer");
const scanButton = document.getElementById("scanBarcode");
const scanner = document.getElementById("scanner");
const scannerVideo = document.getElementById("scannerVideo");
const scannerHint = document.getElementById("scannerHint");
const scannerResult = document.getElementById("scannerResult");
const closeScannerButton = document.getElementById("closeScanner");

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

let scannerStream = null;
let scannerActive = false;
let barcodeDetector = null;
let zxingReader = null;
let zxingActive = false;

const parseQrPayload = (payload) => {
  if (!payload) return null;
  let value = payload.trim();
  let encoded = null;
  try {
    const url = new URL(value);
    encoded = url.searchParams.get("v");
  } catch (error) {
    const match = value.match(/[?&]v=([^&]+)/);
    if (match) encoded = match[1];
  }
  if (!encoded) return null;
  const firstIndex = encoded.indexOf("q");
  if (firstIndex <= 0) return null;
  const draw = Number(encoded.slice(0, firstIndex));
  if (!Number.isInteger(draw)) return null;
  const sets = [];
  const regex = /q(\d{12})/g;
  let group = regex.exec(encoded);
  while (group) {
    const digits = group[1];
    const numbers = [];
    for (let i = 0; i < digits.length; i += 2) {
      numbers.push(Number(digits.slice(i, i + 2)));
    }
    sets.push(numbers);
    group = regex.exec(encoded);
  }
  return { draw, sets };
};

const renderScanResult = ({ draw, date, numbers, bonus }, sets) => {
  scannerResult.innerHTML = "";
  const summary = document.createElement("div");
  summary.className = "scan-summary";
  summary.textContent = `제 ${draw}회 (${date}) 당첨번호: ${numbers.join(", ")} + 보너스 ${bonus}`;
  scannerResult.appendChild(summary);

  sets.forEach((set, index) => {
    const matchCount = set.filter((num) => numbers.includes(num)).length;
    const bonusMatch = set.includes(bonus);
    let rank = "낙첨";
    if (matchCount === 6) rank = "1등";
    else if (matchCount === 5 && bonusMatch) rank = "2등";
    else if (matchCount === 5) rank = "3등";
    else if (matchCount === 4) rank = "4등";
    else if (matchCount === 3) rank = "5등";

    const row = document.createElement("div");
    row.className = "scan-set";
    const nums = document.createElement("div");
    nums.className = "scan-set__nums";
    nums.textContent = `${index + 1}번: ${set.join(", ")}`;
    const badge = document.createElement("div");
    badge.className = "scan-set__rank";
    badge.textContent = rank;
    row.appendChild(nums);
    row.appendChild(badge);
    scannerResult.appendChild(row);
  });
};

const checkWinning = async (payload) => {
  const parsed = parseQrPayload(payload);
  if (!parsed) {
    scannerHint.textContent = "QR 형식을 인식하지 못했습니다.";
    return;
  }

  const { draw, sets } = parsed;
  if (sets.length === 0) {
    scannerHint.textContent = "QR에 로또 번호가 없습니다.";
    return;
  }

  scannerHint.textContent = "당첨 번호를 조회하는 중입니다...";
  const response = await fetch(`/api/check-lotto?draw=${draw}`);
  if (!response.ok) {
    scannerHint.textContent = "당첨 번호 조회에 실패했습니다.";
    return;
  }
  const data = await response.json();
  if (!data || data.error) {
    scannerHint.textContent = "당첨 번호 데이터를 가져오지 못했습니다.";
    return;
  }
  scannerHint.textContent = "조회 완료";
  renderScanResult(data, sets);
};

const stopScanner = () => {
  scannerActive = false;
  zxingActive = false;
  if (zxingReader) {
    try {
      zxingReader.reset();
    } catch (error) {
      // ignore
    }
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  if (scannerVideo) {
    scannerVideo.srcObject = null;
  }
};

const scanLoop = async () => {
  if (!scannerActive || !barcodeDetector || !scannerVideo) return;
  try {
    const barcodes = await barcodeDetector.detect(scannerVideo);
    if (barcodes.length > 0) {
      scannerActive = false;
      const payload = barcodes[0].rawValue || "";
      stopScanner();
      await checkWinning(payload);
      return;
    }
  } catch (error) {
    scannerHint.textContent = "카메라 인식에 실패했습니다.";
  }
  if (scannerActive) {
    window.requestAnimationFrame(scanLoop);
  }
};

const startZxing = async () => {
  if (!scannerVideo || !window.ZXing) {
    scannerHint.textContent = "이 브라우저는 QR 인식을 지원하지 않습니다.";
    return;
  }
  try {
    zxingReader = new window.ZXing.BrowserMultiFormatReader();
    zxingActive = true;
    await zxingReader.decodeFromVideoDevice(null, scannerVideo, async (result, error) => {
      if (!zxingActive) return;
      if (result && result.getText) {
        zxingActive = false;
        const payload = result.getText();
        stopScanner();
        await checkWinning(payload);
      }
    });
  } catch (error) {
    scannerHint.textContent = "카메라 권한을 확인해주세요.";
  }
};

const startScanner = async () => {
  if (!scanner || !scannerVideo) return;
  scannerResult.innerHTML = "";
  scannerHint.textContent = "카메라를 QR/바코드에 맞춰주세요.";
  scanner.hidden = false;

  if ("BarcodeDetector" in window) {
    try {
      barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
      scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      scannerVideo.srcObject = scannerStream;
      await scannerVideo.play();
      scannerActive = true;
      scanLoop();
      return;
    } catch (error) {
      scannerHint.textContent = "카메라 권한을 확인해주세요.";
      stopScanner();
      return;
    }
  }

  await startZxing();
};

const closeScanner = () => {
  stopScanner();
  if (scanner) {
    scanner.hidden = true;
  }
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
  updateStatus(`최근 ${TOTAL_DRAWS}회차 기준으로 ${SET_COUNT}세트를 생성했습니다.`);
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
if (scanButton) {
  scanButton.addEventListener("click", startScanner);
}
if (closeScannerButton) {
  closeScannerButton.addEventListener("click", closeScanner);
}
if (scanner) {
  scanner.addEventListener("click", (event) => {
    if (event.target === scanner) closeScanner();
  });
}
window.addEventListener("resize", () => {
  window.requestAnimationFrame(renderChart);
  window.requestAnimationFrame(createConfetti);
});

init();
