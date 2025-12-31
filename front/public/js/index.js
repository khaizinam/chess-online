const urlParams = new URLSearchParams(window.location.search);

let gameHasStarted = false;
var board = null
var game = new Chess()
var $status = $('#status')
var $pgn = $('#pgn')
let gameOver = false;
const alert = document.getElementById('liveAlertPlaceholder');
const $replayBtn = $('#replayBtn');
const $resignBtn = $('#resignBtn');
const $menuBtn = $('#menuBtn');
const $whiteTimer = $('#whiteTimer');
const $blackTimer = $('#blackTimer');
const $backToMenuBtn = $('#backToMenuBtn');

let whiteTime = 900;
let blackTime = 900;
let activeTimer = null;
let timerInterval = null;

const code = urlParams.get('code');
if (code) {
    $('#roomCodeDisplay').text(code);
}


function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false
    if (!gameHasStarted) return false;
    if (gameOver) return false;

    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }
}

function onDrop(source, target) {
    let theMove = {
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    };
    // see if the move is legal
    var move = game.move(theMove);


    // illegal move
    if (move === null) return 'snapback'

    socket.emit('move', theMove);

    updateStatus()

    if (game.game_over()) {
        socket.emit('stopTimer', { code: urlParams.get('code') });
        if (timerInterval) clearInterval(timerInterval);
        activeTimer = null;
    }
}

socket.on('newMove', function (move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();

    // Check if the move ended the game (from opponent point of view)
    if (game.game_over()) {
        if (timerInterval) clearInterval(timerInterval);
        activeTimer = null;
        updateTimerDisplay();
    }
});

const appendAlert = (title, message, type, timeout = 0) => {
    alert.innerHTML = ''; // Clear previous alerts
    const wrapper = document.createElement('div')
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `<strong>${title}</strong> <div>${message}</div>`,
        ' <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('')

    alert.append(wrapper)

    if (timeout > 0) {
        setTimeout(() => {
            wrapper.remove();
        }, timeout);
    }
}


// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen())
}

function updateStatus() {
    var status = ''

    var moveColor = 'White'
    if (game.turn() === 'b') {
        moveColor = 'Black'
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.'
        appendAlert('Good Job!', status, 'success');
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position'
        appendAlert('Draw', status, 'success');
    }

    else if (gameOver) {
        status = 'Opponent disconnected, you win!'
        appendAlert('Good Job!', status, 'success');
    }

    else if (!gameHasStarted) {
        status = 'Waiting for black to join'
    }

    // game still on
    else {
        const isMyTurn = (playerColor === 'white' && game.turn() === 'w') || (playerColor === 'black' && game.turn() === 'b');
        status = isMyTurn ? 'Your move' : 'Opponent move';

        // check?
        if (game.in_check()) {
            status += ', ' + (moveColor === 'White' ? 'White' : 'Black') + ' is in check'
        }
    }

    $status.html(status);
    $pgn.html(game.pgn({ maxWidth: 5, newline: '<br />' }));

    // Visibility rules
    const isGameOver = game.game_over() || gameOver;

    if (isGameOver) {
        $replayBtn.removeClass('hidden');
        $menuBtn.removeClass('hidden');
        $resignBtn.addClass('hidden');
    } else if (gameHasStarted) {
        $replayBtn.addClass('hidden');
        $menuBtn.addClass('hidden');
        $resignBtn.removeClass('hidden');
    } else {
        $replayBtn.addClass('hidden');
        $menuBtn.addClass('hidden');
        $resignBtn.addClass('hidden');
    }
}

$replayBtn.on('click', function () {
    socket.emit('requestReplay', { code: urlParams.get('code') });
});

$backToMenuBtn.on('click', function () {
    if (playerColor === 'white') {
        if (confirm('Cancel this room and return to menu? All players will be kicked.')) {
            socket.emit('closeRoom', { code: urlParams.get('code') });
        }
    } else {
        window.location.href = '/';
    }
});

