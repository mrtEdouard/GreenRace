# 🎮 Green Race - Game Board

## 📊 Complete Cell Distribution (45 Total)

## 🎲 Dice Configuration
- **Range:** 1-6 (weighted)
- **Probabilities:**
  - 1: 20%
  - 2: 20%
  - 3: 20%
  - 4: 20%
  - 5: 15%
  - 6: 5% (rare!)
- **Average roll:** ~3.0 cells per turn

## 🗺️ Board Layout (45 cells)

```
START → [1] → [2] → [3 ⚠️] → [4] → [5 ❓] → [6] → [7 🍀] → [8] → [9 🎮]
                                      ↓
[19 ❓] ← [18] ← [17 ⚠️] ← [16 🎮] ← [15] ← [14 🍀] ← [13] ← [12 ❓] ← [11] ← [10 ⚠️]
   ↓
[20] → [21 🍀] → [22] → [23 🎮] → [24 ⚠️] → [25] → [26 ❓] → [27] → [28 🍀] → [29]
                                                                            ↓
[40 ❓] ← [39] ← [38 ⚠️] ← [37 🎮] ← [36] ← [35 🍀] ← [34] ← [33 ❓] ← [32] ← [31 ⚠️] ← [30 🎮]
   ↓
[41] → [42 🍀] → [43] → [44 🎮] → [45 END] 🏁
```

**Legend:**
- ❓ = Quiz Cell (6 cells)
- 🍀 = Good Luck Cell (6 cells)
- ⚠️ = Bad Luck Cell (6 cells)
- 🎮 = Game Cell (6 cells - coming soon)

### Cell Types:

| Type | Symbol | Count | Positions | Percentage |
|------|--------|-------|-----------|------------|
| **Normal** | ⚪ | 21 cells | All others | 47% |
| **Quiz** | ❓ | 6 cells | 5, 12, 19, 26, 33, 40 | 13% |
| **Good Luck** | 🍀 | 6 cells | 7, 14, 21, 28, 35, 42 | 13% |
| **Bad Luck** | ⚠️ | 6 cells | 3, 10, 17, 24, 31, 38 | 13% |
| **Game** | 🎮 | 6 cells | 9, 16, 23, 30, 37, 44 | 13% |
| **TOTAL** | | **45** | | **100%** |

**Special cells:** 24/45 (53%) - More than half the board has special effects!

## 🎯 Quiz Mechanics

When landing on a QUIZ cell:
- Player answers 5 random questions
- Each **correct answer** = +1 cell
- Each **wrong answer** = -1 cell
- **Net movement** = Correct - Wrong
- Player cannot go below cell 0

### Examples:
- 5 correct, 0 wrong = +5 cells ✅
- 4 correct, 1 wrong = +3 cells
- 3 correct, 2 wrong = +1 cell
- 2 correct, 3 wrong = -1 cell
- 1 correct, 4 wrong = -3 cells
- 0 correct, 5 wrong = -5 cells ❌

## 🍀 Good Luck Events (Positive Only)

When landing on a 🍀 cell:
- 🚀 **Turbo boost!** +3 cells
- 🌟 **Super jump!** +5 cells
- 🍀 **Lucky!** +2 cells
- ⚡ **Speed boost!** +4 cells

## ⚠️ Bad Luck Events (Negative Only)

When landing on a ⚠️ cell:
- 🐌 **Slowed down!** -3 cells
- 💥 **Big mistake!** -5 cells
- 🌧️ **Bad weather!** -2 cells
- 🚫 **Blocked!** -4 cells

## 🎮 Game Cells

Mini-games coming soon! For now, just skip the turn.

## ⚖️ Game Balance

With weighted dice (1-6) and 24 special cells:
- **Average dice roll:** ~3.0 cells per turn
- **Estimated turns to finish:** ~15 turns (base movement)
- **Expected encounters per game:**
  - Quiz: ~2-3 times
  - Good Luck: ~2-3 times
  - Bad Luck: ~2-3 times
  - Game: ~2-3 times

### Impact Ranges:
- **Quiz:** -5 to +5 cells (based on knowledge)
- **Good Luck:** +2 to +5 cells (always positive)
- **Bad Luck:** -2 to -5 cells (always negative)
- **Game:** To be implemented

### Gameplay Dynamics:
This creates exciting and unpredictable games with:
1. 🎲 **Luck** (weighted dice roll)
2. 🧠 **Skill** (quiz questions)
3. 🍀 **Fortune** (good luck boosts)
4. ⚠️ **Setbacks** (bad luck penalties)
5. 🎮 **Fun** (mini-games coming soon)

**Result:** Players will have very different positions throughout the game, creating dynamic comebacks and exciting finishes! 🌱
