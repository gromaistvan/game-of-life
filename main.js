import { GameOfLife, randomFiller, rleFiller } from './modules/gameV2.js';

let game;

document.getElementById('random').addEventListener('click', () => {
    let restart = false;
    if (game && game.running) {
        game.stop();
        restart = true;
    }
    const percentage = Number(document.getElementById('percentage').value) / 100;
    const canvas = document.getElementById('canvas');
    game = new GameOfLife(canvas, randomFiller(percentage), { size: 20, color: 'steelblue', torus: true, framesPerSecond: 10 });
    if (restart) game.start();
});

document.getElementById('file').addEventListener('change', (event) => {
    if (! event.target
        || ! (event.target.files instanceof FileList)
        || event.target.files.length === 0) {
        return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
        let restart = false;
        if (game && game.running) {
            game.stop();
            restart = true;
        }
        const canvas = document.getElementById('canvas');
        game = new GameOfLife(canvas, rleFiller(event.target.result), { size: 12, color: 'red', torus: true, framesPerSecond: 10 });
        if (restart) game.start();
    });
    reader.readAsText(event.target.files[0]);
});

document.getElementById('start').addEventListener('click', () => {
    if (game && ! game.running) game.start();
});

document.getElementById('stop').addEventListener('click', () => {
    if (game && game.running) game.stop();
});
