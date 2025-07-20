// app.js - Desmond Ma 專屬圍棋學習平台 - 修復按鈕功能版本

/***************************************************************************
 * 應用數據 - 重置為0勝0敗
 ***************************************************************************/
const APPLICATION_DATA = {
  player: {
    name: "Desmond Ma",
    currentLevel: "30級", // 重置為初學者等級
    experience: 0, // 重置經驗為0
    experienceToNext: 100,
    totalGames: 0, // 重置總局數為0
    wins: 0, // 重置勝場為0
    losses: 0, // 重置敗場為0
    winRate: 0, // 重置勝率為0
    achievements: [] // 重置成就為空
  },
  
  levelInfo: {
    "30級": {boardSize: "9×9", skills: ["基本規則", "氣的概念", "提子方法"], description: "初學階段，學習圍棋基本規則和概念"},
    "29級": {boardSize: "9×9", skills: ["認識眼位", "簡單連接"], description: "理解棋子的生存條件"},
    "28級": {boardSize: "9×9", skills: ["基本死活", "提子技巧"], description: "掌握吃子和救子的方法"},
    "27級": {boardSize: "9×9", skills: ["眼形判斷", "簡單對殺"], description: "學習基本的生死判斷"},
    "26級": {boardSize: "9×9", skills: ["劫爭概念", "基本手筋"], description: "理解劫爭規則和基本技巧"},
    "25級": {boardSize: "9×9", skills: ["基本連接", "簡單死活", "基礎定式"], description: "掌握基本技巧，開始學習戰術"}
  },

  achievements: {
    "初次對弈": {icon: "🏁", description: "完成人生第一盤圍棋", unlocked: false},
    "初嘗勝利": {icon: "🎉", description: "獲得第一場勝利", unlocked: false},
    "學習狂熱者": {icon: "📚", description: "完成10個教學模組", unlocked: false},
    "連續挑戰": {icon: "🔥", description: "連續3天練習", unlocked: false}
  },

  gameHistory: [], // 重置歷史記錄為空

  hints: [
    "初學階段建議使用 9×9 棋盤，學習基本規則和概念",
    "30級玩家重點學習基本規則和氣的概念",
    "角部通常比邊部更容易做活",
    "學會基本連接能避免棋子被分割",
    "理解氣的概念是圍棋最基礎的知識",
    "死活計算是圍棋的基本功，需要反覆練習"
  ]
};

/***************************************************************************
 * 全局狀態 - 重置為初始狀態
 ***************************************************************************/
const gameState = {
  player: APPLICATION_DATA.player,
  boardSize: 9, // 30級推薦使用9x9
  aiEngine: "basic",
  aiDifficulty: 1,
  learningMode: "guided",
  currentGame: null,
  gameTimer: 0,
  timerInterval: null,
  isAIThinking: false, // 添加AI思考狀態標記
  currentAnalysis: {
    winRate: "黑棋 50%",
    bestMove: "天元",
    positionEval: "均勢"
  }
};

/***************************************************************************
 * 改進的圍棋遊戲邏輯類
 ***************************************************************************/
class GoGame {
  constructor(size = 9) {
    this.size = size;
    this.board = Array(size).fill().map(() => Array(size).fill(0));
    this.currentPlayer = 1; // 1 = 黑棋(玩家), 2 = 白棋(AI)
    this.capturedStones = {1: 0, 2: 0};
    this.moveHistory = [];
    this.passCount = 0;
    this.gameOver = false;
    this.winner = null;
    this.gameStartTime = Date.now();
    
    console.log(`創建新遊戲，棋盤大小: ${size}x${size}`);
  }

  makeMove(x, y) {
    if (this.gameOver || !this.isValidMove(x, y)) {
      console.log(`無效著手: (${x},${y}), 遊戲結束: ${this.gameOver}, 有效: ${this.isValidMove(x, y)}`);
      return false;
    }

    console.log(`嘗試著手: ${this.currentPlayer === 1 ? '黑棋' : '白棋'} 在 (${x},${y})`);
    
    // 記錄下棋前的狀態
    const boardBefore = this.board.map(row => [...row]);
    
    this.board[x][y] = this.currentPlayer;
    
    const opponent = this.currentPlayer === 1 ? 2 : 1;
    const capturedCount = this.removeCaptures(opponent);
    
    // 檢查自殺手
    if (capturedCount === 0 && !this.hasLiberties(x, y)) {
      this.board[x][y] = 0;
      console.log(`自殺手，撤銷著手: (${x},${y})`);
      return false;
    }

    this.moveHistory.push({
      player: this.currentPlayer,
      x: x,
      y: y,
      captured: capturedCount,
      timestamp: Date.now(),
      boardBefore: boardBefore
    });

    this.capturedStones[opponent] += capturedCount;
    
    // 切換玩家
    this.currentPlayer = opponent;
    this.passCount = 0;

    console.log(`成功著手: ${this.moveHistory[this.moveHistory.length - 1].player === 1 ? '黑棋' : '白棋'} 在 (${x},${y}), 下一手: ${this.currentPlayer === 1 ? '黑棋' : '白棋'}`);
    return true;
  }

  isValidMove(x, y) {
    const valid = x >= 0 && x < this.size && y >= 0 && y < this.size && this.board[x][y] === 0;
    if (!valid) {
      console.log(`位置檢查失敗: (${x},${y}), 範圍: ${x >= 0 && x < this.size && y >= 0 && y < this.size}, 空位: ${this.board[x] && this.board[x][y] === 0}`);
    }
    return valid;
  }

