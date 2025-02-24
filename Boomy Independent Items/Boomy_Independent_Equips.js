/*:
 * @plugindesc Allows equipment to have unique IDs when created
* @help
* ============================================================================
* Introduction
* ============================================================================
* 
* This plugin allows equipment to have unique IDs when created. This allows
* equipment to be upgraded and have other unique properties without affecting
* other copies of the same equipment.
*
* Personal note: I had a lot of struggle finding a way to store variables 
* to Game_Item since Game_Item generally derives its properties from the 
* database and doesn't create an instance of the item. I also decided to
* store the unique items in Game_System since I was too lazy to create a class
* and have save/load methods store the new class.
*   
* ============================================================================
* Notetags
* ============================================================================
*   
* You can add the following notetag to weapons and armor to make them independent:
* 
* <independent_item>
* Makes the item independent, giving it a unique ID when created
* 
* ============================================================================
* Script Calls
* ============================================================================
*   
* You can use the following script calls to interact with unique items:
* 
* $gameSystem.getUniqueId(item)
* Returns the unique ID of the item, creating one if necessary
*   
* $gameSystem.getUniqueItemById(uniqueId)
* Returns the unique item with the given unique ID
*
 * @author Boomy
 * @target MZ
 * @url https://github.com/boomyville/RMMZ
 * 
 * @param Show Unique ID
 * @desc Show unique ID in item name (default purposes)
 * @type boolean
 * @default false
 */

