//=============================================================================
//Boomy_TerrainModifier.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Adds the ability to change terrain based on an event's notetag
 * @author Boomy 
 *  
 * @help
 * Using an event with notetag <terrainTag:X> will override a tile's terrain Id
* $gameMap.returnTerrainEvents can be used to find events that have a terrainId 
* tag (SRPG mode only)
*
 */
(function () {
    //====================================================================================================================
    // Overwritten function: terrainTag
    //====================================================================================================================
    // Allows terrain tag id to be modified based on event notetag
    // Basically terrain tags can modify the user's stats 
    // This allows us to change the terrain tag on the fly (instead of being baked into the editor)
    // Relies on the <terrainTag:X> notetag in the event notebox
    // I tried to make this an aliased function but it just refused to work
    // #Boomy
    //====================================================================================================================  
    Game_Map.prototype.terrainTag = function (x, y) {
        if (this.isValid(x, y)) {
            for (var i = 0; i < $gameMap.eventsXy(x, y).length; i++) {
                if ($gameMap.eventsXy(x, y)[i].event().meta.terrainTag) {
                    return $gameMap.eventsXy(x, y)[i].event().meta.terrainTag;
                } else if ($gameMap.eventsXy(x, y)[i].event().meta.terrainId) {
                    return $gameMap.eventsXy(x, y)[i].event().meta.terrainId;
                }
            }
            var flags = this.tilesetFlags();
            var tiles = this.layeredTiles(x, y);
            for (var i = 0; i < tiles.length; i++) {
                var tag = flags[tiles[i]] >> 12;
                if (tag > 0) {
                    return tag;
                }
            }
        }
        return 0;
    };
    //====================================================================================================================
    // New function: returnTerrainEvents
    //====================================================================================================================
    // Spits out events that are on a particular terrainTag
    // #Boomy
    //====================================================================================================================  
    Game_Map.prototype.returnTerrainEvents = function (terrainId, srpgEventType = false) {
        var arr = [];
        $gameMap.events().forEach(function (a) {
            if ($gameMap.terrainTag(a.posX(), a.posY()) == terrainId) {
                if ($gameSystem.isSRPGMode()) {
                    if (a._srpgEventType == srpgEventType || srpgEventType == false) {
                        arr.push(a);
                    }
                } else {
                    arr.push(a);
                }
            }
        });
        return arr;
    };
})();