  hasLiberties(x, y) {
    const player = this.board[x][y];
    if (player === 0) return false;
    
    const visited = Array(this.size).fill().map(() => Array(this.size).fill(false));
    const liberties = new Set();
    
    const dfs = (px, py) => {
      if (px < 0 || px >= this.size || py < 0 || py >= this.size || visited[px][py]) {
        return;
      }
      
      if (this.board[px][py] === 0) {
        liberties.add(`${px},${py}`);
        return;
      }
      
      if (this.board[px][py] !== player) {
        return;
      }
      
      visited[px][py] = true;
      dfs(px-1, py);
      dfs(px+1, py);
      dfs(px, py-1);
      dfs(px, py+1);
    };
    
    dfs(x, y);
    return liberties.size > 0;
  }

  removeCaptures(player) {
    let totalCaptured = 0;
    const toRemove = [];

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.board[x][y] === player && !this.hasLiberties(x, y)) {
          const group = this.getGroup(x, y);
          group.forEach(([gx, gy]) => {
            if (!toRemove.some(([rx, ry]) => rx === gx && ry === gy)) {
              toRemove.push([gx, gy]);
            }
          });
        }
      }
    }

    toRemove.forEach(([x, y]) => {
      this.board[x][y] = 0;
      totalCaptured++;
    });

    if (totalCaptured > 0) {
      console.log(`提子 ${totalCaptured} 顆`);
    }

    return totalCaptured;
  }

  getGroup(x, y) {
    const player = this.board[x][y];
    const group = [];
    const visited = Array(this.size).fill().map(() => Array(this.size).fill(false));
    
    const addToGroup = (px, py) => {
      if (px < 0 || px >= this.size || py < 0 || py >= this.size || 
          visited[px][py] || this.board[px][py] !== player) {
        return;
      }
      
      visited[px][py] = true;
      group.push([px, py]);
      
      addToGroup(px-1, py);
      addToGroup(px+1, py);
      addToGroup(px, py-1);
      addToGroup(px, py+1);
    };
    
    addToGroup(x, y);
    return group;
  }

  pass() {
    console.log(`${this.currentPlayer === 1 ? '黑棋' : '白棋'} 放棄一手`);
    this.passCount++;
    this.moveHistory.push({
      player: this.currentPlayer,
      x: -1,
      y: -1,
      captured: 0,
      timestamp: Date.now(),
      isPass: true
    });
    
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    
    if (this.passCount >= 2) {
      this.gameOver = true;
      this.calculateWinner();
      console.log("雙方連續放棄，遊戲結束");
      return "game_end";
    }
    
    return "continue";
  }

  resign() {
    this.gameOver = true;
    this.winner = this.currentPlayer === 1 ? 2 : 1;
    console.log(`${this.currentPlayer === 1 ? '黑棋' : '白棋'} 認輸，${this.winner === 1 ? '黑棋' : '白棋'} 獲勝`);
    return this.winner;
  }

  calculateWinner() {
    // 簡化的勝負判定：數子法
    let blackStones = 0;
    let whiteStones = 0;

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.board[x][y] === 1) blackStones++;
        if (this.board[x][y] === 2) whiteStones++;
      }
    }

    // 加上提子數
    blackStones += this.capturedStones[2];
    whiteStones += this.capturedStones[1];
    
    // 白棋貼7.5目
    whiteStones += 7.5;

    if (blackStones > whiteStones) {
      this.winner = 1;
    } else {
      this.winner = 2;
    }

    console.log(`終局計算：黑${blackStones} vs 白${whiteStones}, 勝者：${this.winner === 1 ? '黑棋' : '白棋'}`);
    return this.winner;
  }

  // 獲取所有合法著手
  getValidMoves() {
    const moves = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.isValidMove(x, y)) {
          moves.push([x, y]);
        }
      }
    }
    return moves;
  }
}

/***************************************************************************
 * 快速AI引擎 - 修復響應問題
 ***************************************************************************/
class FastGoAI {
  constructor(level = 1) {
    this.level = level;
    this.maxThinkTime = 1500; // 最大思考時間1.5秒
    console.log(`AI引擎初始化，難度: ${level}`);
  }

  // 獲取最佳著手
  async getBestMove(game) {
    console.log("AI開始分析局面...");
    const startTime = Date.now();
    
    const validMoves = game.getValidMoves();
    console.log(`找到 ${validMoves.length} 個合法著手`);
    
    if (validMoves.length === 0) {
      console.log("沒有合法著手，AI應該放棄");
      return null;
    }

    // 簡單策略：選擇評分最高的著手
    let bestMove = validMoves[0];
    let bestScore = this.evaluateMove(game, bestMove[0], bestMove[1]);

    // 評估前10個著手（提高速度）
    const movesToEvaluate = Math.min(validMoves.length, 10);
    
    for (let i = 1; i < movesToEvaluate; i++) {
      if (Date.now() - startTime > this.maxThinkTime) {
        console.log("AI思考超時，使用當前最佳著手");
        break;
      }

      const [x, y] = validMoves[i];
      const score = this.evaluateMove(game, x, y);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = [x, y];
      }
    }

    const thinkTime = Date.now() - startTime;
    console.log(`AI選擇著手 (${bestMove[0]}, ${bestMove[1]})，評分: ${bestScore.toFixed(2)}, 思考時間: ${thinkTime}ms`);
    
