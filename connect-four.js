// Costanti del gioco
const ROWS = 6;
const COLS = 7;
const PLAYER1 = 'red';
const PLAYER2 = 'yellow';

// Stato del gioco
let board = [];
let currentPlayer = PLAYER1;
let gameActive = true;
let moves = 0;
let isAnimating = false;
let isMuted = true;
let isAIMode = false;
let aiLevel = 1;

// Elementi DOM
const gameBoard = document.getElementById('game-board');
const currentPlayerDisplay = document.getElementById('player-color');
const resetButton = document.getElementById('reset-button');
const messageDiv = document.getElementById('message');
const audioButton = document.getElementById('audio-button');
const modePvPButton = document.getElementById('mode-pvp');
const modeAIButton = document.getElementById('mode-ai');
const levelDisplay = document.getElementById('level-display');
const aiLevelSpan = document.getElementById('ai-level');

// Audio Context per generare il suono
let audioContext = null;

// Inizializza l'AudioContext (viene creato al primo click per policy del browser)
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Genera il suono di caduta della pedina
function playDropSound() {
    if (isMuted || !audioContext) return;

    const now = audioContext.currentTime;

    // Crea un oscillatore per il suono
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Suono di impatto: frequenza che scende rapidamente
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    // Volume che diminuisce
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.type = 'triangle';
    oscillator.start(now);
    oscillator.stop(now + 0.15);
}

// Toggle mute/unmute
function toggleAudio() {
    initAudioContext();
    isMuted = !isMuted;

    if (isMuted) {
        audioButton.textContent = '🔇';
        audioButton.classList.remove('unmuted');
    } else {
        audioButton.textContent = '🔊';
        audioButton.classList.add('unmuted');
        // Riproduci un suono di test quando si attiva l'audio
        playDropSound();
    }
}

// Imposta la modalità Giocatore vs Giocatore
function setModePvP() {
    isAIMode = false;
    modePvPButton.classList.add('active');
    modeAIButton.classList.remove('active');
    levelDisplay.classList.add('hidden');
    initGame();
}

// Imposta la modalità Giocatore vs Computer
function setModeAI() {
    isAIMode = true;
    aiLevel = 1; // Riparte sempre dal livello 1
    modePvPButton.classList.remove('active');
    modeAIButton.classList.add('active');
    levelDisplay.classList.remove('hidden');
    updateLevelDisplay();
    initGame();
}

// Aggiorna il display del livello
function updateLevelDisplay() {
    aiLevelSpan.textContent = aiLevel;
}

// ========== AI DEL COMPUTER ==========

// Ottieni tutte le colonne valide (non piene)
function getValidColumns() {
    const validCols = [];
    for (let col = 0; col < COLS; col++) {
        if (getLowestEmptyRow(col) !== -1) {
            validCols.push(col);
        }
    }
    return validCols;
}

// Verifica se una mossa porta alla vittoria
function isWinningMove(row, col, player) {
    // Salva lo stato attuale
    const originalValue = board[row][col];
    board[row][col] = player;

    const directions = [
        { dr: 0, dc: 1 },  // Orizzontale
        { dr: 1, dc: 0 },  // Verticale
        { dr: 1, dc: 1 },  // Diagonale \
        { dr: 1, dc: -1 }  // Diagonale /
    ];

    let isWin = false;
    for (const { dr, dc } of directions) {
        let count = 1;
        // Controlla in una direzione
        count += countDirectionForAI(row, col, dr, dc, player);
        // Controlla nella direzione opposta
        count += countDirectionForAI(row, col, -dr, -dc, player);

        if (count >= 4) {
            isWin = true;
            break;
        }
    }

    // Ripristina lo stato originale
    board[row][col] = originalValue;
    return isWin;
}

// Conta i dischi consecutivi in una direzione (per AI)
function countDirectionForAI(row, col, dr, dc, player) {
    let count = 0;
    let r = row + dr;
    let c = col + dc;

    while (
        r >= 0 && r < ROWS &&
        c >= 0 && c < COLS &&
        board[r][c] === player
    ) {
        count++;
        r += dr;
        c += dc;
    }

    return count;
}

// Livello 1: Mosse casuali
function aiLevel1() {
    const validCols = getValidColumns();
    return validCols[Math.floor(Math.random() * validCols.length)];
}

