//=============================================================================
//SRPG_DirectionSelection.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Adds the ability to select direction of units at the end of an action
 * @author Boomy 
 *  
  * @param After Battle Character Image
 * @desc If set to -1, do not change player icon after battle. Used in conjunction with after battle direction selection. Exclude .png suffix
 * @default -1
 *  
 * @help
 * This plugin changes the flow of how SRPG_Gear performs a battle or action
 * It adds a phase that allows users to select the direction for a character (player only)
 *
  * Change Log
  * 8/6/24 - Updated to work with RMMZ
 * 8/11/20 - First Release
*  5/8/21 - Update to enable compatability with Shoukang's MoveAfterAction
 */

(function () {
    var substrBegin = document.currentScript.src.lastIndexOf('/');
    var substrEnd = document.currentScript.src.indexOf('.js');
    var scriptName = document.currentScript.src.substring(substrBegin + 1, substrEnd);
    var parameters = PluginManager.parameters(scriptName);

    var _directionSelectionCharacterName = parameters['After Battle Character Image'];
    var _srpgSet = PluginManager.parameters('SRPG_core_MZ')['srpgSet'] || '!srpg_set_type1';

    // Map Refresh (Modified Function) #Boomy 
    var _SRPG_SceneMap_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _SRPG_SceneMap_update.call(this);
        //Process Direction Selection after wait command #Boomy
        if ($gameSystem.isSubBattlePhase() === 'wait_direction_selection') {
            this.srpgWaitDirectionSelection();
            return;
        }
        //Process Post-battle Direction Selection #Boomy
        if ($gameSystem.isSubBattlePhase() === 'pre_direction_selection') {
            this.srpgPostBattleLunaticCode();
            this.preBattleSetDirection();
            return;
        }
        //Process Post-battle Direction Selection #Boomy
        if ($gameSystem.isSubBattlePhase() === 'direction_selection') {
            this.srpgBattlerDeadAfterBattle();
            //Set battle direction #Boomy
            if ($gameTemp._areaTargets !== undefined) { //Set a check if there are multiple actions to occur due to an AoE effect
                if ($gameTemp.areaTargets().length == 0) {
                    this.srpgPostBattleDirectionSelection();
                } else {
                    this.srpgAfterAction();
                }
                return;
            }
        }
        //Process Post-battle 
        if ($gameSystem.isSubBattlePhase() == 'pre_post_battle') {
            this.srpgBattlerDeadAfterBattle(); //This function checks if either attacker or defender has been knocked out and if so set appropriate variables 
            this.preBattleSetDirection();
            $gameSystem.setSubBattlePhase('after_battle');
            return;
        }
        
    };
    //This function runs lunatic code prior to direction_selection phase but after a battle 
    Scene_Map.prototype.srpgPostBattleLunaticCode = function () {
        console.log("LUNATIC");
        if($gameTemp.activeEvent()) {
        if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isActor()) {
            $gamePlayer._x = $gameTemp.activeEvent().posX();
            $gamePlayer._y = $gameTemp.activeEvent().posY();
            if (_directionSelectionCharacterName !== -1) {
                    $gamePlayer._characterName = _directionSelectionCharacterName;
                }
            $gameSystem.setSubBattlePhase('direction_selection');
            } else {
                $gameSystem.setSubBattlePhase('after_battle');
            }
        } else {
            $gameSystem.setSubBattlePhase('after_battle');
        }
    }
    
    //This function checks for user input and applies direction after a wait command #Boomy
    Scene_Map.prototype.srpgWaitDirectionSelection = function () {
        if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isEnemy()) {
            //Direction Selection for enemy
            this.preBattleSetDirection()
            this.srpgAfterAction();
        } else if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isActor() && $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isDead()) {
            $gameSystem.setSubBattlePhase('after_battle');
        } else {
            //Set direction of gamePlayer to be the same as active unit if direction indicator is set 
            if (_directionSelectionCharacterName !== -1) {
                $gamePlayer._direction = $gameTemp.activeEvent()._direction;
            }
            //Set direction of unit based on position of mouse 
            if (TouchInput.isMoved()) {
                if ((Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) < 24 && Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y) < 24) == false) {
                    if (Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) >= Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y)) {
                        if ($gameTemp.activeEvent().screenX() - TouchInput.x > 0) {
                            $gameTemp.activeEvent()._direction = 4;
                        } else {
                            $gameTemp.activeEvent()._direction = 6;
                        }
                    } else {
                        if ($gameTemp.activeEvent().screenY() - TouchInput.y > 0) {
                            $gameTemp.activeEvent()._direction = 8;
                        } else {
                            $gameTemp.activeEvent()._direction = 2;
                        }
                    }
                }
            }
            //Set direction of unit based on arrow keys 
            else if (Input.dir4 == 2) {
                $gameTemp.activeEvent()._direction = 2;
            } else if (Input.dir4 == 4) {
                $gameTemp.activeEvent()._direction = 4;
            } else if (Input.dir4 == 6) {
                $gameTemp.activeEvent()._direction = 6;
            } else if (Input.dir4 == 8) {
                $gameTemp.activeEvent()._direction = 8;
            }
            //Confirm direction upon ok 
            if (Input.isTriggered('ok')) {
                if (_directionSelectionCharacterName !== -1) {
                    $gamePlayer._characterName = _srpgSet;
                }
                this.srpgAfterAction();
            }
            //Confirm direction when user released touch/mouse 
            if ($gameTemp.activeEvent()) {
                if ($gameTemp.activeEvent() !== null) {
                    if ((TouchInput.isTriggered()) && ((Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) < 24 && Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y) < 24) == false)) {
                        if (Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) >= Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y)) {
                            if ($gameTemp.activeEvent().screenX() - TouchInput.x > 0) {
                                $gameTemp.activeEvent()._direction = 4;
                            } else {
                                $gameTemp.activeEvent()._direction = 6;
                            }
                        } else {
                            if ($gameTemp.activeEvent().screenY() - TouchInput.y > 0) {
                                $gameTemp.activeEvent()._direction = 8;
                            } else {
                                $gameTemp.activeEvent()._direction = 2;
                            }
                        }
                        if (_directionSelectionCharacterName !== -1) {
                            $gamePlayer._characterName = _srpgSet;
                        }
                        this.srpgAfterAction();
                    }
                }
            }
        }
    };

    //This function checks for user input and applies direction after battle #Boomy
    //This function is pretty much a carbon copy of srpgWaitDirectionSelection function with minor tweaks
    Scene_Map.prototype.srpgPostBattleDirectionSelection = function () {
        if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isEnemy()) {
            //Direction Selection for enemy
            this.preBattleSetDirection();
            $gameSystem.setSubBattlePhase('after_battle');
        } else if (!$gameTemp.activeEvent()) {
            if (_directionSelectionCharacterName !== -1) {
                $gamePlayer._characterName = _srpgSet;
            }
            $gameSystem.setSubBattlePhase('after_battle');
        } else if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isActor() && $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].isDead()) {
            if (_directionSelectionCharacterName !== -1) {
                $gamePlayer._characterName = _srpgSet;
            }
            $gameSystem.setSubBattlePhase('after_battle');
        } else {
            $gameTemp.clearMoveTable(); //Remove the movemenet tiles that show where a unit can move/attack (this normally occurs in after_battle)
            //Set direction of gamePlayer to be the same as active unit if direction indicator is set 
            if (_directionSelectionCharacterName !== -1) {
                $gamePlayer._direction = $gameTemp.activeEvent()._direction;
            }
            //Set direction of unit based on position of mouse 
            if (TouchInput.isMoved()) {
                if ((Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) < 24 && Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y) < 24) == false) {
                    if (Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) >= Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y)) {
                        if ($gameTemp.activeEvent().screenX() - TouchInput.x > 0) {
                            $gameTemp.activeEvent()._direction = 4;
                        } else {
                            $gameTemp.activeEvent()._direction = 6;
                        }
                    } else {
                        if ($gameTemp.activeEvent().screenY() - TouchInput.y > 0) {
                            $gameTemp.activeEvent()._direction = 8;
                        } else {
                            $gameTemp.activeEvent()._direction = 2;
                        }
                    }
                }
            } else if (Input.dir4 == 2) {
                $gameTemp.activeEvent()._direction = 2;
            } else if (Input.dir4 == 4) {
                $gameTemp.activeEvent()._direction = 4;
            } else if (Input.dir4 == 6) {
                $gameTemp.activeEvent()._direction = 6;
            } else if (Input.dir4 == 8) {
                $gameTemp.activeEvent()._direction = 8;
            }
            //Confirm direction upon ok 
            if (Input.isTriggered('ok')) {
                if (_directionSelectionCharacterName !== -1) {
                    $gamePlayer._characterName = _srpgSet;
                }
                this.srpgAfterAction();
            }
            //Confirm direction when user released touch/mouse 
            if ((TouchInput.isTriggered()) && ((Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) < 24 && Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y) < 24) == false)) {
                if (Math.abs($gameTemp.activeEvent().screenX() - TouchInput.x) >= Math.abs($gameTemp.activeEvent().screenY() - 24 - TouchInput.y)) {
                    if ($gameTemp.activeEvent().screenX() - TouchInput.x > 0) {
                        $gameTemp.activeEvent()._direction = 4;
                    } else {
                        $gameTemp.activeEvent()._direction = 6;
                    }
                } else {
                    if ($gameTemp.activeEvent().screenY() - TouchInput.y > 0) {
                        $gameTemp.activeEvent()._direction = 8;
                    } else {
                        $gameTemp.activeEvent()._direction = 2;
                    }
                }
                if (_directionSelectionCharacterName !== -1) {
                    $gamePlayer._characterName = _srpgSet;
                }
                this.srpgAfterAction();
            }
        }
    };

        Scene_Map.prototype.commandWait = function() {
        var actor = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
        actor.onAllActionsEnd();
        this.srpgAfterAction();
    };

    //Modified function to add the ability to change direction after standby command #Boomy
    Scene_Map.prototype.commandWait = function () {
        var actor = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
        //Set mode to direction selection
            actor.onAllActionsEnd();
            //Change player icon to show direction unit is facing 
        
                $gamePlayer._x = $gameTemp.activeEvent().posX();
                $gamePlayer._y = $gameTemp.activeEvent().posY();
                if (_directionSelectionCharacterName !== -1) {
                    $gamePlayer._characterName = _directionSelectionCharacterName;
                }
            
            $gameSystem.clearSrpgActorCommandWindowNeedRefresh(); //Remove command window
            $gameSystem.clearSrpgActorCommandStatusWindowNeedRefresh(); //Remove quick status window 
            $gameSystem.setSubBattlePhase('wait_direction_selection'); //Boomy edit to allow units to change direction if a unit goes into standby #Boomy
            //this.srpgAfterAction(); 

    };

    //Change how preBatttleSetDirection is applied in battle (more a bug fix and compatability with directionMod)
    var _SRPG_preBattleSetDirection = Scene_Map.prototype.preBattleSetDirection;
    Scene_Map.prototype.preBattleSetDirection = function () {
        if ($gameSystem._isSubBattlePhase == "invoke_action") {
            return;
        } else {
            _SRPG_preBattleSetDirection.call(this);
        }
    }
    //戦闘終了の処理（共通）
    var _ender = BattleManager.endBattle;
    BattleManager.endBattle = function (result) {
        if (this._srpgBattleResultWindow) {
            this._srpgBattleResultWindow.close();
        }
        this.replayBgmAndBgs();
        if($gameSystem.isSRPGMode()) {
        //MoveAfterAction compatability
        if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] !== undefined) {
            if($gameSystem._isBattlePhase == "actor_phase") {
            $gameSystem.setSubBattlePhase('pre_direction_selection');    
        } else {
            _ender.call(this, result);
        }
        }
    }
};

    //戦闘終了処理のアップデート
    var __SRPG_BattleManager_updateBattleEnd = BattleManager.updateBattleEnd;
    BattleManager.updateBattleEnd = function () {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.isSubBattlePhase() === 'pre_post_battle' || $gameSystem.isSubBattlePhase() === 'after_battle' || $gameSystem.isSubBattlePhase() === 'pre_direction_selection') {
                SceneManager.pop();
                this._phase = null;
            } else if (this._srpgBattleResultWindow.isChangeExp() == false && (Input.isPressed('ok') || ( TouchInput.isPressed()))) {
                this.endBattle(3);
            }
        } else {
            __SRPG_BattleManager_updateBattleEnd.call(this);
        }
    };
    // no moving during a skill!
    var _Game_Player_MB_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function () {
        if ($gameSystem.isSRPGMode() && ($gameSystem.isSubBattlePhase() === 'invoke_action' || $gameSystem.isSubBattlePhase() === 'direction_selection' || $gameSystem.isSubBattlePhase() === 'wait_direction_selection')) { //Edit to add direction selection #Boomy
            return false;
        }
        return _Game_Player_MB_canMove.call(this);
    };
    // no pausing, either!
    var _updateCallMenu_MB = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function () {
        if ($gameSystem.isSRPGMode() && ($gameSystem.isSubBattlePhase() === 'invoke_action' || $gameSystem.isSubBattlePhase() === 'direction_selection' || $gameSystem.isSubBattlePhase() === 'wait_direction_selection')) {
            this.menuCalling = false;
            return;
        }
        _updateCallMenu_MB.call(this);
    };
    
    //Make User face target when selecting 
    var _setTargetEvent = Game_Temp.prototype.setTargetEvent;
    Game_Temp.prototype.setTargetEvent = function(event) {
        _setTargetEvent.call(this, event);
        if($gameSystem.isSubBattlePhase() == 'actor_target' && $gameTemp.activeEvent() != $gameTemp.targetEvent() ) {
        $gameTemp.activeEvent().setDirection($gameTemp.activeEvent().dirTo($gameTemp.targetEvent().posX(), $gameTemp.targetEvent().posY()));
        }
    };

        //-----------------------------------------------------------------------------
    /**
     * The static class that handles input data from the mouse and touchscreen.
     *
     * @class TouchInput
     */
    TouchInput.isMoved = function () {
        if ($gameTemp._mouseOverX) {
            if ($gameTemp._mouseOverY) {
                if (!($gameTemp._mouseOverX == TouchInput.x && $gameTemp._mouseOverY == TouchInput.y)) {
                    $gameTemp._mouseOverX = TouchInput.x;
                    $gameTemp._mouseOverY = TouchInput.y;
                    return true;
                } else {
                    return false;
                }
            }
        }
        $gameTemp._mouseOverX = TouchInput.x;
        $gameTemp._mouseOverY = TouchInput.y;
    };
    
})();
