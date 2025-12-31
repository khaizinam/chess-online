

module.exports = io => {
    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null;

        socket.on('move', function (move) {
            console.log('move detected')

            if (games[currentCode]) {
                games[currentCode].moveCount++;
            }

            io.to(currentCode).emit('newMove', move);
        });

        socket.on('joinGame', function (data) {
            currentCode = data.code;
            const color = data.color;

            if (!games[currentCode]) {
                if (Object.keys(games).length >= MAX_GAMES) {
                    return socket.emit('errorJoin', 'limitReached');
                }
                games[currentCode] = { white: null, black: null, hasStarted: false, moveCount: 0 };
            }

            if (color === 'white' || color === 'black') {
                if (games[currentCode][color]) {
                    return socket.emit('errorJoin', 'roleTaken');
                }
                games[currentCode][color] = socket.id;
            }

            socket.join(currentCode);

            if (games[currentCode].white && games[currentCode].black) {
                games[currentCode].hasStarted = true;
                io.to(currentCode).emit('startGame');
            }
        });

        socket.on('requestReplay', function (data) {
            const code = data.code;
            if (games[code]) {
                games[code].moveCount = 0;
                // We keep hasStarted true as players are already joined
                io.to(code).emit('gameReplayed');
            }
        });

        socket.on('disconnect', function () {
            console.log('socket disconnected');

            if (currentCode && games[currentCode]) {
                const isPlayer = games[currentCode].white === socket.id || games[currentCode].black === socket.id;
                const activeGame = games[currentCode].hasStarted && games[currentCode].moveCount > 0;

                // Free the role
                if (games[currentCode].white === socket.id) games[currentCode].white = null;
                if (games[currentCode].black === socket.id) games[currentCode].black = null;

                // Emmit Game Over only if an active player left during an ONGOING game
                if (isPlayer && activeGame) {
                    io.to(currentCode).emit('gameOverDisconnect');
                }

                // If both left, delete game
                if (!games[currentCode].white && !games[currentCode].black) {
                    delete games[currentCode];
                }
            }
        });

    });
};