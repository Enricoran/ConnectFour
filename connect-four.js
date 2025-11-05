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

// Elementi DOM
const gameBoard = document.getElementById('game-board');
const currentPlayerDisplay = document.getElementById('player-color');
const resetButton = document.getElementById('reset-button');
const messageDiv = document.getElementById('message');

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
        const winner = currentPlayer === PLAYER1 ? '1 (Rosso)' : '2 (Giallo)';
        showMessage(`Giocatore ${winner} ha vinto!`, 'win');
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

    // Rimuovi la classe falling quando l'animazione finisce
    cell.addEventListener('animationend', function onAnimationEnd() {
        cell.classList.remove('falling');
        cell.removeEventListener('animationend', onAnimationEnd);
        isAnimating = false;
    }, { once: true });
}

// Aggiorna il display del giocatore corrente
function updatePlayerDisplay() {
    if (currentPlayer === PLAYER1) {
        currentPlayerDisplay.textContent = '1';
        currentPlayerDisplay.style.color = '#e74c3c';
        document.getElementById('current-player').innerHTML =
            'Turno del Giocatore <span id="player-color" style="color: #e74c3c;">1</span> (Rosso)';
    } else {
        currentPlayerDisplay.textContent = '2';
        currentPlayerDisplay.style.color = '#f39c12';
        document.getElementById('current-player').innerHTML =
            'Turno del Giocatore <span id="player-color" style="color: #f39c12;">2</span> (Giallo)';
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
    }

    // Nascondi il messaggio dopo 3 secondi per i warning
    if (type === 'warning') {
        setTimeout(hideMessage, 3000);
    }
}

// Nascondi il messaggio
function hideMessage() {
    messageDiv.className = 'message hidden';
}

// Event listeners
resetButton.addEventListener('click', initGame);

// Avvia il gioco
initGame();
