class KeyAndDoorGame {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 3;
        this.gridSizes = { 1: 5, 2: 7, 3: 10 };
        this.timeLimit = 5 * 60; // 5 minutes in seconds
        
        this.gameState = {
            grid: [],
            playerPos: { x: 0, y: 0 },
            startPos: { x: 0, y: 0 },
            keyPos: { x: 0, y: 0 },
            doorPos: { x: 0, y: 0 },
            walls: new Set(), // stores "x1,y1,x2,y2" for walls between cells
            visitedCells: new Set(),
            keyCollected: false,
            timeRemaining: this.timeLimit,
            isGameOver: false
        };
        
        this.timerInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.startLevel(1);
    }
    
    initializeElements() {
        this.gridElement = document.getElementById('game-grid');
        this.currentLevelElement = document.getElementById('current-level');
        this.timerElement = document.getElementById('timer');
        this.keyStatusElement = document.getElementById('key-status');
        this.messageOverlay = document.getElementById('message-overlay');
        this.messageTitle = document.getElementById('message-title');
        this.messageText = document.getElementById('message-text');
        this.messageBtn = document.getElementById('message-btn');
        
        // Arrow buttons
        this.upBtn = document.getElementById('up-btn');
        this.downBtn = document.getElementById('down-btn');
        this.leftBtn = document.getElementById('left-btn');
        this.rightBtn = document.getElementById('right-btn');
        
        // Control buttons
        this.restartBtn = document.getElementById('restart-btn');
    }
    
    setupEventListeners() {
        // Arrow button clicks
        this.upBtn.addEventListener('click', () => this.movePlayer(0, -1));
        this.downBtn.addEventListener('click', () => this.movePlayer(0, 1));
        this.leftBtn.addEventListener('click', () => this.movePlayer(-1, 0));
        this.rightBtn.addEventListener('click', () => this.movePlayer(1, 0));
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameState.isGameOver) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.movePlayer(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.movePlayer(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.movePlayer(1, 0);
                    break;
            }
        });
        
        // Control buttons
        this.restartBtn.addEventListener('click', () => this.restartLevel());
        this.messageBtn.addEventListener('click', () => this.hideMessage());
    }
    
    startLevel(level) {
        this.currentLevel = level;
        this.currentLevelElement.textContent = level;
        
        const gridSize = this.gridSizes[level];
        this.initializeGrid(gridSize);
        this.generateLevel(gridSize);
        this.resetTimer();
        this.startTimer();
        this.updateDisplay();
        
        this.showMessage(
            `Level ${level}`,
            `Navigate the ${gridSize}x${gridSize} grid to find the key and reach the door!`,
            'Start!'
        );
    }
    
    initializeGrid(size) {
        this.gameState.grid = Array(size).fill().map(() => Array(size).fill(0));
        this.gameState.visitedCells.clear();
        this.gameState.keyCollected = false;
        this.gameState.walls.clear();
        
        // Update grid CSS class for sizing
        this.gridElement.className = `grid size-${size}`;
        this.gridElement.innerHTML = '';
        
        // Create grid cells
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                this.gridElement.appendChild(cell);
            }
        }
    }
    
    generateLevel(size) {
        // Generate positions ensuring solvability
        const positions = this.generateSolvableLevel(size);
        
        this.gameState.playerPos = { ...positions.start };
        this.gameState.startPos = { ...positions.start };
        this.gameState.keyPos = { ...positions.key };
        this.gameState.doorPos = { ...positions.door };
        this.gameState.walls = new Set(positions.walls);
    }
    
    generateSolvableLevel(size) {
        let attempts = 0;
        const maxAttempts = 50; // Reduced attempts for faster generation
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Generate positions with better distribution
            const start = { x: 0, y: 0 }; // Always start at top-left for consistency
            const key = { 
                x: Math.floor(Math.random() * size), 
                y: Math.floor(Math.random() * size) 
            };
            const door = { 
                x: Math.floor(Math.random() * size), 
                y: Math.floor(Math.random() * size) 
            };
            
            // Ensure positions are different
            if ((key.x === start.x && key.y === start.y) || 
                (door.x === start.x && door.y === start.y) || 
                (door.x === key.x && door.y === key.y)) {
                continue;
            }
            
            // Create walls using safer method
            const walls = this.generateWallsSafely(size, start, key, door);
            
            // Always verify paths exist before returning
            if (this.hasValidPath(size, start, key, door, walls)) {
                return { start, key, door, walls };
            }
        }
        
        // Fallback: create a simple solvable level
        return this.createSimpleSolvableLevel(size);
    }
    
    createGuaranteedPath(size, start, key, door) {
        // Create a path from start -> key -> door
        const pathCells = new Set();
        
        // Path from start to key
        let current = { ...start };
        while (current.x !== key.x || current.y !== key.y) {
            pathCells.add(`${current.x},${current.y}`);
            
            if (current.x < key.x) current.x++;
            else if (current.x > key.x) current.x--;
            else if (current.y < key.y) current.y++;
            else if (current.y > key.y) current.y--;
        }
        pathCells.add(`${key.x},${key.y}`);
        
        // Path from key to door
        current = { ...key };
        while (current.x !== door.x || current.y !== door.y) {
            pathCells.add(`${current.x},${current.y}`);
            
            if (current.x < door.x) current.x++;
            else if (current.x > door.x) current.x--;
            else if (current.y < door.y) current.y++;
            else if (current.y > door.y) current.y--;
        }
        pathCells.add(`${door.x},${door.y}`);
        
        return pathCells;
    }
    
    generateWallsSafely(size, start, key, door) {
        const walls = [];
        
        // Higher wall density for more challenging gameplay
        let wallDensity;
        if (size === 5) wallDensity = 0.5; // Level 1: 50% walls
        else if (size === 7) wallDensity = 0.7; // Level 2: 70% walls
        else wallDensity = 0.85; // Level 3: 85% walls
        
        // Create essential paths first to protect them
        const essentialCells = this.getEssentialPathCells(size, start, key, door);
        
        // Add walls carefully, testing each one
        const maxWallAttempts = size * size; // Try many positions
        
        for (let attempt = 0; attempt < maxWallAttempts; attempt++) {
            if (Math.random() > wallDensity) continue;
            
            let wallKey;
            
            if (Math.random() > 0.5) {
                // Try horizontal wall
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * (size - 1));
                wallKey = `${x},${y},${x},${y + 1}`;
            } else {
                // Try vertical wall
                const x = Math.floor(Math.random() * (size - 1));
                const y = Math.floor(Math.random() * size);
                wallKey = `${x},${y},${x + 1},${y}`;
            }
            
            // Skip if wall already exists
            if (walls.some(w => w === wallKey)) continue;
            
            // Don't block essential path connections
            if (this.wouldBlockEssentialPath(wallKey, essentialCells)) continue;
            
            // Test if this wall maintains connectivity
            const testWalls = [...walls, wallKey];
            const wallSet = new Set(testWalls);
            
            // Check both paths before adding wall
            if (this.findPath(size, start, key, wallSet) && 
                this.findPath(size, key, door, wallSet)) {
                walls.push(wallKey);
            }
        }
        
        return walls;
    }
    
    getEssentialPathCells(size, start, key, door) {
        // Get cells that are part of the direct paths
        const essential = new Set();
        
        // Add start, key, door positions
        essential.add(`${start.x},${start.y}`);
        essential.add(`${key.x},${key.y}`);
        essential.add(`${door.x},${door.y}`);
        
        // Add some cells around key paths to ensure connectivity
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
        ];
        
        [start, key, door].forEach(pos => {
            directions.forEach(dir => {
                const nx = pos.x + dir.x;
                const ny = pos.y + dir.y;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    essential.add(`${nx},${ny}`);
                }
            });
        });
        
        return essential;
    }
    
    wouldBlockEssentialPath(wallKey, essentialCells) {
        // Parse wall coordinates
        const parts = wallKey.split(',').map(Number);
        const [x1, y1, x2, y2] = parts;
        
        // Check if wall would separate essential cells
        const cell1 = `${x1},${y1}`;
        const cell2 = `${x2},${y2}`;
        
        // Don't place walls between essential cells
        return essentialCells.has(cell1) && essentialCells.has(cell2);
    }
    

    

    
    generateWallsBetweenCells(size) {
        // This method is now replaced by generateWallsWithPath
        // but keeping it for backward compatibility
        const walls = [];
        
        // Much lower wall density to ensure solvability
        const wallDensity = 0.2;
        
        // Add horizontal walls
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size; x++) {
                if (Math.random() < wallDensity) {
                    walls.push(`${x},${y},${x},${y + 1}`);
                }
            }
        }
        
        // Add vertical walls
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size - 1; x++) {
                if (Math.random() < wallDensity) {
                    walls.push(`${x},${y},${x + 1},${y}`);
                }
            }
        }
        
        return walls;
    }
    

    
    createSimpleSolvableLevel(size) {
        const start = { x: 0, y: 0 };
        const key = { x: Math.floor(size * 0.6), y: Math.floor(size * 0.4) };
        const door = { x: size - 1, y: size - 1 };
        
        // Create a moderate level that's guaranteed to work
        const walls = [];
        
        // Add walls strategically but conservatively
        const wallAttempts = Math.floor(size * size * 0.3); // 30% of possible positions
        
        for (let attempt = 0; attempt < wallAttempts; attempt++) {
            let wallKey;
            
            if (Math.random() > 0.5) {
                // Horizontal wall
                const x = Math.floor(Math.random() * size);
                const y = Math.floor(Math.random() * (size - 1));
                wallKey = `${x},${y},${x},${y + 1}`;
            } else {
                // Vertical wall
                const x = Math.floor(Math.random() * (size - 1));
                const y = Math.floor(Math.random() * size);
                wallKey = `${x},${y},${x + 1},${y}`;
            }
            
            // Skip if wall already exists
            if (walls.some(w => w === wallKey)) continue;
            
            // Don't block direct paths to/from key positions
            const parts = wallKey.split(',').map(Number);
            const [x1, y1, x2, y2] = parts;
            
            // Avoid walls too close to start, key, or door
            if ((Math.abs(x1 - start.x) <= 1 && Math.abs(y1 - start.y) <= 1) ||
                (Math.abs(x2 - start.x) <= 1 && Math.abs(y2 - start.y) <= 1) ||
                (Math.abs(x1 - key.x) <= 1 && Math.abs(y1 - key.y) <= 1) ||
                (Math.abs(x2 - key.x) <= 1 && Math.abs(y2 - key.y) <= 1) ||
                (Math.abs(x1 - door.x) <= 1 && Math.abs(y1 - door.y) <= 1) ||
                (Math.abs(x2 - door.x) <= 1 && Math.abs(y2 - door.y) <= 1)) {
                continue;
            }
            
            // Test the wall
            const testWalls = [...walls, wallKey];
            const wallSet = new Set(testWalls);
            
            if (this.findPath(size, start, key, wallSet) && 
                this.findPath(size, key, door, wallSet)) {
                walls.push(wallKey);
            }
        }
        
        return { start, key, door, walls };
    }
    
    hasValidPath(size, start, key, door, walls) {
        const wallSet = new Set(walls);
        
        // Check path from start to key
        if (!this.findPath(size, start, key, wallSet)) {
            return false;
        }
        
        // Check path from key to door
        if (!this.findPath(size, key, door, wallSet)) {
            return false;
        }
        
        return true;
    }
    
    findPath(size, from, to, walls) {
        const visited = new Set();
        const queue = [from];
        visited.add(`${from.x},${from.y}`);
        
        const directions = [
            { x: 0, y: -1, name: 'up' }, 
            { x: 1, y: 0, name: 'right' },
            { x: 0, y: 1, name: 'down' }, 
            { x: -1, y: 0, name: 'left' }
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === to.x && current.y === to.y) {
                return true;
            }
            
            for (const dir of directions) {
                const next = {
                    x: current.x + dir.x,
                    y: current.y + dir.y
                };
                
                const nextKey = `${next.x},${next.y}`;
                
                if (next.x >= 0 && next.x < size &&
                    next.y >= 0 && next.y < size &&
                    !this.isWallBetween(current, next, walls) &&
                    !visited.has(nextKey)) {
                    
                    visited.add(nextKey);
                    queue.push(next);
                }
            }
        }
        
        return false;
    }
    
    isWallBetween(from, to, walls) {
        // Create wall key for the edge between two cells
        const wallKey = `${Math.min(from.x, to.x)},${Math.min(from.y, to.y)},${Math.max(from.x, to.x)},${Math.max(from.y, to.y)}`;
        return walls.has(wallKey);
    }
    
    movePlayer(dx, dy) {
        if (this.gameState.isGameOver) return;
        
        const currentPos = this.gameState.playerPos;
        const newX = currentPos.x + dx;
        const newY = currentPos.y + dy;
        const gridSize = this.gridSizes[this.currentLevel];
        
        // Check bounds
        if (newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize) {
            this.playSound('wall');
            return;
        }
        
        const newPos = { x: newX, y: newY };
        
        // Check for walls between current position and new position
        if (this.isWallBetween(currentPos, newPos, this.gameState.walls)) {
            this.hitWall(currentPos, newPos, dx, dy);
            return;
        }
        
        // Check if trying to enter door without key
        if (newX === this.gameState.doorPos.x && 
            newY === this.gameState.doorPos.y && 
            !this.gameState.keyCollected) {
            this.playSound('wall');
            this.showTemporaryMessage('Need key first! 🗝️');
            return;
        }
        
        // Valid move
        this.gameState.playerPos.x = newX;
        this.gameState.playerPos.y = newY;
        
        // Mark cell as visited
        const newPosKey = `${newX},${newY}`;
        this.gameState.visitedCells.add(newPosKey);
        
        // Check for key collection
        if (newX === this.gameState.keyPos.x && newY === this.gameState.keyPos.y && 
            !this.gameState.keyCollected) {
            this.collectKey();
        }
        
        // Check for door (level completion)
        if (newX === this.gameState.doorPos.x && newY === this.gameState.doorPos.y && 
            this.gameState.keyCollected) {
            this.completeLevel();
        }
        
        this.updateDisplay();
    }
    
    hitWall(currentPos, newPos, dx, dy) {
        this.playSound('wall');
        
        // Show wall between cells briefly
        const currentCell = this.getCellElement(currentPos.x, currentPos.y);
        
        // Determine which side of the current cell to show the wall
        let wallClass = '';
        if (dx === 1) wallClass = 'wall-right';
        else if (dx === -1) wallClass = 'wall-left';
        else if (dy === 1) wallClass = 'wall-bottom';
        else if (dy === -1) wallClass = 'wall-top';
        
        currentCell.classList.add(wallClass);
        
        setTimeout(() => {
            currentCell.classList.remove(wallClass);
            
            // Reset player position and visited cells
            this.gameState.playerPos = { ...this.gameState.startPos };
            this.gameState.visitedCells.clear();
            
            // If key was collected, put it back to its original position
            if (this.gameState.keyCollected) {
                this.gameState.keyCollected = false;
                this.updateKeyStatus();
                this.showTemporaryMessage('Key returned! 🗝️');
            }
            
            this.updateDisplay();
        }, 1000);
    }
    
    collectKey() {
        this.gameState.keyCollected = true;
        this.playSound('key');
        this.updateKeyStatus();
        this.showTemporaryMessage('Key collected! 🗝️✨');
    }
    
    completeLevel() {
        this.playSound('door');
        this.stopTimer();
        
        if (this.currentLevel < this.maxLevel) {
            this.showMessage(
                'Level Complete! 🎉',
                `Great job! Moving to Level ${this.currentLevel + 1}`,
                'Next Level'
            );
        } else {
            this.gameState.isGameOver = true;
            this.showMessage(
                'You Win! 🏆',
                'Congratulations! You completed all levels!',
                'Play Again'
            );
        }
    }
    
    updateDisplay() {
        const cells = this.gridElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            const posKey = `${x},${y}`;
            
            // Reset cell classes
            cell.className = 'cell';
            cell.textContent = '';
            
            // Add visited class
            if (this.gameState.visitedCells.has(posKey)) {
                cell.classList.add('visited');
            }
            
            // Add player
            if (x === this.gameState.playerPos.x && y === this.gameState.playerPos.y) {
                cell.classList.add('player');
                cell.textContent = '🧍';
            }
            // Add key (if not collected)
            else if (x === this.gameState.keyPos.x && y === this.gameState.keyPos.y && 
                     !this.gameState.keyCollected) {
                cell.classList.add('key');
                cell.textContent = '🗝️';
            }
            // Add door
            else if (x === this.gameState.doorPos.x && y === this.gameState.doorPos.y) {
                cell.classList.add('door');
                cell.textContent = '🚪';
            }
        });
    }
    
    getCellElement(x, y) {
        return this.gridElement.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    }
    
    updateKeyStatus() {
        if (this.gameState.keyCollected) {
            this.keyStatusElement.textContent = '🗝️ Collected';
            this.keyStatusElement.classList.add('collected');
        } else {
            this.keyStatusElement.textContent = '🗝️ Not Collected';
            this.keyStatusElement.classList.remove('collected');
        }
    }
    
    resetTimer() {
        this.gameState.timeRemaining = this.timeLimit;
        this.updateTimerDisplay();
    }
    
    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            if (!this.gameState.isGameOver) {
                this.gameState.timeRemaining--;
                this.updateTimerDisplay();
                
                if (this.gameState.timeRemaining <= 0) {
                    this.timeUp();
                }
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.gameState.timeRemaining / 60);
        const seconds = this.gameState.timeRemaining % 60;
        this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running out
        if (this.gameState.timeRemaining <= 30) {
            this.timerElement.style.color = '#dc3545';
            this.timerElement.style.fontWeight = 'bold';
        } else {
            this.timerElement.style.color = '#dc3545';
            this.timerElement.style.fontWeight = 'normal';
        }
    }
    
    timeUp() {
        this.stopTimer();
        
        if (this.currentLevel < this.maxLevel) {
            this.showMessage(
                'Time Up! ⏰',
                `Moving to Level ${this.currentLevel + 1}`,
                'Continue'
            );
        } else {
            this.gameState.isGameOver = true;
            this.showMessage(
                'Game Over ⏰',
                'Time\'s up! Better luck next time!',
                'Play Again'
            );
        }
    }
    
    restartLevel() {
        this.stopTimer();
        this.startLevel(this.currentLevel);
    }
    
    showMessage(title, text, buttonText = 'OK') {
        this.messageTitle.textContent = title;
        this.messageText.textContent = text;
        this.messageBtn.textContent = buttonText;
        this.messageOverlay.classList.remove('hidden');
        

    }
    
    hideMessage() {
        this.messageOverlay.classList.add('hidden');
        
        if (this.gameState.isGameOver) {
            // Restart the game
            this.gameState.isGameOver = false;
            this.currentLevel = 1;
            this.startLevel(1);
        } else if (this.messageTitle.textContent.includes('Complete') || 
                   this.messageTitle.textContent.includes('Time Up')) {
            // Move to next level
            if (this.currentLevel < this.maxLevel) {
                this.startLevel(this.currentLevel + 1);
            }
        }
    }
    
    showTemporaryMessage(text) {
        const playerCell = this.getCellElement(this.gameState.playerPos.x, this.gameState.playerPos.y);
        const message = document.createElement('div');
        message.className = 'sound-effect';
        message.textContent = text;
        playerCell.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 1000);
    }
    
    playSound(type) {
        // Visual feedback since we can't easily add audio files
        const effects = {
            'key': '🎵 Key!',
            'door': '🎶 Door!',
            'wall': '💥 Wall!'
        };
        
        if (effects[type]) {
            this.showTemporaryMessage(effects[type]);
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new KeyAndDoorGame();
});