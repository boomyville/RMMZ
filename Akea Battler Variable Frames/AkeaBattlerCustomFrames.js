//=============================================================================
// RPG Maker MZ - Akea Battler Variable Frames
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Allows spritesheets to have variable frames for poses
 * @author Boomy
 * @url https://github.com/boomyville/
 * @base AkeaAnimatedBattleSystem
 * @orderAfter AkeaAnimatedBattleSystem
 *
 * This plugin provides a method to allow spritesheets to have variable frames for poses.
 * For example, the idle pose could have 3 frames but the slash/swing pose could have 12.
 *
 * @param Actor Frames
 * @type struct<ActorFrames>[]
 * @text Actor Frame Configuration
 * @desc You can add any number of poses with variable frames for any actor. If not set then maxFrame is used.
 *
 * @param Enemy Frames
 * @type struct<EnemyFrames>[]
 * @text Enemy Frame Configuration
 * @desc You can add any number of poses with variable frames for any enemy. If not set then maxFrame is used.
 *
 */
/*~struct~ActorFrames:
 * @param id
 * @type actor
 * @default 1
 * @desc Id of the Actor to add the frames
 * @param poseFrame
 * @type number[]
 * @desc Number of frames per pose. Top pose will have index 0
  *
 */
/*~struct~EnemyFrames:
 * @param id
 * @type enemy
 * @default 1
 * @desc Id of the enemy to add the frames
 * @param poseFrame
 * @type number[]
 * @desc Number of frames per pose. Top pose will have index 0
*/

if (!Akea.BattleSystem) throw new Error("Akea Battler Custom Frames plugin needs the Akea Animated Battle System base.");
if (Akea.BattleSystem.VERSION < [1, 1, 0]) throw new Error("Akea Battler Custom Frames plugin only works with versions 1.1.0 or higher of the Akea Animated Battle System.");

(() => {

    //Alias the setCharacterNewSheet function
    //Add 'pose frames' to sprite data
    let _akeaCustom_Frames_Sprite_setBattler = Sprite_Battler.prototype.setBattler
Sprite_Battler.prototype.setBattler = function (battler) {
_akeaCustom_Frames_Sprite_setBattler.call(this, battler);
    //Check if battler is enemy or actor
if(this._battler)
            if (this._battler.isActor()) {
        id = this._battler.actorId();
        this._akeaFrames = JSON.parse(JSON.parse(PluginManager.parameters('AkeaBattlerCustomFrames')["Actor Frames"]).find(sheet => JSON.parse(sheet).id == id));
    } else {
        id = this._battler.enemyId();
        this._akeaFrames = JSON.parse(JSON.parse(PluginManager.parameters('AkeaBattlerCustomFrames')["Enemy Frames"]).find(sheet => JSON.parse(sheet).id == id));

    }


};


//Rewrite updating motions to incorporate custom frame numbers
Sprite_Battler.prototype.updateMotionCount = function () {
    if (this._motion && ++this._motionCount >= this.akeaMotionspeed()) {
        var frame = this._akeaFrames ? JSON.parse(this._akeaFrames["poseFrame"])[this._motion.index] :  this.akeaMaxFrame;
        if (this._motion.loop) {
            this._pattern = this.updateAkeaPattern();
        } else if (this._pattern + 1 < frame) {
            this._pattern++;
            this._motionCount = 0;
    } else {


            this.refreshMotion();
    }
    this._motionCount = 0;
}
};
Sprite_Battler.prototype.updateAkeaFrame = function () {
    const bitmap = this._mainSprite.bitmap;
    if (bitmap) {
        const motionIndex = this._motion ? this._motion.index : 0;
        //console.log(motionIndex);
        //console.log(this._akeaFrames);
        if(this._akeaFrames) {
            var pattern = this._pattern < JSON.parse(this._akeaFrames["poseFrame"])[motionIndex] ? this._pattern : 1;
        } else {
            var pattern = this._pattern < this.akeaMaxFrame ? this._pattern : 1;
        }
        
        const cw = bitmap.width / this.akeaAnimatedBSMaxWidth;
        const ch = bitmap.height / this.akeaAnimatedBSMaxHeight;
        const cx = Math.floor(motionIndex / this.akeaAnimatedBSMaxHeight) * 3 + pattern;
        const cy = motionIndex % this.akeaAnimatedBSMaxHeight;
        this._mainSprite.setFrame(cx * cw, cy * ch, cw, ch);
        this.setFrame(0, 0, cw, ch);
        this.scale.x = this._akeaMirror ? -1 : 1;
        if (this._akeaMirroredMoves) { this.scale.x *= -1 };
    }
    return; // Below is old Frame
}

Sprite_Battler.prototype.updateAkeaPattern = function () {
    let pattern;
    if (this._akeaInOutFrame) {
        pattern = (this._pattern + this._akeaPatternMotion) % JSON.parse(this._akeaFrames["poseFrame"])[this._motion.index];
        if (pattern == 0) {
            this._akeaPatternMotion = 1;
        } else if (pattern == JSON.parse(this._akeaFrames["poseFrame"])[this._motion.index] - 1) {
            this._akeaPatternMotion = -1;
        }
    }
    else {
        if(this._akeaFrames) {
        pattern = (this._pattern + 1) % JSON.parse(this._akeaFrames["poseFrame"])[this._motion.index];
    } else {
        pattern = (this._pattern + 1) % this.akeaMaxFrame;
    }
    }
   
    return pattern
}




}
)();
