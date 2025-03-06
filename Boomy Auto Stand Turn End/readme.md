Run this in a <enemyTurn> event:

// Initialize an empty array to store enemy units
let enemy_list = []

// Iterate through the game system's event-to-unit mapping
$gameSystem._EventToUnit.forEach(function (event) {
    // Check if the event array has elements
    if (event.length > 0) {
        // If the first element is "enemy", add the second element (the enemy unit) to the list
        if (event[0] == "enemy") {
            enemy_list.push(event[1])
        }
    }
})

// Iterate through the enemy list
enemy_list.forEach(function (enemy) {
    // If the enemy's AI move is "stand", set its turn as ended
    if (enemy.event().aiMove() == "stand") {
        enemy.setSrpgTurnEnd(true)
    }
})

