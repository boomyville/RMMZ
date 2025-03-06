Run this in a <enemyTurn> event:


let enemy_list = []
$gameSystem._EventToUnit.forEach(function(event) { if (event.length > 0) { if (event[0] == "enemy" ) { enemy_list.push(event[1]) } } } )
enemy_list.forEach(function(enemy) { if (enemy.event().aiMove() == "stand") { enemy.setSrpgTurnEnd(true) } } )
