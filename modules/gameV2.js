/**
 * Game of life module.
 * @module modules/gameV2
 */

/** @const {number} */
const dead = 0;

/** @const {number} */
const alive = 1;

/**
 * @typedef GameSettings
 * @type {object}
 * @property {string} color -Color of the cells.
 * @property {number} size - Size of the cells on the canvas.
 * @property {number} framesPerSecond - Rendering speed.
 */

/**
 * @callback fillerCallback
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {GameOfLife} y - The game.
 */

/**
 * Conway's Game of Life.
 */
export class GameOfLife {
    #canvas;
    #width;
    #height;
    #style;
    #framesPerSecond;
    #cells;
    #handler;

    /**
     * Create a new game.
     * @param {HTMLCanvasElement} canvas - Canvas for drawing.
     * @param {fillerCallback} filler - Grid filling logic.
     * @param {GameSettings} settings - General settings.
     */
    constructor(canvas, filler, { color = '#FF0000', size = 10, framesPerSecond = 5 } = { }) {
        if (! (canvas instanceof HTMLCanvasElement)) throw TypeError('Invalid canvas!');
        if (filler && typeof filler !== 'function') throw TypeError('Invalid filler!');
        if (typeof color !== 'string') throw TypeError('Invalid color!');
        if (typeof size !== 'number') throw TypeError('Invalid size!');
        if (isNaN(size) || ! isFinite(size) || size < 0) throw RangeError('Size should be in (0, oo)!');
        if (typeof framesPerSecond !== 'number') throw TypeError('Invalid framesPerSecond!');

        this.#canvas = canvas;
        this.#width = Math.ceil(canvas.width / size);
        this.#height = Math.ceil(canvas.height / size);
        this.#style = { size, color };
        this.framesPerSecond = framesPerSecond;
        this.#create(filler);
        requestAnimationFrame(() => this.draw());
    }

    /**
     * The width of the grid.
     * @return {number}
     */
    get width() {
        return this.#width;
    }

    /**
     * The height of the grid.
     * @return {number}
     */
    get height() {
        return this.#height;
    }

