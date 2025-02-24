//-----------------------------------------------------------------------------
// Boomy_Equipment_Durability.js
// Released under the MIT license.
// http://opensource.org/licenses/mit-license.php
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Adds item durability to RPG Maker MZ
 * @author Boomy
 * @requiredAssets js/plugins/Boomy_Independent_Equips.js
 * 
 * @param Default Durability
 * @desc How much durability a piece of equipment has by default. Set to -1 for unlimited durability * @type integer
 * @type integer
 * @min -1
 * @max 1000
 * @default -1
 *
 * @param Default Max Durability
 * @desc The maximum durability a piece of equipment can have by default. Set to -1 to have max durability equal to default durability
 * @type integer
 * @min -1
 * @max 1000
 * @default -1
 * 
 * @param Action Durability Drop
 * @desc How much durability is lost when using an action
 * @type integer
 * @min 0
 * @max 1000
 * @default -1
 * 
 * @param Damage Durability Drop
 * @desc How much durability is lost when taking damage
 * @type integer
 * @min 0
 * @max 1000
 * @default -1
 * 
 * @param Display Mode
 * @desc How the durability of an item is displayed
 * @type select
 * @option None
 * @option Durability Only
 * @option Durability / Max Durability
 * @option Durability / Max Durability (Percentage)
 * @default Durability Only
 * 
 * 
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *  
 * This plugin adds item durability to the game. Items can have a durability value
 * and a maximum durability value. When an item's durability reaches 0, it will
 * break and be removed from the actor's equipment. Items can also have a
 * "durability_lost" notetag which will determine how much durability is lost
 * when using an action. Items can also have a "durability_lost_damage" notetag
 * which will determine how much durability is lost when taking damage.
 * 
 * ============================================================================
 * How to use
 * ============================================================================
 * 1. Have Boomy_Independent_Equips.js installed
 * 2. Add the plugin to your project
 * 3. Configure the plugin parameters
 * 4. Add notetags to weapons and armor to customize their durability
 * 5. Make sure items are <independent_item>
 * 
 * ============================================================================
 * Behaviour
 * ============================================================================
 * 
 * Item durability is tracked on a per-item basis. When an item's durability
 * reaches 0, it will break and be removed from the actor's equipment. 
 * 
 * For SRPG where battlers attack twice, durability will be lost twice.
 * If the item will break mid-battle, it will be forced removed (or replaced)
 * 
 * ============================================================================
 * Notetags
 * ============================================================================
 *  
 * You can add the following notetags to weapons and armor to customize their
 * durability:
 * 
 * <durability: x>
 * Sets the durability of the item to x. If x is -1, the item will have unlimited
 * durability.
 * 
 * <max_durability: x>
 * Sets the maximum durability of the item to x. If x is -1, the item will have
 * a maximum durability equal to its durability.
 * 
 * <durability_lost: x>
 * Sets the amount of durability lost when using an action to x.
 * 
 * <durability_lost_damage: x>
 * Sets the amount of durability lost when taking damage to x.
 * 
 * <durability_lost_skill: [[skillId, x], [skillId, y], ...]>
 * Sets the amount of durability lost when using a specific skill. The skillId
 * is the ID of the skill and x is the amount of durability lost when using that
 * skill. Skill id can also be a name (but no spaces)
 * Eg. <durability_lost_skill: [["FireBlast", 2], ["Ice", 3]>
 * 
 * <broken_equip: x>
 * Sets the ID or name of the item that will replace the broken item. If x is
 * not found, the item will be removed from the actor's equipment. 
 * Broken equipment can also be a name (but no spaces)
 * Eg. <broken_equip: ShortSword>
 * 
 * ============================================================================
 * Terms of Use
 * ============================================================================
 * 
 * This plugin can be used in commercial or non-commercial projects.
 * Credit would be much appreciated!
 * 
 * ============================================================================
 */


(function () {
    var substrBegin = document.currentScript.src.lastIndexOf('/');
    var substrEnd = document.currentScript.src.indexOf('.js');
    var scriptName = document.currentScript.src.substring(substrBegin + 1, substrEnd);
    var parameters = PluginManager.parameters(scriptName);

    var _default_durability = parameters['Default Durability'] || 100;
    var _default_max_durability = parameters['Default Max Durability'] || 100;
    var _action_durability_drop = parameters['Action Durability Drop'] || 1;
    var _damage_durability_drop = parameters['Damage Durability Drop'] || 1;
    var _durability_display_mode = parameters['Display Mode'] || "Durability Only";

    // ============================================================================
    // Utility functions
    // ============================================================================
    
    function getNotetag(item, tag, defaultValue = null) {
        if (!item || !item.meta) return defaultValue;
        return item.meta[tag] ? item.meta[tag] : defaultValue;
    }

    function parseSkillDurabilityNotetag(item) {
        const data = getNotetag(item, 'durability_lost_skill', "");
        if (!data) return [];
        
        const results = [];
        
        try {
            // Split by commas to get each skill-value pair
            const pairs = data.split(',').map(pair => pair.trim());
            
            for (const pair of pairs) {
                // Split by colon to separate skill name/id from value
                const [skillIdentifier, lossValue] = pair.split(':').map(part => part.trim());
                
                if (skillIdentifier && lossValue) {
                    results.push([skillIdentifier, Number(lossValue)]);
                }
            }
        } catch (e) {
            console.error(`Error parsing skill durability for item ${item.name}: ${e.message}`);
        }
        
        return results;
    }
    

    function getSkillIdByName(name) {
        const skill = $dataSkills.find(s => s && s.name.replace(" ", "").toLowerCase() === name.replace(" ", "").toLowerCase());
        return skill ? skill.id : null;
    }

    function getEquipIdByName(name) {
        const equip = $dataWeapons.find(w => w && w.name.replace(" ", "").toLowerCase() === name.replace(" ", "").toLowerCase()) || $dataArmors.find(a => a && a.name.replace(" ", "").toLowerCase() === name.replace(" ", "").toLowerCase());
        return equip ? equip.id : null;
    }


    // Extend uniqueId creation to include durability
    const _Game_System_getUniqueId = Game_System.prototype.getUniqueId;
    Game_System.prototype.getUniqueId = function(item) {
        const uniqueId = _Game_System_getUniqueId.call(this, item);
        if (uniqueId) {
            const uniqueItem = this.uniqueItems[uniqueId];
            if (uniqueItem) {
                // Set initial durability
                const durability = Number(getNotetag(item, 'durability', _default_durability));
                const maxDurability = Number(getNotetag(item, 'max_durability', 
                    durability === -1 ? -1 : (durability || _default_max_durability)
                ));
                
                uniqueItem.durability = durability;
                uniqueItem.maxDurability = maxDurability;
            }
        }
        return uniqueId;
    };

    // Helper functions for durability
    Game_System.prototype.getDurability = function(uniqueId) {
        const item = this.uniqueItems[uniqueId];
        return item ? item.durability : null;
    };

    Game_System.prototype.getMaxDurability = function(uniqueId) {
        const item = this.uniqueItems[uniqueId];
        return item ? item.maxDurability : null;
    };

    Game_System.prototype.reduceDurability = function(uniqueId, amount) {
        const item = this.uniqueItems[uniqueId];
        if (!item || item.durability === -1) return false;

        item.durability = Math.max(0, item.durability - amount);
        if (item.durability === 0) {
            this.handleBrokenEquipment(uniqueId);
        }
        return true;
    };

    // Add a new method to force equipment change even during battle
    // Note RPG Maker MZ by default prevents equipment changes during battle
    Game_System.prototype._forceChangeEquip = function(actor, slotId, item) {
        // First, handle inventory changes
        if (actor.isEquipped(item)) {
            // Item is already equipped in another slot, so remove it first
            $gameParty.gainItem(item, 1);
        }
        
        // Get the current item
        const oldItem = actor.equips()[slotId];
        if (oldItem && item !== null) {
            // Add the old item back to inventory (unless it's the broken item we're replacing)
            if (!oldItem._uniqueId || oldItem._uniqueId !== item._uniqueId) {
                $gameParty.gainItem(oldItem, 1);
            }
        }
        
        // Remove the new item from inventory
        if (item) {
            $gameParty.loseItem(item, 1);
        }
        
        // Directly change the equipment
        actor._equips[slotId].setObject(item);
        
        // Refresh the actor
        actor.refresh();
    };

    Game_System.prototype.handleBrokenEquipment = function(uniqueId) {
        const item = this.uniqueItems[uniqueId];
        if (!item) return;
    
        // Check for broken equipment replacement
        const brokenEquipTag = getNotetag(item, 'broken_equip', null);
        if (brokenEquipTag) {
            const replacementId = Number(brokenEquipTag) || getEquipIdByName(brokenEquipTag);
            if (replacementId) {
                // Replace with broken version
                const replacementItem = DataManager.isWeapon(item) ? 
                    $dataWeapons[replacementId] : $dataArmors[replacementId];
                if (replacementItem) {
                    this.replaceEquipment(uniqueId, replacementItem);
                    // Remove the original broken item from inventory and clean up the uniqueItems
                    this.removeUniqueItem(uniqueId);
                    return;
                }
            }
        }
    
        // If no replacement, just remove the equipment
        this.removeEquipment(uniqueId);
    };
    
    // Add a helper method to remove the unique item without affecting equipment
    Game_System.prototype.removeUniqueItem = function(uniqueId) {
        const item = this.uniqueItems[uniqueId];
        if (!item) return;
    
        // Remove from inventory (but don't unequip)
        if (DataManager.isWeapon(item)) {
            if ($gameParty._weapons[uniqueId] > 0) {
                $gameParty._weapons[uniqueId] = 0;
            }
        } else if (DataManager.isArmor(item)) {
            if ($gameParty._armors[uniqueId] > 0) {
                $gameParty._armors[uniqueId] = 0;
            }
        }
    
        // Clean up unique item data
        delete this.uniqueItems[uniqueId];
    };
    
    // Update replaceEquipment to handle the broken item properly
    Game_System.prototype.replaceEquipment = function(uniqueId, newEquip) {
        const oldItem = this.uniqueItems[uniqueId];
        if (!oldItem) return;
        console.log("Replacing equipment with unique ID: " + uniqueId, newEquip);
    
        // Find actor wearing this equipment
        $gameParty.allMembers().forEach(actor => {
            actor.equips().forEach((equip, slotId) => {
                if (equip && equip._uniqueId === uniqueId) {
                    //console.log("Found actor with equipment: " + actor.name());
                    
                    // Check if we're in battle
                    if ($gameParty.inBattle()) {
                        // Show a message if the player can see it
                        if (SceneManager._scene instanceof Scene_Battle) {
                            SceneManager._scene._logWindow.addText(actor.name() + "'s " + oldItem.name + " broke!");
                            //$gameMessage.add(actor.name() + "'s " + oldItem.name + " broke!");
                        }
                        // Force equipment change by directly manipulating the slots
                        this._forceChangeEquip(actor, slotId, newEquip);
                        
                    } else {
                        // For normal equipment change outside of battle, we need to
                        // handle the inventory specially
                        
                        // First ensure the new item is in inventory
                        $gameParty.gainItem(newEquip, 1);
                        
                        // Then change equipment
                        actor.changeEquip(slotId, newEquip);
                    }
                }
            });
        });
    };
    
    // Similarly, update the removeEquipment function to be more thorough
    Game_System.prototype.removeEquipment = function(uniqueId) {
        const item = this.uniqueItems[uniqueId];
        if (!item) return;
    
        // Remove from all actors
        $gameParty.allMembers().forEach(actor => {
            actor.equips().forEach((equip, slotId) => {
                if (equip && equip._uniqueId === uniqueId) {
                    if ($gameParty.inBattle()) {
                        // Show a message if the player can see it
                        if (SceneManager._scene instanceof Scene_Battle) {
                            SceneManager._scene._logWindow.addText(actor.name() + "'s " + item.name + " broke!");
                            //$gameMessage.add(actor.name() + "'s " + item.name + " broke!");
                        }
                        // Force unequip during battle
                        this._forceChangeEquip(actor, slotId, null);
                        
                    } else {
                        actor.changeEquip(slotId, null);
                    }
                }
            });
        });
    
        // Remove from inventory more directly
        if (DataManager.isWeapon(item)) {
            if ($gameParty._weapons[uniqueId] > 0) {
                $gameParty._weapons[uniqueId] = 0;
            }
        } else if (DataManager.isArmor(item)) {
            if ($gameParty._armors[uniqueId] > 0) {
                $gameParty._armors[uniqueId] = 0;
            }
        }
    
        // Clean up unique item data
        delete this.uniqueItems[uniqueId];
    };

    // Handle durability loss from actions
    const _Game_Battler_useItem = Game_Battler.prototype.useItem;
    Game_Battler.prototype.useItem = function(item) {
        _Game_Battler_useItem.call(this, item);
        
        // Check equipment durability loss
        if (this.isActor()) {
            this.equips().forEach(equip => {
                if (!equip || !equip._uniqueId) return;
                
                const skillLossData = parseSkillDurabilityNotetag(equip);
                let durabilityLoss = Number(getNotetag(equip, 'durability_lost', _action_durability_drop));
                
                // Check for skill-specific durability loss
                if (skillLossData.length > 0) {
                    for (const [skillIdentifier, loss] of skillLossData) {
                        // Try to get skill ID - first as direct number, then by name lookup
                        const skillId = isNaN(Number(skillIdentifier)) ? 
                            getSkillIdByName(skillIdentifier) : Number(skillIdentifier);
                        
                        if (skillId === item.id) {
                            durabilityLoss = Number(loss);
                            break;
                        }
                    }
                }

                if (durabilityLoss > 0) {
                    $gameSystem.reduceDurability(equip._uniqueId, durabilityLoss);
                }
            });
        }
    };

    // Handle durability loss from damage
    const _Game_Action_executeDamage = Game_Action.prototype.executeDamage;
    Game_Action.prototype.executeDamage = function(target, value) {
        _Game_Action_executeDamage.call(this, target, value);
        
        if (target.isActor() && value > 0) {
            target.equips().forEach(equip => {
                if (!equip || !equip._uniqueId) return;
                
                const damageLoss = Number(getNotetag(equip, 'durability_lost_damage', _damage_durability_drop));
                if (damageLoss > 0) {
                    $gameSystem.reduceDurability(equip._uniqueId, damageLoss);
                }
            });
        }
    };

    // Extend drawItemName to show durability
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function(item, x, y, width) {
        _Window_Base_drawItemName.call(this, item, x, y, width);
        
        if (item && item._uniqueId && item.durability !== undefined) {
            let durabilityText = '';
            const durability = item.durability;
            const maxDurability = item.maxDurability;

            if (durability === -1) return; // Don't display for unlimited durability

            switch (_durability_display_mode) {
                case "Durability Only":
                    durabilityText = `${durability}`;
                    break;
                case "Durability / Max Durability":
                    durabilityText = `${durability}/${maxDurability}`;
                    break;
                case "Durability / Max Durability (Percentage)":
                    const percentage = Math.floor((durability / maxDurability) * 100);
                    durabilityText = `${percentage}%`;
                    break;
            }

            if (durabilityText) {
                this.drawText(durabilityText, x + width - 120, y, 120, 'right');
            }
        }
    };

})();