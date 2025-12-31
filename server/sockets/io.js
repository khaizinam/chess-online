

module.exports = io => {
    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null;

        socket.on('move', function (move) {
            console.log('move detected')

            if (games[currentCode]) {
                games[currentCode].moveCount++;
                // Toggle timer
                const game = games[currentCode];
                if (game.activeTimer === 'white') {
                    game.activeTimer = 'black';
                } else if (game.activeTimer === 'black') {
                    game.activeTimer = 'white';
                }

                io.to(currentCode).emit('timeSync', {
                    timers: game.timers,
                    activeTimer: game.activeTimer
                });
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
                const game = games[currentCode];
                game.hasStarted = true;
                // Initialize timers if not started
                if (!game.activeTimer) {
                    game.activeTimer = 'white'; // White starts
                    game.timers = { white: 900, black: 900 };
                }
                io.to(currentCode).emit('startGame');
                io.to(currentCode).emit('timeSync', {
                    timers: game.timers,
                    activeTimer: game.activeTimer
                });
            }
        });

        socket.on('requestReplay', function (data) {
            const code = data.code;
            if (games[code]) {
                games[code].moveCount = 0;
                games[code].timers = { white: 900, black: 900 };
                games[code].activeTimer = 'white';
                // We keep hasStarted true as players are already joined
                io.to(code).emit('gameReplayed');
                io.to(code).emit('timeSync', {
                    timers: games[code].timers,
                    activeTimer: games[code].activeTimer
                });
            }
        });

        socket.on('resign', function (data) {
            const code = data.code;
            const loser = data.color;
            if (games[code]) {
                const winner = loser === 'white' ? 'black' : 'white';
                games[code].activeTimer = null; // Stop timer on surrender
                io.to(code).emit('gameResigned', { winner, loser });
            }
        });

        socket.on('closeRoom', function (data) {
            const code = data.code;
            if (games[code] && games[code].white === socket.id) {
                io.to(code).emit('roomClosed');
                delete games[code];
            }
        });

        socket.on('stopTimer', function (data) {
            const code = data.code;
            if (games[code]) {
                games[code].activeTimer = null;
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
                    games[currentCode].activeTimer = null; // Stop timer on disconnect
                    io.to(currentCode).emit('gameOverDisconnect');
                }

                // If both left, delete game
                if (!games[currentCode].white && !games[currentCode].black) {
                    delete games[currentCode];
                }
            }
        });

    });

    // Background timer tick
    setInterval(() => {
        for (const code in games) {
            const game = games[code];
            if (game.hasStarted && game.activeTimer) {
                game.timers[game.activeTimer]--;

                if (game.timers[game.activeTimer] <= 0) {
                    game.timers[game.activeTimer] = 0;
                    const winner = game.activeTimer === 'white' ? 'black' : 'white';
                    io.to(code).emit('gameOverTimeout', { winner });
                    game.activeTimer = null; // Stop timer
                }

                // Periodic sync every 10 seconds to keep drift low, 
                // but client will also count down locally for smoothness
                if (game.timers[game.activeTimer] % 10 === 0) {
                    io.to(code).emit('timeSync', {
                        timers: game.timers,
                        activeTimer: game.activeTimer
                    });
                }
            }
        }
    }, 1000);
};