    return bestMove;
  }

  // 評估著手價值
  evaluateMove(game, x, y) {
    let score = 0;

    // 隨機性
    score += Math.random() * 2;

    // 中心位置價值
    const center = Math.floor(game.size / 2);
    const distanceFromCenter = Math.abs(x - center) + Math.abs(y - center);
    score += (game.size - distanceFromCenter) * 0.5;

    // 角部和邊線價值
    if (this.isCorner(game, x, y)) {
      score += 3;
    } else if (this.isEdge(game, x, y)) {
      score += 1;
    }

    // 連接己方棋子價值
    score += this.getConnectionValue(game, x, y) * 2;

    // 攻擊對方價值
    score += this.getAttackValue(game, x, y) * 2;

    return score;
  }

  isCorner(game, x, y) {
    return (x === 0 || x === game.size - 1) && (y === 0 || y === game.size - 1);
  }

  isEdge(game, x, y) {
    return x === 0 || x === game.size - 1 || y === 0 || y === game.size - 1;
  }

  getConnectionValue(game, x, y) {
    let connections = 0;
    const directions = [[-1,0], [1,0], [0,-1], [0,1]];
    
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < game.size && ny >= 0 && ny < game.size) {
        if (game.board[nx][ny] === 2) { // AI是白棋
          connections++;
        }
      }
    }
    return connections;
  }

  getAttackValue(game, x, y) {
    let attackValue = 0;
    const directions = [[-1,0], [1,0], [0,-1], [0,1]];
    
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < game.size && ny >= 0 && ny < game.size) {
        if (game.board[nx][ny] === 1) { // 黑棋
          attackValue += 1;
        }
      }
    }
    return attackValue;
  }
}

/***************************************************************************
 * 創建AI實例
 ***************************************************************************/
let aiEngine = new FastGoAI(gameState.aiDifficulty);

/***************************************************************************
 * 初始化應用
 ***************************************************************************/
function initApp() {
  console.log("初始化 Desmond Ma 圍棋學習平台 (修復更多功能按鈕版本)...");
  
  updatePlayerInfo();
  updateSkillTree();
  newGame();
  bindEvents();
  startGameTimer();
  updateGameHistory();
  
  console.log("平台初始化完成！記錄已重置為 0勝0敗，更多功能按鈕已修復");
}

/***************************************************************************
 * 事件綁定 - 修復更多功能按鈕
 ***************************************************************************/
function bindEvents() {
  const canvas = document.getElementById('go-board');
  if (canvas) {
    canvas.addEventListener('click', handleBoardClick);
  }

  // 基本遊戲控制
  document.getElementById('pass-btn')?.addEventListener('click', handlePass);
  document.getElementById('resign-btn')?.addEventListener('click', handleResign);
  document.getElementById('undo-btn')?.addEventListener('click', undoMove);
  document.getElementById('new-game-btn')?.addEventListener('click', newGame);

  // 遊戲設定
  document.getElementById('board-size')?.addEventListener('change', (e) => {
    gameState.boardSize = parseInt(e.target.value);
    updateBoardSizeRecommendation();
    newGame();
  });

  document.getElementById('ai-difficulty')?.addEventListener('change', (e) => {
    gameState.aiDifficulty = parseInt(e.target.value);
    aiEngine = new FastGoAI(gameState.aiDifficulty);
  });

  // 主要功能按鈕
  document.getElementById('hint-btn')?.addEventListener('click', showHint);
  document.getElementById('analysis-btn')?.addEventListener('click', showAnalysis);
  
  // === 修復：更多功能下拉選單控制 ===
  const moreFunctionsToggle = document.getElementById('more-functions-toggle');
  const moreFunctionsMenu = document.getElementById('more-functions-menu');
  
  if (moreFunctionsToggle && moreFunctionsMenu) {
    moreFunctionsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      moreFunctionsMenu.classList.toggle('show');
      console.log('更多功能選單切換:', moreFunctionsMenu.classList.contains('show') ? '顯示' : '隱藏');
    });
    
    // 點擊其他區域關閉選單
    document.addEventListener('click', (e) => {
      if (!moreFunctionsToggle.contains(e.target) && !moreFunctionsMenu.contains(e.target)) {
        moreFunctionsMenu.classList.remove('show');
      }
    });
  }

  // === 修復：綁定所有更多功能按鈕的事件監聽器 ===
  document.getElementById('game-analysis-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('復盤分析按鈕被點擊');
    hideMoreFunctionsMenu();
    showGameAnalysis();
  });

  document.getElementById('learning-mode-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('學習模式按鈕被點擊');
    hideMoreFunctionsMenu();
    showLearningMode();
  });

  document.getElementById('life-death-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('死活練習按鈕被點擊');
    hideMoreFunctionsMenu();
    showLifeDeathPractice();
  });

  document.getElementById('joseki-learning-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('定式學習按鈕被點擊');
    hideMoreFunctionsMenu();
    showJosekiLearning();
  });

  document.getElementById('rank-exam-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('段位考試按鈕被點擊');
    hideMoreFunctionsMenu();
    showRankExamination();
  });

  document.getElementById('settings-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('設定選項按鈕被點擊');
    hideMoreFunctionsMenu();
    showSettings();
  });

  document.getElementById('help-docs-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('幫助文檔按鈕被點擊');
    hideMoreFunctionsMenu();
    showHelpDocumentation();
  });
  
  bindModalCloseEvents();
}

