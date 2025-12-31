module.exports = app => {

    app.get('/', (req, res) => {
        res.render('index');
    });

    app.get('/white', (req, res) => {
        const currentGames = Object.keys(games).length;
        if (currentGames >= MAX_GAMES && !games[req.query.code]) {
            return res.redirect('/?error=limitReached');
        }

        res.render('game', {
            color: 'white'
        });
    });
    app.get('/black', (req, res) => {
        if (!games[req.query.code]) {
            return res.redirect('/?error=invalidCode');
        }

        res.render('game', {
            color: 'black'
        });
    });
};