(() => {
    
    
    var substrBegin = document.currentScript.src.lastIndexOf('/');
    var substrEnd = document.currentScript.src.indexOf('.js');
    var scriptName = document.currentScript.src.substring(substrBegin + 1, substrEnd);
    var parameters = PluginManager.parameters(scriptName);

    var _showId = parameters['Show Unique ID'] || false;
    
    
    // Extend Game_System to store unique items
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this.uniqueItems = {};
        this._nextUniqueId = 10000;
    };

    // Get unique ID for an item
    Game_System.prototype.getUniqueId = function(item) {
        if (!item) return null;
        if (!this.isIndependentItem(item)) return null;
        
        // If item already has a unique ID, return that item
        if (item._uniqueId && this.uniqueItems[item._uniqueId]) {
            return item._uniqueId;
        }
        
        // Create new unique ID
        const uniqueId = this._nextUniqueId++;
        const uniqueItem = JsonEx.makeDeepCopy(item);
        uniqueItem._uniqueId = uniqueId;
        uniqueItem.id = uniqueId;
        uniqueItem._baseItemId = item.id;
        uniqueItem.upgrade = 0; // Initialize upgrade level
        
        // Store in our tracking system
        this.uniqueItems[uniqueId] = uniqueItem;
        
        // Add to appropriate database
        if (DataManager.isWeapon(item)) {
            $dataWeapons[uniqueId] = uniqueItem;
        } else if (DataManager.isArmor(item)) {
            $dataArmors[uniqueId] = uniqueItem;
        }
        
        return uniqueId;
    };

    // Get unique item by ID
    Game_System.prototype.getUniqueItemById = function(uniqueId) {
        return this.uniqueItems[uniqueId];
    };

    // Upgrade an item by its unique ID
    Game_System.prototype.upgradeItem = function(uniqueId, levels = 1) {
        const item = this.uniqueItems[uniqueId];
        if (item) {
            item.upgrade = (item.upgrade || 0) + levels;
        }
        return item;
    };

    // Override weapons() to return unique weapons
    Game_Actor.prototype.weapons = function() {
        return this._equips.filter(slot => slot.isWeapon() && slot.object()).map(slot => {
            const baseItem = slot.object();
            if (baseItem._uniqueId) {
                return $gameSystem.getUniqueItemById(baseItem._uniqueId);
            }
            return baseItem;
        });
    };

    // Override armors() to return unique armors
    Game_Actor.prototype.armors = function() {
        return this._equips.filter(slot => slot.isArmor() && slot.object()).map(slot => {
            const baseItem = slot.object();
            if (baseItem._uniqueId) {
                return $gameSystem.getUniqueItemById(baseItem._uniqueId);
            }
            return baseItem;
        });
    };

    // Get unique ID of equipped item
    Game_Actor.prototype.getEquipUniqueId = function(slotId) {
        const item = this._equips[slotId].object();
        return item ? item._uniqueId : null;
    };

    // Check if item should be independent
    Game_System.prototype.isIndependentItem = function(item) {
        if (!item) return false;
        const baseItem = this.getBaseItem(item);
        return baseItem && baseItem.meta && baseItem.meta.independent_item;
    };

    // Get base item for any item (unique or not)
    Game_System.prototype.getBaseItem = function(item) {
        if (!item) return null;
        if (item._baseItemId) {
            if (DataManager.isWeapon(item)) {
                return $dataWeapons[item._baseItemId];
            } else if (DataManager.isArmor(item)) {
                return $dataArmors[item._baseItemId];
            }
        }
        return item;
    };

    // Override gainItem to handle independent items
    const _Game_Party_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
        if (!item) return;
        
        if ($gameSystem.isIndependentItem(item) && amount > 0) {
            // If the item already has a unique ID, use that
            if (item._uniqueId) {
                if (DataManager.isWeapon(item)) {
                    this._weapons[item._uniqueId] = 1;
                } else if (DataManager.isArmor(item)) {
                    this._armors[item._uniqueId] = 1;
                }
            } else {
                // Create new unique items
                for (let i = 0; i < amount; i++) {
                    const uniqueId = $gameSystem.getUniqueId(item);
                    if (DataManager.isWeapon(item)) {
                        this._weapons[uniqueId] = 1;
                    } else if (DataManager.isArmor(item)) {
                        this._armors[uniqueId] = 1;
                    }
                }
            }
        } else if ($gameSystem.isIndependentItem(item) && amount < 0) {
            if (item._uniqueId) {
                if (DataManager.isWeapon(item)) {
                    delete this._weapons[item._uniqueId];
                } else if (DataManager.isArmor(item)) {
                    delete this._armors[item._uniqueId];
                }
            }
        } else {
            _Game_Party_gainItem.call(this, item, amount, includeEquip);
        }
    };

    // Override changeEquip to handle independent items
    const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
    Game_Actor.prototype.changeEquip = function(slotId, item) {
        if (item && $gameSystem.isIndependentItem(item)) {
            // If item already has a unique ID, use it
            if (!item._uniqueId) {
                const uniqueId = $gameSystem.getUniqueId(item);
                item = $gameSystem.uniqueItems[uniqueId];
            }
        }
        _Game_Actor_changeEquip.call(this, slotId, item);
    };

    // Override initEquips to handle independent items
    const _Game_Actor_initEquips = Game_Actor.prototype.initEquips;
    Game_Actor.prototype.initEquips = function(equips) {
        this._equips = [];
        equips.forEach((equipId, slot) => {
            if (equipId === 0) {
                this._equips[slot] = new Game_Item();
            } else {
                const baseItem = slot === 0 ? $dataWeapons[equipId] : $dataArmors[equipId];
                if (baseItem && $gameSystem.isIndependentItem(baseItem)) {
                    const uniqueId = $gameSystem.getUniqueId(baseItem);
                    const uniqueItem = $gameSystem.uniqueItems[uniqueId];
                    // Don't call gainItem here, just set up the equip
                    this._equips[slot] = new Game_Item(uniqueItem);
                } else if (baseItem) {
                    this._equips[slot] = new Game_Item(baseItem);
                } else {
                    this._equips[slot] = new Game_Item();
                }
            }
        });
        this.refresh();
    };

    // Override allItems to include unique items
    const _Game_Party_allItems = Game_Party.prototype.allItems;
    Game_Party.prototype.allItems = function() {
        const items = [];
        
        // Add unique weapons
        Object.keys(this._weapons).forEach(id => {
            if (this._weapons[id] > 0) {
                const weapon = $dataWeapons[id];
                if (weapon && weapon._uniqueId) {
                    items.push(weapon);
                }
            }
        });
        
        // Add unique armors
        Object.keys(this._armors).forEach(id => {
            if (this._armors[id] > 0) {
                const armor = $dataArmors[id];
                if (armor && armor._uniqueId) {
                    items.push(armor);
                }
            }
        });
        
        // Add regular items
        return items.concat(_Game_Party_allItems.call(this).filter(item => 
            !$gameSystem.isIndependentItem(item) || !item._uniqueId
        ));
    };

    // Extend drawItemName to show unique IDs
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function(item, x, y, width) {
        _Window_Base_drawItemName.call(this, item, x, y, width);
        if (item && item._uniqueId && eval(_showId)) {
            this.drawText(`#${item._uniqueId}`, x + width - 60, y, 60, 'right');
        }
    };
})();