/***************************************************************************
 * 更多功能選單函數
 ***************************************************************************/
function hideMoreFunctionsMenu() {
  const moreFunctionsMenu = document.getElementById('more-functions-menu');
  if (moreFunctionsMenu) {
    moreFunctionsMenu.classList.remove('show');
  }
}

function showGameAnalysis() {
  showFunctionModal('📊 復盤分析', `
    <div class="function-feature">
      <h4>🔍 對局分析功能</h4>
      <p>深度分析你的每一局對弈，發現改進空間：</p>
      <ul>
        <li>📈 詳細勝率統計和趨勢分析</li>
        <li>🎯 關鍵時刻決策回顧</li>
        <li>💡 AI 建議和最佳著手分析</li>
        <li>📊 棋力水平評估</li>
        <li>🏆 與同等級玩家對比</li>
      </ul>
      <p><strong>目前戰績：</strong>${gameState.player.wins}勝${gameState.player.losses}敗 (${gameState.player.winRate.toFixed(1)}% 勝率)</p>
    </div>
  `);
}

function showLearningMode() {
  showFunctionModal('📚 學習模式', `
    <div class="function-feature">
      <h4>🎓 系統化學習體系</h4>
      <p>專為 Desmond 量身打造的循序漸進學習計劃：</p>
      <ul>
        <li>🎯 <strong>當前階段：30級基礎訓練</strong></li>
        <li>📖 基本規則和氣的概念教學</li>
        <li>🧩 簡單死活題練習</li>
        <li>🔗 連接和斷點技巧</li>
        <li>⚔️ 基本戰術演練</li>
        <li>🏁 階段性測驗評估</li>
      </ul>
      <p><strong>學習進度：</strong>${gameState.player.experience}/${gameState.player.experienceToNext} 經驗值</p>
    </div>
  `);
}

function showLifeDeathPractice() {
  showFunctionModal('⚫ 死活練習', `
    <div class="function-feature">
      <h4>🧠 死活題庫系統</h4>
      <p>通過大量死活題訓練，提升計算力：</p>
      <ul>
        <li>🟢 <strong>初級死活：</strong>基本眼形判斷</li>
        <li>🟡 中級死活：連接與切斷</li>
        <li>🔴 高級死活：複雜劫爭</li>
        <li>⭐ 經典名局死活精選</li>
        <li>📊 答題準確率統計</li>
        <li>⏱️ 計算速度訓練</li>
      </ul>
      <p><strong>適合 30級 的題目：</strong>基本生死判斷，簡單眼形練習</p>
    </div>
  `);
}

function showJosekiLearning() {
  showFunctionModal('🎯 定式學習', `
    <div class="function-feature">
      <h4>📚 定式圖解教學</h4>
      <p>掌握經典定式，提升布局水平：</p>
      <ul>
        <li>🏛️ 古典定式：小目定式、星位定式</li>
        <li>🆕 現代定式：AI 時代新變化</li>
        <li>🎯 定式選擇：因勢利導</li>
        <li>⚖️ 定式利弊分析</li>
        <li>🔄 定式轉換技巧</li>
        <li>📖 定式背後的思路</li>
      </ul>
      <p><strong>30級建議：</strong>先學習角部基本活棋方法，再學簡單定式</p>
    </div>
  `);
}

function showRankExamination() {
  showFunctionModal('🏆 段位考試', `
    <div class="function-feature">
      <h4>🎖️ 升段挑戰系統</h4>
      <p>通過正式考試，證明你的棋力水平：</p>
      <ul>
        <li>📝 <strong>下一目標：</strong>升至 29級</li>
        <li>✅ 考試內容：基本規則、氣的概念、提子方法</li>
        <li>⏰ 考試時間：30 分鐘</li>
        <li>📊 通過標準：70% 以上正確率</li>
        <li>🏅 考試通過後獲得段位證書</li>
        <li>📈 棋力評估報告</li>
      </ul>
      <p><strong>目前經驗：</strong>${gameState.player.experience}/100，還需 ${gameState.player.experienceToNext - gameState.player.experience} 經驗值可參加考試</p>
    </div>
  `);
}

function showSettings() {
  showFunctionModal('⚙️ 設定選項', `
    <div class="function-feature">
      <h4>🛠️ 個人化設定</h4>
      <p>調整各項設定，打造專屬學習環境：</p>
      <ul>
        <li>🎨 <strong>界面設定：</strong>棋盤樣式、棋子外觀</li>
        <li>🔊 音效設定：下棋音效、提示音</li>
        <li>⏱️ 時間設定：思考時間、AI響應速度</li>
        <li>🎯 難度調整：AI強度微調</li>
        <li>📊 統計顯示：詳細/簡潔模式</li>
        <li>💾 數據管理：匯出/匯入學習記錄</li>
      </ul>
      <p><strong>當前設定：</strong>${gameState.boardSize}×${gameState.boardSize} 棋盤，${['初級', '中級', '高級', '段位'][gameState.aiDifficulty - 1]} AI</p>
    </div>
  `);
}