// Livello 2: Blocca vittorie immediate + mosse casuali
function aiLevel2() {
    const validCols = getValidColumns();

    // Prima, cerca di bloccare una vittoria immediata dell'avversario
    for (const col of validCols) {
        const row = getLowestEmptyRow(col);
        if (isWinningMove(row, col, PLAYER1)) {
            return col;
        }
    }

    // Altrimenti mossa casuale
    return validCols[Math.floor(Math.random() * validCols.length)];
}

// Livello 3: Vinci se possibile, altrimenti blocca, altrimenti casuale
function aiLevel3() {
    const validCols = getValidColumns();

    // Prima, cerca una mossa vincente
    for (const col of validCols) {
        const row = getLowestEmptyRow(col);
        if (isWinningMove(row, col, PLAYER2)) {
            return col;
        }
    }

    // Poi, blocca una vittoria immediata dell'avversario
    for (const col of validCols) {
        const row = getLowestEmptyRow(col);
        if (isWinningMove(row, col, PLAYER1)) {
            return col;
        }
    }

    // Altrimenti preferisci colonne centrali
    const centerCol = Math.floor(COLS / 2);
    if (validCols.includes(centerCol)) {
        return centerCol;
    }

    // Altrimenti mossa casuale
    return validCols[Math.floor(Math.random() * validCols.length)];
}

// Valuta la posizione del tabellone per l'AI
function evaluateBoard() {
    let score = 0;

    // Valuta le righe
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col <= COLS - 4; col++) {
            const window = [board[row][col], board[row][col+1], board[row][col+2], board[row][col+3]];
            score += evaluateWindow(window);
        }
    }

    // Valuta le colonne
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row <= ROWS - 4; row++) {
            const window = [board[row][col], board[row+1][col], board[row+2][col], board[row+3][col]];
            score += evaluateWindow(window);
        }
    }

    // Valuta le diagonali positive
    for (let row = 0; row <= ROWS - 4; row++) {
        for (let col = 0; col <= COLS - 4; col++) {
            const window = [board[row][col], board[row+1][col+1], board[row+2][col+2], board[row+3][col+3]];
            score += evaluateWindow(window);
        }
    }

    // Valuta le diagonali negative
    for (let row = 3; row < ROWS; row++) {
        for (let col = 0; col <= COLS - 4; col++) {
            const window = [board[row][col], board[row-1][col+1], board[row-2][col+2], board[row-3][col+3]];
            score += evaluateWindow(window);
        }
    }

    return score;
}

// Valuta una finestra di 4 celle
function evaluateWindow(window) {
    let score = 0;
    const aiCount = window.filter(cell => cell === PLAYER2).length;
    const playerCount = window.filter(cell => cell === PLAYER1).length;
    const emptyCount = window.filter(cell => cell === null).length;

    // Punteggio per AI (giallo)
    if (aiCount === 4) score += 100;
    else if (aiCount === 3 && emptyCount === 1) score += 5;
    else if (aiCount === 2 && emptyCount === 2) score += 2;

    // Penalità per giocatore (rosso)
    if (playerCount === 3 && emptyCount === 1) score -= 4;

    return score;
}

// Verifica se il tabellone è pieno
function isBoardFull() {
    return moves >= ROWS * COLS;
}

// Verifica se c'è una vittoria sul tabellone
function checkBoardWin(player) {
    const directions = [
        { dr: 0, dc: 1 },  // Orizzontale
        { dr: 1, dc: 0 },  // Verticale
        { dr: 1, dc: 1 },  // Diagonale \
        { dr: 1, dc: -1 }  // Diagonale /
    ];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] === player) {
                for (const { dr, dc } of directions) {
                    let count = 1;
                    let r = row + dr;
                    let c = col + dc;

                    while (
                        r >= 0 && r < ROWS &&
                        c >= 0 && c < COLS &&
                        board[r][c] === player
                    ) {
                        count++;
                        r += dr;
                        c += dc;
                    }

                    if (count >= 4) return true;
                }
            }
        }
    }
    return false;
}

