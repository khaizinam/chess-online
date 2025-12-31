module.exports = {
    apps: [{
        name: 'chess-game',
        script: 'npm',
        args: 'start',
        env: {
            NODE_ENV: 'production',
        },
        env_development: {
            NODE_ENV: 'development',
        }
    }]
};
