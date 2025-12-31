# Chess
This is an upgraded version of [almatrass/chess-site](https://github.com/khaizinam/check-html)
This version contains better CSS styling, JS game code checking mechanism.

**This project does not work on mobile**

> *Has been tested on **Google Chrome**, **Edge**, **FireFox**, **Chromium**, and **Opera** web browsers.*

<hr>

### Multi-player & Multi-room Support

This project supports **multiple simultaneous games** using a "Game Code" system.
- **Independent Rooms**: Each unique "Game Code" creates an isolated room. Players with the same code play against each other without interference from other rooms.
- **Simultaneous Games**: You can have dozens of pairs playing in different rooms at the same time.
- **How to use**:
    1. Create a game by typing in a unique code (e.g., `my-secret-room-123`).
    2. Share this code with your opponent.
    3. Both players will be in the same game instance.

## Dependencies:

|      Library      |    Version     |
|-------------------|----------------|
|dotenv             | ^16.3.1        |
|express            | ^4.18.2        |
|express-handlebars | ^7.0.7         |
|http               | ^0.0.1-security|
|path               | ^0.12.7        |
|socket.io          | ^4.7.2         |


### Instructions (building and deploying on local network):

To install dependencies:

```
yarn
```

To start the server:

```
yarn start
```