// Algoritmo minimax con alpha-beta pruning
function minimax(depth, alpha, beta, maximizingPlayer) {
    const validCols = getValidColumns();

    // Condizioni terminali
    if (checkBoardWin(PLAYER2)) return [null, 100000];
    if (checkBoardWin(PLAYER1)) return [null, -100000];
    if (validCols.length === 0) return [null, 0];
    if (depth === 0) return [null, evaluateBoard()];

    if (maximizingPlayer) {
        let value = -Infinity;
        let column = validCols[Math.floor(Math.random() * validCols.length)];

        for (const col of validCols) {
            const row = getLowestEmptyRow(col);
            board[row][col] = PLAYER2;
            moves++;

            const newScore = minimax(depth - 1, alpha, beta, false)[1];

            board[row][col] = null;
            moves--;

            if (newScore > value) {
                value = newScore;
                column = col;
            }

            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }

        return [column, value];
    } else {
        let value = Infinity;
        let column = validCols[Math.floor(Math.random() * validCols.length)];

        for (const col of validCols) {
            const row = getLowestEmptyRow(col);
            board[row][col] = PLAYER1;
            moves++;

            const newScore = minimax(depth - 1, alpha, beta, true)[1];

            board[row][col] = null;
            moves--;

            if (newScore < value) {
                value = newScore;
                column = col;
            }

            beta = Math.min(beta, value);
            if (alpha >= beta) break;
        }

        return [column, value];
    }
}

// Livello 4: Minimax con profondità 3
function aiLevel4() {
    const [col] = minimax(3, -Infinity, Infinity, true);
    return col;
}

// Livello 5: Minimax con profondità 5
function aiLevel5() {
    const [col] = minimax(5, -Infinity, Infinity, true);
    return col;
}

// Esegue la mossa dell'AI in base al livello
function makeAIMove() {
    let col;

    switch (aiLevel) {
        case 1:
            col = aiLevel1();
            break;
        case 2:
            col = aiLevel2();
            break;
        case 3:
            col = aiLevel3();
            break;
        case 4:
            col = aiLevel4();
            break;
        case 5:
            col = aiLevel5();
            break;
        default:
            col = aiLevel1();
    }

    // Esegui la mossa con un piccolo delay per renderla più naturale
    setTimeout(() => {
        handleCellClick(col);
    }, 500);
}

// Inizializzazione del gioco
function initGame() {
    // Crea la griglia vuota
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    currentPlayer = PLAYER1;
    gameActive = true;
    moves = 0;
    isAnimating = false;

    // Pulisce e crea il tabellone
    gameBoard.innerHTML = '';

    // Crea le celle (dal basso verso l'alto per effetto visivo migliore)
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(col));
            gameBoard.appendChild(cell);
        }
    }

    updatePlayerDisplay();
    hideMessage();
}

// Gestione del click su una colonna
function handleCellClick(col) {
    if (!gameActive || isAnimating) return;

    // Trova la prima riga disponibile dal basso
    const row = getLowestEmptyRow(col);

    if (row === -1) {
        // Colonna piena
        showMessage('Colonna piena! Scegli un\'altra colonna.', 'warning');
        return;
    }

    // Piazza il disco
    board[row][col] = currentPlayer;
    updateCell(row, col, currentPlayer);
    moves++;

    // Controlla vittoria
    if (checkWin(row, col)) {
        gameActive = false;

        if (isAIMode) {
            if (currentPlayer === PLAYER1) {
                // Il giocatore ha vinto
                showMessage(`Hai vinto! Livello ${aiLevel} superato!`, 'win');

                // Aumenta il livello se non è già al massimo
                if (aiLevel < 5) {
                    aiLevel++;
                    updateLevelDisplay();
                    setTimeout(() => {
                        showMessage(`Prossimo livello: ${aiLevel}`, 'info');
                    }, 2000);
                } else {
                    setTimeout(() => {
                        showMessage(`Complimenti! Hai battuto tutti i livelli!`, 'win');
                    }, 2000);
                }
            } else {
                // L'AI ha vinto
                showMessage(`Il Computer ha vinto! Riprova...`, 'lose');
            }
        } else {
            const winner = currentPlayer === PLAYER1 ? '1 (Rosso)' : '2 (Giallo)';
            showMessage(`Giocatore ${winner} ha vinto!`, 'win');
        }
        return;
    }

    // Controlla pareggio
    if (moves === ROWS * COLS) {
        gameActive = false;
        showMessage('Pareggio! La griglia è piena.', 'draw');
        return;
    }

    // Cambia giocatore
    currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
    updatePlayerDisplay();

    // Se è la modalità AI ed è il turno del computer, fai giocare l'AI
    if (isAIMode && currentPlayer === PLAYER2 && gameActive) {
        makeAIMove();
    }
}

// Trova la riga più bassa disponibile in una colonna
function getLowestEmptyRow(col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col] === null) {
            return row;
        }
    }
    return -1;
}

