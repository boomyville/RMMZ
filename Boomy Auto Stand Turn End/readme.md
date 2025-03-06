Run this in a < enemyTurn > event:


let enemy_list = []

$gameSystem._EventToUnit.forEach(function(event) { if (event.length > 0) { if (event[0] == "enemy" ) { enemy_list.push(event[1]) } } } )

enemy_list.forEach(function(enemy) { if (enemy.event().aiMove() == "stand") { enemy.setSrpgTurnEnd(true) } } )

![Auto End Turn](https://github.com/boomyville/RMMZ/blob/main/Boomy%20Auto%20Stand%20Turn%20End/instantEnemyTurnEnd.gif?raw=true)
