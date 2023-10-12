//=============================================================================
//Boomy_SRPGCommands.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Modifies commands available to actors
 * @author Boomy 
  * @url https://github.com/boomyville/
 *
  * @param Enable Guard
 * @desc Add guard command if available
 * @type boolean
* 
* @param Rename Attack
 * @desc Rename attack to name of default battle skill set by srpgWeaponSkill
 * @type boolean
* 
 * @help
 * Modifies battle commands available to actors
 * 
 */
(function () {
    var substrBegin = document.currentScript.src.lastIndexOf('/');
    var substrEnd = document.currentScript.src.indexOf('.js');
    var scriptName = document.currentScript.src.substring(substrBegin + 1, substrEnd);
    var parameters = PluginManager.parameters(scriptName);
    //====================================================================================================================
    // New Modification: Adding Guard to battle commands
    //====================================================================================================================
    // #Boomy
    //====================================================================================================================  
    if (eval(parameters["Enable Guard"])) {
        var _Window_ActorCommand = Window_ActorCommand.prototype.addWaitCommand;
        Window_ActorCommand.prototype.addWaitCommand = function () {
            if (this._actor.skills().contains($dataSkills[2])) {
                this.addCommand("Guard", 'guard', this._actor.canUse($dataSkills[2])); //Add can use condition
            }
            _Window_ActorCommand.call(this);
        };
        _createSrpgActorCommandWindow = Scene_Map.prototype.createSrpgActorCommandWindow;
        Scene_Map.prototype.createSrpgActorCommandWindow = function () {
            _createSrpgActorCommandWindow.call(this);
            this._mapSrpgActorCommandWindow.setHandler('guard', this.commandGuard.bind(this));
            //$gameSystem.setSrpgActorCommandWindowNeedRefresh($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1]);
        };
        Scene_Map.prototype.commandGuard = function () {
            var actor = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
            actor.action(0).setSkill(2);
            this.startActorTargetting();
        };
    };
    Window_ActorCommand.prototype.addAttackCommand = function () {
        if (eval(parameters["Rename Attack"])) {
            this.addCommand($dataSkills[this._actor.attackSkillId()].name, "attack", this._actor.canAttack());
        } else {
            this.addCommand(TextManager.attack, "attack", this._actor.canAttack());
        }
    };
})();