// Aggiorna la visualizzazione di una cella con animazione di caduta
function updateCell(row, col, player) {
    const cells = document.querySelectorAll('.cell');
    const index = row * COLS + col;
    const cell = cells[index];

    // Blocca i click durante l'animazione
    isAnimating = true;

    // Calcola la distanza di caduta (dalla riga 0 alla riga target)
    // Ogni cella ha un'altezza approssimativa, calcoliamo la distanza in pixel
    const cellSize = cell.offsetHeight + 10; // altezza cella + gap
    const fallDistance = -(row * cellSize + cellSize * 2); // distanza dalla cima

    // Imposta la variabile CSS per la distanza di caduta
    cell.style.setProperty('--fall-distance', `${fallDistance}px`);

    // Aggiungi prima il colore e poi l'animazione
    cell.classList.add(player);
    cell.classList.add('falling');

    // Rimuovi la classe falling quando l'animazione finisce e riproduci il suono
    cell.addEventListener('animationend', function onAnimationEnd() {
        cell.classList.remove('falling');
        cell.removeEventListener('animationend', onAnimationEnd);
        isAnimating = false;

        // Riproduci il suono di caduta quando la pedina raggiunge la destinazione
        playDropSound();
    }, { once: true });
}

// Aggiorna il display del giocatore corrente
function updatePlayerDisplay() {
    if (currentPlayer === PLAYER1) {
        currentPlayerDisplay.textContent = '1';
        currentPlayerDisplay.style.color = '#e74c3c';
        if (isAIMode) {
            document.getElementById('current-player').innerHTML =
                'Turno del <span id="player-color" style="color: #e74c3c;">Giocatore</span> (Rosso)';
        } else {
            document.getElementById('current-player').innerHTML =
                'Turno del Giocatore <span id="player-color" style="color: #e74c3c;">1</span> (Rosso)';
        }
    } else {
        currentPlayerDisplay.textContent = '2';
        currentPlayerDisplay.style.color = '#f39c12';
        if (isAIMode) {
            document.getElementById('current-player').innerHTML =
                'Turno del <span id="player-color" style="color: #f39c12;">Computer</span> (Giallo)';
        } else {
            document.getElementById('current-player').innerHTML =
                'Turno del Giocatore <span id="player-color" style="color: #f39c12;">2</span> (Giallo)';
        }
    }
}

// Controlla se c'è una vittoria
function checkWin(row, col) {
    const directions = [
        { dr: 0, dc: 1 },  // Orizzontale
        { dr: 1, dc: 0 },  // Verticale
        { dr: 1, dc: 1 },  // Diagonale \
        { dr: 1, dc: -1 }  // Diagonale /
    ];

    for (const { dr, dc } of directions) {
        let count = 1;
        const winningCells = [{ row, col }];

        // Controlla in una direzione
        count += countDirection(row, col, dr, dc, winningCells);
        // Controlla nella direzione opposta
        count += countDirection(row, col, -dr, -dc, winningCells);

        if (count >= 4) {
            highlightWinningCells(winningCells);
            return true;
        }
    }

    return false;
}

// Conta i dischi consecutivi in una direzione
function countDirection(row, col, dr, dc, winningCells) {
    let count = 0;
    let r = row + dr;
    let c = col + dc;

    while (
        r >= 0 && r < ROWS &&
        c >= 0 && c < COLS &&
        board[r][c] === currentPlayer
    ) {
        count++;
        winningCells.push({ row: r, col: c });
        r += dr;
        c += dc;
    }

    return count;
}

// Evidenzia le celle vincenti
function highlightWinningCells(cells) {
    cells.forEach(({ row, col }) => {
        const cellElements = document.querySelectorAll('.cell');
        const index = row * COLS + col;
        cellElements[index].classList.add('winning');
    });
}

// Mostra un messaggio
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message';

    if (type === 'warning') {
        messageDiv.style.background = '#e67e22';
    } else if (type === 'win') {
        messageDiv.style.background = '#2ecc71';
    } else if (type === 'draw') {
        messageDiv.style.background = '#95a5a6';
    } else if (type === 'lose') {
        messageDiv.style.background = '#e74c3c';
    } else if (type === 'info') {
        messageDiv.style.background = '#3498db';
    }

    // Nascondi il messaggio dopo 3 secondi per i warning e info
    if (type === 'warning' || type === 'info') {
        setTimeout(hideMessage, 3000);
    }
}

// Nascondi il messaggio
function hideMessage() {
    messageDiv.className = 'message hidden';
}

// Event listeners
resetButton.addEventListener('click', initGame);
audioButton.addEventListener('click', toggleAudio);
modePvPButton.addEventListener('click', setModePvP);
modeAIButton.addEventListener('click', setModeAI);

// Avvia il gioco
initGame();
