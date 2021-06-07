const dead = 0, alive = 1;

export class GameOfLife {
    #canvas;
    #cellSize;
    #cellColor;
    #width;
    #height;
    #torus;
    #grid;
    #framesPerSecond;
    #handler;

    constructor(canvas, filler, { size = 10, color = '#FF0000', torus = false, framesPerSecond = 5 } = { }) {
        if (! (canvas instanceof HTMLCanvasElement)) throw TypeError('Invalid canvas!');
        if (filler && typeof filler !== 'function') throw TypeError('Invalid filler!');
        if (typeof size !== 'number') throw TypeError('Invalid size!');
        if (typeof color !== 'string') throw TypeError('Invalid color!');
        if (isNaN(size) || ! isFinite(size) || size < 0) throw RangeError('Size should be in (0, oo)!');

        this.#canvas = canvas;
        this.#width = Math.ceil(canvas.width / size);
        this.#height = Math.ceil(canvas.height / size);
        this.#cellSize = size;
        this.#cellColor = color;
        this.#torus = torus;
        this.#framesPerSecond = framesPerSecond;
        this.#createGrid(filler);
        requestAnimationFrame(() => this.draw());
    }

    get width() { return this.#width; }

    get height() { return this.#height; }

    #createGrid(filler) {
        const grid = new Array(this.#width);
        for (let i = 0; i < this.#width; i += 1) {
            const row = new Array(this.#height);
            if (typeof filler === 'function') {
                for (let j = 0; j <  this.#height; j += 1) {
                    row[j] = filler(i ,j, this) ? alive : dead;
                }
            }
            else {
                row.fill(dead);
            }
            grid[i] = row;
        }
        this.#grid = grid;
    }

    cell(i, j) {
        [i, j] = [Math.round(+i), Math.round(+j)];
        if (isNaN(i) || ! isFinite(i)
            || isNaN(j) || ! isFinite(j)) {
            return dead;
        }
        if (this.#torus) {
            i = i < 0 ? (this.#width + i % this.#width) : (i % this.#width);
            j = j < 0 ? (this.#height + j % this.#height) : (j % this.#height);
        }
        else {
            if (i < 0 || this.#width <= i
                || j < 0 || this.#height <= j) {
                return dead;
            }
        }
        return this.#grid[i][j];
    }

    #neighbours(i, j) {
        const left = i - 1;
        const mid = i;
        const right = i + 1;
        const top = j - 1;
        const center = j;
        const bottom = j + 1;
        return (
            this.cell( left,   top) +
            this.cell(  mid,   top) +
            this.cell(right,   top) +
            this.cell( left,center) +
            this.cell(right,center) +
            this.cell( left,bottom) +
            this.cell(  mid,bottom) +
            this.cell(right,bottom));
    }

    update() {
        let result = 0;
        this.#createGrid((i, j) => {
            const neighbours = this.#neighbours(i, j);
            switch (this.#grid[i][j]) {
                case alive:
                    if (neighbours === 2 || neighbours === 3) {
                        result += 1;
                        return true;
                    }
                    break;
                case dead:
                    if (neighbours === 3) {
                        result += 1;
                        return true;
                    }
                    break;
            }
            return false;
        });
        return result;
    }

    draw() {
        const ctx = this.#canvas.getContext('2d');
        ctx.fillStyle = this.#cellColor;
        for (let i = 0; i < this.#width; i += 1) {
            for (let j = 0; j < this.#height; j += 1) {
                if (this.#grid[i][j] === alive) {
                    ctx.fillRect(i * this.#cellSize, j * this.#cellSize, this.#cellSize, this.#cellSize);
                }
                else {
                    ctx.clearRect(i * this.#cellSize, j * this.#cellSize, this.#cellSize, this.#cellSize);
                }
            }
        }
    }

    start() {
        if (this.#handler !== undefined) return;
        this.#handler = setTimeout(() => {
            requestAnimationFrame(() => {
                this.draw();
                const count = this.update();
                console.log('%c%i%c cells', 'color: red', count, '');
                this.#handler = undefined;
                if (count > 0) {
                    this.start();
                }
            });
        }, 1000 / this.#framesPerSecond);
    }

    stop() {
        if (this.#handler) {
            clearTimeout(this.#handler);
        }
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
                 row.fill(dead);
                 grid.push(row);
            }
        }
        else {
            for (const char of line) {
                switch (char) {
                    case ' ':
                    case '\r':
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
                            grid[y][x] = alive;
                        }
                        else {
                            for (let i = 0; i < runCount; ++i) {
                                grid[y][x + i] = alive;
                            }
                        }
                    case 'b':
                        x += (runCount > 0 ? runCount : 1);
                        runCount = 0;
                        break;
                    case '$':
                        y += 1;
                        x = 0;
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

export function rleFiller(runLengthEncoded) {
    const grid = loadRle(runLengthEncoded);
    console.log(grid);
    const height = grid.length;
    const width = grid.length > 0 ? grid[0].length : 0;
    let tranX, tranY;
    return function (x, y, game) {
        if (! tranX) tranX = Math.floor((game.width - width) / 2);
        if (! tranY) tranY = Math.floor((game.height - height) / 2);
        [x, y]  = [x - tranX, y - tranY];
        return 0 <= x && x < width
            && 0 <= y && y < height
            && grid[y][x] === alive;
    }
}

export function randomFiller(percentage) {
    percentage = Number(percentage);
    if (isNaN(percentage) || percentage < 0 || 1 < percentage) {
        throw new RangeError('Percentage should be in [0, 1]!')
    }
    return () => Math.random() < percentage;
}
