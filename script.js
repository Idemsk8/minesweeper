// ===== Настройки уровней =====
const LEVELS = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 }
};

// ===== Состояние игры =====
let state = {
  rows: 9,
  cols: 9,
  mines: 10,
  board: [],        // двумерный массив клеток
  revealed: 0,      // сколько открыто
  flags: 0,
  started: false,
  gameOver: false,
  timer: 0,
  timerId: null
};

// ===== DOM =====
const boardEl   = document.getElementById('board');
const mineEl    = document.getElementById('mine-count');
const timerEl   = document.getElementById('timer');
const resetBtn  = document.getElementById('reset-btn');
const diffBtns  = document.querySelectorAll('.diff-btn');

// ===== Инициализация =====
function initGame(level = 'easy') {
  const cfg = LEVELS[level];
  state = {
    rows: cfg.rows,
    cols: cfg.cols,
    mines: cfg.mines,
    board: [],
    revealed: 0,
    flags: 0,
    started: false,
    gameOver: false,
    timer: 0,
    timerId: null
  };

  clearInterval(state.timerId);
  mineEl.textContent = pad(state.mines);
  timerEl.textContent = '000';
  resetBtn.textContent = '🙂';

  createBoard();
  render();
}

// ===== Создание поля =====
function createBoard() {
  for (let r = 0; r < state.rows; r++) {
    state.board[r] = [];
    for (let c = 0; c < state.cols; c++) {
      state.board[r][c] = {
        mine: false,
        open: false,
        flag: false,
        n: 0
      };
    }
  }
}

// ===== Расстановка мин (после первого клика) =====
function placeMines(safeR, safeC) {
  let placed = 0;
  while (placed < state.mines) {
    const r = Math.floor(Math.random() * state.rows);
    const c = Math.floor(Math.random() * state.cols);

    // Не ставим мину на первую клетку и её соседей
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    if (state.board[r][c].mine) continue;

    state.board[r][c].mine = true;
    placed++;
  }

  // Считаем числа
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.board[r][c].mine) continue;
      state.board[r][c].n = countMinesAround(r, c);
    }
  }
}

function countMinesAround(r, c) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) continue;
      if (state.board[nr][nc].mine) count++;
    }
  }
  return count;
}

// ===== Рендер поля =====
function render() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${state.cols}, auto)`;

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.board[r][c];
      const el = document.createElement('div');
      el.className = 'cell';
      el.dataset.r = r;
      el.dataset.c = c;

      if (cell.open) {
        el.classList.add('open');
        if (cell.mine) {
          el.classList.add('mine');
          el.textContent = '💣';
        } else if (cell.n > 0) {
          el.dataset.n = cell.n;
          el.textContent = cell.n;
        }
      } else if (cell.flag) {
        el.classList.add('flag');
        el.textContent = '🚩';
      }

      el.addEventListener('click', () => handleClick(r, c));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleRightClick(r, c);
      });

      boardEl.appendChild(el);
    }
  }
}

// ===== Клик по клетке =====
function handleClick(r, c) {
  if (state.gameOver) return;
  const cell = state.board[r][c];
  if (cell.flag || cell.open) return;

  // Первый клик — генерируем поле
  if (!state.started) {
    state.started = true;
    placeMines(r, c);
    startTimer();
  }

  if (cell.mine) {
    cell.open = true;
    loseGame(r, c);
    return;
  }

  floodFill(r, c);
  checkWin();
  render();
}

// ===== ПКМ — флаг =====
function handleRightClick(r, c) {
  if (state.gameOver) return;
  const cell = state.board[r][c];
  if (cell.open) return;

  cell.flag = !cell.flag;
  state.flags += cell.flag ? 1 : -1;

  mineEl.textContent = pad(state.mines - state.flags);
  render();
}

// ===== Открытие пустых клеток рекурсией =====
function floodFill(r, c) {
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return;
  const cell = state.board[r][c];
  if (cell.open || cell.flag || cell.mine) return;

  cell.open = true;
  state.revealed++;

  if (cell.n === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        floodFill(r + dr, c + dc);
      }
    }
  }
}

// ===== Проигрыш =====
function loseGame(r, c) {
  state.gameOver = true;
  clearInterval(state.timerId);
  resetBtn.textContent = '😵';

  // Показываем все мины
  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.cols; j++) {
      if (state.board[i][j].mine) state.board[i][j].open = true;
    }
  }

  render();

  // Подсвечиваем взорвавшуюся
  const exploded = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  if (exploded) exploded.classList.add('exploded');
}

// ===== Победа =====
function checkWin() {
  const totalSafe = state.rows * state.cols - state.mines;
  if (state.revealed === totalSafe) {
    state.gameOver = true;
    clearInterval(state.timerId);
    resetBtn.textContent = '😎';

    // Автоматически ставим флаги на все мины
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.board[r][c].mine) state.board[r][c].flag = true;
      }
    }
    mineEl.textContent = '000';
    render();
  }
}

// ===== Таймер =====
function startTimer() {
  state.timer = 0;
  state.timerId = setInterval(() => {
    state.timer++;
    timerEl.textContent = pad(state.timer);
  }, 1000);
}

// ===== Утилиты =====
function pad(n) {
  return String(Math.min(n, 999)).padStart(3, '0');
}

// ===== Кнопки =====
resetBtn.addEventListener('click', () => {
  const active = document.querySelector('.diff-btn.active').dataset.level;
  initGame(active);
});

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    initGame(btn.dataset.level);
  });
});

// ===== Старт =====
initGame('easy');