function showHelpDocumentation() {
  showFunctionModal('❓ 幫助文檔', `
    <div class="function-feature">
      <h4>📖 完整使用指南</h4>
      <p>詳細的功能說明和學習資源：</p>
      <ul>
        <li>🎯 <strong>快速上手：</strong>5分鐘學會基本操作</li>
        <li>📚 圍棋基本規則詳解</li>
        <li>🤖 AI 功能使用說明</li>
        <li>📊 數據統計功能介紹</li>
        <li>🏆 段位系統和升級條件</li>
        <li>❓ 常見問題解答</li>
        <li>📞 技術支援聯繫方式</li>
      </ul>
    </div>
    <div class="function-feature">
      <h4>🌐 推薦免費部署平台</h4>
      <p>您可以將這個應用部署到以下免費平台：</p>
      <ul>
        <li>🚀 <strong>Netlify</strong> - <a href="https://netlify.com" target="_blank">netlify.com</a> (最推薦)</li>
        <li>📦 <strong>Vercel</strong> - <a href="https://vercel.com" target="_blank">vercel.com</a></li>
        <li>🏠 <strong>GitHub Pages</strong> - <a href="https://pages.github.com" target="_blank">pages.github.com</a></li>
        <li>🔥 <strong>Firebase Hosting</strong> - <a href="https://firebase.google.com" target="_blank">firebase.google.com</a></li>
        <li>⚡ <strong>Surge.sh</strong> - <a href="https://surge.sh" target="_blank">surge.sh</a></li>
      </ul>
      <p><strong>部署步驟：</strong>只需上傳 index.html、style.css、app.js 三個檔案即可運行！</p>
    </div>
  `);
}

function showFunctionModal(title, content) {
  const functionModal = document.getElementById('function-modal');
  const functionModalTitle = document.getElementById('function-modal-title');
  const functionModalContent = document.getElementById('function-modal-content');
  
  if (functionModalTitle) {
    functionModalTitle.textContent = title;
  }
  
  if (functionModalContent) {
    functionModalContent.innerHTML = content;
  }
  
  if (functionModal) {
    functionModal.classList.add('show');
  }
}

/***************************************************************************
 * 棋盤相關函數 - 保持原有功能
 ***************************************************************************/
function handlePass() {
  if (gameState.currentGame && !gameState.currentGame.gameOver && gameState.currentGame.currentPlayer === 1) {
    const result = gameState.currentGame.pass();
    updateGameDisplay();
    
    if (result === "game_end") {
      endGame();
    } else if (gameState.currentGame.currentPlayer === 2) {
      setTimeout(() => makeAIMove(), 500);
    }
  }
}

function handleResign() {
  if (gameState.currentGame && !gameState.currentGame.gameOver) {
    if (confirm('確定要認輸嗎？')) {
      gameState.currentGame.resign();
      endGame();
    }
  }
}

function newGame() {
  gameState.currentGame = new GoGame(gameState.boardSize);
  gameState.gameTimer = 0;
  gameState.isAIThinking = false;
  
  gameState.currentAnalysis = {
    winRate: "黑棋 50%",
    bestMove: "天元",
    positionEval: "均勢"
  };
  
  drawBoard();
  updateGameDisplay();
  updateAIAnalysis();
  
  console.log(`開始新的 ${gameState.boardSize}×${gameState.boardSize} 對局`);
}

