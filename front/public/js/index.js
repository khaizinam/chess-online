
let gameHasStarted = false;
var board = null
var game = new Chess()
var $status = $('#status')
var $pgn = $('#pgn')
let gameOver = false;
const alert = document.getElementById('liveAlertPlaceholder');
const $replayBtn = $('#replayBtn');


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
}

socket.on('newMove', function (move) {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});

const appendAlert = (title, message, type) => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `<strong>${title}</strong> <div>${message}</div>`,
        ' <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('')

    alert.append(wrapper)
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
        status = moveColor + ' to move'

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check'
        }

    }

    $status.html(status);
    $pgn.html(game.pgn({ maxWidth: 5, newline: '<br />' }));

    // Show replay button if game is over
    if (game.game_over() || gameOver) {
        $replayBtn.removeClass('hidden');
    } else {
        $replayBtn.addClass('hidden');
    }
}

$replayBtn.on('click', function () {
    socket.emit('requestReplay', { code: urlParams.get('code') });
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

var urlParams = new URLSearchParams(window.location.search);
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
    updateStatus()
});

socket.on('gameOverDisconnect', function () {
    gameOver = true;
    updateStatus()
});
socket.on('gameReplayed', function () {
    game = new Chess();
    board.position('start');
    gameOver = false;
    updateStatus();
    appendAlert('Game Reset', 'The match has been restarted.', 'info');
});