    #cell(x, y) {
        return this.#cells.find(c => c.x === x && c.y === y) ? alive : dead;
    }

    #neighbours(x, y) {
        const left = x - 1, mid = x, right = x + 1;
        const top = y - 1, center = y, bottom = y + 1;
        return (
            this.#cell( left,   top) +
            this.#cell(  mid,   top) +
            this.#cell(right,   top) +
            this.#cell( left,center) +
            this.#cell(right,center) +
            this.#cell( left,bottom) +
            this.#cell(  mid,bottom) +
            this.#cell(right,bottom));
    }

    #boundaries() {
        let xmin = 0, ymin = 0;
        let xmax = this.#width - 1, ymax = this.#height - 1;
        if (this.#cells) {
            for (const cell of this.#cells) {
                if (cell.x < xmin) xmin = cell.x;
                if (cell.x > xmax) xmax = cell.x;
                if (cell.y < ymin) ymin = cell.y;
                if (cell.y > ymax) ymax = cell.y;
            }
        }
        return { xmin, xmax, ymin, ymax };
    }

    #create(filler) {
        const cells = [];
        if (typeof filler === 'function') {
            const bound = this.#boundaries();
            for (let x = bound.xmin - 1; x < bound.xmax + 1; x += 1) {
                for (let y = bound.ymin - 1; y < bound.ymax + 1; y += 1) {
                    if (filler(x ,y, this)) {
                        cells.push({ x, y });
                    }
                }
            }
        }
        this.#cells = cells;
    }

    /**
     * Get cells state.
     * @param {number} x - The x-coordinate.
     * @param {number} y - The y-coordinate.
     * @returns {number} Dead or Alive.
     */
    cell(x, y) {
        [x, y] = [Math.round(+x), Math.round(+y)];
        if (isNaN(x) || ! isFinite(x)) throw RangeError('x should be finite!');
        if (isNaN(y) || ! isFinite(y)) throw RangeError('y should be finite!');
        return this.#cell(x, y);
    }

    update() {
        this.#create((x, y) => {
            const cell = this.#cell(x, y);
            const neighbours = this.#neighbours(x, y);
            switch (cell) {
                case alive:
                    if (neighbours === 2) return true;
                case dead:
                    if (neighbours === 3) return true;
                default:
                    return false;
            }
        });
        return this.#cells.length;
    }

    draw() {
        requestAnimationFrame(() => {
            const ctx = this.#canvas.getContext('2d');
            ctx.fillStyle = this.#style.color;
            for (let x = 0; x < this.#width; x += 1) {
                for (let y = 0; y < this.#height; y += 1) {
                    if (this.cell(x, y) === alive) {
                        ctx.fillRect(x * this.#style.size, y * this.#style.size, this.#style.size, this.#style.size);
                    }
                    else {
                        ctx.clearRect(x * this.#style.size, y * this.#style.size, this.#style.size, this.#style.size);
                    }
                }
            }
        });
    }

    start() {
        if (this.#handler !== undefined) return;
        this.#handler = setTimeout(
            () => {
                this.draw();
                const count = this.update();
                console.log('%c%i%c cells', 'color: red', count, '');
                if (count === 0) this.draw();
                this.#handler = undefined;
                if (count > 0) this.start();
            },
            1000 / this.#framesPerSecond);
    }

    stop() {
        if (this.#handler) clearTimeout(this.#handler);
        this.#handler = undefined;
    }
}

function loadRle(runLengthEncoded) {
    let grid, runCount = 0, x = 0, y = 0;
    for (let line of runLengthEncoded.split('\n')) {
        line = line.trim();
        if (line === '') continue;
        if (line.startsWith('#')) continue;
        if (! grid) {
            let match = /\s*x\s*=\s*(?<width>\d+),\s*y\s*=\s*(?<height>\d+)(,\s*rule\s*=\s*(?<rule>.+))?/.exec(line);
            if (! match) throw new SyntaxError('Invalid header!', runLengthEncoded);
            const width = Number(match.groups.width);
            const height = Number(match.groups.height);
            grid = [];
            for (let y = 0; y < height; y += 1) {
                 const row = new Array(width);
                 row.fill(false);
                 grid.push(row);
            }
        }
        else {
            for (const char of line) {
                switch (char) {
                    case ' ':
                    case '\t':
                        break;
                    case '0':
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                    case '7':
                    case '8':
                    case '9':
                        runCount = runCount * 10 + Number(char);
                        break;
                    case 'o':
                        if (runCount === 0) {
                            grid[y][x] = true;
                        }
                        else {
                            for (let i = 0; i < runCount; ++i) {
                                grid[y][x + i] = true;
                            }
                        }
                    case 'b':
                        x += (runCount > 0 ? runCount : 1);
                        runCount = 0;
                        break;
                    case '$':
                        x = 0;
                        y += 1;
                        break;
                    case '!':
                        return grid;
                    default:
                        throw new SyntaxError('Invalid tag!', runLengthEncoded);
                }
            }
        }
    }
}

/**
 * Run Length Encoded File filler.
 * @param {string} runLengthEncoded - Source.
 * @returns {fillerCallback} The filler function.
 */
export function rleFiller(runLengthEncoded) {
    const grid = loadRle(runLengthEncoded);
    const height = grid.length;
    const width = grid.length > 0 ? grid[0].length : 0;
    let tranX, tranY;
    return function (x, y, game) {
        if (! tranX) tranX = Math.floor((game.width - width) / 2);
        if (! tranY) tranY = Math.floor((game.height - height) / 2);
        [x, y]  = [x - tranX, y - tranY];
        return 0 <= x && x < width
            && 0 <= y && y < height
            && grid[y][x];
    }
}

export function randomFiller(percentage) {
    percentage = Number(percentage);
    if (isNaN(percentage) || percentage < 0 || 1 < percentage) {
        throw new RangeError('Percentage should be in [0, 1]!')
    }
    return () => Math.random() < percentage;
}
