# Cosmic Drift

A space-themed battle royale absorption game where you grow by consuming smaller planets while avoiding larger threats.

## About

Cosmic Drift is a physics-based space game featuring gravitational mechanics, strategic boost abilities, and competitive AI opponents. Navigate through a shrinking playable area, consume food particles and smaller planets to grow, and become the last celestial body standing.

## Features

- **Unified Gravity System**: All celestial bodies generate gravity wells based on their size
- **Boost Mechanics**: Temporary speed boost with 3x gravity multiplier for high-risk/high-reward gameplay
- **Battle Royale Mode**: Shrinking playable area with damage boundary
- **Manual Camera Zoom**: Full control over your viewport (R/T keys)
- **Intelligent AI**: Opponents hunt prey and flee from threats
- **Physics-Based Movement**: Momentum and friction-based controls for smooth drifting

## How to Play

### Objective
- **Battle Royale**: Be the last planet standing
- **Survival**: Grow to maximum size (radius 1800)

### Controls
- **WASD / Arrow Keys**: Move your planet
- **Spacebar**: Boost (500ms duration, 3s cooldown)
- **R**: Zoom out
- **T**: Zoom in

### Gameplay Tips
- Consume food particles and smaller planets to grow
- Boost increases your speed but also triples gravity effects (great for collecting food, dangerous near large planets)
- Stay within the playable boundary (red pulsing ring) - being outside causes damage
- Blue rings show gravity well ranges
- Use manual zoom to see the battlefield or focus on your immediate area

## Tech Stack

- Vanilla JavaScript
- HTML5 Canvas
- CSS3

## Development

```bash
npm install
npm start
```

The game runs on a local development server at `http://localhost:8080`

## Game Modes

### Battle Royale (Default)
- All planets start at equal size (20)
- 150 food particles available for growth
- Playable area shrinks over time
- Last planet standing wins

### Survival
- Focus on growth and reaching maximum size
- Victory at radius 1800

## Credits

Built with Claude Code as a learning project exploring physics-based game mechanics and AI behaviors.