$('#copyCodeBtn').on('click', function () {
    const code = urlParams.get('code');
    navigator.clipboard.writeText(code).then(() => {
        const $btn = $(this);
        $btn.find('.copy-icon').addClass('hidden');
        $btn.find('.check-icon').removeClass('hidden');
        setTimeout(() => {
            $btn.find('.copy-icon').removeClass('hidden');
            $btn.find('.check-icon').addClass('hidden');
        }, 2000);
    });
});

$('#shareLinkBtn').on('click', function () {
    const code = urlParams.get('code');
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const shareUrl = window.location.origin + '/' + opponentColor + '?code=' + code;

    if (navigator.share) {
        navigator.share({
            title: 'Join my Chess game!',
            url: shareUrl
        });
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            appendAlert('Shared!', 'Join link copied to clipboard.', 'info', 3000);
        });
    }
});

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
}
board = Chessboard('myBoard', config)
$(window).resize(board.resize)
if (playerColor == 'black') {
    board.flip();
}

updateStatus()

if (urlParams.get('code')) {
    socket.emit('joinGame', {
        code: urlParams.get('code'),
        color: playerColor
    });
}

socket.on('errorJoin', function (type) {
    if (type === 'roleTaken') {
        window.location.replace('/?error=roleTaken');
    } else if (type === 'limitReached') {
        window.location.replace('/?error=limitReached');
    }
});

socket.on('startGame', function () {
    gameHasStarted = true;
    alert.innerHTML = ''; // Clear any waiting messages
    updateStatus()
});

socket.on('gameResigned', function (data) {
    gameOver = true;
    activeTimer = null;
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    const loser = data.loser === 'white' ? 'White' : 'Black';
    const winner = data.winner === 'white' ? 'White' : 'Black';
    const status = `Game Over - ${loser} surrendered. ${winner} wins!`;
    appendAlert('Surrender', status, 'info', 5000);
    $status.html(status);
    updateStatus();
});

socket.on('gameOverDisconnect', function () {
    gameOver = true;
    activeTimer = null;
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    updateStatus()
});
socket.on('gameReplayed', function () {
    game = new Chess();
    board.position('start');
    gameOver = false;
    whiteTime = 900;
    blackTime = 900;
    activeTimer = 'white';
    updateTimerDisplay();
    updateStatus();
    appendAlert('Game Reset', 'The match has been restarted.', 'info', 5000);
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function updateTimerDisplay() {
    $whiteTimer.text(formatTime(whiteTime));
    $blackTimer.text(formatTime(blackTime));

    // Highlight active timer
    if (activeTimer === 'white') {
        $whiteTimer.addClass('text-yellow-400').removeClass('text-white');
        $blackTimer.addClass('text-white').removeClass('text-yellow-400');
    } else if (activeTimer === 'black') {
        $blackTimer.addClass('text-yellow-400').removeClass('text-white');
        $whiteTimer.addClass('text-white').removeClass('text-yellow-400');
    } else {
        $whiteTimer.addClass('text-white').removeClass('text-yellow-400');
        $blackTimer.addClass('text-white').removeClass('text-yellow-400');
    }
}

socket.on('timeSync', function (data) {
    whiteTime = data.timers.white;
    blackTime = data.timers.black;
    activeTimer = data.activeTimer;
    updateTimerDisplay();

    if (timerInterval) clearInterval(timerInterval);
    if (activeTimer && !gameOver) {
        timerInterval = setInterval(() => {
            if (activeTimer === 'white') whiteTime--;
            else if (activeTimer === 'black') blackTime--;

            if (whiteTime < 0) whiteTime = 0;
            if (blackTime < 0) blackTime = 0;
            updateTimerDisplay();
        }, 1000);
    }
});

socket.on('gameOverTimeout', function (data) {
    gameOver = true;
    activeTimer = null;
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    const winner = data.winner === 'white' ? 'White' : 'Black';
    const status = `Game Over - Time out! ${winner} wins!`;
    appendAlert('Time Out', status, 'danger');
    $status.html(status);
    updateStatus();
});

socket.on('roomClosed', function () {
    appendAlert('Room Closed', 'The host has closed the room. Redirecting to menu...', 'warning', 3000);
    setTimeout(() => {
        window.location.href = '/';
    }, 3000);
});
