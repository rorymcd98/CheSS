<h1 align="center">CheSS</h1>

> A Chess variant where moves can be made with CSS

Play now at [chess-css.herokuapp.com](https://chess-css.herokuapp.com/)

##Preview

![text](https://i.imgur.com/tO3bYib.png)

##Game features

- Built-in editor to edit CSS, change how the board operates and looks
- Drag and drop elements (pieces, legend, board) into the editor to automatically generate text
- Hover over pieces to view the available moves, accounting for CSS changes
- Multiplayer supported through socket.io with automatic rejoining and restoring game state

##Instructions

* Get the latest release

* Install Node.js

* Unzip the release and run:

```
npm install .
npm run build
npm run start
```

* Open your browser and visit http://localhost:3000/ (or your environment's specified port)