function drawBoard() {
  const canvas = document.getElementById('go-board');
  if (!canvas || !gameState.currentGame) return;
  
  const ctx = canvas.getContext('2d');
  const size = gameState.boardSize;
  const canvasSize = 680;
  
  // 設置canvas尺寸
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  
  // 計算網格參數
  const margin = 40;
  const boardSize = canvasSize - (2 * margin);
  const cellSize = boardSize / (size - 1);

  // 清空並繪製背景
  ctx.fillStyle = '#DEB887';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // 繪製網格線
  ctx.strokeStyle = '#2D1810';
  ctx.lineWidth = 1.5;
  
  for (let i = 0; i < size; i++) {
    // 水平線
    ctx.beginPath();
    ctx.moveTo(margin, margin + i * cellSize);
    ctx.lineTo(margin + boardSize, margin + i * cellSize);
    ctx.stroke();
    
    // 垂直線
    ctx.beginPath();
    ctx.moveTo(margin + i * cellSize, margin);
    ctx.lineTo(margin + i * cellSize, margin + boardSize);
    ctx.stroke();
  }

  // 繪製星位
  ctx.fillStyle = '#2D1810';
  const starPoints = getStarPoints(size);
  starPoints.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(margin + x * cellSize, margin + y * cellSize, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 繪製棋子
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const stone = gameState.currentGame.board[x][y];
      if (stone !== 0) {
        const centerX = margin + x * cellSize;
        const centerY = margin + y * cellSize;
        const radius = cellSize * 0.35;

        // 陰影
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // 棋子主體
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        if (stone === 1) {
          // 黑棋
          ctx.fillStyle = '#1a1a1a';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // 白棋
          ctx.fillStyle = '#f8f8f8';
          ctx.fill();
          ctx.strokeStyle = '#cccccc';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  // 標記最後一手
  if (gameState.currentGame.moveHistory.length > 0) {
    const lastMove = gameState.currentGame.moveHistory[gameState.currentGame.moveHistory.length - 1];
    if (!lastMove.isPass) {
      const centerX = margin + lastMove.x * cellSize;
      const centerY = margin + lastMove.y * cellSize;
      
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function getStarPoints(size) {
  if (size === 19) {
    return [[3,3], [3,9], [3,15], [9,3], [9,9], [9,15], [15,3], [15,9], [15,15]];
  } else if (size === 13) {
    return [[3,3], [3,6], [3,9], [6,3], [6,6], [6,9], [9,3], [9,6], [9,9]];
  } else if (size === 9) {
    return [[2,2], [2,6], [4,4], [6,2], [6,6]];
  }
  return [];
}

function handleBoardClick(event) {
  if (!gameState.currentGame || gameState.currentGame.gameOver || 
      gameState.currentGame.currentPlayer !== 1 || gameState.isAIThinking) {
    console.log(`點擊被拒絕：遊戲結束:${gameState.currentGame?.gameOver}, 當前玩家:${gameState.currentGame?.currentPlayer}, AI思考中:${gameState.isAIThinking}`);
    return;
  }
  
  const canvas = event.target;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // 修復座標計算
  const size = gameState.boardSize;
  const canvasSize = 680;
  const margin = 40;
  const boardSize = canvasSize - (2 * margin);
  const cellSize = boardSize / (size - 1);
  
  // 計算最近的交叉點
  const boardX = Math.round((x - margin) / cellSize);
  const boardY = Math.round((y - margin) / cellSize);
  
  console.log(`點擊座標: canvas(${x.toFixed(1)}, ${y.toFixed(1)}) -> board(${boardX}, ${boardY})`);
  
  // 檢查點擊是否在棋盤範圍內
  if (boardX >= 0 && boardX < size && boardY >= 0 && boardY < size) {
    if (gameState.currentGame.makeMove(boardX, boardY)) {
      drawBoard();
      updateGameDisplay();
      
      // 檢查遊戲是否結束
      if (gameState.currentGame.gameOver) {
        endGame();
        return;
      }
      
      // 觸發AI回合
      if (gameState.currentGame.currentPlayer === 2) {
        console.log("玩家著手完成，觸發AI回應");
        setTimeout(() => makeAIMove(), 300);
      }
    } else {
      console.log(`無效著手: (${boardX}, ${boardY})`);
    }
  } else {
    console.log(`點擊超出棋盤範圍: (${boardX}, ${boardY})`);
  }
}

async function makeAIMove() {
  if (!gameState.currentGame || gameState.currentGame.gameOver || 
      gameState.currentGame.currentPlayer !== 2 || gameState.isAIThinking) {
    console.log(`AI著手被取消：遊戲結束:${gameState.currentGame?.gameOver}, 當前玩家:${gameState.currentGame?.currentPlayer}, AI思考中:${gameState.isAIThinking}`);
    return;
  }
  
  gameState.isAIThinking = true;
  updateGameDisplay(); // 顯示AI思考狀態
  
  console.log("AI 開始思考...");
  const startTime = Date.now();
  
  try {
    const move = await aiEngine.getBestMove(gameState.currentGame);
    
    if (move && !gameState.currentGame.gameOver) {
      const [x, y] = move;
      
      if (gameState.currentGame.makeMove(x, y)) {
        const thinkTime = Date.now() - startTime;
        console.log(`AI 完成著手 (${x},${y})，思考時間：${thinkTime}ms`);
        
        drawBoard();
        updateGameDisplay();
        updateAIAnalysis();
        
        if (gameState.currentGame.gameOver) {
          endGame();
        }
      } else {
        console.log(`AI著手失敗: (${x},${y})`);
      }
    } else {
      // AI無處可下，放棄
      console.log("AI無合法著手，放棄一手");
      const result = gameState.currentGame.pass();
      updateGameDisplay();
      if (result === "game_end") {
        endGame();
      }
    }
  } catch (error) {
    console.error("AI著手出錯:", error);
  } finally {
    gameState.isAIThinking = false;
    updateGameDisplay();
  }
}

/***************************************************************************
 * UI 更新函數
 ***************************************************************************/
function updatePlayerInfo() {
  const currentRank = document.getElementById('current-rank');
  const winCount = document.getElementById('win-count');
  const lossCount = document.getElementById('loss-count');
  const winRate = document.getElementById('win-rate');
  const expProgress = document.getElementById('exp-progress');
  const expText = document.getElementById('exp-text');
  
  if (currentRank) currentRank.textContent = gameState.player.currentLevel;
  if (winCount) winCount.textContent = gameState.player.wins;
  if (lossCount) lossCount.textContent = gameState.player.losses;
  if (winRate) winRate.textContent = gameState.player.winRate.toFixed(1) + '%';
  
  const expPercent = (gameState.player.experience / gameState.player.experienceToNext) * 100;
  if (expProgress) expProgress.style.width = expPercent + '%';
  if (expText) expText.textContent = `${gameState.player.experience}/${gameState.player.experienceToNext} 經驗`;
  
  const miniProgress = document.getElementById('mini-progress');
  if (miniProgress) miniProgress.style.width = expPercent + '%';
  
  updateBoardSizeRecommendation();
}

function updateBoardSizeRecommendation() {
  const boardSizeInfo = document.getElementById('board-size-info');
  const currentLevel = gameState.player.currentLevel;
  const levelData = APPLICATION_DATA.levelInfo[currentLevel];
  
  if (boardSizeInfo && levelData) {
    boardSizeInfo.innerHTML = `當前級別推薦：<span id="recommended-board">${levelData.boardSize}</span> 棋盤`;
  }
}

function updateSkillTree() {
  const skillContent = document.getElementById('skill-tree-content');
  if (!skillContent) return;
  
  let html = '';
  const currentLevel = gameState.player.currentLevel;
  
  Object.entries(APPLICATION_DATA.levelInfo).forEach(([level, data]) => {
    let statusClass = 'skill-item';
    if (level === currentLevel) {
      statusClass += ' skill-current';
    }
    
    html += `
      <div class="${statusClass}">
        <div class="skill-header">
          <strong>${level}</strong>
          <span class="board-size">${data.boardSize}</span>
        </div>
        <div class="skill-description">${data.description}</div>
        <div class="skill-list">技能：${data.skills.join('、')}</div>
      </div>
    `;
  });
  
  skillContent.innerHTML = html;
}

function updateGameDisplay() {
  if (!gameState.currentGame) return;
  
  const currentPlayer = document.getElementById('current-player');
  const capturedStones = document.getElementById('captured-stones');
  
  if (currentPlayer) {
    if (gameState.currentGame.gameOver) {
      const winnerText = gameState.currentGame.winner === 1 ? 'Desmond 獲勝!' : 'AI 獲勝!';
      currentPlayer.innerHTML = `<span class="turn-indicator">🏁</span><span class="turn-text">${winnerText}</span>`;
    } else if (gameState.isAIThinking) {
      currentPlayer.innerHTML = `<span class="turn-indicator">🤔</span><span class="turn-text">AI 思考中...</span>`;
    } else {
      const isBlackTurn = gameState.currentGame.currentPlayer === 1;
      const symbol = isBlackTurn ? '●' : '○';
      const text = isBlackTurn ? '黑棋行棋 (Desmond)' : '白棋準備中 (AI)';
      currentPlayer.innerHTML = `<span class="turn-indicator">${symbol}</span><span class="turn-text">${text}</span>`;
    }
  }
  
  if (capturedStones) {
    const blackCaptured = gameState.currentGame.capturedStones[1];
    const whiteCaptured = gameState.currentGame.capturedStones[2];
    capturedStones.innerHTML = `提子：<span style="color: #000; font-weight: bold;">黑${blackCaptured}</span> <span style="color: #666; font-weight: bold;">白${whiteCaptured}</span>`;
  }
}

function updateAIAnalysis() {
  // 根據當前局面更新分析
  if (!gameState.currentGame) return;
  
  const moveCount = gameState.currentGame.moveHistory.length;
  const blackStones = gameState.currentGame.board.flat().filter(cell => cell === 1).length;
  const whiteStones = gameState.currentGame.board.flat().filter(cell => cell === 2).length;
  
  // 簡單的勝率估算
  let winRate = 50;
  if (blackStones > whiteStones) {
    winRate = Math.min(70, 50 + (blackStones - whiteStones) * 2);
  } else if (whiteStones > blackStones) {
    winRate = Math.max(30, 50 - (whiteStones - blackStones) * 2);
  }
  
  gameState.currentAnalysis = {
    winRate: `黑棋 ${winRate.toFixed(0)}%`,
    bestMove: moveCount < 5 ? "角部" : "邊線",
    positionEval: winRate > 60 ? "黑棋優勢" : (winRate < 40 ? "白棋優勢" : "勢均力敵")
  };
  
  const winRateAnalysis = document.getElementById('win-rate-analysis');
  const bestMove = document.getElementById('best-move');
  const positionEval = document.getElementById('position-eval');
  
  if (winRateAnalysis) winRateAnalysis.textContent = gameState.currentAnalysis.winRate;
  if (bestMove) bestMove.textContent = gameState.currentAnalysis.bestMove;
  if (positionEval) positionEval.textContent = gameState.currentAnalysis.positionEval;
}

function updateGameHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  if (APPLICATION_DATA.gameHistory.length === 0) {
    historyList.innerHTML = `
      <div class="no-history">
        <p style="text-align: center; color: var(--color-text-secondary); font-size: 16px; padding: 20px;">
          🎯 還沒有對局記錄<br>
          開始第一局對弈吧！
        </p>
      </div>
    `;
    return;
  }
  
  let html = '';
  APPLICATION_DATA.gameHistory.forEach(game => {
    const resultClass = game.result === '勝' ? 'win' : 'loss';
    const resultIcon = game.result === '勝' ? '✅' : '❌';
    
    html += `
      <div class="history-item ${resultClass}">
        <div class="result-icon">${resultIcon}</div>
        <div class="game-info">
          <div class="opponent">${game.opponent}</div>
          <div class="details">${game.boardSize} | ${game.moves}手 | ${game.date}</div>
          <div class="analysis-note">${game.analysis}</div>
        </div>
      </div>
    `;
  });
  
  historyList.innerHTML = html;
}

/***************************************************************************
 * 遊戲結束處理
 ***************************************************************************/
function endGame() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  gameState.isAIThinking = false;
  
  const winner = gameState.currentGame.winner || gameState.currentGame.calculateWinner();
  const playerWon = winner === 1;
  
  // 更新統計
  gameState.player.totalGames++;
  if (playerWon) {
    gameState.player.wins++;
    gameState.player.experience += 25;
  } else {
    gameState.player.losses++;
    gameState.player.experience += 10;
  }
  
  // 重新計算勝率
  if (gameState.player.totalGames > 0) {
    gameState.player.winRate = (gameState.player.wins / gameState.player.totalGames) * 100;
  }
  
  // 記錄到遊戲歷史
  const gameRecord = {
    id: Date.now(),
    date: new Date().toLocaleDateString('zh-HK'),
    opponent: `AI-${['初級', '中級', '高級', '段位'][gameState.aiDifficulty - 1]}`,
    result: playerWon ? '勝' : '負',
    boardSize: `${gameState.boardSize}×${gameState.boardSize}`,
    moves: gameState.currentGame.moveHistory.length,
    analysis: playerWon ? '恭喜獲勝！繼續保持' : '失敗是成功之母，繼續努力'
  };
  
  APPLICATION_DATA.gameHistory.unshift(gameRecord);
  if (APPLICATION_DATA.gameHistory.length > 10) {
    APPLICATION_DATA.gameHistory.pop();
  }
  
  // 檢查成就
  checkAndUnlockAchievements(playerWon);
  
  // 更新UI
  updatePlayerInfo();
  updateGameHistory();
  updateGameDisplay();
  
  // 顯示結果
  const resultText = playerWon ? 
    `🎉 恭喜獲勝！\n\n獲得經驗：+25\n目前戰績：${gameState.player.wins}勝${gameState.player.losses}敗\n勝率：${gameState.player.winRate.toFixed(1)}%` :
    `😔 AI獲勝，繼續努力！\n\n獲得經驗：+10\n目前戰績：${gameState.player.wins}勝${gameState.player.losses}敗\n勝率：${gameState.player.winRate.toFixed(1)}%`;
  
  setTimeout(() => {
    alert(resultText);
  }, 500);
  
  console.log(`對局結束：${playerWon ? 'Desmond勝' : 'AI勝'}，當前記錄：${gameState.player.wins}勝${gameState.player.losses}敗`);
}

function checkAndUnlockAchievements(playerWon) {
  const achievements = APPLICATION_DATA.achievements;
  
  // 初次對弈
  if (gameState.player.totalGames === 1 && !achievements["初次對弈"].unlocked) {
    achievements["初次對弈"].unlocked = true;
    showAchievementModal("初次對弈", "完成人生第一盤圍棋");
  }
  
  // 初嘗勝利
  if (playerWon && gameState.player.wins === 1 && !achievements["初嘗勝利"].unlocked) {
    achievements["初嘗勝利"].unlocked = true;
    showAchievementModal("初嘗勝利", "獲得第一場勝利");
  }
}

function showAchievementModal(title, description) {
  const achievementModal = document.getElementById('achievement-modal');
  const achievementContent = document.getElementById('achievement-content');
  
  if (achievementContent) {
    achievementContent.innerHTML = `
      <div class="achievement-unlock">
        <div class="achievement-icon" style="font-size: 48px;">🏆</div>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
    `;
  }
  
  if (achievementModal) {
    achievementModal.classList.add('show');
  }
}

/***************************************************************************
 * 其他功能函數
 ***************************************************************************/
function startGameTimer() {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  gameState.timerInterval = setInterval(() => {
    gameState.gameTimer++;
    const minutes = Math.floor(gameState.gameTimer / 60);
    const seconds = gameState.gameTimer % 60;
    const gameTimer = document.getElementById('game-timer');
    if (gameTimer) {
      gameTimer.textContent = `對局時間：${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function showHint() {
  const hints = APPLICATION_DATA.hints;
  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  
  const hintModal = document.getElementById('hint-modal');
  const hintContent = document.getElementById('hint-modal-content');
  
  if (hintContent) {
    hintContent.innerHTML = `
      <div class="hint-section">
        <h4>💡 當前建議</h4>
        <p style="font-size: 18px; line-height: 1.6;">${randomHint}</p>
      </div>
      <div class="hint-section">
        <h4>🎯 針對性指導</h4>
        <p style="font-size: 16px;">作為${gameState.player.currentLevel}玩家，建議你重點學習：</p>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li>基本規則和氣的概念</li>
          <li>簡單的連接技巧</li>
          <li>提子的基本方法</li>
        </ul>
      </div>
    `;
  }
  
  if (hintModal) {
    hintModal.classList.add('show');
  }
}

function showAnalysis() {
  const reviewModal = document.getElementById('review-modal');
  if (reviewModal) {
    const totalGames = document.getElementById('total-games');
    const winPercentage = document.getElementById('win-percentage');
    const avgExp = document.getElementById('avg-exp');
    const bestStreak = document.getElementById('best-streak');
    
    if (totalGames) totalGames.textContent = gameState.player.totalGames;
    if (winPercentage) winPercentage.textContent = gameState.player.winRate.toFixed(1) + '%';
    if (avgExp) avgExp.textContent = Math.floor(gameState.player.experience / Math.max(1, gameState.player.totalGames));
    if (bestStreak) bestStreak.textContent = '0';
    
    reviewModal.classList.add('show');
  }
}

function undoMove() {
  if (!gameState.currentGame || gameState.currentGame.moveHistory.length === 0) {
    alert('沒有可以悔棋的著手！');
    return;
  }
  
  if (confirm('悔棋將重新開始本局，確定嗎？')) {
    newGame();
  }
}

function bindModalCloseEvents() {
  const modals = ['achievement-modal', 'hint-modal', 'review-modal', 'function-modal'];
  
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
      
      const closeBtn = modal.querySelector('.btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.remove('show');
        });
      }
    }
  });
  
  const closePanelBtn = document.getElementById('close-panel');
  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
      const sidePanel = document.getElementById('side-panel');
      if (sidePanel) {
        sidePanel.style.display = 'none';
      }
    });
  }
}

/***************************************************************************
 * 應用啟動
 ***************************************************************************/
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

console.log('Desmond Ma 圍棋學習平台載入完成！已重置為 0勝0敗，更多功能按鈕已完全修復，建議使用 Netlify 部署');